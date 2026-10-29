import { confirmarAccion, iniciarOperacion, mostrarAviso } from './avisos.js';

export function inicializarCierreVentana(documento = document, api = window.api) {
    if (!api?.alSolicitarCierre) return; // La vista previa no controla ventanas Electron.
    let pendiente = null;
    const desuscribir = api.alSolicitarCierre(async solicitud => {
        if (!Number.isSafeInteger(solicitud?.id) || pendiente === solicitud.id) return;
        const liberar = iniciarOperacion(documento);
        if (!liberar || documento.getElementById('btnSalir')?.disabled) {
            liberar?.();
            try { await api.responderCierreVentana(solicitud.id, false); } catch { /* La ventana permanece abierta. */ }
            mostrarAviso('Termina la operación o confirmación actual antes de cerrar.', documento);
            return;
        }
        pendiente = solicitud.id;
        try {
            const confirmado = await confirmarAccion(
                solicitud.aplicacion
                    ? '¿Cerrar la aplicación? Se perderán los borradores y cambios sin guardar de sus ventanas. Los datos guardados en MySQL se conservarán.'
                    : '¿Cerrar esta ventana? Sus cambios sin guardar se perderán. Los datos guardados en MySQL se conservarán.',
                documento, { titulo: solicitud.aplicacion ? 'Cerrar aplicación' : 'Cerrar ventana', aceptar: 'Sí, cerrar', neutra: true,
                    error: 'No se pudo abrir la confirmación. La ventana sigue abierta.' });
            const respuesta = await api.responderCierreVentana(solicitud.id, confirmado);
            if (!respuesta?.success) mostrarAviso(respuesta?.error || 'No se pudo cerrar. Intenta nuevamente.', documento);
        } catch {
            // Liberar también la petición principal para permitir otro intento con la X.
            try { await api.responderCierreVentana(solicitud.id, false); } catch { /* Sin respuesta no se cierra. */ }
            mostrarAviso('No se pudo confirmar el cierre. La ventana sigue abierta.', documento);
        } finally {
            pendiente = null;
            liberar();
        }
    });
    documento.defaultView?.addEventListener('pagehide', desuscribir, { once: true });
}

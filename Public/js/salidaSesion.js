import { confirmarAccion, iniciarOperacion, mostrarAviso } from './avisos.js';

export function inicializarSalida(documento = document, api = window.api) {
    const boton = documento.getElementById('btnSalir');
    if (!boton) return;
    let ocupado = false;
    boton.addEventListener('click', async () => {
        if (ocupado || boton.disabled) return;
        const liberar = iniciarOperacion(documento);
        if (!liberar) {
            mostrarAviso('Espera a que termine la operación antes de salir.', documento);
            return;
        }
        ocupado = true;
        try {
            const opciones = { titulo: 'Cerrar sesión · 1 de 2', aceptar: 'Sí, continuar', neutra: true,
                error: 'No se pudo abrir la confirmación. Tu sesión sigue abierta.' };
            if (!await confirmarAccion('¿Quieres cerrar tu sesión y volver al inicio de sesión?', documento, opciones)) return;
            if (!await confirmarAccion('Los borradores y cambios sin guardar de esta sesión se perderán en todas sus ventanas. Los datos ya guardados en MySQL se conservarán. ¿Confirmas que quieres salir?',
                documento, { ...opciones, titulo: 'Confirmar salida · 2 de 2', aceptar: 'Sí, cerrar sesión' })) return;
            boton.disabled = true;
            const resultado = await api.cerrarSesion();
            if (!resultado?.success) mostrarAviso(resultado?.error || 'No se pudo cerrar la sesión. Intenta nuevamente.', documento);
        } catch {
            mostrarAviso('No se pudo cerrar la sesión. Intenta nuevamente.', documento);
        } finally {
            boton.disabled = false;
            ocupado = false;
            liberar();
            if (boton.isConnected) boton.focus();
        }
    });
}

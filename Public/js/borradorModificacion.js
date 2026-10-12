import { leerFoto } from "./fotos.js";

const destinos = {
    btnIndex: "MenuPrincipal.html", btnRegistros: "Registros.html", btnResultados: "Resultados.html",
    btnBusquedaParejas: "BusquedaParejas.html", btnModificarParejas: "ModificarParejas.html",
    btnAdministrador: "Administrador.html", btnRegreso: "MenuPrincipal.html"
};

export async function inicializarBorradorModificacion(guardar, documento = document, api = window.api,
    navegar = destino => { window.location.href = `../Vistas/${destino}`; }) {
    const get = id => documento.getElementById(id);
    // También conservar los campos de referencia del formulario actual.
    const campos = [...documento.querySelectorAll(".form-section input[id], .form-section select[id], .form-section textarea[id]")];
    const textos = campos.filter(campo => campo.type !== "file");
    const fotos = campos.filter(campo => campo.type === "file");
    const controles = [...campos, get("BTNUpdate"), get("btnLimpiarModificacion")];
    const iniciales = new Map(textos.map(campo => [campo, campo.value]));
    const deshabilitados = new Map(controles.map(campo => [campo, campo.disabled]));
    const cacheFotos = new WeakMap();
    let cargando = true, ocupado = false, recuperacionFallida = false, pendiente = Promise.resolve();
    let focoAnterior = null;
    const mensaje = (texto, error = false) => {
        get("estadoBorradorModificacion").textContent = texto;
        get("estadoBorradorModificacion").dataset.tipo = error ? "error" : "info";
    };
    function bloquear(bloqueado) {
        if (bloqueado && !focoAnterior) focoAnterior = documento.activeElement;
        for (const campo of controles) campo.disabled = bloqueado || deshabilitados.get(campo);
        if (!bloqueado) {
            if (focoAnterior?.isConnected && !focoAnterior.disabled) focoAnterior.focus();
            focoAnterior = null;
        }
    }
    function foto(archivo) {
        if (!archivo) return Promise.resolve(null);
        if (!cacheFotos.has(archivo)) cacheFotos.set(archivo, leerFoto(archivo));
        return cacheFotos.get(archivo);
    }
    function conservar() {
        // Capturar al solicitar el guardado y serializar escrituras: una foto lenta
        // no debe sobrescribir un texto editado o reponer una selección ya guardada en SQL.
        const datos = { version: 1, campos: Object.fromEntries(textos.map(campo => [campo.id, campo.value])) };
        const archivos = fotos.map(campo => campo.files[0]);
        pendiente = pendiente.catch(() => {}).then(async () => {
            datos.fotos = Object.fromEntries(await Promise.all(fotos.map(async (campo, i) => [campo.id, await foto(archivos[i])])));
            if (!(await api.guardarBorradorModificacion(datos))?.success) throw new Error("No se pudo conservar el borrador.");
        });
        return pendiente;
    }
    async function conservarConAviso() {
        try {
            await conservar();
            mensaje("Borrador conservado para cambiar de módulo en esta ventana. No guarda cambios en MySQL y se pierde al cerrar la aplicación.");
            return true;
        } catch (error) {
            mensaje(`No se pudo conservar el borrador. Permanece aquí para no perder los datos. ${error.message || ""}`, true);
            return false;
        }
    }
    for (const campo of campos) {
        for (const evento of ["input", "change"]) campo.addEventListener(evento, () => {
            if (!cargando && !ocupado && !recuperacionFallida) void conservarConAviso();
        });
    }
    documento.querySelector(".menu").addEventListener("click", async event => {
        const destino = destinos[event.target.closest("button")?.id];
        if (!destino) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (recuperacionFallida) { navegar(destino); return; }
        if (cargando || ocupado) { mensaje("Espera a que termine la operación antes de cambiar de módulo."); return; }
        ocupado = true; bloquear(true);
        try { if (await conservarConAviso()) navegar(destino); }
        finally { ocupado = false; bloquear(false); }
    }, true);

    get("BTNUpdate").addEventListener("click", async () => {
        if (cargando || ocupado || recuperacionFallida) return;
        ocupado = true;
        try {
            // guardar usa ejecutarAccion para bloquear sus controles y mostrar el resultado SQL.
            const resultado = await guardar();
            bloquear(true);
            const conservado = await conservarConAviso();
            if (resultado?.success && !conservado) mensaje("La actualización se confirmó en MySQL, pero no se pudo actualizar el borrador. Permanece aquí y vuelve a intentar cambiar de módulo; no necesitas repetir Guardar.", true);
        } catch {
            await conservarConAviso();
        } finally { ocupado = false; bloquear(false); }
    });
    const confirmacion = get("confirmarLimpiarModificacion");
    get("btnLimpiarModificacion").addEventListener("click", () => {
        if (!cargando && !ocupado && !recuperacionFallida) confirmacion.hidden = false;
    });
    get("btnCancelarLimpiarModificacion").addEventListener("click", () => { confirmacion.hidden = true; });
    get("btnConfirmarLimpiarModificacion").addEventListener("click", async () => {
        if (cargando || ocupado || recuperacionFallida) return;
        ocupado = true; bloquear(true);
        try {
            await pendiente.catch(() => {});
            if (!(await api.limpiarBorradorModificacion())?.success) throw new Error("No se pudo limpiar el borrador. Tus datos se conservan.");
            for (const campo of textos) campo.value = iniciales.get(campo);
            for (const campo of fotos) campo.value = "";
            confirmacion.hidden = true;
            mensaje("Formulario limpio. No se modificaron registros en MySQL.");
        } catch (error) { mensaje(error.message, true); }
        finally { ocupado = false; bloquear(false); }
    });

    bloquear(true);
    try {
        const respuesta = await api.obtenerBorradorModificacion();
        if (!respuesta?.success) throw new Error("Borrador no disponible");
        const datos = respuesta.data;
        if (datos != null) {
            if (datos.version !== 1 || !datos.campos || !datos.fotos) throw new Error("Borrador incompatible");
            // Preparar todas las fotos antes de modificar el formulario.
            const recuperadas = new Map();
            for (const campo of fotos) {
                const f = datos.fotos[campo.id];
                if (f) {
                    const transferencia = new DataTransfer();
                    transferencia.items.add(new File([f.bytes], f.nombre, { type: f.tipo, lastModified: f.fecha }));
                    recuperadas.set(campo, transferencia.files);
                }
            }
            for (const campo of textos) if (typeof datos.campos[campo.id] === "string") campo.value = datos.campos[campo.id];
            for (const [campo, archivos] of recuperadas) campo.files = archivos;
            mensaje("Borrador recuperado. Revisa el ID y los datos antes de guardar cambios en MySQL.");
        } else mensaje("Los datos se conservarán al cambiar de módulo en esta ventana. El borrador se pierde al cerrar la aplicación.");
    } catch {
        recuperacionFallida = true;
        mensaje("No se pudo recuperar el borrador. Vuelve a abrir este módulo antes de editar; no se ha eliminado el borrador anterior.", true);
        return;
    }
    cargando = false; bloquear(false);
}

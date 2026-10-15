import { leerFoto } from "./fotos.js";
import { crearColaBorrador } from "./borradores.js";

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
    const controles = [...campos, get("BTNUpdate"), get("btnLimpiarModificacion"), get("btnConsultarModificacion")];
    const iniciales = new Map(textos.map(campo => [campo, campo.value]));
    const deshabilitados = new Map(controles.map(campo => [campo, campo.disabled]));
    const cacheFotos = new WeakMap();
    let cargando = true, ocupado = false, recuperacionFallida = false;
    const fotosEnviadas = new Map();
    let versionEdicion = null;
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
    const cola = crearColaBorrador(async ({ datos, archivos }) => {
        datos.fotos = {};
        for (const [i, campo] of fotos.entries()) {
            if (!fotosEnviadas.has(campo.id) || fotosEnviadas.get(campo.id) !== archivos[i]) datos.fotos[campo.id] = await foto(archivos[i]);
        }
        if (!(await api.guardarBorradorModificacion(datos))?.success) throw new Error("No se pudo conservar el borrador.");
        fotos.forEach((campo, i) => fotosEnviadas.set(campo.id, archivos[i]));
    });
    function conservar() {
        // Capturar al solicitar el guardado y serializar escrituras: una foto lenta
        // no debe sobrescribir un texto editado o reponer una selección ya guardada en SQL.
        const datos = { version: 1, versionEdicion, campos: Object.fromEntries(textos.map(campo => [campo.id, campo.value])) };
        const archivos = fotos.map(campo => campo.files[0]);
        return cola.solicitar({ datos, archivos });
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
            if (campo.id === 'nParejaID') versionEdicion = null;
            if (!cargando && !ocupado && !recuperacionFallida) void conservarConAviso();
        });
    }
    get('btnConsultarModificacion').addEventListener('click', async () => {
        if (cargando || ocupado || recuperacionFallida) return;
        ocupado = true; bloquear(true);
        try {
            const respuesta = await api.buscarParejaPorID(get('nParejaID').value.trim());
            const fila = respuesta?.data?.[0];
            if (!respuesta?.success || !/^[a-f0-9]{64}$/.test(fila?.versionEdicion || '')) {
                throw new Error(respuesta?.message || respuesta?.error || 'No se pudo consultar la pareja.');
            }
            const correspondencias = { nombre: 'cNombre', apellido: 'cApellido', email: 'cEmail',
                telefono: 'nTelefono', fechaNacimiento: 'dNacimiento' };
            for (const lado of ['Masculino', 'Femenino']) {
                for (const [campo, columna] of Object.entries(correspondencias)) {
                    let valor = fila[`${columna}${lado === 'Femenino' ? 'M' : ''}`];
                    if (campo === 'fechaNacimiento' && valor instanceof Date) valor = `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
                    else if (campo === 'fechaNacimiento' && typeof valor === 'string') valor = valor.slice(0, 10);
                    const anterior = get(`${campo}${lado}`), editable = get(`${campo}${lado}Update`);
                    anterior.value = String(valor ?? '');
                    if (!editable.value) editable.value = anterior.value;
                }
            }
            versionEdicion = fila.versionEdicion;
            if (await conservarConAviso()) mensaje('Datos actuales consultados. Revisa y compara los nuevos datos antes de guardar. Las ediciones existentes se conservaron.');
        } catch (error) { mensaje(error.message || 'No se pudo consultar la pareja.', true); }
        finally { ocupado = false; bloquear(false); }
    });
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
            if (!versionEdicion) { mensaje('Consulta los datos actuales de la pareja antes de guardar.', true); return; }
            const resultado = await guardar({ versionEdicion });
            if (resultado?.success && /^[a-f0-9]{64}$/.test(resultado.versionEdicion || '')) versionEdicion = resultado.versionEdicion;
            else if (resultado?.code === 'EDIT_CONFLICT') versionEdicion = null;
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
            await cola.esperar().catch(() => {});
            if (!(await api.limpiarBorradorModificacion())?.success) throw new Error("No se pudo limpiar el borrador. Tus datos se conservan.");
            fotosEnviadas.clear();
            versionEdicion = null;
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
            versionEdicion = /^[a-f0-9]{64}$/.test(datos.versionEdicion || '') ? datos.versionEdicion : null;
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

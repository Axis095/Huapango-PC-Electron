import { leerFoto } from "./fotos.js";
import { validarDatosPareja } from "./validaciones.js";

const campos = {
    nombreMasculinoUpdate: ["cNombreMasculino", "cNombre"], apellidoMasculinoUpdate: ["cApellidoMasculino", "cApellido"],
    emailMasculinoUpdate: ["cEmailMasculino", "cEmail"], telefonoMasculinoUpdate: ["nTelefonoMasculino", "nTelefono"],
    fechaNacimientoMasculinoUpdate: ["dNacimientoMasculino", "dNacimiento"],
    nombreFemeninoUpdate: ["cNombreFemenino", "cNombreM"], apellidoFemeninoUpdate: ["cApellidoFemenino", "cApellidoM"],
    emailFemeninoUpdate: ["cEmailFemenino", "cEmailM"], telefonoFemeninoUpdate: ["nTelefonoFemenino", "nTelefonoM"],
    fechaNacimientoFemeninoUpdate: ["dNacimientoFemenino", "dNacimientoM"]
};
const lados = ["Masculino", "Femenino"];
const etiquetas = ["Nombre (participante 1)", "Apellidos (participante 1)", "Correo (participante 1)",
    "Teléfono (participante 1)", "Nacimiento (participante 1)", "Nombre (participante 2)",
    "Apellidos (participante 2)", "Correo (participante 2)", "Teléfono (participante 2)", "Nacimiento (participante 2)"];
const versionValida = valor => typeof valor === "string" && /^[a-f0-9]{64}$/.test(valor);
const camposDeFila = fila => Object.fromEntries(Object.entries(campos).map(([campo, [, columna]]) =>
    [campo, campo.startsWith("fecha") ? fecha(fila[columna]) : String(fila[columna] ?? "")]));
const destinos = { btnIndex: "MenuPrincipal.html", btnRegistros: "Registros.html", btnResultados: "Resultados.html",
    btnBusquedaParejas: "BusquedaParejas.html", btnModificarParejas: "BusquedaParejas.html",
    btnAdministrador: "Administrador.html", btnRegreso: "MenuPrincipal.html" };
function fecha(valor) {
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}-${String(valor.getDate()).padStart(2, "0")}`;
    }
    return typeof valor === "string" ? valor.slice(0, 10) : "";
}
function idValido(valor) { return /^\d+$/.test(valor) && Number.isSafeInteger(Number(valor)) && Number(valor) > 0; }

export async function inicializarFichaPareja(documento = document, api = window.api,
    navegar = destino => { window.location.href = `../Vistas/${destino}`; }) {
    const get = id => documento.getElementById(id);
    let ficha = null, editando = false, ocupado = true, falloRecuperacion = false;
    let pendiente = Promise.resolve(), accionConfirmada = null;
    let revision = null;
    const cache = new WeakMap();
    const aviso = (texto, error = false) => {
        get("estadoBusquedaParejas").textContent = texto;
        get("estadoBusquedaParejas").dataset.tipo = error ? "error" : "info";
    };
    const valores = () => Object.fromEntries(Object.keys(campos).map(id => [id, get(id).value]));
    const modificado = () => !!ficha && (Object.keys(campos).some(id => get(id).value !== ficha.original[id]) || lados.some(l => get(`foto${l}Update`).files.length));
    function actualizar() {
        get("fichaPareja").hidden = !ficha;
        get("btnBuscarPareja").disabled = ocupado || falloRecuperacion;
        get("nParejaID").disabled = ocupado || falloRecuperacion;
        get("btnEditarPareja").hidden = editando;
        get("btnEditarPareja").disabled = ocupado || !ficha || falloRecuperacion;
        get("BTNUpdate").hidden = !editando;
        get("BTNUpdate").disabled = ocupado || !ficha || falloRecuperacion || !!ficha.conflicto || !versionValida(ficha.versionEdicion);
        get("revisionPareja").hidden = !ficha || (!ficha.conflicto && versionValida(ficha.versionEdicion) && !revision);
        get("btnRevisarPareja").disabled = ocupado || !ficha || falloRecuperacion;
        get("btnAplicarRevision").hidden = !revision;
        get("btnAplicarRevision").disabled = ocupado || !revision || falloRecuperacion;
        get("btnCancelarEdicion").hidden = !editando;
        get("btnCancelarEdicion").disabled = ocupado || falloRecuperacion;
        get("btnLimpiarModificacion").disabled = ocupado || falloRecuperacion;
        for (const id of Object.keys(campos)) { get(id).readOnly = !editando; get(id).disabled = ocupado || falloRecuperacion; }
        for (const lado of lados) {
            get(`edicionFoto${lado}`).hidden = !editando;
            get(`foto${lado}Update`).disabled = ocupado || !editando || falloRecuperacion;
        }
        get("ayudaFotosFicha").hidden = !editando;
        get("parejaSeleccionada").textContent = ficha ? `Pareja #${ficha.id}` : "";
        get("BTNUpdate").textContent = ficha ? `Guardar cambios de pareja #${ficha.id}` : "Guardar cambios";
    }
    function aplicar(original) { for (const id of Object.keys(campos)) get(id).value = original?.[id] ?? ""; }
    function propuestaRevision() {
        // Conservar únicamente los campos editados localmente, no la ficha antigua entera.
        return Object.fromEntries(Object.keys(campos).map(id =>
            [id, get(id).value !== ficha.original[id] ? get(id).value : revision.original[id]]));
    }
    function mostrarRevision() {
        if (!revision) { get("detalleRevisionPareja").textContent = ""; return; }
        const propuesta = propuestaRevision();
        get("detalleRevisionPareja").textContent = Object.keys(campos).map((id, i) =>
            `${etiquetas[i]}\nActual en MySQL: ${revision.original[id]}\nPropuesto: ${propuesta[id]}`
        ).join("\n\n") + "\n\n" + lados.map((lado, i) =>
            `Foto participante ${i + 1}: ${get(`foto${lado}Update`).files.length ? "tu foto seleccionada reemplazará la actual" : "se conservará la foto actual de MySQL"}.`
        ).join("\n");
    }
    function limpiarFotos() { for (const lado of lados) get(`foto${lado}Update`).value = ""; }
    function serializar(archivo) {
        if (!archivo) return Promise.resolve(null);
        if (!cache.has(archivo)) cache.set(archivo, leerFoto(archivo));
        return cache.get(archivo);
    }
    function conservar() {
        const datos = { version: 2, campos: valores(), busqueda: get("nParejaID").value,
            ficha: ficha ? structuredClone(ficha) : null, editando };
        const archivos = lados.map(l => get(`foto${l}Update`).files[0]);
        pendiente = pendiente.catch(() => {}).then(async () => {
            datos.fotos = Object.fromEntries(await Promise.all(lados.map(async (l, i) => [l, await serializar(archivos[i])])));
            if (!(await api.guardarBorradorModificacion(datos))?.success) throw new Error("No se pudo conservar el borrador.");
        });
        return pendiente;
    }
    async function persistir() {
        try { await conservar(); get("estadoBorradorModificacion").textContent = "Borrador conservado en esta ventana y sesión. Se pierde al cambiar de cuenta, volver a iniciar sesión o cerrar la ventana."; return true; }
        catch (error) { get("estadoBorradorModificacion").textContent = `${error.message} Permanece aquí para conservar tus datos.`; return false; }
    }
    async function ejecutar(accion) {
        if (ocupado || falloRecuperacion) return;
        const origen = documento.activeElement;
        accionConfirmada = null;
        get("confirmarLimpiarModificacion").hidden = true;
        ocupado = true; actualizar();
        try { await accion(); }
        catch (error) {
            await persistir();
            aviso(error.message || "No se pudo completar la operación. Tus cambios se conservan.", true);
        }
        finally {
            ocupado = false; actualizar();
            if (origen?.isConnected && !origen.disabled && !origen.hidden && !origen.closest?.("[hidden]")) origen.focus();
            else if (ficha && !editando) get("btnEditarPareja").focus();
            else get("nParejaID").focus();
        }
    }
    function confirmar(texto, accion) {
        if (ocupado || falloRecuperacion) return;
        accionConfirmada = accion;
        get("textoConfirmarCambio").textContent = texto;
        get("confirmarLimpiarModificacion").hidden = false;
        get("btnCancelarLimpiarModificacion").focus();
    }
    function cancelarConfirmacion() {
        accionConfirmada = null; get("confirmarLimpiarModificacion").hidden = true;
        get("nParejaID").focus();
    }
    get("btnCancelarLimpiarModificacion").addEventListener("click", cancelarConfirmacion);
    get("btnConfirmarLimpiarModificacion").addEventListener("click", () => {
        const accion = accionConfirmada; cancelarConfirmacion();
        if (accion) return ejecutar(accion);
    });
    documento.addEventListener("keydown", event => { if (event.key === "Escape" && accionConfirmada) { event.preventDefault(); cancelarConfirmacion(); } });

    async function cargar(id) {
        aviso("Buscando pareja…");
        const respuesta = await api.buscarParejaPorID(id);
        if (!respuesta?.success || !Array.isArray(respuesta.data) || !respuesta.data.length) {
            // No sustituir una ficha editada por una respuesta fallida.
            aviso(respuesta?.message || "No se pudo consultar esa pareja. La ficha anterior se conserva.", true);
            return;
        }
        const fila = respuesta.data[0];
        if (Number(fila.nParejaID) !== Number(id)) throw new Error("La respuesta no corresponde al ID solicitado.");
        const original = camposDeFila(fila);
        ficha = { id: String(fila.nParejaID), original, versionEdicion: fila.versionEdicion,
            fotos: { Masculino: !!fila.oFoto, Femenino: !!fila.IFotoM } };
        revision = null; mostrarRevision();
        aplicar(original); limpiarFotos(); editando = false;
        for (const lado of lados) get(`estadoFoto${lado}`).textContent = ficha.fotos[lado] ? "Foto guardada. Selecciona otra al editar para reemplazarla." : "Sin foto guardada.";
        aviso(`Pareja #${ficha.id} cargada. Pulsa Editar para modificar sus datos.`);
        await persistir();
    }
    function buscar(event) {
        event.preventDefault();
        if (ocupado || falloRecuperacion) return;
        const id = get("nParejaID").value.trim();
        if (!idValido(id)) { aviso("Ingresa un ID de pareja entero y positivo.", true); return; }
        if (modificado()) confirmar("Hay cambios sin guardar. ¿Descartarlos si se encuentra la pareja solicitada?", () => cargar(id));
        else return ejecutar(() => cargar(id));
    }
    get("btnBuscarPareja").addEventListener("click", buscar);
    get("nParejaID").addEventListener("keydown", event => { if (event.key === "Enter" && !event.isComposing) return buscar(event); });
    get("btnEditarPareja").addEventListener("click", () => {
        if (ocupado || !ficha || falloRecuperacion) return;
        editando = true; actualizar(); aviso(`Editando pareja #${ficha.id}. Los cambios todavía no están guardados en MySQL.`); get("nombreMasculinoUpdate").focus(); void persistir();
    });
    get("BTNUpdate").addEventListener("click", () => ejecutar(async () => {
        if (!ficha || !editando) return;
        if (ficha.conflicto || !versionValida(ficha.versionEdicion)) {
            aviso("Revisa los datos actuales antes de guardar. Tu borrador se conserva.", true); return;
        }
        const datos = { nParejaID: ficha.id, versionEdicion: ficha.versionEdicion, fotos: {} };
        for (const [id, [campo]] of Object.entries(campos)) datos[campo] = get(id).value.trim();
        validarDatosPareja(datos);
        for (const lado of lados) {
            const archivo = get(`foto${lado}Update`).files[0];
            if (archivo) datos.fotos[lado] = await serializar(archivo);
        }
        aviso(`Guardando pareja #${ficha.id}…`);
        const respuesta = await api.actualizarParejaCompleta(datos);
        if (!respuesta?.success) {
            if (["EDIT_CONFLICT", "VERSION_REQUIRED"].includes(respuesta?.code)) {
                ficha.conflicto = true; revision = null; mostrarRevision();
            }
            await persistir(); throw new Error(respuesta?.error || "No se pudo confirmar el guardado. Tus cambios se conservan.");
        }
        for (const [id, [campo]] of Object.entries(campos)) get(id).value = datos[campo];
        ficha.original = valores();
        ficha.versionEdicion = respuesta.versionEdicion; ficha.conflicto = false;
        revision = null; mostrarRevision();
        for (const lado of lados) if (datos.fotos[lado]) { ficha.fotos[lado] = true; get(`estadoFoto${lado}`).textContent = "Foto guardada."; }
        limpiarFotos(); editando = false;
        aviso(respuesta.message || `Cambios de pareja #${ficha.id} guardados correctamente.`);
        if (!(await persistir())) get("estadoBorradorModificacion").textContent = "MySQL confirmó los cambios, pero el borrador no pudo actualizarse. Reintenta cambiar de módulo; no repitas Guardar.";
    }));
    get("btnRevisarPareja").addEventListener("click", () => ejecutar(async () => {
        if (!ficha) return;
        revision = null; mostrarRevision();
        const respuesta = await api.buscarParejaPorID(ficha.id);
        const fila = respuesta?.data?.[0];
        if (!respuesta?.success || !fila || Number(fila.nParejaID) !== Number(ficha.id) || !versionValida(fila.versionEdicion)) {
            throw new Error(respuesta?.message || respuesta?.error || "No se pudo cargar la versión actual. Tu borrador se conserva.");
        }
        revision = { original: camposDeFila(fila), versionEdicion: fila.versionEdicion,
            fotos: { Masculino: !!fila.oFoto, Femenino: !!fila.IFotoM } };
        mostrarRevision();
        aviso("Compara los datos actuales con los propuestos. Puedes corregir tus campos antes de preparar el borrador. Todavía no se guardará nada en MySQL.");
    }));
    get("btnAplicarRevision").addEventListener("click", () => ejecutar(async () => {
        if (!revision || !ficha) return;
        const propuestos = propuestaRevision();
        ficha.original = revision.original; ficha.versionEdicion = revision.versionEdicion;
        ficha.fotos = revision.fotos; ficha.conflicto = false;
        aplicar(propuestos); editando = true; revision = null; mostrarRevision();
        for (const lado of lados) get(`estadoFoto${lado}`).textContent = ficha.fotos[lado] ? "Foto guardada." : "Sin foto guardada.";
        aviso("Borrador revisado preparado. Se conservaron tus campos editados y se actualizaron los demás. Comprueba los datos y pulsa Guardar cambios cuando estés listo.");
        await persistir();
    }));
    const cancelar = async () => { aplicar(ficha.original); limpiarFotos(); editando = false; revision = null; mostrarRevision(); aviso("Edición cancelada. Se recuperaron los datos de la ficha."); await persistir(); };
    get("btnCancelarEdicion").addEventListener("click", () => {
        if (!ficha) return;
        if (modificado()) confirmar("¿Descartar los cambios de esta edición?", cancelar);
        else return ejecutar(cancelar);
    });
    get("btnLimpiarModificacion").addEventListener("click", () => confirmar("¿Cerrar esta ficha y descartar su borrador? No se eliminará la pareja de MySQL.", async () => {
        await pendiente.catch(() => {});
        if (!(await api.limpiarBorradorModificacion())?.success) throw new Error("No se pudo descartar el borrador. Los datos se conservan.");
        ficha = null; editando = false; aplicar(null); limpiarFotos(); get("nParejaID").value = "";
        revision = null; mostrarRevision();
        aviso("Busca una pareja para comenzar."); get("estadoBorradorModificacion").textContent = "Borrador descartado.";
    }));
    for (const id of [...Object.keys(campos), ...lados.map(l => `foto${l}Update`)]) {
        for (const nombre of ["input", "change"]) get(id).addEventListener(nombre, () => {
            if (!ocupado && !falloRecuperacion) { mostrarRevision(); void persistir(); }
        });
    }
    documento.querySelector(".menu").addEventListener("click", event => {
        const destino = destinos[event.target.closest("button")?.id];
        if (!destino) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (falloRecuperacion) { navegar(destino); return; }
        return ejecutar(async () => { if (await persistir()) navegar(destino); });
    }, true);
    actualizar();
    try {
        const respuesta = await api.obtenerBorradorModificacion();
        if (!respuesta?.success) throw new Error("No se pudo recuperar el borrador. Reabre este módulo antes de editar.");
        const datos = respuesta.data;
        if (datos) {
            if (datos.version !== 2) throw new Error("Existe un borrador de la pantalla anterior. Termina esa edición antes de actualizar la aplicación.");
            ficha = datos.ficha; editando = !!datos.editando;
            if (ficha && (!idValido(String(ficha.id)) || !ficha.original)) throw new Error("El borrador no es válido. No se ha eliminado.");
            aplicar(datos.campos); get("nParejaID").value = datos.busqueda || "";
            for (const lado of lados) {
                const f = datos.fotos?.[lado];
                if (f) { const dt = new DataTransfer(); dt.items.add(new File([f.bytes], f.nombre, { type: f.tipo, lastModified: f.fecha })); get(`foto${lado}Update`).files = dt.files; }
                get(`estadoFoto${lado}`).textContent = ficha?.fotos?.[lado] ? "Foto guardada." : "Sin foto guardada.";
            }
            aviso(ficha ? `Ficha de pareja #${ficha.id} recuperada. ${ficha.conflicto || !versionValida(ficha.versionEdicion) ? "Revisa los datos actuales antes de guardar; tu borrador se conserva." : "Revisa tus cambios antes de guardar."}` : "Busca una pareja para comenzar.");
        }
    } catch (error) { falloRecuperacion = true; aviso(error.message, true); }
    ocupado = false; actualizar();
}

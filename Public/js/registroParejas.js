import { leerFoto } from "./fotos.js";
import { validarDatosPareja, validarDatosCategoria, validarDatosEstilo } from "./validaciones.js";

const camposPareja = {
    nParejaID: "nParejaID", fechaNacimientoMasculino: "dNacimientoMasculino",
    sexoMasculino: "sexoMasculino", telefonoMasculino: "nTelefonoMasculino",
    nombreMasculino: "cNombreMasculino", apellidoMasculino: "cApellidoMasculino", emailMasculino: "cEmailMasculino",
    fechaNacimientoFemenino: "dNacimientoFemenino", sexoFemenino: "sexoFemenino",
    telefonoFemenino: "nTelefonoFemenino", nombreFemenino: "cNombreFemenino",
    apellidoFemenino: "cApellidoFemenino", emailFemenino: "cEmailFemenino"
};
const campos = [...Object.keys(camposPareja), "categoriaRegistro", "nIDCategoria", "estiloRegistro", "nEstiloID"];
const fotos = ["fotoMasculino", "fotoFemenino"];
const destinos = {
    btnIndex: "MenuPrincipal.html", btnRegistros: "Registros.html", btnResultados: "Resultados.html",
    btnBusquedaParejas: "BusquedaParejas.html", btnModificarParejas: "ModificarParejas.html",
    btnAdministrador: "Administrador.html", btnRegreso: "MenuPrincipal.html"
};

export async function inicializarRegistros(documento = document, api = window.api,
    navegar = destino => { window.location.href = `../Vistas/${destino}`; }) {
    const get = id => documento.getElementById(id);
    const cacheFotos = new WeakMap();
    let registrada = null, categoriaGuardada = false, estiloGuardado = false;
    let cargando = true, ocupado = false, recuperacionFallida = false, pendiente = Promise.resolve();
    const controles = [...campos, ...fotos].map(get);
    const iniciales = Object.fromEntries(campos.map(id => [id, get(id).value]));
    const mensaje = (id, texto, error = false) => {
        get(id).textContent = texto;
        get(id).dataset.tipo = error ? "error" : "info";
    };
    function actualizar() {
        for (const id of [...Object.keys(camposPareja), ...fotos]) get(id).disabled = cargando || ocupado || registrada !== null;
        for (const id of ["categoriaRegistro", "nIDCategoria", "estiloRegistro", "nEstiloID"]) get(id).disabled = cargando || ocupado;
        get("BTNSave").disabled = cargando || ocupado || registrada !== null;
        get("btnNuevaPareja").disabled = cargando || ocupado;
        get("btnRegistrarCategoria").disabled = cargando || ocupado || registrada === null || categoriaGuardada;
        get("btnRegistrarEstilo").disabled = cargando || ocupado || registrada === null || estiloGuardado;
        for (const id of ["btnGenerarPDF", "btnGenerarPDFCategorias", "btnGenerarPDFEstilos"]) get(id).disabled = cargando || ocupado;
        get("contentCategoria").style.display = registrada === null ? "none" : "block";
        get("contentEstilo").style.display = registrada === null ? "none" : "block";
        get("nParejaIDCategoria").value = registrada ?? "";
        get("nParejaIDEstilo").value = registrada ?? "";
    }
    async function foto(file) {
        if (!file) return null;
        if (!cacheFotos.has(file)) cacheFotos.set(file, leerFoto(file));
        return cacheFotos.get(file);
    }
    function guardarBorrador() {
        const datos = { version: 1, campos: Object.fromEntries(campos.map(id => [id, get(id).value])),
            registrada, categoriaGuardada, estiloGuardado };
        const archivos = fotos.map(id => get(id).files[0]);
        // Serializar las escrituras evita que una foto lenta sobrescriba cambios recientes.
        pendiente = pendiente.catch(() => {}).then(async () => {
            datos.fotos = Object.fromEntries(await Promise.all(fotos.map(async (id, i) => [id, await foto(archivos[i])])));
            const respuesta = await api.guardarBorradorRegistro(datos);
            if (!respuesta?.success) throw new Error("No se pudo conservar el borrador.");
        });
        return pendiente;
    }
    async function conservar() {
        try {
            await guardarBorrador();
            mensaje("estadoBorradorRegistro", "Datos conservados al cambiar de módulo en esta ventana. El borrador se pierde al cerrar la aplicación.");
            return true;
        } catch {
            mensaje("estadoBorradorRegistro", "No se pudo conservar el borrador. Permanece en esta pantalla para no perder los datos.", true);
            return false;
        }
    }
    for (const control of controles) {
        control.addEventListener("input", () => { if (!cargando && !ocupado) void conservar(); });
        control.addEventListener("change", () => { if (!cargando && !ocupado) void conservar(); });
    }
    // Interceptar el menú antes de los listeners comunes de render.js.
    documento.querySelector(".menu").addEventListener("click", async event => {
        const destino = destinos[event.target.closest("button")?.id];
        if (!destino) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (recuperacionFallida) { navegar(destino); return; }
        if (cargando || ocupado) {
            mensaje("estadoBorradorRegistro", "Espera a que termine la operación antes de cambiar de módulo.");
            return;
        }
        ocupado = true; actualizar();
        const guardado = await conservar();
        ocupado = false; actualizar();
        if (guardado) navegar(destino);
    }, true);

    async function ejecutar(estadoID, accion) {
        if (cargando || ocupado) return;
        ocupado = true; actualizar();
        let campoError;
        try { await accion(); }
        catch (error) { mensaje(estadoID, error.message || "No se pudo completar la operación.", true); campoError = error.campo; }
        finally { ocupado = false; actualizar(); if (campoError) get(campoError)?.focus(); }
    }
    get("BTNSave").addEventListener("click", () => ejecutar("estadoRegistroPareja", async () => {
        if (registrada !== null) return;
        const datos = Object.fromEntries(Object.entries(camposPareja).map(([id, campo]) => [campo, get(id).value.trim()]));
        for (const id of Object.keys(camposPareja)) {
            if (!datos[camposPareja[id]]) {
                const nombre = get(id).getAttribute("aria-label") || get(id).placeholder || id;
                throw Object.assign(new Error(`Completa el campo: ${nombre}. Los demás datos se conservan.`), { campo: id });
            }
        }
        validarDatosPareja(datos);
        mensaje("estadoRegistroPareja", "Guardando pareja…");
        datos.fotos = {};
        for (const lado of ["Masculino", "Femenino"]) {
            const archivo = get(`foto${lado}`).files[0];
            if (archivo) datos.fotos[lado] = await foto(archivo);
        }
        const respuesta = await api.registrarPareja(datos);
        if (!respuesta?.success) throw new Error(respuesta?.error || "No se pudo guardar la pareja. Los datos se conservan.");
        registrada = respuesta.id;
        mensaje("estadoRegistroPareja", `Pareja guardada en la base de datos. ID: ${registrada}. Continúa con categoría y estilo.`);
        await conservar();
    }));
    for (const tipo of ["Categoria", "Estilo"]) {
        get(`btnRegistrar${tipo}`).addEventListener("click", () => ejecutar(`estadoRegistro${tipo}`, async () => {
            if (registrada === null) throw new Error("Guarda primero la pareja.");
            if (tipo === "Categoria" ? categoriaGuardada : estiloGuardado) return;
            const esCategoria = tipo === "Categoria";
            const select = get(esCategoria ? "categoriaRegistro" : "estiloRegistro");
            if (!select.value) throw Object.assign(new Error(`Selecciona ${esCategoria ? "una categoría" : "un estilo"}.`), { campo: select.id });
            const datos = esCategoria
                ? { nParejaID: registrada, nIDCategoria: get("nIDCategoria").value.trim(), cCategoriaNombre: select.options[select.selectedIndex].text }
                : { nParejaID: registrada, nEstiloID: get("nEstiloID").value.trim(), cEstiloNombre: select.options[select.selectedIndex].text };
            (esCategoria ? validarDatosCategoria : validarDatosEstilo)(datos);
            const respuesta = await api[esCategoria ? "registrarCategoria" : "registrarEstilo"](datos);
            if (!respuesta?.success) throw new Error(respuesta?.error || "No se pudo guardar. Los datos se conservan.");
            if (esCategoria) categoriaGuardada = true; else estiloGuardado = true;
            mensaje(`estadoRegistro${tipo}`, `${esCategoria ? "Categoría guardada" : "Estilo guardado"} correctamente.`);
            await conservar();
        }));
    }
    for (const [boton, metodo] of [["btnGenerarPDF", "generarPDFParejas"], ["btnGenerarPDFCategorias", "generarPDFCategorias"], ["btnGenerarPDFEstilos", "generarPDFEstilos"]]) {
        get(boton).addEventListener("click", () => ejecutar("estadoPDFRegistro", async () => {
            const respuesta = await api[metodo]();
            if (!respuesta?.success) throw new Error(respuesta?.error || "No se pudo generar el PDF.");
            mensaje("estadoPDFRegistro", `PDF generado: ${respuesta.ruta}`);
        }));
    }
    get("btnNuevaPareja").addEventListener("click", () => { get("confirmarNuevaPareja").hidden = false; });
    get("btnCancelarNuevaPareja").addEventListener("click", () => { get("confirmarNuevaPareja").hidden = true; });
    get("btnConfirmarNuevaPareja").addEventListener("click", () => ejecutar("estadoRegistroPareja", async () => {
        await pendiente.catch(() => {});
        if (!(await api.limpiarBorradorRegistro())?.success) throw new Error("No se pudo iniciar otra pareja. Conservamos el formulario.");
        registrada = null; categoriaGuardada = false; estiloGuardado = false;
        for (const id of campos) get(id).value = iniciales[id];
        for (const id of fotos) get(id).value = "";
        for (const id of ["estadoRegistroPareja", "estadoRegistroCategoria", "estadoRegistroEstilo", "estadoPDFRegistro", "estadoBorradorRegistro"]) mensaje(id, "");
        get("confirmarNuevaPareja").hidden = true;
    }));
    actualizar();
    try {
        const respuesta = await api.obtenerBorradorRegistro();
        if (!respuesta?.success) throw new Error("Borrador no disponible");
        const datos = respuesta.data;
        if (datos?.version === 1) {
            for (const id of campos) if (typeof datos.campos[id] === "string") get(id).value = datos.campos[id];
            for (const id of fotos) {
                const f = datos.fotos[id];
                if (f) {
                    const archivo = new File([f.bytes], f.nombre, { type: f.tipo, lastModified: f.fecha });
                    const transferencia = new DataTransfer(); transferencia.items.add(archivo);
                    get(id).files = transferencia.files;
                }
            }
            registrada = datos.registrada ?? null;
            categoriaGuardada = !!datos.categoriaGuardada; estiloGuardado = !!datos.estiloGuardado;
            if (categoriaGuardada) mensaje("estadoRegistroCategoria", "Categoría ya guardada correctamente.");
            if (estiloGuardado) mensaje("estadoRegistroEstilo", "Estilo ya guardado correctamente.");
            mensaje("estadoRegistroPareja", registrada === null ? "Borrador recuperado. Todavía no está guardado en la base de datos." : `Pareja ${registrada} ya guardada. Continúa con categoría y estilo o inicia otra pareja.`);
        }
    } catch {
        recuperacionFallida = true;
        mensaje("estadoBorradorRegistro", "No se pudo recuperar el borrador. No se ha eliminado; vuelve a abrir este módulo antes de introducir datos nuevos.", true);
        // Evitar sobrescribir un borrador que no se pudo recuperar.
        return;
    }
    cargando = false; actualizar();
}

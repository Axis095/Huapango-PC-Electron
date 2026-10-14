function objeto(valor) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Los datos enviados no son válidos.");
    return valor;
}
function idPositivo(valor) {
    const texto = typeof valor === "string" ? valor.trim() : typeof valor === "number" ? String(valor) : "";
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) <= 0) {
        throw new Error("El ID debe ser un entero positivo.");
    }
    return Number(texto);
}
function texto(valor, campo) {
    if (typeof valor !== "string" || !valor.trim()) throw new Error(`Completa el campo ${campo}.`);
    return valor.trim();
}
function validarPareja(datos, alta) {
    objeto(datos); idPositivo(datos.nParejaID);
    for (const persona of ["Masculino", "Femenino"]) {
        for (const campo of ["cNombre", "cApellido", "cEmail", "nTelefono", "dNacimiento"]) texto(datos[campo + persona], campo);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos["cEmail" + persona].trim())) throw new Error("El correo no tiene un formato válido.");
        if (!/^\+?[0-9]{1,3}[-\s]?[0-9]{8,15}$/.test(datos["nTelefono" + persona].trim())) throw new Error("El teléfono no tiene un formato válido.");
        const fecha = datos["dNacimiento" + persona];
        const date = new Date(fecha);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fecha || date > new Date()) {
            throw new Error("La fecha de nacimiento no es válida o está en el futuro.");
        }
        if (alta && !["M", "F"].includes(datos["sexo" + persona])) throw new Error("Selecciona un sexo válido.");
    }
}
function validarSolicitud(canal, args) {
    const datos = args[0];
    if (["registrar-pareja", "actualizar-pareja-completa"].includes(canal)) validarPareja(datos, canal === "registrar-pareja");
    if (["registrar-categoria", "registrar-estilo"].includes(canal)) {
        objeto(datos); idPositivo(datos.nParejaID);
        const categoria = canal === "registrar-categoria";
        idPositivo(datos[categoria ? "nIDCategoria" : "nEstiloID"]);
        texto(datos[categoria ? "cCategoriaNombre" : "cEstiloNombre"], categoria ? "categoría" : "estilo");
    }
    if (["buscar-pareja-por-id", "eliminar-pareja", "buscar-categoria-por-id", "buscar-estilo-por-id", "eliminar-categoria", "eliminar-estilo"].includes(canal)) idPositivo(datos);
    // Estos endpoints no tienen consumidor activo y su SQL usa columnas sin
    // correspondencia con las altas actuales. No ejecutar escrituras ambiguas.
    if (["actualizar-categoria", "actualizar-estilo"].includes(canal)) {
        throw Object.assign(new Error("Esta operación requiere validar el esquema de categorías y estilos antes de habilitarse."), { code: "UNSUPPORTED_OPERATION" });
    }
}
module.exports = { objeto, idPositivo, texto, validarSolicitud };

const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { obtenerSesion, obtenerClaveSesion } = require("../Modelos/sesionModel");

// Separado de Registro, aislado por sesión y ventana, solo en memoria.
const borradores = new WeakMap();
const vistas = ["ModificarParejas.html", "BusquedaParejas.html"].map(nombre => path.resolve(__dirname, "../Vistas", nombre));
function permitido(event) {
    try {
        const sesion = obtenerSesion();
        return ["admin", "user"].includes(sesion?.userRole) &&
            Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
            !!obtenerClaveSesion() && !!event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
            vistas.includes(path.resolve(fileURLToPath(event.senderFrame.url)));
    } catch { return false; }
}
function almacen() {
    const clave = obtenerClaveSesion();
    if (!borradores.has(clave)) borradores.set(clave, new WeakMap());
    return borradores.get(clave);
}
function denegado() {
    const mensaje = "Se requiere una sesión de usuario o administrador desde Búsqueda o Modificación para acceder al borrador.";
    return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
}
function obtenerBorradorModificacion(event) {
    if (!permitido(event)) return denegado();
    return { success: true, data: almacen().get(event.sender) ?? null };
}
function guardarBorradorModificacion(event, datos) {
    if (!permitido(event)) return denegado();
    if (!datos || ![1, 2].includes(datos.version) || !datos.campos || !datos.fotos) return { success: false };
    almacen().set(event.sender, datos);
    return { success: true };
}
function limpiarBorradorModificacion(event) {
    if (!permitido(event)) return denegado();
    almacen().delete(event.sender);
    return { success: true };
}
module.exports = { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion };

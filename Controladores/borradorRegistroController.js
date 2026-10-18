const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { obtenerSesion, obtenerClaveSesion } = require("../Modelos/sesionModel");

// Sesión -> ventana -> datos. Las claves débiles permiten liberar sesiones cerradas.
const borradores = new WeakMap();
const vista = path.resolve(__dirname, "../Vistas/Registros.html");

function permitido(event) {
    try {
        const sesion = obtenerSesion();
        return ["admin", "user"].includes(sesion?.userRole) &&
            Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
            !!obtenerClaveSesion() && !!event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
            path.resolve(fileURLToPath(event.senderFrame.url)) === vista;
    } catch { return false; }
}

function almacen() {
    const clave = obtenerClaveSesion();
    if (!borradores.has(clave)) borradores.set(clave, new WeakMap());
    return borradores.get(clave);
}

function denegado() {
    const mensaje = "Se requiere una sesión de usuario o administrador desde Registro para acceder al borrador.";
    return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
}

function obtenerBorradorRegistro(event) {
    if (!permitido(event)) return denegado();
    return { success: true, data: almacen().get(event.sender) ?? null };
}

function guardarBorradorRegistro(event, datos) {
    if (!permitido(event)) return denegado();
    if (!datos || datos.version !== 1 || !datos.campos || !datos.fotos) {
        return { success: false };
    }
    // IPC clona los datos de entrada y salida; no se comparten objetos con la vista.
    almacen().set(event.sender, datos);
    return { success: true };
}

function limpiarBorradorRegistro(event) {
    if (!permitido(event)) return denegado();
    almacen().delete(event.sender);
    return { success: true };
}

module.exports = { obtenerBorradorRegistro, guardarBorradorRegistro, limpiarBorradorRegistro };

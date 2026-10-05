const path = require("node:path");
const { fileURLToPath } = require("node:url");

// Separado de Registro, aislado por ventana y conservado solo en memoria.
const borradores = new WeakMap();
const vista = path.resolve(__dirname, "../Vistas/ModificarParejas.html");
function permitido(event) {
    try {
        return event.senderFrame === event.sender.mainFrame &&
            path.resolve(fileURLToPath(event.senderFrame.url)) === vista;
    } catch { return false; }
}
function obtenerBorradorModificacion(event) {
    if (!permitido(event)) return { success: false };
    return { success: true, data: borradores.get(event.sender) ?? null };
}
function guardarBorradorModificacion(event, datos) {
    if (!permitido(event) || !datos || datos.version !== 1 || !datos.campos || !datos.fotos) return { success: false };
    borradores.set(event.sender, datos);
    return { success: true };
}
function limpiarBorradorModificacion(event) {
    if (!permitido(event)) return { success: false };
    borradores.delete(event.sender);
    return { success: true };
}
module.exports = { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion };

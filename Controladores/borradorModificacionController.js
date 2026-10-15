const path = require("node:path");
const { fileURLToPath } = require("node:url");
const { prepararBorrador } = require('./borradorDatos');

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
    if (!permitido(event)) return { success: false };
    const validado = prepararBorrador(datos, borradores.get(event.sender), 'modificacion');
    if (!validado) return { success: false, code: 'INVALID_DRAFT', error: 'Borrador inválido o demasiado grande.' };
    borradores.set(event.sender, validado);
    return { success: true };
}
function limpiarBorradorModificacion(event) {
    if (!permitido(event)) return { success: false };
    borradores.delete(event.sender);
    return { success: true };
}
module.exports = { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion };

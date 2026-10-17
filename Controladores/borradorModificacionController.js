const { obtenerRutasAplicacion } = require('../Servicios/rutasVistas');
const { prepararBorrador } = require('./borradorDatos');

// Separado de Registro, aislado por ventana y conservado solo en memoria.
const borradores = new WeakMap();
function permitido(event) {
    try {
        return event.senderFrame === event.sender.mainFrame &&
            obtenerRutasAplicacion().vistaDeURL(event.senderFrame.url) === 'ModificarParejas.html';
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

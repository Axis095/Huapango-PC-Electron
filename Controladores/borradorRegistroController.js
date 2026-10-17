const { obtenerRutasAplicacion } = require('../Servicios/rutasVistas');
const { prepararBorrador } = require('./borradorDatos');

// Borradores en memoria por ventana. No se escriben fotos ni datos personales a disco.
const borradores = new WeakMap();

function permitido(event) {
    try {
        return event.senderFrame === event.sender.mainFrame &&
            obtenerRutasAplicacion().vistaDeURL(event.senderFrame.url) === 'Registros.html';
    } catch { return false; }
}

function obtenerBorradorRegistro(event) {
    if (!permitido(event)) return { success: false };
    return { success: true, data: borradores.get(event.sender) ?? null };
}

function guardarBorradorRegistro(event, datos) {
    if (!permitido(event)) return { success: false };
    const validado = prepararBorrador(datos, borradores.get(event.sender), 'registro');
    if (!validado) return { success: false, code: 'INVALID_DRAFT', error: 'Borrador inválido o demasiado grande.' };
    // IPC clona los datos de entrada y salida; no se comparten objetos con la vista.
    borradores.set(event.sender, validado);
    return { success: true };
}

function limpiarBorradorRegistro(event) {
    if (!permitido(event)) return { success: false };
    borradores.delete(event.sender);
    return { success: true };
}

module.exports = { obtenerBorradorRegistro, guardarBorradorRegistro, limpiarBorradorRegistro };

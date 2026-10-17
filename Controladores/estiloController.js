const { mensajePublico } = require("../Seguridad/errores");
const { registrarEstilo, buscarEstiloPorID, actualizarEstilo, eliminarEstilo, verificarEstiloExistente, verificarParejaEnEstilo   } = require("../Modelos/estiloModel");

// Controlador para registrar un estilo
async function handleRegistrarEstilo(event, datos) {
    try {
        const nEstiloID = await registrarEstilo(datos);
        return { success: true, id: nEstiloID };
    } catch (err) {
        console.error("Error al registrar estilo:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

// Controlador para buscar un estilo por ID
async function handleBuscarEstiloPorID(event, id) {
    try {
        const result = await buscarEstiloPorID(id);
        if (result.length === 0) {
            return { success: false, message: "No se encontró ningún estilo con ese ID." };
        }
        return { success: true, data: result };
    } catch (err) {
        console.error("Error en el controlador al buscar estilo:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

// Controlador para actualizar un estilo
async function handleActualizarEstilo(event, { id, datos }) {
    try {
        const affectedRows = await actualizarEstilo(id, datos);
        if (affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, message: "No se encontró ningún estilo con ese ID." };
        }
    } catch (err) {
        console.error("Error en el controlador al actualizar estilo:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

// Controlador para eliminar un estilo
async function handleEliminarEstilo(event, id) {
    try {
        const affectedRows = await eliminarEstilo(id);
        if (affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, message: "No se encontró ningún estilo con ese ID." };
        }
    } catch (err) {
        console.error("Error en el controlador al eliminar estilo:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

module.exports = { handleRegistrarEstilo, handleBuscarEstiloPorID, handleActualizarEstilo, handleEliminarEstilo };

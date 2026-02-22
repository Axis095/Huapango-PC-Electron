const { registrarPareja, buscarParejaPorID, buscarTodasLasParejas, actualizarPareja, eliminarPareja, actualizarParejaCompleta } = require("../Modelos/parejaModel");

// Controlador para registrar una pareja
async function handleRegistrarPareja(event, datos) {
    try {
        const parejaId = await registrarPareja(datos);
        return { success: true, id: parejaId };
    } catch (err) {
        console.error("Error en el controlador de registro de pareja:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para buscar pareja por ID
async function handleBuscarParejaPorID(event, id) {
    try {
        const result = await buscarParejaPorID(id);
        if (result.length === 0) {
            return { success: false, message: "No se encontró ninguna pareja con ese ID." };
        }
        return { success: true, data: result };
    } catch (err) {
        console.error("Error en el controlador de búsqueda de pareja:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para buscar todas las parejas
async function handleBuscarTodasLasParejas(event) {
    try {
        const result = await buscarTodasLasParejas();
        return { success: true, data: result };
    } catch (err) {
        console.error("Error en el controlador de búsqueda de todas las parejas:", err);
        return { success: false, error: err.message };
    }
}


// Controlador para actualizar una pareja
async function handleActualizarPareja(event, datos) {
    try {
        const filasAfectadas = await actualizarParejaCompleta(datos);
        if (filasAfectadas === 0) {
            return { success: false, message: "No se encontró ninguna pareja con ese ID para actualizar." };
        }
        return { success: true, message: "Pareja actualizada exitosamente." };
    } catch (err) {
        console.error("Error en el controlador de actualización de pareja:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para eliminar una pareja
async function handleEliminarPareja(event, id) {
    try {
        const filasAfectadas = await eliminarPareja(id);
        if (filasAfectadas === 0) {
            return { success: false, message: "No se encontró ninguna pareja con ese ID." };
        }
        return { success: true, message: "Pareja eliminada exitosamente." };
    } catch (err) {
        console.error("Error en el controlador al eliminar pareja:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { handleRegistrarPareja, handleBuscarParejaPorID, handleBuscarTodasLasParejas, handleActualizarPareja, handleEliminarPareja };
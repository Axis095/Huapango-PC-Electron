const { registrarPareja, buscarParejaPorID, buscarParejaParaEvaluacion, buscarTodasLasParejas, eliminarPareja, actualizarParejaCompleta } = require("../Modelos/parejaModel");

// Controlador para registrar una pareja
async function handleRegistrarPareja(event, datos) {
    try {
        const parejaId = await registrarPareja(datos);
        return { success: true, id: parejaId };
    } catch (err) {
        console.error("Error en el controlador de registro de pareja:", err);
        return { success: false, code: err.code || "REGISTER_FAILED", error: err.message };
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

// La validación se aplica también al recibir la solicitud desde IPC.
async function handleBuscarParejaParaEvaluacion(event, id) {
    const textoID = typeof id === "string" ? id.trim() : typeof id === "number" ? String(id) : "";
    const numeroID = Number(textoID);
    if (!["string", "number"].includes(typeof id) || !/^\d+$/.test(textoID) ||
        !Number.isSafeInteger(numeroID) || numeroID <= 0) {
        return { success: false, code: "INVALID_ID", message: "Ingresa un ID de pareja entero y positivo." };
    }

    try {
        const resultados = await buscarParejaParaEvaluacion(numeroID);
        if (resultados.length === 0) {
            return { success: false, code: "NOT_FOUND", message: "No se encontró ninguna pareja con ese ID." };
        }
        return { success: true, data: resultados[0] };
    } catch (err) {
        console.error("Error al consultar la pareja para evaluación:", err);
        return { success: false, code: "QUERY_ERROR", message: "No se pudo consultar la pareja. Intenta nuevamente." };
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
        const resultado = await actualizarParejaCompleta(datos);
        if (resultado?.code === "NOT_FOUND") {
            return { success: false, code: "NOT_FOUND", error: "No se encontró ninguna pareja con ese ID para actualizar." };
        }
        if (resultado?.success !== true || !["UPDATED", "UNCHANGED"].includes(resultado.code)) {
            return { success: false, code: "UPDATE_FAILED", error: resultado?.error || "No se pudo confirmar la actualización de la pareja." };
        }
        return { success: true, code: resultado.code,
            message: resultado.code === "UNCHANGED" ? "La pareja ya tenía esos datos. No hubo cambios." : "Pareja actualizada exitosamente." };
    } catch (err) {
        console.error("Error en el controlador de actualización de pareja:", err);
        return { success: false, code: err.code || "UPDATE_FAILED", error: err.message };
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
        return { success: false, code: err.code || "DELETE_FAILED", error: err.message };
    }
}

module.exports = { handleRegistrarPareja, handleBuscarParejaPorID, handleBuscarParejaParaEvaluacion, handleBuscarTodasLasParejas, handleActualizarPareja, handleEliminarPareja };

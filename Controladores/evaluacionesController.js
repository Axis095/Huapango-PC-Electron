const { registrarEvaluacion, obtenerEvaluacionesPorPareja } = require("../Modelos/evaluacionesModel");

// Controlador para registrar una evaluación
async function handleRegistrarEvaluacion(event, datos) {
    try {
        if (!datos.nJuezID || !datos.nParejaID || datos.nPuntaje === undefined) {
            throw new Error("Todos los datos son obligatorios para registrar una evaluación.");
        }

        // // Generar nuevo ID antes de insertar la evaluación
        // const nEvaluacionID = await obtenerUltimoID();
        // console.log("🆔 ID generado para la evaluación:", nEvaluacionID);
        // datos.nEvaluacionID = nEvaluacionID;

        // Registrar evaluación en la base de datos
        const result = await registrarEvaluacion(datos);
        return { success: true, id: result.id };
    } catch (err) {
        console.error("Error en el controlador al registrar evaluación:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para obtener evaluaciones por pareja
async function handleObtenerEvaluacionesPorPareja(event, nParejaID) {
    try {
        if (!nParejaID) {
            throw new Error("Se requiere un ID de pareja para obtener evaluaciones.");
        }

        // Obtener evaluaciones de la pareja específica
        const evaluaciones = await obtenerEvaluacionesPorPareja(nParejaID);
        return { success: true, data: evaluaciones };
    } catch (err) {
        console.error("Error en el controlador al obtener evaluaciones:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja };

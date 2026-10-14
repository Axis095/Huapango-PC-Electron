const { registrarEvaluacion, obtenerEvaluacionesPorPareja } = require("../Modelos/evaluacionesModel");
const { obtenerSesion } = require("../Modelos/sesionModel");
const { objeto, idPositivo } = require("../Seguridad/datos");

// Controlador para registrar una evaluación
async function handleRegistrarEvaluacion(event, datos) {
    try {
        const sesion = obtenerSesion();
        if (!sesion || !["admin", "juez"].includes(sesion.userRole)) {
            return { success: false, code: "FORBIDDEN", error: "No tienes permiso para registrar evaluaciones." };
        }
        objeto(datos);
        const nParejaID = idPositivo(datos.nParejaID);
        idPositivo(sesion.userID);
        const nJuezID = sesion.userID;
        if (typeof datos.nPuntaje !== "number" || !Number.isInteger(datos.nPuntaje) || datos.nPuntaje < 0 || datos.nPuntaje > 60) {
            throw new Error("El puntaje debe ser un entero entre 0 y 60.");
        }
        const cComentario = datos.cComentario ?? "";
        if (typeof cComentario !== "string" || cComentario.length > 255) throw new Error("El comentario debe ser texto de hasta 255 caracteres.");
        const result = await registrarEvaluacion({ nJuezID, nParejaID, nPuntaje: datos.nPuntaje, cComentario });
        return { success: true, id: result.id };
    } catch (err) {
        console.error("Error en el controlador al registrar evaluación:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para obtener evaluaciones por pareja
async function handleObtenerEvaluacionesPorPareja(event, nParejaID) {
    try {
        nParejaID = idPositivo(nParejaID);

        // Obtener evaluaciones de la pareja específica
        const evaluaciones = await obtenerEvaluacionesPorPareja(nParejaID);
        return { success: true, data: evaluaciones };
    } catch (err) {
        console.error("Error en el controlador al obtener evaluaciones:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja };

const { mensajePublico } = require("../Seguridad/errores");
const { registrarEvaluacion, obtenerEvaluacionesPorPareja } = require("../Modelos/evaluacionesModel");
const { obtenerSesion } = require("../Modelos/sesionModel");
const { objeto, idPositivo } = require("../Seguridad/datos");
const { idUsuario } = require("../Seguridad/identidad");

// Controlador para registrar una evaluación
async function handleRegistrarEvaluacion(event, datos) {
    try {
        const sesion = obtenerSesion();
        if (!sesion || !["admin", "juez"].includes(sesion.userRole)) {
            return { success: false, code: "FORBIDDEN", error: "No tienes permiso para registrar evaluaciones." };
        }
        objeto(datos);
        const nParejaID = idPositivo(datos.nParejaID);
        idUsuario(sesion.userID);
        const nJuezID = sesion.userID;
        if (typeof datos.nPuntaje !== "number" || !Number.isInteger(datos.nPuntaje) || datos.nPuntaje < 0 || datos.nPuntaje > 60) {
            throw Object.assign(new Error("El puntaje debe ser un entero entre 0 y 60."), { code: "INVALID_DATA" });
        }
        const cComentario = datos.cComentario ?? "";
        if (typeof cComentario !== "string" || cComentario.length > 255) throw Object.assign(new Error("El comentario debe ser texto de hasta 255 caracteres."), { code: "INVALID_DATA" });
        const result = await registrarEvaluacion({ nJuezID, nParejaID, nPuntaje: datos.nPuntaje, cComentario });
        return { success: true, id: result.id, replayed: result.replayed };
    } catch (err) {
        console.error("Error en el controlador al registrar evaluación:", err.code || "UNEXPECTED");
        return { success: false, code: err.code, error: mensajePublico(err) };
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
        console.error("Error en el controlador al obtener evaluaciones:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

module.exports = { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja };

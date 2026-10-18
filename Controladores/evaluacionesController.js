const { registrarEvaluacion, obtenerEvaluacionesPorPareja } = require("../Modelos/evaluacionesModel");
const { obtenerSesion } = require("../Modelos/sesionModel");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

function sesionParaEvaluar(event) {
    try {
        const sesion = obtenerSesion();
        if (["juez", "admin"].includes(sesion?.userRole) &&
            Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
            event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
            path.resolve(fileURLToPath(event.senderFrame.url)) ===
                path.resolve(__dirname, "../Vistas/Resultados.html")) {
            return sesion;
        }
    } catch { /* Un emisor inválido no obtiene permisos. */ }
    return null;
}

// Controlador para registrar una evaluación
async function handleRegistrarEvaluacion(event, datos) {
    // Este controlador se ejecuta en el proceso principal. Autorizar antes
    // de validar el formulario y antes de cualquier acceso a MySQL.
    const sesion = sesionParaEvaluar(event);
    if (!sesion) {
        const mensaje = "Se requiere una sesión de juez o administrador desde la pantalla de Evaluación para guardar puntajes.";
        return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
    }

    try {
        if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
            return { success: false, code: "INVALID_DATA", error: "Los datos de la evaluación no son válidos." };
        }
        const id = typeof datos.nParejaID === "string" ? datos.nParejaID.trim() :
            typeof datos.nParejaID === "number" ? String(datos.nParejaID) : "";
        if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
            return { success: false, code: "INVALID_DATA", error: "ID de la pareja inválido." };
        }
        if (!Number.isInteger(datos.nPuntaje) || datos.nPuntaje < 0 || datos.nPuntaje > 60) {
            return { success: false, code: "INVALID_DATA", error: "El puntaje debe ser un entero entre 0 y 60." };
        }
        const comentario = datos.cComentario === undefined ? "" : datos.cComentario;
        if (typeof comentario !== "string" || comentario.length > 255) {
            return { success: false, code: "INVALID_DATA", error: "El comentario debe ser texto de hasta 255 caracteres." };
        }
        // No copiar campos de identidad ni roles proporcionados por el cliente.
        const result = await registrarEvaluacion({
            nJuezID: sesion.userID,
            nParejaID: Number(id),
            nPuntaje: datos.nPuntaje,
            cComentario: comentario
        });
        return { success: true, id: result.id };
    } catch (err) {
        console.error("Error en el controlador al registrar evaluación:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para obtener evaluaciones por pareja
async function handleObtenerEvaluacionesPorPareja(event, nParejaID) {
    const sesion = sesionParaEvaluar(event);
    if (!sesion) {
        const mensaje = "Se requiere una sesión de juez o administrador desde la pantalla de Evaluación para consultar puntajes.";
        return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
    }
    try {
        const id = typeof nParejaID === "string" ? nParejaID.trim() :
            typeof nParejaID === "number" ? String(nParejaID) : "";
        if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
            return { success: false, code: "INVALID_ID", error: "Ingresa un ID de pareja entero y positivo." };
        }

        // El alcance se deriva de la sesión; nunca de un ID de juez del renderizador.
        const evaluaciones = await obtenerEvaluacionesPorPareja(Number(id), sesion.userRole === "admin" ? null : sesion.userID);
        return { success: true, data: evaluaciones };
    } catch (err) {
        console.error("Error en el controlador al obtener evaluaciones:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja };

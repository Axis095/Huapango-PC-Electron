const { guardarConfiguracion, cargarConfiguracion, normalizarConfiguracion, configuracionInicial } = require("../Modelos/configModel");
const { probarConexion } = require("../db");

function handleObtenerConfiguracion() {
    try {
        const config = cargarConfiguracion();
        // La contraseña guardada nunca se envía al renderizador.
        return { success: true, data: {
            host: typeof config?.host === "string" ? config.host : configuracionInicial.host,
            port: config?.port ?? 3306,
            user: typeof config?.user === "string" ? config.user : "",
            database: typeof config?.database === "string" ? config.database : ""
        } };
    } catch (error) {
        return { success: false, error: error.message, data: { ...configuracionInicial, password: undefined } };
    }
}

let guardando = false;
async function handleGuardarConfiguracion(event, nuevaConfig, sigueAutorizado = () => true) {
    if (guardando) return { success: false, error: "Ya se está comprobando una conexión. Espera a que termine." };
    guardando = true;
    try {
        const config = normalizarConfiguracion(nuevaConfig);
        await probarConexion(config);
        if (!sigueAutorizado()) {
            return { success: false, code: "FORBIDDEN", error: "La autorización para configurar terminó. No se guardaron cambios." };
        }
        return guardarConfiguracion(config);
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        guardando = false;
    }
}

module.exports = { handleGuardarConfiguracion, handleObtenerConfiguracion };

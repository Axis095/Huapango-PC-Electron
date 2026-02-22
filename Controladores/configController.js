const { app } = require("electron");
const { guardarConfiguracion } = require("../Modelos/configModel");

async function handleGuardarConfiguracion(event, nuevaConfig) {
    try {
        console.log("Guardando nueva configuración...");
        const resultado = guardarConfiguracion(nuevaConfig);

        if (resultado.success) {
            console.log("✅ Configuración guardada. Reiniciando la aplicación...");
            app.relaunch(); // Reinicia la app con la nueva configuración
            app.exit(); // Cierra la instancia actual antes de reiniciar
        }

        return resultado;
    } catch (error) {
        console.error("Error en el controlador de configuración:", error);
        return { success: false, error: error.message };
    }
}

module.exports = { handleGuardarConfiguracion };

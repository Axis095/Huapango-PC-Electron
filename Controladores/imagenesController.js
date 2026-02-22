const { ipcMain, app } = require("electron");
const { guardarImagen } = require("../Modelos/imagenesModel");
const fs = require("fs");
const path = require("path");

async function handleGuardarImagen(event, origen, destino) {
    try {
        console.log(`📝 Solicitud recibida para guardar imagen:`);
        console.log(`   - Origen: ${origen}`);
        console.log(`   - Destino solicitado: ${destino}`);
        
        // Si el destino es una ruta absoluta directa a C:/, convertirla a relativa
        let destinoFinal = destino;
        
        // Si el destino es una ruta absoluta, extraer solo el nombre de archivo
        if (path.isAbsolute(destino)) {
            const fileName = path.basename(destino);
            // Construir una ruta relativa en la carpeta 'uploads' de la aplicación
            destinoFinal = path.join('uploads', fileName);
            console.log(`   - Destino convertido a relativo: ${destinoFinal}`);
        }
        
        // Guardar imagen con la ruta ajustada
        const resultado = await guardarImagen(origen, destinoFinal);
        
        if (resultado.success) {
            console.log(`✅ Imagen guardada exitosamente en: ${resultado.ruta}`);
        } else {
            console.error(`❌ Error al guardar imagen: ${resultado.error}`);
        }
        
        return resultado;
    } catch (error) {
        console.error(`❌ Error inesperado en handleGuardarImagen: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function handleGuardarImagenBuffer(event, arrayBuffer, destino) {
    try {
        const uploadsPath = path.join(app.getPath("userData"), "uploads");
        const destinoFinal = path.join(uploadsPath, path.basename(destino));

        // 🔹 Crear directorio si no existe
        if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

        // 🔹 Guardar imagen
        fs.writeFileSync(destinoFinal, Buffer.from(arrayBuffer));

        return { success: true, ruta: destinoFinal };
    } catch (error) {
        return { success: false, error: error.message };
    }
}



module.exports = { handleGuardarImagen, handleGuardarImagenBuffer };
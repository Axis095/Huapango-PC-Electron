const fs = require("fs");
const path = require("path");
const { app } = require("electron");

// 📂 Ruta segura para almacenamiento de imágenes en producción
const uploadsPath = path.join(app.getPath("userData"), "uploads");

// Asegurar que la carpeta `uploads/` exista en `userData`
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`✅ Directorio de imágenes creado en: ${uploadsPath}`);
}

async function guardarImagen(origen, destino) {
    try {
        if (!origen || !destino) {
            throw new Error("❌ La ruta de origen o destino no es válida.");
        }

        // 🔹 Convertir `destino` a una ruta dentro de `userData/uploads`
        const destinoFinal = path.join(uploadsPath, path.basename(destino));

        console.log(`🔄 Copiando imagen de ${origen} a ${destinoFinal}`);
        fs.copyFileSync(origen, destinoFinal);

        return { success: true, ruta: destinoFinal };
    } catch (err) {
        console.error("❌ Error al guardar la imagen:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { guardarImagen };

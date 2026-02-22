const { dialog, shell } = require('electron');
const { generarPDFParejas, generarPDFResultados, generarPDFCategorias, generarPDFEstilos, generarPDFRegistrosGenerales  } = require("../Modelos/pdfModel");

async function handleGenerarPDFParejas(event) {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Guardar PDF de Parejas",
            defaultPath: "parejas_registradas.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (!filePath) return { success: false, error: "Cancelado por el usuario" };

        await generarPDFParejas(filePath);
        await shell.openPath(filePath); // 🔹 Abrir el PDF automáticamente
        return { success: true, ruta: filePath };
    } catch (err) {
        console.error("❌ Error al generar el PDF de parejas:", err);
        return { success: false, error: err.message };
    }
}

async function handleGenerarPDFResultados(event) {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Guardar PDF de Resultados",
            defaultPath: "resultados_evaluaciones.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (!filePath) return { success: false, error: "Cancelado por el usuario" };

        await generarPDFResultados(filePath);
        await shell.openPath(filePath);
        return { success: true, ruta: filePath };
    } catch (err) {
        console.error("❌ Error al generar el PDF de resultados:", err);
        return { success: false, error: err.message };
    }
}

async function handleGenerarPDFCategorias(event) {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Guardar PDF de Categorías",
            defaultPath: "categorias_registradas.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (!filePath) return { success: false, error: "Cancelado por el usuario" };

        await generarPDFCategorias(filePath);
        await shell.openPath(filePath);
        return { success: true, ruta: filePath };
    } catch (err) {
        console.error("❌ Error al generar el PDF de categorías:", err);
        return { success: false, error: err.message };
    }
}

async function handleGenerarPDFEstilos(event) {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Guardar PDF de Estilos",
            defaultPath: "estilos_registrados.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (!filePath) return { success: false, error: "Cancelado por el usuario" };

        await generarPDFEstilos(filePath);
        await shell.openPath(filePath);
        return { success: true, ruta: filePath };
    } catch (err) {
        console.error("❌ Error al generar el PDF de estilos:", err);
        return { success: false, error: err.message };
    }
}

async function handleGenerarPDFRegistrosGenerales(event) {
    try {
        const { filePath } = await dialog.showSaveDialog({
            title: "Guardar PDF de Registros Generales",
            defaultPath: "registros_generales.pdf",
            filters: [{ name: "PDF", extensions: ["pdf"] }]
        });

        if (!filePath) return { success: false, error: "Cancelado por el usuario" };

        await generarPDFRegistrosGenerales(filePath);
        await shell.openPath(filePath);
        return { success: true, ruta: filePath };
    } catch (err) {
        console.error("❌ Error al generar el PDF de registros generales:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias, handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales };
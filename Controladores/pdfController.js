const { mensajePublico } = require("../Seguridad/errores");
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
        const apertura = await shell.openPath(filePath); // 🔹 Abrir el PDF automáticamente
        return { success: true, ruta: filePath, warning: apertura ? "El PDF se guardó, pero no se pudo abrir. Ábrelo desde la ruta seleccionada." : undefined };
    } catch (err) {
        console.error("Error al generar el PDF de parejas:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
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
        const apertura = await shell.openPath(filePath);
        return { success: true, ruta: filePath, warning: apertura ? "El PDF se guardó, pero no se pudo abrir. Ábrelo desde la ruta seleccionada." : undefined };
    } catch (err) {
        console.error("Error al generar el PDF de resultados:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
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
        const apertura = await shell.openPath(filePath);
        return { success: true, ruta: filePath, warning: apertura ? "El PDF se guardó, pero no se pudo abrir. Ábrelo desde la ruta seleccionada." : undefined };
    } catch (err) {
        console.error("Error al generar el PDF de categorías:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
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
        const apertura = await shell.openPath(filePath);
        return { success: true, ruta: filePath, warning: apertura ? "El PDF se guardó, pero no se pudo abrir. Ábrelo desde la ruta seleccionada." : undefined };
    } catch (err) {
        console.error("Error al generar el PDF de estilos:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
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
        const apertura = await shell.openPath(filePath);
        return { success: true, ruta: filePath, warning: apertura ? "El PDF se guardó, pero no se pudo abrir. Ábrelo desde la ruta seleccionada." : undefined };
    } catch (err) {
        console.error("Error al generar el PDF de registros generales:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

module.exports = { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias, handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales };

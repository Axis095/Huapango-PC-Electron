const PDFDocument = require("pdfkit");
const fs = require("fs");
const { pipeline } = require("node:stream/promises");
const { queryDatabase } = require("../db");

// Esperar tanto al documento como al archivo; cualquier error cierra ambos flujos.
async function escribirPDF(filePath, dibujar) {
    if (typeof filePath !== "string" || !filePath.trim()) {
        throw new Error("La ruta del archivo es inválida.");
    }
    const doc = new PDFDocument();
    let destino;
    try { destino = fs.createWriteStream(filePath); }
    catch (error) { doc.destroy(); throw error; }
    const terminado = pipeline(doc, destino);
    try {
        dibujar(doc);
        doc.end();
    } catch (error) {
        doc.destroy(error);
    }
    await terminado;
}

async function generarPDFParejas(filePath, antesDeEscribir = () => {}) {
    // Consultar los datos de la base de datos
    const resultados = await queryDatabase("SELECT * FROM T_Participantes");

    if (!Array.isArray(resultados) || resultados.length === 0) {
        console.warn("No se encontraron parejas registradas.");
        throw new Error("No se encontraron parejas registradas.");
    }

    if (!filePath || typeof filePath !== "string") {
        throw new Error("La ruta del archivo es inválida.");
    }

    antesDeEscribir();
    // Crear el documento PDF
    await escribirPDF(filePath, doc => {
        doc.fontSize(18).text("Parejas Registradas", { align: "center" });
        doc.moveDown();

        // Iterar sobre los resultados y agregarlos al PDF
        resultados.forEach((p, i) => {
            doc.fontSize(14).text(`Pareja #${i + 1}`, { underline: true });
            doc.fontSize(12)
                .text(`Participante Masculino: ${p.cNombre || "N/A"} ${p.cApellido || "N/A"}`)
                .text(`Participante Femenino: ${p.cNombreM || "N/A"} ${p.cApellidoM || "N/A"}`)
                .text(`Teléfono Masculino: ${p.nTelefono || "N/A"}`)
                .text(`Teléfono Femenino: ${p.nTelefonoM || "N/A"}`)
                .text(`Email Masculino: ${p.cEmail || "N/A"}`)
                .text(`Email Femenino: ${p.cEmailM || "N/A"}`)
                .moveDown();
        });
    });
    return { success: true, ruta: filePath };
}

async function generarPDFResultados(filePath, nJuezID, antesDeEscribir = () => {}) {
    if (nJuezID !== null && (!Number.isSafeInteger(nJuezID) || nJuezID <= 0)) {
        throw new Error("Se requiere un alcance válido para exportar evaluaciones.");
    }
    // Consulta los resultados de la tabla de evaluaciones
    const resultados = await queryDatabase(`
        SELECT e.nEvaluacionID, e.nParejaID, u.cNombreUsuario AS juez, e.nPuntaje, e.cComentario, e.dFechaEvaluacion
        FROM t_evaluaciones AS e
        JOIN t_usuarios AS u ON e.nJuezID = u.nUsuarioID
        ${nJuezID === null ? "" : "WHERE e.nJuezID = ?"}
        ORDER BY e.dFechaEvaluacion DESC
    `, nJuezID === null ? [] : [nJuezID]);

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error("No se encontraron evaluaciones registradas.");
    }

    if (!filePath || typeof filePath !== "string") {
        throw new Error("La ruta del archivo es inválida.");
    }
    antesDeEscribir();
    await escribirPDF(filePath, doc => {
        doc.fontSize(18).text(nJuezID === null ? "Resultados de Evaluaciones" : "Mis Evaluaciones", { align: "center" });
        doc.moveDown();

        resultados.forEach((r) => {
            doc.fontSize(14).text(`Evaluación #${r.nEvaluacionID}`, { underline: true });
            doc.fontSize(12)
                .text(`Pareja ID: ${r.nParejaID}`)
                .text(`Juez: ${r.juez}`)
                .text(`Puntaje: ${r.nPuntaje}`)
                .text(`Comentario: ${r.cComentario || "Sin comentario"}`)
                .text(`Fecha: ${new Date(r.dFechaEvaluacion).toLocaleString()}`)
                .moveDown();
        });
    });
    return { success: true, ruta: filePath };
}

async function generarPDFCategorias(filePath, antesDeEscribir = () => {}) {
    const resultados = await queryDatabase("SELECT * FROM T_Categorias");

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error(" No se encontraron categorías registradas.");
    }

    if (!filePath || typeof filePath !== "string") {
        throw new Error("La ruta del archivo es inválida.");
    }
    antesDeEscribir();
    await escribirPDF(filePath, doc => {
        doc.fontSize(18).text("Categorías Registradas", { align: "center" });
        doc.moveDown();

        resultados.forEach((c, i) => {
            doc.fontSize(14).text(`Categoría #${i + 1}`, { underline: true });
            doc.fontSize(12)
                .text(`ID Categoría: ${c.nIDCategoria}`)
                .text(`Nombre: ${c.cCategoriaNombre}`)
                .text(`ID Pareja: ${c.nParejaID}`)
                .moveDown();
        });
    });
    return { success: true, ruta: filePath };
}

async function generarPDFEstilos(filePath, antesDeEscribir = () => {}) {
    const resultados = await queryDatabase("SELECT * FROM T_Estilos");

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error(" No se encontraron estilos registrados.");
    }

    if (!filePath || typeof filePath !== "string") {
        throw new Error("La ruta del archivo es inválida.");
    }
    antesDeEscribir();
    await escribirPDF(filePath, doc => {
        doc.fontSize(18).text("Estilos Registrados", { align: "center" });
        doc.moveDown();

        resultados.forEach((e, i) => {
            doc.fontSize(14).text(`Estilo #${i + 1}`, { underline: true });
            doc.fontSize(12)
                .text(`ID Estilo: ${e.nEstiloID}`)
                .text(`Nombre: ${e.cEstiloNombre}`)
                .text(`ID Pareja: ${e.nParejaID}`)
                .moveDown();
        });
    });
    return { success: true, ruta: filePath };
}

async function generarPDFRegistrosGenerales(filePath, antesDeEscribir = () => {}) {
    const registros = await queryDatabase(`
        SELECT nDatos_nuevos, cAcción, dFecha_hora
        FROM t_registros_generales
        ORDER BY dFecha_hora DESC
    `);

    if (!Array.isArray(registros) || registros.length === 0) {
        throw new Error("No se encontraron registros generales.");
    }
    antesDeEscribir();
    await escribirPDF(filePath, doc => {
        doc.fontSize(18).text("Registro General de Eventos", { align: "center" });
        doc.moveDown();

        registros.forEach((registro) => {
            doc.fontSize(14).text(`Evento #${registro.nDatos_nuevos}`, { underline: true });
            doc.fontSize(12)
                .text(`Acción: ${registro.cAcción}`)
                .text(`Fecha: ${new Date(registro.dFecha_hora).toLocaleString()}`)
                .moveDown();
        });
    });
    return filePath;
}

module.exports = { generarPDFParejas, generarPDFResultados, generarPDFCategorias, generarPDFEstilos, generarPDFRegistrosGenerales };

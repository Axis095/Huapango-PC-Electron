const { queryDatabase } = require("../db");

// Función para insertar una nueva evaluación
async function registrarEvaluacion(datos) {
    const sql = `
        INSERT INTO t_evaluaciones (nJuezID, nParejaID, nPuntaje, cComentario, dFechaEvaluacion)
        VALUES (?, ?, ?, ?, NOW())
    `;
    // await queryDatabase(sql, [nEvaluacionID, datos.nJuezID, datos.nParejaID, datos.nPuntaje, datos.cComentario]); // INTENTO DE GENERAR IDS AUTOMATICAS
    try {
        const result = await queryDatabase(sql, [
            datos.nJuezID,
            datos.nParejaID,
            datos.nPuntaje,
            datos.cComentario
        ]);
        return { success: true, id: result.insertId };
    } catch (err) {
        console.error("Error al registrar evaluación:", err);
        throw new Error("Error al registrar la evaluación: " + err.message);
    }
}

// Función para obtener todas las evaluaciones de una pareja específica
async function obtenerEvaluacionesPorPareja(nParejaID) {
    const sql = `
        SELECT e.nEvaluacionID, u.cNombreUsuario AS juez, e.nPuntaje, e.cComentario, e.dFechaEvaluacion
        FROM t_evaluaciones AS e
        JOIN t_usuarios AS u ON e.nJuezID = u.nUsuarioID
        WHERE e.nParejaID = ?
        ORDER BY e.dFechaEvaluacion DESC
    `;
    try {
        const result = await queryDatabase(sql, [nParejaID]);
        return result;
    } catch (err) {
        console.error("Error al obtener evaluaciones:", err);
        throw new Error("Error al obtener evaluaciones: " + err.message);
    }
}

// async function obtenerUltimoID() { // Probablemente esta función no sea necesario exportarla por que no se usara máss que para asignar IDs
//     const sql = "SELECT MAX(nEvaluacionID) AS ultimoID FROM T_Evaluaciones";
//     const result = await queryDatabase(sql);
//     return result[0].ultimoID ? result[0].ultimoID + 1 : 1; // No funciono
// }

module.exports = { registrarEvaluacion, obtenerEvaluacionesPorPareja };

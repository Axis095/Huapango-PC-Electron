const { queryDatabase, withTransaction } = require("../db");

// Función para insertar una nueva evaluación
async function registrarEvaluacion(datos) {
    return withTransaction(['t_participantes', 't_evaluaciones'], async consultar => {
        const parejas = await consultar('SELECT nParejaID FROM t_participantes WHERE nParejaID = ? FOR UPDATE', [String(datos.nParejaID)]);
        if (!parejas.length) throw Object.assign(new Error('No se encontró la pareja.'), { code: 'NOT_FOUND' });
        const previas = await consultar('SELECT nEvaluacionID, nPuntaje, cComentario FROM t_evaluaciones WHERE nJuezID = ? AND nParejaID = ? FOR UPDATE', [String(datos.nJuezID), String(datos.nParejaID)]);
        if (previas.length > 1) throw Object.assign(new Error('Hay evaluaciones históricas duplicadas. Solicita su revisión administrativa.'), { code: 'DUPLICATE_HISTORY' });
        if (previas.length) {
            const previa = previas[0];
            if (Number(previa.nPuntaje) === datos.nPuntaje && (previa.cComentario ?? '') === datos.cComentario) {
                return { success: true, id: previa.nEvaluacionID, replayed: true };
            }
            throw Object.assign(new Error('Ya registraste la evaluación definitiva de esta pareja. No se permiten cambios posteriores.'), { code: 'EVALUATION_EXISTS' });
        }
        const result = await consultar(`INSERT INTO t_evaluaciones (nJuezID, nParejaID, nPuntaje, cComentario, dFechaEvaluacion)
            VALUES (?, ?, ?, ?, NOW())`, [String(datos.nJuezID), String(datos.nParejaID), datos.nPuntaje, datos.cComentario]);
        return { success: true, id: result.insertId, replayed: false };
    });
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
        const result = await queryDatabase(sql, [String(nParejaID)]);
        return result;
    } catch (err) {
        console.error("Error al obtener evaluaciones:", err.code || "UNEXPECTED");
        throw err;
    }
}

// async function obtenerUltimoID() { // Probablemente esta función no sea necesario exportarla por que no se usara máss que para asignar IDs
//     const sql = "SELECT MAX(nEvaluacionID) AS ultimoID FROM T_Evaluaciones";
//     const result = await queryDatabase(sql);
//     return result[0].ultimoID ? result[0].ultimoID + 1 : 1; // No funciono
// }

module.exports = { registrarEvaluacion, obtenerEvaluacionesPorPareja };

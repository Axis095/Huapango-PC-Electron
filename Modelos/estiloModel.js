const { queryDatabase } = require("../db");
const { registrarAsignacion } = require('./asignacionModel');

// Registrar un estilo
async function verificarEstiloExistente(nParejaID, nEstiloID) {
    const sql = "SELECT COUNT(*) AS total FROM t_estilos WHERE nParejaID = ? AND nEstiloID = ?";
    const result = await queryDatabase(sql, [String(nParejaID), String(nEstiloID)]);
    return result[0].total > 0;
}

async function verificarParejaEnEstilo(nParejaID) {
    const sql = "SELECT COUNT(*) AS total FROM t_estilos WHERE nParejaID = ?";
    const result = await queryDatabase(sql, [String(nParejaID)]);
    return result[0].total > 0; // Devuelve `true` si la pareja ya está registrada en cualquier estilo
}


async function registrarEstilo(datos) {
    return registrarAsignacion('estilo', datos);
}


// Buscar un estilo por ID
async function buscarEstiloPorID(id) {
    const sql = "SELECT nEstiloID, cEstiloNombre FROM T_Estilos WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [String(id)]);
        return result; // Devuelve los resultados de la consulta
    } catch (err) {
        throw err;
    }
}

// Actualizar un estilo
async function actualizarEstilo(id, datos) {
    const sql = `
        UPDATE t_estilos
        SET cPotosino = ?, cTamaulipeco = ?, cPoblano = ?, cQueretano = ?, cVeracruzano = ?, cHidalguense = ? 
        WHERE nEstiloID = ?
    `;
    try {
        const result = await queryDatabase(sql, [
            datos.cPotosino,
            datos.cTamaulipeco,
            datos.cPoblano,
            datos.cQueretano,
            datos.cVeracruzano,
            datos.cHidalguense,
            id,
        ]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw err;
    }
}

// Eliminar un estilo
async function eliminarEstilo(id) {
    const sql = "DELETE FROM t_estilos WHERE nEstiloID = ?";
    try {
        const result = await queryDatabase(sql, [String(id)]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw err;
    }
}

module.exports = { registrarEstilo, buscarEstiloPorID, actualizarEstilo, eliminarEstilo, verificarEstiloExistente, verificarParejaEnEstilo };

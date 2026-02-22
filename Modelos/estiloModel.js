const { queryDatabase } = require("../db");

// Registrar un estilo
async function verificarEstiloExistente(nParejaID, nEstiloID) {
    const sql = "SELECT COUNT(*) AS total FROM t_estilos WHERE nParejaID = ? AND nEstiloID = ?";
    const result = await queryDatabase(sql, [nParejaID, nEstiloID]);
    return result[0].total > 0;
}

async function verificarParejaEnEstilo(nParejaID) {
    const sql = "SELECT COUNT(*) AS total FROM t_estilos WHERE nParejaID = ?";
    const result = await queryDatabase(sql, [nParejaID]);
    return result[0].total > 0; // Devuelve `true` si la pareja ya está registrada en cualquier estilo
}


async function registrarEstilo(datos) {
    if (await verificarEstiloExistente(datos.nParejaID, datos.nEstiloID)) {
        throw new Error("⚠️ Esta pareja ya está registrada en este estilo.");
    }

    const sql = "INSERT INTO t_estilos (nEstiloID, cEstiloNombre, nParejaID) VALUES (?, ?, ?)";
    const result = await queryDatabase(sql, [datos.nEstiloID, datos.cEstiloNombre, datos.nParejaID]);
    return result.insertId;
}


// Buscar un estilo por ID
async function buscarEstiloPorID(id) {
    const sql = "SELECT nEstiloID, cEstiloNombre FROM T_Estilos WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [id]);
        return result; // Devuelve los resultados de la consulta
    } catch (err) {
        throw new Error("Error al buscar estilo: " + err.message);
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
        throw new Error("Error al actualizar estilo: " + err.message);
    }
}

// Eliminar un estilo
async function eliminarEstilo(id) {
    const sql = "DELETE FROM t_estilos WHERE nEstiloID = ?";
    try {
        const result = await queryDatabase(sql, [id]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw new Error("Error al eliminar estilo: " + err.message);
    }
}

module.exports = { registrarEstilo, buscarEstiloPorID, actualizarEstilo, eliminarEstilo, verificarEstiloExistente, verificarParejaEnEstilo };
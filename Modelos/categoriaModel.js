const { queryDatabase } = require("../db");

// Registrar una categoría
async function verificarCategoriaExistente(nParejaID, nIDCategoria) {
    const sql = "SELECT COUNT(*) AS total FROM t_categorias WHERE nParejaID = ? AND nIDCategoria = ?";
    const result = await queryDatabase(sql, [nParejaID, nIDCategoria]);
    return result[0].total > 0; // Devuelve `true` si ya existe
}

async function verificarParejaEnCategoria(nParejaID) {
    const sql = "SELECT COUNT(*) AS total FROM t_categorias WHERE nParejaID = ?";
    const result = await queryDatabase(sql, [nParejaID]);
    return result[0].total > 0; // Devuelve `true` si la pareja ya está registrada en cualquier categoría
}


async function registrarCategoria(datos) {
    if (await verificarCategoriaExistente(datos.nParejaID, datos.nIDCategoria)) {
        throw new Error("⚠️ Esta pareja ya está registrada en esta categoría.");
    }

    const sql = "INSERT INTO t_categorias (nIDCategoria, cCategoriaNombre, nParejaID) VALUES (?, ?, ?)";
    const result = await queryDatabase(sql, [datos.nIDCategoria, datos.cCategoriaNombre, datos.nParejaID]);
    return result.insertId;
}

// Buscar una Categoria por ID
async function buscarCategoriaPorID(id) {
    const sql = "SELECT nIDCategoria, cCategoriaNombre FROM T_Categorias WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [id]);
        return result;
    } catch (err) {
        throw new Error("Error al buscar categoria: " + err.message);
    }
}

// Actualizar una categoría
async function actualizarCategoria(datos) {
    const sql = `
        UPDATE t_categorias
        SET cPequenos = ?, cInfantil = ?, cJuvenil = ?, cAdulto = ?, cGrande = ?
        WHERE nIDCategoria = ?
    `;
    const result = await queryDatabase(sql, [
        datos.cPequenos,
        datos.cInfantil,
        datos.cJuvenil,
        datos.cAdulto,
        datos.cGrande,
        datos.nIDCategoria,
    ]);
    return result.affectedRows;
}

// Eliminar una categoría
async function eliminarCategoria(categoriaId) {
    const sql = "DELETE FROM t_categorias WHERE nIDCategoria = ?";
    const result = await queryDatabase(sql, [categoriaId]);
    return result.affectedRows;
}

module.exports = { registrarCategoria, buscarCategoriaPorID ,actualizarCategoria, eliminarCategoria, verificarCategoriaExistente, verificarParejaEnCategoria };
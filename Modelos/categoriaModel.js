const { queryDatabase } = require("../db");
const { registrarAsignacion } = require('./asignacionModel');

// Registrar una categoría
async function verificarCategoriaExistente(nParejaID, nIDCategoria) {
    const sql = "SELECT COUNT(*) AS total FROM t_categorias WHERE nParejaID = ? AND nIDCategoria = ?";
    const result = await queryDatabase(sql, [String(nParejaID), String(nIDCategoria)]);
    return result[0].total > 0; // Devuelve `true` si ya existe
}

async function verificarParejaEnCategoria(nParejaID) {
    const sql = "SELECT COUNT(*) AS total FROM t_categorias WHERE nParejaID = ?";
    const result = await queryDatabase(sql, [String(nParejaID)]);
    return result[0].total > 0; // Devuelve `true` si la pareja ya está registrada en cualquier categoría
}


async function registrarCategoria(datos) {
    return registrarAsignacion('categoria', datos);
}

// Buscar una Categoria por ID
async function buscarCategoriaPorID(id) {
    const sql = "SELECT nIDCategoria, cCategoriaNombre FROM T_Categorias WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [String(id)]);
        return result;
    } catch (err) {
        throw err;
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
    const result = await queryDatabase(sql, [String(categoriaId)]);
    return result.affectedRows;
}

module.exports = { registrarCategoria, buscarCategoriaPorID ,actualizarCategoria, eliminarCategoria, verificarCategoriaExistente, verificarParejaEnCategoria };

const { registrarCategoria, buscarCategoriaPorID ,actualizarCategoria, eliminarCategoria, verificarCategoriaExistente, verificarParejaEnCategoria  } = require("../Modelos/categoriaModel");
//TODO TODO LO DE buscarCategoriaPorID lo  PUSE PARA VEER SI FUNCIONA SI NO QUITALO ALV
// Controlador para registrar una categoría
async function handleRegistrarCategoria(event, datos) {
    try {
        if (await verificarParejaEnCategoria(datos.nParejaID)) {
            throw new Error("❌ Esta pareja ya está registrada en una categoría.");
        }

        if (await verificarCategoriaExistente(datos.nParejaID, datos.nIDCategoria)) {
            throw new Error("❌ Esta pareja ya está registrada en esta categoría.");
        }

        const nIDCategoria = await registrarCategoria(datos);
        return { success: true, id: nIDCategoria };
    } catch (err) {
        console.error("❌ Error al registrar categoría:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para buscar un estilo por ID
async function handleBuscarCategoriaPorID(event, id) {
    try {
        const result = await buscarCategoriaPorID(id);
        if (result.length === 0) {
            return { success: false, message: "No se encontró ningún estilo con ese ID." };
        }
        return { success: true, data: result };
    } catch (err) {
        console.error("Error en el controlador al buscar estilo:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para actualizar una categoría
async function handleActualizarCategoria(event, datos) {
    try {
        const result = await actualizarCategoria(datos);
        return { success: true, result };
    } catch (err) {
        console.error("❌ Error al actualizar categoría:", err);
        return { success: false, error: err.message };
    }
}

// Controlador para eliminar una categoría
async function handleEliminarCategoria(event, nIDCategoria) {
    try {
        const result = await eliminarCategoria(nIDCategoria);
        return { success: true, result };
    } catch (err) {
        console.error("❌ Error al eliminar categoría:", err);
        return { success: false, error: err.message };
    }
}



module.exports = { handleRegistrarCategoria, handleBuscarCategoriaPorID ,handleActualizarCategoria, handleEliminarCategoria };



const { mensajePublico } = require("../Seguridad/errores");
const { registrarCategoria, buscarCategoriaPorID ,actualizarCategoria, eliminarCategoria, verificarCategoriaExistente, verificarParejaEnCategoria  } = require("../Modelos/categoriaModel");
// Controlador para registrar una categoría
async function handleRegistrarCategoria(event, datos) {
    try {
        const nIDCategoria = await registrarCategoria(datos);
        return { success: true, id: nIDCategoria };
    } catch (err) {
        console.error(" Error al registrar categoría:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
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
        console.error("Error en el controlador al buscar estilo:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

// Controlador para actualizar una categoría
async function handleActualizarCategoria(event, datos) {
    try {
        const result = await actualizarCategoria(datos);
        return { success: true, result };
    } catch (err) {
        console.error(" Error al actualizar categoría:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}

// Controlador para eliminar una categoría
async function handleEliminarCategoria(event, nIDCategoria) {
    try {
        const result = await eliminarCategoria(nIDCategoria);
        return { success: true, result };
    } catch (err) {
        console.error(" Error al eliminar categoría:", err.code || "UNEXPECTED");
        return { success: false, error: mensajePublico(err) };
    }
}



module.exports = { handleRegistrarCategoria, handleBuscarCategoriaPorID ,handleActualizarCategoria, handleEliminarCategoria };



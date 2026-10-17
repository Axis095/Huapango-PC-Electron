const { mensajePublico } = require("../Seguridad/errores");
const { crearUsuario, eliminarUsuario, eliminarPareja, obtenerRolUsuario  } = require("../Modelos/adminModel");
const { obtenerSesion } = require("../Modelos/sesionModel");

// Controlador para crear un usuario
async function handleCrearUsuario(event, datos) {
    try {
        if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
            throw new Error("Los datos de la cuenta no son válidos.");
        }

        // Validar que el rol es correcto antes de enviarlo
        const rolesPermitidos = ["admin", "user", "juez"];
        if (!rolesPermitidos.includes(datos.rol)) {
            throw new Error(`Rol inválido: ${datos.rol}. Debe ser 'admin', 'user' o 'juez'.`);
        }

        const userId = await crearUsuario(datos);
        return { success: true, id: userId };

    } catch (err) {
        console.error("Error en el controlador al crear usuario:", err.code || "UNEXPECTED");
        return { success: false, code: err.code || "CREATE_FAILED", error: mensajePublico(err) };
    }
}


// Controlador para eliminar un usuario
async function handleEliminarUsuario(event, cNombreUsuario) {
    try {
        const sesion = obtenerSesion();
        if (!sesion || sesion.userRole !== "admin") return { success: false, code: "FORBIDDEN", message: "Se requiere una sesión administradora." };
        const affectedRows = await eliminarUsuario(cNombreUsuario, sesion.userID);
        return affectedRows > 0 
            ? { success: true, message: `Usuario '${cNombreUsuario}' eliminado correctamente.` }
            : { success: false, message: "Usuario no encontrado en la base de datos." };

    } catch (err) {
        console.error(" Error en la eliminación:", err.message);
        const publicos = ["FORBIDDEN", "SELF_DELETE", "LAST_ADMIN", "AMBIGUOUS_USER", "UNSAFE_STORAGE_ENGINE", "TRANSACTION_OUTCOME_UNKNOWN"];
        return { success: false, code: err.code || "DELETE_FAILED", message: publicos.includes(err.code) ? err.message : "No se pudo eliminar la cuenta. Verifica si tiene registros asociados." };
    }
}





async function handleObtenerRolUsuario(event, cNombreUsuario) {
    try {
        return await obtenerRolUsuario(cNombreUsuario);
    } catch (err) {
        console.error(" Error al obtener rol del usuario:", err.code || "UNEXPECTED");
        return null;
    }
}


// Controlador para eliminar una pareja
async function handleEliminarPareja(event, nParejaID) {
    try {
        const affectedRows = await eliminarPareja(nParejaID);
        if (affectedRows > 0) {
            return { success: true };
        } else {
            return { success: false, message: "Pareja no encontrada." };
        }
    } catch (err) {
        console.error("Error en el controlador al eliminar pareja:", err.code || "UNEXPECTED");
        return { success: false, code: err.code || "DELETE_FAILED", error: mensajePublico(err) };
    }
}

module.exports = { handleCrearUsuario, handleEliminarUsuario, handleEliminarPareja, handleObtenerRolUsuario };

const { crearUsuario, eliminarUsuario, eliminarPareja, obtenerRolUsuario  } = require("../Modelos/adminModel");

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
        console.error("Error en el controlador al crear usuario:", err);
        return { success: false, error: err.message };
    }
}


// Controlador para eliminar un usuario
async function handleEliminarUsuario(event, cNombreUsuario) {
    try {
        const rolUsuarioAEliminar = await obtenerRolUsuario(cNombreUsuario);
        console.log(`Intentando eliminar: ${cNombreUsuario}, Rol Detectado:`, rolUsuarioAEliminar);

        if (!rolUsuarioAEliminar) {
            console.warn(`Usuario '${cNombreUsuario}' no encontrado en la base de datos.`);
            return { success: false, message: "Usuario no encontrado." };
        }

        // Asegurar que la variable es válida antes de aplicar trim()
        const rolNormalizado = typeof rolUsuarioAEliminar === "string" ? rolUsuarioAEliminar.trim().toLowerCase() : "desconocido";

        console.log(`Rol a eliminar después de normalizar: '${rolNormalizado}'`);

        // Procede con la eliminación sin restricciones
        const affectedRows = await eliminarUsuario(cNombreUsuario);
        return affectedRows > 0 
            ? { success: true, message: `Usuario '${cNombreUsuario}' eliminado correctamente.` }
            : { success: false, message: "Usuario no encontrado en la base de datos." };

    } catch (err) {
        console.error(" Error en la eliminación:", err.message);
        return { success: false, message: err.message };
    }
}





async function handleObtenerRolUsuario(event, cNombreUsuario) {
    try {
        return await obtenerRolUsuario(cNombreUsuario);
    } catch (err) {
        console.error(" Error al obtener rol del usuario:", err);
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
        console.error("Error en el controlador al eliminar pareja:", err);
        return { success: false, code: err.code || "DELETE_FAILED", error: err.message };
    }
}

module.exports = { handleCrearUsuario, handleEliminarUsuario, handleEliminarPareja, handleObtenerRolUsuario };

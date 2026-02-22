const { queryDatabase } = require("../db");

// Crear un usuario
async function crearUsuario(datos) {
    console.log("📌 Datos recibidos para crear usuario:", datos);

    const sql = `
        INSERT INTO T_Usuarios (nUsuarioID, cNombreUsuario, cContrasena, rol) 
        VALUES (?, ?, ?, ?)
    `;
    
    try {
        // Verificar que el rol es válido antes de insertar
        const rolesPermitidos = ["admin", "user", "juez"];
        if (!rolesPermitidos.includes(datos.rol)) {
            throw new Error(`❌ Rol inválido: ${datos.rol}. Debe ser 'admin', 'user' o 'juez'.`);
        }

        const result = await queryDatabase(sql, [
            datos.nUsuarioID, // ID manual del usuario
            datos.cNombreUsuario,
            datos.cContrasena,
            datos.rol // Se guarda directamente el rol ENUM
        ]);

        return datos.nUsuarioID;
        // return result.insertId; // Devuelve el ID del usuario creado este esta mal hay que borrarlo esto
    } catch (err) {
        console.error("❌ Error al crear usuario:", err.message);
        throw new Error("Error al crear usuario: " + err.message);
    }
}


// Eliminar un usuario
async function eliminarUsuario(cNombreUsuario) {
    const sql = `
        DELETE FROM T_Usuarios 
        WHERE cNombreUsuario = ?
    `;
    try {
        const result = await queryDatabase(sql, [cNombreUsuario]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw new Error("Error al eliminar usuario: " + err.message);
    }
}

// Eliminar una pareja y sus registros relacionados
async function eliminarPareja(nParejaID) {
    try {
                if (!nParejaID || typeof nParejaID !== "string") {
            throw new Error("❌ ID de pareja inválido.");
        }

        console.log("📝 Eliminando registros asociados a pareja ID:", nParejaID);
        
        // Eliminar registros relacionados en las tablas hijas
        await queryDatabase("DELETE FROM T_Evaluaciones WHERE nParejaID = ?", [nParejaID]);
        await queryDatabase("DELETE FROM T_Categorias WHERE nParejaID = ?", [nParejaID]);
        await queryDatabase("DELETE FROM T_Estilos WHERE nParejaID = ?", [nParejaID]);

        // Eliminar el registro principal en T_Participantes
        const sql = `
            DELETE FROM T_Participantes 
            WHERE nParejaID = ?
        `;
        const result = await queryDatabase(sql, [nParejaID]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw new Error("Error al eliminar pareja: " + err.message);
    }
}

//Obtenemos el rol del usuario para liminar la capacidad de acciones que puede hacer al eliminar otros usuarios
async function obtenerRolUsuario(cNombreUsuario) {
    const sql = `SELECT rol FROM T_Usuarios WHERE cNombreUsuario = ?`;
    try {
        const result = await queryDatabase(sql, [cNombreUsuario]);
        console.log(`Resultado SQL:`, result);
        // Si se encuentra el usuario, devolver su rol; de lo contrario, devolver null
        return result.length > 0 ? result[0].rol : null;
    } catch (err) {
        throw new Error("❌ Error al obtener el rol del usuario: " + err.message);
    }
}


module.exports = { crearUsuario, eliminarUsuario, eliminarPareja, obtenerRolUsuario };
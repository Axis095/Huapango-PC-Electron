const { queryDatabase } = require("../db");
const { eliminarPareja } = require("./parejaModel");


function normalizarNombreUsuario(nombre, minimo = 1) {
    if (typeof nombre !== "string" || !nombre.trim()) {
        throw new Error("El campo 'Nombre de usuario' es obligatorio.");
    }
    const normalizado = nombre.trim();
    if (normalizado.length < minimo) {
        throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
    }
    return normalizado;
}


// Crear un usuario
async function crearUsuario(datos) {
    const nombre = normalizarNombreUsuario(datos?.cNombreUsuario, 3);
    const bcrypt = require("bcryptjs");
    const sql = `
        INSERT INTO T_Usuarios (nUsuarioID, cNombreUsuario, cContrasena, rol) 
        VALUES (?, ?, ?, ?)
    `;

    try {
        // Verificar que el rol es válido antes de insertar
        const rolesPermitidos = ["admin", "user", "juez"];
        if (!rolesPermitidos.includes(datos.rol)) {
            throw new Error(`Rol inválido: ${datos.rol}. Debe ser 'admin', 'user' o 'juez'.`);
        }
        // Crear hash de la contraseña (10 rondas)
        const saltRounds = 10;
        const hashedPassword = bcrypt.hashSync(datos.cContrasena, saltRounds);
        const result = await queryDatabase(sql, [
            datos.nUsuarioID, // ID manual del usuario
            nombre,
            hashedPassword, // Se guarda el hash en lugar del texto plano
            datos.rol // Se guarda directamente el rol ENUM
        ]);
        return datos.nUsuarioID;
        // return result.insertId; // Devuelve el ID del usuario creado este esta mal hay que borrarlo esto
    } catch (err) {
        console.error("Error al crear usuario:", err.message);
        throw new Error("Error al crear usuario: " + err.message);
    }
}


// Eliminar un usuario
async function eliminarUsuario(cNombreUsuario) {
    // No aplicar aquí el mínimo de alta: pueden existir cuentas antiguas cortas.
    const nombre = normalizarNombreUsuario(cNombreUsuario);
    const sql = `
        DELETE FROM T_Usuarios 
        WHERE cNombreUsuario = ?
    `;
    try {
        const result = await queryDatabase(sql, [nombre]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw new Error("Error al eliminar usuario: " + err.message);
    }
}


//Obtenemos el rol del usuario para liminar la capacidad de acciones que puede hacer al eliminar otros usuarios
async function obtenerRolUsuario(cNombreUsuario) {
    const nombre = normalizarNombreUsuario(cNombreUsuario);
    const sql = `SELECT rol FROM T_Usuarios WHERE cNombreUsuario = ?`;
    try {
        const result = await queryDatabase(sql, [nombre]);
        console.log(`Resultado SQL:`, result);
        // Si se encuentra el usuario, devolver su rol; de lo contrario, devolver null
        return result.length > 0 ? result[0].rol : null;
    } catch (err) {
        throw new Error("Error al obtener el rol del usuario: " + err.message);
    }
}
module.exports = { crearUsuario, eliminarUsuario, eliminarPareja, obtenerRolUsuario };

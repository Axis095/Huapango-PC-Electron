const { queryDatabase, withTransaction } = require("../db");
const { eliminarPareja } = require("./parejaModel");
const { idUsuario, nombreUsuario, roles } = require("../Seguridad/identidad");

async function crearUsuario(datos) {
    const nombre = nombreUsuario(datos?.cNombreUsuario, 3);
    const bcrypt = require("bcryptjs");
    if (typeof datos.cContrasena !== "string" || !datos.cContrasena || bcrypt.truncates(datos.cContrasena)) {
        throw Object.assign(new Error("La contraseña es obligatoria y no puede superar 72 bytes UTF-8."), { code: "INVALID_DATA" });
    }
    const id = idUsuario(datos.nUsuarioID);
    if (!roles.includes(datos.rol)) throw Object.assign(new Error("El rol debe ser admin, user o juez."), { code: "INVALID_DATA" });
    const hashedPassword = await bcrypt.hash(datos.cContrasena, 10);
    try {
        await queryDatabase("INSERT INTO T_Usuarios (nUsuarioID, cNombreUsuario, cContrasena, rol) VALUES (?, ?, ?, ?)",
            [id, nombre, hashedPassword, datos.rol]);
        return id;
    } catch {
        throw new Error("No se pudo crear la cuenta. Verifica que el ID y el nombre estén disponibles.");
    }
}

function prohibido(code, mensaje) {
    const error = new Error(mensaje); error.code = code; throw error;
}

async function eliminarUsuario(cNombreUsuario, actorID) {
    const nombre = nombreUsuario(cNombreUsuario);
    idUsuario(actorID);
    return withTransaction(["t_usuarios"], async consultar => {
        // El mismo conjunto y orden de locks serializa bajas de administradores.
        const administradores = await consultar("SELECT nUsuarioID FROM T_Usuarios WHERE rol = 'admin' ORDER BY nUsuarioID FOR UPDATE", []);
        if (!administradores.some(usuario => String(usuario.nUsuarioID) === String(actorID))) {
            prohibido("FORBIDDEN", "La cuenta administradora ya no tiene permiso para eliminar usuarios.");
        }
        const filas = await consultar("SELECT nUsuarioID, rol FROM T_Usuarios WHERE cNombreUsuario = ? FOR UPDATE", [nombre]);
        if (filas.length === 0) return 0;
        if (filas.length !== 1) prohibido("AMBIGUOUS_USER", "Hay nombres de usuario duplicados. Revisa el esquema antes de eliminar.");
        const usuario = filas[0];
        if (String(usuario.nUsuarioID) === String(actorID)) prohibido("SELF_DELETE", "No puedes eliminar la cuenta de tu sesión actual.");
        if (usuario.rol === "admin" && administradores.length <= 1) prohibido("LAST_ADMIN", "No se puede eliminar la última cuenta administradora.");
        const result = await consultar("DELETE FROM T_Usuarios WHERE nUsuarioID = ?", [usuario.nUsuarioID]);
        return result.affectedRows;
    });
}

async function obtenerRolUsuario(cNombreUsuario) {
    const nombre = nombreUsuario(cNombreUsuario);
    const result = await queryDatabase("SELECT rol FROM T_Usuarios WHERE cNombreUsuario = ?", [nombre]);
    return result.length === 1 ? result[0].rol : null;
}
module.exports = { crearUsuario, eliminarUsuario, eliminarPareja, obtenerRolUsuario };

const { idUsuario, roles } = require("../Seguridad/identidad");

function crearGestorSesion({ ahora = Date.now, inactividadMs = 30 * 60 * 1000 } = {}) {
    let sesion = null;
    function cerrarSesion() { sesion = null; }
    function obtenerSesion() {
        if (sesion && ahora() - sesion.ultimaActividad >= inactividadMs) cerrarSesion();
        return sesion ? { userID: sesion.userID, userRole: sesion.userRole } : null;
    }
    function guardarSesion(userID, userRole, { credencial = null } = {}) {
        idUsuario(userID);
        if (!roles.includes(userRole)) throw new Error("Rol de sesión no válido.");
        sesion = { userID, userRole, credencial, ultimaActividad: ahora() };
    }
    function registrarActividad() {
        if (obtenerSesion()) sesion.ultimaActividad = ahora();
    }
    async function revalidarSesion(consultar = require("../db").queryDatabase) {
        if (!obtenerSesion()) return null;
        const actual = sesion;
        try {
            const filas = await consultar("/* validar-sesion */ SELECT nUsuarioID, rol, cContrasena FROM t_usuarios WHERE nUsuarioID = ?", [actual.userID]);
            // Un resultado viejo nunca invalida ni autentica una sesión posterior.
            if (sesion !== actual) return null;
            const usuario = filas[0];
            if (!usuario || String(usuario.nUsuarioID) !== String(actual.userID) || usuario.rol !== actual.userRole ||
                (actual.credencial !== null && usuario.cContrasena !== actual.credencial)) {
                cerrarSesion();
                return null;
            }
            return obtenerSesion();
        } catch {
            if (sesion === actual) cerrarSesion();
            return null;
        }
    }
    return { guardarSesion, obtenerSesion, cerrarSesion, revalidarSesion, registrarActividad };
}

module.exports = { crearGestorSesion, ...crearGestorSesion() };

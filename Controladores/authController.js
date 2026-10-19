const bcrypt = require("bcryptjs");
const { queryDatabase } = require("../db");
const sesiones = require("../Modelos/sesionModel");
const { idUsuario, nombreUsuario, roles } = require("../Seguridad/identidad");

function crearAutenticador({ ahora = Date.now, consultar = queryDatabase, gestor = sesiones,
    ventanaMs = 15 * 60 * 1000, intentosUsuario = 5, intentosGlobales = 30 } = {}) {
    let autenticando = false;
    let globalIntentos = { inicio: ahora(), cantidad: 0 };
    const intentos = new Map();
    const rechazado = () => ({ success: false, message: "Usuario o contraseña incorrectos" });

    async function handleLogin(event, credentials, createMainWindow, siguePermitido = () => true) {
        if (autenticando) return { success: false, message: "Espera a que termine el inicio de sesión." };
        if (gestor.obtenerSesion()) return { success: false, message: "Ya existe una sesión iniciada." };
        autenticando = true;
        let sesionCreada = false;
        try {
            const { username, password } = credentials || {};
            let nombre;
            try { nombre = nombreUsuario(username); }
            catch { return { success: false, message: "Completa un usuario válido y la contraseña." }; }
            if (typeof password !== "string" || !password || bcrypt.truncates(password)) return rechazado();
            const instante = ahora();
            if (instante - globalIntentos.inicio >= ventanaMs) globalIntentos = { inicio: instante, cantidad: 0 };
            for (const [clave, registro] of intentos) if (instante - registro.inicio >= ventanaMs) intentos.delete(clave);
            const clave = nombre.toLowerCase();
            const registro = intentos.get(clave) || { inicio: instante, cantidad: 0 };
            if (registro.cantidad >= intentosUsuario || globalIntentos.cantidad >= intentosGlobales) {
                const inicio = registro.cantidad >= intentosUsuario ? registro.inicio : globalIntentos.inicio;
                return { success: false, code: "RATE_LIMITED", retryAfterMs: ventanaMs - (instante - inicio),
                    message: "Se alcanzó el límite de intentos. Espera 15 minutos antes de reintentar." };
            }
            registro.cantidad++; globalIntentos.cantidad++; intentos.set(clave, registro);
            const result = await consultar(
                "SELECT nUsuarioID, cNombreUsuario, rol, cContrasena FROM t_usuarios WHERE cNombreUsuario = ?", [nombre]);
            const user = result[0];
            if (result.length !== 1 || !user || typeof user.cContrasena !== "string" || !user.cContrasena || !roles.includes(user.rol)) return rechazado();
            try { idUsuario(user.nUsuarioID); } catch { return rechazado(); }
            const anterior = user.cContrasena;
            let credencial = anterior;
            if (anterior.startsWith("$2")) {
                if (!/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(anterior) || !await bcrypt.compare(password, anterior)) return rechazado();
            } else {
                if (password !== anterior || !siguePermitido()) return rechazado();
                credencial = await bcrypt.hash(password, 10);
                if (!siguePermitido()) return rechazado();
                // Compare-and-swap exacto: no sobrescribe un cambio de contraseña concurrente.
                const cambio = await consultar("UPDATE t_usuarios SET cContrasena = ? WHERE nUsuarioID = ? AND BINARY cContrasena = BINARY ? AND rol = ?",
                    [credencial, user.nUsuarioID, anterior, user.rol]);
                if (cambio.affectedRows !== 1) return rechazado();
            }
            if (!siguePermitido()) return rechazado();
            const actuales = await consultar("/* confirmar-login */ SELECT nUsuarioID, rol, cContrasena FROM t_usuarios WHERE nUsuarioID = ?", [user.nUsuarioID]);
            const actual = actuales[0];
            if (!actual || String(actual.nUsuarioID) !== String(user.nUsuarioID) || actual.rol !== user.rol || actual.cContrasena !== credencial || !siguePermitido()) return rechazado();
            gestor.guardarSesion(user.nUsuarioID, user.rol, { credencial });
            sesionCreada = true;
            global.userRole = user.rol;
            await createMainWindow();
            if (global.loginWindow && !global.loginWindow.isDestroyed()) global.loginWindow.close();
            intentos.delete(clave);
            return { success: true };
        } catch {
            if (sesionCreada) {
                gestor.cerrarSesion(); global.userRole = "guest";
                if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.destroy();
            }
            return { success: false, error: "No se pudo iniciar sesión. Intenta nuevamente." };
        } finally { autenticando = false; }
    }
    return { handleLogin, autenticacionEnCurso: () => autenticando };
}

module.exports = { crearAutenticador, ...crearAutenticador() };

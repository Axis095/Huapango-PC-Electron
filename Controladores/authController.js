const bcrypt = require("bcryptjs");
const { queryDatabase } = require("../db");
const { guardarSesion, obtenerSesion, cerrarSesion } = require("../Modelos/sesionModel");
const { idPositivo } = require("../Seguridad/datos");

let autenticando = false;
async function handleLogin(event, credentials, createMainWindow, siguePermitido = () => true) {
    if (autenticando) return { success: false, message: "Espera a que termine el inicio de sesión." };
    if (obtenerSesion()) return { success: false, message: "Ya existe una sesión iniciada." };
    autenticando = true;
    let sesionCreada = false;
    const rechazado = () => ({ success: false, message: "Usuario o contraseña incorrectos" });
    try {
        const { username, password } = credentials || {};
        if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
            return { success: false, message: "Completa el usuario y la contraseña." };
        }
        const result = await queryDatabase(
            "SELECT nUsuarioID, cNombreUsuario, rol, cContrasena FROM t_usuarios WHERE cNombreUsuario = ?", [username.trim()]);
        const user = result[0];
        if (!user || typeof user.cContrasena !== "string" || !user.cContrasena ||
            !["admin", "user", "juez"].includes(user.rol)) return rechazado();
        // Columnas VARCHAR/DECIMAL pueden devolver un ID numérico como texto.
        // Validar sin cambiar el valor de la clave que se guarda en la sesión.
        try { idPositivo(user.nUsuarioID); }
        catch { return rechazado(); }

        let isMatch = false;
        if (user.cContrasena.startsWith("$2")) {
            // Un hash roto nunca se interpreta como una contraseña antigua de texto.
            if (!/^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/.test(user.cContrasena) || bcrypt.truncates(password)) return rechazado();
            isMatch = await bcrypt.compare(password, user.cContrasena);
        } else {
            // Compatibilidad temporal; no reescribir credenciales sin verificar el esquema.
            isMatch = password === user.cContrasena;
        }
        if (!isMatch) return rechazado();
        if (!siguePermitido()) return rechazado();

        guardarSesion(user.nUsuarioID, user.rol);
        sesionCreada = true;
        global.userRole = user.rol;
        await createMainWindow();
        if (global.loginWindow && !global.loginWindow.isDestroyed()) global.loginWindow.close();
        return { success: true };
    } catch {
        if (sesionCreada) {
            cerrarSesion();
            global.userRole = "guest";
            if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.destroy();
        }
        return { success: false, error: "No se pudo iniciar sesión. Intenta nuevamente." };
    } finally {
        autenticando = false;
    }
}

module.exports = { handleLogin, autenticacionEnCurso: () => autenticando };

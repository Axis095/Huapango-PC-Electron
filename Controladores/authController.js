const { queryDatabase } = require("../db");
const { guardarSesion, obtenerClaveSesion, cerrarSesion } = require("../Modelos/sesionModel");

let autenticando = false;

async function handleLogin(event, credentials, createMainWindow, sigueAutorizado = () => false) {
    const denegado = () => ({ success: false, code: "FORBIDDEN", message: "Inicia sesión desde la ventana de acceso autorizada." });
    if (!sigueAutorizado()) return denegado();
    if (autenticando) return { success: false, message: "Espera a que termine el inicio de sesión." };
    autenticando = true;
    let claveCreada = null;
    try {
        const { username, password } = credentials || {};
        if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
            return { success: false, message: "Completa el usuario y la contraseña." };
        }
        const sql = "SELECT nUsuarioID, cNombreUsuario, rol FROM t_usuarios WHERE cNombreUsuario = ? AND cContrasena = ?";
        const result = await queryDatabase(sql, [username.trim(), password]);
        if (!sigueAutorizado()) return denegado();

        if (result.length > 0) {
            const userRole = result[0].rol; // El rol de la sesión ser "admin", "user" o "juez"
            if (!["admin", "user", "juez"].includes(userRole) || !Number.isSafeInteger(result[0].nUsuarioID) || result[0].nUsuarioID <= 0) {
                return { success: false, message: "La cuenta no tiene una identidad o un rol válido." };
            }
            guardarSesion(result[0].nUsuarioID, userRole);
            claveCreada = obtenerClaveSesion();

            global.userRole = userRole; // Almacena el rol en una variable global
            // global.userID = result[0].nUsuarioID; // <-- Se guarda el ID aquí

            console.log("Enviando evento set-role con rol:", userRole);

            // Cierra la ventana de login y abre la ventana principal
            await createMainWindow();
            if (global.loginWindow && !global.loginWindow.isDestroyed()) {
                global.loginWindow.close();
            }

            return { success: true };
        } else {
            console.warn("Usuario o contraseña incorrectos.");
            return { success: false, message: "Usuario o contraseña incorrectos" };
        }
    } catch (err) {
        if (claveCreada && obtenerClaveSesion() === claveCreada) {
            cerrarSesion();
            global.userRole = "guest";
            if (global.mainWindow && !global.mainWindow.isDestroyed()) global.mainWindow.close();
        }
        console.error("Error al validar el login:", err);
        return { success: false, error: "Error interno al validar el login" };
    } finally {
        autenticando = false;
    }
}

module.exports = { handleLogin, guardarSesion};

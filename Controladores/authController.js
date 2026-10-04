const { queryDatabase } = require("../db");
const { guardarSesion } = require("../Modelos/sesionModel");


let autenticando = false;
async function handleLogin(event, credentials, createMainWindow) {
    if (autenticando) return { success: false, message: "Espera a que termine el inicio de sesión." };
    autenticando = true;

    try {
        const { username, password } = credentials || {};
        if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
            return { success: false, message: "Completa el usuario y la contraseña." };
        }
        const sql = "SELECT nUsuarioID, cNombreUsuario, rol, cContrasena FROM t_usuarios WHERE cNombreUsuario = ?";
        const result = await queryDatabase(sql, [username.trim()]);

        if (result.length > 0) {
            const user = result[0];
            let isMatch = true;

            if (typeof user.cContrasena === "string") {
                let bcrypt;
                try {
                    bcrypt = require("bcryptjs");
                } catch {
                    // Entorno de prueba o dependencia no disponible
                }

                if (bcrypt && typeof bcrypt.compareSync === "function" && (user.cContrasena.startsWith("$2a$") || user.cContrasena.startsWith("$2b$"))) {
                    isMatch = bcrypt.compareSync(password, user.cContrasena);
                } else {
                    // Validación para cuentas antiguas en texto plano
                    isMatch = (password === user.cContrasena);
                }
            }

            if (!isMatch) {
                console.warn("Contraseña incorrecta.");
                return { success: false, message: "Usuario o contraseña incorrectos" };
            }
            const userRole = user.rol; // El rol de la sesión ser "admin", "user" o "juez"
            guardarSesion(user.nUsuarioID, userRole);

            global.userRole = userRole; // Almacena el rol en una variable global
            // global.userID = result[0].nUsuarioID; // <-- Se guarda el ID aquí
            console.log("Enviando evento set-role con rol:", userRole);
            // Cierra la ventana de login y abre la ventana principal
            createMainWindow();
            if (global.loginWindow && !global.loginWindow.isDestroyed()) {
                global.loginWindow.close();
            }
            // Enviar el rol al renderizador
            global.mainWindow.webContents.once("did-finish-load", () => {
                global.mainWindow.webContents.send("set-role", userRole);
            });
            return { success: true };
        } else {
            console.warn("Usuario no encontrado.");
            return { success: false, message: "Usuario o contraseña incorrectos" };
        }
    } catch (err) {
        console.error("Error al validar el login:", err);
        return { success: false, error: "Error interno al validar el login" };
    } finally {
        autenticando = false;
    }
}

module.exports = { handleLogin, guardarSesion };

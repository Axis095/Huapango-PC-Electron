const { queryDatabase } = require("../db");
const fs = require("fs");
const path = require("path");
const { guardarConfiguracion, configPath } = require("../Modelos/configModel");

async function handleLogin(event, credentials, createMainWindow) {
    const { username, password } = credentials;

    try {
        const sql = "SELECT nUsuarioID, cNombreUsuario, rol FROM t_usuarios WHERE cNombreUsuario = ? AND cContrasena = ?";
        const result = await queryDatabase(sql, [username, password]);

        if (result.length > 0) {
            console.log("✅ Login exitoso:", result[0]);

            const userRole = result[0].rol; // El rol de la sesión ser "admin", "user" o "juez"
            guardarSesion(result[0].nUsuarioID, userRole);

            global.userRole = userRole; // Almacena el rol en una variable global
            // global.userID = result[0].nUsuarioID; // <-- Se guarda el ID aquí

            console.log("Enviando evento set-role con rol:", userRole);

            // Cierra la ventana de login y abre la ventana principal
            if (global.loginWindow) {
                global.loginWindow.close();
            }
            createMainWindow();

            // Enviar el rol al renderizador
            global.mainWindow.webContents.once("did-finish-load", () => {
                global.mainWindow.webContents.send("set-role", userRole);
            });

            return { success: true };
        } else {
            console.warn("Usuario o contraseña incorrectos.");
            return { success: false, message: "Usuario o contraseña incorrectos" };
        }
    } catch (err) {
        console.error("Error al validar el login:", err);
        return { success: false, error: "Error interno al validar el login" };
    }
}

// function guardarSesion(userID, userRole) {
//     const configPath = path.join(__dirname, "..", "config.json");
//     let config = {};
//     if (fs.existsSync(configPath)) {
//         config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
//     }
//     config.user = userID;
//     config.userRole = userRole;
//     fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
// }

function guardarSesion(userID, userRole) {
    try {
        console.log("🔄 Guardando sesión en:", configPath);
        let config = {};

        // 🔹 Si el archivo existe, cargarlo; si no, crear estructura vacía
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } else {
            console.warn("⚠️ Archivo de configuración no encontrado, creando...");
            config = {};
        }

        // 🔹 Guardar usuario y rol
        config.user = userID;
        config.userRole = userRole;

        // 🔹 Escribir en `config.json` asegurando que la ruta es correcta
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
        console.log("✅ Sesión guardada correctamente en:", configPath);
    } catch (error) {
        console.error("❌ Error al guardar la sesión:", error);
    }
}


module.exports = { handleLogin, guardarSesion};
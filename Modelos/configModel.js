const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { app } = require("electron");

// Se conserva la ubicación anterior para instalaciones que ya tienen configuración.
const configPath = path.join(app.getPath("userData"), "config.json");
const configuracionInicial = Object.freeze({ host: "127.0.0.1", port: 3306, user: "", password: "", database: "" });

// Un fallo de conexión o un archivo dañado no equivalen a una instalación nueva.
function requiereConfiguracionInicial() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return !!config && !Array.isArray(config) &&
            Object.keys(config).length === Object.keys(configuracionInicial).length &&
            Object.entries(configuracionInicial).every(([campo, valor]) => config[campo] === valor);
    } catch (error) {
        return error.code === "ENOENT";
    }
}

function normalizarConfiguracion(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("La configuración no es válida. Completa los datos de conexión.");
    }
    const datos = {};
    for (const campo of ["host", "user", "database"]) {
        if (typeof config[campo] !== "string" || !config[campo].trim()) {
            throw new Error("Completa el servidor, el usuario y el nombre de la base de datos.");
        }
        datos[campo] = config[campo].trim();
    }
    const puerto = config.port ?? 3306;
    if (!["string", "number"].includes(typeof puerto) || !/^\d+$/.test(String(puerto)) ||
        !Number.isInteger(Number(puerto)) || Number(puerto) < 1 || Number(puerto) > 65535) {
        throw new Error("El puerto debe ser un número entero entre 1 y 65535.");
    }
    if (config.password !== undefined && typeof config.password !== "string") {
        throw new Error("La contraseña debe ser texto.");
    }
    return { ...datos, port: Number(puerto), password: config.password ?? "" };
}

function inicializarConfiguracion() {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    try {
        // wx impide sobrescribir una configuración existente, incluso ante dos arranques.
        fs.writeFileSync(configPath, JSON.stringify(configuracionInicial, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
    }
}

function cargarConfiguracion() {
    try {
        inicializarConfiguracion();
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error("El archivo de configuración está dañado. Vuelve a configurar la conexión; se conservará una copia del archivo anterior.");
        }
        throw new Error("No se pudo leer la configuración. Comprueba los permisos de la carpeta de datos de la aplicación.");
    }
}

function guardarConfiguracion(nuevaConfig) {
    const temporal = `${configPath}.${randomUUID()}.tmp`;
    try {
        const config = normalizarConfiguracion(nuevaConfig);
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        if (fs.existsSync(configPath)) {
            let invalida = false;
            const anterior = fs.readFileSync(configPath, "utf8");
            try { normalizarConfiguracion(JSON.parse(anterior)); } catch { invalida = true; }
            if (invalida) fs.copyFileSync(configPath, `${configPath}.backup-${randomUUID()}`);
        }
        fs.writeFileSync(temporal, JSON.stringify(config, null, 2), { encoding: "utf8", flag: "wx", mode: 0o600 });
        // El archivo anterior permanece intacto si falla la escritura del temporal.
        fs.renameSync(temporal, configPath);
        return { success: true };
    } catch (error) {
        return { success: false, error: "No se pudo guardar la configuración. Revisa los datos y los permisos de la carpeta de la aplicación." };
    } finally {
        try { fs.unlinkSync(temporal); } catch { /* El temporal puede no haberse creado. */ }
    }
}

module.exports = { guardarConfiguracion, cargarConfiguracion, inicializarConfiguracion, normalizarConfiguracion, configuracionInicial, configPath, requiereConfiguracionInicial };

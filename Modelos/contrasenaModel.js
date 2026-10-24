const bcrypt = require("bcryptjs");

const RONDAS = 10;
const FORMATO_BCRYPT = /^\$2[aby]\$(0[4-9]|[12]\d|3[01])\$[./A-Za-z0-9]{53}$/;

async function crearHashContrasena(password) {
    if (typeof password !== "string" || !password.trim()) {
        throw new Error("La contraseña es obligatoria.");
    }
    // bcrypt solo utiliza los primeros 72 bytes, no 72 caracteres.
    if (Buffer.byteLength(password, "utf8") > 72) {
        throw new Error("La contraseña no puede superar 72 bytes en UTF-8.");
    }
    return bcrypt.hash(password, RONDAS);
}

async function verificarContrasena(password, almacenada) {
    if (typeof password !== "string" || !password ||
        typeof almacenada !== "string" || !almacenada) return false;

    if (almacenada.startsWith("$2")) {
        // Un hash inválido nunca se interpreta como una contraseña en texto plano.
        if (!FORMATO_BCRYPT.test(almacenada) || Buffer.byteLength(password, "utf8") > 72) return false;
        return bcrypt.compare(password, almacenada);
    }

    // Compatibilidad temporal: no modifica cuentas antiguas ni el esquema de MySQL.
    return password === almacenada;
}

module.exports = { crearHashContrasena, verificarContrasena };

// La sesión dura únicamente mientras la aplicación permanece abierta.
let sesion = null;
// Identidad interna de cada inicio de sesión; nunca se envía por IPC.
let claveSesion = null;

function guardarSesion(userID, userRole) {
    sesion = { userID, userRole };
    claveSesion = Object.freeze({});
}

function obtenerSesion() {
    return sesion ? { ...sesion } : null;
}

function cerrarSesion() {
    sesion = null;
    claveSesion = null;
}

function obtenerClaveSesion() {
    return claveSesion;
}

module.exports = { guardarSesion, obtenerSesion, cerrarSesion, obtenerClaveSesion };

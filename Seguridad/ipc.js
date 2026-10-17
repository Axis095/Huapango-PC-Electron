const { vistas } = require('./vistas');
const { crearRutasVistas } = require('../Servicios/rutasVistas');
const { validarSolicitud } = require("./datos");

const todos = ["admin", "user", "juez"];
const operadores = ["admin", "user"];
const evaluadores = ["admin", "juez"];
const politicas = Object.freeze({
    login: { vistas: ["login.html"], sinSesion: true },
    "cerrar-sesion": { roles: todos },
    "get-role": {}, "get-usuario-id": {},
    "obtener-configuracion": { configuracion: true },
    "guardar-configuracion": { configuracion: true },
    "continuar-configuracion": { configuracion: true },
    "abrir-ventana-emergente": { configurar: true },
    "open-section": { roles: todos },
    "registrar-pareja": { roles: operadores },
    "actualizar-pareja-completa": { roles: operadores },
    "eliminar-pareja": { roles: ["admin"] },
    "buscar-pareja-por-id": { roles: todos },
    "buscar-pareja-para-evaluacion": { roles: evaluadores },
    "buscar-todas-las-parejas": { roles: todos },
    "registrar-categoria": { roles: operadores },
    "registrar-estilo": { roles: operadores },
    "buscar-categoria-por-id": { roles: todos },
    "buscar-estilo-por-id": { roles: todos },
    "actualizar-categoria": { roles: ["admin"] },
    "eliminar-categoria": { roles: ["admin"] },
    "actualizar-estilo": { roles: ["admin"] },
    "eliminar-estilo": { roles: ["admin"] },
    "crear-usuario": { roles: ["admin"] },
    "eliminar-usuario": { roles: ["admin"] },
    "obtener-rol-usuario": { roles: ["admin"] },
    "registrar-evaluacion": { roles: evaluadores },
    "obtener-evaluaciones-por-pareja": { roles: evaluadores },
    "generar-pdf-resultados": { roles: evaluadores },
    "generar-pdf-parejas": { roles: todos },
    "generar-pdf-categorias": { roles: todos },
    "generar-pdf-estilos": { roles: todos },
    "generar-pdf-registros-generales": { roles: todos },
    ...Object.fromEntries(["obtener", "guardar", "limpiar"].flatMap(accion => [
        [`${accion}-borrador-registro`, { roles: operadores, vistas: ["Registros.html"] }],
        [`${accion}-borrador-modificacion`, { roles: operadores, vistas: ["ModificarParejas.html"] }]
    ]))
});
function crearSeguridadIPC({ raiz, obtenerSesion, ventanaDe, revalidarSesion, registrarActividad = () => {},
    recuperarSesion = async () => false, sesionPendiente = () => false,
    rutas = crearRutasVistas({ raiz }) }) {
    const { vistaDeURL } = rutas;
    function vistaDelEmisor(event) {
        try {
            if (!event?.senderFrame || event.senderFrame !== event.sender.mainFrame) return null;
            const ventana = ventanaDe(event.sender);
            if (!ventana || ventana.isDestroyed()) return null;
            return vistaDeURL(event.senderFrame.url);
        } catch { return null; }
    }
    function puedeConfigurar() {
        const sesion = obtenerSesion();
        return sesion ? sesion.userRole === "admin" : !sesionPendiente();
    }
    function permitido(canal, event) {
        const politica = politicas[canal];
        const vista = vistaDelEmisor(event);
        if (!politica || !vista) return false;
        const sesion = obtenerSesion();
        if (politica.sinSesion && sesion) return false;
        if (politica.roles && !politica.roles.includes(sesion?.userRole)) return false;
        if (politica.vistas && !politica.vistas.includes(vista)) return false;
        if (politica.configuracion && (vista !== "configuracionBD.html" || !puedeConfigurar())) return false;
        if (politica.configurar && !puedeConfigurar()) return false;
        return true;
    }
    function proteger(canal, handler) {
        if (!Object.hasOwn(politicas, canal) || typeof handler !== "function") throw new Error(`IPC sin contrato: ${canal}`);
        return async (event, ...args) => {
            const anterior = obtenerSesion();
            const vista = vistaDelEmisor(event);
            const expirada = { success: false, code: 'SESSION_EXPIRED', error: 'La sesión terminó. Vuelve a iniciar sesión.' };
            if (!anterior && vista && vista !== 'login.html' && sesionPendiente()) {
                await recuperarSesion(event);
                return expirada;
            }
            if (!permitido(canal, event)) return { success: false, code: "FORBIDDEN", error: "No tienes permiso para realizar esta acción." };
            try { validarSolicitud(canal, args); }
            catch (error) { return { success: false, code: error.code || "INVALID_DATA", error: error.message }; }
            if (obtenerSesion() && revalidarSesion) {
                // Denegar esta petición aunque el canal también permita primer arranque:
                // una cuenta revocada no se convierte en configuración sin sesión.
                if (!await revalidarSesion() || !permitido(canal, event)) {
                    if (!obtenerSesion() && vistaDelEmisor(event)) await recuperarSesion(event, anterior);
                    return expirada;
                }
                registrarActividad();
            }
            return handler(event, ...args);
        };
    }
    function puedeAbrir(nombre) {
        if (typeof nombre !== "string") return false;
        if (!Object.hasOwn(vistas, nombre)) return false;
        if (nombre === "configuracionBD.html") return puedeConfigurar();
        if (nombre === "login.html") return !obtenerSesion();
        return vistas[nombre].includes(obtenerSesion()?.userRole);
    }
    return { proteger, permitido, puedeAbrir, puedeConfigurar, vistaDeURL };
}
module.exports = { crearSeguridadIPC, politicas };

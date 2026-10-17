const path = require('node:path');
const { URL, fileURLToPath } = require('node:url');
const { vistas } = require('../Seguridad/vistas');

function crearRutasVistas({ raiz, empaquetada = false, origenDesarrollo = '' }) {
    let origen = '';
    if (!empaquetada && origenDesarrollo) {
        const url = new URL(origenDesarrollo);
        if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
            url.username || url.password || url.search || url.hash || url.pathname !== '/') {
            throw Error('El servidor de desarrollo debe usar un origen HTTP exacto en 127.0.0.1.');
        }
        origen = url.origin;
    }
    const archivos = new Map(Object.keys(vistas).map(nombre => [path.resolve(raiz, 'Vistas', nombre), nombre]));
    function vistaDeURL(valor) {
        try {
            if (typeof valor !== 'string' || valor.includes('\\') || /%(?:2e|2f|5c)/i.test(valor.split(/[?#]/)[0])) return null;
            const url = new URL(valor);
            if (url.username || url.password) return null;
            if (origen) {
                if (url.origin !== origen) return null;
                const nombre = url.pathname.slice('/Vistas/'.length);
                return url.pathname.startsWith('/Vistas/') && Object.hasOwn(vistas, nombre) ? nombre : null;
            }
            if (url.protocol !== 'file:' || url.host) return null;
            return archivos.get(path.resolve(fileURLToPath(url))) || null;
        } catch { return null; }
    }
    function cargarVista(ventana, nombre, opciones) {
        if (!Object.hasOwn(vistas, nombre)) throw Error('Vista fuera del catálogo.');
        if (!origen) return ventana.loadFile(path.resolve(raiz, 'Vistas', nombre), opciones);
        const url = new URL(`/Vistas/${nombre}`, origen);
        for (const [clave, valor] of Object.entries(opciones?.query || {})) url.searchParams.set(clave, valor);
        return ventana.loadURL(url.href);
    }
    return { vistaDeURL, cargarVista, origen };
}

let aplicacion;
function obtenerRutasAplicacion() {
    if (!aplicacion) {
        const { app } = require('electron');
        aplicacion = crearRutasVistas({ raiz: path.resolve(__dirname, '..'),
            empaquetada: app?.isPackaged === true,
            origenDesarrollo: require('node:process').env.HUAPANGO_DEV_ORIGIN || '' });
    }
    return aplicacion;
}
module.exports = { crearRutasVistas, obtenerRutasAplicacion };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { crearRutasVistas } = require('../Servicios/rutasVistas');
const { crearSeguridadIPC } = require('../Seguridad/ipc');
const { recursoPermitido } = require('../scripts/vite-recursos.cjs');
const raiz = path.resolve(__dirname, '..');
const origen = 'http://127.0.0.1:5173';
const archivo = nombre => pathToFileURL(path.join(raiz, 'Vistas', nombre)).href;

test('rutas locales: solo archivos del catálogo en la raíz confiable', () => {
    const rutas = crearRutasVistas({ raiz });
    assert.equal(rutas.vistaDeURL(archivo('login.html') + '?sesion=expirada'), 'login.html');
    for (const url of [origen + '/Vistas/login.html', archivo('index.html'),
        pathToFileURL(path.resolve(raiz, '../Vistas/login.html')).href, 'data:text/html,login',
        'file://servidor/Vistas/login.html']) assert.equal(rutas.vistaDeURL(url), null, url);
});

test('desarrollo: exige origen y ruta exactos, sin aceptar archivos o credenciales en URL', () => {
    const rutas = crearRutasVistas({ raiz, origenDesarrollo: origen });
    assert.equal(rutas.vistaDeURL(origen + '/Vistas/Registros.html?emergente=1'), 'Registros.html');
    for (const url of [archivo('Registros.html'), 'http://127.0.0.1:5174/Vistas/Registros.html',
        'http://localhost:5173/Vistas/Registros.html', origen + '/Vistas/index.html',
        origen + '/Vistas/%52egistros.html', origen + '/Vistas/%2e%2e/main.js',
        origen + '/Vistas/Registros.html/extra', 'http://otro@127.0.0.1:5173/Vistas/Registros.html',
        origen + '/Vistas\\Registros.html']) assert.equal(rutas.vistaDeURL(url), null, url);
});

test('empaquetada: ignora incluso un origen de desarrollo mal formado y mantiene archivo local', () => {
    const rutas = crearRutasVistas({ raiz, empaquetada: true, origenDesarrollo: 'https://externo.test/no-admitido' });
    assert.equal(rutas.origen, '');
    assert.equal(rutas.vistaDeURL(archivo('login.html')), 'login.html');
    assert.equal(rutas.vistaDeURL(origen + '/Vistas/login.html'), null);
});

test('configuración de desarrollo rechaza servidores externos, TLS, rutas y puertos implícitos', () => {
    for (const origenDesarrollo of ['http://ejemplo.test:5173', 'https://127.0.0.1:5173',
        'http://127.0.0.1', origen + '/carpeta', origen + '?x=1', 'http://admin@127.0.0.1:5173']) {
        assert.throws(() => crearRutasVistas({ raiz, origenDesarrollo }));
    }
});

test('carga de vistas conserva parámetros y usa la función correcta para cada modo', async () => {
    const llamadas = [];
    const ventana = { loadFile: (...args) => llamadas.push(['file', ...args]), loadURL: url => llamadas.push(['url', url]) };
    await crearRutasVistas({ raiz }).cargarVista(ventana, 'login.html', { query: { sesion: 'expirada' } });
    await crearRutasVistas({ raiz, origenDesarrollo: origen }).cargarVista(ventana, 'login.html', { query: { sesion: 'expirada' } });
    assert.equal(llamadas[0][1], path.join(raiz, 'Vistas/login.html'));
    assert.equal(llamadas[0][2].query.sesion, 'expirada');
    assert.equal(llamadas[1][1], origen + '/Vistas/login.html?sesion=expirada');
    assert.throws(() => crearRutasVistas({ raiz }).cargarVista(ventana, '../main.js'));
});

test('IPC HTTP conserva roles, vista de configuración y rechazo de subframes sin efectos', async () => {
    let sesion = { userRole: 'user', userID: 'U001' }, efectos = 0;
    const frame = { url: origen + '/Vistas/Registros.html' };
    const sender = { mainFrame: frame };
    const event = { sender, senderFrame: frame };
    const seguridad = crearSeguridadIPC({ raiz, rutas: crearRutasVistas({ raiz, origenDesarrollo: origen }),
        obtenerSesion: () => sesion, ventanaDe: () => ({ isDestroyed: () => false }) });
    const borrar = seguridad.proteger('eliminar-pareja', () => { efectos++; return { success: true }; });
    assert.equal((await borrar(event, '7')).code, 'FORBIDDEN');
    sesion = { userRole: 'admin', userID: 'A001' };
    assert.equal((await borrar(event, '7')).success, true);
    assert.equal((await borrar({ ...event, senderFrame: { url: frame.url } }, '7')).code, 'FORBIDDEN');
    frame.url = 'http://127.0.0.1:5174/Vistas/Registros.html';
    assert.equal((await borrar(event, '7')).code, 'FORBIDDEN');
    frame.url = origen + '/Vistas/Registros.html';
    assert.equal(seguridad.permitido('guardar-configuracion', event), false);
    frame.url = origen + '/Vistas/configuracionBD.html';
    assert.equal(seguridad.permitido('guardar-configuracion', event), true);
    sesion = { userRole: 'juez', userID: 'J001' };
    assert.equal(seguridad.permitido('guardar-configuracion', event), false);
    assert.equal(efectos, 1);
});

test('servidor Vite no permite backend, secretos, herramientas ni acceso arbitrario al disco', () => {
    for (const url of ['/main.js', '/config.json', '/Modelos/configModel.js', '/sql/001-laboratorio.sql',
        '/@fs/C:/Users/privado', '/@id/otra-cosa', '/__open-in-editor?file=main.js',
        '/Vistas/index.html', '/Public/js/%2e%2e/%2e%2e/main.js', '/Public/js/../../../main.js']) {
        assert.equal(recursoPermitido(url, raiz), false, url);
    }
    for (const url of ['/Vistas/login.html', '/Public/js/render.js?t=123', '/Public/fonts/Montserrat.ttf', '/@vite/client']) {
        assert.equal(recursoPermitido(url, raiz), true, url);
    }
});

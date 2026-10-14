// Ejecutar con Electron. Perfil aislado, ventanas ocultas y SQL simulado.
// No carga credenciales reales ni realiza conexiones MySQL.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { fileURLToPath } = require('node:url');
const electron = require('electron');
const { app, BrowserWindow } = electron;
const root = path.resolve(__dirname, '..');
const base = path.join(root, '.tmp');
fs.mkdirSync(base, { recursive: true });
const profile = fs.mkdtempSync(path.join(base, 'fase0-smoke-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();

const loaded = new Map(), waiters = new Map(), failures = [];
function esperar(nombre) {
    if (loaded.has(nombre)) return Promise.resolve(loaded.get(nombre));
    return new Promise(resolve => waiters.set(nombre, resolve));
}
app.on('browser-window-created', (_event, window) => {
    window.webContents.on('preload-error', () => failures.push('preload-error'));
    window.webContents.on('render-process-gone', (_e, details) => failures.push(`renderer: ${details.reason}`));
    window.webContents.on('did-finish-load', () => {
        const nombre = path.basename(fileURLToPath(window.webContents.getURL()));
        loaded.set(nombre, window); waiters.get(nombre)?.(window);
    });
});
class HiddenWindow extends BrowserWindow {
    constructor(options) { super({ ...options, show: false }); }
    maximize() {} // No mostrar ni maximizar ventanas de prueba.
}
const load = Module._load;
Module._load = function(name, parent, isMain) {
    if (name === 'electron') return { ...electron, BrowserWindow: HiddenWindow };
    return load.call(this, name, parent, isMain);
};
const dbPath = require.resolve('../db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    inicializarBaseDatos: async () => {},
    queryDatabase: async sql => {
        if (sql.includes('cContrasena FROM t_usuarios')) return [{ nUsuarioID: '7', rol: 'user', cContrasena: 'smoke-local' }];
        throw Error('La prueba no autoriza consultas ni escrituras SQL');
    },
    withTransaction: async () => { throw Error('La prueba no autoriza transacciones SQL'); }
} };
const timeout = setTimeout(() => { console.error('SMOKE_FAIL: tiempo agotado'); app.exit(1); }, 25000);
async function ejecutar() {
    require('../main');
    const login = await esperar('login.html');
    const estado = await login.webContents.executeJavaScript(`(async () => ({
        node: typeof require, api: typeof window.api, role: await window.api.getUserRole(),
        bloqueado: await window.api.crearUsuario({}),
        incorrecto: await window.api.invoke('login', { username: 'smoke', password: 'incorrecta' })
    }))()`);
    assert.equal(estado.node, 'undefined'); assert.equal(estado.api, 'object');
    assert.equal(estado.role, 'guest'); assert.equal(estado.bloqueado.code, 'FORBIDDEN');
    assert.equal(estado.incorrecto.success, false);
    // La respuesta puede perderse al cerrarse la ventana; verificamos el resultado en Main.
    login.webContents.executeJavaScript(`window.api.invoke('login', { username: 'smoke', password: 'smoke-local' })`).catch(() => {});
    const principal = await esperar('MenuPrincipal.html');
    assert.equal(await principal.webContents.executeJavaScript('window.api.getUserRole()'), 'user');
    assert.equal(await principal.webContents.executeJavaScript('window.api.getUsuarioID()'), '7');
    const rechazo = await principal.webContents.executeJavaScript('window.api.registrarEvaluacion({})');
    assert.equal(rechazo.code, 'FORBIDDEN');
    for (const vista of ['Registros.html', 'ModificarParejas.html', 'BusquedaParejas.html']) {
        const fin = new Promise(resolve => principal.webContents.once('did-finish-load', resolve));
        await principal.webContents.executeJavaScript(`window.location.href = ${JSON.stringify(vista)}`);
        await fin;
        assert.equal(path.basename(fileURLToPath(principal.webContents.getURL())), vista);
        const estado = await principal.webContents.executeJavaScript(`(async () => ({
            role: await window.api.getUserRole(),
            borrador: ${vista === 'Registros.html' ? 'await window.api.obtenerBorradorRegistro()' : vista === 'ModificarParejas.html' ? 'await window.api.obtenerBorradorModificacion()' : 'null'}
        }))()`);
        assert.equal(estado.role, 'user');
        if (estado.borrador) assert.equal(estado.borrador.success, true);
    }
    assert.deepEqual(failures, []);
    console.log('SMOKE_OK: Electron real, preload, login, permisos y navegación/borradores; SQL simulado; sin escrituras reales.');
    clearTimeout(timeout); app.exit(0);
}
ejecutar().catch(error => { console.error('SMOKE_FAIL:', error.message); clearTimeout(timeout); app.exit(1); });

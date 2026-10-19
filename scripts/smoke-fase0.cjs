// Ejecutar con Electron. Perfil aislado, ventanas ocultas y SQL simulado.
// No carga credenciales reales ni realiza conexiones MySQL.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { fileURLToPath } = require('node:url');
const electron = require('electron');
const { app, BrowserWindow } = electron;
const { verificarPresentacion } = require('./verificar-presentacion.cjs');
const proyecto = path.resolve(__dirname, '..');
const root = process.env.HUAPANGO_SMOKE_APP_ROOT ? path.resolve(process.env.HUAPANGO_SMOKE_APP_ROOT) : proyecto;
const base = path.join(proyecto, '.tmp');
fs.mkdirSync(base, { recursive: true });
const profile = fs.mkdtempSync(path.join(base, 'fase0-smoke-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();
// El ensayo debe pasar incluso sin red; ningún recurso visual depende de ella.
app.whenReady().then(() => electron.session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true })));

const loaded = new Map(), waiters = new Map(), failures = [];
const ventanasEnsayo = [];
function esperar(nombre) {
    if (loaded.has(nombre)) return Promise.resolve(loaded.get(nombre));
    return new Promise(resolve => waiters.set(nombre, resolve));
}
app.on('browser-window-created', (_event, window) => {
    ventanasEnsayo.push(window);
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
    show() {} focus() {}
    // Electron no incluye esta subclase en su inventario nativo. Usar las
    // ventanas reales observadas, conservando cierre y carga nativos.
    static getAllWindows() { return ventanasEnsayo.filter(w => !w.isDestroyed()); }
}
const load = Module._load;
Module._load = function(name, parent, isMain) {
    if (name === 'electron') return { ...electron, BrowserWindow: HiddenWindow };
    return load.call(this, name, parent, isMain);
};
const dbPath = require.resolve(path.join(root, 'db.js'));
const cuentaSmoke = { nUsuarioID: '7', cNombreUsuario: 'smoke', rol: 'user', cContrasena: 'smoke-local' };
const cuentasCreadas = new Map();
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
    inicializarBaseDatos: async () => {},
    queryDatabase: async (sql, params) => {
        if (sql.startsWith('INSERT INTO T_Usuarios')) {
            const [id, nombre, hash, rol] = params;
            if (cuentasCreadas.has(id) || [...cuentasCreadas.values()].some(c => c.nombre === nombre)) {
                throw Object.assign(new Error('Duplicado ficticio'), { code: 'ER_DUP_ENTRY' });
            }
            cuentasCreadas.set(id, { nombre, hash, rol }); return { affectedRows: 1 };
        }
        if (sql.startsWith('UPDATE t_usuarios SET cContrasena')) {
            assert.equal(params[1], cuentaSmoke.nUsuarioID); assert.equal(params[2], cuentaSmoke.cContrasena);
            cuentaSmoke.cContrasena = params[0]; return { affectedRows: 1 };
        }
        if (sql.includes('cContrasena FROM t_usuarios')) return [{ ...cuentaSmoke }];
        throw Error('La prueba no autoriza consultas ni escrituras SQL');
    },
    withTransaction: async () => { throw Error('La prueba no autoriza transacciones SQL'); }
} };
const timeout = setTimeout(() => { console.error('SMOKE_FAIL: tiempo agotado'); app.exit(1); }, 25000);
async function ejecutar() {
    const manifiesto = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    require(path.join(root, manifiesto.main));
    const login = await esperar('login.html');
    await verificarPresentacion(login, 'login', profile);
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
    assert.match(cuentaSmoke.cContrasena, /^\$2b\$10\$/);
    assert.equal(await principal.webContents.executeJavaScript('window.api.getUserRole()'), 'user');
    assert.equal(await principal.webContents.executeJavaScript('window.api.getUsuarioID()'), '7');
    await verificarPresentacion(principal, 'menu', profile);
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
    loaded.delete('login.html'); waiters.delete('login.html');
    require(path.join(root, 'Modelos/sesionModel.js')).cerrarSesion();
    const expirada = await principal.webContents.executeJavaScript('window.api.getUserRole()');
    assert.equal(expirada.code, 'SESSION_EXPIRED');
    const reingreso = await esperar('login.html');
    assert.match(reingreso.webContents.getURL(), /sesion=expirada/);
    const cerrado = new Promise(resolve => reingreso.once('closed', resolve));
    reingreso.webContents.executeJavaScript(`window.api.invoke('login', { username: 'smoke', password: 'smoke-local' })`).catch(() => {});
    await cerrado;
    assert.equal(principal.isDestroyed(), false);
    assert.equal(await principal.webContents.executeJavaScript('window.api.getUserRole()'), 'user');
    // Cambiar el fixture de sesión permite probar los formularios reales por rol;
    // no se consultan cuentas ni configuración de la instalación del usuario.
    const sesiones = require(path.join(root, 'Modelos/sesionModel.js'));
    cuentaSmoke.rol = 'admin';
    sesiones.guardarSesion('7', 'admin', { credencial: cuentaSmoke.cContrasena });
    await principal.loadFile(path.join(root, 'Vistas/Administrador.html'));
    async function alta(id, nombre, rol) {
        return principal.webContents.executeJavaScript(`(async () => {
            document.getElementById('nuevoID').value = ${JSON.stringify(id)};
            document.getElementById('nuevoUsuario').value = ${JSON.stringify(nombre)};
            document.getElementById('nuevaContrasena').value = 'ClaveFicticia!';
            document.getElementById(${JSON.stringify(rol === 'admin' ? 'esAdmin' : rol === 'juez' ? 'juez' : 'tipoUsuario')}).click();
            const boton = document.getElementById('btnCrearUsuario'); boton.click();
            const inicio = Date.now();
            while (boton.disabled && Date.now() - inicio < 5000) await new Promise(r => setTimeout(r, 10));
            if (boton.disabled) throw Error('Alta no terminó');
            return { mensaje: document.querySelector('.aviso-aplicacion p')?.textContent,
                id: document.getElementById('nuevoID').value,
                rolNormal: document.getElementById('tipoUsuario').checked };
        })()`);
    }
    for (const rol of ['user', 'admin', 'juez']) {
        const r = await alta('SMOKE-' + rol, 'cuenta_' + rol, rol);
        assert.match(r.mensaje, /Usuario creado con éxito/); assert.equal(r.id, ''); assert.equal(r.rolNormal, true);
        assert.equal(cuentasCreadas.get('SMOKE-' + rol).rol, rol);
    }
    const duplicado = await alta('SMOKE-juez', 'otro_nombre', 'juez');
    assert.match(duplicado.mensaje, /Ya existe/); assert.equal(duplicado.id, 'SMOKE-juez');
    assert.match((await alta('SMOKE-nuevo', 'otro_nombre', 'juez')).mensaje, /Usuario creado con éxito/);
    console.log('CUENTAS_OK: tres roles, duplicado y reintento');
    cuentaSmoke.rol = 'juez'; sesiones.guardarSesion('7', 'juez', { credencial: cuentaSmoke.cContrasena });
    await principal.loadFile(path.join(root, 'Vistas/Resultados.html'));
    console.log('SALIDA_ENSAYO: Resultados cargado');
    await principal.webContents.executeJavaScript(`document.getElementById('observaciones').value = 'Sin guardar'; document.getElementById('btnCerrarSesion').click();`);
    assert.equal(await principal.webContents.executeJavaScript(`document.querySelector('dialog').open`), true);
    console.log('SALIDA_ENSAYO: confirmación visible');
    await principal.webContents.executeJavaScript(`Array.from(document.querySelectorAll('dialog button')).find(b => b.textContent === 'Cancelar').click()`);
    assert.equal(await principal.webContents.executeJavaScript(`document.getElementById('observaciones').value`), 'Sin guardar');
    assert.equal(sesiones.obtenerSesion().userRole, 'juez');
    console.log('SALIDA_ENSAYO: cancelación comprobada');
    loaded.delete('login.html'); waiters.delete('login.html');
    principal.webContents.executeJavaScript(`document.getElementById('btnCerrarSesion').click(); Array.from(document.querySelectorAll('dialog button')).find(b => b.textContent === 'Cerrar sesión').click();`).catch(() => {});
    const nuevoLogin = await esperar('login.html');
    console.log('SALIDA_ENSAYO: acceso cargado');
    // loadFile termina después de did-finish-load; esperar el cierre del origen.
    if (!principal.isDestroyed()) await Promise.race([
        new Promise(resolve => principal.once('closed', resolve)),
        new Promise((_, reject) => setTimeout(() => reject(Error('Cierre pendiente; sesión=' + JSON.stringify(sesiones.obtenerSesion()))), 3000))
    ]);
    console.log('SALIDA_ENSAYO: origen cerrado');
    assert.equal(sesiones.obtenerSesion(), null);
    assert.equal(await nuevoLogin.webContents.executeJavaScript('window.api.getUserRole()'), 'guest');
    console.log('CUENTAS_SALIDA_OK: formulario tres roles, duplicado, corrección, cancelar y cerrar sesión de juez.');
    assert.deepEqual(failures, []);
    console.log('CAPTURAS_VISUALES:', profile);
    console.log('SMOKE_OK: Electron real, preload, login, permisos, navegación/borradores y reingreso conservando ventana; SQL simulado; sin escrituras reales.');
    clearTimeout(timeout); app.exit(0);
}
ejecutar().catch(error => { console.error('SMOKE_FAIL:', error.message); clearTimeout(timeout); app.exit(1); });

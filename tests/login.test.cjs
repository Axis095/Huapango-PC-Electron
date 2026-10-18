const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function vista(responder) {
    const documento = { activeElement: null, addEventListener() {} };
    const elementos = new Map();
    for (const id of ['loginBtn', 'username', 'password', 'errorMsg', 'form']) {
        elementos.set(id, { value: '', disabled: false, isConnected: true, handlers: {}, attributes: {},
            addEventListener(name, handler) { this.handlers[name] = handler; },
            setAttribute(name, value) { this.attributes[name] = value; },
            focus() { documento.activeElement = this; }
        });
    }
    const get = id => elementos.get(id);
    get('loginBtn').form = get('form');
    documento.getElementById = get;
    const context = vm.createContext({ document: documento, window: { api: { invoke: responder } } });
    vm.runInContext(read('Public/js/login.js').replace(/^export /gm, ''), context);
    context.inicializarLogin();
    return { get, documento, submit() {
        let prevented = false;
        const pending = get('form').handlers.submit({ preventDefault() { prevented = true; } });
        assert.equal(prevented, true); return pending;
    } };
}

test('login: Enter/submit inválido no consulta ni recarga y enfoca el campo faltante', async () => {
    const v = vista(() => assert.fail('No consultar con campos vacíos'));
    await v.submit(); assert.equal(v.documento.activeElement, v.get('username'));
    v.get('username').value = 'Operador'; await v.submit();
    assert.equal(v.documento.activeElement, v.get('password'));
    assert.equal(v.get('username').value, 'Operador');
});

test('login: doble envío y respuesta exitosa producen una sola solicitud', async () => {
    let resolver; const calls = [];
    const v = vista((...args) => { calls.push(args); return new Promise(r => { resolver = r; }); });
    v.get('username').value = ' Operador '; v.get('password').value = ' clave con espacios ';
    const pending = v.submit(); await v.submit();
    assert.equal(calls.length, 1); assert.equal(calls[0][0], 'login');
    assert.equal(calls[0][1].username, 'Operador'); assert.equal(calls[0][1].password, ' clave con espacios ');
    assert.equal(v.get('loginBtn').disabled, true);
    resolver({ success: true }); await pending; await v.submit();
    assert.equal(calls.length, 1);
});

for (const modo of ['rechazo IPC', 'error controlador', 'credenciales incorrectas']) {
    test(`login: ${modo} conserva campos y permite reintentar`, async () => {
        let calls = 0;
        const v = vista(async () => {
            calls++;
            if (calls > 1) return { success: true };
            if (modo === 'rechazo IPC') throw Error('Detalle interno');
            return modo === 'error controlador' ? { success: false, error: 'Conexión fallida' } : { success: false, message: 'Credenciales incorrectas' };
        });
        v.get('username').value = 'Operador'; v.get('password').value = 'Prueba'; v.get('password').focus();
        await v.submit();
        assert.equal(v.get('username').value, 'Operador'); assert.equal(v.get('password').value, 'Prueba');
        assert.equal(v.get('loginBtn').disabled, false); assert.equal(v.get('password').disabled, false);
        assert.equal(v.documento.activeElement, v.get('password'));
        assert.doesNotMatch(v.get('errorMsg').textContent, /Detalle interno|desconocido/);
        if (modo === 'error controlador') assert.equal(v.get('errorMsg').textContent, 'Conexión fallida');
        await v.submit(); assert.equal(calls, 2);
    });
}

function controlador(query) {
    const module = { exports: {} }; const calls = { windows: 0, sessions: 0, closed: 0 };
    const global = { loginWindow: { isDestroyed: () => false, close() { calls.closed++; } },
        mainWindow: { webContents: { once() {} } } };
    vm.runInNewContext(read('Controladores/authController.js'), { module, global,
        console: { log() {}, error() {}, warn() {} },
        require(name) { return name === '../db' ? { queryDatabase: query } : { guardarSesion() { calls.sessions++; }, obtenerClaveSesion() { return {}; } }; }
    });
    return { calls, login(credentials) { return module.exports.handleLogin(null, credentials, () => { calls.windows++; }, () => true); } };
}

test('controlador: dos IPC simultáneos crean una sola ventana y sesión', async () => {
    let resolver; let queries = 0;
    const c = controlador(() => { queries++; return new Promise(r => { resolver = r; }); });
    const pending = c.login({ username: 'Operador', password: 'Prueba' });
    assert.equal((await c.login({ username: 'Otro', password: 'Prueba' })).success, false);
    resolver([{ nUsuarioID: 1, rol: 'user' }]); assert.equal((await pending).success, true);
    assert.equal(queries, 1); assert.equal(c.calls.windows, 1); assert.equal(c.calls.sessions, 1); assert.equal(c.calls.closed, 1);
});

test('controlador: entrada inválida y error SQL liberan el turno para reintentar', async () => {
    let queries = 0;
    const c = controlador(async () => { queries++; if (queries === 1) throw Error('No disponible'); return []; });
    for (const invalid of [undefined, null, {}, { username: 1, password: 'x' }, { username: ' ', password: 'x' }]) {
        assert.equal((await c.login(invalid)).success, false);
    }
    assert.equal(queries, 0);
    assert.equal((await c.login({ username: 'Operador', password: 'x' })).success, false);
    assert.match((await c.login({ username: 'Operador', password: 'x' })).message, /incorrectos/);
    assert.equal(queries, 2); assert.equal(c.calls.windows, 0);
});

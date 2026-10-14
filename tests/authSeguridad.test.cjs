const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const source = fs.readFileSync(path.join(__dirname, '../Controladores/authController.js'), 'utf8');

function preparar(usuario, opciones = {}) {
    let sesion = null;
    const calls = { windows: 0, closed: 0, destroyed: 0 };
    const global = { loginWindow: { isDestroyed: () => false, close() { calls.closed++; } },
        mainWindow: { isDestroyed: () => false, destroy() { calls.destroyed++; }, webContents: { once() {} } } };
    const module = { exports: {} };
    vm.runInNewContext(source, { module, global, console: { log() {}, warn() {}, error() {} }, require(name) {
        if (name === '../db') return { queryDatabase: async () => usuario ? [usuario] : [] };
        if (name === '../Modelos/sesionModel') return {
            guardarSesion(id, rol) { sesion = { userID: id, userRole: rol }; },
            obtenerSesion: () => sesion, cerrarSesion() { sesion = null; }
        };
        if (name === 'bcryptjs') { if (opciones.sinBcrypt) throw Error('Dependencia ausente'); return bcrypt; }
        if (name === '../Seguridad/datos') return require('../Seguridad/datos');
        throw Error(`Dependencia inesperada: ${name}`);
    } });
    return { calls, sesion: () => sesion, login: password => module.exports.handleLogin(null,
        { username: 'Ana', password }, async () => { calls.windows++; if (opciones.fallaVentana) throw Error('No cargó'); }) };
}
const cuenta = { nUsuarioID: 7, rol: 'admin' };

test('auth: admin3 con ID numérico devuelto como texto inicia sesión', async () => {
    const h = preparar({ nUsuarioID: '6', cNombreUsuario: 'admin3', cContrasena: 'admin3', rol: 'admin' });
    assert.equal((await h.login('admin3')).success, true);
    assert.equal(h.sesion().userID, '6');
    assert.equal(h.calls.windows, 1);
});

test('auth: un ID de texto numérico conserva ceros del identificador original', async () => {
    const h = preparar({ ...cuenta, nUsuarioID: '006', cContrasena: 'clave' });
    assert.equal((await h.login('clave')).success, true);
    assert.equal(h.sesion().userID, '006');
});

test('auth: aceptar IDs numéricos de texto no admite tipos ni formatos inválidos', async () => {
    for (const id of [null, undefined, '', ' ', '6x', '1e2', '0', '-1', '1.5', true, {}, [6], '9007199254740992']) {
        const h = preparar({ ...cuenta, nUsuarioID: id, cContrasena: 'clave' });
        assert.equal((await h.login('clave')).success, false);
        assert.equal(h.sesion(), null);
    }
});

for (const valor of [undefined, null, 123, {}, [], '']) {
    test(`auth: contraseña almacenada ${JSON.stringify(valor)} se rechaza sin sesión`, async () => {
        const h = preparar({ ...cuenta, cContrasena: valor });
        assert.equal((await h.login('incorrecta')).success, false);
        assert.equal(h.sesion(), null); assert.equal(h.calls.windows, 0);
    });
}
test('auth: bcrypt real admite contraseña correcta y rechaza incorrecta y el propio hash', async () => {
    const hash = await bcrypt.hash(' clave con espacios ', 4);
    for (const password of ['incorrecta', hash, 'clave con espacios']) {
        const h = preparar({ ...cuenta, cContrasena: hash });
        assert.equal((await h.login(password)).success, false); assert.equal(h.sesion(), null);
    }
    const h = preparar({ ...cuenta, cContrasena: hash });
    assert.equal((await h.login(' clave con espacios ')).success, true);
    assert.equal(h.sesion().userID, 7); assert.equal(h.calls.closed, 1);
});
test('auth: hash malformado nunca pasa a comparación de texto', async () => {
    for (const hash of ['$2b$incompleto', '$2a$10$rota', '$2y$invalida']) {
        const h = preparar({ ...cuenta, cContrasena: hash });
        assert.equal((await h.login(hash)).success, false); assert.equal(h.sesion(), null);
    }
});
test('auth: compatibilidad temporal con texto legado exige coincidencia exacta', async () => {
    for (const password of ['otra', ' legado ']) {
        const h = preparar({ ...cuenta, cContrasena: ' legado ' });
        assert.equal((await h.login(password)).success, password === ' legado ');
    }
});
test('auth: cuenta desconocida, rol inválido o ID inválido no crea sesión', async () => {
    for (const usuario of [null, { ...cuenta, rol: 'root', cContrasena: 'clave' },
        { ...cuenta, nUsuarioID: null, cContrasena: 'clave' }]) {
        const h = preparar(usuario);
        assert.equal((await h.login('clave')).success, false); assert.equal(h.sesion(), null);
    }
});
test('auth: fallo al cargar ventana revoca sesión y conserva login para reintentar', async () => {
    const h = preparar({ ...cuenta, cContrasena: 'clave' }, { fallaVentana: true });
    assert.equal((await h.login('clave')).success, false);
    assert.equal(h.sesion(), null); assert.equal(h.calls.closed, 0); assert.equal(h.calls.destroyed, 1);
    assert.equal((await h.login('clave')).success, false); assert.equal(h.calls.windows, 2);
});
test('auth: bcrypt es obligatorio incluso con cuentas de texto legado', () => {
    assert.throws(() => preparar({ ...cuenta, cContrasena: 'clave' }, { sinBcrypt: true }), /Dependencia ausente/);
});

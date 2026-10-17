const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const source = fs.readFileSync(path.join(__dirname, '../Controladores/authController.js'), 'utf8');

function preparar(usuario, opciones = {}) {
    let sesion = null;
    const calls = { windows: 0, closed: 0, destroyed: 0, queries: [] };
    usuario = usuario ? { ...usuario } : null;
    const global = { loginWindow: { isDestroyed: () => false, close() { calls.closed++; } },
        mainWindow: { isDestroyed: () => false, destroy() { calls.destroyed++; }, webContents: { once() {} } } };
    const module = { exports: {} };
    vm.runInNewContext(source, { module, global, console: { log() {}, warn() {}, error() {} }, require(name) {
        if (name === '../db') return { queryDatabase: async (sql, params) => {
            calls.queries.push({ sql, params });
            if (sql.startsWith('UPDATE')) {
                if (opciones.cambioConcurrente) return { affectedRows: 0 };
                usuario.cContrasena = params[0]; return { affectedRows: 1 };
            }
            return usuario ? [usuario] : [];
        } };
        if (name === '../Modelos/sesionModel') return {
            guardarSesion(id, rol) { sesion = { userID: id, userRole: rol }; },
            obtenerSesion: () => sesion, cerrarSesion() { sesion = null; }
        };
        if (name === 'bcryptjs') { if (opciones.sinBcrypt) throw Error('Dependencia ausente'); return bcrypt; }
        if (name === '../Seguridad/identidad') return require('../Seguridad/identidad');
        throw Error(`Dependencia inesperada: ${name}`);
    } });
    return { calls, usuario: () => usuario, sesion: () => sesion, modulo: module.exports, login: password => module.exports.handleLogin(null,
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

test('auth: IDs VARCHAR aceptan alfanuméricos sin coerción ni pérdida de precisión', async () => {
    for (const id of ['U001', '6x', '9007199254740992']) {
        const h = preparar({ ...cuenta, nUsuarioID: id, cContrasena: 'clave' });
        assert.equal((await h.login('clave')).success, true); assert.equal(h.sesion().userID, id);
    }
    for (const id of [null, undefined, '', ' ', '0', '-1', '1.5', true, {}, [6], 'a'.repeat(51)]) {
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

test('auth: texto legado se migra a hash comprobado antes de crear la sesión', async () => {
    const h = preparar({ ...cuenta, cContrasena: ' legado ' });
    assert.equal((await h.login(' legado ')).success, true);
    assert.match(h.usuario().cContrasena, /^\$2b\$10\$/);
    assert.equal(await bcrypt.compare(' legado ', h.usuario().cContrasena), true);
    const cambio = h.calls.queries.find(q => q.sql.startsWith('UPDATE'));
    assert.match(cambio.sql, /BINARY cContrasena = BINARY \?/);
    assert.equal(cambio.params[2], ' legado ');
    assert.equal(h.calls.queries.at(-1).sql.includes('confirmar-login'), true);
});

test('auth: cambio concurrente de contraseña impide login y no sobrescribe credencial', async () => {
    const h = preparar({ ...cuenta, cContrasena: 'legado' }, { cambioConcurrente: true });
    assert.equal((await h.login('legado')).success, false);
    assert.equal(h.sesion(), null); assert.equal(h.calls.windows, 0);
    assert.equal(h.usuario().cContrasena, 'legado');
});

test('auth: límite por cuenta y global con reloj inyectado bloquea consultas y expira', async () => {
    const h = preparar(null); let ahora = 0, consultas = 0;
    const auth = h.modulo.crearAutenticador({ ahora: () => ahora, consultar: async () => { consultas++; return []; },
        gestor: { obtenerSesion: () => null }, ventanaMs: 1000, intentosUsuario: 2, intentosGlobales: 3 });
    const login = username => auth.handleLogin(null, { username, password: 'x' }, () => assert.fail('No abrir'));
    await login('Ana'); await login(' ana ');
    assert.equal((await login('ANA')).code, 'RATE_LIMITED'); assert.equal(consultas, 2);
    await login('Otra'); assert.equal((await login('Tercera')).code, 'RATE_LIMITED'); assert.equal(consultas, 3);
    ahora = 1000;
    assert.equal((await login('Ana')).code, undefined); assert.equal(consultas, 4);
});

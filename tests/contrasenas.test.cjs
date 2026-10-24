const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const bcrypt = require('bcryptjs');
const passwords = require('../Modelos/contrasenaModel');
const root = path.resolve(__dirname, '..');

function cargar(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), {
        module, console: { log() {}, error() {}, warn() {} },
        require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; }, ...extra
    }, { filename: file });
    return module.exports;
}

function preparar(filas, opciones = {}) {
    const consultas = [], sesion = cargar('Modelos/sesionModel.js', {});
    let abiertas = 0, cerradas = 0;
    const global = { loginWindow: { isDestroyed: () => false, close() { cerradas++; } } };
    const auth = cargar('Controladores/authController.js', {
        '../db': { async queryDatabase(sql, params) { consultas.push({ sql, params: Array.from(params) }); return filas; } },
        '../Modelos/sesionModel': sesion,
        '../Modelos/contrasenaModel': opciones.passwords || passwords
    }, { global });
    return { consultas, sesion, get abiertas() { return abiertas; }, get cerradas() { return cerradas; },
        login(password, autorizado = () => true) {
            return auth.handleLogin(null, { username: ' Ana ', password }, () => { abiertas++; }, autorizado);
        }
    };
}

test('cuentas antiguas: cada rol conserva ID y acepta solo su contraseña exacta sin modificar SQL', async () => {
    for (const rol of ['admin', 'user', 'juez']) {
        const v = preparar([{ nUsuarioID: 7, rol, cContrasena: ' Clave Ántigua ' }]);
        for (const incorrecta of ['clave ántigua', 'Clave Ántigua', 'Otra']) {
            assert.equal((await v.login(incorrecta)).success, false);
            assert.equal(v.sesion.obtenerSesion(), null);
        }
        assert.equal((await v.login(' Clave Ántigua ')).success, true);
        assert.equal(v.sesion.obtenerSesion().userID, 7);
        assert.equal(v.sesion.obtenerSesion().userRole, rol);
        assert.equal(v.abiertas, 1); assert.equal(v.cerradas, 1);
        for (const q of v.consultas) {
            assert.match(q.sql, /^SELECT/); assert.doesNotMatch(q.sql, /AND cContrasena/);
            assert.deepEqual(q.params, ['Ana']);
        }
    }
});

test('alta y login de cada rol: se guarda bcrypt real y se autentica la cuenta recién creada', async () => {
    for (const rol of ['admin', 'user', 'juez']) {
        let fila;
        const modelo = cargar('Modelos/adminModel.js', {
            './parejaModel': {}, './contrasenaModel': passwords,
            '../db': { async queryDatabase(sql, p) {
                assert.match(sql, /INSERT INTO T_Usuarios/);
                fila = { nUsuarioID: p[0], cNombreUsuario: p[1], cContrasena: p[2], rol: p[3] };
                return { insertId: p[0] };
            } }
        });
        await modelo.crearUsuario({ nUsuarioID: 8, cNombreUsuario: ' Ana ', cContrasena: 'Contraseña segura', rol });
        assert.match(fila.cContrasena, /^\$2[aby]\$10\$/);
        assert.equal(fila.cContrasena.length, 60);
        assert.equal(await bcrypt.compare('Contraseña segura', fila.cContrasena), true);
        const v = preparar([fila]);
        assert.equal((await v.login('incorrecta')).success, false);
        assert.equal((await v.login(fila.cContrasena)).success, false);
        assert.equal((await v.login('Contraseña segura')).success, true);
        assert.equal(v.sesion.obtenerSesion().userRole, rol);
    }
});

test('bcrypt existente: admite prefijos 2a, 2b y 2y con verificación real', async () => {
    const hash = await bcrypt.hash('Existente', 10);
    for (const prefijo of ['$2a$', '$2b$', '$2y$']) {
        const v = preparar([{ nUsuarioID: 1, rol: 'admin', cContrasena: prefijo + hash.slice(4) }]);
        assert.equal((await v.login('incorrecta')).success, false);
        assert.equal((await v.login('Existente')).success, true);
    }
});

test('login rechaza cuentas sin contraseña, hashes corruptos y nombres duplicados', async () => {
    for (const almacenada of [undefined, null, '', 1, {}, '$2b$10$incompleto', '$2x$10$invalido']) {
        const v = preparar([{ nUsuarioID: 1, rol: 'admin', cContrasena: almacenada }]);
        assert.equal((await v.login(typeof almacenada === 'string' && almacenada ? almacenada : 'clave')).success, false);
        assert.equal(v.abiertas, 0); assert.equal(v.sesion.obtenerSesion(), null);
    }
    const fila = { nUsuarioID: 1, rol: 'admin', cContrasena: 'clave' };
    for (const filas of [[], [fila, { ...fila, nUsuarioID: 2 }]]) {
        const v = preparar(filas);
        assert.equal((await v.login('clave')).success, false); assert.equal(v.abiertas, 0);
    }
});

test('una contraseña correcta no concede sesión con ID o rol inválidos', async () => {
    for (const datos of [{ nUsuarioID: 0, rol: 'admin' }, { nUsuarioID: '1', rol: 'admin' }, { nUsuarioID: 1, rol: 'otro' }]) {
        const v = preparar([{ ...datos, cContrasena: 'clave' }]);
        assert.equal((await v.login('clave')).success, false);
        assert.equal(v.sesion.obtenerSesion(), null); assert.equal(v.abiertas, 0);
    }
});

test('bcrypt pendiente: revocar autorización impide crear sesión y se puede reintentar', async () => {
    const hash = await passwords.crearHashContrasena('clave');
    let desbloquear, avisar;
    const iniciada = new Promise(r => { avisar = r; });
    const pausa = new Promise(r => { desbloquear = r; });
    const v = preparar([{ nUsuarioID: 1, rol: 'admin', cContrasena: hash }], {
        passwords: { async verificarContrasena(...args) { avisar(); await pausa; return passwords.verificarContrasena(...args); } }
    });
    let autorizado = true;
    const pendiente = v.login('clave', () => autorizado);
    await iniciada;
    assert.equal((await v.login('clave')).success, false);
    autorizado = false; desbloquear();
    assert.equal((await pendiente).code, 'FORBIDDEN');
    assert.equal(v.sesion.obtenerSesion(), null); assert.equal(v.abiertas, 0);
    assert.equal((await v.login('clave')).success, true);
});

test('fallo de bcrypt no concede sesión ni deja bloqueado el siguiente login', async () => {
    let falla = true;
    const v = preparar([{ nUsuarioID: 1, rol: 'admin', cContrasena: 'clave' }], {
        passwords: { async verificarContrasena(...args) { if (falla) throw Error('Fallo simulado'); return passwords.verificarContrasena(...args); } }
    });
    assert.equal((await v.login('clave')).success, false); assert.equal(v.abiertas, 0);
    assert.equal(v.sesion.obtenerSesion(), null);
    falla = false; assert.equal((await v.login('clave')).success, true);
});

test('alta rechaza contraseñas inválidas y superiores a 72 bytes antes del INSERT', async () => {
    const modelo = cargar('Modelos/adminModel.js', {
        './parejaModel': {}, './contrasenaModel': passwords,
        '../db': { queryDatabase() { assert.fail('No insertar'); } }
    });
    for (const password of [undefined, null, '', '  ', 123, {}, 'a'.repeat(73), 'á'.repeat(37)]) {
        await assert.rejects(modelo.crearUsuario({ nUsuarioID: 8, cNombreUsuario: 'Ana', cContrasena: password, rol: 'user' }), /contraseña/);
    }
});

test('límite bcrypt: 72 bytes funciona y no acepta una contraseña extendida con el mismo prefijo', async () => {
    const password = 'á'.repeat(36);
    const hash = await passwords.crearHashContrasena(password);
    assert.equal(await passwords.verificarContrasena(password, hash), true);
    assert.equal(await passwords.verificarContrasena(password + 'x', hash), false);
    // La compatibilidad de cuentas antiguas no trunca contraseñas largas.
    assert.equal(await passwords.verificarContrasena(password + 'x', password + 'x'), true);
    assert.equal(await passwords.verificarContrasena(password, password + 'x'), false);
});

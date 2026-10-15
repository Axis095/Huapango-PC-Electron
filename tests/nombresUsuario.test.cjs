const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
function cargar(file, deps) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), { module, console: { log() {}, warn() {}, error() {} }, require(name) {
        if (name === "../Seguridad/errores") return require("../Seguridad/errores");
        assert.ok(name in deps, `Dependencia inesperada: ${name}`); return deps[name];
    } });
    return module.exports;
}
function preparar(queryDatabase) {
    const model = cargar('Modelos/adminModel.js', { '../db': { queryDatabase, withTransaction: (_tablas, fn) => fn(queryDatabase) },
        './parejaModel': {}, bcryptjs: require('bcryptjs'), '../Seguridad/identidad': require('../Seguridad/identidad') });
    const controller = cargar('Controladores/adminController.js', { '../Modelos/adminModel': model,
        '../Modelos/sesionModel': { obtenerSesion: () => ({ userID: 'Admin-1', userRole: 'admin' }) } });
    const vista = vm.createContext({ TextEncoder });
    vm.runInContext(read('Public/js/validaciones.js').replace(/^export /gm, ''), vista);
    return { model, controller, vista };
}
const cuenta = { nUsuarioID: '8', cNombreUsuario: 'Ana', cContrasena: 'Prueba', rol: 'user' };

test('alta: vista y backend rechazan nombres inválidos sin consultar SQL', async () => {
    const v = preparar(() => assert.fail('No consultar SQL para datos inválidos'));
    for (const nombre of ['', ' ', 'A', 'AB', ' A ', undefined, null, 123, {}, []]) {
        const datos = { ...cuenta, cNombreUsuario: nombre };
        assert.throws(() => v.vista.validarDatosUsuario(datos), /obligatorio|3 caracteres/);
        await assert.rejects(v.model.crearUsuario(datos), /obligatorio|3 caracteres/);
        const response = await v.controller.handleCrearUsuario(null, datos);
        assert.equal(response.success, false); assert.match(response.error, /obligatorio|3 caracteres/);
    }
});

test('alta: los tres roles aceptan el límite de 3 caracteres y guardan el nombre recortado', async () => {
    const consultas = [];
    const v = preparar(async (sql, params) => { consultas.push({ sql, params }); return { insertId: 8 }; });
    for (const rol of ['user', 'admin', 'juez']) {
        const datos = { ...cuenta, cNombreUsuario: ' Ana ', rol };
        v.vista.validarDatosUsuario(datos);
        assert.equal((await v.controller.handleCrearUsuario(null, datos)).success, true);
        assert.equal(consultas.at(-1).params[1], 'Ana'); assert.equal(consultas.at(-1).params[3], rol);
        assert.notEqual(consultas.at(-1).params[2], datos.cContrasena);
        assert.equal(await require('bcryptjs').compare(datos.cContrasena, consultas.at(-1).params[2]), true);
    }
});

test('baja: nombres vacíos o tipos inválidos se rechazan en vista y modelo', async () => {
    const v = preparar(() => assert.fail('No consultar nombres vacíos'));
    for (const nombre of ['', '   ', undefined, null, {}, [], 1]) {
        assert.throws(() => v.vista.validarDatosEliminarUsuario({ cNombreUsuario: nombre }), /Ingresa el nombre/);
        await assert.rejects(v.model.obtenerRolUsuario(nombre), /obligatorio/);
        await assert.rejects(v.model.eliminarUsuario(nombre), /obligatorio/);
        assert.equal((await v.controller.handleEliminarUsuario(null, nombre)).success, false);
    }
});

test('baja: nombres cortos existentes se buscan parametrizados y se eliminan por ID bajo locks', async () => {
    const consultas = [];
    const v = preparar(async (sql, params) => {
        consultas.push({ sql, params: Array.from(params) });
        if (sql.includes("rol = 'admin'")) return [{ nUsuarioID: 'Admin-1' }];
        return sql.trim().startsWith('SELECT') ? [{ nUsuarioID: 'U001', rol: 'user' }] : { affectedRows: 1 };
    });
    for (const nombre of ['A', 'AB']) {
        v.vista.validarDatosEliminarUsuario({ cNombreUsuario: nombre });
        const response = await v.controller.handleEliminarUsuario(null, ` ${nombre} `);
        assert.equal(response.success, true);
        assert.deepEqual(consultas.at(-2).params, [nombre]);
        assert.deepEqual(consultas.at(-1).params, ['U001']);
        assert.match(consultas.at(-1).sql, /WHERE nUsuarioID = \?/);
    }
});

test('baja: un nombre corto inexistente no dispara DELETE', async () => {
    const consultas = [];
    const v = preparar(async sql => { consultas.push(sql); return sql.includes("rol = 'admin'") ? [{ nUsuarioID: 'Admin-1' }] : []; });
    const response = await v.controller.handleEliminarUsuario(null, 'A');
    assert.equal(response.success, false); assert.match(response.message, /no encontrado/);
    assert.equal(consultas.length, 2); assert.match(consultas[1], /^SELECT/);
});

test('alta: un error SQL sigue siendo error y no se pierde la posibilidad de reintentar', async () => {
    let intentos = 0;
    const v = preparar(async () => { if (++intentos === 1) throw Error('Duplicado'); return { insertId: 8 }; });
    assert.equal((await v.controller.handleCrearUsuario(null, cuenta)).success, false);
    assert.equal((await v.controller.handleCrearUsuario(null, cuenta)).success, true);
});

test('alta: ID VARCHAR alfanumérico llega intacto a SQL; coerciones no se aceptan', async () => {
    let parametros;
    const v = preparar(async (_sql, params) => { parametros = params; return {}; });
    assert.equal(await v.model.crearUsuario({ ...cuenta, nUsuarioID: 'U001' }), 'U001');
    assert.equal(parametros[0], 'U001');
    for (const id of [[6], {}, true, ' U001 ', 'a'.repeat(51)]) await assert.rejects(v.model.crearUsuario({ ...cuenta, nUsuarioID: id }), /ID/);
});

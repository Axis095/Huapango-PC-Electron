const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const quiet = { log() {}, warn() {}, error() {} };

function cargar(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), {
        module, __dirname: path.dirname(path.join(root, file)), console: quiet,
        require(name) {
            assert.ok(Object.hasOwn(deps, name), `Dependencia inesperada: ${name}`);
            return deps[name];
        }, ...extra
    }, { filename: file });
    return module.exports;
}

function evento(vista = 'Administrador.html') {
    const frame = { url: pathToFileURL(path.join(root, 'Vistas', vista)).href };
    return { senderFrame: frame, sender: { mainFrame: frame } };
}

const cuenta = { nUsuarioID: '8', cNombreUsuario: 'Ana', cContrasena: 'Prueba', rol: 'user' };
const operaciones = [
    ['crear-usuario', cuenta],
    ['eliminar-usuario', 'Ana'],
    ['eliminar-pareja', '7']
];

// Se ejecutan los registros IPC de main, la sesión, el controlador y el modelo
// de usuarios reales. Solo se simulan Electron y el acceso a datos.
function preparar(opciones = {}) {
    const consultas = [], parejas = [], handlers = new Map();
    const sesion = cargar('Modelos/sesionModel.js', {});
    const modelo = cargar('Modelos/adminModel.js', {
        '../db': { async queryDatabase(sql, params) {
            consultas.push({ sql, params: Array.from(params) });
            if (opciones.errorSQL) throw new Error('Error SQL simulado');
            if (sql.trim().startsWith('SELECT')) return opciones.noExiste ? [] : [{ rol: 'user' }];
            return { affectedRows: 1, insertId: 8 };
        } },
        './parejaModel': { async eliminarPareja(id) { parejas.push(id); return 1; } }
    });
    const controlador = cargar('Controladores/adminController.js', { '../Modelos/adminModel': modelo });
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    deps.path = path;
    deps.url = { fileURLToPath };
    deps['./Modelos/sesionModel'] = sesion;
    deps['./Controladores/adminController'] = controlador;
    deps.electron = {
        ipcMain: { handle(name, fn) { handlers.set(name, fn); }, on() {} },
        app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} }
    };
    // El valor global antiguo nunca debe otorgar autorización.
    const registrar = require('./helpers/mainConVentanas.cjs')(deps, { userRole: 'admin' });
    return { sesion, consultas, parejas, invoke: (canal, event, ...args) => { registrar(event); return handlers.get(canal)(event, ...args); } };
}

function denegado(respuesta) {
    assert.equal(respuesta.success, false);
    assert.equal(respuesta.code, 'FORBIDDEN');
    assert.match(respuesta.error, /administrador/);
    assert.equal(respuesta.message, respuesta.error);
}

for (const rol of ['user', 'juez', 'guest', 'desconocido', 'Admin', null]) {
    test(`IPC administrativo: ${rol ?? 'sin sesión'} no consulta ni modifica datos`, async () => {
        const v = preparar();
        if (rol !== null) v.sesion.guardarSesion(3, rol);
        for (const [canal, datos] of operaciones) denegado(await v.invoke(canal, evento(), datos));
        assert.equal(v.consultas.length, 0);
        assert.equal(v.parejas.length, 0);
    });
}

test('los roles enviados en datos o argumentos IPC no elevan los permisos', async () => {
    const v = preparar();
    v.sesion.guardarSesion(3, 'user');
    const e = { ...evento(), userRole: 'admin', rol: 'admin' };
    denegado(await v.invoke('crear-usuario', e, { ...cuenta, rol: 'admin', userRole: 'admin', userID: 1 }));
    denegado(await v.invoke('eliminar-usuario', e, 'Ana', 'admin'));
    denegado(await v.invoke('eliminar-pareja', e, '7', { rol: 'admin' }));
    assert.equal(v.consultas.length, 0);
    assert.equal(v.parejas.length, 0);
});

test('admin desde la vista autorizada crea los tres tipos de cuenta y elimina usuarios y parejas', async () => {
    const v = preparar();
    v.sesion.guardarSesion(1, 'admin');
    const e = evento();
    e.senderFrame.url += '?emergente=1';
    for (const rol of ['user', 'juez', 'admin']) {
        const respuesta = await v.invoke('crear-usuario', e, { ...cuenta, rol });
        assert.equal(respuesta.success, true);
        assert.equal(respuesta.id, '8');
        assert.equal(v.consultas.at(-1).params[3], rol);
    }
    assert.equal((await v.invoke('eliminar-usuario', e, 'Ana')).success, true);
    assert.match(v.consultas.at(-2).sql, /^SELECT/);
    assert.match(v.consultas.at(-1).sql, /DELETE FROM T_Usuarios/);
    assert.equal((await v.invoke('eliminar-pareja', e, '7')).success, true);
    assert.deepEqual(v.parejas, ['7']);
    assert.equal(v.consultas.length, 5);
});

test('incluso admin necesita un emisor local válido y el frame principal de Administración', async () => {
    const v = preparar();
    v.sesion.guardarSesion(1, 'admin');
    const subframe = evento();
    subframe.senderFrame = { ...subframe.senderFrame };
    const remoto = evento();
    remoto.senderFrame.url = 'https://example.test/Vistas/Administrador.html';
    const ajeno = evento();
    ajeno.senderFrame.url = pathToFileURL(path.join(root, '..', 'otra-app', 'Vistas', 'Administrador.html')).href;
    const invalido = evento();
    invalido.senderFrame.url = 'no-es-una-url';
    for (const e of [null, {}, { sender: {} }, evento('login.html'), evento('Registros.html'), subframe, remoto, ajeno, invalido]) {
        for (const [canal, datos] of operaciones) denegado(await v.invoke(canal, e, datos));
    }
    assert.equal(v.consultas.length, 0);
    assert.equal(v.parejas.length, 0);
});

test('cada solicitud vuelve a comprobar la sesión: cambiar de rol o cerrarla revoca el permiso', async () => {
    const v = preparar();
    const e = evento();
    v.sesion.guardarSesion(1, 'admin');
    assert.equal((await v.invoke('crear-usuario', e, cuenta)).success, true);
    v.sesion.guardarSesion(2, 'user');
    for (const [canal, datos] of operaciones) denegado(await v.invoke(canal, e, datos));
    v.sesion.cerrarSesion();
    for (const [canal, datos] of operaciones) denegado(await v.invoke(canal, e, datos));
    assert.equal(v.consultas.length, 1);
    assert.equal(v.parejas.length, 0);
});

test('una sesión admin incompleta no autoriza operaciones', async () => {
    const v = preparar();
    for (const id of [undefined, null, 0, -1, NaN]) {
        v.sesion.guardarSesion(id, 'admin');
        for (const [canal, datos] of operaciones) denegado(await v.invoke(canal, evento(), datos));
    }
    assert.equal(v.consultas.length, 0);
    assert.equal(v.parejas.length, 0);
});

test('autorización no sustituye validaciones ni oculta errores de datos existentes', async () => {
    const v = preparar({ noExiste: true });
    v.sesion.guardarSesion(1, 'admin');
    const invalida = await v.invoke('crear-usuario', evento(), { ...cuenta, cNombreUsuario: 'A' });
    assert.equal(invalida.success, false);
    assert.match(invalida.error, /3 caracteres/);
    assert.equal(v.consultas.length, 0);
    const ausente = await v.invoke('eliminar-usuario', evento(), 'Ana');
    assert.equal(ausente.success, false);
    assert.match(ausente.message, /no encontrado/);
    assert.equal(v.consultas.length, 1);

    const fallo = preparar({ errorSQL: true });
    fallo.sesion.guardarSesion(1, 'admin');
    const respuesta = await fallo.invoke('crear-usuario', evento(), cuenta);
    assert.equal(respuesta.success, false);
    assert.match(respuesta.error, /Error SQL simulado/);
});

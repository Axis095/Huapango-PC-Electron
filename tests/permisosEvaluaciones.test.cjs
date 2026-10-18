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
        require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; },
        ...extra
    }, { filename: file });
    return module.exports;
}

function evento(vista = 'Resultados.html') {
    const frame = { url: pathToFileURL(path.join(root, 'Vistas', vista)).href };
    return { senderFrame: frame, sender: { mainFrame: frame } };
}
const datos = { nParejaID: '7', nPuntaje: 30, cComentario: 'Prueba' };

// Registros IPC, sesión, controlador y modelo reales; sin Electron ni MySQL reales.
function preparar({ errorSQL = false } = {}) {
    const consultas = [], handlers = new Map();
    const sesion = cargar('Modelos/sesionModel.js', {});
    const modelo = cargar('Modelos/evaluacionesModel.js', {
        '../db': { async queryDatabase(sql, params) {
            consultas.push({ sql, params: Array.from(params) });
            if (errorSQL) throw new Error('Fallo SQL simulado');
            return { insertId: 17 };
        } }
    });
    const controlador = cargar('Controladores/evaluacionesController.js', {
        '../Modelos/evaluacionesModel': modelo,
        '../Modelos/sesionModel': sesion,
        'node:path': path, 'node:url': { fileURLToPath }
    });
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    deps.path = path;
    deps.url = { fileURLToPath };
    deps['./Modelos/sesionModel'] = sesion;
    deps['./Controladores/evaluacionesController'] = controlador;
    deps.electron = {
        ipcMain: { handle(name, fn) { handlers.set(name, fn); }, on() {} },
        app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} }
    };
    const registrar = require('./helpers/mainConVentanas.cjs')(deps, { userRole: 'admin', userID: 999 });
    return { sesion, consultas,
        guardar: (d = datos, e = evento(), ...extras) => { registrar(e); return handlers.get('registrar-evaluacion')(e, d, ...extras); } };
}
function denegado(respuesta) {
    assert.equal(respuesta.success, false);
    assert.equal(respuesta.code, 'FORBIDDEN');
    assert.match(respuesta.error, /juez o administrador/);
}

for (const rol of [null, 'user', 'guest', 'otro', 'Juez', 'Admin']) {
    test(`evaluar: ${rol ?? 'sin sesión'} se rechaza antes de acceder a MySQL`, async () => {
        const v = preparar();
        if (rol !== null) v.sesion.guardarSesion(12, rol);
        denegado(await v.guardar({ ...datos, nJuezID: 12, rol: 'admin', userRole: 'juez' }));
        assert.equal(v.consultas.length, 0);
    });
}

for (const rol of ['juez', 'admin']) {
    test(`${rol}: la evaluación siempre usa su ID de sesión, incluso ante un ID falsificado`, async () => {
        const v = preparar();
        v.sesion.guardarSesion(12, rol);
        for (const extra of [{}, { nJuezID: 999, userID: 999, rol: 'admin', userRole: 'admin' }]) {
            const enviados = Object.freeze({ ...datos, ...extra });
            const respuesta = await v.guardar(enviados, evento(), { nJuezID: 999 });
            assert.equal(respuesta.success, true);
            assert.equal(respuesta.id, 17);
            assert.match(v.consultas.at(-1).sql, /INSERT INTO t_evaluaciones/);
            assert.deepEqual(v.consultas.at(-1).params, [12, 7, 30, 'Prueba']);
        }
        assert.equal(v.consultas.length, 2);
    });
}

test('rol autorizado requiere una identidad de sesión válida', async () => {
    const v = preparar();
    for (const id of [undefined, null, 0, -1, NaN, 1.5, '12']) {
        v.sesion.guardarSesion(id, 'juez');
        denegado(await v.guardar({ ...datos, nJuezID: 12 }));
    }
    assert.equal(v.consultas.length, 0);
});

test('rechaza login, otras vistas, archivos ajenos, contenido remoto y subframes', async () => {
    const v = preparar();
    v.sesion.guardarSesion(12, 'juez');
    const subframe = evento();
    subframe.senderFrame = { ...subframe.senderFrame };
    const remoto = evento();
    remoto.senderFrame.url = 'https://example.test/Resultados.html';
    const ajeno = evento();
    ajeno.senderFrame.url = pathToFileURL(path.join(root, '..', 'otra-app', 'Resultados.html')).href;
    const invalido = evento();
    invalido.senderFrame.url = 'invalida';
    for (const e of [null, {}, { sender: {} }, evento('login.html'), evento('Administrador.html'), subframe, remoto, ajeno, invalido]) {
        denegado(await v.guardar(datos, e));
    }
    assert.equal(v.consultas.length, 0);
    const emergente = evento();
    emergente.senderFrame.url += '?emergente=1';
    assert.equal((await v.guardar(datos, emergente)).success, true);
});

test('cada solicitud consulta la sesión actual y no reutiliza el juez anterior', async () => {
    const v = preparar();
    const e = evento();
    v.sesion.guardarSesion(12, 'juez');
    assert.equal((await v.guardar(datos, e)).success, true);
    v.sesion.guardarSesion(20, 'admin');
    denegado(await v.guardar({ ...datos, nJuezID: 12 }, e));
    assert.equal((await v.guardar({ ...datos, nJuezID: 12 }, evento())).success, true);
    assert.equal(v.consultas.at(-1).params[0], 20);
    v.sesion.guardarSesion(30, 'user');
    denegado(await v.guardar(datos, e));
    v.sesion.cerrarSesion();
    denegado(await v.guardar(datos, e));
    assert.equal(v.consultas.length, 2);
});

test('datos inválidos enviados directamente por IPC no llegan a SQL', async () => {
    const v = preparar();
    v.sesion.guardarSesion(12, 'juez');
    const invalidos = [null, [], 'datos', {},
        ...['', ' ', 0, -1, '7abc', 1.5, {}, true, '9007199254740992'].map(nParejaID => ({ ...datos, nParejaID })),
        ...[undefined, null, NaN, Infinity, -1, 61, 1.5, '30', true].map(nPuntaje => ({ ...datos, nPuntaje })),
        ...[null, 123, {}, 'x'.repeat(256)].map(cComentario => ({ ...datos, cComentario }))];
    for (const entrada of invalidos) {
        const respuesta = await v.guardar(entrada);
        assert.equal(respuesta.success, false);
        assert.equal(respuesta.code, 'INVALID_DATA');
    }
    assert.equal(v.consultas.length, 0);
});

test('acepta puntajes límite y comentarios vacíos o de 255 caracteres', async () => {
    const v = preparar();
    v.sesion.guardarSesion(12, 'juez');
    for (const nPuntaje of [0, 60]) {
        for (const cComentario of ['', 'x'.repeat(255), undefined]) {
            assert.equal((await v.guardar({ nParejaID: ' 7 ', nPuntaje, cComentario })).success, true);
            assert.deepEqual(v.consultas.at(-1).params, [12, 7, nPuntaje, cComentario ?? '']);
        }
    }
});

test('un error SQL mantiene respuesta de error y no reintenta la evaluación', async () => {
    const v = preparar({ errorSQL: true });
    v.sesion.guardarSesion(12, 'juez');
    const respuesta = await v.guardar();
    assert.equal(respuesta.success, false);
    assert.match(respuesta.error, /Fallo SQL simulado/);
    assert.equal(v.consultas.length, 1);
});

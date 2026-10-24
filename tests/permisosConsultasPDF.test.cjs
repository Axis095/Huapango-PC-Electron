const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PassThrough, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function cargar(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), {
        module, __dirname: path.dirname(path.join(root, file)), console: { log() {}, error() {}, warn() {} },
        require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; }, ...extra
    }, { filename: file });
    return module.exports;
}
function evento(vista) {
    const frame = { url: pathToFileURL(path.join(root, 'Vistas', vista)).href };
    return { senderFrame: frame, sender: { mainFrame: frame } };
}
const gestion = ['BusquedaParejas.html', 'ModificarParejas.html'];
const registro = ['Registros.html', 'RegistroCategoriasEstilos.html', 'Parejas.html'];
const operaciones = [
    ['buscar-pareja-por-id', ['admin', 'user'], gestion, 7],
    ['buscar-todas-las-parejas', ['admin', 'user'], gestion],
    ['buscar-pareja-para-evaluacion', ['admin', 'juez'], ['Resultados.html'], 7],
    ['buscar-categoria-por-id', ['admin', 'user'], gestion, 7],
    ['buscar-estilo-por-id', ['admin', 'user'], gestion, 7],
    ['obtener-rol-usuario', ['admin'], ['Administrador.html'], 'Ana'],
    ['obtener-evaluaciones-por-pareja', ['admin', 'juez'], ['Resultados.html'], 7],
    ['generar-pdf-parejas', ['admin'], ['Registros.html']],
    ['generar-pdf-categorias', ['admin', 'user'], registro],
    ['generar-pdf-estilos', ['admin', 'user'], registro],
    ['generar-pdf-resultados', ['admin', 'juez'], ['Resultados.html']],
    ['generar-pdf-registros-generales', ['admin'], ['Administrador.html']]
];
const filasEvaluaciones = [
    { nEvaluacionID: 1, nParejaID: 7, nJuezID: 12, juez: 'Juez propio', cComentario: 'Comentario propio', nPuntaje: 30 },
    { nEvaluacionID: 2, nParejaID: 7, nJuezID: 99, juez: 'Juez ajeno', cComentario: 'Comentario ajeno', nPuntaje: 40 },
    { nEvaluacionID: 3, nParejaID: 8, nJuezID: 12, juez: 'Juez propio', cComentario: 'Otra pareja', nPuntaje: 50 }
];

// Ejecuta main, controladores y modelos reales. Simula solo Electron, SQL y PDF/disco.
function preparar(opciones = {}) {
    const consultas = [], dialogos = [], archivos = [], abiertos = [], handlers = new Map();
    const sesion = cargar('Modelos/sesionModel.js', {});
    const db = { async queryDatabase(sql, params = []) {
        params = Array.from(params);
        consultas.push({ sql, params });
        await opciones.alConsultar?.();
        if (opciones.errorSQL) throw new Error('Fallo SQL simulado');
        if (opciones.vacio) return [];
        if (/FROM t_evaluaciones/i.test(sql)) {
            let filas = filasEvaluaciones;
            if (/e.nParejaID = \?/.test(sql)) filas = filas.filter(f => f.nParejaID === params[0]);
            if (/e.nJuezID = \?/.test(sql)) filas = filas.filter(f => f.nJuezID === params.at(-1));
            return filas;
        }
        if (/SELECT rol/i.test(sql)) return [{ rol: 'user' }];
        return [{ nParejaID: 7, cNombre: 'Luis', cNombreM: 'Ana', cCategoriaNombre: 'Adultos', cEstiloNombre: 'Potosino' }];
    } };
    class PDF extends PassThrough {
        fontSize() { return this; }
        text(texto) { this.write(String(texto) + '\n'); return this; }
        moveDown() { return this; }
    }
    const pdfModel = cargar('Modelos/pdfModel.js', {
        '../db': db, pdfkit: PDF, 'node:stream/promises': { pipeline },
        fs: { createWriteStream(ruta) {
            const archivo = { ruta, texto: '' }; archivos.push(archivo);
            return new Writable({ write(chunk, enc, cb) { archivo.texto += chunk.toString(); cb(); } });
        } }
    });
    const electron = {
        dialog: { async showSaveDialog(opts) {
            dialogos.push(opts); await opciones.enDialogo?.();
            return opciones.cancelar ? { canceled: true } : { filePath: 'prueba.pdf' };
        } },
        shell: { async openPath(ruta) { abiertos.push(ruta); return ''; } },
        ipcMain: { handle(canal, fn) { handlers.set(canal, fn); }, on() {} },
        app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} }
    };
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    for (const tipo of ['pareja', 'categoria', 'estilo', 'admin', 'evaluaciones']) {
        const modelo = cargar(`Modelos/${tipo}Model.js`, {
            '../db': db, './imagenesModel': {}, './parejaModel': {},
            './contrasenaModel': require('../Modelos/contrasenaModel')
        });
        deps[`./Controladores/${tipo}Controller`] = cargar(`Controladores/${tipo}Controller.js`, {
            [`../Modelos/${tipo}Model`]: modelo, '../Modelos/sesionModel': sesion,
            'node:path': path, 'node:url': { fileURLToPath }
        });
    }
    deps['./Controladores/pdfController'] = cargar('Controladores/pdfController.js', {
        electron, '../Modelos/pdfModel': pdfModel, '../Modelos/sesionModel': sesion,
        'node:path': path, 'node:url': { fileURLToPath }
    });
    Object.assign(deps, { electron, path, url: { fileURLToPath }, './Modelos/sesionModel': sesion });
    const registrar = require('./helpers/mainConVentanas.cjs')(deps, { userRole: 'admin', userID: 99 });
    return { sesion, consultas, dialogos, archivos, abiertos, pdfModel,
        invoke: (canal, e, ...args) => { registrar(e); return handlers.get(canal)(e, ...args); } };
}
function denegado(r) {
    assert.equal(r.success, false); assert.equal(r.code, 'FORBIDDEN');
    assert.ok(r.error); assert.equal(r.error, r.message);
}
function sinEfectos(v) {
    assert.equal(v.consultas.length, 0); assert.equal(v.dialogos.length, 0);
    assert.equal(v.archivos.length, 0); assert.equal(v.abiertos.length, 0);
}

for (const rol of [null, 'guest', 'desconocido', 'Admin', 'user', 'juez', 'admin']) {
    test(`consultas/PDF: matriz de permisos para ${rol ?? 'sin sesión'}`, async () => {
        for (const [canal, roles, vistas, dato] of operaciones) {
            for (const vista of vistas) {
                const v = preparar();
                if (rol !== null) v.sesion.guardarSesion(12, rol);
                const e = evento(vista); e.senderFrame.url += '?emergente=1';
                const r = await v.invoke(canal, e, dato);
                if (!roles.includes(rol)) { denegado(r); sinEfectos(v); }
                else {
                    assert.equal(canal === 'obtener-rol-usuario' ? r : r.success, canal === 'obtener-rol-usuario' ? 'user' : true, canal);
                    assert.equal(v.consultas.length, 1);
                    if (canal.startsWith('generar-pdf')) {
                        assert.equal(v.dialogos.length, 1); assert.equal(v.archivos.length, 1);
                        assert.deepEqual(v.abiertos, ['prueba.pdf']);
                    } else assert.equal(v.dialogos.length, 0);
                }
            }
        }
    });
}

test('los doce canales rechazan emisores inválidos incluso con sesión admin', async () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'admin');
    for (const [canal, , vistas, dato] of operaciones) {
        const secundario = evento(vistas[0]); secundario.senderFrame = { ...secundario.senderFrame };
        const remoto = evento(vistas[0]); remoto.senderFrame.url = `https://example.test/${vistas[0]}`;
        const ajeno = evento(vistas[0]); ajeno.senderFrame.url = pathToFileURL(path.join(root, '..', 'otra-app', 'Vistas', vistas[0])).href;
        const invalido = evento(vistas[0]); invalido.senderFrame.url = 'URL inválida';
        for (const e of [null, {}, { sender: {} }, secundario, remoto, ajeno, invalido, evento('login.html')]) {
            denegado(await v.invoke(canal, e, dato));
        }
    }
    sinEfectos(v);
});

test('identidad incompleta o rol falsificado no habilitan consultas ni PDF', async () => {
    const v = preparar();
    for (const id of [null, undefined, 0, -1, '12', 1.5, Infinity]) {
        v.sesion.guardarSesion(id, 'admin');
        for (const [canal, , vistas, dato] of operaciones) denegado(await v.invoke(canal, evento(vistas[0]), dato));
    }
    v.sesion.guardarSesion(12, 'guest');
    for (const [canal, , vistas, dato] of operaciones) {
        denegado(await v.invoke(canal, { ...evento(vistas[0]), userRole: 'admin' }, dato, { rol: 'admin', userID: 99 }));
    }
    sinEfectos(v);
});

test('juez consulta y exporta solo lo propio; admin conserva el alcance completo', async () => {
    for (const rol of ['juez', 'admin']) {
        const v = preparar(); v.sesion.guardarSesion(12, rol);
        const r = await v.invoke('obtener-evaluaciones-por-pareja', evento('Resultados.html'), 7, 99, { userRole: 'admin' });
        assert.equal(r.success, true);
        assert.deepEqual(r.data.map(f => f.nEvaluacionID), rol === 'juez' ? [1] : [1, 2]);
        const consulta = v.consultas[0];
        assert.deepEqual(consulta.params, rol === 'juez' ? [7, 12] : [7]);
        if (rol === 'juez') assert.match(consulta.sql, /AND e.nJuezID = \?/);
        else assert.doesNotMatch(consulta.sql, /e.nJuezID = \?/);
        const pdf = await v.invoke('generar-pdf-resultados', evento('Resultados.html'), 99, { rol: 'admin', nJuezID: 99 });
        assert.equal(pdf.success, true);
        assert.deepEqual(v.consultas[1].params, rol === 'juez' ? [12] : []);
        assert.match(v.archivos[0].texto, /Comentario propio/);
        assert.match(v.archivos[0].texto, /Otra pareja/);
        if (rol === 'juez') {
            assert.match(v.consultas[1].sql, /WHERE e.nJuezID = \?/);
            assert.match(v.archivos[0].texto, /Mis Evaluaciones/);
            assert.doesNotMatch(v.archivos[0].texto, /Comentario ajeno|Juez ajeno/);
        } else assert.match(v.archivos[0].texto, /Comentario ajeno/);
    }
});

test('el juez sin evaluaciones no recibe las de otro juez, tampoco por PDF', async () => {
    const v = preparar(); v.sesion.guardarSesion(55, 'juez');
    const r = await v.invoke('obtener-evaluaciones-por-pareja', evento('Resultados.html'), 7);
    assert.equal(r.success, true); assert.equal(r.data.length, 0);
    const pdf = await v.invoke('generar-pdf-resultados', evento('Resultados.html'));
    assert.equal(pdf.success, false); assert.match(pdf.error, /No se encontraron/);
    assert.equal(v.archivos.length, 0); assert.equal(v.abiertos.length, 0);
});

test('cambio de identidad y cierre de sesión se aplican a la siguiente solicitud', async () => {
    const v = preparar();
    for (const id of [12, 99]) {
        v.sesion.guardarSesion(id, 'juez');
        const e = evento('Resultados.html'); // Ventana nueva para la sesión nueva.
        const r = await v.invoke('obtener-evaluaciones-por-pareja', e, 7);
        assert.ok(r.data.every(f => f.nJuezID === id));
        await v.invoke('generar-pdf-resultados', e);
        assert.deepEqual(v.consultas.at(-1).params, [id]);
    }
    const total = v.consultas.length;
    v.sesion.cerrarSesion();
    for (const [canal, , vistas, dato] of operaciones) denegado(await v.invoke(canal, evento(vistas[0]), dato));
    assert.equal(v.consultas.length, total);
});

for (const momento of ['enDialogo', 'alConsultar']) {
    test(`PDF revalida después de ${momento}: no crea archivos al cambiar sesión u origen`, async () => {
        for (const [canal, , vistas] of operaciones.filter(o => o[0].startsWith('generar-pdf'))) {
            for (const cambio of ['salir', 'otra-cuenta', 'otro-rol', 'otra-vista']) {
                const e = evento(vistas[0]);
                const v = preparar({ [momento]: () => {
                    if (cambio === 'salir') v.sesion.cerrarSesion();
                    if (cambio === 'otra-cuenta') v.sesion.guardarSesion(99, 'admin');
                    if (cambio === 'otro-rol') v.sesion.guardarSesion(12, 'user');
                    if (cambio === 'otra-vista') e.senderFrame.url = evento('login.html').senderFrame.url;
                } });
                v.sesion.guardarSesion(12, 'admin');
                denegado(await v.invoke(canal, e));
                assert.equal(v.dialogos.length, 1);
                assert.equal(v.consultas.length, momento === 'enDialogo' ? 0 : 1);
                assert.equal(v.archivos.length, 0); assert.equal(v.abiertos.length, 0);
            }
        }
    });
}

test('cancelación y errores SQL no crean ni abren PDF', async () => {
    for (const opcion of ['cancelar', 'errorSQL']) {
        for (const [canal, , vistas] of operaciones.filter(o => o[0].startsWith('generar-pdf'))) {
            const v = preparar({ [opcion]: true }); v.sesion.guardarSesion(12, 'admin');
            assert.equal((await v.invoke(canal, evento(vistas[0]))).success, false);
            assert.equal(v.consultas.length, opcion === 'cancelar' ? 0 : 1);
            assert.equal(v.archivos.length, 0); assert.equal(v.abiertos.length, 0);
        }
    }
});

test('consulta de evaluaciones valida ID y modelos no aceptan un alcance ausente', async () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'juez');
    for (const id of [null, {}, 0, -1, '7 OR 1=1', '7abc', 1.5]) {
        assert.equal((await v.invoke('obtener-evaluaciones-por-pareja', evento('Resultados.html'), id)).code, 'INVALID_ID');
    }
    const modelo = cargar('Modelos/evaluacionesModel.js', { '../db': { queryDatabase() { assert.fail('No consultar'); } } });
    for (const id of [undefined, {}, 0, '12', -1]) {
        await assert.rejects(v.pdfModel.generarPDFResultados('prueba.pdf', id), /alcance válido/);
        await assert.rejects(modelo.obtenerEvaluacionesPorPareja(7, id), /alcance válido/);
    }
    sinEfectos(v);
});

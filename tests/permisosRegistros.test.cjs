const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function cargar(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), {
        module, __dirname: path.dirname(path.join(root, file)),
        console: { log() {}, warn() {}, error() {} },
        require(name) {
            assert.ok(Object.hasOwn(deps, name), `Dependencia inesperada: ${name}`);
            return deps[name];
        }, ...extra
    }, { filename: file });
    return module.exports;
}

function evento(vista) {
    const frame = { url: pathToFileURL(path.join(root, 'Vistas', vista)).href };
    return { senderFrame: frame, sender: { mainFrame: frame } };
}

const pareja = { versionEdicion: 'a'.repeat(64), nParejaID: '7', cNombreMasculino: 'Luis', cApellidoMasculino: 'López',
    cEmailMasculino: 'luis@example.test', nTelefonoMasculino: '1234567890', dNacimientoMasculino: '2000-01-01',
    cNombreFemenino: 'Ana', cApellidoFemenino: 'Pérez', cEmailFemenino: 'ana@example.test',
    nTelefonoFemenino: '1234567890', dNacimientoFemenino: '2000-01-01',
    sexoMasculino: 'M', sexoFemenino: 'F', oFotoMasculino: null, oFotoFemenino: null };
const categoria = { nParejaID: 7, nIDCategoria: 2, cCategoriaNombre: 'Adultos',
    cPequenos: 0, cInfantil: 0, cJuvenil: 0, cAdulto: 1, cGrande: 0 };
const estilo = { nParejaID: 7, nEstiloID: 3, cEstiloNombre: 'Potosino',
    cPotosino: 1, cTamaulipeco: 0, cPoblano: 0, cQueretano: 0, cVeracruzano: 0, cHidalguense: 0 };
const vistasClasificacion = ['Registros.html', 'RegistroCategoriasEstilos.html', 'Parejas.html'];
const operaciones = [
    ['registrar-pareja', pareja, ['Registros.html'], /INSERT INTO T_Participantes/i],
    ['actualizar-pareja-completa', pareja, ['BusquedaParejas.html', 'ModificarParejas.html'], /UPDATE T_Participantes/i],
    ['registrar-categoria', categoria, vistasClasificacion, /INSERT INTO t_categorias/i],
    ['actualizar-categoria', categoria, vistasClasificacion, /UPDATE t_categorias/i],
    ['registrar-estilo', estilo, vistasClasificacion, /INSERT INTO t_estilos/i],
    ['actualizar-estilo', { id: 3, datos: estilo }, vistasClasificacion, /UPDATE t_estilos/i],
    ['eliminar-categoria', 2, vistasClasificacion, /DELETE FROM t_categorias/i],
    ['eliminar-estilo', 3, vistasClasificacion, /DELETE FROM t_estilos/i]
];

// main, sesión, controladores y modelos reales; se simulan Electron, MySQL y fotos.
function preparar(opciones = {}) {
    const consultas = [], fotos = [], transacciones = [], handlers = new Map();
    const sesion = cargar('Modelos/sesionModel.js', {});
    const db = {
        async queryDatabase(sql, params) {
            consultas.push({ sql, params: Array.from(params || []) });
            if (opciones.errorSQL) throw new Error('Error SQL simulado');
            if (/SELECT COUNT/i.test(sql)) return [{ total: opciones.duplicado ? 1 : 0 }];
            if (/SELECT/i.test(sql)) return opciones.noExiste ? [] : [{ nParejaID: 7, oFoto: null, IFotoM: null, versionEdicion: 'a'.repeat(64) }];
            return { insertId: 9, affectedRows: opciones.noExiste ? 0 : 1, changedRows: 1 };
        },
        async withTransaction(tablas, fn) {
            transacciones.push(Array.from(tablas));
            return fn(db.queryDatabase);
        }
    };
    const imagenes = {
        async conFotos(datos, fn) { fotos.push(datos); return fn(datos); },
        async limpiarFotos() { assert.fail('Estas operaciones no deben limpiar fotos directamente'); }
    };
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    for (const tipo of ['pareja', 'categoria', 'estilo']) {
        const modelo = cargar(`Modelos/${tipo}Model.js`, { '../db': db, './imagenesModel': imagenes });
        deps[`./Controladores/${tipo}Controller`] = cargar(`Controladores/${tipo}Controller.js`, {
            [`../Modelos/${tipo}Model`]: modelo
        });
    }
    deps.path = path;
    deps.url = { fileURLToPath };
    deps['./Modelos/sesionModel'] = sesion;
    deps.electron = {
        ipcMain: { handle(name, fn) { handlers.set(name, fn); }, on() {} },
        app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} }
    };
    const registrar = require('./helpers/mainConVentanas.cjs')(deps, { userRole: 'admin' });
    return { sesion, consultas, fotos, transacciones,
        invoke: (canal, event, ...args) => { registrar(event); return handlers.get(canal)(event, ...args); } };
}

function denegado(respuesta) {
    assert.equal(respuesta.success, false);
    assert.equal(respuesta.code, 'FORBIDDEN');
    assert.match(respuesta.error, /permisos|autorizada/);
    assert.equal(respuesta.message, respuesta.error);
}

function sinEfectos(v) {
    assert.equal(v.consultas.length, 0);
    assert.equal(v.fotos.length, 0);
    assert.equal(v.transacciones.length, 0);
}

for (const rol of [null, 'juez', 'guest', 'desconocido', 'Admin', 'usuario']) {
    test(`registros IPC: ${rol ?? 'sin sesión'} no consulta SQL ni procesa fotos`, async () => {
        const v = preparar();
        if (rol !== null) v.sesion.guardarSesion(1, rol);
        for (const [canal, datos, vistas] of operaciones) {
            denegado(await v.invoke(canal, evento(vistas[0]), datos));
            // Ni siquiera un payload inválido debe alcanzar el controlador.
            denegado(await v.invoke(canal, evento(vistas[0]), null));
        }
        sinEfectos(v);
    });
}

for (const rol of ['user', 'admin']) {
    test(`${rol} registra y edita desde todas las vistas permitidas; solo admin elimina`, async () => {
        for (const [canal, datos, vistas, sql] of operaciones) {
            for (const vista of vistas) {
                const v = preparar();
                v.sesion.guardarSesion(1, rol);
                const e = evento(vista);
                e.senderFrame.url += '?emergente=1';
                const respuesta = await v.invoke(canal, e, datos);
                if (rol === 'user' && canal.startsWith('eliminar-')) {
                    denegado(respuesta);
                    sinEfectos(v);
                } else {
                    assert.equal(respuesta.success, true, `${canal}: ${JSON.stringify(respuesta)}`);
                    assert.ok(v.consultas.some(c => sql.test(c.sql)), `No se ejecutó ${sql}`);
                    assert.equal(v.consultas.filter(c => /INSERT|UPDATE\s+\w|DELETE/i.test(c.sql)).length, 1);
                    if (canal === 'actualizar-estilo') assert.deepEqual(v.consultas.at(-1).params, [1, 0, 0, 0, 0, 0, 3]);
                    if (canal.startsWith('eliminar-')) assert.deepEqual(v.consultas.at(-1).params, [datos]);
                    if (canal.includes('pareja')) {
                        assert.equal(v.fotos.length, 1);
                        assert.equal(v.transacciones.length, 1);
                    }
                }
            }
        }
    });
}

test('los ocho canales rechazan frames secundarios, archivos ajenos y vistas no autorizadas', async () => {
    const v = preparar();
    v.sesion.guardarSesion(1, 'admin');
    for (const [canal, datos, vistas] of operaciones) {
        const secundario = evento(vistas[0]);
        secundario.senderFrame = { ...secundario.senderFrame };
        const remoto = evento(vistas[0]);
        remoto.senderFrame.url = `https://example.test/Vistas/${vistas[0]}`;
        const ajeno = evento(vistas[0]);
        ajeno.senderFrame.url = pathToFileURL(path.join(root, '..', 'otra-app', 'Vistas', vistas[0])).href;
        const invalido = evento(vistas[0]);
        invalido.senderFrame.url = 'no-es-url';
        const otraVista = evento(canal === 'registrar-pareja' ? 'BusquedaParejas.html' : 'login.html');
        for (const e of [null, {}, { sender: {} }, secundario, remoto, ajeno, invalido, otraVista, evento('Resultados.html')]) {
            denegado(await v.invoke(canal, e, datos));
        }
    }
    sinEfectos(v);
});

test('IDs de sesión inválidos y roles falsificados en el payload nunca autorizan', async () => {
    const v = preparar();
    for (const rol of ['admin', 'user']) {
        for (const id of [undefined, null, 0, -1, '1', 1.5, NaN, Infinity]) {
            v.sesion.guardarSesion(id, rol);
            for (const [canal, datos, vistas] of operaciones) denegado(await v.invoke(canal, evento(vistas[0]), datos));
        }
    }
    v.sesion.guardarSesion(2, 'juez');
    for (const [canal, datos, vistas] of operaciones) {
        denegado(await v.invoke(canal, { ...evento(vistas[0]), userRole: 'admin' },
            { ...datos, rol: 'admin', userRole: 'admin', userID: 1 }, 'admin'));
    }
    v.sesion.guardarSesion(2, 'user');
    for (const [canal, datos, vistas] of operaciones.slice(6)) {
        denegado(await v.invoke(canal, evento(vistas[0]), datos, { userRole: 'admin' }));
    }
    sinEfectos(v);
});

test('cambio de rol y cierre de sesión revocan permisos en la siguiente solicitud', async () => {
    for (const [canal, datos, vistas] of operaciones) {
        const v = preparar();
        const e = evento(vistas[0]);
        v.sesion.guardarSesion(1, 'admin');
        assert.equal((await v.invoke(canal, e, datos)).success, true);
        const conteos = [v.consultas.length, v.fotos.length, v.transacciones.length];
        v.sesion.guardarSesion(2, canal.startsWith('eliminar-') ? 'user' : 'juez');
        denegado(await v.invoke(canal, e, datos));
        v.sesion.cerrarSesion();
        denegado(await v.invoke(canal, e, datos));
        assert.deepEqual([v.consultas.length, v.fotos.length, v.transacciones.length], conteos);
    }
});

test('se conservan validaciones, duplicados, pareja ausente y errores SQL autorizados', async () => {
    const v = preparar();
    v.sesion.guardarSesion(1, 'user');
    assert.equal((await v.invoke('registrar-pareja', evento('Registros.html'), { ...pareja, nParejaID: 0 })).code, 'INVALID_ID');
    assert.equal((await v.invoke('actualizar-pareja-completa', evento('BusquedaParejas.html'), { ...pareja, cNombreMasculino: '' })).code, 'INVALID_DATA');
    sinEfectos(v);
    const ausente = preparar({ noExiste: true });
    ausente.sesion.guardarSesion(1, 'user');
    assert.equal((await ausente.invoke('actualizar-pareja-completa', evento('BusquedaParejas.html'), pareja)).code, 'NOT_FOUND');
    assert.equal(ausente.consultas.length, 1);
    const duplicado = preparar({ duplicado: true });
    duplicado.sesion.guardarSesion(1, 'user');
    for (const [canal, datos] of [operaciones[2], operaciones[4]]) {
        const respuesta = await duplicado.invoke(canal, evento('Registros.html'), datos);
        assert.equal(respuesta.success, false);
        assert.match(respuesta.error, /ya está registrada/);
    }
    assert.ok(duplicado.consultas.every(c => /^SELECT/i.test(c.sql)));
    const fallo = preparar({ errorSQL: true });
    fallo.sesion.guardarSesion(1, 'admin');
    for (const [canal, datos, vistas] of operaciones) {
        const respuesta = await fallo.invoke(canal, evento(vistas[0]), datos);
        assert.equal(respuesta.success, false);
        assert.match(respuesta.error, /Error SQL simulado/);
    }
});

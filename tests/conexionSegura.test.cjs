const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const operaciones = require('../Servicios/operaciones');
const diferido = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
function cargar(file, deps) {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { module, console, require: n => deps[n] });
    return module.exports;
}
test('cambio de conexión espera toda la operación, incluyendo limpieza de archivos después de SQL', async () => {
    const fin = diferido(); let guardado = false;
    const pendiente = operaciones.ejecutarOperacion(async () => { guardado = true; await fin.promise; });
    assert.equal(guardado, true);
    await assert.rejects(operaciones.ejecutarCambioConfiguracion(() => assert.fail('No cambiar con archivos pendientes')), { code: 'CONFIGURATION_BUSY' });
    fin.resolve(); await pendiente;
    assert.equal(await operaciones.ejecutarCambioConfiguracion(() => 1), 1);
});
test('reserva de cambio solo es reentrante para la misma cadena, y se libera ante error', async () => {
    const fin = diferido();
    const pendiente = operaciones.ejecutarCambioConfiguracion(async () => {
        assert.equal(await operaciones.ejecutarCambioConfiguracion(() => 2), 2);
        await fin.promise; throw Error('Fallo simulado');
    });
    assert.throws(() => operaciones.ejecutarOperacion(() => {}), { code: 'CONFIGURATION_BUSY' });
    await assert.rejects(operaciones.ejecutarCambioConfiguracion(() => {}), { code: 'CONFIGURATION_BUSY' });
    fin.resolve(); await assert.rejects(pendiente, /Fallo simulado/);
    assert.equal(operaciones.ejecutarOperacion(() => 3), 3);
});
test('configuración exige TLS remoto, verifica CA y no permite eludir identidad con IP', () => {
    const modelo = cargar('Modelos/configModel.js', { fs, path, crypto: require('node:crypto'), 'node:net': require('node:net'),
        electron: { app: { getPath: () => __dirname } } });
    const config = { host: 'localhost', user: 'app', database: 'pruebas' };
    assert.equal(modelo.normalizarConfiguracion(config).tls, false);
    assert.throws(() => modelo.normalizarConfiguracion({ ...config, host: 'servidor.interno' }), /TLS/);
    assert.throws(() => modelo.normalizarConfiguracion({ ...config, host: '192.168.1.2', tls: true }), /DNS/);
    assert.throws(() => modelo.normalizarConfiguracion({ ...config, tls: true, sslCa: 'certificado-invalido' }), /PEM/);
    assert.equal(modelo.normalizarConfiguracion({ ...config, host: 'servidor.interno', tls: true }).tls, true);
});
test('pool limita conexiones y cola; conexión perdida no se libera ni reintenta', async () => {
    let opciones, ejecuciones = 0, cerradas = 0;
    const db = cargar('db.js', { './Servicios/operaciones': operaciones, 'node:timers': require('node:timers'),
        './Modelos/configModel': { cargarConfiguracion: () => ({ host: 'db.interno', tls: true, sslCa: 'CA' }), normalizarConfiguracion: x => x },
        'mysql2/promise': {
            async createConnection(opts) { assert.equal(opts.ssl.verifyIdentity, true); assert.equal(opts.ssl.rejectUnauthorized, true); return { destroy() {} }; },
            createPool(opts) { opciones = opts; return { async getConnection() { return {
                async execute() { ejecuciones++; throw Object.assign(Error('Conexión perdida'), { code: 'ECONNRESET' }); },
                destroy() { cerradas++; }, release() { assert.fail('No liberar conexión perdida'); }
            }; } }; }
        } });
    await db.inicializarBaseDatos();
    assert.equal(opciones.connectionLimit, 10); assert.equal(opciones.queueLimit, 20);
    await assert.rejects(db.queryDatabase('INSERT'), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    assert.equal(ejecuciones, 1); assert.equal(cerradas, 1);
});
test('consulta que vence descarta conexión y libera reserva, sin reintento automático', async () => {
    const timers = new Map(); let key = 0, destruida = 0;
    const db = cargar('db.js', { './Servicios/operaciones': operaciones,
        'node:timers': { setTimeout(fn, ms) { const id = ++key; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } },
        './Modelos/configModel': { cargarConfiguracion: () => ({}), normalizarConfiguracion: x => x },
        'mysql2/promise': { async createConnection() { return { destroy() {} }; }, createPool() { return { async getConnection() { return {
            execute: () => new Promise(() => {}), destroy() { destruida++; }, release() { assert.fail('No liberar'); }
        }; } }; } } });
    await db.inicializarBaseDatos();
    const pendiente = db.queryDatabase('INSERT');
    const rechazo = assert.rejects(pendiente, { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    await new Promise(resolve => setImmediate(resolve));
    [...timers.values()].find(t => t.ms === 30000).fn();
    await rechazo; assert.equal(destruida, 1);
    assert.equal(await operaciones.ejecutarCambioConfiguracion(() => true), true);
});

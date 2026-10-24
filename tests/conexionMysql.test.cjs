const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const pendiente = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

// Reloj virtual: se prueban los límites de producción sin esperar segundos reales.
function preparar(opciones = {}) {
    let ahora = 0, secuencia = 0, ocupadas = 0;
    const timers = new Map(), conexiones = [], configPools = [], consultas = [];
    const eventos = { begin: 0, commit: 0, rollback: 0, pruebaDestruida: 0 };
    const prueba = { destroy() { eventos.pruebaDestruida++; } };
    function nueva() {
        const c = { liberada: 0, destruida: 0,
            execute(sql, params) {
                consultas.push({ sql, params });
                if (sql.includes('information_schema.TABLES') && !opciones.metadata) return Promise.resolve([[{ nombre: 't_participantes', motor: 'InnoDB' }]]);
                return opciones.execute ? opciones.execute(sql, params) : Promise.resolve([[{ ok: 1 }]]);
            },
            beginTransaction() { eventos.begin++; return opciones.begin?.() || Promise.resolve(); },
            commit() { eventos.commit++; return opciones.commit?.() || Promise.resolve(); },
            rollback() { eventos.rollback++; return opciones.rollback?.() || Promise.resolve(); },
            release() { this.liberada++; ocupadas--; },
            destroy() { this.destruida++; ocupadas--; }
        };
        conexiones.push(c); return c;
    }
    const driver = {
        createConnection: () => opciones.connect?.() || Promise.resolve(prueba),
        createPool(config) {
            configPools.push(config);
            return {
                getConnection() {
                    if (opciones.acquire) return opciones.acquire();
                    if (ocupadas >= config.connectionLimit && !config.waitForConnections) return Promise.reject(Error('No connections available.'));
                    ocupadas++; return Promise.resolve(nueva());
                },
                end: () => Promise.resolve()
            };
        }
    };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8'), {
        module, console: { error() {} },
        setTimeout(fn, ms) { const id = ++secuencia; timers.set(id, { fn, vence: ahora + ms }); return id; },
        clearTimeout(id) { timers.delete(id); },
        require(n) {
            if (n === 'mysql2/promise') return driver;
            assert.equal(n, './Modelos/configModel');
            return { cargarConfiguracion: () => ({}), normalizarConfiguracion: c => c };
        }
    }, { filename: 'db.js' });
    return { db: module.exports, opciones, conexiones, consultas, eventos, configPools, timers, prueba,
        async avanzar(ms) {
            await flush(); const fin = ahora + ms;
            while (true) {
                const siguiente = [...timers.entries()].filter(([, t]) => t.vence <= fin).sort((a, b) => a[1].vence - b[1].vence)[0];
                if (!siguiente) break;
                ahora = siguiente[1].vence; timers.delete(siguiente[0]); siguiente[1].fn(); await flush();
            }
            ahora = fin; await flush();
        }
    };
}

test('conexión inicial sin respuesta vence y destruye una conexión que llegue tarde', async () => {
    const p = pendiente(), v = preparar({ connect: () => p.promise });
    const comprobacion = assert.rejects(v.db.inicializarBaseDatos(), { code: 'ETIMEDOUT' });
    await v.avanzar(5000); await comprobacion;
    assert.equal(v.configPools.length, 0);
    p.resolve(v.prueba); await flush();
    assert.equal(v.eventos.pruebaDestruida, 1); assert.equal(v.timers.size, 0);
});

test('adquisición vencida no ejecuta SQL ni lo ejecutará cuando llegue una conexión', async () => {
    const p = pendiente(), v = preparar({ acquire: () => p.promise }); await v.db.inicializarBaseDatos();
    const comprobacion = assert.rejects(v.db.queryDatabase('INSERT INTO prueba VALUES (?)', [1]), { code: 'DB_ACQUIRE_TIMEOUT' });
    await v.avanzar(5000); await comprobacion;
    let destruida = 0;
    p.resolve({ destroy() { destruida++; }, execute() { assert.fail('No ejecutar después del timeout'); } }); await flush();
    assert.equal(destruida, 1); assert.equal(v.consultas.length, 0);
});

test('pool lleno rechaza sin encolar; una solicitud posterior funciona al liberar conexiones', async () => {
    const p = pendiente(), v = preparar({ execute: () => p.promise }); await v.db.inicializarBaseDatos();
    const activas = Array.from({ length: 10 }, () => v.db.queryDatabase('SELECT 1'));
    await flush();
    await assert.rejects(v.db.queryDatabase('INSERT INTO prueba VALUES (1)'), { code: 'DB_BUSY' });
    assert.equal(v.consultas.length, 10);
    p.resolve([[{ ok: 1 }]]); await Promise.all(activas);
    await v.db.queryDatabase('SELECT 1');
    assert.equal(v.consultas.length, 11); assert.equal(v.timers.size, 0);
});

test('consulta de lectura vencida descarta la conexión; una respuesta tardía no la devuelve al pool', async () => {
    const p = pendiente(), v = preparar({ execute: () => p.promise }); await v.db.inicializarBaseDatos();
    const comprobacion = assert.rejects(v.db.queryDatabase('SELECT 1'), { code: 'DB_QUERY_TIMEOUT' });
    await v.avanzar(15000); await comprobacion;
    p.resolve([[{ ok: 1 }]]); await flush();
    assert.equal(v.conexiones[0].destruida, 1); assert.equal(v.conexiones[0].liberada, 0);
    delete v.opciones.execute;
    assert.equal((await v.db.queryDatabase('SELECT 1'))[0].ok, 1);
    assert.equal(v.conexiones.length, 2); assert.equal(v.timers.size, 0);
});

for (const sql of ['INSERT INTO t_evaluaciones VALUES (1)', 'UPDATE prueba SET dato=1', 'DELETE FROM prueba']) {
    test('respuesta perdida en escritura no se reintenta: ' + sql.split(' ')[0], async () => {
        const p = pendiente(), v = preparar({ execute: () => p.promise }); await v.db.inicializarBaseDatos();
        const comprobacion = assert.rejects(v.db.queryDatabase(sql), error => {
            assert.equal(error.code, 'WRITE_OUTCOME_UNKNOWN'); assert.match(error.message, /podría haberse guardado/); return true;
        });
        await v.avanzar(15000); await comprobacion;
        p.resolve([{ affectedRows: 1 }]); await flush();
        assert.equal(v.consultas.length, 1); assert.equal(v.conexiones[0].destruida, 1);
    });
}

test('errores de red distinguen lectura y escritura; un error SQL normal conserva su código', async () => {
    const v = preparar(); await v.db.inicializarBaseDatos();
    v.opciones.execute = () => Promise.reject(Object.assign(Error('socket privado'), { code: 'ECONNRESET' }));
    await assert.rejects(v.db.queryDatabase('SELECT 1'), { code: 'DB_CONNECTION_LOST' });
    await assert.rejects(v.db.queryDatabase('INSERT INTO prueba VALUES (1)'), { code: 'WRITE_OUTCOME_UNKNOWN' });
    v.opciones.execute = () => Promise.reject(Object.assign(Error('Duplicado'), { code: 'ER_DUP_ENTRY' }));
    await assert.rejects(v.db.queryDatabase('INSERT INTO prueba VALUES (1)'), { code: 'ER_DUP_ENTRY' });
    assert.equal(v.conexiones[2].liberada, 1); assert.equal(v.conexiones[2].destruida, 0);
});

test('BEGIN vencido no ejecuta escrituras ni COMMIT', async () => {
    const p = pendiente(), v = preparar({ begin: () => p.promise }); await v.db.inicializarBaseDatos();
    const comprobacion = assert.rejects(v.db.withTransaction(['T_Participantes'], () => assert.fail('No operar')), { code: 'DB_BEGIN_TIMEOUT' });
    await v.avanzar(5000); await comprobacion; p.resolve(); await flush();
    assert.equal(v.consultas.length, 0); assert.equal(v.eventos.commit, 0);
    assert.equal(v.conexiones[0].destruida, 1);
});

test('consulta transaccional vencida conserva resultado incierto y nunca confirma tarde', async () => {
    const p = pendiente(), v = preparar({ execute: () => p.promise }); await v.db.inicializarBaseDatos();
    const comprobacion = assert.rejects(v.db.withTransaction(['T_Participantes'], q => q('UPDATE prueba SET dato=1')), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    await v.avanzar(15000); await comprobacion;
    p.resolve([{ affectedRows: 1 }]); await flush();
    assert.equal(v.eventos.commit, 0); assert.equal(v.eventos.rollback, 0);
    assert.equal(v.conexiones[0].destruida, 1);
});

test('límite global corta un callback detenido y bloquea sus consultas posteriores', async () => {
    const p = pendiente(), v = preparar(); await v.db.inicializarBaseDatos(); let consultar;
    const comprobacion = assert.rejects(v.db.withTransaction(['T_Participantes'], async q => { consultar = q; await p.promise; await q('UPDATE prueba SET dato=1'); }), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    await v.avanzar(30000); await comprobacion;
    await assert.rejects(consultar('SELECT 1'), /ya terminó/);
    p.resolve(); await flush();
    assert.equal(v.consultas.length, 1); assert.equal(v.eventos.commit, 0);
    assert.equal(v.conexiones[0].destruida, 1); assert.equal(v.timers.size, 0);
});

for (const fase of ['commit', 'rollback']) test(fase + ' detenido descarta la conexión y nunca anuncia éxito', async () => {
    const p = pendiente(), v = preparar({ [fase]: () => p.promise }); await v.db.inicializarBaseDatos();
    const comprobacion = assert.rejects(v.db.withTransaction(['T_Participantes'], async () => {
        if (fase === 'rollback') throw Object.assign(Error('Duplicado'), { code: 'ER_DUP_ENTRY' });
        return { success: true };
    }), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    await v.avanzar(5000); await comprobacion;
    p.resolve(); await flush();
    assert.equal(v.eventos[fase], 1); assert.equal(v.conexiones[0].destruida, 1);
    assert.equal(v.conexiones[0].liberada, 0); assert.equal(v.timers.size, 0);
});

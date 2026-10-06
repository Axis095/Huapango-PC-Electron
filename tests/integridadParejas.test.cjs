const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const quiet = { log() {}, error() {}, warn() {} };
function cargar(file, deps) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), { module, console: quiet, require(name) {
        assert.ok(name in deps, `Dependencia inesperada: ${name}`); return deps[name];
    } });
    return module.exports;
}
const columnas = ['cNombre', 'cApellido', 'cEmail', 'nTelefono', 'dNacimiento', 'oFoto',
    'cNombreM', 'cApellidoM', 'cEmailM', 'nTelefonoM', 'dNacimientoM', 'IFotoM'];
const datos = { nParejaID: '7', cNombreMasculino: 'Ana', cApellidoMasculino: 'Prueba',
    cEmailMasculino: 'a@example.test', nTelefonoMasculino: '5512345678', dNacimientoMasculino: '2000-01-01',
    cNombreFemenino: 'Luis', cApellidoFemenino: 'Prueba', cEmailFemenino: 'b@example.test',
    nTelefonoFemenino: '5598765432', dNacimientoFemenino: '2000-02-02', oFotoMasculino: null, oFotoFemenino: null };
const tablas = ['t_participantes', 't_evaluaciones', 't_categorias', 't_estilos'];
function inicial() {
    const fila = { nParejaID: 7 };
    columnas.forEach((columna, i) => { fila[columna] = ['Ana', 'Prueba', 'a@example.test', '5512345678', '2000-01-01', 'foto-a.jpg',
        'Luis', 'Prueba', 'b@example.test', '5598765432', '2000-02-02', 'foto-b.jpg'][i]; });
    return Object.fromEntries(tablas.map(tabla => [tabla, tabla === 't_participantes' ? [fila, { ...fila, nParejaID: 9 }] : [{ nParejaID: 7 }, { nParejaID: 9 }]]));
}

// Driver simulado con estado confirmado y estado de transacción separados.
// Se cargan el db, modelos y controladores reales; nunca se conecta con MySQL.
async function preparar(opciones = {}) {
    let confirmado = inicial(); let trabajo = null; let adquisiciones = 0;
    const historial = [], consultas = [];
    const fallo = code => Object.assign(new Error(`Fallo simulado: ${code}`), { code });
    const connection = {
        async beginTransaction() {
            historial.push('begin'); if (opciones.begin) throw fallo('BEGIN_ERROR');
            trabajo = structuredClone(confirmado);
        },
        async execute(sql, params) {
            assert.ok(trabajo, 'Las consultas deben ejecutarse dentro de la transacción');
            const normalizado = sql.trim().replace(/\s+/g, ' ');
            consultas.push({ sql: normalizado, params: Array.from(params) });
            if (normalizado.includes('information_schema.TABLES')) {
                if (opciones.metadata) throw fallo('ACCESS_DENIED');
                return [params.filter(nombre => nombre !== opciones.faltante).map(nombre => ({ nombre, motor: nombre === opciones.noTransaccional ? 'MyISAM' : 'InnoDB' }))];
            }
            if (normalizado.startsWith('SELECT nParejaID')) {
                assert.match(normalizado, /FOR UPDATE$/);
                return [trabajo.t_participantes.filter(f => f.nParejaID === params[0]).map(f => ({ nParejaID: f.nParejaID }))];
            }
            if (normalizado.startsWith('UPDATE ')) {
                assert.equal((normalizado.match(/\?/g) || []).length, params.length);
                assert.match(normalizado, /cNombre = .*cNombreM = /);
                if (opciones.update) throw fallo('ER_DUP_ENTRY');
                const fila = trabajo.t_participantes.find(f => f.nParejaID === params[12]);
                if (!fila) return [{ affectedRows: 0, changedRows: 0 }];
                const anterior = JSON.stringify(fila);
                columnas.forEach((columna, i) => { if (params[i] !== null) fila[columna] = params[i]; });
                return [{ affectedRows: 1, changedRows: anterior === JSON.stringify(fila) ? 0 : 1 }];
            }
            const tabla = /^DELETE FROM (\w+) WHERE nParejaID = \?$/.exec(normalizado)?.[1].toLowerCase();
            assert.ok(tablas.includes(tabla), `SQL inesperado: ${normalizado}`);
            if (opciones.delete === tabla) throw fallo('DELETE_ERROR');
            const antes = trabajo[tabla].length;
            trabajo[tabla] = trabajo[tabla].filter(f => f.nParejaID !== params[0]);
            return [{ affectedRows: opciones.ceroFinal && tabla === 't_participantes' ? 0 : antes - trabajo[tabla].length }];
        },
        async commit() {
            historial.push('commit');
            if (opciones.commit === 'antes') throw fallo('ECONNRESET');
            confirmado = trabajo; trabajo = null;
            if (opciones.commit === 'despues') throw fallo('ECONNRESET');
        },
        async rollback() {
            historial.push('rollback'); if (opciones.rollback) throw fallo('ROLLBACK_ERROR'); trabajo = null;
        },
        release() { historial.push('release'); assert.equal(trabajo, null, 'No devolver transacciones abiertas al pool'); },
        destroy() { historial.push('destroy'); trabajo = null; }
    };
    const db = cargar('db.js', {
        'mysql2/promise': {
            async createConnection() { return { destroy() {} }; },
            createPool() { return { async getConnection() {
                adquisiciones++; if (opciones.acquire) throw fallo('POOL_ERROR'); return connection;
            } }; }
        },
        './Modelos/configModel': { cargarConfiguracion: () => ({}), normalizarConfiguracion: x => x }
    });
    await db.inicializarBaseDatos();
    const pareja = cargar('Modelos/parejaModel.js', { '../db': db, './imagenesModel': { conFotos: async (datos, fn) => fn({ ...datos, oFotoMasculino: null, oFotoFemenino: null }), limpiarFotos: async () => {} } });
    const admin = cargar('Modelos/adminModel.js', { '../db': db, './parejaModel': pareja });
    const controladorPareja = cargar('Controladores/parejaController.js', { '../Modelos/parejaModel': pareja });
    const controladorAdmin = cargar('Controladores/adminController.js', { '../Modelos/adminModel': admin });
    return { db, pareja, admin, controladorPareja, controladorAdmin, historial, consultas,
        get confirmado() { return confirmado; }, get adquisiciones() { return adquisiciones; } };
}

test('actualización guarda ambos participantes con un UPDATE en una sola conexión', async () => {
    const v = await preparar();
    const result = await v.controladorPareja.handleActualizarPareja(null, { ...datos, cNombreMasculino: 'Nuevo A', cNombreFemenino: 'Nuevo B' });
    assert.equal(result.success, true); assert.equal(result.code, 'UPDATED');
    assert.equal(v.confirmado.t_participantes[0].cNombre, 'Nuevo A');
    assert.equal(v.confirmado.t_participantes[0].cNombreM, 'Nuevo B');
    assert.equal(v.confirmado.t_participantes[0].oFoto, 'foto-a.jpg');
    assert.equal(v.confirmado.t_participantes[0].IFotoM, 'foto-b.jpg');
    assert.deepEqual(v.confirmado.t_participantes[1], inicial().t_participantes[1]);
    assert.equal(v.consultas.filter(c => c.sql.startsWith('UPDATE ')).length, 1);
    assert.equal(v.adquisiciones, 1); assert.deepEqual(v.historial, ['begin', 'commit', 'release']);
});

test('datos iguales son UNCHANGED, y un ID inexistente es NOT_FOUND sin UPDATE', async () => {
    const v = await preparar();
    const sinCambios = await v.controladorPareja.handleActualizarPareja(null, datos);
    assert.equal(sinCambios.success, true); assert.equal(sinCambios.code, 'UNCHANGED');
    assert.match(sinCambios.message, /No hubo cambios/);
    const noExiste = await v.controladorPareja.handleActualizarPareja(null, { ...datos, nParejaID: '99' });
    assert.equal(noExiste.success, false); assert.equal(noExiste.code, 'NOT_FOUND');
    assert.equal(v.consultas.filter(c => c.sql.startsWith('UPDATE ')).length, 1);
    assert.deepEqual(v.confirmado, inicial());
});

test('error SQL al actualizar nunca se anuncia como éxito y conserva ambos participantes', async () => {
    const v = await preparar({ update: true });
    const result = await v.controladorPareja.handleActualizarPareja(null, { ...datos, cNombreMasculino: 'Cambio' });
    assert.equal(result.success, false); assert.equal(result.code, 'ER_DUP_ENTRY');
    assert.deepEqual(v.confirmado, inicial());
    assert.deepEqual(v.historial, ['begin', 'rollback', 'release']);
});

test('el controlador rechaza el objeto de error que antes producía un falso éxito', async () => {
    for (const resultado of [{ success: false, error: 'No guardado' }, { success: true, affectedRowsMasculino: 0, affectedRowsFemenino: 0 }, undefined]) {
        const controller = cargar('Controladores/parejaController.js', { '../Modelos/parejaModel': { actualizarParejaCompleta: async () => resultado } });
        assert.equal((await controller.handleActualizarPareja(null, datos)).success, false);
    }
});

test('IDs inválidos y campos vacíos se rechazan antes de adquirir conexión', async () => {
    const v = await preparar();
    for (const id of ['', ' ', 0, -1, '7abc', '1 OR 1=1', {}, null, 1.2, '9007199254740992']) {
        await assert.rejects(v.pareja.eliminarPareja(id), { code: 'INVALID_ID' });
        await assert.rejects(v.pareja.actualizarParejaCompleta({ ...datos, nParejaID: id }), { code: 'INVALID_ID' });
    }
    for (const campo of ['cNombreMasculino', 'cEmailFemenino', 'dNacimientoFemenino']) {
        await assert.rejects(v.pareja.actualizarParejaCompleta({ ...datos, [campo]: '' }), { code: 'INVALID_DATA' });
    }
    await assert.rejects(v.pareja.actualizarParejaCompleta(undefined), { code: 'INVALID_ID' });
    assert.equal(v.adquisiciones, 0);
});

for (const ruta of ['controladorAdmin', 'controladorPareja']) {
    test(`${ruta}: elimina solo la pareja pedida y sus relaciones, con un commit`, async () => {
        const v = await preparar();
        assert.equal(v.admin.eliminarPareja, v.pareja.eliminarPareja);
        const result = await v[ruta].handleEliminarPareja(null, '7');
        assert.equal(result.success, true);
        for (const tabla of tablas) assert.deepEqual(v.confirmado[tabla], inicial()[tabla].filter(f => f.nParejaID === 9));
        assert.equal(v.adquisiciones, 1);
        assert.deepEqual(v.historial, ['begin', 'commit', 'release']);
        assert.deepEqual(v.consultas.filter(c => c.sql.startsWith('DELETE')).map(c => c.sql.split(' ')[2]),
            ['T_Evaluaciones', 'T_Categorias', 'T_Estilos', 'T_Participantes']);
    });
}

for (const tabla of tablas) {
    test(`fallo al borrar ${tabla}: revierte también las eliminaciones anteriores`, async () => {
        const v = await preparar({ delete: tabla });
        assert.equal((await v.controladorAdmin.handleEliminarPareja(null, '7')).success, false);
        assert.deepEqual(v.confirmado, inicial());
        assert.deepEqual(v.historial, ['begin', 'rollback', 'release']);
    });
}

test('eliminar un ID ausente no toca tablas hijas ni devuelve éxito', async () => {
    const v = await preparar();
    assert.equal((await v.controladorAdmin.handleEliminarPareja(null, '99')).success, false);
    assert.equal(v.consultas.some(c => c.sql.startsWith('DELETE')), false);
    assert.deepEqual(v.confirmado, inicial());
});

test('si el DELETE final no afecta una fila, las eliminaciones previas se revierten', async () => {
    const v = await preparar({ ceroFinal: true });
    assert.equal((await v.controladorAdmin.handleEliminarPareja(null, '7')).success, false);
    assert.deepEqual(v.confirmado, inicial()); assert.ok(v.historial.includes('rollback'));
});

for (const opciones of [{ noTransaccional: 't_categorias' }, { faltante: 't_estilos' }, { metadata: true }]) {
    test(`esquema incompatible impide cualquier borrado: ${JSON.stringify(opciones)}`, async () => {
        const v = await preparar(opciones);
        const result = await v.controladorAdmin.handleEliminarPareja(null, '7');
        assert.equal(result.success, false);
        assert.equal(v.consultas.some(c => c.sql.startsWith('DELETE')), false);
        assert.deepEqual(v.confirmado, inicial());
        assert.deepEqual(v.historial, ['begin', 'rollback', 'release']);
    });
}

for (const momento of ['antes', 'despues']) {
    test(`conexión perdida ${momento} de aplicar COMMIT: resultado incierto sin reintento`, async () => {
        const v = await preparar({ commit: momento });
        const result = await v.controladorAdmin.handleEliminarPareja(null, '7');
        assert.equal(result.success, false); assert.equal(result.code, 'TRANSACTION_OUTCOME_UNKNOWN');
        assert.match(result.error, /Consulta la pareja/);
        assert.equal(v.adquisiciones, 1); assert.deepEqual(v.historial, ['begin', 'commit', 'destroy']);
        assert.equal(v.confirmado.t_participantes.some(f => f.nParejaID === 7), momento === 'antes');
    });
}

test('fallo de rollback descarta la conexión en vez de devolverla al pool', async () => {
    const v = await preparar({ delete: 't_estilos', rollback: true });
    const result = await v.controladorAdmin.handleEliminarPareja(null, '7');
    assert.equal(result.success, false); assert.equal(result.code, 'TRANSACTION_OUTCOME_UNKNOWN');
    assert.deepEqual(v.historial, ['begin', 'rollback', 'destroy']);
});

test('fallos al adquirir o iniciar la transacción no ejecutan escrituras', async () => {
    for (const opciones of [{ acquire: true }, { begin: true }]) {
        const v = await preparar(opciones);
        assert.equal((await v.controladorAdmin.handleEliminarPareja(null, '7')).success, false);
        assert.equal(v.consultas.length, 0);
        assert.deepEqual(v.historial, opciones.begin ? ['begin', 'destroy'] : []);
    }
});

test('el ejecutor de consultas no puede usarse después de terminar la transacción', async () => {
    const v = await preparar(); let consultar;
    await v.db.withTransaction(['T_Participantes'], async query => { consultar = query; });
    const cantidad = v.consultas.length;
    await assert.rejects(consultar('DELETE FROM T_Participantes WHERE nParejaID = ?', [7]), /ya terminó/);
    assert.equal(v.consultas.length, cantidad);
});

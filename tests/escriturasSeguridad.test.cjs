const { test } = require('node:test');
const assert = require('node:assert/strict');
const { aplicacion } = require('./helpers/aplicacion.cjs');

function transaccionEvaluacion(insertar) { return { withTransaction: async (_tablas, fn) => fn(async (sql, params) => {
    if (sql.includes('FROM t_participantes')) return [{ nParejaID: 4 }];
    if (sql.startsWith('SELECT')) return [];
    return insertar(sql, params);
}) }; }

const pareja = { nParejaID: '7', cNombreMasculino: 'Juan', cApellidoMasculino: 'Prueba',
    cEmailMasculino: 'j@example.test', nTelefonoMasculino: '5512345678', dNacimientoMasculino: '2000-01-01', sexoMasculino: 'M',
    cNombreFemenino: 'Ana', cApellidoFemenino: 'Prueba', cEmailFemenino: 'a@example.test',
    nTelefonoFemenino: '5512345679', dNacimientoFemenino: '2000-02-02', sexoFemenino: 'F' };

test('evaluación: identidad textual de la sesión se conserva para la clave SQL', async () => {
    let params;
    const h = aplicacion(transaccionEvaluacion(async (_sql, args) => { params = args; return { insertId: 1 }; }));
    h.sesion.guardarSesion('006', 'juez');
    const result = await h.handlers.get('registrar-evaluacion')(h.evento('Resultados.html'),
        { nJuezID: 999, nParejaID: 4, nPuntaje: 30 });
    assert.equal(result.success, true);
    assert.equal(params[0], '006');
});

test('evaluación: juez y administrador firman con su sesión e ignoran el ID enviado', async () => {
    const queries = [];
    const h = aplicacion(transaccionEvaluacion(async (sql, params) => { queries.push({ sql, params }); return { insertId: 3 }; }));
    const event = h.evento('Resultados.html');
    for (const role of ['juez', 'admin']) {
        h.sesion.guardarSesion(7, role);
        assert.equal((await h.handlers.get('registrar-evaluacion')(event,
            { nJuezID: 999, nParejaID: '4', nPuntaje: 60, cComentario: 'Prueba' })).success, true);
        assert.deepEqual(Array.from(queries.at(-1).params), ['7', '4', 60, 'Prueba']);
    }
});

test('evaluación: límites y tipos incorrectos no llegan a SQL; corregir permite guardar', async () => {
    let writes = 0;
    const h = aplicacion(transaccionEvaluacion(async () => { writes++; return { insertId: 3 }; }));
    h.sesion.guardarSesion(7, 'juez'); const event = h.evento('Resultados.html');
    const fn = h.handlers.get('registrar-evaluacion');
    for (const data of [null, [], {}, { nParejaID: '4abc', nPuntaje: 20 },
        ...[null, NaN, Infinity, -1, 61, 1.5, '30', true].map(nPuntaje => ({ nParejaID: 4, nPuntaje })),
        { nParejaID: 4, nPuntaje: 30, cComentario: {} }, { nParejaID: 4, nPuntaje: 30, cComentario: 'a'.repeat(256) }]) {
        assert.equal((await fn(event, data)).success, false);
    }
    assert.equal(writes, 0);
    assert.equal((await fn(event, { nParejaID: 4, nPuntaje: 0 })).success, true);
    assert.equal(writes, 1);
});

test('pareja: datos inválidos se rechazan antes de iniciar SQL o procesar fotos', async () => {
    let transactions = 0;
    const h = aplicacion({ withTransaction: async () => { transactions++; throw Error('No debe llegar'); } });
    h.sesion.guardarSesion(7, 'user'); const event = h.evento('Registros.html');
    for (const data of [null, {}, { ...pareja, nParejaID: '1e3' }, { ...pareja, cEmailMasculino: 'incorrecto' },
        { ...pareja, cNombreFemenino: ' ' }, { ...pareja, dNacimientoFemenino: '2000-02-30' },
        { ...pareja, dNacimientoFemenino: '3000-01-01' }, { ...pareja, sexoFemenino: 'otro' },
        { ...pareja, nTelefonoMasculino: 'abc' }]) {
        assert.equal((await h.handlers.get('registrar-pareja')(event, data)).code, 'INVALID_DATA');
    }
    assert.equal(transactions, 0);
});

test('operador: registro completo recorre handlers reales con pareja, categoría y estilo', async () => {
    const writes = [];
    const query = async (sql, args) => {
        if (sql.includes('FROM t_participantes')) return [{ nParejaID: 7 }];
        if (sql.startsWith('SELECT')) return [];
        writes.push({ sql, args }); return { insertId: 5, affectedRows: 1 };
    };
    const h = aplicacion({ queryDatabase: query, withTransaction: async (_tablas, fn) => fn(query) });
    h.sesion.guardarSesion(7, 'user'); const event = h.evento('Registros.html');
    assert.equal((await h.handlers.get('registrar-pareja')(event, pareja)).success, true);
    assert.equal((await h.handlers.get('registrar-categoria')(event, { nParejaID: 7, nIDCategoria: 1, cCategoriaNombre: 'Adulto' })).success, true);
    assert.equal((await h.handlers.get('registrar-estilo')(event, { nParejaID: 7, nEstiloID: 1, cEstiloNombre: 'Potosino' })).success, true);
    assert.equal(writes.length, 3);
});

test('categorías/estilos: datos inválidos no escriben y endpoints SQL ambiguos se deniegan', async () => {
    const h = aplicacion(); h.sesion.guardarSesion(7, 'admin'); const event = h.evento('Registros.html');
    for (const [canal, datos] of [['registrar-categoria', { nParejaID: 1, nIDCategoria: -1, cCategoriaNombre: 'A' }],
        ['registrar-estilo', { nParejaID: 1, nEstiloID: 1, cEstiloNombre: {} }],
        ['eliminar-estilo', '1 OR 1=1'], ['actualizar-categoria', {}], ['actualizar-estilo', {}]]) {
        assert.equal((await h.handlers.get(canal)(event, datos)).code, canal.startsWith('actualizar-') ? 'UNSUPPORTED_OPERATION' : 'INVALID_DATA');
    }
});

test('alta: contraseña vacía, tipo inválido o truncable e ID inválido no escriben SQL', async () => {
    const h = aplicacion(); h.sesion.guardarSesion(7, 'admin'); const event = h.evento('Administrador.html');
    const cuenta = { nUsuarioID: 8, cNombreUsuario: 'Ana', cContrasena: 'Prueba', rol: 'user' };
    for (const cContrasena of ['', undefined, 123, {}, 'a'.repeat(73), 'á'.repeat(37)]) {
        assert.equal((await h.handlers.get('crear-usuario')(event, { ...cuenta, cContrasena })).success, false);
    }
    assert.equal((await h.handlers.get('crear-usuario')(event, { ...cuenta, nUsuarioID: {} })).success, false);
});

test('login: si el emisor navega durante SQL, no queda sesión ni se abre principal', async () => {
    let resolve;
    const h = aplicacion({ queryDatabase: () => new Promise(r => { resolve = r; }) });
    const event = h.evento('login.html'); const count = h.windows.length;
    const pending = h.handlers.get('login')(event, { username: 'Ana', password: 'prueba' });
    event.senderFrame.url = 'https://example.com';
    resolve([{ nUsuarioID: 7, rol: 'admin', cContrasena: 'prueba' }]);
    assert.equal((await pending).success, false); assert.equal(h.sesion.obtenerSesion(), null);
    assert.equal(h.windows.length, count);
});

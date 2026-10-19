const { test } = require('node:test');
const assert = require('node:assert/strict');
const { aplicacion } = require('./helpers/aplicacion.cjs');

function preparar(previas = [], existe = true) {
    const escrituras = [];
    const h = aplicacion({ withTransaction: async (_tablas, fn) => fn(async (sql, params) => {
        if (sql.includes('FROM t_participantes')) return existe ? [{ nParejaID: 3 }] : [];
        if (sql.startsWith('SELECT')) return previas;
        escrituras.push(params);
        return { insertId: 8 };
    }) });
    h.sesion.guardarSesion('JUEZ-1', 'juez');
    return { escrituras, guardar: datos => h.handlers.get('registrar-evaluacion')(h.evento('Resultados.html'), datos) };
}
const datos = { nJuezID: 'intruso', nParejaID: 3, nPuntaje: 50, cComentario: 'Definitiva' };
test('evaluación definitiva: primer envío firma con sesión y conserva ID alfanumérico', async () => {
    const h = preparar();
    const resultado = await h.guardar(datos);
    assert.equal(resultado.id, 8); assert.equal(resultado.replayed, false);
    assert.deepEqual(Array.from(h.escrituras[0]), ['JUEZ-1', '3', 50, 'Definitiva']);
});
test('evaluación definitiva: reenvío idéntico devuelve ID original sin INSERT', async () => {
    const h = preparar([{ nEvaluacionID: 5, nPuntaje: 50, cComentario: 'Definitiva' }]);
    const resultado = await h.guardar(datos);
    assert.equal(resultado.id, 5); assert.equal(resultado.replayed, true); assert.equal(h.escrituras.length, 0);
});
test('evaluación definitiva: modificar puntaje o comentario se rechaza sin INSERT', async () => {
    const h = preparar([{ nEvaluacionID: 5, nPuntaje: 50, cComentario: 'Definitiva' }]);
    for (const cambio of [{ nPuntaje: 51 }, { cComentario: 'Cambio' }]) assert.equal((await h.guardar({ ...datos, ...cambio })).code, 'EVALUATION_EXISTS');
    assert.equal(h.escrituras.length, 0);
});
test('evaluación definitiva: duplicados históricos requieren revisión, nunca borrado automático', async () => {
    const h = preparar([{ nEvaluacionID: 1 }, { nEvaluacionID: 2 }]);
    assert.equal((await h.guardar(datos)).code, 'DUPLICATE_HISTORY'); assert.equal(h.escrituras.length, 0);
});
test('evaluación definitiva: pareja inexistente no crea evaluación', async () => {
    const h = preparar([], false);
    assert.equal((await h.guardar(datos)).code, 'NOT_FOUND'); assert.equal(h.escrituras.length, 0);
});

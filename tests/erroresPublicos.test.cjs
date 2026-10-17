const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mensajePublico } = require('../Seguridad/errores');
const { aplicacion } = require('./helpers/aplicacion.cjs');

test('errores SQL y desconocidos no revelan valores, rutas ni detalles internos', () => {
    for (const code of [undefined, 'ER_DUP_ENTRY', 'ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE', 'ENOENT', 'ER_NO_REFERENCED_ROW_2']) {
        const mensaje = mensajePublico(Object.assign(Error('password=secreto SQL INSERT INTO privado ruta=C:/privado'), { code }));
        assert.doesNotMatch(mensaje, /secreto|INSERT|privado/);
    }
});
test('errores de dominio y resultado incierto conservan la instrucción para recuperarse', () => {
    assert.equal(mensajePublico(Object.assign(Error('Consulta la pareja antes de reintentar.'), { code: 'TRANSACTION_OUTCOME_UNKNOWN' })), 'Consulta la pareja antes de reintentar.');
});
test('el controlador real conserva código pero oculta el error privado de SQL', async () => {
    const h = aplicacion({ queryDatabase: async () => { throw Object.assign(Error('host=privado password=secreto'), { code: 'ER_BAD_FIELD_ERROR' }); } });
    h.sesion.guardarSesion('U001', 'admin');
    const r = await h.handlers.get('buscar-pareja-por-id')(h.evento(), '7');
    assert.equal(r.success, false); assert.doesNotMatch(r.error, /privado|secreto/);
});

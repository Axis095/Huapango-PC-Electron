const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearGestorSesion } = require('../Modelos/sesionModel');
const { idUsuario, nombreUsuario } = require('../Seguridad/identidad');

test('identidad: claves de VARCHAR preservan ceros y rechazan objetos que se convierten a texto', () => {
    for (const id of ['U001', '006', 'juez-1', 'juez_2', '9'.repeat(50), 6]) assert.equal(idUsuario(id), id);
    for (const id of [[6], {}, { toString: () => 'U001' }, true, '', ' U001 ', '0', 0, NaN, 1.5, 'a'.repeat(51)]) {
        assert.throws(() => idUsuario(id));
    }
    assert.equal(nombreUsuario(' Ana '), 'Ana');
    assert.throws(() => nombreUsuario('a'.repeat(101)));
    assert.throws(() => nombreUsuario('A\u0000na'));
});

test('sesión: caduca por inactividad exacta y consultar sesión no prolonga el plazo', () => {
    let tiempo = 0;
    const s = crearGestorSesion({ ahora: () => tiempo, inactividadMs: 1000 });
    s.guardarSesion('U001', 'admin'); tiempo = 900;
    assert.equal(s.obtenerSesion().userID, 'U001');
    tiempo = 1000; assert.equal(s.obtenerSesion(), null);
    s.guardarSesion('U001', 'admin'); tiempo = 1900; s.registrarActividad();
    tiempo = 2000; assert.equal(s.obtenerSesion().userRole, 'admin');
    tiempo = 2900; assert.equal(s.obtenerSesion(), null);
});

test('sesión: cuenta borrada, rol cambiado, contraseña cambiada y error SQL revocan permisos', async () => {
    for (const consultar of [async () => [], async () => [{ nUsuarioID: 'U001', rol: 'user', cContrasena: 'hash' }],
        async () => [{ nUsuarioID: 'U001', rol: 'admin', cContrasena: 'nuevo' }], async () => { throw Error('Desconectado'); }]) {
        const s = crearGestorSesion(); s.guardarSesion('U001', 'admin', { credencial: 'hash' });
        assert.equal(await s.revalidarSesion(consultar), null); assert.equal(s.obtenerSesion(), null);
    }
});

test('sesión: revalidar identidad conserva ID original y no expone contraseña al llamador', async () => {
    const s = crearGestorSesion(); s.guardarSesion('006', 'juez', { credencial: 'hash' });
    const sesion = await s.revalidarSesion(async (sql, args) => {
        assert.equal(args[0], '006'); assert.match(sql, /validar-sesion/);
        return [{ nUsuarioID: '006', rol: 'juez', cContrasena: 'hash' }];
    });
    assert.deepEqual(sesion, { userID: '006', userRole: 'juez' });
});

test('sesión: respuesta antigua no revive ni invalida una sesión posterior', async () => {
    const s = crearGestorSesion(); s.guardarSesion('U001', 'admin');
    let responder; const pendiente = s.revalidarSesion(() => new Promise(r => { responder = r; }));
    s.cerrarSesion(); s.guardarSesion('U002', 'juez'); responder([]);
    assert.equal(await pendiente, null); assert.equal(s.obtenerSesion().userID, 'U002');
});

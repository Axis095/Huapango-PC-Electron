const { test } = require('node:test');
const assert = require('node:assert/strict');
const { aplicacion } = require('./helpers/aplicacion.cjs');

async function escenario() {
    const cuenta = { nUsuarioID: 'U001', rol: 'admin', cContrasena: 'clave-local' };
    const h = aplicacion({ sesionDesdeBD: true, queryDatabase: async (sql, args) => {
        if (sql.startsWith('UPDATE')) { cuenta.cContrasena = args[0]; return { affectedRows: 1 }; }
        return [{ ...cuenta }];
    } });
    const evento = w => ({ sender: w.webContents, senderFrame: w.webContents.mainFrame });
    const entrar = () => h.handlers.get('login')(evento(h.globals.loginWindow), { username: 'Ana', password: 'clave-local' });
    await h.ready();
    assert.equal((await entrar()).success, true);
    return { h, cuenta, evento, entrar };
}

test('sesión expirada abre un solo login y recuperar la misma cuenta conserva ventana y borrador', async () => {
    const { h, evento, entrar } = await escenario();
    const principal = h.globals.mainWindow;
    const registro = h.evento('Registros.html');
    assert.equal((await h.handlers.get('guardar-borrador-registro')(registro,
        { version: 1, campos: { nombreMasculino: 'Borrador' }, fotos: {} })).success, true);
    h.sesion.cerrarSesion(); // Misma salida observable que caducidad por inactividad, probada con reloj aparte.
    assert.equal((await h.handlers.get('get-role')(evento(principal))).code, 'SESSION_EXPIRED');
    const login = h.globals.loginWindow;
    assert.equal(principal.hidden, true);
    assert.equal((await h.handlers.get('get-role')(evento(principal))).code, 'SESSION_EXPIRED');
    assert.equal(h.globals.loginWindow, login);
    assert.equal((await entrar()).success, true);
    assert.equal(h.globals.mainWindow, principal);
    assert.equal(principal.hidden, false);
    assert.equal((await h.handlers.get('obtener-borrador-registro')(registro)).data.campos.nombreMasculino, 'Borrador');
});

test('revocación de rol abre acceso y el nuevo rol cierra ventanas anteriores', async () => {
    const { h, cuenta, evento, entrar } = await escenario();
    const principal = h.globals.mainWindow;
    cuenta.rol = 'juez';
    assert.equal((await h.handlers.get('get-role')(evento(principal))).code, 'SESSION_EXPIRED');
    assert.equal((await entrar()).success, true);
    assert.equal(principal.closed, true);
    assert.notEqual(h.globals.mainWindow, principal);
    assert.equal(h.sesion.obtenerSesion().userRole, 'juez');
});

test('una identidad diferente no hereda ventanas de la sesión expirada', async () => {
    const { h, cuenta, evento, entrar } = await escenario();
    const principal = h.globals.mainWindow;
    h.sesion.cerrarSesion();
    await h.handlers.get('get-role')(evento(principal));
    cuenta.nUsuarioID = 'U002';
    const proto = Object.getPrototypeOf(principal);
    const cargarOriginal = proto.loadFile;
    let cerradaAntesDeCargar = false;
    proto.loadFile = async function(file, ...args) {
        if (file.endsWith('MenuPrincipal.html')) cerradaAntesDeCargar = principal.closed === true;
        return cargarOriginal.call(this, file, ...args);
    };
    assert.equal((await entrar()).success, true);
    assert.equal(principal.closed, true);
    assert.equal(cerradaAntesDeCargar, true);
});

test('sesión expirada no se convierte en permiso de configuración inicial', async () => {
    const { h, evento } = await escenario();
    h.sesion.cerrarSesion();
    const r = await h.handlers.get('obtener-configuracion')(h.evento('configuracionBD.html'));
    assert.equal(r.code, 'SESSION_EXPIRED');
    const original = h.windows.length;
    await h.listeners.get('abrir-ventana-emergente')(evento(h.globals.mainWindow));
    assert.equal(h.windows.length, original);
});

test('eventos durante reconfiguración se bloquean antes de revalidar y no revocan la sesión', async () => {
    let consultas = 0;
    const h = aplicacion({ sesionDesdeBD: true, queryDatabase: async () => { consultas++; throw Error('No consultar'); } });
    h.sesion.guardarSesion('U001', 'admin');
    const event = h.evento();
    const gate = h.cargar('Servicios/operaciones.js');
    let liberar;
    const pendiente = gate.ejecutarCambioConfiguracion(() => new Promise(r => { liberar = r; }));
    try {
        for (const canal of ['open-section', 'abrir-ventana-emergente']) {
            assert.equal((await h.listeners.get(canal)(event, 'Registros.html')).code, 'CONFIGURATION_BUSY');
        }
        assert.equal(consultas, 0);
        assert.equal(h.sesion.obtenerSesion().userID, 'U001');
        assert.equal(h.windows.length, 1);
    } finally { liberar(); await pendiente; }
});

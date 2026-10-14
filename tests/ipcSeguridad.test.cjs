const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { crearSeguridadIPC, politicas } = require('../Seguridad/ipc');
const { aplicacion } = require('./helpers/aplicacion.cjs');

test('Main carga módulos reales y registra cada canal exactamente con una política', () => {
    const h = aplicacion();
    assert.deepEqual([...h.handlers.keys(), ...h.listeners.keys()].sort(), Object.keys(politicas).sort());
});

test('IPC: todos los canales rechazan emisor remoto, subframe o ventana desconocida sin efectos', async () => {
    let effects = 0;
    const frame = { url: pathToFileURL(path.resolve(__dirname, '../Vistas/MenuPrincipal.html')).href };
    const sender = { mainFrame: frame };
    const security = crearSeguridadIPC({ raiz: path.resolve(__dirname, '..'),
        obtenerSesion: () => ({ userID: 1, userRole: 'admin' }), ventanaDe: s => s === sender ? { isDestroyed: () => false } : null });
    for (const canal of Object.keys(politicas)) {
        const fn = security.proteger(canal, () => { effects++; });
        for (const event of [undefined, { sender }, { sender, senderFrame: { ...frame } },
            { sender: { mainFrame: frame }, senderFrame: frame }]) {
            assert.equal((await fn(event)).code, 'FORBIDDEN', canal);
        }
        const original = frame.url;
        for (const url of ['https://example.com', 'http://localhost:5173/Vistas/MenuPrincipal.html',
            pathToFileURL(path.resolve(__dirname, '../uploads/MenuPrincipal.html')).href]) {
            frame.url = url;
            assert.equal((await fn({ sender, senderFrame: frame })).code, 'FORBIDDEN', canal);
        }
        frame.url = original;
    }
    assert.equal(effects, 0);
});

test('IPC: sin sesión no se consultan datos ni se escribe; tampoco se generan PDF', async () => {
    const h = aplicacion();
    const event = h.evento();
    for (const [canal, fn] of h.handlers) {
        if (!['login', 'get-role', 'get-usuario-id', 'obtener-configuracion', 'guardar-configuracion', 'continuar-configuracion'].includes(canal)) {
            assert.equal((await fn(event, {})).code, 'FORBIDDEN', canal);
        }
    }
});

test('IPC: operador completa categoría y estilo pero no administra ni evalúa', async () => {
    const queries = [];
    const h = aplicacion({ queryDatabase: async (sql, args) => {
        queries.push({ sql, args }); return sql.startsWith('SELECT') ? [{ total: 0 }] : { insertId: 5 };
    } });
    h.sesion.guardarSesion(7, 'user'); const event = h.evento('Registros.html');
    assert.equal((await h.handlers.get('registrar-categoria')(event, { nParejaID: 4, nIDCategoria: 5, cCategoriaNombre: 'Adulto' })).success, true);
    assert.equal((await h.handlers.get('registrar-estilo')(event, { nParejaID: 4, nEstiloID: 5, cEstiloNombre: 'Potosino' })).success, true);
    assert.equal(queries.filter(q => q.sql.startsWith('INSERT')).length, 2);
    const count = queries.length;
    for (const canal of ['crear-usuario', 'eliminar-usuario', 'eliminar-pareja', 'actualizar-categoria', 'eliminar-estilo', 'registrar-evaluacion']) {
        assert.equal((await h.handlers.get(canal)(event, {})).code, 'FORBIDDEN', canal);
    }
    assert.equal(queries.length, count);
});

test('IPC: juez no escribe inscripciones ni administra usuarios', async () => {
    const h = aplicacion(); h.sesion.guardarSesion(9, 'juez'); const event = h.evento('Resultados.html');
    for (const canal of ['registrar-pareja', 'actualizar-pareja-completa', 'registrar-categoria', 'registrar-estilo', 'crear-usuario']) {
        assert.equal((await h.handlers.get(canal)(event, {})).code, 'FORBIDDEN', canal);
    }
});

test('IPC: configuración inicial permitida; operador/juez no cambian la conexión', async () => {
    let calls = 0, sesion = null;
    const frame = { url: pathToFileURL(path.resolve(__dirname, '../Vistas/configuracionBD.html')).href };
    const sender = { mainFrame: frame };
    const security = crearSeguridadIPC({ raiz: path.resolve(__dirname, '..'), obtenerSesion: () => sesion, ventanaDe: () => ({ isDestroyed: () => false }) });
    const fn = security.proteger('guardar-configuracion', () => { calls++; return { success: true }; });
    const event = { sender, senderFrame: frame };
    assert.equal(fn(event).success, true);
    for (const rol of ['user', 'juez']) {
        sesion = { userRole: rol };
        assert.equal(fn(event).code, 'FORBIDDEN');
    }
    sesion = { userRole: 'admin' }; assert.equal(fn(event).success, true);
    assert.equal(calls, 2);
});

test('IPC: open-section rechaza traversal, archivos no permitidos y vistas de otro rol', () => {
    const h = aplicacion(); h.sesion.guardarSesion(7, 'user'); const event = h.evento();
    const count = h.windows.length;
    for (const file of ['../uploads/x.html', 'Administrador.html', 'Resultados.html', 'https://example.com', null, {}, []]) {
        h.listeners.get('open-section')(event, file);
    }
    assert.equal(h.windows.length, count);
    h.listeners.get('open-section')(event, 'Registros.html');
    assert.equal(h.windows.length, count + 1);
    assert.equal(h.windows.at(-1).options.webPreferences.nodeIntegration, false);
    assert.equal(h.windows.at(-1).options.webPreferences.contextIsolation, true);
});

test('ventanas: navegación remota, redirecciones, popups y webviews quedan bloqueados', () => {
    const h = aplicacion(); h.sesion.guardarSesion(7, 'user');
    const events = new Map(); let popup;
    h.appEvents.get('web-contents-created')(null, {
        setWindowOpenHandler(fn) { popup = fn; }, on(name, fn) { events.set(name, fn); }
    });
    assert.equal(popup().action, 'deny');
    for (const name of ['will-navigate', 'will-redirect']) {
        for (const url of ['https://example.com', pathToFileURL(path.resolve(__dirname, '../Vistas/Administrador.html')).href]) {
            let blocked = false;
            events.get(name)({ preventDefault() { blocked = true; } }, url);
            assert.equal(blocked, true);
        }
    }
    let blocked = false;
    events.get('will-attach-webview')({ preventDefault() { blocked = true; } });
    assert.equal(blocked, true);
});

test('login y cambio de conexión no pueden ejecutarse simultáneamente', async () => {
    let resolve;
    const h = aplicacion({ inicializarBaseDatos: () => new Promise(r => { resolve = r; }) });
    const config = h.evento('configuracionBD.html'), login = h.evento('login.html');
    const pending = h.handlers.get('continuar-configuracion')(config);
    const result = await h.handlers.get('login')(login, { username: 'Ana', password: 'clave' });
    assert.equal(result.success, false); assert.match(result.error, /configuración/);
    resolve(); assert.equal((await pending).success, true);

    let resolverSQL;
    const otro = aplicacion({ queryDatabase: () => new Promise(r => { resolverSQL = r; }) });
    const autenticando = otro.handlers.get('login')(otro.evento('login.html'), { username: 'Ana', password: 'clave' });
    const cambio = await otro.handlers.get('continuar-configuracion')(otro.evento('configuracionBD.html'));
    assert.equal(cambio.success, false); assert.match(cambio.error, /inicio de sesión/);
    resolverSQL([]); await autenticando;
});

test('IPC: borradores conservan aislamiento y requieren sesión incluso desde la vista correcta', () => {
    const h = aplicacion(); const event = h.evento('Registros.html');
    const get = h.handlers.get('obtener-borrador-registro');
    assert.equal(get(event).code, 'FORBIDDEN');
    h.sesion.guardarSesion(7, 'user'); assert.equal(get(event).data, null);
    assert.equal(get(h.evento('ModificarParejas.html')).code, 'FORBIDDEN');
});

test('arranque real de módulos: login crea principal y cierra login una sola vez', async () => {
    const h = aplicacion({ queryDatabase: async () => [{ nUsuarioID: 7, rol: 'admin', cContrasena: 'prueba' }] });
    await h.ready(); const login = h.windows[0];
    const event = { sender: login.webContents, senderFrame: login.webContents.mainFrame };
    assert.equal((await h.handlers.get('login')(event, { username: 'Ana', password: 'prueba' })).success, true);
    assert.equal(h.sesion.obtenerSesion().userID, 7);
    assert.equal(login.closed, true); assert.equal(h.windows.length, 2);
    assert.equal(path.basename(h.windows[1].file), 'MenuPrincipal.html');
});

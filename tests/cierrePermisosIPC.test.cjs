const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const quiet = { log() {}, error() {}, warn() {} };
function cargar(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), { module, __dirname: path.dirname(path.join(root, file)), console: quiet,
        require(n) { assert.ok(Object.hasOwn(deps, n), n); return deps[n]; }, ...extra }, { filename: file });
    return module.exports;
}
const cuentas = { admin: { nUsuarioID: 1, rol: 'admin' }, user: { nUsuarioID: 2, rol: 'user' },
    juezA: { nUsuarioID: 12, rol: 'juez' }, juezB: { nUsuarioID: 99, rol: 'juez' } };
const rutas = {
    'crear-usuario': 'Administrador', 'eliminar-usuario': 'Administrador', 'eliminar-pareja': 'Administrador', 'obtener-rol-usuario': 'Administrador',
    'registrar-pareja': 'Registros', 'actualizar-pareja-completa': 'BusquedaParejas',
    'buscar-pareja-por-id': 'BusquedaParejas', 'buscar-todas-las-parejas': 'BusquedaParejas',
    'buscar-pareja-para-evaluacion': 'Resultados',
    'registrar-categoria': 'Registros', 'actualizar-categoria': 'Registros', 'eliminar-categoria': 'Registros', 'buscar-categoria-por-id': 'BusquedaParejas',
    'registrar-estilo': 'Registros', 'actualizar-estilo': 'Registros', 'eliminar-estilo': 'Registros', 'buscar-estilo-por-id': 'BusquedaParejas',
    'registrar-evaluacion': 'Resultados', 'obtener-evaluaciones-por-pareja': 'Resultados',
    'generar-pdf-parejas': 'Registros', 'generar-pdf-resultados': 'Resultados', 'generar-pdf-categorias': 'Registros',
    'generar-pdf-estilos': 'Registros', 'generar-pdf-registros-generales': 'Administrador',
    ...Object.fromEntries(['obtener', 'guardar', 'limpiar'].flatMap(accion => [
        [`${accion}-borrador-registro`, 'Registros'], [`${accion}-borrador-modificacion`, 'BusquedaParejas']
    ]))
};
function preparar(opciones = {}) {
    const handlers = new Map(), eventos = new Map(), ventanas = [], efectos = [], consultas = [];
    const sesion = cargar('Modelos/sesionModel.js', {}), globals = {};
    let ready;
    class Window {
        constructor() {
            this.enviados = []; this.webEvents = new Map();
            this.webContents = { mainFrame: { url: '' }, once() {}, on: (n, fn) => this.webEvents.set(n, fn), send: (...args) => this.enviados.push(args) };
            this.events = new Map(); ventanas.push(this);
        }
        loadFile(file) {
            this.webContents.mainFrame.url = pathToFileURL(path.resolve(root, file)).href;
            if (opciones.fallarLogin && file.endsWith('login.html')) return Promise.reject(Error('No carga login'));
            if (opciones.cargarLogin && file.endsWith('login.html')) return opciones.cargarLogin();
            return opciones.fallarPrincipal && file.endsWith('MenuPrincipal.html') ? Promise.reject(Error('No carga')) : Promise.resolve();
        }
        on(n, fn) { this.events.set(n, fn); }
        isDestroyed() { return !!this.closed; }
        close() {
            this.intentosCerrar = (this.intentosCerrar || 0) + 1;
            let cancelado = false;
            this.events.get('close')?.({ preventDefault() { cancelado = true; } });
            if (!cancelado && !this.retener) { this.closed = true; this.events.get('closed')?.(); }
        }
        maximize() {} focus() {}
        static fromWebContents(wc) { return ventanas.find(w => w.webContents === wc); }
        static getAllWindows() { return ventanas.filter(w => !w.closed); }
        static getFocusedWindow() { return globals.mainWindow; }
    }
    const db = { async queryDatabase(sql, params) {
        consultas.push({ sql, params: Array.from(params) });
        if (/FROM t_usuarios WHERE cNombreUsuario =/.test(sql)) {
            if (opciones.loginPendiente) await opciones.loginPendiente();
            return cuentas[params[0]] ? [{ ...cuentas[params[0]], cContrasena: 'prueba' }] : [];
        }
        return /INSERT/.test(sql) ? { insertId: 1 } : [{ nEvaluacionID: 1 }];
    } };
    const electron = {
        BrowserWindow: Window,
        app: { whenReady() { return { then(fn) { ready = fn; return { catch() {} }; } }; }, on() {}, quit() {} },
        ipcMain: { handle(c, fn) { handlers.set(c, fn); }, on(c, fn) { eventos.set(c, fn); } },
        Menu: { buildFromTemplate(t) { return t; }, setApplicationMenu() {} },
        dialog: { showErrorBox() {}, async showSaveDialog() { efectos.push('dialogo'); await opciones.dialogo?.(); return { filePath: 'simulado.pdf' }; } },
        shell: { async openPath() { efectos.push('abrir PDF'); } }
    };
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    // Espías en el límite de negocio para demostrar que un rechazo nunca lo alcanza.
    for (const m of read('main.js').matchAll(/const \{([^}]+)\} = require\("(\.\/Controladores\/[^" ]+)"\)/g)) {
        deps[m[2]] = Object.fromEntries(m[1].split(',').map(n => n.trim()).map(n => [n, async () => {
            efectos.push(n); if (opciones.controladorPendiente) await opciones.controladorPendiente(); return { success: true, data: 'privado' };
        }]));
    }
    Object.assign(deps, { electron, path, url: { fileURLToPath }, './db': { inicializarBaseDatos: async () => {} },
        './Modelos/sesionModel': sesion, './Modelos/configModel': { requiereConfiguracionInicial: () => !!opciones.inicial } });
    deps['./Controladores/authController'] = cargar('Controladores/authController.js', {
        '../db': db, '../Modelos/sesionModel': sesion,
        '../Modelos/contrasenaModel': require('../Modelos/contrasenaModel')
    }, { global: globals });
    deps['./Controladores/evaluacionesController'] = cargar('Controladores/evaluacionesController.js', {
        '../Modelos/evaluacionesModel': cargar('Modelos/evaluacionesModel.js', { '../db': db }),
        '../Modelos/sesionModel': sesion, 'node:path': path, 'node:url': { fileURLToPath }
    });
    const modelosPDF = Object.fromEntries(['Parejas', 'Resultados', 'Categorias', 'Estilos', 'RegistrosGenerales'].map(tipo =>
        ['generarPDF' + tipo, async (...args) => { args.at(-1)(); efectos.push({ pdf: tipo, alcance: tipo === 'Resultados' ? args[1] : null }); }]));
    deps['./Controladores/pdfController'] = cargar('Controladores/pdfController.js', {
        electron, '../Modelos/pdfModel': modelosPDF, '../Modelos/sesionModel': sesion, 'node:path': path, 'node:url': { fileURLToPath }
    });
    const context = vm.createContext({ __dirname: root, global: globals, console: quiet, require: n => deps[n] });
    vm.runInContext(read('main.js'), context);
    const evento = win => ({ sender: win.webContents, senderFrame: win.webContents.mainFrame });
    return { handlers, eventos, ventanas, efectos, consultas, sesion, context, globals, Window, evento,
        ready: () => ready(), invoke: (canal, e, ...args) => handlers.get(canal)(e, ...args),
        login: (usuario, e = evento(globals.loginWindow)) => handlers.get('login')(e, { username: usuario, password: 'prueba' }),
        async nuevaSesion(usuario) { sesion.cerrarSesion(); await context.createLoginWindow(); return this.login(usuario); }
    };
}
function denegado(r) { assert.equal(r.success, false); assert.equal(r.code, 'FORBIDDEN'); }

test('inventario: los 30 canales de negocio/borrador rechazan ventanas de otra sesión y no registradas', async () => {
    const v = preparar(); await v.ready(); await v.login('user');
    const vieja = v.globals.mainWindow; vieja.retener = true; // También cubre IPC tardíos antes de que termine el cierre.
    await v.nuevaSesion('admin');
    assert.ok(vieja.intentosCerrar > 0);
    const ajena = new v.Window();
    const inicial = v.efectos.length, sql = v.consultas.length;
    assert.equal(Object.keys(rutas).length, 30);
    for (const win of [vieja, ajena]) {
        for (const [canal, vista] of Object.entries(rutas)) {
            await win.loadFile(`Vistas/${vista}.html`);
            denegado(await v.invoke(canal, v.evento(win), { userRole: 'admin', nJuezID: 1 }, () => true));
        }
        assert.equal(v.invoke('get-role', v.evento(win)), 'guest');
        assert.equal(v.invoke('get-usuario-id', v.evento(win)), null);
    }
    assert.equal(v.efectos.length, inicial); assert.equal(v.consultas.length, sql);
    await v.globals.mainWindow.loadFile('Vistas/Administrador.html');
    assert.equal((await v.invoke('crear-usuario', v.evento(v.globals.mainWindow), {})).success, true);
});

test('juez A no puede leer, evaluar ni exportar como juez B; B conserva el filtro SQL propio', async () => {
    const v = preparar(); await v.ready(); await v.login('juezA');
    const vieja = v.globals.mainWindow; vieja.retener = true; await vieja.loadFile('Vistas/Resultados.html');
    await v.nuevaSesion('juezB');
    const antes = v.consultas.length;
    for (const canal of ['obtener-evaluaciones-por-pareja', 'registrar-evaluacion', 'generar-pdf-resultados']) {
        denegado(await v.invoke(canal, v.evento(vieja), 7));
    }
    assert.equal(v.consultas.length, antes); assert.equal(v.efectos.length, 0);
    await v.globals.mainWindow.loadFile('Vistas/Resultados.html');
    const e = v.evento(v.globals.mainWindow);
    assert.equal((await v.invoke('obtener-evaluaciones-por-pareja', e, 7)).success, true);
    assert.deepEqual(v.consultas.at(-1).params, [7, 99]);
    assert.equal((await v.invoke('registrar-evaluacion', e, { nParejaID: 7, nPuntaje: 30, cComentario: '', nJuezID: 12 })).success, true);
    assert.equal(v.consultas.at(-1).params[0], 99);
    assert.equal((await v.invoke('generar-pdf-resultados', e, 12)).success, true);
    assert.equal(v.efectos.find(x => x.pdf).alcance, 99);
});

test('login rechaza emisor ausente, remoto, subframe y copia de login; no sustituye una sesión activa', async () => {
    const v = preparar(); await v.ready();
    const legitimo = v.evento(v.globals.loginWindow);
    const otra = new v.Window(); await otra.loadFile('Vistas/login.html');
    for (const e of [null, {}, v.evento(otra), { ...legitimo, senderFrame: { ...legitimo.senderFrame } }]) denegado(await v.login('admin', e));
    const original = legitimo.senderFrame.url;
    for (const url of ['https://example.test/login.html', pathToFileURL(path.join(root, 'Vistas/Registros.html')).href]) {
        legitimo.senderFrame.url = url; denegado(await v.login('admin', legitimo));
    }
    assert.equal(v.consultas.length, 0); assert.equal(v.sesion.obtenerSesion(), null);
    legitimo.senderFrame.url = original;
    assert.equal((await v.login('user', legitimo)).success, true);
    assert.equal(v.globals.loginWindow.closed, true);
    denegado(await v.login('admin', legitimo));
    denegado(await v.login('admin', v.evento(v.globals.mainWindow)));
    assert.equal(v.consultas.length, 1); assert.equal(v.sesion.obtenerSesion().userRole, 'user');
});

for (const cambio of ['cerrada', 'remota', 'otra-sesion']) {
    test(`login pendiente revalida antes de guardar sesión: ${cambio}`, async () => {
        let resolver;
        const v = preparar({ loginPendiente: () => new Promise(r => { resolver = r; }) }); await v.ready();
        const p = v.login('admin');
        assert.equal((await v.login('user')).code, 'BUSY');
        if (cambio === 'cerrada') v.globals.loginWindow.closed = true; // Destrucción forzada, distinta de una X interceptada.
        if (cambio === 'remota') v.globals.loginWindow.webContents.mainFrame.url = 'https://example.test/';
        if (cambio === 'otra-sesion') v.sesion.guardarSesion(99, 'juez');
        resolver(); denegado(await p);
        assert.equal(v.sesion.obtenerSesion()?.userID ?? null, cambio === 'otra-sesion' ? 99 : null);
        assert.equal(v.globals.mainWindow, undefined);
    });
}

test('login con fallo al cargar ventana revoca la sesión y permite reintentar', async () => {
    const opciones = { fallarPrincipal: true };
    const v = preparar(opciones); await v.ready();
    assert.equal((await v.login('admin')).success, false);
    assert.equal(v.sesion.obtenerSesion(), null); assert.equal(v.globals.mainWindow.closed, true);
    assert.equal(v.globals.loginWindow.closed, undefined);
    opciones.fallarPrincipal = false;
    assert.equal((await v.login('user')).success, true);
});

test('una nueva sesión de la misma cuenta cierra ventanas previas y revoca su configuración', async () => {
    const v = preparar(); await v.ready(); await v.login('admin');
    const vieja = v.globals.mainWindow;
    v.context.openNewWindow('consulta', 'Registros.html');
    const popup = v.ventanas.at(-1);
    v.eventos.get('abrir-ventana-emergente')(v.evento(vieja));
    const config = v.ventanas.at(-1); const ec = v.evento(config);
    assert.equal((await v.invoke('obtener-configuracion', ec)).success, true);
    await v.nuevaSesion('admin');
    assert.equal(vieja.closed, true); assert.equal(popup.closed, true); assert.equal(config.closed, true);
    for (const canal of ['obtener-configuracion', 'guardar-configuracion', 'continuar-configuracion']) denegado(await v.invoke(canal, ec));
});

test('consulta pendiente no devuelve datos al cambiar de sesión', async () => {
    let resolver;
    const v = preparar({ controladorPendiente: () => new Promise(r => { resolver = r; }) });
    await v.ready(); await v.login('user'); await v.globals.mainWindow.loadFile('Vistas/BusquedaParejas.html');
    const p = v.invoke('buscar-pareja-por-id', v.evento(v.globals.mainWindow), 7);
    v.sesion.guardarSesion(1, 'admin'); resolver(); denegado(await p);
});

test('PDF revalida clave de sesión al cerrar el diálogo aunque ID y rol sean iguales', async () => {
    const v = preparar({ dialogo: () => { v.sesion.guardarSesion(1, 'admin'); } });
    await v.ready(); await v.login('admin'); await v.globals.mainWindow.loadFile('Vistas/Registros.html');
    denegado(await v.invoke('generar-pdf-parejas', v.evento(v.globals.mainWindow), () => true));
    assert.deepEqual(v.efectos, ['dialogo']);
});

test('primer arranque conserva configuración sin sesión, pero no acepta login prematuro', async () => {
    const v = preparar({ inicial: true }); await v.ready();
    const config = v.ventanas[0];
    assert.equal((await v.invoke('obtener-configuracion', v.evento(config))).success, true);
    await v.context.createLoginWindow();
    denegado(await v.login('admin'));
    assert.equal(v.consultas.length, 0);
});

test('open-section fue retirado del receptor y de la API genérica del preload', () => {
    const v = preparar(); assert.equal(v.eventos.has('open-section'), false);
    let api; const enviados = [];
    cargar('preload.js', { electron: { contextBridge: { exposeInMainWorld(n, a) { api = a; } },
        ipcRenderer: { send(...args) { enviados.push(args); } } } });
    api.send('open-section', 'Registros'); api.send('login', {});
    assert.equal(enviados.length, 0);
    assert.equal(v.handlers.has('get-usuario-nombre'), true);
    assert.equal(v.handlers.has('cerrar-sesion'), true);
    assert.equal(v.handlers.has('responder-cierre-ventana'), true);
    assert.equal(v.handlers.size + v.eventos.size, 40);
    assert.equal(v.handlers.size, 39);
});

for (const cuenta of ['admin', 'user', 'juezA']) {
    test(`cerrar sesión: ${cuenta} vuelve al login y revoca todas sus ventanas`, async () => {
        const v = preparar(); await v.ready(); await v.login(cuenta);
        const anterior = v.globals.mainWindow;
        v.context.openNewWindow('consulta', 'BusquedaParejas.html');
        const popup = v.ventanas.at(-1);
        anterior.retener = true; // Aun si tarda en cerrar, pierde acceso inmediatamente.
        const evento = v.evento(anterior);
        assert.equal((await v.invoke('cerrar-sesion', evento)).success, true);
        assert.equal(v.sesion.obtenerSesion(), null);
        assert.equal(v.globals.userRole, 'guest');
        assert.equal(v.globals.mainWindow, null);
        assert.equal(popup.closed, true);
        assert.ok(anterior.intentosCerrar > 0);
        assert.match(v.globals.loginWindow.webContents.mainFrame.url, /login.html$/);
        assert.equal(v.globals.loginWindow.closed, undefined);
        denegado(await v.invoke('cerrar-sesion', evento));
        assert.equal((await v.login('user')).success, true);
        denegado(await v.invoke('cerrar-sesion', evento));
        assert.equal(v.sesion.obtenerSesion().userID, 2);
    });
}

test('cerrar sesión: rechaza login, ventanas ajenas y subframes sin revocar la cuenta', async () => {
    const v = preparar(); await v.ready();
    denegado(await v.invoke('cerrar-sesion', v.evento(v.globals.loginWindow)));
    await v.login('admin'); const principal = v.globals.mainWindow;
    const ajena = new v.Window(); await ajena.loadFile('Vistas/MenuPrincipal.html');
    const evento = v.evento(principal);
    for (const invalido of [null, {}, v.evento(ajena), { ...evento, senderFrame: { ...evento.senderFrame } }]) {
        denegado(await v.invoke('cerrar-sesion', invalido));
        assert.equal(v.sesion.obtenerSesion().userRole, 'admin');
    }
});

test('cerrar sesión: fallo al cargar login conserva sesión y ventana; permite reintentar', async () => {
    const opciones = {}, v = preparar(opciones); await v.ready(); await v.login('admin');
    const anterior = v.globals.mainWindow, clave = v.sesion.obtenerClaveSesion();
    opciones.fallarLogin = true;
    assert.equal((await v.invoke('cerrar-sesion', v.evento(anterior))).success, false);
    assert.equal(v.sesion.obtenerClaveSesion(), clave); assert.equal(anterior.closed, undefined);
    assert.equal(v.globals.loginWindow.closed, true);
    opciones.fallarLogin = false;
    assert.equal((await v.invoke('cerrar-sesion', v.evento(anterior))).success, true);
});

test('cerrar sesión: espera operaciones pendientes y rechaza envíos durante la salida', async () => {
    let finalizar;
    const opciones = { controladorPendiente: () => new Promise(r => { finalizar = r; }) };
    const v = preparar(opciones); await v.ready(); await v.login('admin');
    const win = v.globals.mainWindow; await win.loadFile('Vistas/Registros.html'); const e = v.evento(win);
    const operacion = v.invoke('registrar-pareja', e, {});
    assert.equal((await v.invoke('cerrar-sesion', e)).code, 'BUSY');
    finalizar(); await operacion;
    let cargar; opciones.cargarLogin = () => new Promise(r => { cargar = r; });
    const salida = v.invoke('cerrar-sesion', e);
    assert.equal((await v.invoke('cerrar-sesion', e)).code, 'BUSY');
    assert.equal((await v.invoke('registrar-pareja', e, {})).code, 'BUSY');
    assert.equal((await v.login('user')).code, 'BUSY');
    cargar(); assert.equal((await salida).success, true);
});

const solicitudCierre = win => win.enviados.filter(([canal]) => canal === 'solicitar-cierre-ventana').at(-1)?.[1];

test('X y Alt+F4: close se cancela hasta confirmar; cancelar permite seguir y repetir', async () => {
    const v = preparar(); await v.ready(); await v.login('user');
    const win = v.globals.mainWindow, evento = v.evento(win), clave = v.sesion.obtenerClaveSesion();
    win.close(); const solicitud = solicitudCierre(win);
    assert.ok(solicitud); assert.equal(win.closed, undefined);
    win.close(); assert.equal(solicitudCierre(win).id, solicitud.id);
    assert.equal((await v.invoke('responder-cierre-ventana', evento, { id: solicitud.id, confirmado: false })).success, true);
    assert.equal(v.sesion.obtenerClaveSesion(), clave); assert.equal(win.closed, undefined);
    win.close(); const nueva = solicitudCierre(win); assert.notEqual(nueva.id, solicitud.id);
    assert.equal((await v.invoke('responder-cierre-ventana', evento, { id: nueva.id, confirmado: true })).success, true);
    assert.equal(win.closed, true); assert.equal(v.sesion.obtenerSesion(), null);
    assert.equal(solicitudCierre(win).id, nueva.id); // No hay una segunda confirmación.
});

test('confirmar X principal cierra todas sus ventanas; cerrar una consulta conserva la sesión', async () => {
    const v = preparar(); await v.ready(); await v.login('admin');
    const main = v.globals.mainWindow, clave = v.sesion.obtenerClaveSesion();
    v.context.openNewWindow('consulta', 'BusquedaParejas.html'); const popup = v.ventanas.at(-1);
    popup.close(); assert.equal(solicitudCierre(popup).aplicacion, false);
    assert.equal((await v.invoke('responder-cierre-ventana', v.evento(popup), { id: solicitudCierre(popup).id, confirmado: true })).success, true);
    assert.equal(popup.closed, true); assert.equal(v.sesion.obtenerClaveSesion(), clave);
    assert.equal(main.closed, undefined);
    v.context.openNewWindow('consulta', 'BusquedaParejas.html'); const otra = v.ventanas.at(-1);
    main.close();
    await v.invoke('responder-cierre-ventana', v.evento(main), { id: solicitudCierre(main).id, confirmado: true });
    assert.equal(otra.closed, true); assert.equal(solicitudCierre(otra), undefined);
});

test('confirmar X: rechaza emisores ajenos, subframes, IDs falsos, repetidos y otra sesión', async () => {
    const v = preparar(); await v.ready(); await v.login('admin');
    const win = v.globals.mainWindow, e = v.evento(win);
    denegado(await v.invoke('responder-cierre-ventana', e, { id: 1, confirmado: true }));
    win.close(); const id = solicitudCierre(win).id;
    const ajena = new v.Window(); await ajena.loadFile('Vistas/MenuPrincipal.html');
    for (const origen of [null, {}, v.evento(ajena), { ...e, senderFrame: { ...e.senderFrame } }]) {
        denegado(await v.invoke('responder-cierre-ventana', origen, { id, confirmado: true }));
    }
    for (const respuesta of [{ id: id + 1, confirmado: true }, { id, confirmado: 'true' }]) {
        denegado(await v.invoke('responder-cierre-ventana', e, respuesta));
    }
    await v.invoke('responder-cierre-ventana', e, { id, confirmado: false });
    denegado(await v.invoke('responder-cierre-ventana', e, { id, confirmado: true }));
    win.close(); const anterior = solicitudCierre(win).id;
    v.sesion.guardarSesion(2, 'user');
    denegado(await v.invoke('responder-cierre-ventana', e, { id: anterior, confirmado: true }));
    assert.equal(win.closed, undefined);
});

test('confirmar X espera operaciones pendientes, luego permite un nuevo intento', async () => {
    let resolver;
    const v = preparar({ controladorPendiente: () => new Promise(r => { resolver = r; }) });
    await v.ready(); await v.login('user'); const win = v.globals.mainWindow;
    await win.loadFile('Vistas/Registros.html'); const e = v.evento(win);
    win.close(); const id = solicitudCierre(win).id;
    const operacion = v.invoke('registrar-pareja', e, {});
    assert.equal((await v.invoke('responder-cierre-ventana', e, { id, confirmado: true })).code, 'BUSY');
    assert.equal(win.closed, undefined); resolver(); await operacion;
    win.close();
    assert.equal((await v.invoke('responder-cierre-ventana', e, { id: solicitudCierre(win).id, confirmado: true })).success, true);
});

test('login y configuración inicial: una confirmación; login correcto y Salir no añaden diálogos de cierre', async () => {
    const v = preparar(); await v.ready(); const login = v.globals.loginWindow;
    login.close(); const id = solicitudCierre(login).id;
    await v.invoke('responder-cierre-ventana', v.evento(login), { id, confirmado: false });
    await v.login('admin'); assert.equal(login.closed, true);
    const main = v.globals.mainWindow;
    await v.invoke('cerrar-sesion', v.evento(main));
    assert.equal(main.closed, true); assert.equal(solicitudCierre(main), undefined);
    const nuevoLogin = v.globals.loginWindow; nuevoLogin.close();
    await v.invoke('responder-cierre-ventana', v.evento(nuevoLogin), { id: solicitudCierre(nuevoLogin).id, confirmado: true });
    assert.equal(nuevoLogin.closed, true);
    const inicial = preparar({ inicial: true }); await inicial.ready(); const config = inicial.ventanas[0];
    config.close();
    assert.equal((await inicial.invoke('responder-cierre-ventana', inicial.evento(config), { id: solicitudCierre(config).id, confirmado: true })).success, true);
    assert.equal(config.closed, true);
});

test('cerrar durante la carga reenvía la petición cuando termina el documento', async () => {
    const v = preparar(); await v.ready(); await v.login('user'); const win = v.globals.mainWindow;
    win.close(); const id = solicitudCierre(win).id;
    win.webEvents.get('did-finish-load')();
    assert.equal(solicitudCierre(win).id, id); assert.equal(win.closed, undefined);
});

test('preload de cierre: entrega solo la solicitud y retira el listener al salir del documento', () => {
    let api; const listeners = new Map(), invocaciones = [];
    cargar('preload.js', { electron: {
        contextBridge: { exposeInMainWorld(_, value) { api = value; } },
        ipcRenderer: {
            on(c, fn) { listeners.set(c, fn); },
            removeListener(c, fn) { assert.equal(listeners.get(c), fn); listeners.delete(c); },
            invoke(...args) { invocaciones.push(args); }
        }
    } });
    let recibidos;
    const quitar = api.alSolicitarCierre((...args) => { recibidos = args; });
    const solicitud = { id: 3, aplicacion: true };
    listeners.get('solicitar-cierre-ventana')({ sender: 'privado' }, solicitud);
    assert.equal(recibidos.length, 1); assert.equal(recibidos[0], solicitud);
    api.responderCierreVentana(3, false, 'otra ventana');
    assert.equal(invocaciones.length, 1);
    assert.equal(invocaciones[0][0], 'responder-cierre-ventana');
    assert.equal(invocaciones[0][1].id, 3); assert.equal(invocaciones[0][1].confirmado, false);
    quitar(); assert.equal(listeners.size, 0);
});

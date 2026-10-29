const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fileURLToPath, pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const quiet = { log() {}, warn() {}, error() {} };
function cargar(file, deps) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), { module, __dirname: path.dirname(path.join(root, file)), console: quiet,
        require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; }
    }, { filename: file });
    return module.exports;
}
function preparar() {
    const handlers = new Map(), ventanas = [];
    const sesion = cargar('Modelos/sesionModel.js', {});
    const controladores = {};
    const deps = Object.fromEntries([...read('main.js').matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    for (const tipo of ['Registro', 'Modificacion']) {
        const file = `Controladores/borrador${tipo}Controller`;
        controladores[tipo] = cargar(`${file}.js`, {
            '../Modelos/sesionModel': sesion, 'node:path': path, 'node:url': { fileURLToPath }
        });
        deps[`./${file}`] = controladores[tipo];
    }
    class Ventana {
        constructor() {
            this.webContents = { mainFrame: { url: '' }, once() {}, on() {}, send() {} };
            this.eventos = new Map(); ventanas.push(this);
        }
        loadFile(file, options) {
            this.webContents.mainFrame.url = pathToFileURL(path.resolve(root, file)).href + (options?.query ? '?emergente=1' : '');
            return Promise.resolve();
        }
        on(nombre, fn) { this.eventos.set(nombre, fn); }
        maximize() {}
        close() { this.cerrada = true; this.eventos.get('closed')?.(); }
        isDestroyed() { return !!this.cerrada; }
        static fromWebContents(sender) { return ventanas.find(w => w.webContents === sender); }
        static getAllWindows() { return ventanas.filter(w => !w.isDestroyed()); }
        static getFocusedWindow() { return ventanas.at(-1); }
    }
    Object.assign(deps, { path, url: { fileURLToPath }, './Modelos/sesionModel': sesion,
        electron: {
            BrowserWindow: Ventana,
            ipcMain: { handle(c, fn) { handlers.set(c, fn); }, on() {} },
            app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} },
            Menu: { buildFromTemplate(x) { return x; }, setApplicationMenu() {} },
            dialog: { showMessageBoxSync() { assert.fail('No debe haber otra ventana emergente'); } }
        }
    });
    const globals = {};
    const context = vm.createContext({ __dirname: root, console: quiet, global: globals,
        require(name) { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; }
    });
    vm.runInContext(read('main.js'), context, { filename: 'main.js' });
    return { sesion, controladores,
        invoke: (canal, e, ...args) => handlers.get(canal)(e, ...args),
        ventana(vista = 'MenuPrincipal.html', tipo = 'principal') {
            let win;
            if (tipo === 'principal') { context.createMainWindow(); win = globals.mainWindow; }
            else if (tipo === 'emergente') { context.openNewWindow('consulta', vista); win = ventanas.at(-1); }
            else win = new Ventana(); // Misma URL pero nunca registrada por main.
            win.loadFile(path.join(root, 'Vistas', vista), { query: { emergente: '1' } });
            return win;
        },
        evento(win) { return { sender: win.webContents, senderFrame: win.webContents.mainFrame }; }
    };
}
const tipos = [
    { nombre: 'registro', titulo: 'Registro', vistas: ['Registros.html'], versiones: [1] },
    { nombre: 'modificacion', titulo: 'Modificacion', vistas: ['BusquedaParejas.html', 'ModificarParejas.html'], versiones: [1, 2] }
];
test('nombre de perfil: cada ventana solo consulta su sesión y no puede elegir otra cuenta', () => {
    const v = preparar();
    for (const [id, rol, nombre, vista] of [
        [12, 'juez', 'José Juez', 'Resultados.html'],
        [99, 'admin', 'María Administradora', 'Administrador.html']
    ]) {
        v.sesion.guardarSesion(id, rol, nombre);
        const evento = v.evento(v.ventana(vista));
        assert.equal(v.invoke('get-usuario-nombre', evento, { userID: 1, userName: 'Falso' }), nombre);
        const copia = v.sesion.obtenerSesion(); copia.userName = 'Modificado';
        assert.equal(v.invoke('get-usuario-nombre', evento), nombre);
        v.sesion.guardarSesion(55, 'admin', 'Otra cuenta');
        assert.equal(v.invoke('get-usuario-nombre', evento), null);
        const nueva = v.evento(v.ventana(vista));
        assert.equal(v.invoke('get-usuario-nombre', nueva), 'Otra cuenta');
        v.sesion.cerrarSesion();
        assert.equal(v.invoke('get-usuario-nombre', nueva), null);
    }
});
const datos = (version = 1) => ({ version, campos: { nombre: 'Nombre privado' }, fotos: { foto: 'bytes privados' } });
function denegado(r) { assert.equal(r.success, false); assert.equal(r.code, 'FORBIDDEN'); assert.ok(r.error); }
function identidadOculta(v, e) {
    assert.equal(v.invoke('get-role', e), 'guest'); assert.equal(v.invoke('get-usuario-id', e), null);
    assert.equal(v.invoke('get-usuario-nombre', e), null);
}

for (const rol of ['user', 'admin', 'juez', 'guest', 'Admin', null]) {
    test(`sesión y borradores: permisos de ${rol ?? 'sin sesión'}`, () => {
        const v = preparar();
        if (rol) v.sesion.guardarSesion(12, rol);
        for (const tipo of tipos) {
            for (const vista of tipo.vistas) {
                const e = v.evento(v.ventana(vista));
                assert.equal(v.invoke('get-role', e), ['admin', 'user', 'juez'].includes(rol) ? rol : 'guest');
                assert.equal(v.invoke('get-usuario-id', e), ['admin', 'user', 'juez'].includes(rol) ? 12 : null);
                for (const version of tipo.versiones) {
                    const d = datos(version);
                    if (['user', 'admin'].includes(rol)) {
                        assert.equal(v.invoke(`guardar-borrador-${tipo.nombre}`, e, d).success, true);
                        assert.equal(v.invoke(`obtener-borrador-${tipo.nombre}`, e).data, d);
                        assert.equal(v.invoke(`limpiar-borrador-${tipo.nombre}`, e).success, true);
                        assert.equal(v.invoke(`obtener-borrador-${tipo.nombre}`, e).data, null);
                    } else {
                        for (const accion of ['guardar', 'obtener', 'limpiar']) denegado(v.invoke(`${accion}-borrador-${tipo.nombre}`, e, d));
                    }
                }
            }
        }
    });
}

test('navegar y regresar conserva textos y fotos, separados por módulo y ventana', () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'user');
    const win = v.ventana('Registros.html'), e = v.evento(win);
    const registro = datos(), modificacion = datos(2); modificacion.campos.nombre = 'Edición distinta';
    v.invoke('guardar-borrador-registro', e, registro);
    win.loadFile('Vistas/BusquedaParejas.html');
    v.invoke('guardar-borrador-modificacion', e, modificacion);
    win.loadFile('Vistas/ModificarParejas.html');
    assert.equal(v.invoke('obtener-borrador-modificacion', e).data, modificacion);
    const popup = v.ventana('ModificarParejas.html', 'emergente'), p = v.evento(popup);
    assert.equal(v.invoke('get-role', p), 'user');
    assert.equal(v.invoke('obtener-borrador-modificacion', p).data, null);
    v.invoke('guardar-borrador-modificacion', p, datos(2));
    v.invoke('limpiar-borrador-modificacion', p);
    assert.equal(v.invoke('obtener-borrador-modificacion', e).data, modificacion);
    win.loadFile('Vistas/Registros.html');
    assert.equal(v.invoke('obtener-borrador-registro', e).data, registro);
});

test('otra cuenta o un nuevo login de la misma cuenta no recupera ni reenvía borradores anteriores', () => {
    for (const nuevoID of [12, 99]) {
        for (const tipo of tipos) {
            const v = preparar(); v.sesion.guardarSesion(12, 'user');
            const vieja = v.evento(v.ventana(tipo.vistas[0]));
            const popup = v.evento(v.ventana(tipo.vistas[0], 'emergente'));
            const d = datos(tipo.versiones.at(-1));
            v.invoke(`guardar-borrador-${tipo.nombre}`, vieja, d);
            v.invoke(`guardar-borrador-${tipo.nombre}`, popup, d);
            v.sesion.guardarSesion(nuevoID, 'admin');
            for (const e of [vieja, popup]) {
                identidadOculta(v, e);
                for (const accion of ['obtener', 'guardar', 'limpiar']) denegado(v.invoke(`${accion}-borrador-${tipo.nombre}`, e, d));
            }
            const nueva = v.evento(v.ventana(tipo.vistas[0]));
            assert.equal(v.invoke(`obtener-borrador-${tipo.nombre}`, nueva).data, null);
            const nuevo = datos(tipo.versiones.at(-1)); nuevo.campos.nombre = 'Nueva cuenta';
            assert.equal(v.invoke(`guardar-borrador-${tipo.nombre}`, nueva, nuevo).success, true);
            denegado(v.invoke(`limpiar-borrador-${tipo.nombre}`, vieja));
            assert.equal(v.invoke(`obtener-borrador-${tipo.nombre}`, nueva).data, nuevo);
            // Incluso reutilizar directamente el mismo sender no recupera el almacén anterior.
            assert.equal(v.controladores[tipo.titulo][`obtenerBorrador${tipo.titulo}`](vieja).data, null);
        }
    }
});

test('cerrar sesión revoca canales y reiniciar sesión no recupera el borrador previo', () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'user');
    const e = v.evento(v.ventana('Registros.html')); v.invoke('guardar-borrador-registro', e, datos());
    const clave = v.sesion.obtenerClaveSesion();
    v.sesion.cerrarSesion();
    assert.equal(v.sesion.obtenerClaveSesion(), null); identidadOculta(v, e);
    for (const accion of ['guardar', 'obtener', 'limpiar']) denegado(v.invoke(`${accion}-borrador-registro`, e, datos()));
    v.sesion.guardarSesion(12, 'user');
    assert.notEqual(v.sesion.obtenerClaveSesion(), clave);
    assert.equal(v.controladores.Registro.obtenerBorradorRegistro(e).data, null);
    const nueva = v.evento(v.ventana('Registros.html'));
    assert.equal(v.invoke('obtener-borrador-registro', nueva).data, null);
});

test('sesión solo revela escalares propios en vistas conocidas y ventanas de la sesión', () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'juez');
    for (const vista of ['MenuPrincipal.html', 'index.html', 'Administrador.html', 'AdministradorInactivado.html',
        'Registros.html', 'Resultados.html', 'BusquedaParejas.html', 'ModificarParejas.html', 'Parejas.html', 'RegistroCategoriasEstilos.html']) {
        const e = v.evento(v.ventana(vista));
        assert.equal(v.invoke('get-role', e, { rol: 'admin', userID: 99 }), 'juez');
        assert.equal(v.invoke('get-usuario-id', e, 99), 12);
    }
    assert.deepEqual(Object.keys(v.sesion.obtenerSesion()).sort(), ['userID', 'userName', 'userRole']);
    const copia = v.sesion.obtenerSesion(); copia.userRole = 'admin';
    assert.equal(v.sesion.obtenerSesion().userRole, 'juez');
});

test('orígenes inválidos, ventanas cerradas y ventanas no registradas no leen identidad ni borradores', () => {
    const v = preparar(); v.sesion.guardarSesion(12, 'admin', 'Administración privada');
    for (const tipo of tipos) {
        const win = v.ventana(tipo.vistas[0]), e = v.evento(win);
        const d = datos(tipo.versiones.at(-1)); v.invoke(`guardar-borrador-${tipo.nombre}`, e, d);
        const subframe = { ...e, senderFrame: { ...e.senderFrame } };
        const noRegistrada = v.evento(v.ventana(tipo.vistas[0], 'ajena'));
        for (const invalido of [null, {}, { sender: {} }, subframe, noRegistrada]) {
            identidadOculta(v, invalido);
            for (const accion of ['obtener', 'guardar', 'limpiar']) denegado(v.invoke(`${accion}-borrador-${tipo.nombre}`, invalido, d));
        }
        const urlOriginal = e.senderFrame.url;
        for (const url of ['https://example.test/Registros.html', 'malformada',
            pathToFileURL(path.join(root, '..', 'otra-app', 'Vistas', tipo.vistas[0])).href,
            ...['login.html', 'configuracionBD.html', 'desconocida.html'].map(f => pathToFileURL(path.join(root, 'Vistas', f)).href)]) {
            e.senderFrame.url = url; identidadOculta(v, e);
            for (const accion of ['obtener', 'guardar', 'limpiar']) denegado(v.invoke(`${accion}-borrador-${tipo.nombre}`, e, d));
        }
        e.senderFrame.url = urlOriginal;
        assert.equal(v.invoke(`obtener-borrador-${tipo.nombre}`, e).data, d);
        win.close(); identidadOculta(v, e);
        denegado(v.invoke(`obtener-borrador-${tipo.nombre}`, e));
    }
});

test('sesión incompleta y payload falsificado no autorizan ni modifican otro módulo', () => {
    const v = preparar();
    for (const id of [undefined, null, '12', 0, -1, 1.5, Infinity]) {
        v.sesion.guardarSesion(id, 'admin');
        const e = v.evento(v.ventana('Registros.html'));
        identidadOculta(v, e);
        denegado(v.invoke('guardar-borrador-registro', e, datos()));
    }
    v.sesion.guardarSesion(12, 'juez');
    const e = v.evento(v.ventana('Registros.html'));
    denegado(v.invoke('guardar-borrador-registro', { ...e, userRole: 'admin' }, { ...datos(), userID: 99, rol: 'admin' }));
    v.sesion.guardarSesion(12, 'user');
    const nueva = v.evento(v.ventana('Registros.html'));
    const d = datos(); v.invoke('guardar-borrador-registro', nueva, d);
    assert.equal(v.invoke('guardar-borrador-registro', nueva, null).success, false);
    assert.equal(v.invoke('guardar-borrador-registro', nueva, datos(99)).success, false);
    denegado(v.invoke('guardar-borrador-modificacion', nueva, datos(2)));
    assert.equal(v.invoke('obtener-borrador-registro', nueva).data, d);
});

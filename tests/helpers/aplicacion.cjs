// Cargar todo el grafo local real. Solo se sustituyen Electron y la conexión SQL.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');

function aplicacion(db = {}) {
    const cache = new Map(), handlers = new Map(), listeners = new Map(), appEvents = new Map(), windows = [];
    const globals = {};
    let ready;
    class Window {
        constructor(options) {
            this.options = options; this.events = new Map();
            this.webContents = { mainFrame: { url: '' }, getURL: () => this.webContents.mainFrame.url,
                send() {}, on() {}, once() {}, setWindowOpenHandler() {} };
            windows.push(this);
        }
        async loadFile(file) { this.file = file; this.webContents.mainFrame.url = pathToFileURL(file).href; }
        maximize() {} focus() {}
        hide() { this.hidden = true; } show() { this.hidden = false; }
        isDestroyed() { return !!this.closed; }
        close() { this.closed = true; this.events.get('closed')?.(); }
        destroy() { this.close(); }
        on(event, fn) { this.events.set(event, fn); }
        static fromWebContents(sender) { return windows.find(w => w.webContents === sender); }
        static getAllWindows() { return windows.filter(w => !w.closed); }
    }
    const electron = {
        BrowserWindow: Window,
        app: { getPath: () => path.join(os.tmpdir(), 'huapango-test-no-io'),
            whenReady() { return { then(fn) { ready = fn; return { catch() {} }; } }; },
            on(event, fn) { appEvents.set(event, fn); }, quit() {} },
        ipcMain: { handle(canal, fn) { if (handlers.has(canal)) throw Error(`IPC duplicado: ${canal}`); handlers.set(canal, fn); },
            on(canal, fn) { listeners.set(canal, fn); } },
        Menu: { buildFromTemplate: value => value, setApplicationMenu() {} },
        dialog: { showErrorBox() { throw Error('Error al cargar ventana'); } },
        shell: {}, nativeImage: { createFromBuffer() { throw Error('No decodificar en este harness'); } }
    };
    function cargar(file) {
        const absolute = path.resolve(root, file);
        if (cache.has(absolute)) return cache.get(absolute).exports;
        const module = { exports: {} }; cache.set(absolute, module);
        const requireLocal = createRequire(absolute);
        vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), {
            module, exports: module.exports, __dirname: path.dirname(absolute), __filename: absolute,
            global: globals, Buffer, URL, setTimeout, clearTimeout, console: { log() {}, warn() {}, error() {} },
            require(name) {
                if (name === 'electron') return electron;
                const resolved = requireLocal.resolve(name);
                if (resolved === path.join(root, 'db.js')) return {
                    inicializarBaseDatos: async () => {},
                    queryDatabase: async () => { throw Error('SQL no previsto'); },
                    withTransaction: async () => { throw Error('Transacción no prevista'); }, ...db,
                    // Las pruebas de contratos parten de una sesión vigente. Las de
                    // revocación pueden usar sesionDesdeBD:true y su propio fake SQL.
                    queryDatabase: async (sql, args) => {
                        if (sql.includes('/* validar-sesion */') && !db.sesionDesdeBD) {
                            const actual = cargar('Modelos/sesionModel.js').obtenerSesion();
                            return actual ? [{ nUsuarioID: actual.userID, rol: actual.userRole, cContrasena: null }] : [];
                        }
                        if (!db.queryDatabase) throw Error('SQL no previsto');
                        return db.queryDatabase(sql, args);
                    }
                };
                if (name.startsWith('.')) return cargar(resolved);
                return requireLocal(name);
            }
        }, { filename: absolute });
        return module.exports;
    }
    cargar('main.js');
    const sesion = cargar('Modelos/sesionModel.js');
    function evento(vista = 'MenuPrincipal.html') {
        const w = new Window({});
        w.loadFile(path.join(root, 'Vistas', vista));
        return { sender: w.webContents, senderFrame: w.webContents.mainFrame };
    }
    return { handlers, listeners, appEvents, windows, globals, sesion, evento, ready: () => ready(), cargar };
}
module.exports = { aplicacion };

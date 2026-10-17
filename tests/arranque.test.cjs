const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { fileURLToPath, pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");
const quiet = { log() {}, error() {}, warn() {} };
const configValida = { host: "127.0.0.1", port: 3306, user: "operador", password: "clave de prueba", database: "evento" };

function load(file, deps, extra = {}) {
    const module = { exports: {} };
    vm.runInNewContext(source(file), { module, console: quiet, __dirname: root,
        require(name) {
        if (name === "../Seguridad/errores") return require("../Seguridad/errores"); assert.ok(name in deps, `Dependencia inesperada: ${name}`); return deps[name]; },
        ...extra
    }, { filename: file });
    return module.exports;
}

function configuracion(t, fsModule = fs) {
    const tempBase = fs.realpathSync(os.tmpdir());
    const temp = fs.mkdtempSync(path.join(tempBase, "huapango-startup-"));
    t.after(() => {
        const real = fs.realpathSync(temp);
        assert.equal(path.dirname(real), tempBase);
        assert.ok(path.basename(real).startsWith("huapango-startup-"));
        fs.rmSync(real, { recursive: true });
    });
    return load("Modelos/configModel.js", { fs: fsModule, path, crypto, "node:net": require("node:net"),
        electron: { app: { getPath() { return path.join(temp, "usuario-nuevo"); } } }
    });
}

function database(config, overrides = {}) {
    const calls = { connect: [], pools: [], destroyed: 0, released: 0, ended: 0 };
    const driver = {
        async createConnection(options) { calls.connect.push(options); return { destroy() { calls.destroyed++; } }; },
        createPool(options) {
            calls.pools.push(options);
            return { async end() { calls.ended++; }, async getConnection() {
                return { async execute() { return [[{ ok: 1 }]]; }, release() { calls.released++; } };
            } };
        }, ...overrides
    };
    return { calls, db: load("db.js", { "mysql2/promise": driver, "./Modelos/configModel": config,
        "./Servicios/operaciones": require("../Servicios/operaciones"), "node:timers": require("node:timers") }) };
}

test("primer arranque crea directorio y configuración sin credenciales", (t) => {
    const model = configuracion(t);
    const config = model.cargarConfiguracion();
    assert.equal(config.user, "");
    assert.equal(config.password, "");
    assert.equal(config.port, 3306);
    assert.ok(fs.existsSync(model.configPath));
    assert.throws(() => model.normalizarConfiguracion(config), /Completa/);
});

test("una configuración previa se conserva byte por byte y admite el formato sin puerto", (t) => {
    const model = configuracion(t);
    model.inicializarConfiguracion();
    const legacy = { ...configValida };
    delete legacy.port;
    const original = JSON.stringify(legacy);
    fs.writeFileSync(model.configPath, original);
    assert.equal(model.normalizarConfiguracion(model.cargarConfiguracion()).port, 3306);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), original);
});

test("JSON dañado es recuperable y se respalda antes de reemplazarlo", (t) => {
    const model = configuracion(t);
    model.inicializarConfiguracion();
    fs.writeFileSync(model.configPath, "{json dañado");
    assert.throws(() => model.cargarConfiguracion(), /dañado/);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), "{json dañado");
    assert.equal(model.guardarConfiguracion(configValida).success, true);
    const backups = fs.readdirSync(path.dirname(model.configPath)).filter(p => p.startsWith("config.json.backup-"));
    assert.equal(backups.length, 1);
    assert.equal(fs.readFileSync(path.join(path.dirname(model.configPath), backups[0]), "utf8"), "{json dañado");
    assert.equal(model.cargarConfiguracion().user, "operador");
});

test("fallo de reemplazo conserva la configuración y limpia el temporal", (t) => {
    const model = configuracion(t, { ...fs, renameSync() { throw new Error("permiso denegado"); } });
    model.inicializarConfiguracion();
    fs.writeFileSync(model.configPath, JSON.stringify(configValida));
    const original = fs.readFileSync(model.configPath, "utf8");
    assert.equal(model.guardarConfiguracion({ ...configValida, user: "nuevo" }).success, false);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), original);
    assert.equal(fs.readdirSync(path.dirname(model.configPath)).some(p => p.endsWith(".tmp")), false);
});

test("rechaza configuraciones incompletas, puertos inválidos y usuario de sesión antiguo", (t) => {
    const model = configuracion(t);
    for (const invalid of [null, [], {}, { ...configValida, user: 7 }, { ...configValida, host: " " },
        { ...configValida, port: 0 }, { ...configValida, port: "12x" }, { ...configValida, port: 65536 }]) {
        assert.throws(() => model.normalizarConfiguracion(invalid));
    }
    const normalized = model.normalizarConfiguracion({ ...configValida, user: " operador ", password: "  secreto  ", userRole: "admin" });
    assert.equal(normalized.user, "operador");
    assert.equal(normalized.password, "  secreto  ");
    assert.equal(normalized.userRole, undefined);
});

test("importar db no lee configuración ni crea conexiones", async () => {
    const { db, calls } = database({ cargarConfiguracion() { assert.fail("Lectura prematura"); }, normalizarConfiguracion() {} });
    assert.equal(calls.connect.length, 0);
    assert.equal(calls.pools.length, 0);
    await assert.rejects(db.queryDatabase("SELECT 1"), /Configura/);
});

test("el pool solo se crea después de comprobar la conexión y libera las consultas", async (t) => {
    const model = configuracion(t);
    model.guardarConfiguracion(configValida);
    const { db, calls } = database(model);
    await db.inicializarBaseDatos();
    assert.equal(calls.connect[0].connectTimeout, 5000);
    assert.equal(calls.destroyed, 1);
    assert.equal(calls.pools.length, 1);
    assert.equal((await db.queryDatabase("SELECT 1"))[0].ok, 1);
    assert.equal(calls.released, 1);
    await db.inicializarBaseDatos();
    assert.equal(calls.ended, 1);
});

test("una contraseña incorrecta no crea pool ni expone credenciales en el error", async (t) => {
    const model = configuracion(t);
    model.guardarConfiguracion(configValida);
    const { db, calls } = database(model, { async createConnection() {
        throw Object.assign(new Error("datos privados"), { code: "ER_ACCESS_DENIED_ERROR" });
    } });
    await assert.rejects(db.inicializarBaseDatos(), error => {
        assert.match(error.message, /usuario o la contraseña/);
        assert.doesNotMatch(error.message, /privados|clave de prueba/);
        return true;
    });
    assert.equal(calls.pools.length, 0);
});

test("el controlador conserva lo guardado ante conexión fallida y permite reintentar", async (t) => {
    const model = configuracion(t);
    model.guardarConfiguracion(configValida);
    let falla = true;
    const controller = load("Controladores/configController.js", { "../Modelos/configModel": model,
        "../Servicios/operaciones": require("../Servicios/operaciones"), "../db": {
        async probarConexion() { if (falla) throw new Error("Credenciales incorrectas"); }
    } });
    const original = fs.readFileSync(model.configPath, "utf8");
    assert.equal((await controller.handleGuardarConfiguracion(null, { ...configValida, user: "nuevo" })).success, false);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), original);
    falla = false;
    assert.equal((await controller.handleGuardarConfiguracion(null, { ...configValida, user: "nuevo" })).success, true);
    assert.equal(model.cargarConfiguracion().user, "nuevo");
    assert.equal(controller.handleObtenerConfiguracion().data.password, undefined);
});

test("el login mantiene la sesión en memoria y no modifica MySQL config", async (t) => {
    const model = configuracion(t);
    model.guardarConfiguracion(configValida);
    const original = fs.readFileSync(model.configPath, "utf8");
    const sesion = load("Modelos/sesionModel.js", { "../Seguridad/identidad": require("../Seguridad/identidad") });
    const events = [];
    const globals = { loginWindow: { isDestroyed() { return false; }, close() { events.push("cerrar-login"); } } };
    const usuario = { nUsuarioID: 9, rol: "juez", cContrasena: "clave" };
    const auth = load("Controladores/authController.js", {
        bcryptjs: require("bcryptjs"),
        "../Seguridad/identidad": require("../Seguridad/identidad"),
        "../db": { async queryDatabase(sql, params) {
            if (sql.startsWith("UPDATE")) { usuario.cContrasena = params[0]; return { affectedRows: 1 }; }
            return [{ ...usuario }];
        } },
        "../Modelos/sesionModel": sesion
    }, { global: globals });
    assert.equal((await auth.handleLogin(null, { username: "juez", password: "clave" }, () => {
        events.push("abrir-principal");
        globals.mainWindow = { webContents: { once() {} } };
    })).success, true);
    assert.deepEqual(events, ["abrir-principal", "cerrar-login"]);
    assert.equal(sesion.obtenerSesion().userID, 9);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), original);
    sesion.cerrarSesion();
    assert.equal(sesion.obtenerSesion(), null);
});

function mainHarness(inicializarBaseDatos) {
    const handlers = new Map(), appEvents = new Map(), windows = [];
    let ready;
    let quit = 0;
    class Window {
        constructor(options) { this.options = options; this.webContents = {}; this.events = new Map(); windows.push(this); }
        loadFile(file, options) { this.file = file; this.loadOptions = options; return Promise.resolve(); }
        on(event, callback) { this.events.set(event, callback); }
        isDestroyed() { return !!this.closed; }
        close() { this.closed = true; this.events.get("closed")?.(); }
        focus() {}
        static fromWebContents(contents) { return windows.find(w => w.webContents === contents); }
        static getAllWindows() { return windows.filter(w => !w.closed); }
    }
    const deps = Object.fromEntries([...source("main.js").matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    deps.path = path;
    deps.url = { fileURLToPath };
    for (const nombre of Object.keys(deps).filter(n => n.startsWith("./Controladores/"))) {
        deps[nombre] = new Proxy({}, { get: () => () => ({ success: true }) });
    }
    deps["./Controladores/authController"] = { handleLogin: () => {}, autenticacionEnCurso: () => false };
    deps["./Seguridad/ipc"] = require("../Seguridad/ipc");
    deps['./Servicios/rutasVistas'] = {
        obtenerRutasAplicacion: () => require('../Servicios/rutasVistas').crearRutasVistas({ raiz: root })
    };
    deps["./db"] = { inicializarBaseDatos };
    deps["./Modelos/sesionModel"] = load("Modelos/sesionModel.js", { "../Seguridad/identidad": require("../Seguridad/identidad") });
    deps["./Servicios/operaciones"] = require("../Servicios/operaciones");
    deps.electron = {
        BrowserWindow: Window,
        app: { whenReady() { return { then(fn) { ready = fn; return { catch() {} }; } }; }, on(name, fn) { appEvents.set(name, fn); }, quit() { quit++; } },
        ipcMain: { handle(name, fn) { handlers.set(name, fn); }, on() {} },
        Menu: { buildFromTemplate() {}, setApplicationMenu() {} },
        dialog: { showErrorBox() { assert.fail("Diálogo inesperado"); } }
    };
    load("main.js", deps, { global: {} });
    return { ready: () => ready(), windows, handlers, appEvents, get quit() { return quit; } };
}

test("sin configuración main abre el formulario y cerrar no reinicia", async () => {
    const h = mainHarness(async () => { throw new Error("Completa los datos"); });
    await h.ready();
    assert.equal(path.basename(h.windows[0].file), "configuracionBD.html");
    assert.equal(h.windows[0].loadOptions.query.motivo, "Completa los datos");
    h.windows[0].close();
    h.appEvents.get("window-all-closed")();
    assert.equal(h.quit, 1);
});

test("una conexión válida abre login y get-usuario-id ignora archivos", async () => {
    const h = mainHarness(async () => {});
    await h.ready();
    assert.equal(path.basename(h.windows[0].file), "login.html");
    const w = h.windows[0];
    w.webContents.mainFrame = { url: pathToFileURL(w.file).href };
    assert.equal(await h.handlers.get("get-usuario-id")({ sender: w.webContents, senderFrame: w.webContents.mainFrame }), null);
});

test("continuar abre login tras recuperar conexión y rechaza otras vistas", async () => {
    let falla = true;
    const h = mainHarness(async () => { if (falla) throw new Error("Sin conexión"); });
    await h.ready();
    const configWindow = h.windows[0];
    configWindow.webContents.getURL = () => pathToFileURL(configWindow.file).href;
    const continuar = h.handlers.get("continuar-configuracion");
    configWindow.webContents.mainFrame = { url: pathToFileURL(configWindow.file).href };
    const event = { sender: configWindow.webContents, senderFrame: configWindow.webContents.mainFrame };
    assert.equal((await continuar(event)).success, false);
    falla = false;
    assert.equal((await continuar(event)).success, true);
    assert.equal(path.basename(h.windows[1].file), "login.html");
    assert.equal(configWindow.closed, undefined); // La vista se cierra tras recibir su respuesta IPC.
    assert.equal((await continuar({ sender: { getURL: () => "https://example.com" } })).success, false);
});

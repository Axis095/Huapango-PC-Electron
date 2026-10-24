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
    vm.runInNewContext(source(file), { module, setTimeout, clearTimeout, console: quiet, __dirname: root,
        require(name) { assert.ok(name in deps, `Dependencia inesperada: ${name}`); return deps[name]; },
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
    return load("Modelos/configModel.js", { fs: fsModule, path, crypto,
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
    return { calls, db: load("db.js", { "mysql2/promise": driver, "./Modelos/configModel": config }) };
}

test("solo ausencia o plantilla exacta habilitan configuración inicial", (t) => {
    const model = configuracion(t);
    assert.equal(model.requiereConfiguracionInicial(), true);
    model.inicializarConfiguracion();
    assert.equal(model.requiereConfiguracionInicial(), true);
    for (const contenido of ["{roto", "{}", "null", JSON.stringify(configValida),
        JSON.stringify({ ...model.configuracionInicial, host: "otro-servidor" }),
        JSON.stringify({ ...model.configuracionInicial, inicial: true })]) {
        fs.writeFileSync(model.configPath, contenido);
        assert.equal(model.requiereConfiguracionInicial(), false);
        assert.equal(fs.readFileSync(model.configPath, "utf8"), contenido);
    }
});

test("un error de lectura no se considera instalación nueva", (t) => {
    const model = configuracion(t, { ...fs, readFileSync() {
        throw Object.assign(new Error("Sin permiso"), { code: "EACCES" });
    } });
    assert.equal(model.requiereConfiguracionInicial(), false);
});

test("revocar autorización antes de activar MySQL conserva el pool anterior", async () => {
    const { db, calls } = database({ cargarConfiguracion: () => configValida, normalizarConfiguracion: x => x });
    await db.inicializarBaseDatos();
    await assert.rejects(db.inicializarBaseDatos(() => false), { code: "FORBIDDEN" });
    assert.equal(calls.pools.length, 1);
    assert.equal(calls.ended, 0);
    assert.equal(calls.destroyed, 2);
});

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
    const controller = load("Controladores/configController.js", { "../Modelos/configModel": model, "../db": {
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
    const sesion = load("Modelos/sesionModel.js", {});
    const events = [];
    const globals = { loginWindow: { isDestroyed() { return false; }, close() { events.push("cerrar-login"); } } };
    const auth = load("Controladores/authController.js", {
        "../db": { async queryDatabase() { return [{ nUsuarioID: 9, rol: "juez", cContrasena: "clave" }]; } },
        "../Modelos/contrasenaModel": require('../Modelos/contrasenaModel'),
        "../Modelos/sesionModel": sesion
    }, { global: globals });
    assert.equal((await auth.handleLogin(null, { username: "juez", password: "clave" }, () => {
        events.push("abrir-principal");
        globals.mainWindow = { webContents: { once() {} } };
    }, () => true)).success, true);
    assert.deepEqual(events, ["abrir-principal", "cerrar-login"]);
    assert.equal(sesion.obtenerSesion().userID, 9);
    assert.equal(fs.readFileSync(model.configPath, "utf8"), original);
    sesion.cerrarSesion();
    assert.equal(sesion.obtenerSesion(), null);
});

function mainHarness(inicializarBaseDatos, { inicial = false, probarConexion = async () => {} } = {}) {
    const handlers = new Map(), appEvents = new Map(), windows = [];
    const ipcEvents = new Map(), errores = [];
    let menu, guardados = 0;
    let ready;
    let quit = 0;
    class Window {
        constructor(options) {
            this.options = options;
            this.webContents = { mainFrame: { url: "" }, once() {}, on() {} };
            this.events = new Map(); windows.push(this);
        }
        loadFile(file, options) {
            this.file = file; this.loadOptions = options;
            this.webContents.mainFrame.url = pathToFileURL(path.resolve(root, file)).href;
            return Promise.resolve();
        }
        on(event, callback) { this.events.set(event, callback); }
        isDestroyed() { return !!this.closed; }
        close() { this.closed = true; this.events.get("closed")?.(); }
        focus() {}
        maximize() {}
        static fromWebContents(contents) { return windows.find(w => w.webContents === contents); }
        static getAllWindows() { return windows.filter(w => !w.closed); }
    }
    const deps = Object.fromEntries([...source("main.js").matchAll(/require\(["']([^"']+)["']\)/g)].map(m => [m[1], {}]));
    deps.path = path;
    deps.url = { fileURLToPath };
    deps["./db"] = { inicializarBaseDatos };
    deps["./Modelos/sesionModel"] = load("Modelos/sesionModel.js", {});
    const sesion = deps["./Modelos/sesionModel"];
    deps["./Modelos/configModel"] = { requiereConfiguracionInicial: () => inicial };
    deps["./Controladores/configController"] = load("Controladores/configController.js", {
        "../Modelos/configModel": {
            cargarConfiguracion: () => configValida,
            normalizarConfiguracion: x => x,
            configuracionInicial: {},
            guardarConfiguracion() { guardados++; return { success: true }; }
        },
        "../db": { probarConexion }
    });
    // Autenticación simulada; las pruebas de login cubren las credenciales reales.
    deps["./Controladores/authController"] = { async handleLogin(event, { rol }, crear) {
        sesion.guardarSesion(1, rol); await crear(); return { success: true };
    } };
    deps.electron = {
        BrowserWindow: Window,
        app: { whenReady() { return { then(fn) { ready = fn; return { catch() {} }; } }; }, on(name, fn) { appEvents.set(name, fn); }, quit() { quit++; } },
        ipcMain: { handle(name, fn) { handlers.set(name, fn); }, on(name, fn) { ipcEvents.set(name, fn); } },
        Menu: { buildFromTemplate(x) { return x; }, setApplicationMenu(x) { menu = x; } },
        dialog: { showErrorBox(...args) { errores.push(args); } }
    };
    load("main.js", deps, { global: {} });
    return { ready: () => ready(), windows, handlers, appEvents, ipcEvents, errores, sesion,
        evento: win => ({ sender: win.webContents, senderFrame: win.webContents.mainFrame }),
        login: rol => {
            const login = windows.find(w => !w.closed && path.basename(w.file) === "login.html");
            return handlers.get("login")(login ? { sender: login.webContents, senderFrame: login.webContents.mainFrame } : null, { rol });
        },
        get opcion() { return menu.find(x => x.label === "Ayuda").submenu[0].submenu[0]; },
        get configWindow() { return windows.find(w => !w.closed && path.basename(w.file) === "configuracionBD.html"); },
        get guardados() { return guardados; }, get quit() { return quit; } };
}

test("sin configuración main abre el formulario y cerrar no reinicia", async () => {
    const h = mainHarness(async () => { assert.fail("No probar MySQL antes de completar la instalación"); }, { inicial: true });
    await h.ready();
    assert.equal(path.basename(h.windows[0].file), "configuracionBD.html");
    assert.match(h.windows[0].loadOptions.query.motivo, /primera vez/);
    h.windows[0].close();
    h.appEvents.get("window-all-closed")();
    assert.equal(h.quit, 1);
});

test("una conexión válida abre login y get-usuario-id ignora archivos", async () => {
    const h = mainHarness(async () => {});
    await h.ready();
    assert.equal(path.basename(h.windows[0].file), "login.html");
    assert.equal(h.handlers.get("get-usuario-id")(), null);
});

test("continuar abre login tras recuperar conexión y rechaza otras vistas", async () => {
    let falla = true;
    const h = mainHarness(async () => { if (falla) throw new Error("Sin conexión"); }, { inicial: true });
    await h.ready();
    const configWindow = h.windows[0];
    configWindow.webContents.getURL = () => pathToFileURL(configWindow.file).href;
    const continuar = h.handlers.get("continuar-configuracion");
    const event = h.evento(configWindow);
    assert.equal((await continuar(event)).success, false);
    falla = false;
    assert.equal((await continuar(event)).success, true);
    assert.equal(path.basename(h.windows[1].file), "login.html");
    assert.equal(configWindow.closed, undefined); // La vista se cierra tras recibir su respuesta IPC.
    assert.equal((await continuar({ sender: { getURL: () => "https://example.com" } })).success, false);
});

test("PC nueva permite guardar y continuar; después revoca la excepción inicial", async () => {
    const h = mainHarness(async permiso => { assert.equal(permiso(), true); }, { inicial: true });
    await h.ready();
    const e = h.evento(h.configWindow);
    const leer = await h.handlers.get("obtener-configuracion")(e);
    assert.equal(leer.success, true);
    assert.equal(leer.data.password, undefined);
    assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).success, true);
    assert.equal(h.guardados, 1);
    assert.equal((await h.handlers.get("continuar-configuracion")(e)).success, true);
    assert.equal(h.opcion.enabled, false);
    for (const canal of ["obtener-configuracion", "guardar-configuracion", "continuar-configuracion"]) {
        assert.equal((await h.handlers.get(canal)(e, configValida)).code, "FORBIDDEN");
    }
});

test("una conexión existente fallida no habilita configuración sin autenticar", async () => {
    const h = mainHarness(async () => { throw new Error("MySQL detenido"); });
    await h.ready();
    assert.equal(h.windows.length, 0);
    assert.equal(h.errores.length, 1);
    assert.match(h.errores[0][1], /MySQL detenido/);
    assert.equal(h.quit, 1);
    assert.equal(h.opcion.enabled, false);
    h.opcion.click();
    assert.equal(h.windows.length, 0);
});

for (const rol of [null, "user", "juez", "desconocido"]) {
    test(`configuración existente: ${rol ?? "sin sesión"} no abre ni utiliza el formulario`, async () => {
        let pruebas = 0;
        const h = mainHarness(async () => {}, { probarConexion: async () => { pruebas++; } });
        await h.ready();
        if (rol) await h.login(rol);
        assert.equal(h.opcion.enabled, false);
        const emisor = h.windows.at(-1);
        h.ipcEvents.get("abrir-ventana-emergente")(h.evento(emisor));
        h.opcion.click(); // Incluso invocando el callback del menú deshabilitado.
        assert.equal(h.configWindow, undefined);
        emisor.webContents.mainFrame.url = pathToFileURL(path.join(root, "Vistas/configuracionBD.html")).href;
        for (const canal of ["obtener-configuracion", "guardar-configuracion", "continuar-configuracion"]) {
            assert.equal((await h.handlers.get(canal)(h.evento(emisor), configValida)).code, "FORBIDDEN");
        }
        assert.equal(pruebas, 0);
        assert.equal(h.guardados, 0);
    });
}

test("admin abre por IPC, guarda y continúa cerrando la sesión anterior", async () => {
    let conexiones = 0;
    const h = mainHarness(async permiso => { conexiones++; if (permiso) assert.equal(permiso(), true); });
    await h.ready();
    await h.login("admin");
    assert.equal(h.opcion.enabled, true);
    const principal = h.windows.at(-1);
    h.ipcEvents.get("abrir-ventana-emergente")(h.evento(principal));
    assert.ok(h.configWindow);
    const e = h.evento(h.configWindow);
    assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).success, true);
    assert.equal((await h.handlers.get("continuar-configuracion")(e)).success, true);
    assert.equal(conexiones, 2);
    assert.equal(h.guardados, 1);
    assert.equal(h.sesion.obtenerSesion(), null);
    assert.equal(principal.closed, true);
    assert.equal(h.opcion.enabled, false);
    assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).code, "FORBIDDEN");
});

test("solo la instancia autorizada y su frame principal pueden configurar", async () => {
    const h = mainHarness(async () => {});
    await h.ready(); await h.login("admin");
    const principal = h.windows.at(-1);
    // Una página remota en la ventana principal no puede abrir configuración.
    const original = principal.webContents.mainFrame.url;
    principal.webContents.mainFrame.url = "https://example.test/MenuPrincipal.html";
    h.ipcEvents.get("abrir-ventana-emergente")(h.evento(principal));
    assert.equal(h.configWindow, undefined);
    principal.webContents.mainFrame.url = original;
    h.opcion.click();
    const ventana = h.configWindow;
    const e = h.evento(ventana);
    const otro = { sender: { mainFrame: e.senderFrame }, senderFrame: e.senderFrame };
    for (const emisor of [null, {}, otro, { ...e, senderFrame: { ...e.senderFrame } }, h.evento(principal)]) {
        for (const canal of ["obtener-configuracion", "guardar-configuracion", "continuar-configuracion"]) {
            assert.equal((await h.handlers.get(canal)(emisor, configValida)).code, "FORBIDDEN");
        }
    }
    const url = e.senderFrame.url;
    for (const invalida of ["https://example.test/configuracionBD.html", "file:///otra/configuracionBD.html"]) {
        e.senderFrame.url = invalida;
        assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).code, "FORBIDDEN");
    }
    e.senderFrame.url = url;
    ventana.close(); h.opcion.click();
    assert.notEqual(h.configWindow, ventana);
    assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).code, "FORBIDDEN");
    assert.equal(h.guardados, 0);
});

for (const revocar of ["cerrar", "user", "otra cuenta", "sin sesión"]) {
    test(`guardar no persiste si se revoca autorización mientras MySQL responde: ${revocar}`, async () => {
        let resolver;
        const h = mainHarness(async () => {}, {
            probarConexion: () => new Promise(resolve => { resolver = resolve; })
        });
        await h.ready(); await h.login("admin"); h.opcion.click();
        const ventana = h.configWindow;
        const pendiente = h.handlers.get("guardar-configuracion")(h.evento(ventana), configValida);
        if (revocar === "cerrar") ventana.close();
        else if (revocar === "sin sesión") h.sesion.cerrarSesion();
        else h.sesion.guardarSesion(2, revocar === "user" ? "user" : "admin");
        resolver();
        assert.equal((await pendiente).code, "FORBIDDEN");
        assert.equal(h.guardados, 0);
    });
}

test("guardar y continuar no se solapan, ni permiten iniciar otra sesión durante el cambio", async () => {
    let resolver;
    const h = mainHarness(async () => {}, {
        probarConexion: () => new Promise(resolve => { resolver = resolve; })
    });
    await h.ready(); await h.login("admin"); h.opcion.click();
    const e = h.evento(h.configWindow);
    const pendiente = h.handlers.get("guardar-configuracion")(e, configValida);
    assert.equal((await h.handlers.get("guardar-configuracion")(e, configValida)).code, "BUSY");
    assert.equal((await h.handlers.get("continuar-configuracion")(e)).code, "BUSY");
    assert.equal((await h.login("user")).success, false);
    resolver();
    assert.equal((await pendiente).success, true);
    assert.equal(h.guardados, 1);
});

test("continuar revalida autorización antes de activar y no cierra una sesión nueva", async () => {
    let resolver, activaciones = 0;
    const h = mainHarness(async permiso => {
        if (!permiso) return;
        await new Promise(resolve => { resolver = resolve; });
        if (!permiso()) throw Object.assign(new Error("Autorización revocada"), { code: "FORBIDDEN" });
        activaciones++;
    });
    await h.ready(); await h.login("admin"); h.opcion.click();
    const pendiente = h.handlers.get("continuar-configuracion")(h.evento(h.configWindow));
    h.sesion.guardarSesion(2, "user");
    resolver();
    assert.equal((await pendiente).code, "FORBIDDEN");
    assert.equal(activaciones, 0);
    assert.equal(h.sesion.obtenerSesion().userID, 2);
});

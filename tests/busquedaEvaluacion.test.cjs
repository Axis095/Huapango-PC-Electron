const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const quietConsole = { log() {}, error() {}, warn() {} };

// Ejecutar los módulos reales con la única frontera externa (MySQL) sustituida.
function loadCommonJS(file, dependencies) {
    const module = { exports: {} };
    vm.runInNewContext(read(file), {
        module, exports: module.exports, console: quietConsole,
        __dirname: path.dirname(path.join(root, file)),
        require(name) {
            assert.ok(name in dependencies, `Dependencia no simulada: ${name}`);
            return dependencies[name];
        }
    }, { filename: file });
    return module.exports;
}

function backend(queryDatabase) {
    const model = loadCommonJS("Modelos/parejaModel.js", { "../db": { queryDatabase }, "./imagenesModel": { conFotos: async (datos, fn) => fn({ ...datos, oFotoMasculino: null, oFotoFemenino: null }), limpiarFotos: async () => {} } });
    const controller = loadCommonJS("Controladores/parejaController.js", { "../Modelos/parejaModel": model });
    return { model, controller };
}

const pareja = { nParejaID: 42, nombreParticipante1: "Ana", nombreParticipante2: "Luis", categoriaNombre: "Adultos", estiloNombre: "Potosino" };

test("la ficha consulta por ID con parámetros y conserva los campos de evaluación", async () => {
    const calls = [];
    const { controller } = backend(async (sql, params) => {
        calls.push({ sql, params });
        return [pareja];
    });
    const result = await controller.handleBuscarParejaParaEvaluacion(null, " 42 ");
    assert.equal(result.success, true);
    assert.equal(result.data, pareja);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /WHERE\s+p\.nParejaID\s*=\s*\?/i);
    assert.match(calls[0].sql, /LEFT JOIN T_Categorias/);
    assert.match(calls[0].sql, /LEFT JOIN T_Estilos/);
    assert.deepEqual(Array.from(calls[0].params), [42]);
});

test("el controlador rechaza IDs inválidos sin ejecutar SQL", async () => {
    const { controller } = backend(() => assert.fail("No debe consultar SQL"));
    for (const id of [undefined, null, true, {}, Object.create(null), [], "", " ", 0, -1, 1.5, "12abc", "1 OR 1=1", "1e2", Infinity, "9007199254740992"]) {
        const result = await controller.handleBuscarParejaParaEvaluacion(null, id);
        assert.equal(result.success, false);
        assert.equal(result.code, "INVALID_ID");
    }
});

test("una pareja ausente produce NOT_FOUND", async () => {
    const { controller } = backend(async () => []);
    const result = await controller.handleBuscarParejaParaEvaluacion(null, 42);
    assert.equal(result.success, false);
    assert.equal(result.code, "NOT_FOUND");
    assert.ok(result.message);
});

test("un fallo de MySQL produce un mensaje sin detalles de conexión", async () => {
    const { controller } = backend(async () => { throw new Error("host=privado password=secreto"); });
    const result = await controller.handleBuscarParejaParaEvaluacion(null, 42);
    assert.equal(result.code, "QUERY_ERROR");
    assert.doesNotMatch(result.message, /privado|secreto/);
});

test("el listado existente sigue disponible", async () => {
    const { model } = backend(async (sql) => {
        assert.doesNotMatch(sql, /WHERE/);
        return [pareja];
    });
    assert.equal((await model.buscarTodasLasParejas())[0], pareja);
});

test("preload invoca el canal nuevo con el ID", async () => {
    let api;
    const calls = [];
    loadCommonJS("preload.js", { electron: {
        contextBridge: { exposeInMainWorld(name, value) { api = value; } },
        ipcRenderer: { invoke(...args) { calls.push(args); return Promise.resolve(pareja); } }
    } });
    assert.equal(await api.buscarParejaParaEvaluacion(42), pareja);
    assert.deepEqual(calls, [["buscar-pareja-para-evaluacion", 42]]);
});

test("main conecta el canal con el controlador de la búsqueda", () => {
    const handlers = new Map();
    const { controller } = backend(async () => []);
    const dependencies = Object.fromEntries([...read("main.js").matchAll(/require\(["']([^"']+)["']\)/g)].map((m) => [m[1], {}]));
    dependencies.electron = {
        ipcMain: { handle(name, handler) { handlers.set(name, handler); }, on() {} },
        app: { whenReady() { return { then() { return { catch() {} }; } }; }, on() {} }
    };
    dependencies["./Controladores/parejaController"] = controller;
    loadCommonJS("main.js", dependencies);
    assert.equal(handlers.get("buscar-pareja-para-evaluacion"), controller.handleBuscarParejaParaEvaluacion);
});

const toModuleURL = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const viewModule = import(toModuleURL(read("Public/js/busquedaEvaluacion.js")
    .replace('"./validaciones.js"', JSON.stringify(toModuleURL(read("Public/js/validaciones.js"))))
    .replace('"./avisos.js"', JSON.stringify(toModuleURL(read("Public/js/avisos.js"))))));

async function view(api) {
    const elements = new Map();
    for (const id of ["pareja-id", "buscar-pareja", "guardar-evaluacion", "estado-busqueda-pareja", "pareja-id-info", "participante1", "participante2", "categoria", "estilo"]) {
        elements.set(id, { value: "42", textContent: "", disabled: false, handlers: {},
            addEventListener(type, callback) { this.handlers[type] = callback; }
        });
    }
    const get = (id) => elements.get(id);
    const { inicializarBusquedaEvaluacion } = await viewModule;
    inicializarBusquedaEvaluacion({ getElementById: get }, api);
    return { get, click: () => get("buscar-pareja").handlers.click({ preventDefault() {} }) };
}

test("la vista impide solicitudes duplicadas y restaura los controles", async () => {
    let resolve;
    let calls = 0;
    const v = await view({ buscarParejaParaEvaluacion(id) {
        assert.equal(id, 42);
        calls++;
        return new Promise((done) => { resolve = done; });
    } });
    const pending = v.click();
    await v.click();
    assert.equal(calls, 1);
    assert.equal(v.get("buscar-pareja").disabled, true);
    assert.equal(v.get("guardar-evaluacion").disabled, true);
    assert.match(v.get("estado-busqueda-pareja").textContent, /Buscando/);
    resolve({ success: true, data: pareja });
    await pending;
    assert.equal(v.get("participante1").textContent, "Ana");
    assert.equal(v.get("categoria").textContent, "Adultos");
    assert.equal(v.get("guardar-evaluacion").disabled, false);
    assert.equal(v.get("buscar-pareja").disabled, false);
    assert.equal(v.get("pareja-id").disabled, false);
});

test("una búsqueda fallida limpia la pareja anterior y muestra el error", async () => {
    let response = { success: true, data: pareja };
    const v = await view({ buscarParejaParaEvaluacion: async () => response });
    await v.click();
    response = { success: false, message: "No existe esa pareja." };
    await v.click();
    assert.equal(v.get("pareja-id-info").textContent, "--");
    assert.equal(v.get("guardar-evaluacion").disabled, true);
    assert.equal(v.get("estado-busqueda-pareja").textContent, response.message);
    assert.equal(v.get("buscar-pareja").disabled, false);
});

test("editar el ID invalida la ficha anterior", async () => {
    const v = await view({ buscarParejaParaEvaluacion: async () => ({ success: true, data: pareja }) });
    await v.click();
    v.get("pareja-id").value = "43";
    v.get("pareja-id").handlers.input();
    assert.equal(v.get("pareja-id-info").textContent, "--");
    assert.equal(v.get("guardar-evaluacion").disabled, true);
});

test("IDs parciales o inválidos no provocan solicitudes desde la vista", async () => {
    const v = await view({ buscarParejaParaEvaluacion() { assert.fail("No debe invocar IPC"); } });
    for (const id of ["", "12abc", "-1", "0", "1.5", "9007199254740992"]) {
        v.get("pareja-id").value = id;
        await v.click();
        assert.match(v.get("estado-busqueda-pareja").textContent, /entero y positivo/);
        assert.equal(v.get("guardar-evaluacion").disabled, true);
    }
});

test("categoría y estilo ausentes mantienen los textos predeterminados", async () => {
    const v = await view({ buscarParejaParaEvaluacion: async () => ({ success: true, data: { ...pareja, categoriaNombre: null, estiloNombre: null } }) });
    await v.click();
    assert.equal(v.get("categoria").textContent, "Sin categoría");
    assert.equal(v.get("estilo").textContent, "Sin estilo");
});

test("un rechazo de IPC permite volver a buscar", async (t) => {
    t.mock.method(console, "error", () => {});
    const v = await view({ buscarParejaParaEvaluacion: async () => { throw new Error("IPC no disponible"); } });
    await v.click();
    assert.equal(v.get("buscar-pareja").disabled, false);
    assert.equal(v.get("pareja-id").disabled, false);
    assert.equal(v.get("guardar-evaluacion").disabled, true);
    assert.match(v.get("estado-busqueda-pareja").textContent, /Intenta nuevamente/);
});

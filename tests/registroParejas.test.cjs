const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString("base64")}`;
const modulo = import(url(read("Public/js/registroParejas.js").replace('"./fotos.js"', JSON.stringify(url(read("Public/js/fotos.js")))).replace('"./validaciones.js"', JSON.stringify(url(read("Public/js/validaciones.js"))))));

async function vista(apiExtra = {}, almacen = { data: null }) {
    const elementos = new Map();
    const documento = { activeElement: null };
    const get = id => {
        if (!elementos.has(id)) elementos.set(id, {
            id, value: "", disabled: false, hidden: true, textContent: "", dataset: {}, style: {}, files: [],
            handlers: {}, placeholder: id, options: [{ text: "Selecciona" }, { text: "Prueba" }], selectedIndex: 1,
            addEventListener(nombre, fn) { this.handlers[nombre] = fn; },
            getAttribute() { return null; }, focus() { documento.activeElement = this; }
        });
        return elementos.get(id);
    };
    for (const id of ["sexoMasculino", "sexoFemenino"]) get(id).value = id === "sexoMasculino" ? "M" : "F";
    documento.getElementById = get;
    documento.querySelector = selector => get(selector);
    const navegaciones = [], registros = [], categorias = [];
    const api = {
        async obtenerBorradorRegistro() { return { success: true, data: structuredClone(almacen.data) }; },
        async guardarBorradorRegistro(datos) { almacen.data = structuredClone(datos); return { success: true }; },
        async limpiarBorradorRegistro() { almacen.data = null; return { success: true }; },
        async registrarPareja(datos) { registros.push(datos); return { success: true, id: datos.nParejaID }; },
        async registrarCategoria(datos) { categorias.push(datos); return { success: true }; },
        async registrarEstilo() { return { success: true }; },
        ...apiExtra
    };
    const { inicializarRegistros } = await modulo;
    await inicializarRegistros(documento, api, destino => navegaciones.push(destino));
    return {
        get, documento, almacen, registros, categorias, navegaciones,
        click: id => get(id).handlers.click(),
        async navegar() {
            let detenido = false;
            await get(".menu").handlers.click({ target: { closest: () => ({ id: "btnBusquedaParejas" }) },
                preventDefault() {}, stopImmediatePropagation() { detenido = true; } });
            assert.equal(detenido, true);
        },
        completar() {
            for (const lado of ["Masculino", "Femenino"]) {
                get(`nombre${lado}`).value = "Nombre";
                get(`apellido${lado}`).value = "Apellido";
                get(`email${lado}`).value = "prueba@example.test";
                get(`telefono${lado}`).value = "4441234567";
                get(`fechaNacimiento${lado}`).value = "2000-01-01";
            }
            get("nParejaID").value = "123";
        }
    };
}

test("correo vacío: conserva formulario y foto, enfoca el campo y permite corregir y guardar", async () => {
    const v = await vista(); v.completar();
    const foto = new File(["foto"], "prueba.png", { type: "image/png" });
    v.get("fotoMasculino").files = [foto];
    v.get("emailMasculino").value = "";
    await v.click("BTNSave");
    assert.equal(v.registros.length, 0);
    assert.match(v.get("estadoRegistroPareja").textContent, /Completa/);
    assert.equal(v.documento.activeElement, v.get("emailMasculino"));
    assert.equal(v.get("nombreMasculino").value, "Nombre");
    assert.equal(v.get("fotoMasculino").files[0], foto);
    assert.equal(v.get("emailMasculino").disabled, false);
    v.get("emailMasculino").value = "corregido@example.test";
    await v.click("BTNSave");
    assert.equal(v.registros.length, 1);
    assert.equal(v.registros[0].fotos.Masculino.nombre, "prueba.png");
    assert.equal(Buffer.from(v.registros[0].fotos.Masculino.bytes).toString(), "foto");
    assert.equal(v.registros[0].oFotoMasculino, undefined);
    assert.match(v.get("estadoRegistroPareja").textContent, /guardada en la base/);
});

test("foto demasiado grande no se lee ni se envía; corregirla permite guardar sin perder campos", async () => {
    const v = await vista(); v.completar();
    v.get("fotoMasculino").files = [{ name: "grande.jpg", size: 5 * 1024 * 1024 + 1,
        arrayBuffer() { assert.fail("No cargar una foto que excede el límite"); } }];
    await v.click("BTNSave");
    assert.equal(v.registros.length, 0);
    assert.match(v.get("estadoRegistroPareja").textContent, /5 MiB/);
    assert.equal(v.get("nombreMasculino").value, "Nombre");
    v.get("fotoMasculino").files = [new File(["foto"], "valida.jpg", { type: "image/jpeg" })];
    await v.click("BTNSave");
    assert.equal(v.registros.length, 1);
});

test("error de formato y rechazo de MySQL no limpian los campos ni bloquean un reintento", async () => {
    let consultas = 0;
    const v = await vista({ async registrarPareja() { consultas++; return { success: false, error: "ID duplicado" }; } });
    v.completar(); v.get("emailFemenino").value = "incorrecto";
    await v.click("BTNSave");
    assert.equal(consultas, 0);
    v.get("emailFemenino").value = "prueba@example.test";
    await v.click("BTNSave");
    assert.equal(consultas, 1);
    assert.equal(v.get("nombreFemenino").value, "Nombre");
    assert.equal(v.get("BTNSave").disabled, false);
    assert.match(v.get("estadoRegistroPareja").textContent, /duplicado/);
});

test("cambiar de módulo y regresar recupera el borrador y los bytes de las fotos", async () => {
    const original = global.DataTransfer;
    global.DataTransfer = class { constructor() { this.files = []; this.items = { add: f => this.files.push(f) }; } };
    try {
        const almacen = { data: null };
        const v = await vista({}, almacen); v.completar();
        v.get("emailMasculino").value = "";
        v.get("fotoMasculino").files = [new File(["contenido"], "foto.png", { type: "image/png" })];
        await v.navegar();
        assert.equal(v.navegaciones.length, 1);
        const otra = await vista({}, almacen);
        assert.equal(otra.get("nombreMasculino").value, "Nombre");
        assert.equal(otra.get("emailMasculino").value, "");
        assert.equal(otra.get("fotoMasculino").files[0].name, "foto.png");
        assert.equal(await otra.get("fotoMasculino").files[0].text(), "contenido");
        assert.match(otra.get("estadoRegistroPareja").textContent, /Todavía no/);
    } finally { if (original) global.DataTransfer = original; else delete global.DataTransfer; }
});

test("si falla la conservación del borrador se impide navegar y se mantiene el formulario editable", async () => {
    const v = await vista({ async guardarBorradorRegistro() { throw new Error("IPC no disponible"); } });
    v.completar(); await v.navegar();
    assert.equal(v.navegaciones.length, 0);
    assert.equal(v.get("nombreMasculino").value, "Nombre");
    assert.equal(v.get("nombreMasculino").disabled, false);
    assert.match(v.get("estadoBorradorRegistro").textContent, /Permanece/);
});

test("espera la serialización de una foto antes de navegar", async () => {
    let resolver;
    const v = await vista(); v.completar();
    v.get("fotoMasculino").files = [{ name: "foto.png", type: "image/png", lastModified: 1, size: 3,
        arrayBuffer: () => new Promise(resolve => { resolver = resolve; }) }];
    const pendiente = v.navegar();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(v.navegaciones.length, 0);
    resolver(new Uint8Array([1, 2, 3]).buffer);
    await pendiente;
    assert.equal(v.navegaciones.length, 1);
});

test("evita doble guardado y navegación mientras MySQL responde", async () => {
    let resolver, llamadas = 0;
    const v = await vista({ registrarPareja() { llamadas++; return new Promise(resolve => { resolver = resolve; }); } });
    v.completar(); const pendiente = v.click("BTNSave");
    await v.click("BTNSave"); await v.navegar();
    assert.equal(llamadas, 1); assert.equal(v.navegaciones.length, 0);
    resolver({ success: true, id: "123" }); await pendiente;
    await v.click("BTNSave"); assert.equal(llamadas, 1);
});

test("una pareja guardada se recupera sin reinsertarla y categoría usa el ID confirmado", async () => {
    const almacen = { data: null };
    const v = await vista({}, almacen); v.completar(); await v.click("BTNSave");
    const otra = await vista({}, almacen);
    assert.equal(otra.get("BTNSave").disabled, true);
    assert.equal(otra.get("nParejaIDCategoria").value, "123");
    otra.get("categoriaRegistro").value = "4"; otra.get("nIDCategoria").value = "4";
    await otra.click("btnRegistrarCategoria");
    assert.equal(otra.categorias[0].nParejaID, "123");
    await otra.click("btnRegistrarCategoria"); assert.equal(otra.categorias.length, 1);
});

test("iniciar otra pareja requiere confirmación; cancelar conserva el borrador", async () => {
    const v = await vista(); v.completar(); await v.navegar();
    await v.click("btnNuevaPareja"); await v.click("btnCancelarNuevaPareja");
    assert.equal(v.get("nombreMasculino").value, "Nombre");
    assert.ok(v.almacen.data);
    await v.click("btnNuevaPareja"); await v.click("btnConfirmarNuevaPareja");
    assert.equal(v.get("nombreMasculino").value, "");
    assert.equal(v.almacen.data, null);
});

test("fallo al recuperar borrador no lo sobrescribe y permite reabrir el módulo", async () => {
    let escrituras = 0;
    const v = await vista({ async obtenerBorradorRegistro() { throw new Error("fallo"); },
        async guardarBorradorRegistro() { escrituras++; return { success: true }; } });
    assert.equal(v.get("BTNSave").disabled, true);
    await v.navegar(); assert.equal(v.navegaciones.length, 1);
    assert.equal(escrituras, 0);
});

test("un fallo al conservar el borrador después de guardar no anuncia un fallo de MySQL", async () => {
    const v = await vista({ async guardarBorradorRegistro() { return { success: false }; } });
    v.completar(); await v.click("BTNSave");
    assert.equal(v.registros.length, 1);
    assert.match(v.get("estadoRegistroPareja").textContent, /guardada en la base/);
    assert.equal(v.get("BTNSave").disabled, true);
});

test("los borradores están aislados por ventana y se rechazan otras vistas y subframes", () => {
    const c = require("../Controladores/borradorRegistroController");
    const crear = () => { const frame = { url: pathToFileURL(path.join(root, "Vistas/Registros.html")).href };
        return { senderFrame: frame, sender: { mainFrame: frame } }; };
    const uno = crear(), dos = crear();
    const datos = { version: 1, campos: { nombre: "Prueba" }, fotos: {} };
    assert.equal(c.guardarBorradorRegistro(uno, datos).success, true);
    assert.equal(c.obtenerBorradorRegistro(dos).data, null);
    assert.equal(c.obtenerBorradorRegistro(uno).data, datos);
    assert.equal(c.obtenerBorradorRegistro({ ...uno, senderFrame: { ...uno.senderFrame } }).success, false);
    uno.senderFrame.url = pathToFileURL(path.join(root, "Vistas/Resultados.html")).href;
    assert.equal(c.limpiarBorradorRegistro(uno).success, false);
    uno.senderFrame.url = pathToFileURL(path.join(root, "Vistas/Registros.html")).href;
    assert.equal(c.limpiarBorradorRegistro(uno).success, true);
    assert.equal(c.obtenerBorradorRegistro(uno).data, null);
});

test("el HTML no repite IDs y la vista de registro no utiliza alert ni confirm", () => {
    const html = read("Vistas/Registros.html");
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(ids.length, new Set(ids).size);
    assert.doesNotMatch(read("Public/js/registroParejas.js"), /\b(?:alert|confirm)\s*\(/);
    assert.doesNotMatch(read("Public/js/render.js"), /function inicializarRegistros\(/);
    for (const canal of ["obtener", "guardar", "limpiar"]) {
        assert.ok(read("main.js").includes(`ipcMain.handle("${canal}-borrador-registro"`));
        assert.ok(read("preload.js").includes(`ipcRenderer.invoke("${canal}-borrador-registro"`));
    }
});

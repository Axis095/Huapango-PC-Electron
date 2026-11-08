const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "Public/js/busquedaParejas.js"), "utf8");
const vista = import(`data:text/javascript;base64,${Buffer.from(source.replace('"./validaciones.js"', JSON.stringify(`data:text/javascript;base64,${Buffer.from(fs.readFileSync(path.join(root, 'Public/js/validaciones.js'), 'utf8')).toString('base64')}`))).toString("base64")}`);
const consultas = [
    ["Parejas", "nParejaID", "btnBuscarPareja", "buscarParejaPorID"],
    ["Categorias", "nIDCategoria", "btnBuscarCategoria", "buscarCategoriaPorID"],
    ["Estilos", "nEstiloID", "btnBuscarEstilo", "buscarEstiloPorID"]
];

async function preparar(consulta, responder) {
    const [tipo, inputID, botonID, metodo] = consulta;
    const elementos = new Map();
    const documento = { activeElement: null };
    class Elemento {
        constructor(tag = "div") {
            this.tagName = tag; this.children = []; this.handlers = {}; this.dataset = {};
            this.attributes = {}; this.disabled = false; this.value = "1"; this.texto = "";
        }
        get textContent() { return this.texto + this.children.map(e => e.textContent).join(""); }
        set textContent(value) { this.texto = value; this.children = []; }
        set innerHTML(value) { assert.fail("Los resultados no deben interpretarse como HTML"); }
        append(...nodes) { this.children.push(...nodes); }
        replaceChildren() { this.children = []; this.texto = ""; }
        addEventListener(event, fn) { this.handlers[event] = fn; }
        setAttribute(key, value) { this.attributes[key] = value; }
        focus() { documento.activeElement = this; }
    }
    const get = id => elementos.get(id);
    for (const id of [inputID, botonID, `estadoBusqueda${tipo}`, `resultadosBusqueda${tipo}`]) elementos.set(id, new Elemento());
    documento.getElementById = get;
    documento.querySelector = selector => get(selector.slice(1));
    documento.createElement = tag => new Elemento(tag);
    documento.createTextNode = text => { const e = new Elemento("#text"); e.textContent = text; return e; };
    const { inicializarBusquedaParejas } = await vista;
    inicializarBusquedaParejas(documento, { [metodo]: responder });
    const input = get(inputID), boton = get(botonID);
    return {
        input, boton, documento, estado: get(`estadoBusqueda${tipo}`), resultados: get(`resultadosBusqueda${tipo}`),
        click() { boton.focus(); return boton.handlers.click({ preventDefault() {} }); },
        editar(valor) { input.value = valor; input.focus(); input.handlers.input(); }
    };
}

for (const consulta of consultas) {
    test(`${consulta[0]}: encontrado → inexistente → encontrado sin diálogo ni cambio de pestaña`, async () => {
        const v = await preparar(consulta, async id => id === "1"
            ? { success: true, data: [{ nombre: "Pareja de prueba" }] }
            : { success: false, message: "No se encontró ninguna pareja con ese ID." });
        await v.click();
        assert.match(v.resultados.textContent, /Pareja de prueba/);
        v.editar("11");
        await v.click();
        assert.match(v.estado.textContent, /No se encontró/);
        assert.equal(v.resultados.textContent, "");
        assert.equal(v.input.disabled, false);
        assert.equal(v.boton.disabled, false);
        assert.equal(v.documento.activeElement, v.input);
        v.editar("1");
        await v.click();
        assert.match(v.resultados.textContent, /Pareja de prueba/);
        assert.equal(v.estado.textContent, "Consulta completada.");
    });

    test(`${consulta[0]}: fallo IPC recuperable y sin exponer detalles de conexión`, async () => {
        let fallar = true;
        const v = await preparar(consulta, async () => {
            if (fallar) throw new Error("password=privado");
            return { success: true, data: [] };
        });
        await v.click();
        assert.match(v.estado.textContent, /Intenta nuevamente/);
        assert.doesNotMatch(v.estado.textContent, /privado/);
        assert.equal(v.boton.disabled, false);
        assert.equal(v.input.disabled, false);
        fallar = false;
        await v.click();
        assert.match(v.estado.textContent, /No se encontró/);
    });
}

test("IDs inválidos se indican en la vista sin invocar IPC", async () => {
    const v = await preparar(consultas[0], () => assert.fail("No debe consultar"));
    for (const id of ["", " ", "0", "-1", "1.5", "1e2", "1abc", "9007199254740992"]) {
        v.editar(id);
        await v.click();
        assert.match(v.estado.textContent, /entero y positivo/);
        assert.equal(v.documento.activeElement, v.input);
    }
});

test("una consulta pendiente evita duplicados, permite editar y descarta datos del ID anterior", async () => {
    let resolver, llamadas = 0;
    const v = await preparar(consultas[0], () => { llamadas++; return new Promise(resolve => { resolver = resolve; }); });
    const pendiente = v.click();
    assert.equal(v.boton.disabled, true);
    assert.equal(v.input.disabled, false);
    assert.equal(v.resultados.attributes["aria-busy"], "true");
    await v.click();
    assert.equal(llamadas, 1);
    v.editar("2");
    resolver({ success: true, data: [{ nombre: "Dato anterior" }] });
    await pendiente;
    assert.equal(v.resultados.textContent, "");
    assert.equal(v.estado.textContent, "");
    assert.equal(v.boton.disabled, false);
    assert.equal(v.resultados.attributes["aria-busy"], "false");
});

test("una respuesta tardía no roba el foco de otro control", async () => {
    let resolver;
    const v = await preparar(consultas[0], () => new Promise(resolve => { resolver = resolve; }));
    const pendiente = v.click();
    const otroCampo = {};
    v.documento.activeElement = otroCampo;
    resolver({ success: false, message: "No existe." });
    await pendiente;
    assert.equal(v.documento.activeElement, otroCampo);
});

test("Enter permite consultar y los datos se presentan como texto", async () => {
    const texto = '<img src=x onerror="alert(1)">';
    const v = await preparar(consultas[0], async () => ({ success: true, data: [{ nombre: texto }] }));
    v.input.focus();
    await v.input.handlers.keydown({ key: "Enter", preventDefault() {} });
    assert.match(v.resultados.textContent, /<img/);
    const linea = v.resultados.children[0].children[0];
    assert.equal(linea.children[1].tagName, "#text");
    assert.equal(linea.children[1].textContent, texto);
});

test("la página conecta los tres estados con sus campos y el nuevo módulo", () => {
    const html = fs.readFileSync(path.join(root, "Vistas/BusquedaParejas.html"), "utf8");
    const render = fs.readFileSync(path.join(root, "Public/js/render.js"), "utf8");
    for (const [tipo] of consultas) {
        assert.ok(html.includes(`aria-describedby="estadoBusqueda${tipo}"`));
        assert.match(html, new RegExp(`id="estadoBusqueda${tipo}"[^>]+role="status"`));
    }
    assert.match(render, /import \{ inicializarBusquedaParejas \} from "\.\/busquedaParejas.js"/);
    assert.match(render, /inicializarBusquedaParejas\(\);/);
    assert.doesNotMatch(render, /function (buscarPareja|buscarCategoria|buscarEstilo|inicializarBusquedaParejas)\(/);
});

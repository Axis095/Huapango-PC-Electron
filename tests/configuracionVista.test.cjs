const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../Public/js/configuracionBD.js"), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));

async function vista(overrides = {}, search = "") {
    const elements = new Map();
    for (const id of ["formConfiguracion", "camposConfiguracion", "estadoConfiguracion", "btnContinuarConfiguracion", "HostBaseDatos", "PuertoBaseDatos", "UsuarioBaseDatos", "ContrasenaBaseDatos", "database"]) {
        elements.set(id, { value: "", textContent: "", disabled: false, hidden: true, events: {},
            addEventListener(event, fn) { this.events[event] = fn; }
        });
    }
    let closed = 0;
    const api = {
        async obtenerConfiguracion() { return { success: true, data: { host: "127.0.0.1", port: 3306, user: "operador", database: "evento" } }; },
        async guardarConfiguracion() { return { success: true }; },
        async continuarConfiguracion() { return { success: true }; },
        ...overrides
    };
    const get = id => elements.get(id);
    vm.runInNewContext(source, { document: { getElementById: get }, URLSearchParams,
        window: { api, location: { search }, close() { closed++; } }
    });
    await tick();
    return { get, submit: () => get("formConfiguracion").events.submit({ preventDefault() {} }),
        continue: () => get("btnContinuarConfiguracion").events.click(), get closed() { return closed; } };
}

test("el formulario muestra el error inicial y nunca precarga una contraseña", async () => {
    const v = await vista({}, "?motivo=Conexi%C3%B3n%20rechazada");
    assert.equal(v.get("estadoConfiguracion").textContent, "Conexión rechazada");
    assert.equal(v.get("UsuarioBaseDatos").value, "operador");
    assert.equal(v.get("ContrasenaBaseDatos").value, "");
    assert.equal(v.get("camposConfiguracion").disabled, false);
});

test("un error de lectura permite completar los datos de nuevo", async () => {
    const v = await vista({ obtenerConfiguracion: async () => { throw new Error("IPC"); } });
    assert.match(v.get("estadoConfiguracion").textContent, /introducir los datos/);
    assert.equal(v.get("camposConfiguracion").disabled, false);
});

test("guardar bloquea duplicados y permite reintentar ante credenciales rechazadas", async () => {
    let resolve, llamadas = 0;
    const v = await vista({ guardarConfiguracion() {
        llamadas++;
        return new Promise(done => { resolve = done; });
    } });
    const pending = v.submit();
    await v.submit();
    assert.equal(llamadas, 1);
    assert.equal(v.get("camposConfiguracion").disabled, true);
    resolve({ success: false, error: "Credenciales incorrectas" });
    await pending;
    assert.equal(v.get("estadoConfiguracion").textContent, "Credenciales incorrectas");
    assert.equal(v.get("camposConfiguracion").disabled, false);
    assert.equal(v.get("btnContinuarConfiguracion").hidden, true);
    const next = v.submit();
    resolve({ success: true });
    await next;
    assert.equal(v.get("btnContinuarConfiguracion").hidden, false);
    v.get("formConfiguracion").events.input();
    assert.equal(v.get("btnContinuarConfiguracion").hidden, true);
});

test("continuar espera la respuesta y conserva el formulario si falla", async () => {
    let falla = true;
    const v = await vista({ continuarConfiguracion: async () => falla ? { success: false, error: "Servidor desconectado" } : { success: true } });
    await v.continue();
    assert.equal(v.closed, 0);
    assert.equal(v.get("estadoConfiguracion").textContent, "Servidor desconectado");
    assert.equal(v.get("btnContinuarConfiguracion").disabled, false);
    falla = false;
    await v.continue();
    assert.equal(v.closed, 1);
});

for (const etapa of ["obtenerConfiguracion", "guardarConfiguracion", "continuarConfiguracion"]) {
    test(`FORBIDDEN en ${etapa} bloquea el formulario y nuevas solicitudes`, async () => {
        let llamadas = 0;
        const v = await vista({ [etapa]: async () => {
            llamadas++;
            return { success: false, code: "FORBIDDEN", error: "Sesión sin permiso." };
        } });
        if (etapa === "guardarConfiguracion") await v.submit();
        if (etapa === "continuarConfiguracion") await v.continue();
        assert.equal(v.get("camposConfiguracion").disabled, true);
        assert.equal(v.get("btnContinuarConfiguracion").hidden, true);
        assert.match(v.get("estadoConfiguracion").textContent, /sin permiso/);
        await v.submit(); await v.continue();
        assert.equal(llamadas, 1);
        assert.equal(v.closed, 0);
    });
}

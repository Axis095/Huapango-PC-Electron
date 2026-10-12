const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const url = texto => `data:text/javascript;base64,${Buffer.from(texto).toString('base64')}`;
const modulo = import(url(read('Public/js/borradorModificacion.js').replace('"./fotos.js"', JSON.stringify(url(read('Public/js/fotos.js'))))));
// Node no implementa DataTransfer. La prueba reconstruye los mismos File/bytes.
global.DataTransfer = class {
    files = [];
    items = { add: archivo => this.files.push(archivo) };
};
const tick = () => new Promise(resolve => setImmediate(resolve));
async function vista({ almacen = { data: null }, apiExtra = {}, guardar } = {}) {
    const mapa = new Map();
    const html = read('Vistas/ModificarParejas.html').replace(/<!--[\s\S]*?-->/g, '');
    const get = id => {
        if (!mapa.has(id)) {
            const e = { id, type: 'text', disabled: false, hidden: true, dataset: {}, textContent: '', handlers: {}, files: [], isConnected: true,
                focus() { documento.activeElement = this; },
                addEventListener(nombre, fn, capture) { this.handlers[nombre] = fn; if (capture) this.capture = true; } };
            let value = '';
            Object.defineProperty(e, 'value', { get: () => value, set: v => { value = v; if (e.type === 'file' && v === '') e.files = []; } });
            mapa.set(id, e);
        }
        return mapa.get(id);
    };
    const campos = [...html.matchAll(/<input\b[^>]*>/g)].map(([tag]) => {
        const id = /\bid="([^"]+)"/.exec(tag)[1];
        const e = get(id); e.type = /\btype="([^"]+)"/.exec(tag)[1]; return e;
    });
    const documento = { getElementById: get, querySelector: get, querySelectorAll: () => campos };
    const navegaciones = [], escrituras = [];
    let guardados = 0;
    const api = {
        async obtenerBorradorModificacion() { return { success: true, data: structuredClone(almacen.data) }; },
        async guardarBorradorModificacion(datos) { escrituras.push(structuredClone(datos)); almacen.data = structuredClone(datos); return { success: true }; },
        async limpiarBorradorModificacion() { almacen.data = null; return { success: true }; },
        ...apiExtra
    };
    const { inicializarBorradorModificacion } = await modulo;
    const listo = inicializarBorradorModificacion(async () => {
        guardados++;
        return guardar ? guardar(get) : { success: false, error: 'SQL rechazado' };
    }, documento, api, destino => navegaciones.push(destino));
    return { get, documento, campos, listo, almacen, escrituras, navegaciones, get guardados() { return guardados; },
        click: id => get(id).handlers.click(),
        editar(id, valor) { get(id).value = valor; get(id).handlers.input(); },
        async navegar(boton = 'btnBusquedaParejas') {
            let detenido = false;
            await get('.menu').handlers.click({ target: { closest: () => ({ id: boton }) }, preventDefault() {}, stopImmediatePropagation() { detenido = true; } });
            assert.equal(detenido, true); assert.equal(get('.menu').capture, true);
        }
    };
}

test('navegar a Búsqueda y volver conserva ID, todos los campos y las cuatro fotos', async () => {
    const v = await vista(); await v.listo;
    for (const campo of v.campos) {
        if (campo.type === 'file') campo.files = [new File([campo.id], `${campo.id}.png`, { type: 'image/png', lastModified: 123 })];
        else campo.value = campo.type === 'date' ? '2000-01-01' : `texto ${campo.id}`;
    }
    await v.navegar();
    const otra = await vista({ almacen: v.almacen }); await otra.listo;
    for (const campo of v.campos) {
        const recuperado = otra.get(campo.id);
        if (campo.type === 'file') {
            assert.equal(recuperado.files[0].name, campo.files[0].name);
            assert.equal(await recuperado.files[0].text(), campo.id);
            assert.equal(recuperado.files[0].lastModified, 123);
        } else assert.equal(recuperado.value, campo.value);
        assert.equal(recuperado.disabled, false);
    }
    assert.equal(v.guardados, 0); assert.match(otra.get('estadoBorradorModificacion').textContent, /recuperado/);
});

test('una foto lenta y ediciones sucesivas se conservan en orden antes de navegar', async () => {
    let resolver;
    const v = await vista(); await v.listo;
    v.get('fotoMasculinoUpdate').files = [{ name: 'foto.png', size: 3, type: 'image/png', lastModified: 1,
        arrayBuffer: () => new Promise(r => { resolver = r; }) }];
    v.editar('nombreMasculinoUpdate', 'Primero'); await tick();
    v.editar('nombreMasculinoUpdate', 'Final');
    const navegacion = v.navegar(); await tick();
    assert.equal(v.navegaciones.length, 0);
    resolver(new Uint8Array([1,2,3]).buffer); await navegacion;
    assert.equal(v.almacen.data.campos.nombreMasculinoUpdate, 'Final');
    assert.equal(v.navegaciones.length, 1);
    assert.equal(v.get('nombreMasculinoUpdate').disabled, false);
});

test('fallo de conservación impide navegar y permite corregir o reintentar', async () => {
    let falla = true;
    const v = await vista({ apiExtra: { async guardarBorradorModificacion() { return { success: !falla }; } } }); await v.listo;
    v.get('nombreMasculinoUpdate').value = 'Ana'; v.get('nombreMasculinoUpdate').focus(); await v.navegar();
    assert.equal(v.navegaciones.length, 0); assert.equal(v.get('nombreMasculinoUpdate').value, 'Ana');
    assert.equal(v.get('BTNUpdate').disabled, false);
    assert.equal(v.documento.activeElement, v.get('nombreMasculinoUpdate'));
    assert.match(v.get('estadoBorradorModificacion').textContent, /no perder/);
    falla = false; await v.navegar(); assert.equal(v.navegaciones.length, 1);
});

test('foto demasiado grande impide salir sin perder textos; retirarla permite navegar', async () => {
    const v = await vista(); await v.listo;
    v.get('nombreMasculinoUpdate').value = 'Ana';
    v.get('fotoMasculinoUpdate').files = [{ name: 'grande.png', size: 6 * 1024 * 1024, arrayBuffer() { assert.fail('No leer'); } }];
    await v.navegar(); assert.equal(v.navegaciones.length, 0);
    assert.match(v.get('estadoBorradorModificacion').textContent, /5 MiB/);
    v.get('fotoMasculinoUpdate').value = ''; await v.navegar();
    assert.equal(v.almacen.data.campos.nombreMasculinoUpdate, 'Ana');
});

test('guardado pendiente impide navegar o enviar una segunda modificación', async () => {
    let resolver;
    const v = await vista({ guardar: () => new Promise(r => { resolver = r; }) }); await v.listo;
    const guardado = v.click('BTNUpdate');
    await v.click('BTNUpdate'); await v.navegar();
    assert.equal(v.guardados, 1); assert.equal(v.navegaciones.length, 0);
    resolver({ success: false }); await guardado;
    await v.navegar(); assert.equal(v.navegaciones.length, 1);
});

test('rechazo SQL conserva los datos y la foto en el borrador al regresar', async () => {
    const v = await vista(); await v.listo;
    v.get('nombreFemeninoUpdate').value = 'Ana';
    v.get('fotoFemeninoUpdate').files = [new File(['foto'], 'foto.jpg')];
    await v.click('BTNUpdate'); await v.navegar();
    const otra = await vista({ almacen: v.almacen }); await otra.listo;
    assert.equal(otra.get('nombreFemeninoUpdate').value, 'Ana');
    assert.equal(await otra.get('fotoFemeninoUpdate').files[0].text(), 'foto');
});

test('SQL confirmado actualiza el borrador sin reponer fotos ya guardadas', async () => {
    const v = await vista({ guardar: async get => {
        get('fotoMasculinoUpdate').value = ''; get('fotoFemeninoUpdate').value = '';
        return { success: true };
    } }); await v.listo;
    v.get('nParejaID').value = '7'; v.get('nombreMasculinoUpdate').value = 'Juan';
    v.get('fotoMasculinoUpdate').files = [new File(['foto'], 'foto.jpg')];
    v.get('fotoMasculinoUpdate').handlers.change();
    await v.click('BTNUpdate'); await v.navegar();
    const otra = await vista({ almacen: v.almacen }); await otra.listo;
    assert.equal(otra.get('nParejaID').value, '7'); assert.equal(otra.get('nombreMasculinoUpdate').value, 'Juan');
    assert.equal(otra.get('fotoMasculinoUpdate').files.length, 0);
});

test('fallo del borrador después de SQL confirmado no pide repetir Guardar', async () => {
    const v = await vista({ guardar: async () => ({ success: true }), apiExtra: { guardarBorradorModificacion: async () => ({ success: false }) } }); await v.listo;
    await v.click('BTNUpdate');
    assert.match(v.get('estadoBorradorModificacion').textContent, /confirmó en MySQL/);
    assert.match(v.get('estadoBorradorModificacion').textContent, /no necesitas repetir Guardar/);
    assert.equal(v.get('BTNUpdate').disabled, false);
});

test('limpiar requiere confirmación: cancelar conserva y aceptar descarta el borrador sin SQL', async () => {
    const v = await vista(); await v.listo;
    v.editar('nParejaID', '7'); await tick();
    await v.click('btnLimpiarModificacion'); await v.click('btnCancelarLimpiarModificacion');
    assert.equal(v.get('nParejaID').value, '7'); assert.equal(v.almacen.data.campos.nParejaID, '7');
    await v.click('btnLimpiarModificacion'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.get('nParejaID').value, ''); assert.equal(v.almacen.data, null); assert.equal(v.guardados, 0);
    await v.navegar();
    const otra = await vista({ almacen: v.almacen }); await otra.listo;
    assert.equal(otra.get('nParejaID').value, '');
});

test('fallo al limpiar conserva formulario y borrador', async () => {
    const v = await vista({ apiExtra: { limpiarBorradorModificacion: async () => ({ success: false }) } }); await v.listo;
    v.editar('nParejaID', '7'); await tick();
    await v.click('btnLimpiarModificacion'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.get('nParejaID').value, '7'); assert.equal(v.almacen.data.campos.nParejaID, '7');
    assert.equal(v.get('BTNUpdate').disabled, false);
});

test('recuperación pendiente bloquea la edición; fallo no sobrescribe el borrador y permite salir', async () => {
    let resolver;
    const v = await vista({ apiExtra: { obtenerBorradorModificacion: () => new Promise(r => { resolver = r; }) } });
    assert.equal(v.get('nParejaID').disabled, true); await v.navegar(); assert.equal(v.navegaciones.length, 0);
    resolver({ success: false }); await v.listo;
    await v.click('BTNUpdate'); await v.navegar();
    assert.equal(v.escrituras.length, 0); assert.equal(v.guardados, 0); assert.equal(v.navegaciones.length, 1);
});

test('IPC aísla ventanas, módulos y subframes sin interferir con Registro', () => {
    const c = require('../Controladores/borradorModificacionController');
    const r = require('../Controladores/borradorRegistroController');
    const crear = () => { const frame = { url: pathToFileURL(path.join(root, 'Vistas/ModificarParejas.html')).href }; return { senderFrame: frame, sender: { mainFrame: frame } }; };
    const uno = crear(), dos = crear(), datos = { version: 1, campos: { nParejaID: '7' }, fotos: {} };
    assert.equal(c.guardarBorradorModificacion(uno, datos).success, true);
    assert.equal(c.obtenerBorradorModificacion(dos).data, null);
    assert.equal(c.obtenerBorradorModificacion({ ...uno, senderFrame: { ...uno.senderFrame } }).success, false);
    uno.senderFrame.url = pathToFileURL(path.join(root, 'Vistas/Registros.html')).href;
    assert.equal(c.limpiarBorradorModificacion(uno).success, false);
    assert.equal(r.obtenerBorradorRegistro(uno).data, null);
    assert.equal(r.guardarBorradorRegistro(uno, { ...datos, campos: { nParejaID: '9' } }).success, true);
    uno.senderFrame.url = pathToFileURL(path.join(root, 'Vistas/ModificarParejas.html')).href;
    assert.equal(c.obtenerBorradorModificacion(uno).data.campos.nParejaID, '7');
    assert.equal(c.limpiarBorradorModificacion(uno).success, true);
    assert.equal(c.obtenerBorradorModificacion(uno).data, null);
});

test('vista conecta el borrador una sola vez y registra los tres canales IPC', () => {
    const render = read('Public/js/render.js');
    assert.match(render, /return inicializarBorradorModificacion\(modificarPareja\)/);
    assert.doesNotMatch(render, /addEventListener\("click", modificarPareja\)/);
    for (const verbo of ['obtener', 'guardar', 'limpiar']) {
        assert.ok(read('main.js').includes(`ipcMain.handle("${verbo}-borrador-modificacion"`));
        assert.ok(read('preload.js').includes(`ipcRenderer.invoke("${verbo}-borrador-modificacion"`));
    }
    assert.doesNotMatch(read('Public/js/borradorModificacion.js'), /\b(alert|confirm)\s*\(/);
});

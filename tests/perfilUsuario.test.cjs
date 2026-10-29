const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const perfil = import('data:text/javascript;base64,' + Buffer.from(read('Public/js/perfilUsuario.js')).toString('base64'));

test('perfil: carga el nombre como texto y reemplaza cualquier cuenta anterior', async () => {
    const { cargarNombreSesion } = await perfil;
    const elementos = [{ textContent: 'Anterior' }, { textContent: 'Anterior' }];
    for (const elemento of elementos) Object.defineProperty(elemento, 'innerHTML', { set() { assert.fail('No interpretar HTML'); } });
    const doc = { querySelectorAll: () => elementos };
    let resolver;
    const pendiente = cargarNombreSesion(doc, { getUsuarioNombre: () => new Promise(r => { resolver = r; }) });
    assert.ok(elementos.every(e => e.textContent === 'Cargando cuenta…'));
    resolver('José <img src=x onerror=alert(1)>'); await pendiente;
    assert.ok(elementos.every(e => e.textContent === 'José <img src=x onerror=alert(1)>'));
    await cargarNombreSesion(doc, { getUsuarioNombre: async () => 'María' });
    assert.ok(elementos.every(e => e.textContent === 'María'));
});

test('perfil: sesión ausente o IPC fallido no deja visible el nombre anterior ni interrumpe el formulario', async () => {
    const { cargarNombreSesion } = await perfil;
    for (const nombre of [null, undefined, '', ' ', { userName: 'Falso' }]) {
        const elemento = { textContent: 'Anterior' };
        await cargarNombreSesion({ querySelectorAll: () => [elemento] }, { getUsuarioNombre: async () => nombre });
        assert.equal(elemento.textContent, 'Sesión no disponible');
    }
    const elemento = { textContent: 'Anterior' };
    await cargarNombreSesion({ querySelectorAll: () => [elemento] }, { getUsuarioNombre: async () => { throw Error('IPC'); } });
    assert.equal(elemento.textContent, 'No se pudo cargar la cuenta');
    await cargarNombreSesion({ querySelectorAll: () => [] }, { getUsuarioNombre() { assert.fail('Pantalla sin perfil'); } });
});

test('preload: la consulta de nombre no acepta una identidad enviada por el renderer', async () => {
    let api; const llamadas = [];
    vm.runInNewContext(read('preload.js'), { require() { return {
        contextBridge: { exposeInMainWorld(_, value) { api = value; } },
        ipcRenderer: { invoke(...args) { llamadas.push(args); return Promise.resolve('Cuenta'); } }
    }; } });
    assert.equal(await api.getUsuarioNombre(999, 'Otra cuenta'), 'Cuenta');
    assert.deepEqual(llamadas[0], ['get-usuario-nombre']);
});

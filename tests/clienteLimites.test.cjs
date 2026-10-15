const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const cola = import(url(read('Public/js/borradores.js')));
const tick = () => new Promise(resolve => setImmediate(resolve));

test('coalescencia: 1000 ediciones durante un envío dejan solo la última pendiente', async () => {
    const { crearColaBorrador } = await cola;
    const escritos = []; let liberar;
    const q = crearColaBorrador(async dato => { escritos.push(dato); if (dato === 0) await new Promise(r => { liberar = r; }); });
    const primero = q.solicitar(0); await tick();
    for (let i = 1; i <= 1000; i++) q.solicitar(i);
    liberar(); await primero; await q.esperar();
    assert.deepEqual(escritos, [0, 1000]);
});

test('coalescencia: un fallo final se informa; corregir permite volver a guardar', async () => {
    const { crearColaBorrador } = await cola;
    const escritos = [];
    const q = crearColaBorrador(async dato => { if (dato === 'error') throw Error('IPC'); escritos.push(dato); });
    await assert.rejects(q.solicitar('error'), /IPC/);
    await q.solicitar('corregido');
    assert.deepEqual(escritos, ['corregido']);
});

for (const [tipo, vista] of [['Registro', 'Registros'], ['Modificacion', 'ModificarParejas']]) {
    const control = require(`../Controladores/borrador${tipo}Controller`);
    const crear = () => { const frame = { url: pathToFileURL(path.join(root, `Vistas/${vista}.html`)).href };
        return { senderFrame: frame, sender: { mainFrame: frame } }; };
    const guardar = control[`guardarBorrador${tipo}`], obtener = control[`obtenerBorrador${tipo}`];
    const base = () => ({ version: 1, campos: { nParejaID: '7' }, fotos: {} });
    test(`${tipo}: rechaza campos anidados, desconocidos y tamaño excesivo sin perder borrador`, () => {
        const event = crear(); assert.equal(guardar(event, base()).success, true);
        for (const datos of [
            { ...base(), campos: { nParejaID: {} } }, { ...base(), campos: { secreto: 'x' } },
            { ...base(), campos: { nParejaID: 'x'.repeat(2049) } },
            { ...base(), fotos: { fotoDesconocida: null } },
            { ...base(), campoExtra: 'x' }, { ...base(), campos: [] }
        ]) {
            assert.equal(guardar(event, datos).success, false);
            assert.deepEqual(obtener(event).data, base());
        }
    });
    test(`${tipo}: acepta límite foto, conserva foto en delta, permite eliminar y rechaza exceso`, () => {
        const event = crear();
        const f = { nombre: 'prueba.png', tipo: 'image/png', fecha: 1, bytes: new ArrayBuffer(5 * 1024 * 1024) };
        assert.equal(guardar(event, { ...base(), fotos: { fotoMasculino: f } }).success, true);
        assert.equal(guardar(event, { ...base(), campos: { nParejaID: '8' } }).success, true);
        assert.equal(obtener(event).data.fotos.fotoMasculino.bytes.byteLength, 5 * 1024 * 1024);
        assert.equal(guardar(event, { ...base(), fotos: { fotoMasculino: { ...f, bytes: new ArrayBuffer(5 * 1024 * 1024 + 1) } } }).success, false);
        assert.equal(obtener(event).data.campos.nParejaID, '8');
        assert.equal(guardar(event, { ...base(), fotos: { fotoMasculino: null } }).success, true);
        assert.equal(obtener(event).data.fotos.fotoMasculino, null);
    });
    test(`${tipo}: rechaza memoria compartida, lista de bytes y metadatos de foto ajenos`, () => {
        const event = crear();
        const foto = { nombre: 'prueba.jpg', tipo: 'image/jpeg', fecha: 1, bytes: new ArrayBuffer(1) };
        for (const invalida of [{ ...foto, bytes: [1] }, { ...foto, bytes: new SharedArrayBuffer(1) },
            { ...foto, nombre: 'archivo.exe' }, { ...foto, ruta: '/tmp/foto.jpg' }, { ...foto, fecha: Infinity }]) {
            assert.equal(guardar(event, { ...base(), fotos: { fotoMasculino: invalida } }).success, false);
        }
    });
}

test('todas las vistas activan CSP antes de recursos y carecen de scripts/eventos inline', () => {
    for (const file of fs.readdirSync(path.join(root, 'Vistas')).filter(n => n.endsWith('.html'))) {
        const html = read(`Vistas/${file}`).replace(/<!--[\s\S]*?-->/g, '');
        const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
        assert.ok(csp, file);
        assert.match(csp[1], /script-src 'self';/);
        assert.match(csp[1], /connect-src 'none';/);
        assert.match(csp[1], /object-src 'none';/);
        assert.ok(html.indexOf(csp[0]) < html.indexOf('<script'), file);
        assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>/i, file);
        assert.doesNotMatch(html, /<[^>]+\son\w+\s*=/i, file);
        assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i, file);
    }
    for (const file of fs.readdirSync(path.join(root, 'Public/css'))) assert.doesNotMatch(read(`Public/css/${file}`), /https?:\/\//i, file);
    assert.match(read('Vistas/MenuPrincipal.html'), /<video\b[^>]*preload="none"/);
});

test('preload devuelve cancelación idempotente y nunca expone el evento Electron', () => {
    let api; const listeners = new Map(); let retirados = 0;
    vm.runInNewContext(read('preload.js'), { require: () => ({
        contextBridge: { exposeInMainWorld(_nombre, objeto) { api = objeto; } },
        ipcRenderer: { on(canal, listener) { listeners.set(canal, listener); }, removeListener(canal, listener) {
            assert.equal(listeners.get(canal), listener); listeners.delete(canal); retirados++;
        } }
    }) });
    const recibidos = [];
    const cancelar = api.receive('set-role', (...args) => recibidos.push(args));
    listeners.get('set-role')({ sender: 'privado' }, 'admin');
    assert.deepEqual(recibidos, [['admin']]);
    cancelar(); cancelar(); assert.equal(retirados, 1); assert.equal(listeners.size, 0);
    api.receive('canal-ajeno', () => {})(); assert.equal(listeners.size, 0);
    api.receive('set-role', null)(); assert.equal(listeners.size, 0);
});

test('domHelpers mantiene etiquetas maliciosas como texto, sin interpretar HTML', () => {
    const nodo = () => ({ hijos: [], textContent: '', append(...hijos) { this.hijos.push(...hijos); },
        appendChild(hijo) { this.hijos.push(hijo); }, replaceChildren(...hijos) { this.hijos = hijos; } });
    const contenedor = nodo(); const contexto = vm.createContext({ document: {
        querySelector: () => contenedor, createElement: () => nodo(), createTextNode: texto => ({ textContent: texto })
    } });
    vm.runInContext(read('Public/js/domHelpers.js').replace(/^export /gm, ''), contexto);
    const carga = '<img src=x onerror=alert(1)>';
    contexto.mostrarResultados([{ [carga]: carga }], 'resultados');
    assert.equal(contenedor.hijos[0].hijos[0].hijos[0].textContent, `${carga}:`);
    assert.equal(contenedor.hijos[0].hijos[0].hijos[1].textContent, ` ${carga}`);
    contexto.mostrarError(carga, 'resultados'); assert.equal(contenedor.hijos[0].textContent, carga);
    assert.doesNotMatch(read('Public/js/domHelpers.js'), /innerHTML|outerHTML|insertAdjacentHTML/);
});

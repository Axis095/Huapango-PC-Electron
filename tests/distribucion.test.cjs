const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const asar = require('@electron/asar');
const { verificarPaquete } = require('../scripts/verificar-paquete.cjs');
const { vistas } = require('../Seguridad/vistas');

async function escenario(t, alterar) {
    const base = fs.realpathSync(os.tmpdir());
    const directorio = fs.mkdtempSync(path.join(base, 'huapango-paquete-'));
    t.after(() => {
        assert.equal(path.dirname(fs.realpathSync(directorio)), base);
        assert.ok(path.basename(directorio).startsWith('huapango-paquete-'));
        fs.rmSync(directorio, { recursive: true });
    });
    const compilado = path.join(directorio, 'compilado');
    const contenido = path.join(directorio, 'contenido');
    const escribir = (nombre, texto) => {
        const destino = path.join(compilado, nombre);
        fs.mkdirSync(path.dirname(destino), { recursive: true }); fs.writeFileSync(destino, texto);
    };
    escribir('package.json', JSON.stringify({ name: 'ensayo', version: '1', main: 'electron/main.cjs', dependencies: { pdfkit: '1' } }));
    escribir('electron/main.cjs', 'require("../main.js");');
    escribir('main.js', '// main compilado');
    escribir('assets/video.mp4', 'video ficticio');
    escribir('Public/css/pagina.css', 'body { color: black; }');
    for (const nombre of Object.keys(vistas)) escribir(`Vistas/${nombre}`, '<link rel="stylesheet" href="../Public/css/pagina.css">');
    fs.cpSync(compilado, contenido, { recursive: true });
    fs.mkdirSync(path.join(contenido, 'node_modules/pdfkit'), { recursive: true });
    fs.writeFileSync(path.join(contenido, 'node_modules/pdfkit/package.json'), '{}');
    alterar?.(contenido);
    const archivo = path.join(directorio, 'app.asar');
    await asar.createPackage(contenido, archivo);
    return { archivo, compilado };
}

test('distribución: un ASAR con entradas compiladas y recursos locales supera la inspección', async t => {
    const { archivo, compilado } = await escenario(t);
    const resultado = verificarPaquete(archivo, compilado);
    assert.equal(resultado.vistas, 10); assert.equal(resultado.videos, 1);
    assert.match(resultado.sha256Aplicacion, /^[a-f0-9]{64}$/);
});

test('distribución: rechaza datos privados añadidos al ASAR', async t => {
    const { archivo, compilado } = await escenario(t, carpeta => fs.writeFileSync(path.join(carpeta, 'config.json'), '{}'));
    assert.throws(() => verificarPaquete(archivo, compilado), /Archivo ajeno|Datos privados/);
});

test('distribución: rechaza un módulo distinto del árbol compilado', async t => {
    const { archivo, compilado } = await escenario(t, carpeta => fs.writeFileSync(path.join(carpeta, 'main.js'), '// versión anterior'));
    assert.throws(() => verificarPaquete(archivo, compilado), /Contenido distinto/);
});

test('distribución: rechaza una dependencia de runtime ausente', async t => {
    const { archivo, compilado } = await escenario(t, carpeta => fs.unlinkSync(path.join(carpeta, 'node_modules/pdfkit/package.json')));
    assert.throws(() => verificarPaquete(archivo, compilado), /Falta runtime/);
});

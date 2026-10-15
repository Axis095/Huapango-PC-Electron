const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { PassThrough } = require('node:stream');

test('PDF: un fallo de dibujo conserva el reporte anterior y retira solamente el temporal', async t => {
    const directorio = fs.mkdtempSync(path.join(os.tmpdir(), 'huapango-pdf-'));
    t.after(() => fs.rmSync(directorio, { recursive: true, force: true }));
    const destino = path.join(directorio, 'anterior.pdf'); fs.writeFileSync(destino, 'REPORTE ORIGINAL');
    class Documento extends PassThrough { fontSize() { return this; } text() { this.write('PARCIAL'); throw Error('Fallo de dibujo'); } }
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../Modelos/pdfModel.js'), 'utf8'), { module, console,
        require(name) { if (name === 'pdfkit') return Documento; if (name === '../db') return { queryDatabase: async () => [{}] }; return require(name); }
    });
    await assert.rejects(module.exports.generarPDFParejas(destino), /Fallo de dibujo/);
    assert.equal(fs.readFileSync(destino, 'utf8'), 'REPORTE ORIGINAL');
    assert.deepEqual(fs.readdirSync(directorio), ['anterior.pdf']);
});
test('PDF: apertura fallida informa que el documento se guardó y evita falso fallo de escritura', async () => {
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../Controladores/pdfController.js'), 'utf8'), { module, console,
        require(name) { return name === 'electron' ? { dialog: { showSaveDialog: async () => ({ filePath: 'reporte.pdf' }) }, shell: { openPath: async () => 'Sin lector' } }
            : { generarPDFParejas: async () => {} }; }
    });
    const r = await module.exports.handleGenerarPDFParejas();
    assert.equal(r.success, true); assert.equal(r.ruta, 'reporte.pdf'); assert.match(r.warning, /se guardó/);
});

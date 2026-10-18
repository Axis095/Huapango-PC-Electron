const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PassThrough, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'Modelos/pdfModel.js'), 'utf8');
const metodos = ['generarPDFParejas', 'generarPDFResultados', 'generarPDFCategorias', 'generarPDFEstilos', 'generarPDFRegistrosGenerales'];

function preparar({ datos = [{}], fallo = '', createWriteStream } = {}) {
    const docs = [], destinos = [];
    class PDF extends PassThrough {
        constructor() { super(); docs.push(this); }
        fontSize() { return this; }
        text(value) { if (fallo === 'dibujo') throw Error('Error al dibujar'); this.write(value); return this; }
        moveDown() { return this; }
        end() {
            if (fallo === 'documento') queueMicrotask(() => this.destroy(Error('Error del documento')));
            else super.end();
        }
    }
    const deps = {
        pdfkit: PDF,
        fs: { createWriteStream() {
            if (fallo === 'crear') throw Error('Ruta inválida');
            const stream = createWriteStream ? createWriteStream() : new Writable({ write(chunk, encoding, callback) {
                callback(fallo === 'archivo' ? Error('Disco no disponible') : null);
            } });
            destinos.push(stream); return stream;
        } },
        'node:stream/promises': { pipeline },
        '../db': { async queryDatabase() { if (fallo === 'consulta') throw Error('Consulta fallida'); return datos; } }
    };
    const module = { exports: {} };
    vm.runInNewContext(source, { module, console: { log() {}, warn() {}, error() {} }, require(name) {
        assert.ok(name in deps, `Dependencia inesperada ${name}`); return deps[name];
    } });
    return { model: module.exports, docs, destinos };
}

for (const metodo of metodos) {
    test(`${metodo}: sin registros devuelve un Error legible sin abrir archivo`, async () => {
        const v = preparar({ datos: [] });
        await assert.rejects(v.model[metodo]('prueba.pdf', ...(metodo === 'generarPDFResultados' ? [null] : [])), err => {
            assert.equal(err.name, 'Error'); assert.match(err.message, /No se encontraron/); return true;
        });
        assert.equal(v.destinos.length, 0);
    });
    test(`${metodo}: éxito espera la escritura final del archivo`, async () => {
        let finish;
        const v = preparar({ createWriteStream: () => new Writable({
            write(chunk, encoding, callback) { callback(); }, final(callback) { finish = callback; }
        }) });
        let completed = false;
        const pending = v.model[metodo]('prueba.pdf', ...(metodo === 'generarPDFResultados' ? [null] : [])).then(result => { completed = true; return result; });
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(completed, false); assert.equal(typeof finish, 'function');
        finish(); const result = await pending;
        assert.equal(metodo === 'generarPDFRegistrosGenerales' ? result : result.ruta, 'prueba.pdf');
    });
}

for (const fallo of ['consulta', 'crear', 'dibujo', 'documento', 'archivo']) {
    test(`PDF: fallo de ${fallo} rechaza la operación y cierra los flujos abiertos`, async () => {
        const v = preparar({ fallo });
        await assert.rejects(v.model.generarPDFParejas('prueba.pdf'));
        for (const doc of v.docs) assert.equal(doc.destroyed, true);
        for (const stream of v.destinos) assert.equal(stream.destroyed, true);
    });
}

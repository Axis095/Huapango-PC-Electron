// Hook de electron-builder: inspección de solo lectura del ASAR terminado.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const asar = require('@electron/asar'); // Incluido en el tooling de electron-builder fijado en lockfile.
const { vistas } = require('../Seguridad/vistas');
const hash = contenido => crypto.createHash('sha256').update(contenido).digest('hex');

function inventariar(directorio, prefijo = '') {
    return fs.readdirSync(directorio, { withFileTypes: true }).flatMap(entrada => {
        assert.ok(!entrada.isSymbolicLink(), 'La salida compilada no admite enlaces');
        const nombre = prefijo + entrada.name;
        return entrada.isDirectory() ? inventariar(path.join(directorio, entrada.name), nombre + '/') : [nombre];
    }).sort();
}

function verificarPaquete(archivo, compilado) {
    const archivos = asar.listPackage(archivo).map(nombre => nombre.replaceAll('\\', '/').replace(/^\//, ''))
        .filter(nombre => !asar.statFile(archivo, path.normalize(nombre)).files);
    const presentes = new Set(archivos);
    const leer = nombre => asar.extractFile(archivo, path.normalize(nombre));
    const manifiesto = JSON.parse(leer('package.json'));
    const original = JSON.parse(fs.readFileSync(path.join(compilado, 'package.json'), 'utf8'));
    assert.equal(manifiesto.main, 'electron/main.cjs', 'El paquete debe usar la entrada compilada');
    assert.equal(manifiesto.name, original.name);
    assert.equal(manifiesto.version, original.version);
    assert.deepEqual(manifiesto.dependencies, original.dependencies);
    for (const dependencia of Object.keys(original.dependencies)) {
        assert.ok(presentes.has(`node_modules/${dependencia}/package.json`), `Falta runtime: ${dependencia}`);
    }
    for (const nombre of archivos) {
        if (nombre.startsWith('node_modules/')) {
            assert.ok(!/^node_modules\/(?:vite|typescript|electron|electron-builder|@types)(?:\/|$)/.test(nombre), 'Herramienta de desarrollo en el paquete');
            assert.ok(!nombre.endsWith('.node'), 'Revisar npmRebuild antes de incorporar módulos nativos');
            continue;
        }
        assert.ok(/^(?:package\.json|main\.js|preload\.js|db\.js|electron\/main\.cjs|(?:Controladores|Modelos|Seguridad|Servicios)\/.+\.js|Public\/(?:css|fonts)\/.+|assets\/.+|Vistas\/.+\.html)$/.test(nombre), `Archivo ajeno a la distribución: ${nombre}`);
        assert.ok(!/(?:^|\/)(?:config\.json(?:\..*)?|\.env(?:\..*)?|uploads|\.tmp)(?:\/|$)/i.test(nombre), 'Datos privados en el paquete');
    }
    const generados = inventariar(compilado).filter(nombre => nombre !== 'package.json');
    for (const nombre of generados) {
        assert.ok(presentes.has(nombre), `Falta archivo compilado: ${nombre}`);
        assert.equal(hash(leer(nombre)), hash(fs.readFileSync(path.join(compilado, nombre))), `Contenido distinto del compilado: ${nombre}`);
    }
    assert.deepEqual(archivos.filter(nombre => !nombre.startsWith('node_modules/') && nombre !== 'package.json').sort(), generados);
    assert.deepEqual(archivos.filter(nombre => nombre.startsWith('Vistas/')).sort(), Object.keys(vistas).map(nombre => `Vistas/${nombre}`).sort());
    assert.equal(archivos.filter(nombre => nombre.endsWith('.mp4')).length, 1, 'El video debe incluirse una sola vez');
    for (const nombre of archivos.filter(n => !n.startsWith('node_modules/') && /\.(html|css)$/.test(n))) {
        const texto = leer(nombre).toString('utf8');
        const patron = nombre.endsWith('.html') ? /\b(?:src|href|poster)=["']([^"']+)["']/g : /url\(\s*["']?([^\s"')]+)["']?\s*\)/g;
        for (const [, recurso] of texto.matchAll(patron)) {
            if (/^(?:data:|blob:|#)/i.test(recurso)) continue;
            const url = new URL(recurso, 'file:///' + nombre);
            assert.ok(url.protocol === 'file:' && !url.host, 'Los recursos de producción deben ser locales');
            const destino = decodeURIComponent(url.pathname).slice(1);
            assert.ok(presentes.has(destino), `Recurso ausente: ${nombre} → ${destino}`);
        }
    }
    const huellas = generados.map(nombre => `${nombre}\t${hash(leer(nombre))}\n`).join('');
    return { sha256Asar: hash(fs.readFileSync(archivo)), sha256Aplicacion: hash(huellas),
        entrada: manifiesto.main, vistas: Object.keys(vistas).length, archivos: archivos.length,
        archivosAplicacion: generados.length, videos: 1 };
}

module.exports = async contexto => {
    const raiz = path.resolve(__dirname, '..');
    const archivo = path.join(contexto.appOutDir, 'resources', 'app.asar');
    const evidencia = verificarPaquete(archivo, path.join(raiz, 'build/app'));
    fs.writeFileSync(path.join(path.dirname(contexto.appOutDir), 'auditoria-paquete.json'), JSON.stringify(evidencia, null, 2) + '\n');
    console.log('PAQUETE_COMPILADO_OK:', JSON.stringify(evidencia));
};
module.exports.verificarPaquete = verificarPaquete;

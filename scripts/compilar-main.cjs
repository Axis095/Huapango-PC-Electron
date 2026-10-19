const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const raiz = fs.realpathSync(path.resolve(__dirname, '..'));
const destino = path.resolve(raiz, 'build/app');

// La limpieza solo admite esta salida generada dentro del proyecto. Rechazar
// enlaces/junctions evita que una carpeta redirija la escritura a otro lugar.
if (path.relative(raiz, destino) !== path.join('build', 'app')) throw Error('Salida de compilación fuera del proyecto.');
for (const directorio of [path.dirname(destino), destino]) {
    if (fs.existsSync(directorio) && fs.lstatSync(directorio).isSymbolicLink()) {
        throw Error('La salida de compilación no puede usar enlaces de directorio.');
    }
}
fs.rmSync(destino, { recursive: true, force: true });
const resultado = spawnSync(process.execPath,
    [path.join(raiz, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.main.json'],
    { cwd: raiz, stdio: 'inherit', windowsHide: true });
if (resultado.error) throw resultado.error;
if (resultado.status !== 0) process.exit(resultado.status || 1);

// Vite emite las vistas, JS e imágenes. Solo el CSS preservado y sus fuentes
// necesitan copiarse en ese modo; compile:main conserva el ensayo sin Vite.
const recursos = process.argv.includes('--renderer-vite') ? ['Public/css', 'Public/fonts'] : ['Vistas', 'Public'];
for (const recurso of recursos) {
    fs.cpSync(path.join(raiz, recurso), path.join(destino, recurso), { recursive: true });
}
const original = JSON.parse(fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'));
const manifiesto = Object.fromEntries(['name', 'version', 'description', 'author', 'license', 'dependencies']
    .map(campo => [campo, original[campo]]));
manifiesto.main = 'electron/main.cjs';
fs.writeFileSync(path.join(destino, 'package.json'), JSON.stringify(manifiesto, null, 2) + '\n');
console.log('MAIN_COMPILADO_OK: build/app; vistas y recursos conservan sus rutas.');

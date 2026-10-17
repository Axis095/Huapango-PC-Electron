import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const smoke = process.argv.includes('--smoke');
const server = await createServer({ configFile: path.join(raiz, 'vite.config.mjs'),
    ...(smoke ? { server: { port: 0, strictPort: false } } : {}) });
let hijo;
let terminando;
async function terminar(codigo) {
    if (terminando) return terminando;
    terminando = (async () => {
        if (hijo?.pid && hijo.exitCode === null && hijo.signalCode === null) {
            const fin = new Promise(resolve => hijo.once('exit', resolve));
            hijo.kill(); await fin;
        }
        await server.close();
        console.log(`VITE_DETENIDO: entorno de desarrollo cerrado; código ${codigo}.`);
        process.exitCode = codigo;
    })();
    return terminando;
}
try {
    await server.listen();
    const origen = `http://127.0.0.1:${server.httpServer.address().port}`;
    if (smoke) {
        for (const privado of ['/', '/main.js', '/db.js', '/config.json', '/sql/001-laboratorio.sql', '/@fs/' + raiz.replaceAll('\\', '/') + '/main.js']) {
            const respuesta = await fetch(origen + privado);
            if (respuesta.status !== 404) throw Error('El servidor expuso un recurso fuera del frontend.');
        }
        console.log('VITE_FRONTERA_OK: backend y configuración no se sirven.');
    }
    console.log(`VITE_INTERNO: ${origen} (la raíz / está restringida y devuelve 404).`);
    console.log('Abriendo Huapango en Electron. Usa su ventana; el navegador no dispone de la API del preload.');
    hijo = spawn(require('electron'), [smoke ? path.join(raiz, 'scripts/smoke-fase0.cjs') : raiz],
        // En Windows, ocultar el proceso también oculta su primera BrowserWindow.
        { cwd: raiz, env: { ...process.env, HUAPANGO_DEV_ORIGIN: origen }, stdio: 'inherit', windowsHide: smoke });
    hijo.once('error', error => { console.error(error.message); void terminar(1); });
    hijo.once('exit', codigo => { void terminar(codigo ?? 1); });
    for (const senal of ['SIGINT', 'SIGTERM']) process.once(senal, () => { void terminar(0); });
} catch (error) {
    console.error(error.message); await terminar(1);
}

import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import catalogo from './Seguridad/vistas.js';
import recursos from './scripts/vite-recursos.cjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    root: raiz,
    base: './',
    publicDir: false,
    appType: 'mpa',
    plugins: [{
        name: 'huapango-frontera-desarrollo',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const puerto = server.httpServer.address()?.port;
                if (!['GET', 'HEAD'].includes(req.method) || req.headers.host !== `127.0.0.1:${puerto}` ||
                    !recursos.recursoPermitido(req.url, raiz)) {
                    res.statusCode = 404; res.end(); return;
                }
                next();
            });
        },
        transformIndexHtml: {
            order: 'pre',
            handler(html, contexto) {
                // El legado depende del orden de sus hojas. Evitar que el
                // agrupado CSS de Vite cambie la cascada en producción.
                if (!contexto.server) return html.replace(/<link\b(?=[^>]*\brel=["']stylesheet["'])[^>]*>/gi,
                    etiqueta => etiqueta.replace(/\bhref=/i, 'data-huapango-css='));
                const puerto = contexto.server.httpServer.address().port;
                return html.replace("connect-src 'none'", `connect-src 'self' ws://127.0.0.1:${puerto}`);
            }
        }
    }, {
        name: 'huapango-orden-estilos',
        transformIndexHtml: { order: 'post', handler: html => html.replaceAll('data-huapango-css=', 'href=') }
    }],
    envDir: path.join(raiz, 'build/vite-env'),
    server: { host: '127.0.0.1', port: 5173, strictPort: true, cors: false,
        fs: { strict: true, allow: [raiz] },
        watch: { ignored: ['**/.tmp/**', '**/build/**', '**/dist/**', '**/uploads/**', '**/config.json*',
            '**/sql/**', '**/tests/**', '**/Modelos/**', '**/Controladores/**', '**/Seguridad/**', '**/Servicios/**'] } },
    build: {
        outDir: 'build/app', emptyOutDir: false, assetsInlineLimit: 0,
        cssMinify: false,
        rolldownOptions: {
            input: Object.fromEntries(Object.keys(catalogo.vistas).map(nombre => [nombre, path.join(raiz, 'Vistas', nombre)]))
        }
    }
});

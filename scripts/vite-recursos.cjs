const path = require('node:path');
const fs = require('node:fs');
const { vistas } = require('../Seguridad/vistas');

function recursoPermitido(valor, raiz) {
    try {
        if (valor.includes('\\') || /%(?:2e|2f|5c|00)/i.test(valor)) return false;
        const ruta = new URL(valor, 'http://127.0.0.1').pathname;
        if (['/@vite/client', '/@vite/env', '/__vite_ping'].includes(ruta)) return true;
        if (ruta.startsWith('/Vistas/')) return Object.hasOwn(vistas, ruta.slice('/Vistas/'.length));
        if (!/^\/Public\/(?:css|js|images|fonts)\/[^?]*\.(?:js|css|png|jpe?g|svg|ico|mp4|ttf|woff2?)$/.test(ruta)) return false;
        const archivo = fs.realpathSync(path.resolve(raiz, '.' + ruta));
        const relativo = path.relative(fs.realpathSync(path.join(raiz, 'Public')), archivo);
        return !relativo.startsWith('..') && !path.isAbsolute(relativo);
    } catch { return false; }
}
module.exports = { recursoPermitido };

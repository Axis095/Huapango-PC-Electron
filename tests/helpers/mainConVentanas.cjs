// Las pruebas de roles crean emisores sintéticos. Registrarlos explícitamente como
// ventanas de la sesión permite probar roles sin omitir la nueva frontera de main.
// Las pruebas de ciclo de sesión usan BrowserWindow y creación reales de main.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
module.exports = function mainConVentanas(deps, globals = {}) {
    const ventanas = new WeakMap();
    deps.electron.BrowserWindow = { fromWebContents: sender => ventanas.get(sender) };
    const context = vm.createContext({ __dirname: root, global: globals,
        console: { log() {}, warn() {}, error() {} }, require: name => deps[name] });
    vm.runInContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), context, { filename: 'main.js' });
    const asociaciones = vm.runInContext('sesionesDeVentana', context);
    return function registrar(event) {
        if (!event?.sender || ventanas.has(event.sender)) return;
        ventanas.set(event.sender, { webContents: event.sender, isDestroyed: () => false });
        asociaciones.set(event.sender, deps['./Modelos/sesionModel'].obtenerClaveSesion());
    };
};

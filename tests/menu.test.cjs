const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const modulo = import(`data:text/javascript;base64,${Buffer.from(read('Public/js/menu.js')).toString('base64')}`);
const privados = ['btnAdministrador', 'btnResultados', 'btnRegistros', 'btnBusquedaParejas', 'btnModificarParejas', 'btnParejas'];
const pdfs = ['btnGenerarPDF', 'btnGenerarPDFCategorias', 'btnGenerarPDFEstilos', 'btnGenerarPDFResultados', 'btnGenerarPDFRegistros'];

function vista(ids = privados) {
    const botones = new Map([...ids, 'btnIndex', 'btnRegreso'].map(id => [id, { hidden: false, disabled: false }]));
    return { botones, documento: { getElementById: id => botones.get(id) || null } };
}
function comprobar(v, permitidos) {
    for (const [id, boton] of v.botones) {
        const visible = ['btnIndex', 'btnRegreso', ...permitidos].includes(id);
        assert.equal(boton.hidden, !visible, `${id}: visibilidad`);
        assert.equal(boton.disabled, !visible, `${id}: interacción`);
    }
}

test('todas las vistas ocultan y deshabilitan las opciones privadas desde el HTML', () => {
    let vistas = 0;
    for (const file of fs.readdirSync(path.join(root, 'Vistas')).filter(f => f.endsWith('.html'))) {
        const html = read(`Vistas/${file}`).replace(/<!--[\s\S]*?-->/g, '');
        if (!/class="menu"/.test(html)) continue;
        vistas++;
        for (const tag of html.match(/<button\b[^>]*>/g) || []) {
            const id = tag.match(/\bid="([^"]+)"/)?.[1];
            if (![...privados, ...pdfs].includes(id)) continue;
            assert.match(tag, /\shidden(?:\s|>)/, `${file}: ${id} visible antes de ejecutar JS`);
            assert.match(tag, /\sdisabled(?:\s|>)/, `${file}: ${id} habilitado antes de ejecutar JS`);
        }
    }
    assert.ok(vistas > 0);
    assert.match(read('Public/css/stylesIndex.css'), /\.menu button\[hidden\]\s*{\s*display:\s*none !important;/);
    assert.match(read('Public/js/render.js'), /import { configurarMenu } from "\.\/menu.js";/);
});

test('PDF: roles y texto de evaluaciones coinciden con los permisos del proceso principal', async () => {
    const { configurarMenu } = await modulo;
    for (const [rol, permitidos] of [
        ['admin', pdfs], ['user', ['btnGenerarPDFCategorias', 'btnGenerarPDFEstilos']],
        ['juez', ['btnGenerarPDFResultados']], ['guest', []]
    ]) {
        const v = vista(pdfs);
        let responder;
        const pendiente = configurarMenu(v.documento, { getUserRole: () => new Promise(resolve => { responder = resolve; }) });
        comprobar(v, []);
        responder(rol); await pendiente;
        comprobar(v, permitidos);
        assert.equal(v.botones.get('btnGenerarPDFResultados').textContent,
            rol === 'juez' ? 'Exportar mis evaluaciones' : 'Exportar todas las evaluaciones');
    }
    assert.match(read('Public/css/modern-ui.css'), /\.btn\[hidden\]\s*{\s*display:\s*none !important;/);
});

test('una respuesta lenta no muestra ni habilita opciones antes de conocer el rol', async () => {
    const { configurarMenu } = await modulo;
    const v = vista();
    let responder;
    const pendiente = configurarMenu(v.documento, { getUserRole: () => new Promise(resolve => { responder = resolve; }) });
    comprobar(v, []);
    responder('user');
    await pendiente;
    comprobar(v, ['btnRegistros', 'btnBusquedaParejas', 'btnModificarParejas', 'btnParejas']);
});

for (const [rol, permitidos] of [
    ['admin', privados],
    ['user', ['btnRegistros', 'btnBusquedaParejas', 'btnModificarParejas', 'btnParejas']],
    ['juez', ['btnResultados']]
]) {
    test(`rol ${rol}: habilita únicamente las secciones correspondientes`, async () => {
        const { configurarMenu } = await modulo;
        const v = vista();
        await configurarMenu(v.documento, { getUserRole: async () => rol });
        comprobar(v, permitidos);
    });
}

test('sin sesión o con rol desconocido no se habilitan secciones privadas', async () => {
    const { configurarMenu } = await modulo;
    for (const rol of ['guest', '', null, undefined, 'otro', '__proto__']) {
        const v = vista();
        await configurarMenu(v.documento, { getUserRole: async () => rol });
        comprobar(v, []);
    }
});

test('un error IPC o preload no disponible conserva el menú privado cerrado', async t => {
    t.mock.method(console, 'error', () => {});
    const { configurarMenu } = await modulo;
    for (const api of [{ getUserRole: async () => { throw new Error('IPC no disponible'); } }, {}]) {
        const v = vista();
        await configurarMenu(v.documento, api);
        comprobar(v, []);
    }
});

test('una vista sin todos los botones sigue aplicando el rol a los que existen', async () => {
    const { configurarMenu } = await modulo;
    const v = vista(['btnAdministrador', 'btnRegistros']);
    await configurarMenu(v.documento, { getUserRole: async () => 'user' });
    comprobar(v, ['btnRegistros']);
});

test('recalcular después de administrador retira las opciones mientras se consulta el nuevo rol', async () => {
    const { configurarMenu } = await modulo;
    const v = vista();
    await configurarMenu(v.documento, { getUserRole: async () => 'admin' });
    comprobar(v, privados);
    let responder;
    const pendiente = configurarMenu(v.documento, { getUserRole: () => new Promise(resolve => { responder = resolve; }) });
    comprobar(v, []);
    responder('juez');
    await pendiente;
    comprobar(v, ['btnResultados']);
});

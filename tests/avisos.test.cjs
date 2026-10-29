const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// DOM mínimo: las pruebas verifican flujo y estado, no el foco nativo de Electron.
function preparar(api = {}) {
    const documento = { activeElement: null, addEventListener() {} };
    class Elemento {
        constructor(tag) {
            this.tagName = tag; this.children = []; this.handlers = {}; this.attributes = {};
            this.disabled = false; this.value = ''; this.checked = false; this.texto = '';
        }
        append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
        prepend(node) { node.parent = this; this.children.unshift(node); }
        remove() { this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
        get isConnected() { return this === documento.body || !!this.parent?.isConnected; }
        get textContent() { return this.texto + this.children.map(n => n.textContent).join(''); }
        set textContent(value) { this.texto = String(value); this.children = []; }
        set innerHTML(_) { assert.fail('No interpretar mensajes como HTML'); }
        setAttribute(name, value) { this.attributes[name] = value; }
        addEventListener(name, handler) { this.handlers[name] = handler; }
        removeEventListener(name) { delete this.handlers[name]; }
        focus() { if (!this.disabled) documento.activeElement = this; }
        closest(selector) { return this.className === selector.slice(1) ? this : this.parent?.closest(selector); }
        showModal() { this.open = true; }
        emit(name) { return this.handlers[name]?.({ preventDefault() {} }); }
    }
    documento.body = new Elemento('body');
    documento.defaultView = new Elemento('window');
    const all = () => { const result = []; const visit = e => { result.push(e); e.children.forEach(visit); }; visit(documento.body); return result; };
    documento.createElement = tag => new Elemento(tag);
    documento.querySelector = selector => all().find(e => e.className === selector.slice(1));
    documento.querySelectorAll = () => all().filter(e => ['input', 'button', 'select', 'textarea'].includes(e.tagName));
    documento.getElementById = id => all().find(e => e.id === id) || null;
    const context = vm.createContext({ document: documento, window: { api, location: { search: '' } }, URLSearchParams,
        console: { log() {}, error() {}, warn() {} } });
    const sources = ['Public/js/fotos.js', 'Public/js/avisos.js', 'Public/js/salidaSesion.js', 'Public/js/cierreVentana.js', 'Public/js/validaciones.js', 'Public/js/busquedaEvaluacion.js', 'Public/js/render.js'];
    vm.runInContext(sources.map(file => read(file).replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')).join('\n'), context);
    return { documento, context,
        add(id, value = '', tag = 'input') { const e = new Elemento(tag); e.id = id; e.value = value; documento.body.append(e); return e; },
        dialog: () => all().find(e => e.tagName === 'dialog'),
        choose(text) { return all().find(e => e.tagName === 'button' && e.textContent === text).emit('click'); },
        message: () => documento.querySelector('.aviso-aplicacion')?.children[0].textContent,
    };
}
const turn = () => new Promise(resolve => setImmediate(resolve));

test('crear cuenta: A, AB y espacios se rechazan sin IPC; corregir a Ana permite crear', async () => {
    const llamadas = [];
    const v = preparar({ crearUsuario: async datos => { llamadas.push(datos); return { success: true, id: 8 }; } });
    v.add('btnCrearUsuario', '', 'button'); v.add('nuevoID', '8');
    const nombre = v.add('nuevoUsuario'); const clave = v.add('nuevaContrasena', 'Prueba');
    v.add('esAdmin'); v.add('juez'); v.add('tipoUsuario');
    for (const valor of ['A', 'AB', ' A ', '   ']) {
        nombre.value = valor; await v.context.crearUsuario();
        assert.equal(llamadas.length, 0); assert.equal(nombre.value, valor);
        assert.equal(nombre.disabled, false); assert.equal(clave.value, 'Prueba');
        assert.match(v.message(), /3 caracteres|obligatorio/);
    }
    nombre.value = ' Ana '; await v.context.crearUsuario();
    assert.equal(llamadas.length, 1); assert.equal(llamadas[0].cNombreUsuario, 'Ana');
});

for (const aceptar of [false, true]) {
    test(`cuenta antigua A: ${aceptar ? 'confirmar permite eliminar' : 'cancelar la conserva'}`, async () => {
        const llamadas = [];
        const v = preparar({ obtenerRolUsuario: async nombre => { assert.equal(nombre, 'A'); return 'user'; },
            eliminarUsuario: async nombre => { llamadas.push(nombre); return { success: true }; } });
        const campo = v.add('usuarioEliminar', ' A '); v.add('btnEliminarUsuario', '', 'button');
        const pending = v.context.eliminarUsuario(); await turn();
        assert.ok(v.dialog()); assert.match(v.dialog().textContent, /"A"/);
        assert.equal(llamadas.length, 0);
        v.choose(aceptar ? 'Eliminar' : 'Cancelar'); await pending;
        assert.deepEqual(llamadas, aceptar ? ['A'] : []);
        assert.equal(campo.value, aceptar ? '' : ' A '); assert.equal(campo.disabled, false);
    });
}

test('eliminar nombre vacío no consulta ni abre confirmación', async () => {
    const v = preparar({ obtenerRolUsuario: () => assert.fail('No debe consultar') });
    v.add('usuarioEliminar', '   '); v.add('btnEliminarUsuario', '', 'button');
    await v.context.eliminarUsuario();
    assert.equal(v.dialog(), undefined); assert.match(v.message(), /Ingresa el nombre/);
});

test('los avisos son texto, reutilizan el panel y no desplazan el foco', () => {
    const v = preparar(); const campo = v.add('campo', 'Borrador'); campo.focus();
    v.context.mostrarAviso('<img src=x onerror=alert(1)>');
    assert.equal(v.message(), '<img src=x onerror=alert(1)>');
    assert.equal(v.documento.activeElement, campo);
    v.choose('Ocultar aviso');
    v.context.mostrarAviso('Otro aviso');
    assert.equal(v.documento.body.children.filter(e => e.className === 'aviso-aplicacion').length, 1);
    assert.equal(v.documento.querySelector('.aviso-aplicacion').hidden, false);
});

for (const modo of ['Cancelar', 'Escape', 'cerrar', 'salir']) {
    test(`eliminar pareja: ${modo} conserva el ID y nunca invoca el borrado`, async () => {
        const v = preparar({ eliminarPareja() { assert.fail('No debe eliminar'); } });
        const campo = v.add('nParejaID', '11'); const boton = v.add('btnEliminarPareja', '', 'button'); boton.focus();
        const pending = v.context.eliminarPareja();
        assert.equal(campo.disabled, true);
        assert.equal(v.documento.activeElement.textContent, 'Cancelar');
        if (modo === 'Cancelar') v.choose(modo);
        if (modo === 'Escape') v.dialog().emit('cancel');
        if (modo === 'cerrar') v.dialog().emit('close');
        if (modo === 'salir') v.documento.defaultView.emit('pagehide');
        await pending;
        assert.equal(campo.value, '11'); assert.equal(campo.disabled, false);
        assert.equal(v.documento.activeElement, boton); assert.equal(v.dialog(), undefined);
    });
}

test('confirmación y escritura pendientes impiden dos eliminaciones; error permite reintentar', async () => {
    let finish; const llamadas = [];
    const v = preparar({ eliminarPareja(id) { llamadas.push(id); return new Promise(resolve => { finish = resolve; }); } });
    const campo = v.add('nParejaID', '11'); v.add('btnEliminarPareja', '', 'button');
    const pending = v.context.eliminarPareja();
    await v.context.eliminarPareja(); assert.equal(llamadas.length, 0);
    v.choose('Eliminar'); await turn(); await v.context.eliminarPareja();
    assert.deepEqual(llamadas, ['11']); assert.equal(campo.disabled, true);
    finish({ success: false, error: 'Error de prueba' }); await pending;
    assert.equal(campo.value, '11'); assert.equal(campo.disabled, false);
    assert.match(v.message(), /Error de prueba/);
    const retry = v.context.eliminarPareja(); v.choose('Eliminar'); await turn();
    finish({ success: true }); await retry;
    assert.deepEqual(llamadas, ['11', '11']); assert.equal(campo.value, '');
});

test('eliminar usuario espera el rol y la aceptación; cancelar conserva el nombre', async () => {
    let resolveRole; let llamadas = 0;
    const v = preparar({ obtenerRolUsuario: () => new Promise(r => { resolveRole = r; }), eliminarUsuario: async () => { llamadas++; return { success: true }; } });
    const campo = v.add('usuarioEliminar', 'usuario-prueba'); v.add('btnEliminarUsuario', '', 'button');
    const pending = v.context.eliminarUsuario();
    assert.equal(v.dialog(), undefined); assert.equal(campo.disabled, true);
    resolveRole('user'); await turn();
    assert.match(v.dialog().textContent, /usuario-prueba/); assert.equal(llamadas, 0);
    v.choose('Cancelar'); await pending;
    assert.equal(llamadas, 0); assert.equal(campo.value, 'usuario-prueba'); assert.equal(campo.disabled, false);
});

test('un segundo diálogo no comparte la aceptación del primero y un fallo al abrir cancela', async () => {
    const v = preparar(); const first = v.context.confirmarEliminacion('Primero');
    assert.equal(await v.context.confirmarEliminacion('Segundo'), false);
    v.choose('Eliminar'); assert.equal(await first, true);
    const create = v.documento.createElement;
    v.documento.createElement = tag => { const e = create(tag); if (tag === 'dialog') e.showModal = () => { throw Error('Fallo'); }; return e; };
    assert.equal(await v.context.confirmarEliminacion('Tercero'), false);
    assert.equal(v.dialog(), undefined); assert.match(v.message(), /No se eliminó/);
});

test('un error inesperado conserva datos y estados disabled anteriores', async () => {
    const v = preparar(); const campo = v.add('campo', 'Borrador'); campo.focus();
    const bloqueado = v.add('guardar-evaluacion', '', 'button'); bloqueado.disabled = true;
    v.add('otro', '', 'button');
    await v.context.ejecutarAccion('otro', async () => { throw Error('Detalle interno'); });
    assert.equal(campo.value, 'Borrador'); assert.equal(campo.disabled, false);
    assert.equal(bloqueado.disabled, true); assert.equal(v.documento.activeElement, campo);
    assert.doesNotMatch(v.message(), /Detalle interno/);
});

test('evaluación inválida conserva comentario y puntajes; corregir permite guardar', async () => {
    const datos = [];
    const v = preparar({ getUsuarioID: () => assert.fail('La vista no debe solicitar la identidad para evaluar'),
        registrarEvaluacion: async d => { datos.push(d); return { success: true }; } });
    v.add('guardar-evaluacion', '', 'button'); v.add('pareja-id-info', '', 'div').innerText = '1';
    for (let i = 1; i <= 6; i++) v.add(`aspecto${i}`, '5');
    const comentario = v.add('observaciones', 'x'.repeat(256), 'textarea');
    await v.context.guardarEvaluacion();
    assert.equal(datos.length, 0); assert.equal(comentario.value.length, 256); assert.equal(comentario.disabled, false);
    assert.match(v.message(), /demasiado largo/);
    comentario.value = 'Corregido'; await v.context.guardarEvaluacion();
    assert.equal(datos.length, 1); assert.equal(datos[0].nPuntaje, 30); assert.equal(datos[0].cComentario, 'Corregido');
    assert.equal(Object.hasOwn(datos[0], 'nJuezID'), false);
});

test('evaluación denegada conserva puntajes, comentario y foco para poder corregir', async () => {
    const v = preparar({ registrarEvaluacion: async () => ({ success: false, code: 'FORBIDDEN', error: 'Sesión sin permisos.' }) });
    const boton = v.add('guardar-evaluacion', '', 'button');
    v.add('pareja-id-info', '', 'div').innerText = '7';
    const aspectos = Array.from({ length: 6 }, (_, i) => v.add(`aspecto${i + 1}`, '5'));
    const comentario = v.add('observaciones', 'Conservar', 'textarea');
    boton.focus();
    await v.context.guardarEvaluacion();
    assert.equal(comentario.value, 'Conservar');
    for (const campo of aspectos) { assert.equal(campo.value, '5'); assert.equal(campo.disabled, false); }
    assert.equal(boton.disabled, false);
    assert.equal(v.documento.activeElement, boton);
    assert.match(v.message(), /Sesión sin permisos/);
});

test('crear usuario conserva campos tras error y restablece el rol al tener éxito', async () => {
    let success = false;
    const v = preparar({ crearUsuario: async () => ({ success, error: 'Duplicado', id: 8 }) });
    v.add('btnCrearUsuario', '', 'button'); const id = v.add('nuevoID', '8');
    const nombre = v.add('nuevoUsuario', 'Prueba'); const password = v.add('nuevaContrasena', 'ClaveDePrueba');
    v.add('esAdmin').checked = true; v.add('juez'); const tipo = v.add('tipoUsuario');
    await v.context.crearUsuario();
    assert.equal(nombre.value, 'Prueba'); assert.equal(password.value, 'ClaveDePrueba'); assert.equal(nombre.disabled, false);
    success = true; await v.context.crearUsuario();
    assert.equal(id.value, ''); assert.equal(password.value, ''); assert.equal(tipo.checked, true);
});

test('PDF: el rechazo IPC permite reintentar y no deja botones deshabilitados', async () => {
    let success = false;
    const v = preparar({ pdf: async () => { if (!success) throw Error('Fallo'); return { success: true, ruta: 'prueba.pdf' }; } });
    const boton = v.add('pdf', '', 'button'); v.context.vincularPDF('pdf', 'pdf');
    await boton.emit('click'); assert.equal(boton.disabled, false); assert.match(v.message(), /intenta nuevamente/);
    success = true; await boton.emit('click'); assert.match(v.message(), /prueba.pdf/);
});

test('render no usa alert/confirm nativos y las vistas afectadas incluyen los estilos', () => {
    assert.doesNotMatch(read('Public/js/render.js'), /\b(?:alert|confirm)\s*\(/);
    for (const vista of ['Administrador', 'Resultados', 'ModificarParejas', 'RegistroCategoriasEstilos']) {
        assert.match(read(`Vistas/${vista}.html`), /Public\/css\/avisos\.css/);
    }
});

function evaluacionConcurrente(api) {
    const v = preparar(api);
    for (const id of ['pareja-id', 'buscar-pareja', 'guardar-evaluacion', 'estado-busqueda-pareja',
        'pareja-id-info', 'participante1', 'participante2', 'categoria', 'estilo', 'btnGenerarPDFResultados']) {
        v.add(id, '1', id === 'pareja-id' ? 'input' : (id.includes('info') ? 'div' : 'button'));
    }
    v.context.inicializarBusquedaEvaluacion();
    v.context.vincularPDF('btnGenerarPDFResultados', 'pdf');
    v.get = id => v.documento.getElementById(id);
    return v;
}
const parejaPrueba = { nParejaID: 1, nombreParticipante1: 'A', nombreParticipante2: 'B' };

for (const fallo of [false, true]) {
    test(`buscar y pulsar PDF no deja controles bloqueados: consulta ${fallo ? 'fallida' : 'exitosa'}`, async () => {
        let resolver, consultas = 0, pdfs = 0;
        const v = evaluacionConcurrente({
            buscarParejaParaEvaluacion: () => { consultas++; return new Promise(r => { resolver = r; }); },
            pdf: async () => { pdfs++; return { success: true, ruta: 'prueba.pdf' }; }
        });
        const buscar = v.get('buscar-pareja').emit('click');
        // Emitir incluso sobre un botón disabled prueba también la guardia interna.
        await v.get('btnGenerarPDFResultados').emit('click');
        assert.equal(pdfs, 0);
        resolver(fallo ? { success: false, message: 'Fallo' } : { success: true, data: parejaPrueba });
        await buscar;
        await v.get('btnGenerarPDFResultados').emit('click');
        assert.equal(pdfs, 1);
        assert.equal(v.get('pareja-id').disabled, false);
        assert.equal(v.get('buscar-pareja').disabled, false);
        assert.equal(v.get('guardar-evaluacion').disabled, fallo);
        const reintento = v.get('buscar-pareja').emit('click');
        assert.equal(consultas, 2);
        resolver({ success: true, data: parejaPrueba }); await reintento;
    });
}

test('generar PDF y pulsar buscar conserva la ficha; buscar vuelve a funcionar tras el error', async () => {
    let rechazar; let consultas = 0;
    const v = evaluacionConcurrente({
        buscarParejaParaEvaluacion: async () => { consultas++; return { success: true, data: parejaPrueba }; },
        pdf: () => new Promise((_, reject) => { rechazar = reject; })
    });
    await v.get('buscar-pareja').emit('click');
    const pdf = v.get('btnGenerarPDFResultados').emit('click');
    await v.get('buscar-pareja').emit('click');
    assert.equal(consultas, 1);
    assert.equal(v.get('pareja-id-info').textContent, '1');
    rechazar(new Error('Error de prueba')); await pdf;
    assert.equal(v.get('guardar-evaluacion').disabled, false);
    await v.get('buscar-pareja').emit('click'); assert.equal(consultas, 2);
});


for (const rechazo of [false, true]) test('evaluación sin respuesta conserva puntajes y comentario sin reintento: ' + rechazo, async () => {
    let llamadas = 0;
    const error = 'Se perdió la confirmación. Consulta los datos antes de repetirla.';
    const v = preparar({ registrarEvaluacion: async () => { llamadas++; if (rechazo) throw Error(error); return { success: false, code: 'WRITE_OUTCOME_UNKNOWN', error }; } });
    const boton = v.add('guardar-evaluacion', '', 'button');
    v.add('pareja-id-info', '', 'div').innerText = '7';
    const aspectos = Array.from({ length: 6 }, (_, i) => v.add('aspecto' + (i + 1), '5'));
    const comentario = v.add('observaciones', 'Trabajo pendiente', 'textarea'); boton.focus();
    await v.context.guardarEvaluacion();
    assert.equal(llamadas, 1); assert.equal(comentario.value, 'Trabajo pendiente');
    for (const campo of aspectos) { assert.equal(campo.value, '5'); assert.equal(campo.disabled, false); }
    assert.equal(boton.disabled, false); assert.equal(v.documento.activeElement, boton);
    assert.match(v.message(), /Consulta los datos antes de repetirla/);
});

for (const paso of [1, 2]) {
    for (const modo of ['Cancelar', 'Escape', 'cerrar']) {
        test(`salir: ${modo} en confirmación ${paso} conserva el formulario y no cierra sesión`, async () => {
            const v = preparar({ cerrarSesion() { assert.fail('No cerrar'); } });
            const campo = v.add('campo', 'Borrador');
            const boton = v.add('btnSalir', '', 'button'); boton.focus();
            v.context.inicializarSalida();
            const pendiente = boton.emit('click');
            if (paso === 2) { v.choose('Sí, continuar'); await turn(); }
            assert.match(v.dialog().textContent, new RegExp(`${paso} de 2`));
            assert.equal(v.documento.activeElement.textContent, 'Cancelar');
            if (modo === 'Cancelar') v.choose('Cancelar');
            if (modo === 'Escape') v.dialog().emit('cancel');
            if (modo === 'cerrar') v.dialog().emit('close');
            await pendiente;
            assert.equal(campo.value, 'Borrador'); assert.equal(campo.disabled, false);
            assert.equal(v.documento.activeElement, boton); assert.equal(v.dialog(), undefined);
        });
    }
}

test('salir: exige ambas confirmaciones y evita doble envío; fallo permite reintentar', async () => {
    let llamadas = 0;
    const v = preparar({ cerrarSesion: async () => { llamadas++; return { success: false, error: 'Operación pendiente' }; } });
    const boton = v.add('btnSalir', '', 'button'); v.context.inicializarSalida();
    for (let intento = 1; intento <= 2; intento++) {
        const pendiente = boton.emit('click'); await boton.emit('click');
        assert.equal(llamadas, intento - 1);
        v.choose('Sí, continuar'); await turn();
        assert.match(v.dialog().textContent, /borradores.*perderán/);
        assert.equal(llamadas, intento - 1);
        v.choose('Sí, cerrar sesión'); await pendiente;
        assert.equal(llamadas, intento); assert.equal(boton.disabled, false);
        assert.equal(v.message(), 'Operación pendiente');
    }
});

test('salir: una operación de la vista impide abrir confirmaciones', async () => {
    const v = preparar({ cerrarSesion() { assert.fail('No cerrar'); } });
    const boton = v.add('btnSalir', '', 'button'); v.context.inicializarSalida();
    const liberar = v.context.iniciarOperacion();
    await boton.emit('click');
    assert.equal(v.dialog(), undefined); assert.match(v.message(), /Espera/);
    liberar();
});

test('salir: dos aceptaciones envían una sola solicitud y no usan navegación del renderer', async () => {
    let llamadas = 0;
    const v = preparar({ cerrarSesion: async () => { llamadas++; return { success: true }; } });
    const boton = v.add('btnSalir', '', 'button'); v.context.inicializarSalida();
    const pendiente = boton.emit('click');
    v.choose('Sí, continuar'); await turn();
    assert.equal(llamadas, 0);
    v.choose('Sí, cerrar sesión'); await pendiente;
    assert.equal(llamadas, 1); assert.equal(v.dialog(), undefined);
    assert.equal(v.context.window.location.href, undefined);
});

for (const modo of ['Cancelar', 'Escape', 'Sí, cerrar']) {
    test(`cierre X/Alt+F4: ${modo} usa una sola confirmación y conserva el foco al cancelar`, async () => {
        let solicitar; const respuestas = [];
        const v = preparar({ alSolicitarCierre(fn) { solicitar = fn; return () => {}; },
            responderCierreVentana: async (...args) => { respuestas.push(args); return { success: true }; } });
        const campo = v.add('campo', 'Datos sin guardar'); campo.focus();
        v.context.inicializarCierreVentana();
        const pendiente = solicitar({ id: 5, aplicacion: true });
        await solicitar({ id: 5, aplicacion: true }); // Un segundo clic en X no duplica el diálogo.
        assert.match(v.dialog().textContent, /Cerrar aplicación/);
        assert.equal(v.documento.activeElement.textContent, 'Cancelar');
        assert.equal(respuestas.length, 0);
        if (modo === 'Escape') v.dialog().emit('cancel'); else v.choose(modo);
        await pendiente;
        assert.deepEqual(respuestas, [[5, modo === 'Sí, cerrar']]);
        assert.equal(v.dialog(), undefined); assert.equal(campo.value, 'Datos sin guardar');
        assert.equal(v.documento.activeElement, campo);
    });
}

test('cierre X: no se superpone al doble diálogo de Salir', async () => {
    let solicitar; const respuestas = [];
    const v = preparar({ alSolicitarCierre(fn) { solicitar = fn; return () => {}; },
        responderCierreVentana: async (...args) => { respuestas.push(args); return { success: true }; } });
    const boton = v.add('btnSalir', '', 'button');
    v.context.inicializarSalida(); v.context.inicializarCierreVentana();
    const salida = boton.emit('click');
    await solicitar({ id: 9, aplicacion: true });
    assert.deepEqual(respuestas, [[9, false]]);
    assert.match(v.dialog().textContent, /1 de 2/);
    v.choose('Cancelar'); await salida;
});

test('cierre X: fallo IPC libera el intento y un campo ocupado impide cerrar', async () => {
    let solicitar, fallar = true; const respuestas = [];
    const v = preparar({ alSolicitarCierre(fn) { solicitar = fn; return () => {}; },
        responderCierreVentana: async (id, confirmado) => { respuestas.push([id, confirmado]); if (fallar && confirmado) throw Error('IPC'); return { success: true }; } });
    const boton = v.add('btnSalir', '', 'button'); v.context.inicializarCierreVentana();
    boton.disabled = true; await solicitar({ id: 1, aplicacion: true });
    assert.equal(v.dialog(), undefined); assert.deepEqual(respuestas, [[1, false]]);
    boton.disabled = false;
    const pendiente = solicitar({ id: 2, aplicacion: false });
    assert.match(v.dialog().textContent, /Cerrar ventana/);
    v.choose('Sí, cerrar'); await pendiente;
    assert.deepEqual(respuestas.slice(1), [[2, true], [2, false]]);
    fallar = false;
    const nuevo = solicitar({ id: 3, aplicacion: false }); v.choose('Cancelar'); await nuevo;
    assert.deepEqual(respuestas.at(-1), [3, false]);
});

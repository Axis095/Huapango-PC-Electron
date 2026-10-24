const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const url = s => `data:text/javascript;base64,${Buffer.from(s).toString('base64')}`;
const modulo = import(url(read('Public/js/fichaPareja.js')
    .replace('"./fotos.js"', JSON.stringify(url(read('Public/js/fotos.js'))))
    .replace('"./validaciones.js"', JSON.stringify(url(read('Public/js/validaciones.js'))))));
global.DataTransfer = class { files = []; items = { add: f => this.files.push(f) }; };
const tick = () => new Promise(r => setImmediate(r));
const fila = { versionEdicion: 'a'.repeat(64), nParejaID: 7, cNombre: 'Juan', cApellido: 'Prueba', cEmail: 'juan@example.test', nTelefono: '5512345678', dNacimiento: new Date(2000, 0, 2), oFoto: 'uploads/foto.jpg',
    cNombreM: 'Ana', cApellidoM: 'Prueba', cEmailM: 'ana@example.test', nTelefonoM: '5598765432', dNacimientoM: '2001-03-04', IFotoM: null };
async function vista(extra = {}, almacen = { data: null }) {
    const elementos = new Map();
    const documento = { activeElement: null, handlers: {}, addEventListener(n, f) { this.handlers[n] = f; } };
    const get = id => {
        if (!elementos.has(id)) {
            let value = '', disabled = false;
            const e = { id, handlers: {}, readOnly: false, hidden: true, textContent: '', dataset: {}, files: [], isConnected: true,
                focus() { if (!this.disabled) documento.activeElement = this; }, addEventListener(n, f) { this.handlers[n] = f; } };
            Object.defineProperty(e, 'value', { get: () => value, set: v => { value = v; if (id.startsWith('foto') && v === '') e.files = []; } });
            Object.defineProperty(e, 'disabled', { get: () => disabled, set: v => { disabled = v; if (v && documento.activeElement === e) documento.activeElement = null; } });
            elementos.set(id, e);
        }
        return elementos.get(id);
    };
    documento.getElementById = get; documento.querySelector = get;
    const consultas = [], actualizaciones = [], navegaciones = [];
    const api = {
        async obtenerBorradorModificacion() { return { success: true, data: structuredClone(almacen.data) }; },
        async guardarBorradorModificacion(datos) { almacen.data = structuredClone(datos); return { success: true }; },
        async limpiarBorradorModificacion() { almacen.data = null; return { success: true }; },
        async buscarParejaPorID(id) { consultas.push(id); return { success: true, data: [{ ...fila, nParejaID: Number(id) }] }; },
        async actualizarParejaCompleta(datos) { actualizaciones.push(datos); return { success: true, versionEdicion: 'b'.repeat(64) }; }, ...extra
    };
    const { inicializarFichaPareja } = await modulo;
    const listo = inicializarFichaPareja(documento, api, destino => navegaciones.push(destino));
    return { get, documento, consultas, actualizaciones, almacen, navegaciones, listo,
        click: id => get(id).handlers.click({ preventDefault() {} }),
        async buscar(id = '7') { get('nParejaID').value = id; await get('btnBuscarPareja').handlers.click({ preventDefault() {} }); },
        editar(id, value) { get(id).value = value; get(id).handlers.input(); },
        navegar: () => get('.menu').handlers.click({ target: { closest: () => ({ id: 'btnRegistros' }) }, preventDefault() {}, stopImmediatePropagation() {} }) };
}

test('buscar precarga ambos participantes, convierte fechas y abre en lectura sin escribir SQL', async () => {
    const v = await vista(); await v.listo; await v.buscar();
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Juan'); assert.equal(v.get('nombreFemeninoUpdate').value, 'Ana');
    assert.equal(v.get('fechaNacimientoMasculinoUpdate').value, '2000-01-02');
    assert.equal(v.get('fechaNacimientoFemeninoUpdate').value, '2001-03-04');
    assert.equal(v.get('nombreMasculinoUpdate').readOnly, true); assert.equal(v.get('BTNUpdate').hidden, true);
    for (const lado of ['Masculino', 'Femenino']) assert.equal(v.get(`edicionFoto${lado}`).hidden, true);
    assert.equal(v.get('ayudaFotosFicha').hidden, true);
    assert.match(v.get('parejaSeleccionada').textContent, /#7/); assert.equal(v.actualizaciones.length, 0);
});
test('editar y guardar usa el ID de la ficha aunque el buscador tenga otro número', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    for (const lado of ['Masculino', 'Femenino']) {
        assert.equal(v.get(`edicionFoto${lado}`).hidden, false);
        assert.equal(v.get(`foto${lado}Update`).disabled, false);
    }
    assert.equal(v.get('ayudaFotosFicha').hidden, false);
    v.editar('nombreMasculinoUpdate', 'Juan corregido'); v.get('nParejaID').value = '99';
    v.get('BTNUpdate').focus(); await v.click('BTNUpdate');
    assert.equal(v.actualizaciones[0].nParejaID, '7'); assert.equal(v.actualizaciones[0].cNombreMasculino, 'Juan corregido');
    assert.equal(v.actualizaciones[0].cNombreFemenino, 'Ana'); assert.equal(v.get('nombreMasculinoUpdate').readOnly, true);
    assert.equal(v.documento.activeElement,v.get('btnEditarPareja'));
    for (const lado of ['Masculino', 'Femenino']) assert.equal(v.get(`edicionFoto${lado}`).hidden, true);
    assert.equal(v.get('ayudaFotosFicha').hidden, true);
});
test('buscar otra pareja con cambios requiere confirmar y Cancelar conserva el borrador', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('nombreMasculinoUpdate', 'Cambio'); await v.buscar('8');
    assert.equal(v.consultas.length, 1); assert.equal(v.get('confirmarLimpiarModificacion').hidden, false);
    await v.click('btnCancelarLimpiarModificacion'); assert.equal(v.get('nombreMasculinoUpdate').value, 'Cambio');
    await v.buscar('8'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.consultas.length, 2); assert.match(v.get('parejaSeleccionada').textContent, /#8/);
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Juan');
});
test('búsqueda inexistente o rechazada conserva la edición anterior identificada por su ID', async () => {
    let fallar = false;
    const v = await vista({ buscarParejaPorID: async () => fallar ? { success: false, message: 'No existe esa pareja.' } : { success: true, data: [fila] } });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja'); v.editar('nombreMasculinoUpdate', 'Cambio'); fallar = true;
    await v.buscar('9'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Cambio'); assert.match(v.get('parejaSeleccionada').textContent, /#7/);
    assert.match(v.get('estadoBusquedaParejas').textContent, /No existe/);
});
test('ID inválido no consulta; respuesta con otro ID no cambia la ficha', async () => {
    const v = await vista({ buscarParejaPorID: async () => ({ success: true, data: [fila] }) }); await v.listo;
    await v.buscar('7x'); assert.equal(v.get('fichaPareja').hidden, true);
    await v.buscar('8'); assert.equal(v.get('fichaPareja').hidden, true); assert.match(v.get('estadoBusquedaParejas').textContent, /no corresponde/);
});
test('validación antes de guardar conserva campos y habilita corregir sin perder el foco', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('emailFemeninoUpdate', ''); v.get('BTNUpdate').focus(); await v.click('BTNUpdate');
    assert.equal(v.actualizaciones.length, 0); assert.equal(v.get('nombreFemeninoUpdate').value, 'Ana');
    assert.equal(v.get('emailFemeninoUpdate').disabled, false); assert.equal(v.documento.activeElement, v.get('BTNUpdate'));
    v.editar('emailFemeninoUpdate', 'ana@example.test'); await v.click('BTNUpdate'); assert.equal(v.actualizaciones.length, 1);
});
for (const code of ['NOT_FOUND', 'TRANSACTION_OUTCOME_UNKNOWN']) test(`${code}: mantiene edición y fotos después del error SQL`, async () => {
    const v = await vista({ actualizarParejaCompleta: async () => ({ success: false, code, error: `Revisar: ${code}` }) }); await v.listo;
    await v.buscar(); await v.click('btnEditarPareja'); v.get('fotoMasculinoUpdate').files = [new File(['foto'], 'foto.png')];
    await v.click('BTNUpdate');
    assert.equal(v.get('fotoMasculinoUpdate').files.length, 1); assert.equal(v.get('nombreMasculinoUpdate').readOnly, false);
    assert.match(v.get('estadoBusquedaParejas').textContent, new RegExp(code));
});
test('navegar y regresar recupera ID de la ficha, texto editado y ambas fotos', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('nombreFemeninoUpdate', 'Cambio');
    for (const l of ['Masculino','Femenino']) v.get(`foto${l}Update`).files = [new File([l], `${l}.png`)];
    await v.navegar(); const otra = await vista({}, v.almacen); await otra.listo;
    assert.match(otra.get('parejaSeleccionada').textContent, /#7/); assert.equal(otra.get('nombreFemeninoUpdate').value, 'Cambio');
    for (const l of ['Masculino','Femenino']) assert.equal(await otra.get(`foto${l}Update`).files[0].text(), l);
    for (const l of ['Masculino','Femenino']) assert.equal(otra.get(`edicionFoto${l}`).hidden, false);
    assert.equal(otra.get('nombreFemeninoUpdate').readOnly, false);
});
test('SQL confirmado limpia selección de fotos y actualiza el borrador antes de volver', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.get('fotoMasculinoUpdate').files = [new File(['foto'], 'foto.jpg')]; await v.click('BTNUpdate'); await v.navegar();
    assert.equal(Buffer.from(v.actualizaciones[0].fotos.Masculino.bytes).toString(), 'foto');
    const otra = await vista({}, v.almacen); await otra.listo;
    assert.equal(otra.get('fotoMasculinoUpdate').files.length, 0); assert.equal(otra.get('nombreMasculinoUpdate').readOnly, true);
});
test('cancelar edición requiere confirmar y restaura los datos originales sin SQL', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja'); v.editar('nombreMasculinoUpdate','Cambio');
    await v.click('btnCancelarEdicion'); await v.click('btnCancelarLimpiarModificacion'); assert.equal(v.get('nombreMasculinoUpdate').value, 'Cambio');
    await v.click('btnCancelarEdicion'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Juan'); assert.equal(v.actualizaciones.length, 0);
});
test('cerrar ficha descarta únicamente el borrador después de confirmar', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnLimpiarModificacion');
    await v.click('btnConfirmarLimpiarModificacion'); assert.equal(v.almacen.data, null); assert.equal(v.get('fichaPareja').hidden, true);
    assert.equal(v.actualizaciones.length, 0);
});
test('fallo al conservar impide navegar sin borrar datos', async () => {
    const v = await vista({ guardarBorradorModificacion: async () => ({ success: false }) }); await v.listo; await v.buscar();
    await v.navegar(); assert.equal(v.navegaciones.length, 0); assert.equal(v.get('nombreMasculinoUpdate').value, 'Juan');
    assert.equal(v.get('nParejaID').disabled, false);
});
test('foto excesiva no se lee ni se envía; quitarla permite guardar y navegar', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.get('fotoMasculinoUpdate').files = [{ name: 'grande.jpg', size: 6*1024*1024, arrayBuffer() { assert.fail('No leer'); } }];
    await v.click('BTNUpdate'); await v.navegar(); assert.equal(v.actualizaciones.length,0); assert.equal(v.navegaciones.length,0);
    assert.equal(v.get('nombreMasculinoUpdate').value,'Juan'); v.get('fotoMasculinoUpdate').value='';
    await v.click('BTNUpdate'); await v.navegar(); assert.equal(v.actualizaciones.length,1); assert.equal(v.navegaciones.length,1);
});
test('fallo del borrador después de confirmar SQL informa éxito y no repite la escritura', async () => {
    let falla=false;
    const v=await vista({ guardarBorradorModificacion:async()=>({success:!falla}) }); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    await tick(); falla=true; await v.click('BTNUpdate'); await v.click('BTNUpdate');
    assert.equal(v.actualizaciones.length,1); assert.match(v.get('estadoBorradorModificacion').textContent,/MySQL confirmó/);
});
test('no descarta la ficha si falla limpiar el borrador', async()=>{
    const v=await vista({limpiarBorradorModificacion:async()=>({success:false})}); await v.listo; await v.buscar();
    await v.click('btnLimpiarModificacion'); await v.click('btnConfirmarLimpiarModificacion');
    assert.equal(v.get('fichaPareja').hidden,false); assert.equal(v.get('nombreMasculinoUpdate').value,'Juan');
});
test('Escape cancela el cambio de ficha sin consultar ni descartar cambios', async()=>{
    const v=await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja'); v.editar('nombreMasculinoUpdate','Cambio');
    await v.buscar('8'); v.documento.handlers.keydown({key:'Escape',preventDefault(){}});
    assert.equal(v.consultas.length,1); assert.equal(v.get('nombreMasculinoUpdate').value,'Cambio');
    assert.equal(v.get('confirmarLimpiarModificacion').hidden,true);
});
test('operación pendiente evita doble guardado y navegación', async () => {
    let resolver, cantidad = 0;
    const v = await vista({ actualizarParejaCompleta: () => { cantidad++; return new Promise(r => { resolver = r; }); } }); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    const guardado = v.click('BTNUpdate'); await tick(); await v.click('BTNUpdate'); await v.navegar();
    assert.equal(cantidad, 1); assert.equal(v.navegaciones.length, 0); resolver({ success: true }); await guardado;
    assert.equal(v.get('nParejaID').disabled, false);
});
test('foto lenta y ediciones sucesivas conservan el último texto antes de navegar', async () => {
    let resolver;
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.get('fotoMasculinoUpdate').files = [{ name: 'foto.png', type: 'image/png', size: 3, arrayBuffer: () => new Promise(r => { resolver = r; }) }];
    v.editar('nombreMasculinoUpdate', 'Primero'); await tick(); v.editar('nombreMasculinoUpdate', 'Último');
    const nav = v.navegar(); await tick(); assert.equal(v.navegaciones.length, 0); resolver(new Uint8Array([1,2,3]).buffer); await nav;
    assert.equal(v.almacen.data.campos.nombreMasculinoUpdate, 'Último');
});
test('recuperación fallida no sobrescribe el borrador y permite salir para reabrir', async () => {
    const v = await vista({ obtenerBorradorModificacion: async () => ({ success: false }) }); await v.listo;
    await v.buscar(); await v.click('BTNUpdate'); await v.navegar();
    assert.equal(v.consultas.length, 0); assert.equal(v.actualizaciones.length, 0); assert.equal(v.navegaciones.length, 1); assert.equal(v.almacen.data, null);
});
test('IPC permite ambos accesos a la ficha y aísla Registro, subframes y otras ventanas', t => {
    const sesion = require('../Modelos/sesionModel');
    sesion.guardarSesion(1, 'user');
    t.after(() => sesion.cerrarSesion());
    const c = require('../Controladores/borradorModificacionController');
    const frame = { url: pathToFileURL(path.join(root, 'Vistas/BusquedaParejas.html')).href };
    const e = { senderFrame: frame, sender: { mainFrame: frame } };
    const d = { version: 2, campos: {}, fotos: {} };
    assert.equal(c.guardarBorradorModificacion(e,d).success,true);
    frame.url=pathToFileURL(path.join(root,'Vistas/ModificarParejas.html')).href; assert.equal(c.obtenerBorradorModificacion(e).data,d);
    assert.equal(c.obtenerBorradorModificacion({ ...e, senderFrame: { ...frame } }).success,false);
    assert.equal(c.obtenerBorradorModificacion({ senderFrame:frame, sender:{mainFrame:frame} }).data,null);
    frame.url=pathToFileURL(path.join(root,'Vistas/Registros.html')).href; assert.equal(c.limpiarBorradorModificacion(e).success,false);
});
test('ambos accesos usan la misma ficha y los campos antiguos duplicados desaparecen', () => {
    assert.equal(read('Vistas/BusquedaParejas.html'),read('Vistas/ModificarParejas.html'));
    const html=read('Vistas/BusquedaParejas.html'), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size); assert.ok(!ids.includes('nombreMasculino'));
    assert.match(read('Public/js/render.js'), /return inicializarFichaPareja\(\)/);
});


test('conflicto conserva texto, fotos y versión al cambiar de módulo; no reintenta a ciegas', async () => {
    let intentos = 0;
    const api = { actualizarParejaCompleta: async () => { intentos++; return { success: false, code: 'EDIT_CONFLICT', error: 'Otro operador modificó esta pareja.' }; } };
    const v = await vista(api); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('emailFemeninoUpdate', 'corregido@example.test');
    for (const lado of ['Masculino', 'Femenino']) v.get('foto' + lado + 'Update').files = [new File([lado], lado + '.png')];
    await v.click('BTNUpdate'); await v.click('BTNUpdate');
    assert.equal(intentos, 1); assert.equal(v.get('BTNUpdate').disabled, true);
    assert.equal(v.get('revisionPareja').hidden, false);
    await v.navegar();
    const otra = await vista(api, v.almacen); await otra.listo;
    assert.equal(otra.get('emailFemeninoUpdate').value, 'corregido@example.test');
    assert.equal(otra.almacen.data.ficha.versionEdicion, 'a'.repeat(64));
    assert.equal(otra.almacen.data.ficha.conflicto, true);
    assert.equal(otra.get('BTNUpdate').disabled, true);
    for (const lado of ['Masculino', 'Femenino']) assert.equal(await otra.get('foto' + lado + 'Update').files[0].text(), lado);
    await otra.click('BTNUpdate'); assert.equal(intentos, 1);
});

test('revisión explícita conserva la edición local y toma los demás campos actuales sin escribir SQL', async () => {
    let consultas = 0, guardados = [];
    const v = await vista({
        buscarParejaPorID: async () => ({ success: true, data: [{ ...fila, nTelefono: ++consultas === 1 ? fila.nTelefono : '5500000000', versionEdicion: consultas === 1 ? 'a'.repeat(64) : 'b'.repeat(64) }] }),
        actualizarParejaCompleta: async d => { guardados.push(structuredClone(d)); return guardados.length === 1
            ? { success: false, code: 'EDIT_CONFLICT', error: 'Otro operador modificó esta pareja.' }
            : { success: true, versionEdicion: 'c'.repeat(64) }; }
    });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('emailFemeninoUpdate', 'corregido@example.test');
    v.get('fotoMasculinoUpdate').files = [new File(['foto'], 'foto.png')];
    await v.click('BTNUpdate'); await v.click('btnRevisarPareja');
    assert.equal(guardados.length, 1);
    assert.equal(v.get('telefonoMasculinoUpdate').value, fila.nTelefono);
    assert.match(v.get('detalleRevisionPareja').textContent, /5500000000/);
    assert.match(v.get('detalleRevisionPareja').textContent, /corregido@example.test/);
    assert.equal(v.almacen.data.ficha.versionEdicion, 'a'.repeat(64));
    await v.click('btnAplicarRevision');
    assert.equal(guardados.length, 1);
    assert.equal(v.get('telefonoMasculinoUpdate').value, '5500000000');
    assert.equal(v.get('emailFemeninoUpdate').value, 'corregido@example.test');
    assert.equal(v.get('fotoMasculinoUpdate').files.length, 1);
    assert.equal(v.almacen.data.ficha.versionEdicion, 'b'.repeat(64));
    await v.click('BTNUpdate');
    assert.equal(guardados[1].versionEdicion, 'b'.repeat(64));
    assert.equal(guardados[1].nTelefonoMasculino, '5500000000');
    assert.equal(v.almacen.data.ficha.versionEdicion, 'c'.repeat(64));
});

test('si ambos editan el mismo campo, la revisión muestra ambos y permite corregir antes de preparar', async () => {
    let consultas = 0;
    const v = await vista({ buscarParejaPorID: async () => ({ success: true, data: [++consultas === 1 ? fila :
        { ...fila, cNombre: '<img src=x onerror=alert(1)>', versionEdicion: 'b'.repeat(64) }] }),
        actualizarParejaCompleta: async () => ({ success: false, code: 'EDIT_CONFLICT', error: 'Conflicto' }) });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('nombreMasculinoUpdate', 'Mi nombre'); await v.click('BTNUpdate'); await v.click('btnRevisarPareja');
    assert.match(v.get('detalleRevisionPareja').textContent, /Actual en MySQL: <img/);
    assert.match(v.get('detalleRevisionPareja').textContent, /Propuesto: Mi nombre/);
    assert.equal(v.get('detalleRevisionPareja').innerHTML, undefined);
    v.editar('nombreMasculinoUpdate', 'Nombre acordado');
    await v.click('btnAplicarRevision');
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Nombre acordado');
    assert.equal(v.almacen.data.ficha.original.nombreMasculinoUpdate, '<img src=x onerror=alert(1)>');
});

for (const modo of ['inexistente', 'error', 'otro-id', 'sin-version']) test('revisión fallida conserva borrador y bloquea guardar: ' + modo, async () => {
    let consultas = 0;
    const v = await vista({ buscarParejaPorID: async () => {
        if (++consultas === 1) return { success: true, data: [fila] };
        if (modo === 'error') throw Error('Sin conexión');
        if (modo === 'inexistente') return { success: false, message: 'La pareja fue eliminada.' };
        return { success: true, data: [{ ...fila, nParejaID: modo === 'otro-id' ? 8 : 7, versionEdicion: undefined }] };
    }, actualizarParejaCompleta: async () => ({ success: false, code: 'EDIT_CONFLICT', error: 'Conflicto' }) });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja'); v.editar('nombreMasculinoUpdate', 'Mi cambio');
    await v.click('BTNUpdate'); const antes = structuredClone(v.almacen.data);
    await v.click('btnRevisarPareja'); await v.click('btnAplicarRevision');
    assert.deepEqual(v.almacen.data, antes); assert.equal(v.get('nombreMasculinoUpdate').value, 'Mi cambio');
    assert.equal(v.get('BTNUpdate').disabled, true); assert.equal(v.get('btnAplicarRevision').hidden, true);
});

test('borrador antiguo sin versión se conserva y exige una revisión antes de guardar', async () => {
    const v = await vista(); await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('nombreMasculinoUpdate', 'Pendiente antiguo'); await v.navegar();
    delete v.almacen.data.ficha.versionEdicion;
    const otra = await vista({}, v.almacen); await otra.listo; await otra.click('BTNUpdate');
    assert.equal(otra.actualizaciones.length, 0); assert.equal(otra.get('BTNUpdate').disabled, true);
    assert.equal(otra.get('nombreMasculinoUpdate').value, 'Pendiente antiguo');
    await otra.click('btnRevisarPareja'); await otra.click('btnAplicarRevision');
    assert.equal(otra.get('nombreMasculinoUpdate').value, 'Pendiente antiguo');
    await otra.click('BTNUpdate'); assert.equal(otra.actualizaciones.length, 1);
});

test('otro cambio después de revisar vuelve a bloquear sin perder el borrador', async () => {
    const v = await vista({ actualizarParejaCompleta: async () => ({ success: false, code: 'EDIT_CONFLICT', error: 'La pareja cambió otra vez.' }) });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja'); v.editar('nombreMasculinoUpdate', 'Mi cambio');
    await v.click('BTNUpdate'); await v.click('btnRevisarPareja'); await v.click('btnAplicarRevision');
    await v.click('BTNUpdate');
    assert.equal(v.almacen.data.ficha.conflicto, true); assert.equal(v.get('BTNUpdate').disabled, true);
    assert.equal(v.get('nombreMasculinoUpdate').value, 'Mi cambio');
});


test('rechazo de conexión al guardar conserva borrador, fotos y versión para volver al módulo', async () => {
    let llamadas = 0;
    const v = await vista({ actualizarParejaCompleta: async () => { llamadas++; throw Error('MySQL no respondió'); } });
    await v.listo; await v.buscar(); await v.click('btnEditarPareja');
    v.editar('nombreMasculinoUpdate', 'Cambio pendiente');
    v.get('fotoFemeninoUpdate').files = [new File(['foto'], 'foto.png')];
    await v.click('BTNUpdate'); await v.navegar();
    const otra = await vista({}, v.almacen); await otra.listo;
    assert.equal(llamadas, 1); assert.equal(otra.get('nombreMasculinoUpdate').value, 'Cambio pendiente');
    assert.equal(otra.get('BTNUpdate').disabled, false);
    assert.equal(await otra.get('fotoFemeninoUpdate').files[0].text(), 'foto');
    assert.equal(otra.almacen.data.ficha.versionEdicion, 'a'.repeat(64));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { crearAlmacenFotos, MAX_BYTES } = require('../Modelos/almacenFotos');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=', 'base64');
const foto = () => ({ nombre: '../../original.jpg', tipo: 'image/jpeg', bytes: Buffer.from(png) });
const datos = { nParejaID: '1', cNombreMasculino: 'Juan', cApellidoMasculino: 'Prueba', cEmailMasculino: 'j@example.test', nTelefonoMasculino: '5512345678', dNacimientoMasculino: '2000-01-01', sexoMasculino: 'M',
    cNombreFemenino: 'Ana', cApellidoFemenino: 'Prueba', cEmailFemenino: 'a@example.test', nTelefonoFemenino: '5512345679', dNacimientoFemenino: '2000-01-01', sexoFemenino: 'F' };
async function preparar(t, opciones = {}) {
    const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'huapango-fotos-'));
    t.after(() => fs.rm(directorio, { recursive: true, force: true }));
    let decodificaciones = 0;
    const almacen = crearAlmacenFotos({ directorio: () => directorio, decodificar() {
        decodificaciones++;
        return { isEmpty: () => !!opciones.danada, getSize: () => ({ width: 1, height: 1 }) };
    } });
    const estado = { fila: null, historial: [] };
    const db = {
        async withTransaction(tablas, fn) {
            const antes = estado.fila && { ...estado.fila };
            estado.historial.push('begin');
            try {
                const resultado = await fn(async (sql, p) => {
                    estado.historial.push(sql.trim().split(/\s+/)[0]);
                    if (sql.includes('FOR UPDATE')) return estado.fila ? [{ ...estado.fila }] : [];
                    if (opciones.sql) throw Object.assign(new Error('SQL rechazado'), { code: 'ER_DUP_ENTRY' });
                    if (sql.includes('INSERT INTO')) {
                        if (estado.fila) throw Object.assign(new Error('ID duplicado'), { code: 'ER_DUP_ENTRY' });
                        estado.fila = { nParejaID: p[0], oFoto: p[1], IFotoM: p[14] };
                        return { affectedRows: 1 };
                    }
                    if (sql.includes('UPDATE T_Participantes')) {
                        estado.fila.oFoto = p[5] || estado.fila.oFoto;
                        estado.fila.IFotoM = p[11] || estado.fila.IFotoM;
                        return { affectedRows: 1, changedRows: 1 };
                    }
                    if (sql.includes('DELETE FROM T_Participantes')) estado.fila = null;
                    return { affectedRows: 1 };
                });
                estado.historial.push('commit');
                if (opciones.incierto) throw Object.assign(new Error('Confirmación incierta'), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
                return resultado;
            } catch (error) {
                if (error.code !== 'TRANSACTION_OUTCOME_UNKNOWN') { estado.fila = antes; estado.historial.push('rollback'); }
                throw error;
            }
        },
        async queryDatabase(sql, p) {
            assert.equal(estado.historial.at(-1), 'commit', 'Limpiar fotos anteriores solo tras confirmar SQL');
            if (opciones.consultaLimpieza) throw new Error('MySQL no disponible');
            return opciones.compartida || (estado.fila && [estado.fila.oFoto, estado.fila.IFotoM].includes(p[0])) ? [{ nParejaID: 1 }] : [];
        }
    };
    const module = { exports: {} };
    const codigo = await fs.readFile(path.join(__dirname, '../Modelos/parejaModel.js'), 'utf8');
    vm.runInNewContext(codigo, { module, console, require(nombre) {
        if (nombre === '../db') return db;
        if (nombre === './imagenesModel') return { conFotos: almacen.conFotos, limpiarFotos: almacen.limpiar };
        throw new Error(nombre);
    } });
    return { almacen, modelo: module.exports, estado, directorio,
        get decodificaciones() { return decodificaciones; },
        archivos: async () => fs.readdir(path.join(directorio, 'uploads/fotos')).catch(e => { if (e.code === 'ENOENT') return []; throw e; }),
        leer: ref => fs.readFile(path.join(directorio, ref)) };
}

test('registro guarda bytes permanentes y SQL recibe referencias relativas únicas, sin usar el nombre recibido', async t => {
    const v = await preparar(t);
    await v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto(), Femenino: foto() } });
    for (const ref of [v.estado.fila.oFoto, v.estado.fila.IFotoM]) {
        assert.match(ref, /^uploads\/fotos\/[a-f0-9-]+\.png$/);
        assert.deepEqual(await v.leer(ref), png);
    }
    assert.notEqual(v.estado.fila.oFoto, v.estado.fila.IFotoM);
    assert.equal((await v.archivos()).length, 2);
});

test('registro sin foto respeta oFoto NOT NULL e ignora rutas recibidas por IPC', async t => {
    const v = await preparar(t);
    await v.modelo.registrarPareja({ ...datos, oFotoMasculino: '../../secreto', oFotoFemenino: 'uploads/otra.jpg' });
    assert.equal(v.estado.fila.oFoto, ''); assert.equal(v.estado.fila.IFotoM, null);
    assert.equal((await v.archivos()).length, 0);
});

test('tamaño, formato y dimensiones inválidos se rechazan antes de decodificar y antes de SQL', async t => {
    const v = await preparar(t);
    const grande = Buffer.from(png); grande.writeUInt32BE(20000, 16);
    for (const bytes of [Buffer.alloc(0), Buffer.alloc(MAX_BYTES + 1), Buffer.from('<svg/>'), grande, 'ruta.png', Buffer.from([255,216,255,255,255])]) {
        await assert.rejects(v.modelo.registrarPareja({ ...datos, fotos: { Masculino: { bytes } } }), { code: 'INVALID_PHOTO' });
    }
    assert.equal(v.decodificaciones, 0); assert.equal(v.estado.historial.length, 0);
    assert.equal((await v.archivos()).length, 0);
});

test('contenido dañado se rechaza por el decodificador aunque tenga cabecera PNG', async t => {
    const v = await preparar(t, { danada: true });
    await assert.rejects(v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto() } }), { code: 'INVALID_PHOTO' });
    assert.equal((await v.archivos()).length, 0); assert.equal(v.estado.historial.length, 0);
});

test('si la segunda foto falla, retira la primera y no escribe SQL', async t => {
    const v = await preparar(t);
    await assert.rejects(v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto(), Femenino: { bytes: Buffer.from('no imagen') } } }));
    assert.equal((await v.archivos()).length, 0); assert.equal(v.estado.historial.length, 0);
});

test('fallo SQL elimina solo fotos nuevas y conserva las anteriores', async t => {
    const v = await preparar(t, { sql: true });
    const anterior = await v.almacen.guardar(foto());
    v.estado.fila = { nParejaID: 1, oFoto: anterior };
    await assert.rejects(v.modelo.actualizarParejaCompleta({ ...datos, fotos: { Masculino: foto() } }), { code: 'ER_DUP_ENTRY' });
    assert.equal(v.estado.fila.oFoto, anterior); assert.equal((await v.archivos()).length, 1);
    assert.deepEqual(await v.leer(anterior), png);
});

test('actualización sin foto conserva refs antiguas; reemplazo confirmado limpia solo la foto sustituida', async t => {
    const v = await preparar(t);
    await v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto(), Femenino: foto() } });
    const anterior = { ...v.estado.fila };
    await v.modelo.actualizarParejaCompleta(datos);
    assert.deepEqual(v.estado.fila, anterior);
    await v.modelo.actualizarParejaCompleta({ ...datos, fotos: { Masculino: foto() } });
    assert.equal(v.estado.fila.IFotoM, anterior.IFotoM);
    assert.notEqual(v.estado.fila.oFoto, anterior.oFoto);
    await assert.rejects(v.leer(anterior.oFoto), { code: 'ENOENT' });
    assert.equal((await v.archivos()).length, 2);
});

test('ID inexistente limpia los archivos preparados sin anunciar éxito', async t => {
    const v = await preparar(t);
    const resultado = await v.modelo.actualizarParejaCompleta({ ...datos, fotos: { Masculino: foto() } });
    assert.equal(resultado.code, 'NOT_FOUND'); assert.equal((await v.archivos()).length, 0);
});

test('COMMIT incierto conserva fotos nuevas y antiguas para no romper referencias', async t => {
    const v = await preparar(t, { incierto: true });
    const anterior = await v.almacen.guardar(foto());
    v.estado.fila = { nParejaID: 1, oFoto: anterior };
    await assert.rejects(v.modelo.actualizarParejaCompleta({ ...datos, fotos: { Masculino: foto() } }), { code: 'TRANSACTION_OUTCOME_UNKNOWN' });
    assert.equal((await v.archivos()).length, 2);
    assert.deepEqual(await v.leer(v.estado.fila.oFoto), png);
});

for (const opcion of ['compartida', 'consultaLimpieza']) test(`limpieza conserva fotos ante ${opcion} y mantiene el éxito SQL`, async t => {
    const v = await preparar(t, { [opcion]: true });
    const anterior = await v.almacen.guardar(foto());
    v.estado.fila = { nParejaID: 1, oFoto: anterior };
    const resultado = await v.modelo.actualizarParejaCompleta({ ...datos, fotos: { Masculino: foto() } });
    assert.equal(resultado.success, true); assert.equal((await v.archivos()).length, 2);
});

test('eliminar pareja limpia sus fotos después de confirmar; no elimina rutas heredadas o externas', async t => {
    const v = await preparar(t);
    await v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto(), Femenino: foto() } });
    assert.equal(await v.modelo.eliminarPareja(1), 1); assert.equal((await v.archivos()).length, 0);
    const legado = path.join(v.directorio, 'legado.jpg'); await fs.writeFile(legado, png);
    await v.almacen.limpiar([legado, '../../legado.jpg', 'uploads/legado.jpg']);
    assert.deepEqual(await fs.readFile(legado), png);
});

test('error de escritura en disco no ejecuta SQL', async t => {
    const v = await preparar(t);
    await fs.writeFile(path.join(v.directorio, 'uploads'), 'obstrucción de prueba');
    await assert.rejects(v.modelo.registrarPareja({ ...datos, fotos: { Masculino: foto() } }));
    assert.equal(v.estado.historial.length, 0);
});

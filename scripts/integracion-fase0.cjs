// Laboratorio real desechable: nunca lee config.json ni conecta con el servicio instalado.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const root = path.resolve(__dirname, '..');
// El mismo laboratorio puede ejecutarse con Electron para verificar su
// decodificador real; con Node se conserva el ensayo de modelos sin fotos.
const electronReal = process.versions.electron ? require('electron') : null;
const exe = process.env.HUAPANGO_TEST_MYSQLD || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function puertoLibre() {
    const s = net.createServer();
    await new Promise((resolve, reject) => s.once('error', reject).listen(0, '127.0.0.1', resolve));
    const port = s.address().port;
    await new Promise(resolve => s.close(resolve));
    return port;
}
function ejecutar(args, log) {
    const child = spawn(exe, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', data => fs.appendFileSync(log, data));
    child.stderr.on('data', data => fs.appendFileSync(log, data));
    child.completado = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    // La promesa siempre tiene receptor aun durante la espera de arranque.
    child.completado.catch(() => {});
    return child;
}
function cargarAplicacion(config) {
    const cache = new Map();
    const perfil = path.join(config.datadir, 'perfil');
    const datosDB = { host: '127.0.0.1', port: config.port, user: 'root', password: config.password, database: config.database };
    function cargar(file) {
        const absolute = path.resolve(root, file);
        if (cache.has(absolute)) return cache.get(absolute).exports;
        const module = { exports: {} }; cache.set(absolute, module);
        const local = createRequire(absolute);
        vm.runInNewContext(fs.readFileSync(absolute, 'utf8'), {
            module, exports: module.exports, __dirname: path.dirname(absolute), __filename: absolute,
            Buffer, URL, console, global: {}, setTimeout, clearTimeout,
            require(name) {
                if (name === 'electron') return { app: { getPath: () => perfil }, nativeImage: electronReal?.nativeImage || { createFromBuffer() { throw Error('Ejecutar con Electron para cubrir fotos reales'); } } };
                if (name.startsWith('.')) {
                    const resolved = local.resolve(name);
                    if (resolved === path.join(root, 'Modelos/configModel.js')) {
                        const original = cargar(resolved);
                        return { ...original, cargarConfiguracion: () => datosDB };
                    }
                    return cargar(resolved);
                }
                return local(name);
            }
        }, { filename: absolute });
        return module.exports;
    }
    cargar.perfil = perfil;
    return cargar;
}

async function probar(cargar, connection, estricto) {
    const db = cargar('db.js');
    await db.inicializarBaseDatos();
    const pareja = cargar('Modelos/parejaModel.js');
    const categoria = cargar('Modelos/categoriaModel.js');
    const estilo = cargar('Modelos/estiloModel.js');
    const admin = cargar('Modelos/adminModel.js');
    const evaluaciones = cargar('Modelos/evaluacionesModel.js');
    const sesion = cargar('Modelos/sesionModel.js');
    const auth = cargar('Controladores/authController.js');
    const datos = { nParejaID: 7, cNombreMasculino: 'Uno', cApellidoMasculino: 'Prueba', cEmailMasculino: 'uno@example.test',
        nTelefonoMasculino: '5512345678', dNacimientoMasculino: '2000-01-01', sexoMasculino: 'M',
        cNombreFemenino: 'Dos', cApellidoFemenino: 'Prueba', cEmailFemenino: 'dos@example.test',
        nTelefonoFemenino: '5512345679', dNacimientoFemenino: '2000-01-02', sexoFemenino: 'F' };
    await admin.crearUsuario({ nUsuarioID: 'U001', cNombreUsuario: 'juez_laboratorio', cContrasena: 'SoloLaboratorio-2026!', rol: 'juez' });
    const [usuarios] = await connection.execute('SELECT * FROM t_usuarios WHERE nUsuarioID = ?', ['U001']);
    assert.equal(usuarios[0].nUsuarioID, 'U001');
    assert.equal(await bcrypt.compare('SoloLaboratorio-2026!', usuarios[0].cContrasena), true);
    console.log('MYSQL_OK alta de usuario VARCHAR y bcrypt');
    const altas = cargar('Controladores/adminController.js');
    for (const rol of ['admin', 'user', 'juez']) {
        const nueva = { nUsuarioID: 'ROL-' + rol, cNombreUsuario: 'cuenta_' + rol, cContrasena: 'SoloLaboratorio!', rol };
        assert.equal((await altas.handleCrearUsuario(null, nueva)).success, true);
        const duplicado = await altas.handleCrearUsuario(null, nueva);
        assert.equal(duplicado.code, 'ER_DUP_ENTRY'); assert.match(duplicado.error, /Ya existe/);
        const mismoNombre = await altas.handleCrearUsuario(null, { ...nueva, nUsuarioID: 'OTRO-' + rol });
        assert.equal(mismoNombre.code, 'ER_DUP_ENTRY');
        const [filas] = await connection.execute('SELECT rol, cContrasena FROM t_usuarios WHERE nUsuarioID = ?', [nueva.nUsuarioID]);
        assert.equal(filas.length, 1); assert.equal(filas[0].rol, rol);
        assert.equal(await bcrypt.compare(nueva.cContrasena, filas[0].cContrasena), true);
        assert.equal((await auth.handleLogin(null, { username: nueva.cNombreUsuario, password: nueva.cContrasena }, async () => {})).success, true);
        assert.equal(sesion.obtenerSesion().userID, nueva.nUsuarioID);
        assert.equal(sesion.obtenerSesion().userRole, rol);
        sesion.cerrarSesion();
    }
    console.log('MYSQL_OK altas de tres roles y duplicados por ID/nombre, mensajes seguros');
    await connection.execute('INSERT INTO t_usuarios VALUES (?, ?, ?, ?)', ['LEG-1', 'legado_prueba', 'ClaveTemporal!', 'admin']);
    assert.equal((await auth.handleLogin(null, { username: 'legado_prueba', password: 'ClaveTemporal!' }, async () => {})).success, true);
    const [migrados] = await connection.execute('SELECT cContrasena FROM t_usuarios WHERE nUsuarioID = ?', ['LEG-1']);
    assert.equal(await bcrypt.compare('ClaveTemporal!', migrados[0].cContrasena), true);
    assert.notEqual(migrados[0].cContrasena, 'ClaveTemporal!');
    assert.ok(await sesion.revalidarSesion());
    await connection.execute('UPDATE t_usuarios SET rol = ? WHERE nUsuarioID = ?', ['user', 'LEG-1']);
    assert.equal(await sesion.revalidarSesion(), null);
    console.log('MYSQL_OK login legado migra bcrypt y cambio de rol revoca sesión');
    const fotoBytes = electronReal?.nativeImage.createFromBitmap(Buffer.from([80, 100, 200, 255]), { width: 1, height: 1 }).toPNG();
    await pareja.registrarPareja({ ...datos, ...(fotoBytes ? { fotos: {
        Masculino: { bytes: fotoBytes }, Femenino: { bytes: fotoBytes }
    } } : {}) });
    if (fotoBytes) {
        const [conFotos] = await pareja.buscarParejaPorID(7);
        const perfil = cargar.perfil;
        for (const referencia of [conFotos.oFoto, conFotos.IFotoM]) {
            assert.match(referencia, /^uploads\/fotos\/[a-f0-9-]+\.png$/);
            assert.deepEqual(fs.readFileSync(path.join(perfil, referencia)), fotoBytes);
        }
        console.log('MYSQL_OK dos fotos: decodificador Electron real, disco y referencias MySQL');
    }
    await pareja.registrarPareja({ ...datos, nParejaID: '07', cEmailMasculino: 'tres@example.test', cEmailFemenino: 'cuatro@example.test' });
    assert.equal((await pareja.buscarParejaPorID('07')).length, 1);
    assert.equal((await pareja.buscarParejaPorID('07'))[0].nParejaID, '07');
    assert.equal((await pareja.buscarParejaPorID(7)).length, 1);
    console.log('MYSQL_OK claves VARCHAR: 7 y 07 son parejas distintas');
    for (const [modelo, campo, nombre] of [[categoria, 'nIDCategoria', 'cCategoriaNombre'], [estilo, 'nEstiloID', 'cEstiloNombre']]) {
        const fn = modelo.registrarCategoria || modelo.registrarEstilo;
        const resultados = await Promise.allSettled([fn({ nParejaID: 7, [campo]: 1, [nombre]: 'Prueba' }), fn({ nParejaID: 7, [campo]: 2, [nombre]: 'Otra' })]);
        assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal(resultados.filter(r => r.status === 'rejected' && r.reason.code === 'ASSIGNMENT_EXISTS').length, 1);
    }
    console.log('MYSQL_OK concurrencia categoría y estilo: una asignación');
    const evaluacion = { nJuezID: 'U001', nParejaID: 7, nPuntaje: 55, cComentario: 'Prueba definitiva' };
    const envios = await Promise.all([evaluaciones.registrarEvaluacion(evaluacion), evaluaciones.registrarEvaluacion(evaluacion)]);
    assert.equal(envios[0].id, envios[1].id);
    assert.equal(envios.filter(r => r.replayed).length, 1);
    await assert.rejects(evaluaciones.registrarEvaluacion({ ...evaluacion, nPuntaje: 56 }), { code: 'EVALUATION_EXISTS' });
    assert.equal((await connection.execute('SELECT COUNT(*) AS total FROM t_evaluaciones'))[0][0].total, 1);
    if (estricto) await assert.rejects(connection.execute('INSERT INTO t_evaluaciones(nJuezID,nParejaID,nPuntaje) VALUES (?,?,?)', ['U001', '7', 55]), { code: 'ER_DUP_ENTRY' });
    console.log('MYSQL_OK evaluación única, reenvío idempotente y corrección rechazada');
    const pdf = cargar('Modelos/pdfModel.js');
    const perfilPDF = cargar.perfil;
    fs.mkdirSync(perfilPDF, { recursive: true });
    for (const [metodo, archivo] of [['generarPDFParejas', 'parejas.pdf'], ['generarPDFResultados', 'resultados.pdf']]) {
        const destino = path.join(perfilPDF, archivo);
        await pdf[metodo](destino);
        const contenido = fs.readFileSync(destino);
        assert.equal(contenido.subarray(0, 5).toString(), '%PDF-');
        assert.ok(contenido.length > 1000);
        assert.match(contenido.subarray(-32).toString(), /%%EOF/);
    }
    console.log('MYSQL_OK PDF reales de parejas y resultados con PDFKit y datos SQL');
    const [antes] = await pareja.buscarParejaPorID(7);
    const mod = { ...datos, versionEdicion: antes.versionEdicion, cNombreMasculino: 'Cambio' };
    const carreras = await Promise.allSettled([pareja.actualizarParejaCompleta(mod), pareja.actualizarParejaCompleta({ ...mod, cNombreMasculino: 'Otro cambio' })]);
    assert.equal(carreras.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(carreras.filter(r => r.status === 'rejected' && r.reason.code === 'EDIT_CONFLICT').length, 1);
    console.log('MYSQL_OK concurrencia edición: sin sobrescritura silenciosa');
    const [actual] = await pareja.buscarParejaPorID(7);
    await assert.rejects(db.withTransaction(['t_participantes'], async consultar => {
        await consultar('UPDATE t_participantes SET cNombre = ? WHERE nParejaID = ?', ['Revertir', 7]);
        throw Error('Fallo controlado');
    }), /Fallo controlado/);
    assert.equal((await pareja.buscarParejaPorID(7))[0].cNombre, actual.cNombre);
    assert.equal(await pareja.eliminarPareja(7), 1);
    assert.equal((await pareja.buscarParejaPorID('07'))[0].cNombre, 'Uno');
    assert.equal(await pareja.eliminarPareja('07'), 1);
    for (const tabla of ['t_participantes', 't_categorias', 't_estilos', 't_evaluaciones']) {
        const [filas] = await connection.execute(`SELECT COUNT(*) AS total FROM ${tabla}`);
        assert.equal(filas[0].total, 0);
    }
    if (fotoBytes) assert.deepEqual(fs.readdirSync(path.join(cargar.perfil, 'uploads/fotos')), []);
    console.log('MYSQL_OK rollback y eliminación con relaciones');
}

(async () => {
    if (!fs.existsSync(exe)) throw Error('Define HUAPANGO_TEST_MYSQLD con la ruta a mysqld. No se busca ni utiliza config.json.');
    const base = path.join(root, '.tmp'); fs.mkdirSync(base, { recursive: true });
    const work = fs.mkdtempSync(path.join(base, 'mysql-fase0-'));
    const datadir = path.join(work, 'data'); fs.mkdirSync(datadir);
    if (electronReal) {
        const perfilElectron = path.join(work, 'electron');
        fs.mkdirSync(perfilElectron);
        electronReal.app.setPath('userData', perfilElectron);
        electronReal.app.disableHardwareAcceleration();
    }
    const log = path.join(work, 'servidor.log');
    const port = await puertoLibre();
    const password = randomBytes(24).toString('hex');
    const inicio = path.join(work, 'inicio.sql');
    fs.writeFileSync(inicio, `ALTER USER 'root'@'localhost' IDENTIFIED BY '${password}';\n`);
    let server, connection;
    try {
        console.log('MYSQL_LAB inicializando un directorio nuevo; servicio existente intacto');
        const init = ejecutar(['--no-defaults', '--initialize-insecure', `--basedir=${path.dirname(path.dirname(exe))}`, `--datadir=${datadir}`, '--console'], log);
        if (await init.completado !== 0) throw Error(`Falló inicialización; diagnóstico: ${log}`);
        server = ejecutar(['--no-defaults', `--basedir=${path.dirname(path.dirname(exe))}`, `--datadir=${datadir}`, '--bind-address=127.0.0.1', `--port=${port}`, '--mysqlx=0', '--skip-log-bin', `--init-file=${inicio}`, '--console'], log);
        let ultimoError;
        for (let i = 0; i < 80; i++) {
            if (server.exitCode !== null) throw Error(`El laboratorio terminó antes de conectar; diagnóstico: ${log}`);
            try { connection = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', password, connectTimeout: 1000 }); break; }
            catch (error) { ultimoError = error.code; await delay(250); }
        }
        if (!connection) throw Error(`No se pudo conectar con el laboratorio (${ultimoError}); diagnóstico: ${log}`);
        fs.unlinkSync(inicio);
        const ddl = fs.readFileSync(path.join(root, 'sql/001-laboratorio.sql'), 'utf8');
        for (const sentencia of ddl.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(sentencia);
        await probar(cargarAplicacion({ datadir, port, password, database: 'huapango_pruebas' }), connection, true);
        await connection.query('CREATE DATABASE huapango_historico_pruebas CHARACTER SET utf8mb4');
        // Una conexión nueva evita reutilizar prepared statements del primer
        // esquema: USE por sí solo no invalida su caché de mysql2.
        await connection.end();
        connection = await mysql.createConnection({ host: '127.0.0.1', port, user: 'root', password, database: 'huapango_historico_pruebas', connectTimeout: 1000 });
        const historico = fs.readFileSync(path.join(root, 'sql/000-esquema-observado-2026-10-14.sql'), 'utf8').replace(/^--.*$/gm, '');
        for (const sentencia of historico.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(sentencia);
        console.log('MYSQL_LAB repitiendo sobre estructura histórica, sin datos reales');
        await probar(cargarAplicacion({ datadir, port, password, database: 'huapango_historico_pruebas' }), connection, false);
        const migracion = fs.readFileSync(path.join(root, 'sql/003-unicidad-fase0.sql'), 'utf8').replace(/^--.*$/gm, '');
        for (const sentencia of migracion.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(sentencia);
        const [indices] = await connection.query("SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME IN ('uq_categoria_pareja','uq_estilo_pareja','uq_evaluacion_juez_pareja') AND NON_UNIQUE = 0");
        assert.equal(indices.length, 3);
        console.log('MYSQL_OK propuesta de índices aplicada únicamente a la copia vacía');
        console.log('MYSQL_INTEGRACION_OK (no certifica datos del evento, fotos visuales ni instalador)');
    } finally {
        fs.rmSync(inicio, { force: true });
        if (connection) { try { await connection.query('SHUTDOWN'); } catch {} connection.destroy(); }
        if (server && server.exitCode === null) {
            await Promise.race([server.completado, delay(5000)]);
            if (server.exitCode === null) server.kill();
            await server.completado;
        }
        console.log(`MYSQL_LAB evidencia local: ${work}`);
    }
})().then(() => electronReal ? electronReal.app.exit(0) : process.exit(0), error => {
    console.error(error.message);
    if (electronReal) electronReal.app.exit(1); else process.exit(1);
});

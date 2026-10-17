// Diagnóstico explícito de SOLO LECTURA; no imprime credenciales ni filas personales.
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

(async () => {
    const archivo = process.argv[2];
    if (!archivo) throw Error('Uso: node scripts/diagnostico-bd.cjs RUTA_CONFIG_JSON');
    const config = JSON.parse(fs.readFileSync(path.resolve(archivo), 'utf8'));
    if (!['127.0.0.1', 'localhost', '::1'].includes(config.host)) throw Error('Este diagnóstico está acotado a MySQL en esta PC.');
    const connection = await mysql.createConnection({ host: config.host, port: config.port || 3306,
        user: config.user, password: config.password, database: config.database, connectTimeout: 5000,
        ...(config.tls ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2', ...(config.sslCa ? { ca: config.sslCa } : {}) } } : {}) });
    try {
        const sql = fs.readFileSync(path.join(__dirname, '../sql/002-diagnostico-esquema.sql'), 'utf8');
        const sentencias = sql.replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean);
        const resultados = [];
        for (const sentencia of sentencias) {
            if (!/^SELECT\b/i.test(sentencia)) throw Error('El diagnóstico solo admite SELECT.');
            const [filas] = await connection.query({ sql: sentencia, timeout: 10000 });
            resultados.push(filas);
        }
        const esquema = [];
        for (const tabla of ['t_usuarios', 't_participantes', 't_categorias', 't_estilos', 't_evaluaciones']) {
            const [filas] = await connection.query({ sql: `SHOW CREATE TABLE ${tabla}`, timeout: 10000 });
            esquema.push(filas[0]['Create Table'].replace(/ AUTO_INCREMENT=\d+/g, ''));
        }
        console.log(JSON.stringify({ fecha: new Date().toISOString(), soloLectura: true, resultados, esquema }, null, 2));
    } finally { await connection.end(); }
})().catch(error => { console.error(`DIAGNOSTICO_NO_COMPLETADO: ${error.code || 'CONFIGURACION_INVALIDA'}`); process.exitCode = 1; });

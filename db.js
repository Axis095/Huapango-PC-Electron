const mysql = require("mysql2/promise");
const { cargarConfiguracion, normalizarConfiguracion } = require("./Modelos/configModel");

// Importar este módulo no lee archivos ni intenta conectar con MySQL.
let pool = null;
const LIMITES = Object.freeze({ conexion: 5000, consulta: 15000, transaccion: 30000, cierre: 5000 });
const fallo = (code, mensaje) => Object.assign(new Error(mensaje), { code });
const conexionPerdida = error => !!error?.fatal || [
    'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_SEQUENCE_TIMEOUT', 'DB_QUERY_TIMEOUT', 'DB_TRANSACTION_TIMEOUT'
].includes(error?.code);
const incierto = () => fallo('TRANSACTION_OUTCOME_UNKNOWN',
    'No se pudo confirmar el resultado. Consulta la pareja o el registro afectado antes de volver a guardar o eliminar; no se reintentó automáticamente.');
function destruir(connection) { try { connection.destroy(); } catch {} }

// Limitar la espera no cancela por sí solo una escritura en MySQL.
// Una conexión que llega tarde nunca debe ejecutar la operación abandonada.
function conLimite(promesa, ms, error, alVencer = () => {}, alLlegarTarde = () => {}) {
    return new Promise((resolve, reject) => {
        let terminado = false;
        const timer = setTimeout(() => {
            if (terminado) return;
            terminado = true;
            try { alVencer(); } catch {} // La limpieza nunca oculta el vencimiento.
            reject(error);
        }, ms);
        Promise.resolve(promesa).then(valor => {
            if (terminado) { try { alLlegarTarde(valor); } catch {} return; }
            terminado = true; clearTimeout(timer); resolve(valor);
        }, err => {
            if (terminado) return;
            terminado = true; clearTimeout(timer); reject(err);
        });
    });
}

async function adquirirConexion() {
    if (!pool) throw fallo('DB_NOT_READY', 'Configura y comprueba la conexión con MySQL antes de consultar datos.');
    try {
        return await conLimite(pool.getConnection(), LIMITES.conexion,
            fallo('DB_ACQUIRE_TIMEOUT', 'MySQL no entregó una conexión a tiempo. No se envió la operación; tus datos se conservan.'),
            undefined, destruir);
    } catch (error) {
        if (['No connections available.', 'Queue limit reached.'].includes(error.message)) {
            throw fallo('DB_BUSY', 'Todas las conexiones están ocupadas. No se envió la operación; espera unos segundos e intenta nuevamente.');
        }
        if (conexionPerdida(error) || ['ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH'].includes(error.code)) {
            throw fallo(error.code, mensajeConexion(error) + ' No se envió la operación; tus datos se conservan.');
        }
        throw error;
    }
}

function mensajeConexion(error) {
    const mensajes = {
        ER_ACCESS_DENIED_ERROR: "MySQL rechazó el usuario o la contraseña. Revisa las credenciales.",
        ER_DBACCESS_DENIED_ERROR: "El usuario no tiene permisos para acceder a esta base de datos.",
        ER_BAD_DB_ERROR: "La base de datos indicada no existe. Revisa el nombre e importa el esquema.",
        ECONNREFUSED: "No se pudo conectar con MySQL. Comprueba que el servicio esté iniciado y el puerto sea correcto.",
        ENOTFOUND: "No se encontró el servidor. Revisa su nombre o dirección IP.",
        EHOSTUNREACH: "El servidor no está accesible desde este equipo.",
        ETIMEDOUT: "MySQL no respondió a tiempo. Revisa el servidor, el puerto y la red."
    };
    return mensajes[error.code] || "No se pudo comprobar la conexión con MySQL. Revisa la configuración y el servicio.";
}

async function probarConexion(config) {
    const datos = normalizarConfiguracion(config);
    let connection;
    try {
        connection = await conLimite(mysql.createConnection({ ...datos, connectTimeout: LIMITES.conexion }), LIMITES.conexion,
            fallo('ETIMEDOUT', 'MySQL no respondió a tiempo.'), undefined, destruir);
    } catch (error) {
        const fallo = new Error(mensajeConexion(error));
        fallo.code = error.code;
        throw fallo;
    } finally {
        // Es una conexión de prueba; no se conserva ni se ejecutan escrituras.
        if (connection) destruir(connection);
    }
    return datos;
}

async function inicializarBaseDatos(antesDeActivar = () => true) {
    const config = await probarConexion(cargarConfiguracion());
    if (!antesDeActivar()) {
        const error = new Error("La autorización para cambiar la conexión terminó. La conexión anterior se conserva.");
        error.code = "FORBIDDEN";
        throw error;
    }
    const nuevoPool = mysql.createPool({ ...config, connectTimeout: LIMITES.conexion,
        waitForConnections: false, connectionLimit: 10, queueLimit: 10 });
    const anterior = pool;
    pool = nuevoPool;
    // Las operaciones ya iniciadas terminan en el pool anterior.
    if (anterior) conLimite(anterior.end(), LIMITES.transaccion + LIMITES.cierre,
        fallo('DB_CLOSE_TIMEOUT', 'No se pudo cerrar el pool anterior a tiempo.'))
        .catch(() => console.error('No se pudo cerrar el pool anterior de MySQL.'));
}

async function queryDatabase(sql, params = []) {
    if (!Array.isArray(params) || params.includes(undefined)) {
        throw new Error("Los parámetros de la consulta contienen valores no definidos.");
    }
    const connection = await adquirirConexion();
    let descartada = false;
    const descartar = () => { if (!descartada) { descartada = true; destruir(connection); } };
    // Solo consultas de lectura conocidas; cualquier otro SQL se trata como escritura.
    const lectura = /^\s*(SELECT|SHOW|DESCRIBE|EXPLAIN)\b/i.test(sql);
    try {
        const [results] = await conLimite(connection.execute(sql, params), LIMITES.consulta,
            fallo('DB_QUERY_TIMEOUT', 'MySQL tardó demasiado en responder. Los datos del formulario se conservan.'), descartar);
        return results;
    } catch (error) {
        if (conexionPerdida(error)) {
            descartar();
            if (!lectura) throw fallo('WRITE_OUTCOME_UNKNOWN',
                'Se perdió la confirmación de MySQL. La operación podría haberse guardado. Consulta los datos antes de repetirla; no se reintentó automáticamente.');
            if (error.code === 'DB_QUERY_TIMEOUT') throw error;
            throw fallo('DB_CONNECTION_LOST', 'Se perdió la conexión con MySQL. Los datos del formulario se conservan; restablece la conexión y vuelve a consultar.');
        }
        throw error;
    } finally {
        if (!descartada) connection.release();
    }
}

// El callback debe esperar todas sus consultas; nunca usar queryDatabase dentro
// de él, porque tomaría otra conexión del pool.
async function withTransaction(tablas, operacion) {
    if (!pool) throw new Error("Configura y comprueba la conexión con MySQL antes de consultar datos.");
    if (!Array.isArray(tablas) || !tablas.length || tablas.some(tabla => typeof tabla !== "string" || !tabla)) {
        throw new Error("Indica las tablas que participan en la transacción.");
    }
    const connection = await adquirirConexion();
    let fase = "inicio";
    let descartar = false;
    let activa = true;
    let destruida = false;
    const descartarConexion = () => {
        descartar = true; activa = false;
        if (!destruida) { destruida = true; destruir(connection); }
    };
    const consultar = async (sql, params = []) => {
        if (!activa) throw new Error("La transacción ya terminó.");
        if (!Array.isArray(params) || params.includes(undefined)) {
            throw new Error("Los parámetros de la consulta contienen valores no definidos.");
        }
        const [results] = await conLimite(connection.execute(sql, params), LIMITES.consulta,
            fallo('DB_QUERY_TIMEOUT', 'MySQL tardó demasiado en responder.'), descartarConexion);
        return results;
    };
    try {
        await conLimite(connection.beginTransaction(), LIMITES.conexion,
            fallo('DB_BEGIN_TIMEOUT', 'MySQL no inició la transacción a tiempo. No se envió ningún cambio.'), descartarConexion);
        fase = "operacion";
        // Comprobar en la conexión actual: no asumir que otra instalación usa InnoDB.
        const nombres = [...new Set(tablas.map(tabla => tabla.toLowerCase()))];
        const resultado = await conLimite((async () => {
            const motores = await consultar(`
                SELECT LOWER(TABLE_NAME) AS nombre, ENGINE AS motor
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) IN (${nombres.map(() => "?").join(", ")})
            `, nombres);
            if (nombres.some(nombre => !motores.some(tabla => tabla.nombre === nombre && tabla.motor === "InnoDB"))) {
                const error = new Error("No se realizó la operación: verifica que las tablas requeridas existan y utilicen InnoDB.");
                error.code = "UNSAFE_STORAGE_ENGINE";
                throw error;
            }
            if (!activa) throw new Error("La transacción ya terminó.");
            return operacion(consultar);
        })(), LIMITES.transaccion,
            fallo('DB_TRANSACTION_TIMEOUT', 'La operación excedió el tiempo de espera.'), descartarConexion);
        activa = false;
        fase = "confirmacion";
        await conLimite(connection.commit(), LIMITES.cierre,
            fallo('DB_COMMIT_TIMEOUT', 'MySQL no confirmó la transacción a tiempo.'), descartarConexion);
        return resultado;
    } catch (error) {
        activa = false;
        if (fase === "inicio") {
            descartar = true;
            throw error;
        }
        if (fase === "confirmacion" || descartar || conexionPerdida(error)) {
            descartarConexion();
            throw incierto();
        }
        try {
            await conLimite(connection.rollback(), LIMITES.cierre,
                fallo('DB_ROLLBACK_TIMEOUT', 'MySQL no confirmó la reversión a tiempo.'), descartarConexion);
        } catch {
            descartarConexion();
            throw incierto();
        }

        throw error;
    } finally {
        activa = false;
        if (descartar) descartarConexion();
        else connection.release();
    }
}

module.exports = { queryDatabase, withTransaction, probarConexion, inicializarBaseDatos };

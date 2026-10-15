const mysql = require("mysql2/promise");
const { cargarConfiguracion, normalizarConfiguracion } = require("./Modelos/configModel");
const { ejecutarOperacion, ejecutarCambioConfiguracion } = require("./Servicios/operaciones");
const { setTimeout, clearTimeout } = require("node:timers");

const LIMITES = Object.freeze({ conexion: 5000, espera: 5000, consulta: 30000, conexiones: 10, cola: 20 });

// Importar este módulo no lee archivos ni intenta conectar con MySQL.
let pool = null;

function opcionesConexion(config) {
    const { tls, sslCa, ...datos } = config;
    return { ...datos, connectTimeout: LIMITES.conexion,
        ...(tls ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: "TLSv1.2", ...(sslCa ? { ca: sslCa } : {}) } } : {}) };
}

function limitar(pendiente, milisegundos, alVencer, alLlegarTarde = () => {}) {
    return new Promise((resolve, reject) => {
        let vencido = false;
        const reloj = setTimeout(() => {
            vencido = true;
            reject(alVencer());
        }, milisegundos);
        Promise.resolve(pendiente).then(resultado => {
            clearTimeout(reloj);
            if (vencido) alLlegarTarde(resultado);
            else resolve(resultado);
        }, error => { clearTimeout(reloj); if (!vencido) reject(error); });
    });
}

async function adquirirConexion() {
    if (!pool) throw new Error("Configura y comprueba la conexión con MySQL antes de consultar datos.");
    return limitar(pool.getConnection(), LIMITES.espera,
        () => Object.assign(new Error("La base de datos está ocupada. Espera y vuelve a intentar."), { code: "DB_BUSY" }),
        connection => connection.release());
}

function comando(connection, ejecutar, descartar) {
    return limitar(Promise.resolve().then(ejecutar), LIMITES.consulta, () => {
        descartar();
        connection.destroy();
        return Object.assign(new Error("La operación excedió el tiempo permitido. Verifica el resultado antes de reintentar; no se repitió automáticamente."),
            { code: "TRANSACTION_OUTCOME_UNKNOWN" });
    });
}

function mensajeConexion(error) {
    const mensajes = {
        ER_ACCESS_DENIED_ERROR: "MySQL rechazó el usuario o la contraseña. Revisa las credenciales.",
        ER_DBACCESS_DENIED_ERROR: "El usuario no tiene permisos para acceder a esta base de datos.",
        ER_BAD_DB_ERROR: "La base de datos indicada no existe. Revisa el nombre e importa el esquema.",
        ECONNREFUSED: "No se pudo conectar con MySQL. Comprueba que el servicio esté iniciado y el puerto sea correcto.",
        ENOTFOUND: "No se encontró el servidor. Revisa su nombre o dirección IP.",
        EHOSTUNREACH: "El servidor no está accesible desde este equipo.",
        ETIMEDOUT: "MySQL no respondió a tiempo. Revisa el servidor, el puerto y la red.",
        ERR_TLS_CERT_ALTNAME_INVALID: "El nombre del servidor no coincide con su certificado TLS.",
        CERT_HAS_EXPIRED: "El certificado TLS del servidor está caducado.",
        DEPTH_ZERO_SELF_SIGNED_CERT: "El certificado TLS del servidor no es confiable. Configura la autoridad certificadora correcta.",
        SELF_SIGNED_CERT_IN_CHAIN: "La autoridad del certificado TLS no es confiable. Revisa el certificado CA.",
        UNABLE_TO_VERIFY_LEAF_SIGNATURE: "No se pudo verificar el certificado TLS del servidor. Revisa el certificado CA."
    };
    return mensajes[error.code] || "No se pudo comprobar la conexión con MySQL. Revisa la configuración y el servicio.";
}

async function probarConexion(config) {
    const datos = normalizarConfiguracion(config);
    let connection;
    try {
        connection = await limitar(mysql.createConnection(opcionesConexion(datos)), LIMITES.conexion,
            () => Object.assign(new Error("Tiempo de conexión agotado"), { code: "ETIMEDOUT" }),
            tardia => tardia.destroy());
    } catch (error) {
        const fallo = new Error(mensajeConexion(error));
        fallo.code = error.code;
        throw fallo;
    } finally {
        // Es una conexión de prueba; no se conserva ni se ejecutan escrituras.
        if (connection) connection.destroy();
    }
    return datos;
}

async function inicializarBaseDatos() {
    return ejecutarCambioConfiguracion(async () => {
        const config = await probarConexion(cargarConfiguracion());
        const nuevoPool = mysql.createPool({ ...opcionesConexion(config),
            waitForConnections: true, connectionLimit: LIMITES.conexiones, queueLimit: LIMITES.cola });
        const anterior = pool;
        pool = nuevoPool;
        if (anterior) anterior.end().catch(() => console.error("No se pudo cerrar el pool anterior de MySQL."));
    });
}

async function queryDatabase(sql, params = []) {
    return ejecutarOperacion(async () => {
    if (!Array.isArray(params) || params.includes(undefined)) {
        throw new Error("Los parámetros de la consulta contienen valores no definidos.");
    }
    const connection = await adquirirConexion();
    let descartada = false;
    try {
        const [results] = await comando(connection, () => connection.execute(sql, params), () => { descartada = true; });
        return results;
    } catch (error) {
        if (!descartada && ["ECONNRESET", "EPIPE", "PROTOCOL_CONNECTION_LOST", "ETIMEDOUT"].includes(error.code)) {
            descartada = true;
            connection.destroy();
            throw Object.assign(new Error("Se perdió la conexión durante la operación. Verifica el resultado antes de reintentar; no se repitió automáticamente."),
                { code: "TRANSACTION_OUTCOME_UNKNOWN" });
        }
        throw error;
    } finally {
        if (!descartada) connection.release();
    }
    });
}

// El callback debe esperar todas sus consultas; nunca usar queryDatabase dentro
// de él, porque tomaría otra conexión del pool.
async function withTransaction(tablas, operacion) {
    return ejecutarOperacion(async () => {
    if (!pool) throw new Error("Configura y comprueba la conexión con MySQL antes de consultar datos.");
    if (!Array.isArray(tablas) || !tablas.length || tablas.some(tabla => typeof tabla !== "string" || !tabla)) {
        throw new Error("Indica las tablas que participan en la transacción.");
    }
    const connection = await adquirirConexion();
    let fase = "inicio";
    let descartar = false;
    let destruida = false;
    let activa = true;
    const consultar = async (sql, params = []) => {
        if (!activa) throw new Error("La transacción ya terminó.");
        if (!Array.isArray(params) || params.includes(undefined)) {
            throw new Error("Los parámetros de la consulta contienen valores no definidos.");
        }
        const [results] = await comando(connection, () => connection.execute(sql, params), vencimiento);
        return results;
    };
    const vencimiento = () => { descartar = true; destruida = true; activa = false; };
    try {
        await comando(connection, () => connection.beginTransaction(), vencimiento);
        fase = "operacion";
        // Comprobar en la conexión actual: no asumir que otra instalación usa InnoDB.
        const nombres = [...new Set(tablas.map(tabla => tabla.toLowerCase()))];
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
        const resultado = await operacion(consultar);
        activa = false;
        fase = "confirmacion";
        await comando(connection, () => connection.commit(), vencimiento);
        return resultado;
    } catch (error) {
        if (destruida) throw error;
        if (fase === "inicio") {
            descartar = true;
            throw error;
        }
        if (fase === "confirmacion") {
            // Si se perdió la respuesta a COMMIT, el servidor pudo haberlo aplicado.
            descartar = true;
            const incierto = new Error("No se pudo confirmar el resultado. Consulta la pareja antes de volver a guardar o eliminar; no se reintentó automáticamente.");
            incierto.code = "TRANSACTION_OUTCOME_UNKNOWN";
            throw incierto;
        }
        try { await comando(connection, () => connection.rollback(), vencimiento); }
        catch {
            descartar = true;
            const incierto = new Error("La conexión falló al revertir la operación. Verifica los datos antes de reintentar.");
            incierto.code = "TRANSACTION_OUTCOME_UNKNOWN";
            throw incierto;
        }
        throw error;
    } finally {
        activa = false;
        if (descartar && !destruida) connection.destroy();
        else if (destruida) { /* Ya cerrada al vencer el plazo. */ }
        else connection.release();
    }
    });
}

module.exports = { queryDatabase, withTransaction, probarConexion, inicializarBaseDatos };

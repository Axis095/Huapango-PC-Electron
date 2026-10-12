const mysql = require("mysql2/promise");
const { cargarConfiguracion, normalizarConfiguracion } = require("./Modelos/configModel");

// Importar este módulo no lee archivos ni intenta conectar con MySQL.
let pool = null;

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
        connection = await mysql.createConnection({ ...datos, connectTimeout: 5000 });
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
    const config = await probarConexion(cargarConfiguracion());
    const nuevoPool = mysql.createPool({ ...config, connectTimeout: 5000,
        waitForConnections: true, connectionLimit: 10, queueLimit: 0 });
    const anterior = pool;
    pool = nuevoPool;
    // Las operaciones ya iniciadas terminan en el pool anterior.
    if (anterior) anterior.end().catch(() => console.error("No se pudo cerrar el pool anterior de MySQL."));
}

async function queryDatabase(sql, params = []) {
    if (!Array.isArray(params) || params.includes(undefined)) {
        throw new Error("Los parámetros de la consulta contienen valores no definidos.");
    }
    if (!pool) throw new Error("Configura y comprueba la conexión con MySQL antes de consultar datos.");
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

// El callback debe esperar todas sus consultas; nunca usar queryDatabase dentro
// de él, porque tomaría otra conexión del pool.
async function withTransaction(tablas, operacion) {
    if (!pool) throw new Error("Configura y comprueba la conexión con MySQL antes de consultar datos.");
    if (!Array.isArray(tablas) || !tablas.length || tablas.some(tabla => typeof tabla !== "string" || !tabla)) {
        throw new Error("Indica las tablas que participan en la transacción.");
    }
    const connection = await pool.getConnection();
    let fase = "inicio";
    let descartar = false;
    let activa = true;
    const consultar = async (sql, params = []) => {
        if (!activa) throw new Error("La transacción ya terminó.");
        if (!Array.isArray(params) || params.includes(undefined)) {
            throw new Error("Los parámetros de la consulta contienen valores no definidos.");
        }
        const [results] = await connection.execute(sql, params);
        return results;
    };
    try {
        await connection.beginTransaction();
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
        await connection.commit();
        return resultado;
    } catch (error) {
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
        try { await connection.rollback(); }
        catch {
            descartar = true;
            const incierto = new Error("La conexión falló al revertir la operación. Verifica los datos antes de reintentar.");
            incierto.code = "TRANSACTION_OUTCOME_UNKNOWN";
            throw incierto;
        }
        throw error;
    } finally {
        activa = false;
        if (descartar) connection.destroy();
        else connection.release();
    }
}

module.exports = { queryDatabase, withTransaction, probarConexion, inicializarBaseDatos };

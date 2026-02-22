// const mysql = require('mysql2');

// const connection = mysql.createConnection({ // Conexión al SMBD
//     host: 'localhost',     // La ruta es el localhost de siempre
//     user: 'root',    // Usuario de MySQL
//     password: '22junio2004',  // Contraseña que tengas en tu archivo de MySQl
//     database: 'huapango' // Base de datos
// });

// connection.connect((err) => {
//     if (err) {
//         console.error('Error conectando a MySQL:', err);
//         return;
//     }
//     console.log('Conexión a MySQL exitosa ✅');
// });

// function queryDatabase(query, params = []) {
//     return new Promise((resolve, reject) => {
//         connection.query(query, params, (err, results) => {
//             if (err) {
//                 return reject(err);
//             }
//             resolve(results);
//         });
//     });
// }

// module.exports = { connection, queryDatabase };


// const mysql = require('mysql2');

// const connection = mysql.createConnection({ // Conexión al SMBD
//      host: 'localhost',     // La ruta es el localhost de siempre
//     //host: "148.220.208.253", // Cambia esto a la IP de tu servidor MySQL
//     user: 'root',    // Usuario de MySQL
//     password: 'AXIS095',  // Contraseña que tengas en tu archivo de MySQl
//     database: 'huapango' // Base de datos
// });

// connection.connect((err) => {
//     if (err) {
//         console.error('Error conectando a MySQL:', err);
//         return;
//     }
//     console.log('Conexión a MySQL exitosa ✅');
// });

// function queryDatabase(query, params = []) {
//     return new Promise((resolve, reject) => {
//         connection.query(query, params, (err, results) => {
//             if (err) {
//                 return reject(err);
//             }
//             resolve(results);
//         });
//     });
// }


// module.exports = { connection, queryDatabase };




// const mysql = require('mysql2/promise');
// const fs = require('fs');
// const path = require('path');
// const { cargarConfiguracion } = require("../Modelos/configModel");

// // // Lee el archivo config.json
// // const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// // Cargar configuración desde `configModel.js`
// const config = cargarConfiguracion();


// // Función para hacer consultas
// async function queryDatabase(sql, params = []) {
//     const connection = await mysql.createConnection({
//         host: config.host,
//         user: config.user,
//         password: config.password,
//         database: config.database
//     });

//     const [results] = await connection.execute(sql, params);
//     await connection.end();
//     return results;
// }

// module.exports = { queryDatabase };


//Esta versión funciona
// const mysql = require("mysql2/promise");
// const { cargarConfiguracion } = require("./Modelos/configModel");


// // Cargar configuración desde `configModel.js`
// const config = cargarConfiguracion();

// // Crear un pool de conexiones para mejorar el rendimiento
// const pool = mysql.createPool({
//     host: config.host,
//     user: config.user,
//     password: config.password,
//     database: config.database,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// });

// // 🔹 Función optimizada para hacer consultas
// async function queryDatabase(sql, params = []) {
//     const connection = await pool.getConnection();
//     try {
//         const [results] = await connection.execute(sql, params);
//         return results;
//     } finally {
//         connection.release();
//     }
// }

// module.exports = { queryDatabase };


const mysql = require("mysql2/promise");
const { cargarConfiguracion } = require("./Modelos/configModel");

// Cargar configuración desde `configModel.js`
const config = cargarConfiguracion();

// Verificar conexión antes de iniciar el pool de conexiones
async function verificarConexion() {
    try {
        const connection = await mysql.createConnection({
            host: config.host,
            user: config.user,
            password: config.password,
            database: config.database
        });

        await connection.end();
        console.log("✅ Conexión exitosa con la base de datos.");
        return true;
    } catch (error) {
        console.error("❌ Error de conexión a la base de datos:", error);
        return false;
    }
}

// Crear un pool de conexiones solo si la conexión es válida
const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Función optimizada para hacer consultas
async function queryDatabase(sql, params = []) {
        if (params.includes(undefined)) {
        console.error("❌ Error: Se está enviando `undefined` a la consulta SQL.", params);
        throw new Error("Los parámetros de la consulta contienen valores no definidos.");
    }


    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

module.exports = { queryDatabase, verificarConexion };

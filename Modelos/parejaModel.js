const { queryDatabase } = require("../db");


function vacioANull(valor) {
    return (valor === undefined || valor === null || valor === '') ? null : valor;
}
// Función para registrar una pareja
// async function registrarPareja(datos) {
//     const sql = `
//         INSERT INTO T_Participantes 
//         (nParejaID, oFoto, dNacimiento, ISexo, nTelefono, cNombre, cApellido, cEmail, cNombreM, cApellidoM, dNacimientoM, nTelefonoM, cEmailM) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;
//     try {
//         const result = await queryDatabase(sql, [
//             datos.nParejaID,
//             datos.oFoto,
//             datos.dNacimiento,
//             datos.ISexo,
//             datos.nTelefono,
//             datos.cNombre,
//             datos.cApellido,
//             datos.cEmail,
//             datos.cNombreM,
//             datos.cApellidoM,
//             datos.dNacimientoM,
//             datos.nTelefonoM,
//             datos.cEmailM,
//         ]);
//         return result.insertId; // Devuelve el ID del registro insertado
//     } catch (err) {
//         throw new Error("Error al registrar pareja: " + err.message);
//     }
// }

// Función para registrar una pareja (dos participantes)
async function registrarPareja(datos) {
    try {
        const sql = `
            INSERT INTO T_Participantes 
            (nParejaID, oFoto, dNacimiento, ISexo, nTelefono, cNombre, cApellido, cEmail, 
            cNombreM, cApellidoM, dNacimientoM, nTelefonoM, cEmailM, ISexoM, IFotoM)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await queryDatabase(sql, [
            datos.nParejaID,
            datos.oFotoMasculino || null,
            datos.dNacimientoMasculino,
            datos.sexoMasculino,
            datos.nTelefonoMasculino,
            datos.cNombreMasculino,
            datos.cApellidoMasculino,
            datos.cEmailMasculino,
            datos.cNombreFemenino,
            datos.cApellidoFemenino,
            datos.dNacimientoFemenino,
            datos.nTelefonoFemenino,
            datos.cEmailFemenino,
            datos.sexoFemenino,
            datos.oFotoFemenino || null
        ]);
        return datos.nParejaID;
    } catch (err) {
        throw new Error("Error al registrar pareja: " + err.message);
    }
}



// Función para buscar pareja por ID
async function buscarParejaPorID(id) {
    const sql = "SELECT * FROM T_Participantes WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [id]);
        return result; // Devuelve los resultados de la consulta
    } catch (err) {
        throw new Error("Error al buscar pareja: " + err.message);
    }
}

// Función para buscar todas las parejas
async function buscarTodasLasParejas() {
    const sql = `
        SELECT 
            p.nParejaID, 
            CONCAT(p.cNombre, ' ', p.cApellido) AS nombreParticipante1, 
            CONCAT(p.cNombreM, ' ', p.cApellidoM) AS nombreParticipante2,
            c.cCategoriaNombre AS categoriaNombre, 
            e.cEstiloNombre AS estiloNombre
        FROM T_Participantes AS p
        LEFT JOIN T_Categorias AS c ON p.nParejaID = c.nParejaID
        LEFT JOIN T_Estilos AS e ON p.nParejaID = e.nParejaID
    `;
    try {
        const result = await queryDatabase(sql);
        return result; // Devuelve todas las parejas con los datos correctos
    } catch (err) {
        throw new Error("Error al buscar todas las parejas: " + err.message);
    }
}




// Función para actualizar una pareja
// async function actualizarPareja(datos) { POSIBLE UUSO PAARA IMPLEMENTAR EL UPDATE DE MUJERES
//     console.log("📌 Datos recibidos para actualizar pareja:", datos);

//     const sql = `
//         UPDATE T_Participantes
//         SET 
//             oFoto = ?, 
//             dNacimiento = ?, 
//             ISexo = ?, 
//             nTelefono = ?, 
//             cNombre = ?, 
//             cApellido = ?, 
//             cEmail = ?, 
//             cNombreM = ?, 
//             cApellidoM = ?, 
//             dNacimientoM = ?, 
//             nTelefonoM = ?, 
//             cEmailM = ?
//         WHERE nParejaID = ?
//     `;

//     try {
//         const result = await queryDatabase(sql, [
//             datos.oFoto || "default.png",  // Usa un valor por defecto si está vacío
//             datos.dNacimiento || null, // Permite valores NULL
//             datos.ISexo || null,
//             datos.nTelefono || null,
//             datos.cNombre || null,
//             datos.cApellido || null,
//             datos.cEmail || null,
//             datos.cNombreM || null,
//             datos.cApellidoM || null,
//             datos.dNacimientoM || null,
//             datos.nTelefonoM || null,
//             datos.cEmailM || null,
//             datos.nParejaID,
//         ]);

//         console.log("✅ Resultado de la actualización:", result);
//         return { success: true, affectedRows: result.affectedRows };
//     } catch (err) {
//         console.error("❌ Error en la base de datos al actualizar pareja:", err);
//         return { success: false, error: err.message };
//     }
// }



//Función para actualizar una pareja
// async function actualizarPareja(datos) {
//     console.log("📌 Datos recibidos para actualizar pareja:", datos);
//     const sql = `
//         UPDATE T_Participantes 
//         SET cNombre = ?, 
//             nTelefono = ?, 
//             cApellido = ?, 
//             dNacimiento = ?, 
//             cEmail = ?, 
//             oFoto = ?
//         WHERE nParejaID = ? AND ISexo = 'M'
//     `;
//     try {
//         const result = await queryDatabase(sql, [
//             datos.cNombre,
//             datos.nTelefono,
//             datos.cApellido,
//             datos.dNacimiento,
//             datos.cEmail,
//             datos.oFoto = oFoto ?? "C:/Proyecto/uploads/default.jpg", // 🔹 Usa imagen por defecto si no hay otra
//             datos.nParejaID
//         ]);
//                 console.log("📊 Ejecutando consulta SQL con:", result);
//         return { success: true, affectedRows: result.affectedRows };
//     } catch (err) {
//         console.error("Error en la actualización de pareja:", err);
//         return { success: false, error: err.message };
//     }
// }


// ...existing code...

async function actualizarParejaCompleta(datos) {
    try {
        console.log("🔹 [actualizarParejaCompleta] Datos recibidos:", datos);

        // Masculino
        const sqlMasculino = `
            UPDATE T_Participantes
            SET cNombre = ?, cApellido = ?, cEmail = ?, nTelefono = ?, dNacimiento = ?, oFoto = COALESCE(?, oFoto)
            WHERE nParejaID = ?
        `;
        console.log("🔹 [actualizarParejaCompleta] SQL Masculino:", sqlMasculino);
        console.log("🔹 [actualizarParejaCompleta] Params Masculino:", [
            datos.cNombreMasculino,
            datos.cApellidoMasculino,
            datos.cEmailMasculino,
            datos.nTelefonoMasculino,
            datos.dNacimientoMasculino,
            datos.oFotoMasculino || null,
            datos.nParejaID
        ]);
        const resultM = await queryDatabase(sqlMasculino, [
            datos.cNombreMasculino,
            datos.cApellidoMasculino,
            datos.cEmailMasculino,
            datos.nTelefonoMasculino,
            datos.dNacimientoMasculino,
            datos.oFotoMasculino || null,
            datos.nParejaID
        ]);
        console.log(`✅ Participante masculino actualizado. Filas afectadas: ${resultM.affectedRows}`);

        // Femenino
        const sqlFemenino = `
            UPDATE T_Participantes
            SET cNombreM = ?, cApellidoM = ?, cEmailM = ?, nTelefonoM = ?, dNacimientoM = ?, IFotoM = COALESCE(?, IFotoM)
            WHERE nParejaID = ?
        `;
        console.log("🔹 [actualizarParejaCompleta] SQL Femenino:", sqlFemenino);
        console.log("🔹 [actualizarParejaCompleta] Params Femenino:", [
            datos.cNombreFemenino,
            datos.cApellidoFemenino,
            datos.cEmailFemenino,
            datos.nTelefonoFemenino,
            datos.dNacimientoFemenino,
            datos.oFotoFemenino || null,
            datos.nParejaID
        ]);
        const resultF = await queryDatabase(sqlFemenino, [
            datos.cNombreFemenino,
            datos.cApellidoFemenino,
            datos.cEmailFemenino,
            datos.nTelefonoFemenino,
            datos.dNacimientoFemenino,
            datos.oFotoFemenino || null,
            datos.nParejaID
        ]);
        console.log(`✅ Participante femenino actualizado. Filas afectadas: ${resultF.affectedRows}`);

        return {
            success: true,
            affectedRowsMasculino: resultM.affectedRows,
            affectedRowsFemenino: resultF.affectedRows
        };
    } catch (err) {
        console.error("❌ Error en la actualización de pareja:", err);
        return { success: false, error: err.message };
    }
}

// ...existing code...



// Función para eliminar una pareja por ID
async function eliminarPareja(id) {
    try {
        // Eliminar primero las referencias en tablas relacionadas
        await queryDatabase("DELETE FROM T_Categoria WHERE nParejaID = ?", [id]);
        await queryDatabase("DELETE FROM T_Estilos WHERE nParejaID = ?", [id]);

        // Luego eliminar la pareja de la tabla principal
        const result = await queryDatabase("DELETE FROM T_Participantes WHERE nParejaID = ?", [id]);
        return result.affectedRows; // Devuelve el número de filas afectadas
    } catch (err) {
        throw new Error("Error al eliminar pareja: " + err.message);
    }
}



module.exports = { registrarPareja, buscarParejaPorID, buscarTodasLasParejas, eliminarPareja, actualizarParejaCompleta };
// module.exports = { registrarPareja, buscarParejaPorID, buscarTodasLasParejas, actualizarPareja, eliminarPareja, actualizarParejaCompleta };
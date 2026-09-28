const { queryDatabase, withTransaction } = require("../db");


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

// Proyección usada por la ficha de evaluación: filtrar antes de enviar datos por IPC.
async function buscarParejaParaEvaluacion(id) {
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
        WHERE p.nParejaID = ?
    `;
    return queryDatabase(sql, [id]);
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
//     console.log("Datos recibidos para actualizar pareja:", datos);

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

//         console.log("Resultado de la actualización:", result);
//         return { success: true, affectedRows: result.affectedRows };
//     } catch (err) {
//         console.error("Error en la base de datos al actualizar pareja:", err);
//         return { success: false, error: err.message };
//     }
// }



//Función para actualizar una pareja
// async function actualizarPareja(datos) {
//     console.log("Datos recibidos para actualizar pareja:", datos);
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
//             datos.oFoto = oFoto ?? "C:/Proyecto/uploads/default.jpg", // Usa imagen por defecto si no hay otra
//             datos.nParejaID
//         ]);
//                 console.log("Ejecutando consulta SQL con:", result);
//         return { success: true, affectedRows: result.affectedRows };
//     } catch (err) {
//         console.error("Error en la actualización de pareja:", err);
//         return { success: false, error: err.message };
//     }
// }


// ...existing code...

function validarIDEscritura(id) {
    const texto = typeof id === "string" ? id.trim() : typeof id === "number" ? String(id) : "";
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) <= 0) {
        const error = new Error("Ingresa un ID de pareja entero y positivo.");
        error.code = "INVALID_ID";
        throw error;
    }
    return Number(texto);
}

async function actualizarParejaCompleta(datos) {
    const id = validarIDEscritura(datos?.nParejaID);
    const campos = ["cNombreMasculino", "cApellidoMasculino", "cEmailMasculino", "nTelefonoMasculino", "dNacimientoMasculino",
        "cNombreFemenino", "cApellidoFemenino", "cEmailFemenino", "nTelefonoFemenino", "dNacimientoFemenino"];
    if (campos.some(campo => typeof datos[campo] !== "string" || !datos[campo].trim()) ||
        [datos.oFotoMasculino, datos.oFotoFemenino].some(foto => foto != null && typeof foto !== "string")) {
        const error = new Error("Completa los datos de ambos participantes antes de guardar. No se modificó la pareja.");
        error.code = "INVALID_DATA";
        throw error;
    }
    return withTransaction(["T_Participantes"], async consultar => {
        // Distinguir inexistente de sin cambios sin depender de CLIENT_FOUND_ROWS.
        const filas = await consultar("SELECT nParejaID FROM T_Participantes WHERE nParejaID = ? FOR UPDATE", [id]);
        if (!filas.length) return { success: false, code: "NOT_FOUND", affectedRows: 0 };
        const result = await consultar(`
            UPDATE T_Participantes
            SET cNombre = ?, cApellido = ?, cEmail = ?, nTelefono = ?, dNacimiento = ?, oFoto = COALESCE(?, oFoto),
                cNombreM = ?, cApellidoM = ?, cEmailM = ?, nTelefonoM = ?, dNacimientoM = ?, IFotoM = COALESCE(?, IFotoM)
            WHERE nParejaID = ?
        `, [
            ...campos.slice(0, 5).map(campo => datos[campo].trim()), datos.oFotoMasculino || null,
            ...campos.slice(5).map(campo => datos[campo].trim()), datos.oFotoFemenino || null, id
        ]);
        return { success: true, code: result.changedRows === 0 ? "UNCHANGED" : "UPDATED",
            affectedRows: result.affectedRows, changedRows: result.changedRows };
    });
}

// Una única implementación para los controladores de parejas y administración.
async function eliminarPareja(id) {
    const parejaID = validarIDEscritura(id);
    return withTransaction(["T_Participantes", "T_Evaluaciones", "T_Categorias", "T_Estilos"], async consultar => {
        const filas = await consultar("SELECT nParejaID FROM T_Participantes WHERE nParejaID = ? FOR UPDATE", [parejaID]);
        if (!filas.length) return 0;
        await consultar("DELETE FROM T_Evaluaciones WHERE nParejaID = ?", [parejaID]);
        await consultar("DELETE FROM T_Categorias WHERE nParejaID = ?", [parejaID]);
        await consultar("DELETE FROM T_Estilos WHERE nParejaID = ?", [parejaID]);
        const result = await consultar("DELETE FROM T_Participantes WHERE nParejaID = ?", [parejaID]);
        if (result.affectedRows !== 1) throw new Error("No se pudo completar la eliminación de la pareja.");
        return result.affectedRows;
    });
}


module.exports = { registrarPareja, buscarParejaPorID, buscarParejaParaEvaluacion, buscarTodasLasParejas, eliminarPareja, actualizarParejaCompleta };
// module.exports = { registrarPareja, buscarParejaPorID, buscarTodasLasParejas, actualizarPareja, eliminarPareja, actualizarParejaCompleta };

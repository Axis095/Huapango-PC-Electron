const { queryDatabase, withTransaction } = require("../db");
const { conFotos, limpiarFotos } = require("./imagenesModel");
const { versionPareja } = require('./versionPareja');


function vacioANull(valor) {
    return (valor === undefined || valor === null || valor === '') ? null : valor;
}
// Función para registrar una pareja (dos participantes)
async function registrarPareja(datos) {
    validarIDEscritura(datos?.nParejaID);
    return conFotos(datos, preparados => registrarDatosPareja(preparados));
}

async function registrarDatosPareja(datos) {
    return withTransaction(["T_Participantes"], async consultar => {
        const sql = `
            INSERT INTO T_Participantes 
            (nParejaID, oFoto, dNacimiento, ISexo, nTelefono, cNombre, cApellido, cEmail, 
            cNombreM, cApellidoM, dNacimientoM, nTelefonoM, cEmailM, ISexoM, IFotoM)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await consultar(sql, [
            validarIDEscritura(datos.nParejaID),
            datos.oFotoMasculino || "",
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
    });
}



// Función para buscar pareja por ID
async function buscarParejaPorID(id) {
    const sql = "SELECT * FROM T_Participantes WHERE nParejaID = ?";
    try {
        const result = await queryDatabase(sql, [validarIDEscritura(id)]);
        return result.map(fila => ({ ...fila, versionEdicion: versionPareja(fila) }));
    } catch (err) {
        throw err;
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
    return queryDatabase(sql, [validarIDEscritura(id)]);
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
        throw err;
    }
}




function validarIDEscritura(id) {
    const texto = typeof id === "string" ? id.trim() : typeof id === "number" ? String(id) : "";
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) <= 0) {
        const error = new Error("Ingresa un ID de pareja entero y positivo.");
        error.code = "INVALID_ID";
        throw error;
    }
    return texto;
}

async function actualizarParejaCompleta(datos) {
    const id = validarIDEscritura(datos?.nParejaID);
    if (typeof datos.versionEdicion !== 'string' || !/^[a-f0-9]{64}$/.test(datos.versionEdicion)) {
        throw Object.assign(new Error('Vuelve a consultar la pareja antes de modificarla; falta su versión de edición.'), { code: 'EDIT_VERSION_REQUIRED' });
    }
    const campos = ["cNombreMasculino", "cApellidoMasculino", "cEmailMasculino", "nTelefonoMasculino", "dNacimientoMasculino",
        "cNombreFemenino", "cApellidoFemenino", "cEmailFemenino", "nTelefonoFemenino", "dNacimientoFemenino"];
    if (campos.some(campo => typeof datos[campo] !== "string" || !datos[campo].trim()) ||
        [datos.oFotoMasculino, datos.oFotoFemenino].some(foto => foto != null && typeof foto !== "string")) {
        const error = new Error("Completa los datos de ambos participantes antes de guardar. No se modificó la pareja.");
        error.code = "INVALID_DATA";
        throw error;
    }
    return conFotos(datos, preparados => actualizarDatosPareja(preparados, id, campos), fotoEnUso);
}

async function actualizarDatosPareja(datos, id, campos) {
    return withTransaction(["T_Participantes"], async consultar => {
        // Distinguir inexistente de sin cambios sin depender de CLIENT_FOUND_ROWS.
        const filas = await consultar("SELECT * FROM T_Participantes WHERE nParejaID = ? FOR UPDATE", [id]);
        if (!filas.length) return { success: false, code: "NOT_FOUND", affectedRows: 0 };
        if (versionPareja(filas[0]) !== datos.versionEdicion) {
            throw Object.assign(new Error('Otra estación cambió esta pareja. Conserva tus cambios y vuelve a consultar antes de guardar.'), { code: 'EDIT_CONFLICT' });
        }
        const result = await consultar(`
            UPDATE T_Participantes
            SET cNombre = ?, cApellido = ?, cEmail = ?, nTelefono = ?, dNacimiento = ?, oFoto = COALESCE(?, oFoto),
                cNombreM = ?, cApellidoM = ?, cEmailM = ?, nTelefonoM = ?, dNacimientoM = ?, IFotoM = COALESCE(?, IFotoM)
            WHERE nParejaID = ?
        `, [
            ...campos.slice(0, 5).map(campo => datos[campo].trim()), datos.oFotoMasculino || null,
            ...campos.slice(5).map(campo => datos[campo].trim()), datos.oFotoFemenino || null, id
        ]);
        const nuevas = await consultar('SELECT * FROM T_Participantes WHERE nParejaID = ?', [id]);
        return { success: true, code: result.changedRows === 0 ? "UNCHANGED" : "UPDATED", versionEdicion: versionPareja(nuevas[0]),
            affectedRows: result.affectedRows, changedRows: result.changedRows,
            fotosAnteriores: [datos.oFotoMasculino ? filas[0].oFoto : null, datos.oFotoFemenino ? filas[0].IFotoM : null] };
    });
}

// Una única implementación para los controladores de parejas y administración.
async function eliminarPareja(id) {
    const parejaID = validarIDEscritura(id);
    let fotosAnteriores = [];
    const resultado = await withTransaction(["T_Participantes", "T_Evaluaciones", "T_Categorias", "T_Estilos"], async consultar => {
        const filas = await consultar("SELECT nParejaID, oFoto, IFotoM FROM T_Participantes WHERE nParejaID = ? FOR UPDATE", [parejaID]);
        if (!filas.length) return 0;
        fotosAnteriores = [filas[0].oFoto, filas[0].IFotoM];
        await consultar("DELETE FROM T_Evaluaciones WHERE nParejaID = ?", [parejaID]);
        await consultar("DELETE FROM T_Categorias WHERE nParejaID = ?", [parejaID]);
        await consultar("DELETE FROM T_Estilos WHERE nParejaID = ?", [parejaID]);
        const result = await consultar("DELETE FROM T_Participantes WHERE nParejaID = ?", [parejaID]);
        if (result.affectedRows !== 1) throw new Error("No se pudo completar la eliminación de la pareja.");
        return result.affectedRows;
    });
    if (resultado) await limpiarFotos(fotosAnteriores, fotoEnUso);
    return resultado;
}

async function fotoEnUso(referencia) {
    const filas = await queryDatabase("SELECT nParejaID FROM T_Participantes WHERE oFoto = ? OR IFotoM = ? LIMIT 1", [referencia, referencia]);
    return filas.length > 0;
}


module.exports = { registrarPareja, buscarParejaPorID, buscarParejaParaEvaluacion, buscarTodasLasParejas, eliminarPareja, actualizarParejaCompleta };

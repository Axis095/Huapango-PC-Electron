const { withTransaction } = require('../db');
const { idPositivo, texto } = require('../Seguridad/datos');

// Los identificadores SQL proceden exclusivamente de este catálogo interno.
const contratos = Object.freeze({
    categoria: { tabla: 't_categorias', id: 'nIDCategoria', nombre: 'cCategoriaNombre' },
    estilo: { tabla: 't_estilos', id: 'nEstiloID', nombre: 'cEstiloNombre' }
});

async function registrarAsignacion(tipo, datos) {
    const contrato = contratos[tipo];
    if (!contrato) throw new Error('Tipo de asignación no admitido.');
    const pareja = idPositivo(datos?.nParejaID);
    const id = idPositivo(datos?.[contrato.id]);
    const nombre = texto(datos?.[contrato.nombre], tipo);
    if (nombre.length > 100) throw new Error('El nombre admite hasta 100 caracteres.');
    return withTransaction(['t_participantes', contrato.tabla], async consultar => {
        // Bloquear la pareja serializa asignaciones entre conexiones/estaciones,
        // incluso cuando todavía no existe la fila hija que se quiere insertar.
        const padres = await consultar('SELECT nParejaID FROM t_participantes WHERE nParejaID = ? FOR UPDATE', [pareja]);
        if (!padres.length) throw Object.assign(new Error('No se encontró la pareja.'), { code: 'NOT_FOUND' });
        const previas = await consultar(`SELECT ${contrato.id} FROM ${contrato.tabla} WHERE nParejaID = ? FOR UPDATE`, [pareja]);
        if (previas.length) throw Object.assign(new Error(`Esta pareja ya tiene ${tipo} registrada.`), { code: 'ASSIGNMENT_EXISTS' });
        await consultar(`INSERT INTO ${contrato.tabla} (${contrato.id}, ${contrato.nombre}, nParejaID) VALUES (?, ?, ?)`, [id, nombre, pareja]);
        return id;
    });
}

module.exports = { registrarAsignacion };

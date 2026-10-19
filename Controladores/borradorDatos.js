const { types } = require('node:util');

const comunes = ['nParejaID', 'nombreMasculino', 'apellidoMasculino', 'emailMasculino',
    'telefonoMasculino', 'fechaNacimientoMasculino', 'nombreFemenino', 'apellidoFemenino',
    'emailFemenino', 'telefonoFemenino', 'fechaNacimientoFemenino'];
const permitidos = {
    registro: { campos: [...comunes, 'sexoMasculino', 'sexoFemenino', 'categoriaRegistro',
        'nIDCategoria', 'estiloRegistro', 'nEstiloID'], fotos: ['fotoMasculino', 'fotoFemenino'] },
    modificacion: { campos: [...comunes, ...comunes.filter(k => k !== 'nParejaID').map(k => `${k}Update`)],
        fotos: ['fotoMasculino', 'fotoMasculinoUpdate', 'fotoFemeninoAlt', 'fotoFemeninoUpdate'] }
};
const objeto = valor => valor !== null && typeof valor === 'object' &&
    !Array.isArray(valor) && Object.prototype.toString.call(valor) === '[object Object]';
const claves = (valor, lista) => objeto(valor) && Object.keys(valor).every(k => lista.includes(k));

function prepararBorrador(datos, anterior, tipo) {
    const contrato = permitidos[tipo];
    const extras = tipo === 'registro' ? ['registrada', 'categoriaGuardada', 'estiloGuardado'] : ['versionEdicion'];
    if (!claves(datos, ['version', 'campos', 'fotos', ...extras]) || datos.version !== 1 ||
        !claves(datos.campos, contrato.campos) || !claves(datos.fotos, contrato.fotos)) return null;
    let bytesTexto = 0;
    for (const valor of Object.values(datos.campos)) {
        if (typeof valor !== 'string' || valor.length > 2048) return null;
        bytesTexto += Buffer.byteLength(valor, 'utf8');
    }
    if (bytesTexto > 16 * 1024) return null;
    if (tipo === 'modificacion' && datos.versionEdicion != null &&
        (typeof datos.versionEdicion !== 'string' || !/^[a-f0-9]{64}$/.test(datos.versionEdicion))) return null;
    for (const foto of Object.values(datos.fotos)) {
        if (foto === null) continue;
        if (!claves(foto, ['nombre', 'tipo', 'fecha', 'bytes']) ||
            typeof foto.nombre !== 'string' || foto.nombre.length > 255 || !/\.(png|jpe?g)$/i.test(foto.nombre) ||
            typeof foto.tipo !== 'string' || !['', 'image/png', 'image/jpeg'].includes(foto.tipo) ||
            !Number.isSafeInteger(foto.fecha) || foto.fecha < 0 ||
            !types.isArrayBuffer(foto.bytes) || foto.bytes.byteLength < 1 || foto.bytes.byteLength > 5 * 1024 * 1024) return null;
    }
    if (tipo === 'registro') {
        if (datos.registrada != null && !((typeof datos.registrada === 'string' || typeof datos.registrada === 'number') &&
            /^\d+$/.test(String(datos.registrada)) && Number.isSafeInteger(Number(datos.registrada)) && Number(datos.registrada) > 0)) return null;
        for (const clave of ['categoriaGuardada', 'estiloGuardado']) {
            if (datos[clave] !== undefined && typeof datos[clave] !== 'boolean') return null;
        }
    }
    // Fotos omitidas conservan la selección anterior; null elimina una foto.
    // Solo se incorporan claves conocidas. IPC ya clonó la carga de entrada.
    return { ...datos, campos: { ...datos.campos }, fotos: { ...anterior?.fotos, ...datos.fotos } };
}

module.exports = { prepararBorrador };

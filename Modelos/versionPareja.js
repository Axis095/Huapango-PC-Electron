const { createHash } = require('node:crypto');
const campos = ['nParejaID', 'cNombre', 'cApellido', 'cEmail', 'nTelefono', 'dNacimiento', 'ISexo', 'oFoto',
    'cNombreM', 'cApellidoM', 'cEmailM', 'nTelefonoM', 'dNacimientoM', 'ISexoM', 'IFotoM'];

function versionPareja(fila) {
    const valores = campos.map(campo => {
        const valor = fila[campo];
        if (valor == null) return null;
        if (valor instanceof Date || Object.prototype.toString.call(valor) === '[object Date]') {
            // mysql2 DATE utiliza el calendario local; evitar moverlo por UTC.
            return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
        }
        return String(valor);
    });
    return createHash('sha256').update(JSON.stringify(valores)).digest('hex');
}
module.exports = { versionPareja };

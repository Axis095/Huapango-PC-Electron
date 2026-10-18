const { dialog, shell } = require('electron');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { obtenerSesion } = require('../Modelos/sesionModel');
const { generarPDFParejas, generarPDFResultados, generarPDFCategorias, generarPDFEstilos,
    generarPDFRegistrosGenerales } = require('../Modelos/pdfModel');

function sesionAutorizada(event, roles, vistas) {
    try {
        const sesion = obtenerSesion();
        if (roles.includes(sesion?.userRole) && Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
            event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
            vistas.some(vista => path.resolve(fileURLToPath(event.senderFrame.url)) ===
                path.resolve(__dirname, '../Vistas', vista))) return sesion;
    } catch { /* Un emisor inválido no puede abrir diálogos ni exportar datos. */ }
    return null;
}

function exportador({ roles, vistas, title, defaultPath, generar }) {
    // Solo se acepta el evento. Los argumentos adicionales enviados por IPC se ignoran.
    return async function (event, sigueAutorizado = () => false) {
        const identidad = sesionAutorizada(event, roles, vistas);
        const verificar = () => {
            const actual = sesionAutorizada(event, roles, vistas);
            if (!sigueAutorizado() || !identidad || !actual || actual.userID !== identidad.userID || actual.userRole !== identidad.userRole) {
                const error = new Error('No tienes permisos para exportar este PDF desde esta pantalla con la sesión actual.');
                error.code = 'FORBIDDEN';
                throw error;
            }
        };
        try {
            verificar();
            const { canceled, filePath } = await dialog.showSaveDialog({
                title, defaultPath, filters: [{ name: 'PDF', extensions: ['pdf'] }]
            });
            verificar(); // El diálogo puede permanecer abierto mientras cambia la sesión.
            if (canceled || !filePath) return { success: false, error: 'Cancelado por el usuario' };
            // El modelo vuelve a comprobar después de consultar y antes de crear el archivo.
            await generar(filePath, identidad, verificar);
            verificar();
            await shell.openPath(filePath);
            return { success: true, ruta: filePath };
        } catch (err) {
            console.error('Error al exportar PDF:', err);
            return { success: false, code: err.code || 'PDF_FAILED', error: err.message, message: err.message };
        }
    };
}

const vistasRegistro = ['Registros.html', 'RegistroCategoriasEstilos.html', 'Parejas.html'];
const handleGenerarPDFParejas = exportador({
    roles: ['admin'], vistas: ['Registros.html'],
    title: 'Guardar PDF de Parejas', defaultPath: 'parejas_registradas.pdf',
    generar: (ruta, sesion, verificar) => generarPDFParejas(ruta, verificar)
});
const handleGenerarPDFResultados = exportador({
    roles: ['admin', 'juez'], vistas: ['Resultados.html'],
    title: 'Guardar PDF de Evaluaciones', defaultPath: 'resultados_evaluaciones.pdf',
    generar: (ruta, sesion, verificar) => generarPDFResultados(ruta,
        sesion.userRole === 'admin' ? null : sesion.userID, verificar)
});
const handleGenerarPDFCategorias = exportador({
    roles: ['admin', 'user'], vistas: vistasRegistro,
    title: 'Guardar PDF de Categorías', defaultPath: 'categorias_registradas.pdf',
    generar: (ruta, sesion, verificar) => generarPDFCategorias(ruta, verificar)
});
const handleGenerarPDFEstilos = exportador({
    roles: ['admin', 'user'], vistas: vistasRegistro,
    title: 'Guardar PDF de Estilos', defaultPath: 'estilos_registrados.pdf',
    generar: (ruta, sesion, verificar) => generarPDFEstilos(ruta, verificar)
});
const handleGenerarPDFRegistrosGenerales = exportador({
    roles: ['admin'], vistas: ['Administrador.html'],
    title: 'Guardar PDF de Registros Generales', defaultPath: 'registros_generales.pdf',
    generar: (ruta, sesion, verificar) => generarPDFRegistrosGenerales(ruta, verificar)
});

module.exports = { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias,
    handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales };

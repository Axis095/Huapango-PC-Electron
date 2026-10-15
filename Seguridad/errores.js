const publicos = new Set(['INVALID_DATA', 'INVALID_ID', 'INVALID_PHOTO', 'NOT_FOUND', 'EDIT_VERSION_REQUIRED',
    'EDIT_CONFLICT', 'ASSIGNMENT_EXISTS', 'EVALUATION_EXISTS', 'DUPLICATE_HISTORY', 'TRANSACTION_OUTCOME_UNKNOWN',
    'UNSAFE_STORAGE_ENGINE', 'CONFIGURATION_BUSY', 'DB_BUSY', 'SELF_DELETE', 'LAST_ADMIN', 'AMBIGUOUS_USER', 'FORBIDDEN', 'NO_DATA']);
function mensajePublico(error) {
    if (publicos.has(error?.code)) return error.message;
    if (error?.code === 'ER_DUP_ENTRY') return 'Ya existe un registro con ese ID o dato único. Consulta los datos antes de reintentar.';
    if (['ER_ROW_IS_REFERENCED_2', 'ER_NO_REFERENCED_ROW_2'].includes(error?.code)) return 'La operación no es compatible con los registros relacionados. Revisa sus relaciones antes de continuar.';
    if (error?.code === 'ER_NO_SUCH_TABLE') return 'La base configurada no dispone de la tabla necesaria para esta función. Revisa el diagnóstico del esquema.';
    return 'No se pudo completar la operación. Comprueba la conexión y consulta los datos antes de reintentar.';
}
module.exports = { mensajePublico };

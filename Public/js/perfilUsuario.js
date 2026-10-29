// La identidad procede de la sesión del proceso principal, no del almacenamiento local.
export async function cargarNombreSesion(documento = document, api = window.api) {
    const perfiles = documento.querySelectorAll('[data-nombre-sesion]');
    if (!perfiles.length) return;
    const mostrar = texto => perfiles.forEach(elemento => { elemento.textContent = texto; });
    mostrar('Cargando cuenta…');
    try {
        const nombre = await api.getUsuarioNombre();
        // textContent permite mostrar nombres con caracteres especiales sin interpretar HTML.
        mostrar(typeof nombre === 'string' && nombre.trim() ? nombre : 'Sesión no disponible');
    } catch {
        mostrar('No se pudo cargar la cuenta');
    }
}

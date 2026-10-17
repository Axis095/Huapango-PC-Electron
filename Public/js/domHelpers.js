function contenedor(clase) {
    return document.querySelector(`.${clase}`);
}
export function mostrarResultados(resultados, containerClass) {
    const container = contenedor(containerClass);
    if (!container) return;
    container.replaceChildren();
    if (!resultados?.length) {
        const mensaje = document.createElement('p');
        mensaje.textContent = 'No se encontraron resultados.';
        container.appendChild(mensaje);
        return;
    }
    for (const resultado of resultados) {
        const fila = document.createElement('div');
        fila.className = 'resultado';
        for (const [clave, valor] of Object.entries(resultado)) {
            const campo = document.createElement('p');
            const etiqueta = document.createElement('strong');
            etiqueta.textContent = `${clave}:`;
            campo.append(etiqueta, document.createTextNode(` ${valor ?? ''}`));
            fila.appendChild(campo);
        }
        container.appendChild(fila);
    }
}
export function mostrarError(mensaje, containerClass) {
    const container = contenedor(containerClass);
    if (!container) return;
    const error = document.createElement('p');
    error.className = 'error';
    error.textContent = mensaje;
    container.replaceChildren(error);
}
export function mostrarSpinner(containerClass) {
    const container = contenedor(containerClass);
    if (!container) return;
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.textContent = 'Cargando…';
    container.replaceChildren(spinner);
}
export function ocultarSpinner(containerClass) {
    contenedor(containerClass)?.replaceChildren();
}

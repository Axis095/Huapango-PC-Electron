export function mostrarResultados(resultados, containerClass) {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) {
        console.error(`❌ No se encontró el contenedor con clase '${containerClass}'`);
        return;
    }

    container.innerHTML = ""; // Limpiar el contenedor antes de agregar nuevos resultados

    if (!resultados || resultados.length === 0) {
        container.innerHTML = "<p>No se encontraron resultados.</p>";
    } else {
        container.innerHTML = resultados
            .map(
                (res) =>
                    `<div class="resultado">
                            ${Object.entries(res)
                                .map(([key, value]) => `<p><strong>${key}:</strong> ${value}</p>`)
                                .join("")}
                        </div>`
            )
            .join("");
    }
}

export function mostrarError(mensaje, containerClass) {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) {
        console.error(`❌ No se encontró el contenedor con clase '${containerClass}'`);
        return;
    }

    container.innerHTML = `<p class="error">${mensaje}</p>`;
}


export function mostrarSpinner(containerClass) {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) {
        console.error(`❌ No se encontró el contenedor con clase '${containerClass}'`);
        return;
    }

    container.innerHTML = `<div class="spinner">Cargando...</div>`;
}


export function ocultarSpinner(containerClass) {
    const container = document.querySelector(`.${containerClass}`);
    if (!container) {
        console.error(`❌ No se encontró el contenedor con clase '${containerClass}'`);
        return;
    }

    container.innerHTML = ""; // Limpia el contenedor
}
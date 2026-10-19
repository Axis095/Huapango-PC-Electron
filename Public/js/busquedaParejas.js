// Avisos dentro de la vista: no abrir diálogos nativos que puedan perder el foco.
export function inicializarBusquedaParejas(documento = document, api = window.api) {
    const consultas = [
        ["nParejaID", "btnBuscarPareja", "estadoBusquedaParejas", "resultadosBusquedaParejas", "buscarParejaPorID", "No se encontró ninguna pareja con ese ID."],
        ["nIDCategoria", "btnBuscarCategoria", "estadoBusquedaCategorias", "resultadosBusquedaCategorias", "buscarCategoriaPorID", "No se encontró una categoría para esa pareja."],
        ["nEstiloID", "btnBuscarEstilo", "estadoBusquedaEstilos", "resultadosBusquedaEstilos", "buscarEstiloPorID", "No se encontró un estilo para esa pareja."]
    ];

    for (const [inputID, botonID, estadoID, clase, metodo, sinResultados] of consultas) {
        const input = documento.getElementById(inputID);
        const boton = documento.getElementById(botonID);
        const estado = documento.getElementById(estadoID);
        const resultados = documento.querySelector(`.${clase}`);
        if (!input || !boton || !estado || !resultados) continue;
        let buscando = false;
        let revision = 0;

        function avisar(texto, tipo = "info") {
            estado.textContent = texto;
            estado.dataset.tipo = tipo;
        }

        // Los datos se muestran como texto, nunca como HTML ejecutable.
        function mostrar(filas) {
            for (const fila of filas) {
                const tarjeta = documento.createElement("div");
                tarjeta.className = "resultado";
                for (const [campo, valor] of Object.entries(fila)) {
                    if (campo === 'versionEdicion') continue;
                    const linea = documento.createElement("p");
                    const etiqueta = documento.createElement("strong");
                    etiqueta.textContent = `${campo}: `;
                    linea.append(etiqueta, documento.createTextNode(String(valor ?? "")));
                    tarjeta.append(linea);
                }
                resultados.append(tarjeta);
            }
        }

        resultados.replaceChildren();
        input.addEventListener("input", () => {
            revision++;
            resultados.replaceChildren();
            avisar("");
        });

        async function buscar(event) {
            event.preventDefault();
            if (buscando) return;
            const actual = revision;
            const id = input.value.trim();
            resultados.replaceChildren();
            if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
                avisar("Ingresa un ID de pareja entero y positivo.", "error");
                input.focus();
                return;
            }

            buscando = true;
            // Mover el foco antes de deshabilitar el botón, para que no caiga en body.
            if (documento.activeElement === boton) input.focus();
            boton.disabled = true;
            resultados.setAttribute("aria-busy", "true");
            avisar("Buscando…");
            try {
                const respuesta = await api[metodo](id);
                // Si el usuario cambió el ID mientras esperaba, descartar la respuesta.
                if (revision !== actual) return;
                if (!respuesta?.success) {
                    avisar(respuesta?.message || "No se pudo completar la búsqueda. Intenta nuevamente.", "error");
                } else if (!Array.isArray(respuesta.data)) {
                    avisar("No se pudo completar la búsqueda. Intenta nuevamente.", "error");
                } else if (respuesta.data.length === 0) {
                    avisar(sinResultados, "error");
                } else {
                    mostrar(respuesta.data);
                    avisar("Consulta completada.");
                }
            } catch {
                if (revision === actual) avisar("No se pudo completar la búsqueda. Intenta nuevamente.", "error");
            } finally {
                buscando = false;
                boton.disabled = false;
                resultados.setAttribute("aria-busy", "false");
                // Conservar el foco si el usuario ya está trabajando en otro campo.
                if (revision === actual && documento.activeElement === boton) input.focus();
            }
        }

        boton.addEventListener("click", buscar);
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && !event.isComposing) return buscar(event);
        });
    }
}

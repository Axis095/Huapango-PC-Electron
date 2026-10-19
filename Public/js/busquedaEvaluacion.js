import { validarDatosParejaResultados } from "./validaciones.js";
import { iniciarOperacion } from "./avisos.js";

// Vista de búsqueda: el controlador decide qué consultar y cómo responder.
export function inicializarBusquedaEvaluacion(documento = document, api = window.api) {
    const input = documento.getElementById("pareja-id");
    const boton = documento.getElementById("buscar-pareja");
    const guardar = documento.getElementById("guardar-evaluacion");
    const estado = documento.getElementById("estado-busqueda-pareja");
    const campos = {
        "pareja-id-info": "nParejaID",
        participante1: "nombreParticipante1",
        participante2: "nombreParticipante2",
        categoria: "categoriaNombre",
        estilo: "estiloNombre"
    };
    let buscando = false;

    function limpiarFicha() {
        for (const id of Object.keys(campos)) {
            documento.getElementById(id).textContent = "--";
        }
        guardar.disabled = true;
    }

    limpiarFicha();
    input.addEventListener("input", () => {
        limpiarFicha();
        estado.textContent = "";
    });

    boton.addEventListener("click", async (event) => {
        event.preventDefault();
        if (buscando || boton.disabled) return;

        limpiarFicha();
        const textoID = input.value.trim();
        const id = Number(textoID);
        if (!/^\d+$/.test(textoID) || !Number.isSafeInteger(id) || id <= 0) {
            estado.textContent = "Ingresa un ID de pareja entero y positivo.";
            return;
        }

        const liberar = iniciarOperacion(documento);
        if (!liberar) return;
        const pdf = documento.getElementById("btnGenerarPDFResultados");
        const pdfDeshabilitado = pdf?.disabled;
        if (pdf) pdf.disabled = true;
        buscando = true;
        boton.disabled = true;
        input.disabled = true;
        estado.textContent = "Buscando pareja…";

        try {
            const response = await api.buscarParejaParaEvaluacion(textoID);
            if (!response.success) {
                estado.textContent = response.message || response.error || "No se pudo consultar la pareja.";
                return;
            }

            const datos = validarDatosParejaResultados(response.data);
            for (const [elemento, campo] of Object.entries(campos)) {
                documento.getElementById(elemento).textContent = datos[campo];
            }
            guardar.disabled = false;
            estado.textContent = "Pareja encontrada.";
        } catch (err) {
            console.error("Error al buscar pareja para evaluación:", err);
            estado.textContent = "No se pudo consultar la pareja. Intenta nuevamente.";
        } finally {
            buscando = false;
            boton.disabled = false;
            input.disabled = false;
            if (pdf) pdf.disabled = pdfDeshabilitado;
            liberar();
        }
    });
}

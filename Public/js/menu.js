// Esta lista controla la presentación; los permisos de las operaciones
// también deben comprobarse en el proceso principal.
const rolesPorBoton = {
    btnAdministrador: ["admin"],
    btnResultados: ["admin", "juez"],
    btnRegistros: ["admin", "user"],
    btnBusquedaParejas: ["admin", "user"],
    btnModificarParejas: ["admin", "user"],
    btnParejas: ["admin", "user"],
    btnGenerarPDF: ["admin"],
    btnGenerarPDFCategorias: ["admin", "user"],
    btnGenerarPDFEstilos: ["admin", "user"],
    btnGenerarPDFResultados: ["admin", "juez"],
    btnGenerarPDFRegistros: ["admin"]
};

export async function configurarMenu(documento = document, api = window.api) {
    const controles = Object.entries(rolesPorBoton)
        .map(([id, roles]) => ({ boton: documento.getElementById(id), roles }))
        .filter(({ boton }) => boton);

    // Ocultar antes del await también permite recalcular un menú ya mostrado.
    // El HTML incluye estos atributos para proteger el primer pintado.
    for (const { boton } of controles) {
        boton.hidden = true;
        boton.disabled = true;
    }

    try {
        const rol = await api.getUserRole();
        for (const { boton, roles } of controles) {
            const permitido = roles.includes(rol);
            boton.hidden = !permitido;
            boton.disabled = !permitido;
        }
        const resultados = documento.getElementById("btnGenerarPDFResultados");
        if (resultados) resultados.textContent = rol === "juez" ? "Exportar mis evaluaciones" : "Exportar todas las evaluaciones";
    } catch (error) {
        // Sin respuesta verificable, las opciones privadas permanecen cerradas.
        console.error("No se pudieron verificar los permisos del menú:", error);
    }
}

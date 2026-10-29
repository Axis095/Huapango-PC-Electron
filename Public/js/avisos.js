const avisos = new WeakMap();
const confirmaciones = new WeakSet();
const operaciones = new WeakSet();

// Las búsquedas y las escrituras de una misma vista comparten este turno.
export function iniciarOperacion(documento = document) {
    if (operaciones.has(documento)) return null;
    operaciones.add(documento);
    let liberada = false;
    return () => {
        if (liberada) return;
        liberada = true;
        operaciones.delete(documento);
    };
}

// Actualizar texto no interrumpe el teclado ni crea ventanas nativas.
export function mostrarAviso(mensaje, documento = document) {
    let aviso = avisos.get(documento);
    if (!aviso || !aviso.contenedor.isConnected) {
        const contenedor = documento.createElement("section");
        contenedor.className = "aviso-aplicacion";
        const texto = documento.createElement("p");
        texto.setAttribute("role", "status");
        texto.setAttribute("aria-live", "polite");
        texto.setAttribute("aria-atomic", "true");
        const cerrar = documento.createElement("button");
        cerrar.type = "button";
        cerrar.textContent = "Ocultar aviso";
        cerrar.addEventListener("click", () => { contenedor.hidden = true; });
        contenedor.append(texto, cerrar);
        (documento.querySelector(".main-container") || documento.querySelector(".contenedor-principal") || documento.body).prepend(contenedor);
        aviso = { contenedor, texto };
        avisos.set(documento, aviso);
    }
    aviso.contenedor.hidden = false;
    aviso.texto.textContent = String(mensaje ?? "No se pudo completar la operación.");
}

// El diálogo pertenece al DOM. Solo el botón Eliminar confirma; Escape cancela.
export function confirmarEliminacion(mensaje, documento = document) {
    return confirmarAccion(mensaje, documento);
}

export function confirmarAccion(mensaje, documento = document, opciones = {}) {
    if (confirmaciones.has(documento)) return Promise.resolve(false);
    confirmaciones.add(documento);
    return new Promise(resolve => {
        const origen = documento.activeElement;
        const dialogo = documento.createElement("dialog");
        dialogo.className = "confirmacion-aplicacion";
        const titulo = documento.createElement("h2");
        titulo.id = "titulo-confirmacion-eliminacion";
        titulo.textContent = opciones.titulo || "Confirmar eliminación";
        const texto = documento.createElement("p");
        texto.id = "texto-confirmacion-eliminacion";
        texto.textContent = String(mensaje);
        dialogo.setAttribute("aria-labelledby", titulo.id);
        dialogo.setAttribute("aria-describedby", texto.id);
        const acciones = documento.createElement("div");
        acciones.className = "acciones-confirmacion";
        const cancelar = documento.createElement("button");
        cancelar.type = "button";
        cancelar.textContent = "Cancelar";
        cancelar.autofocus = true;
        const eliminar = documento.createElement("button");
        eliminar.type = "button";
        eliminar.className = opciones.neutra ? "" : "accion-peligrosa";
        eliminar.textContent = opciones.aceptar || "Eliminar";
        let resuelto = false;
        function terminar(aceptada) {
            if (resuelto) return;
            resuelto = true;
            documento.defaultView?.removeEventListener("pagehide", alSalir);
            dialogo.remove();
            confirmaciones.delete(documento);
            if (origen?.isConnected && !origen.disabled) origen.focus();
            resolve(aceptada);
        }
        const alSalir = () => terminar(false);
        cancelar.addEventListener("click", () => terminar(false));
        eliminar.addEventListener("click", () => terminar(true));
        dialogo.addEventListener("cancel", event => { event.preventDefault(); terminar(false); });
        dialogo.addEventListener("close", () => terminar(false));
        documento.defaultView?.addEventListener("pagehide", alSalir, { once: true });
        acciones.append(cancelar, eliminar);
        dialogo.append(titulo, texto, acciones);
        documento.body.append(dialogo);
        try { dialogo.showModal(); cancelar.focus(); }
        catch {
            terminar(false);
            mostrarAviso(opciones.error || "No se pudo abrir la confirmación. No se eliminó ningún registro.", documento);
        }
    });
}

// Mantener los datos de la operación estables hasta obtener su respuesta.
export async function ejecutarAccion(botonID, accion, documento = document) {
    const boton = documento.getElementById(botonID);
    if (boton?.disabled) return;
    const liberar = iniciarOperacion(documento);
    if (!liberar) return;
    const origen = documento.activeElement;
    const controles = [...documento.querySelectorAll("input, select, textarea, button")]
        .filter(control => !control.closest(".aviso-aplicacion"));
    const estados = controles.map(control => control.disabled);
    controles.forEach(control => { control.disabled = true; });
    mostrarAviso("Procesando…", documento);
    try { return await accion(); }
    catch { mostrarAviso("No se pudo completar la operación. Los datos del formulario se conservan; intenta nuevamente.", documento); }
    finally {
        controles.forEach((control, i) => { control.disabled = estados[i]; });
        liberar();
        if (origen?.isConnected && !origen.disabled) origen.focus();
    }
}

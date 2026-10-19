export function inicializarLogin(documento = document, api = window.api) {
    const boton = documento.getElementById("loginBtn");
    const usuario = documento.getElementById("username");
    const clave = documento.getElementById("password");
    const estado = documento.getElementById("errorMsg");
    const formulario = boton.form;
    let pendiente = false;
    let completado = false;
    estado.setAttribute("role", "status");
    estado.setAttribute("aria-live", "polite");
    if (documento.location && new URLSearchParams(documento.location.search).get("sesion") === "expirada") {
        estado.textContent = "Tu sesión terminó. Ingresa con la misma cuenta y rol para recuperar las ventanas y borradores. Si ingresas con otra cuenta o cambió tu rol, se cerrarán las ventanas anteriores. Cerrar este acceso termina la aplicación.";
    }
    const mostrarClave = documento.getElementById("show-password");
    mostrarClave?.addEventListener("change", () => {
        clave.type = mostrarClave.checked ? "text" : "password";
    });

    formulario.addEventListener("submit", async event => {
        event.preventDefault();
        if (pendiente || completado) return;
        const username = usuario.value.trim();
        const password = clave.value;
        if (!username || !password) {
            estado.textContent = "Completa el usuario y la contraseña.";
            (!username ? usuario : clave).focus();
            return;
        }

        pendiente = true;
        const origen = documento.activeElement;
        const controles = [boton, usuario, clave];
        const estados = controles.map(control => control.disabled);
        controles.forEach(control => { control.disabled = true; });
        estado.textContent = "Comprobando acceso…";
        try {
            const response = await api.invoke("login", { username, password });
            if (response?.success) {
                completado = true;
                estado.textContent = "Acceso correcto. Abriendo el sistema…";
            } else {
                estado.textContent = response?.message || response?.error || "No se pudo iniciar sesión. Intenta nuevamente.";
            }
        } catch {
            estado.textContent = "No se pudo comunicar con el sistema. Intenta nuevamente.";
        } finally {
            pendiente = false;
            if (!completado) {
                controles.forEach((control, i) => { control.disabled = estados[i]; });
                if (origen?.isConnected && !origen.disabled) origen.focus();
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => inicializarLogin());

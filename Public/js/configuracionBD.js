const formulario = document.getElementById("formConfiguracion");
const campos = document.getElementById("camposConfiguracion");
const estado = document.getElementById("estadoConfiguracion");
const continuar = document.getElementById("btnContinuarConfiguracion");
let ocupado = false;
let permisoDenegado = false;

function comprobarPermiso(respuesta) {
    if (respuesta?.code === "FORBIDDEN") {
        permisoDenegado = true;
        continuar.hidden = true;
    }
}

async function cargar() {
    try {
        const respuesta = await window.api.obtenerConfiguracion();
        comprobarPermiso(respuesta);
        const config = respuesta.data;
        if (config) {
            document.getElementById("HostBaseDatos").value = config.host;
            document.getElementById("PuertoBaseDatos").value = config.port;
            document.getElementById("UsuarioBaseDatos").value = config.user;
            document.getElementById("database").value = config.database;
        }
        const motivo = new URLSearchParams(window.location.search).get("motivo");
        estado.textContent = respuesta.error || motivo || "Completa los datos y comprueba la conexión.";
    } catch {
        estado.textContent = "No se pudo cargar la configuración. Puedes introducir los datos nuevamente.";
    } finally {
        campos.disabled = permisoDenegado;
    }
}

formulario.addEventListener("input", () => { continuar.hidden = true; });
formulario.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (ocupado || permisoDenegado) return;
    ocupado = true;
    campos.disabled = true;
    continuar.hidden = true;
    estado.textContent = "Comprobando la conexión con MySQL…";
    try {
        const respuesta = await window.api.guardarConfiguracion({
            host: document.getElementById("HostBaseDatos").value,
            port: document.getElementById("PuertoBaseDatos").value,
            user: document.getElementById("UsuarioBaseDatos").value,
            password: document.getElementById("ContrasenaBaseDatos").value,
            database: document.getElementById("database").value
        });
        comprobarPermiso(respuesta);
        estado.textContent = respuesta.success ? "Conexión comprobada y configuración guardada." : respuesta.error;
        continuar.hidden = !respuesta.success;
    } catch {
        estado.textContent = "No se pudo completar la operación. Intenta nuevamente.";
    } finally {
        ocupado = false;
        campos.disabled = permisoDenegado;
    }
});

continuar.addEventListener("click", async () => {
    if (ocupado || permisoDenegado) return;
    ocupado = true;
    campos.disabled = true;
    continuar.disabled = true;
    estado.textContent = "Abriendo el inicio de sesión…";
    try {
        const respuesta = await window.api.continuarConfiguracion();
        comprobarPermiso(respuesta);
        if (respuesta.success) window.close();
        else estado.textContent = respuesta.error;
    } catch {
        estado.textContent = "No se pudo abrir el inicio de sesión. Intenta nuevamente.";
    } finally {
        ocupado = false;
        campos.disabled = permisoDenegado;
        continuar.disabled = permisoDenegado;
    }
});

cargar();

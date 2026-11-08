export function esIDValido(id) {
    const texto = typeof id === "string" ? id.trim() : typeof id === "number" ? String(id) : "";
    return /^\d+$/.test(texto) && Number.isSafeInteger(Number(texto)) && Number(texto) > 0;
}

function exigirID(id, campo) {
    if (!esIDValido(id)) {
        throw Object.assign(new Error("Ingresa un ID entero y positivo, usando solo dígitos."), { campo });
    }
}

// Rechazar la inserción completa evita convertir accidentalmente «12a3» en «123».
// La validación al enviar sigue siendo obligatoria para valores restaurados o programáticos.
export function restringirEntradaID(input, avisar) {
    const comprobar = (event, texto) => {
        if (typeof texto === "string" && /[^0-9]/.test(texto)) {
            event.preventDefault();
            avisar("El ID solo admite dígitos del 0 al 9.");
        }
    };
    input.addEventListener("beforeinput", event => comprobar(event, event.data));
    input.addEventListener("paste", event => comprobar(event, event.clipboardData?.getData("text")));
}

// Validar los datos de una pareja
export function validarDatosPareja(datos) {

    exigirID(datos.nParejaID, "nParejaID");
    if (!datos.dNacimientoMasculino || !datos.nTelefonoMasculino || !datos.cNombreMasculino || !datos.cApellidoMasculino || !datos.cEmailMasculino) {
        throw new Error("Todos los campos del participante masculino deben estar llenos.");
    }
    if (!datos.dNacimientoFemenino || !datos.cNombreFemenino || !datos.nTelefonoFemenino || !datos.cApellidoFemenino || !datos.cEmailFemenino) {
        throw new Error("Todos los campos del participante femenino deben estar llenos.");
    }

    for (const lado of ["Masculino", "Femenino"]) {
        for (const prefijo of ["cNombre", "cApellido"]) {
            const campo = prefijo + lado;
            const nombre = typeof datos[campo] === "string" ? datos[campo].trim().normalize("NFC") : "";
            // Unicode clasifica el apóstrofo U+02BC como letra modificadora; excluirlo del mínimo.
            const letras = nombre.replace(/ʼ/g, "").match(/\p{L}/gu) || [];
            if (!/^[\p{L}\p{M} .’'ʼ‐‑-]+$/u.test(nombre) || letras.length < 2) {
                throw Object.assign(new Error("Cada nombre y apellido debe contener al menos dos letras; se permiten espacios, guiones y apóstrofos."),
                    { campo: (prefijo === "cNombre" ? "nombre" : "apellido") + lado });
            }
            datos[campo] = nombre;
        }
        if (typeof datos["cEmail" + lado] === "string") datos["cEmail" + lado] = datos["cEmail" + lado].trim().toLowerCase();
    }
    validarEmail(datos.cEmailMasculino);
    validarEmail(datos.cEmailFemenino);
    validarTelefono(datos.nTelefonoMasculino);
    validarTelefono(datos.nTelefonoFemenino);
    validarFecha(datos.dNacimientoMasculino);
    validarFecha(datos.dNacimientoFemenino);
}


// Validar los datos de una categoría
export function validarDatosCategoria(datos) {
    exigirID(datos.nIDCategoria, "nIDCategoria");
    exigirID(datos.nParejaID, "nParejaIDCategoria");
}

// Validar los datos de un estilo
export function validarDatosEstilo(datos) {
    exigirID(datos.nEstiloID, "nEstiloID");
    exigirID(datos.nParejaID, "nParejaIDEstilo");
}

// Validar el ID de la pareja para la búsqueda
export function validarIDPareja(id) {
    exigirID(id, "nParejaID");
}

// Validar el ID de la categoría para la búsqueda
export function validarIDCategoria(id) {
    exigirID(id, "nIDCategoria");
}

// Validar el ID del estilo para la búsqueda
export function validarIDEstilo(id) {
    exigirID(id, "nEstiloID");
}

// Validar los datos para modificar una pareja
export function validarDatosModificarPareja(datos) {
    exigirID(datos.nParejaID, "nParejaID");
    if (!datos.cNombre && !datos.cNombreM) {
        throw new Error("Debes ingresar al menos un nombre para actualizar.");
    }
    if (!datos.dNacimiento && !datos.dNacimientoM) {
        throw new Error("Debes ingresar al menos una fecha de nacimiento para actualizar.");
    }
    // Agrega más validaciones según sea necesario
}

export function validarDatosUsuario(datos) {
    exigirID(datos?.nUsuarioID, "nuevoID");
    if (typeof datos?.cNombreUsuario !== "string" || !datos.cNombreUsuario.trim()) {
        throw new Error("El campo 'Nombre de usuario' es obligatorio.");
    }
    if (datos.cNombreUsuario.trim().length < 3) {
        throw new Error("El nombre de usuario debe tener al menos 3 caracteres.");
    }
    if (!datos.cContrasena) {
        throw new Error("El campo 'Contraseña' es obligatorio.");
    }
}

export function validarDatosEliminarUsuario(datos) {
    // Permitir limpiar cuentas antiguas que no cumplen el mínimo de creación.
    if (typeof datos?.cNombreUsuario !== "string" || !datos.cNombreUsuario.trim()) {
        throw new Error("Ingresa el nombre de la cuenta que deseas eliminar.");
    }
}

export function validarDatosParejaResultados(parejaData) {
    if (!parejaData || Object.keys(parejaData).length === 0) {
        throw new Error("No se encontró información de la pareja.");
    }

    // Validar que nParejaID sea un número válido
    if (!esIDValido(parejaData.nParejaID)) {
        throw new Error("El ID de la pareja es inválido.");
    }

    return {
        nParejaID: parejaData.nParejaID,
        nombreParticipante1: parejaData.nombreParticipante1 || "--",
        nombreParticipante2: parejaData.nombreParticipante2 || "--",
        categoriaNombre: parejaData.categoriaNombre || "Sin categoría",
        estiloNombre: parejaData.estiloNombre || "Sin estilo"
    };
}


export function validarEvaluacion(datos) {
    const { nParejaID, nPuntaje, cComentario } = datos;

    // La identidad del evaluador se obtiene exclusivamente en el proceso principal.
    if (!esIDValido(nParejaID)) {
        return { success: false, error: "ID de la pareja inválido." };
    }

    // Se suman seis aspectos enteros de 0 a 10.
    if (!Number.isInteger(nPuntaje) || nPuntaje < 0 || nPuntaje > 60) {
        return { success: false, error: "Puntaje fuera del rango permitido (0 - 60)." };
    }

    // Validar comentarios (máximo 255 caracteres)
    if (cComentario.length > 255) {
        return { success: false, error: "El comentario es demasiado largo (máx. 255 caracteres)." };
    }

    return { success: true };
}




function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
        throw new Error(`El correo electrónico '${email}' no tiene un formato válido. Por favor ingrese un correo electrónico válido.`);
    }
}

function validarTelefono(telefono) {
    const regex = /^\+?[0-9]{1,3}[-\s]?[0-9]{8,15}$/;
    if (!regex.test(telefono)) {
        throw new Error(`El número de teléfono '${telefono}' no es válido. Por favor ingrese un número válido.`);
    }
}


function validarFecha(fecha) {
    const hoy = new Date();
    const fechaIngresada = new Date(fecha);
    if (fechaIngresada > hoy) {
        throw new Error(`La fecha '${fecha}' ingresada excede la fecha actual. Solo se permiten fechas iguales o anteriores al día de hoy.`);
    }
}

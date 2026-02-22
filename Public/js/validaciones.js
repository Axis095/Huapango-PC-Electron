// Validar los datos de una pareja
export function validarDatosPareja(datos) {
    console.log("🔎 Iniciando validación de pareja con datos:", datos);

    if (!datos.nParejaID) {
        throw new Error("El campo 'Número de pareja' es obligatorio.");
    }
    if (!datos.dNacimientoMasculino || !datos.nTelefonoMasculino || !datos.cNombreMasculino || !datos.cApellidoMasculino || !datos.cEmailMasculino) {
        console.error("❌ Error en datos masculinos:", datos);
        throw new Error("Todos los campos del participante masculino deben estar llenos.");
    }
    if (!datos.dNacimientoFemenino || !datos.cNombreFemenino || !datos.nTelefonoFemenino || !datos.cApellidoFemenino || !datos.cEmailFemenino) {
        console.error("❌ Error en datos femeninos:", datos);
        throw new Error("Todos los campos del participante femenino deben estar llenos.");
    }

    validarEmail(datos.cEmailMasculino);
    validarEmail(datos.cEmailFemenino);
    validarTelefono(datos.nTelefonoMasculino);
    validarTelefono(datos.nTelefonoFemenino);
    validarFecha(datos.dNacimientoMasculino);
    validarFecha(datos.dNacimientoFemenino);

    console.log("✅ Validaciones completadas correctamente.");
}


// Validar los datos de una categoría
export function validarDatosCategoria(datos) {
    if (!datos.nIDCategoria || !datos.nParejaID) {
        throw new Error("Los campos 'ID de la categoría' y 'ID de la pareja' deben estar llenos.");
    }
}

// Validar los datos de un estilo
export function validarDatosEstilo(datos) {
    if (!datos.nEstiloID || !datos.nParejaID) {
        throw new Error("Los campos 'ID del estilo' y 'ID de la pareja' son obligatorios.");
        
    }
}

// Validar el ID de la pareja para la búsqueda
export function validarIDPareja(id) {
    if (!id) {
        throw new Error("El campo 'ID de pareja' es obligatorio.");
    }
}

// Validar el ID de la categoría para la búsqueda
export function validarIDCategoria(id) {
    if (!id || isNaN(id) || id <= 0) {
        throw new Error("⚠️ El ID de la categoría es inválido.");
    }
}

// Validar el ID del estilo para la búsqueda
export function validarIDEstilo(id) {
    if (!id || isNaN(id) || id <= 0) {
        throw new Error("⚠️ El ID del estilo es inválido.");
    }
}

// Validar los datos para modificar una pareja
export function validarDatosModificarPareja(datos) {
    if (!datos.nParejaID) {
        throw new Error("El campo 'ID de pareja' es obligatorio.");
    }
    if (!datos.cNombre && !datos.cNombreM) {
        throw new Error("Debes ingresar al menos un nombre para actualizar.");
    }
    if (!datos.dNacimiento && !datos.dNacimientoM) {
        throw new Error("Debes ingresar al menos una fecha de nacimiento para actualizar.");
    }
    // Agrega más validaciones según sea necesario
}

export function validarDatosUsuario(datos) {
    if (!datos.cNombreUsuario) {
        throw new Error("El campo 'Nombre de usuario' es obligatorio.");
    }
    if (!datos.cContrasena) {
        throw new Error("El campo 'Contraseña' es obligatorio.");
    }
}

export function validarDatosEliminarUsuario(datos) {
    if (!datos.cNombreUsuario || datos.cNombreUsuario.length < 3) {
        throw new Error("❌ El nombre de usuario debe tener al menos 3 caracteres.");
    }
}

export function validarDatosParejaResultados(parejaData) {
    if (!parejaData || Object.keys(parejaData).length === 0) {
        throw new Error("⚠️ No se encontró información de la pareja.");
    }

    // Validar que nParejaID sea un número válido
    if (!parejaData.nParejaID || isNaN(Number(parejaData.nParejaID))) {
        throw new Error("⚠️ El ID de la pareja es inválido.");
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
    const { nJuezID, nParejaID, nPuntaje, cComentario } = datos;

    // 🔹 Validar ID del juez y pareja (deben ser números positivos)
    if (!nJuezID || isNaN(nJuezID) || nJuezID <= 0) {
        return { success: false, error: "ID del juez inválido." };
    }
    if (!nParejaID || isNaN(nParejaID) || nParejaID <= 0) {
        return { success: false, error: "ID de la pareja inválido." };
    }

    // 🔹 Validar puntaje (debe estar entre 0 y 50)
    if (isNaN(nPuntaje) || nPuntaje < 0 || nPuntaje > 60) {
        return { success: false, error: "Puntaje fuera del rango permitido (0 - 60)." };
    }

    // 🔹 Validar comentarios (máximo 255 caracteres)
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
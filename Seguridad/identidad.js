const roles = Object.freeze(["admin", "user", "juez"]);

// La instalación existente usa VARCHAR(50). No convertir "006" en 6.
function idUsuario(valor) {
    if (typeof valor === "number") {
        if (Number.isSafeInteger(valor) && valor > 0) return valor;
    } else if (typeof valor === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,49}$/.test(valor) && !/^0+$/.test(valor)) {
        return valor;
    }
    throw Object.assign(new Error("El ID del usuario debe contener de 1 a 50 letras, números, guiones o guiones bajos; no puede ser cero."), { code: "INVALID_DATA" });
}

function nombreUsuario(valor, minimo = 1) {
    if (typeof valor !== "string" || !valor.trim()) throw Object.assign(new Error("El campo 'Nombre de usuario' es obligatorio."), { code: "INVALID_DATA" });
    const nombre = valor.trim();
    if (nombre.length < minimo) throw Object.assign(new Error("El nombre de usuario debe tener al menos 3 caracteres."), { code: "INVALID_DATA" });
    if (nombre.length > 100 || /[\u0000-\u001f\u007f]/.test(nombre)) throw Object.assign(new Error("El nombre de usuario debe contener hasta 100 caracteres y no incluir controles."), { code: "INVALID_DATA" });
    return nombre;
}

module.exports = { idUsuario, nombreUsuario, roles };

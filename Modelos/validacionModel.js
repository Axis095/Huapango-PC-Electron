function validarID(id) {
    const texto = typeof id === "string" ? id.trim() : typeof id === "number" ? String(id) : "";
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) <= 0) {
        throw Object.assign(new Error("Ingresa un ID entero y positivo, usando solo dígitos."), { code: "INVALID_ID" });
    }
    return Number(texto);
}

module.exports = { validarID };

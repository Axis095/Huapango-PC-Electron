const { AsyncLocalStorage } = require("node:async_hooks");

// Una operación abarca todo el handler, incluidos archivos previos/posteriores al
// SQL. Cambiar el pool solo entre consultas no protege la limpieza de fotos.
const contextoCambio = new AsyncLocalStorage();
let operaciones = 0;
let cambio = null;

function ocupado() {
    return Object.assign(new Error("Espera a que terminen las operaciones o la configuración en curso antes de cambiar la conexión."),
        { code: "CONFIGURATION_BUSY" });
}

function ejecutarOperacion(operacion) {
    if (cambio) throw ocupado();
    operaciones++;
    try {
        const resultado = operacion();
        if (resultado && typeof resultado.then === "function") {
            return Promise.resolve(resultado).finally(() => { operaciones--; });
        }
        operaciones--;
        return resultado;
    } catch (error) {
        operaciones--;
        throw error;
    }
}

async function ejecutarCambioConfiguracion(operacion) {
    // main reserva todo el cambio; db vuelve a comprobarlo para proteger también
    // llamadas internas. Solo la misma cadena asíncrona puede reutilizarlo.
    if (cambio && contextoCambio.getStore() === cambio) return operacion();
    if (cambio || operaciones) throw ocupado();
    const reserva = {};
    cambio = reserva;
    try { return await contextoCambio.run(reserva, operacion); }
    finally { cambio = null; }
}

// Solo se invoca desde un handler ya reservado con ejecutarOperacion. La
// revalidación SQL terminó; no se permiten otras operaciones durante el cierre.
async function ejecutarCierreSesion(operacion) {
    if (cambio || operaciones !== 1) throw ocupado();
    const reserva = {};
    cambio = reserva;
    try { return await operacion(); }
    finally { cambio = null; }
}

module.exports = { ejecutarOperacion, ejecutarCambioConfiguracion, ejecutarCierreSesion };

const { BrowserWindow } = require("electron");
const path = require("path");

let ventanaEmergente = null;

function abrirVentanaEmergente() {
    if (ventanaEmergente) {
        console.log("⚠️ Ya hay una ventana emergente abierta.");
        return;
    }

    ventanaEmergente = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "../preload.js"),
        },
    });

    ventanaEmergente.loadFile(path.join(__dirname, "../Vistas/configuracionBD.html"));

    ventanaEmergente.on("closed", () => {
        ventanaEmergente = null;
    });
}

module.exports = { abrirVentanaEmergente };

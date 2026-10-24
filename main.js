// Importaciones y dependencias
const { app, BrowserWindow, ipcMain, Menu, dialog, shell, contextBridge } = require("electron");
const path = require("path");
const { inicializarBaseDatos } = require("./db");
const { obtenerSesion, cerrarSesion, obtenerClaveSesion } = require("./Modelos/sesionModel");
const sesionesDeVentana = new WeakMap();
const { requiereConfiguracionInicial } = require("./Modelos/configModel");
const { fileURLToPath } = require("url");
const PDFDocument = require('pdfkit'); // Importación de libreria para creación de PDF's
const fs = require('fs'); // Importación de una dependencia de la libreria para el sistema de archivos 
const { type } = require("os");
//LAS EXPORTACIONES DE LOS CONTROLADORES SON LAS MÁS IMPORTANTES DEL MOMENTO
const { handleLogin } = require("./Controladores/authController");
const { handleRegistrarPareja, handleBuscarParejaPorID, handleBuscarParejaParaEvaluacion, handleBuscarTodasLasParejas, handleActualizarPareja } = require("./Controladores/parejaController");
const { handleRegistrarCategoria, handleActualizarCategoria, handleEliminarCategoria, handleBuscarCategoriaPorID } = require("./Controladores/categoriaController");
const { handleRegistrarEstilo, handleActualizarEstilo, handleEliminarEstilo, handleBuscarEstiloPorID } = require("./Controladores/estiloController");
const { handleCrearUsuario, handleEliminarUsuario, handleEliminarPareja, handleObtenerRolUsuario } = require("./Controladores/adminController");
const { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja } = require("./Controladores/evaluacionesController");
const { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias, handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales } = require("./Controladores/pdfController");
const { handleGuardarConfiguracion, handleObtenerConfiguracion } = require("./Controladores/configController");


const { obtenerBorradorRegistro, guardarBorradorRegistro, limpiarBorradorRegistro } = require("./Controladores/borradorRegistroController");
ipcMain.handle("obtener-borrador-registro", desdeVentanaDeSesion(obtenerBorradorRegistro));
ipcMain.handle("guardar-borrador-registro", desdeVentanaDeSesion(guardarBorradorRegistro));
ipcMain.handle("limpiar-borrador-registro", desdeVentanaDeSesion(limpiarBorradorRegistro));
const { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion } = require("./Controladores/borradorModificacionController");
ipcMain.handle("obtener-borrador-modificacion", desdeVentanaDeSesion(obtenerBorradorModificacion));
ipcMain.handle("guardar-borrador-modificacion", desdeVentanaDeSesion(guardarBorradorModificacion));
ipcMain.handle("limpiar-borrador-modificacion", desdeVentanaDeSesion(limpiarBorradorModificacion));

// MENSAJE GENERAL ELIMINAR POR FAVOR TODO EL CÓDIGO BASURA QUE NO SE UTILIZA, IGUAL LOS COMENTARIOS SOLO DEJAR LO QUE SEA DE UTILIDAD, IGUAL CON LAS LIBRERIAS QUE NO SE USAN

// Escuchar el evento de login y pasar createMainWindow como argumento
let autenticacionEnCurso = false;
ipcMain.handle("login", async (event, credentials) => {
    if (autenticacionEnCurso || operacionConfiguracion) return { success: false, code: "BUSY", message: "Espera a que termine la operación actual." };
    if (!loginPermitido(event)) return accesoDenegado();
    autenticacionEnCurso = true;
    try {
        return await handleLogin(event, credentials, createMainWindow, () => loginPermitido(event));
    } finally {
        autenticacionEnCurso = false;
        actualizarMenuConfiguracion();
    }
});
// Conectar el evento IPC con el controlador
ipcMain.handle("registrar-pareja", desdeVentanaDeSesion(conPermisosRegistro(handleRegistrarPareja, ["Registros.html"])));
ipcMain.handle("buscar-pareja-por-id", desdeVentanaDeSesion(conPermisosRegistro(handleBuscarParejaPorID, ["BusquedaParejas.html", "ModificarParejas.html"])));
ipcMain.handle("buscar-pareja-para-evaluacion", desdeVentanaDeSesion(conPermisosRegistro(handleBuscarParejaParaEvaluacion, ["Resultados.html"], ["admin", "juez"])));
// ipcMain.handle("actualizar-pareja", handleActualizarPareja);
//     console.log("Enviando solicitud de actualización con datos DESDE MAIN.JS:", datos);
//     return handleActualizarPareja(event, datos);
// });
ipcMain.handle("actualizar-pareja-completa", desdeVentanaDeSesion(conPermisosRegistro(handleActualizarPareja, ["BusquedaParejas.html", "ModificarParejas.html"])));
ipcMain.handle("buscar-todas-las-parejas", desdeVentanaDeSesion(conPermisosRegistro(handleBuscarTodasLasParejas, ["BusquedaParejas.html", "ModificarParejas.html"])));
ipcMain.handle("registrar-categoria", desdeVentanaDeSesion(conPermisosRegistro(handleRegistrarCategoria)));
ipcMain.handle("buscar-categoria-por-id", desdeVentanaDeSesion(conPermisosRegistro(handleBuscarCategoriaPorID, ["BusquedaParejas.html", "ModificarParejas.html"])));
ipcMain.handle("actualizar-categoria", desdeVentanaDeSesion(conPermisosRegistro(handleActualizarCategoria)));
ipcMain.handle("eliminar-categoria", desdeVentanaDeSesion(conPermisosRegistro(handleEliminarCategoria, undefined, ["admin"])));
// Conectar los eventos IPC con los controladores
ipcMain.handle("crear-usuario", desdeVentanaDeSesion(soloAdministrador(handleCrearUsuario)));
ipcMain.handle("eliminar-usuario", desdeVentanaDeSesion(soloAdministrador(handleEliminarUsuario)));
ipcMain.handle("eliminar-pareja", desdeVentanaDeSesion(soloAdministrador(handleEliminarPareja)));
ipcMain.handle("obtener-rol-usuario", desdeVentanaDeSesion(soloAdministrador(handleObtenerRolUsuario)));
// Conectar los eventos IPC con los controladores
ipcMain.handle("registrar-estilo", desdeVentanaDeSesion(conPermisosRegistro(handleRegistrarEstilo)));
ipcMain.handle("buscar-estilo-por-id", desdeVentanaDeSesion(conPermisosRegistro(handleBuscarEstiloPorID, ["BusquedaParejas.html", "ModificarParejas.html"])));
ipcMain.handle("actualizar-estilo", desdeVentanaDeSesion(conPermisosRegistro(handleActualizarEstilo)));
ipcMain.handle("eliminar-estilo", desdeVentanaDeSesion(conPermisosRegistro(handleEliminarEstilo, undefined, ["admin"])));
// Conectar el evento IPC para generar el PDF
ipcMain.handle("generar-pdf-parejas", exportacionDeSesion(handleGenerarPDFParejas));
ipcMain.handle("generar-pdf-resultados", exportacionDeSesion(handleGenerarPDFResultados));
ipcMain.handle("generar-pdf-categorias", exportacionDeSesion(handleGenerarPDFCategorias));
ipcMain.handle("generar-pdf-estilos", exportacionDeSesion(handleGenerarPDFEstilos));
ipcMain.handle("generar-pdf-registros-generales", exportacionDeSesion(handleGenerarPDFRegistrosGenerales));
// El controlador valida sesión, rol, origen e identidad antes de registrar.
ipcMain.handle("registrar-evaluacion", desdeVentanaDeSesion(handleRegistrarEvaluacion));
ipcMain.handle("obtener-evaluaciones-por-pareja", desdeVentanaDeSesion(handleObtenerEvaluacionesPorPareja));
// Conectar el evento para guardar la configuración del archivo JSON dinamico.
ipcMain.handle("obtener-configuracion", desdeConfiguracion(handleObtenerConfiguracion));
ipcMain.handle("guardar-configuracion", desdeConfiguracion((event, datos) => {
    const identidad = obtenerClaveSesion();
    return handleGuardarConfiguracion(event, datos, () =>
        configuracionPermitida(event) && obtenerClaveSesion() === identidad);
}, true));
ipcMain.handle("continuar-configuracion", desdeConfiguracion(async (event) => {
    if (continuandoConfiguracion) return { success: false, error: "Espera a que termine la conexión." };
    continuandoConfiguracion = true;
    try {
        const identidad = obtenerClaveSesion();
        await inicializarBaseDatos(() => configuracionPermitida(event) &&
            obtenerClaveSesion() === identidad);
        configuracionInicialPermitida = false;
        cerrarSesion();
        global.userRole = "guest";
        actualizarMenuConfiguracion();
        const origen = BrowserWindow.fromWebContents(event.sender);
        if (!global.loginWindow || global.loginWindow.isDestroyed()) await createLoginWindow();
        else global.loginWindow.focus();
        for (const ventana of BrowserWindow.getAllWindows()) {
            if (ventana !== origen && ventana !== global.loginWindow) ventana.close();
        }
        return { success: true };
    } catch (error) {
        return { success: false, code: error.code, error: error.message };
    } finally {
        continuandoConfiguracion = false;
    }
}, true));
// Conectar el evento IPC para abrir la ventana de configuración
ipcMain.on("abrir-ventana-emergente", (event) => {
    if (esVentanaPrincipalLocal(event)) abrirConfiguracion();
});



// Autorizar en el proceso principal antes de invocar cualquier consulta.
// El rol del formulario describe la cuenta destino, nunca al solicitante.
function soloAdministrador(controlador) {
    return (event, ...args) => {
        let autorizado = false;
        try {
            const sesion = obtenerSesion();
            autorizado = sesion?.userRole === "admin" &&
                Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
                !!event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
                path.resolve(fileURLToPath(event.senderFrame.url)) ===
                    path.join(__dirname, "Vistas", "Administrador.html");
        } catch {
            // Un emisor ausente, no local o inválido nunca obtiene permisos.
        }
        if (!autorizado) {
            const mensaje = "No tienes permisos para esta operación. Se requiere una sesión de administrador desde la pantalla de Administración.";
            return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
        }
        return controlador(event, ...args);
    };
}

// Los permisos pertenecen a la sesión del proceso principal, nunca al formulario.
// Las vistas antiguas de categorías/estilos conservan el mismo control de acceso.
function conPermisosRegistro(controlador,
    vistas = ["Registros.html", "RegistroCategoriasEstilos.html", "Parejas.html"],
    roles = ["admin", "user"]) {
    return (event, ...args) => {
        let autorizado = false;
        try {
            const sesion = obtenerSesion();
            autorizado = !!sesion && roles.includes(sesion.userRole) &&
                Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
                !!event?.senderFrame && event.senderFrame === event.sender.mainFrame &&
                vistas.some(vista => path.resolve(fileURLToPath(event.senderFrame.url)) ===
                    path.join(__dirname, "Vistas", vista));
        } catch {
            // Rechazar emisores ausentes, remotos o inválidos.
        }
        if (!autorizado) {
            const requisito = roles.includes("user") ? "usuario o administrador" :
                roles.includes("juez") ? "juez o administrador" : "administrador";
            const mensaje = `No tienes permisos para esta operación. Se requiere una sesión de ${requisito} desde la pantalla de gestión correspondiente.`;
            return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
        }
        return controlador(event, ...args);
    };
}

function createLoginWindow() {
    global.loginWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    return global.loginWindow.loadFile(path.join(__dirname, "Vistas", "login.html"));

}

function createMainWindow() {
    actualizarMenuConfiguracion();
    global.mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            spellcheck: false, // Desactiva el corrector ortográfico
        },
    });

    sesionesDeVentana.set(global.mainWindow.webContents, obtenerClaveSesion());
    global.mainWindow.maximize();
    // global.mainWindow.loadFile("Vistas/index.html");
    const nueva = global.mainWindow;
    const carga = nueva.loadFile(path.join(__dirname, "Vistas", "MenuPrincipal.html"));


    // Asegúrate de que este evento se registre después de que la ventana haya sido creada
    nueva.webContents.once("did-finish-load", () => {
        const sesion = sesionConsultable({ sender: nueva.webContents, senderFrame: nueva.webContents.mainFrame });
        nueva.webContents.send("set-role", sesion?.userRole || "guest");
    });
    global.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => { // CODIGO QUE HAY QUE BORRAR
        if (errorDescription.includes("Autofill.enable") || errorDescription.includes("Autofill.setAddresses")) {
            console.warn("Error de Autofill ignorado:", errorDescription);
        }
    });

    console.log("Ventana principal creada.");
    // La nueva ventana ya existe antes de cerrar las de sesiones anteriores.
    for (const ventana of BrowserWindow.getAllWindows()) {
        if (ventana !== nueva && ventana !== global.loginWindow &&
            sesionesDeVentana.get(ventana.webContents) !== obtenerClaveSesion()) ventana.close();
    }
    return carga;
}


// Función para abrir nuevas ventanas genéricas
let ventanaEmergente = null; // VARIABLE GLOBAL PARA CONTROLAR LA VENTANA EMERGENTE
function openNewWindow(tipo, file) {
    if (!file || typeof file !== "string") {
        dialog.showErrorBox("Error", "No se especificó el archivo a abrir en la ventana emergente.");
        return;
    }
    if (ventanaEmergente) {
        dialog.showMessageBoxSync({
            type: "warning",
            title: "Advertencia",
            message: "Ya hay una ventana emergente abierta. Cierra la actual antes de abrir otra.",
            buttons: ["OK"],
        });
        return;
    }
    ventanaEmergente = new BrowserWindow({
        width: 800,
        height: 600,
        modal: tipo !== "consulta", // Solo bloquea si NO es consulta
        parent: tipo !== "consulta" ? BrowserWindow.getFocusedWindow() : null,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    
    sesionesDeVentana.set(ventanaEmergente.webContents, obtenerClaveSesion());
    const filePath = path.join(__dirname, "Vistas", file);
    // Agregar parámetro de query SOLO para `BusquedaParejas.html`
    if (file === "BusquedaParejas.html" || file === "ModificarParejas.html") {
        ventanaEmergente.loadFile(filePath, { query: { emergente: "1" } })
            .catch(err => {
                console.error("Error al cargar el archivo:", err);
                if (ventanaEmergente) {
                    ventanaEmergente.close();
                    ventanaEmergente = null;
                }
            });
    } else {
        ventanaEmergente.loadFile(filePath)
            .catch(err => {
                console.error("Error al cargar el archivo:", err);
                if (ventanaEmergente) {
                    ventanaEmergente.close();
                    ventanaEmergente = null;
                }
            });
    }

    ventanaEmergente.on("closed", () => {
        ventanaEmergente = null;
    });
}

// Menú principal
const templateMenu = [
    {
        label: "Archivo",
        submenu: [
            // {
            //     label: "Nuevo Registro",
            //     accelerator: "Ctrl+N",
            //     click() {
            //         console.log("Nuevo registro seleccionado");
            //         openNewWindow("Sections/Registros.html");
            //     },
            // },
            // {
            //     label: "Abrir",
            //     accelerator: "Ctrl+O",
            //     click() {
            //         console.log("Abrir archivo seleccionado");
            //         // Aquí puedes implementar una función para abrir archivos
            //     },
            // },
            // {
            //     label: "Generar PDF de parejas",
            //     accelerator: "Ctrl+P",
            //     click() {
            //         const ventana = BrowserWindow.getFocusedWindow();
            //         if (ventana) {
            //             ventana.webContents.send("generar-pdf"); // Envía el evento al render
            //         }
            //     },
            // },
            { type: "separator" },
            {
                label: "Salir",
                accelerator: "Ctrl+Q",
                click() {
                    app.quit();
                },
            },
        ],
    },
    // {
    //     label: "Editar",
    //     submenu: [
    //         {
    //             label: "Modificar Pareja",
    //             accelerator: "Ctrl+M",
    //             click() {
    //                 console.log("Modificar pareja seleccionado");
    //                 openNewWindow("Sections/ModificarParejas.html");
    //             },
    //         },
    //     ],
    // },
    {
        label: "Ver",
        submenu: [
            {
                label: "Recargar",
                accelerator: "Ctrl+R",
                click(item, zoomVentana) {
                    if (zoomVentana) zoomVentana.reload();
                },
            },
            {
                label: "Forzar Recarga",
                accelerator: "Shift+Ctrl+R",
                click(item, zoomVentana) {
                    if (zoomVentana) zoomVentana.webContents.reloadIgnoringCache();
                },
            },
            { type: "separator" },
            {
                label: "Abrir Herramientas de Desarrollo",
                accelerator: "Ctrl+Shift+I",
                click(item, zoomVentana) {
                    if (zoomVentana) zoomVentana.webContents.openDevTools();
                },
            },
        ],
    },
    {
        label: "Zoom",
        submenu: [
            {
                label: "Aumentar Zoom",
                accelerator: "Ctrl+=",
                click(item, zoomVentana) {
                    if (zoomVentana) {
                        const currentZoom = zoomVentana.webContents.getZoomFactor();
                        const newZoom = Math.min(currentZoom + 0.1, 2.0);
                        zoomVentana.webContents.setZoomFactor(newZoom);
                        console.log("Zoom aumentado:", newZoom);
                    }
                },
            },
            {
                label: "Disminuir Zoom",
                accelerator: "Ctrl+-",
                click(item, zoomVentana) {
                    if (zoomVentana) {
                        const currentZoom = zoomVentana.webContents.getZoomFactor();
                        const newZoom = Math.max(currentZoom - 0.1, 0.8);
                        zoomVentana.webContents.setZoomFactor(newZoom);
                        console.log("Zoom reducido:", newZoom);
                    }
                },
            },
            {
                label: "Restablecer Zoom",
                accelerator: "Ctrl+0",
                click(item, zoomVentana) {
                    if (zoomVentana) {
                        zoomVentana.webContents.setZoomFactor(1);
                        console.log("Zoom restablecido a 100%");
                    }
                },
            },
        ],
    },
    {
        label: "Ayuda",
        submenu: [
            {
                label: "Configuración",
                submenu: [
                    { id: "configuracion-mysql", label: "Base de Datos", enabled: false, click() { abrirConfiguracion(); } }
                ]
            },
        ],
    },
];

// Solo la ventana local de configuración puede consultar o modificar la conexión.
let configWindow = null;
let continuandoConfiguracion = false;
let configuracionInicialPermitida = false;
let operacionConfiguracion = false;

function puedeConfigurar() {
    const sesion = obtenerSesion();
    return (configuracionInicialPermitida && !sesion) ||
        (sesion?.userRole === "admin" && Number.isSafeInteger(sesion.userID) && sesion.userID > 0);
}

function configuracionPermitida(event) {
    try {
        return puedeConfigurar() && configWindow && !configWindow.isDestroyed() &&
            sesionesDeVentana.has(event?.sender) &&
            sesionesDeVentana.get(event.sender) === obtenerClaveSesion() &&
            event?.sender === configWindow.webContents &&
            !!event.senderFrame && event.senderFrame === event.sender.mainFrame &&
            path.resolve(fileURLToPath(event.senderFrame.url)) === path.join(__dirname, "Vistas", "configuracionBD.html");
    } catch { return false; }
}

function esVentanaPrincipalLocal(event) {
    try {
        const archivo = path.resolve(fileURLToPath(event.senderFrame.url));
        return !!sesionConsultable(event) && event.sender === global.mainWindow?.webContents &&
            event.senderFrame === event.sender.mainFrame &&
            path.dirname(archivo) === path.join(__dirname, "Vistas") &&
            ["MenuPrincipal.html", "Administrador.html", "Registros.html", "Resultados.html",
                "BusquedaParejas.html", "ModificarParejas.html", "RegistroCategoriasEstilos.html",
                "Parejas.html", "index.html"].includes(path.basename(archivo));
    } catch { return false; }
}

function actualizarMenuConfiguracion() {
    const ayuda = templateMenu.find(item => item.label === "Ayuda");
    ayuda.submenu[0].submenu[0].enabled = puedeConfigurar();
    Menu.setApplicationMenu(Menu.buildFromTemplate(templateMenu));
}

function desdeConfiguracion(handler, modifica = false) {
    return async (event, ...args) => {
        if (!configuracionPermitida(event)) {
            return { success: false, code: "FORBIDDEN", error: "La configuración requiere una sesión de administrador y la ventana de configuración autorizada." };
        }
        if (modifica && (operacionConfiguracion || autenticacionEnCurso)) {
            return { success: false, code: "BUSY", error: "Espera a que termine la operación de configuración actual." };
        }
        if (modifica) operacionConfiguracion = true;
        try { return await handler(event, ...args); }
        finally { if (modifica) operacionConfiguracion = false; }
    };
}

function abrirConfiguracion(motivo = "") {
    if (!puedeConfigurar()) return;
    if (configWindow && !configWindow.isDestroyed()) {
        configWindow.focus();
        return;
    }
    configWindow = new BrowserWindow({
        width: 680, height: 760, minWidth: 500, minHeight: 650,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false, contextIsolation: true
        }
    });
    sesionesDeVentana.set(configWindow.webContents, obtenerClaveSesion());
    configWindow.on("closed", () => { configWindow = null; });
    configWindow.loadFile(path.join(__dirname, "Vistas", "configuracionBD.html"), { query: { motivo } })
        .catch(() => {
            dialog.showErrorBox("Error de inicio", "No se pudo abrir la pantalla de configuración.");
            app.quit();
        });
}

app.whenReady().then(async () => {
    configuracionInicialPermitida = requiereConfiguracionInicial();
    actualizarMenuConfiguracion();
    if (configuracionInicialPermitida) {
        abrirConfiguracion("Completa los datos para configurar MySQL por primera vez.");
        return;
    }
    try {
        await inicializarBaseDatos();
        await createLoginWindow();
    } catch (error) {
        dialog.showErrorBox("No se pudo iniciar la conexión",
            error.message + "\nEsta instalación ya tiene configuración. Restablece MySQL o recupera una copia válida y reinicia. Los cambios desde la aplicación requieren una sesión de administrador.");
        app.quit();
    }
}).catch(() => {
    dialog.showErrorBox("Error de inicio", "No se pudo iniciar la aplicación.");
    app.quit();
});
app.on("window-all-closed", () => { app.quit(); });



// Solo la ventana principal y las emergentes de esta sesión pueden leer su identidad.
function sesionConsultable(event) {
    try {
        const sesion = obtenerSesion();
        const clave = obtenerClaveSesion();
        const ventana = BrowserWindow.fromWebContents(event.sender);
        const archivo = path.resolve(fileURLToPath(event.senderFrame.url));
        if (clave && sesionesDeVentana.get(event.sender) === clave &&
            ["admin", "user", "juez"].includes(sesion?.userRole) &&
            Number.isSafeInteger(sesion.userID) && sesion.userID > 0 &&
            ventana && !ventana.isDestroyed() && ventana.webContents === event.sender &&
            event.senderFrame === event.sender.mainFrame &&
            path.dirname(archivo) === path.join(__dirname, "Vistas") &&
            ["MenuPrincipal.html", "Administrador.html", "AdministradorInactivado.html",
                "Registros.html", "Resultados.html", "BusquedaParejas.html", "ModificarParejas.html",
                "RegistroCategoriasEstilos.html", "Parejas.html", "index.html"].includes(path.basename(archivo))) return sesion;
    } catch { /* Emisor ausente, ajeno o destruido: no revelar la sesión. */ }
    return null;
}

function desdeVentanaDeSesion(controlador) {
    return (event, ...args) => {
        if (!sesionConsultable(event)) return accesoDenegado();
        const clave = obtenerClaveSesion();
        const resultado = controlador(event, ...args);
        // No entregar resultados de una consulta pendiente a una sesión posterior.
        const vigente = () => clave === obtenerClaveSesion() && !!sesionConsultable(event);
        if (resultado && typeof resultado.then === "function") {
            return resultado.then(valor => vigente() ? valor : accesoDenegado());
        }
        return vigente() ? resultado : accesoDenegado();
    };
}

function accesoDenegado() {
    const mensaje = "Esta ventana no está autorizada para la sesión actual. Abre el módulo desde la ventana de tu cuenta con el rol correspondiente (usuario, juez o administrador).";
    return { success: false, code: "FORBIDDEN", error: mensaje, message: mensaje };
}

function exportacionDeSesion(controlador) {
    return desdeVentanaDeSesion(event => {
        const clave = obtenerClaveSesion();
        // No reenviar argumentos IPC como comprobaciones internas de autorización.
        return controlador(event, () => clave === obtenerClaveSesion() && !!sesionConsultable(event));
    });
}

function loginPermitido(event) {
    try {
        return !obtenerSesion() && !configuracionInicialPermitida && !operacionConfiguracion &&
            global.loginWindow && !global.loginWindow.isDestroyed() &&
            event?.sender === global.loginWindow.webContents &&
            !!event.senderFrame && event.senderFrame === event.sender.mainFrame &&
            path.resolve(fileURLToPath(event.senderFrame.url)) === path.join(__dirname, "Vistas", "login.html");
    } catch { return false; }
}

// Se conservan los tipos que espera el menú: guest/null ante falta de autorización.
ipcMain.handle("get-role", event => sesionConsultable(event)?.userRole || "guest");
ipcMain.handle("get-usuario-id", event => sesionConsultable(event)?.userID ?? null);

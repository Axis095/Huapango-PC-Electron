// Importaciones y dependencias
const { app, BrowserWindow, ipcMain, Menu, dialog, shell, contextBridge } = require("electron");
const path = require("path");
const { inicializarBaseDatos } = require("./db");
const { obtenerSesion, cerrarSesion } = require("./Modelos/sesionModel");
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
const { handleGuardarImagenBuffer, handleGuardarImagen } = require("./Controladores/imagenesController");


const { obtenerBorradorRegistro, guardarBorradorRegistro, limpiarBorradorRegistro } = require("./Controladores/borradorRegistroController");
ipcMain.handle("obtener-borrador-registro", obtenerBorradorRegistro);
ipcMain.handle("guardar-borrador-registro", guardarBorradorRegistro);
ipcMain.handle("limpiar-borrador-registro", limpiarBorradorRegistro);
const { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion } = require("./Controladores/borradorModificacionController");
ipcMain.handle("obtener-borrador-modificacion", obtenerBorradorModificacion);
ipcMain.handle("guardar-borrador-modificacion", guardarBorradorModificacion);
ipcMain.handle("limpiar-borrador-modificacion", limpiarBorradorModificacion);

// MENSAJE GENERAL ELIMINAR POR FAVOR TODO EL CÓDIGO BASURA QUE NO SE UTILIZA, IGUAL LOS COMENTARIOS SOLO DEJAR LO QUE SEA DE UTILIDAD, IGUAL CON LAS LIBRERIAS QUE NO SE USAN

// Middleware de autorización IPC
function requiereRol(rolesPermitidos, handler) {
    return (event, ...args) => {
        const sesion = obtenerSesion();
        if (!sesion || !rolesPermitidos.includes(sesion.userRole)) {
            console.warn(`[Seguridad] Bloqueado: intento de acceso restringido. Rol actual: ${sesion?.userRole}`);
            return { success: false, error: "No tienes permiso para realizar esta acción." };
        }
        return handler(event, ...args);
    };
}

// Escuchar el evento de login y pasar createMainWindow como argumento
ipcMain.handle("login", (event, credentials) => handleLogin(event, credentials, createMainWindow));
// Conectar el evento IPC con el controlador
ipcMain.handle("registrar-pareja", requiereRol(["admin", "user"], handleRegistrarPareja));
ipcMain.handle("buscar-pareja-por-id", handleBuscarParejaPorID);
ipcMain.handle("buscar-pareja-para-evaluacion", handleBuscarParejaParaEvaluacion);
// ipcMain.handle("actualizar-pareja", handleActualizarPareja);
//     console.log("Enviando solicitud de actualización con datos DESDE MAIN.JS:", datos);
//     return handleActualizarPareja(event, datos);
// });
ipcMain.handle("actualizar-pareja-completa", requiereRol(["admin", "user"], handleActualizarPareja));
ipcMain.handle("buscar-todas-las-parejas", handleBuscarTodasLasParejas);
ipcMain.handle("registrar-categoria", requiereRol(["admin"], handleRegistrarCategoria));
ipcMain.handle("buscar-categoria-por-id", handleBuscarCategoriaPorID);
ipcMain.handle("actualizar-categoria", requiereRol(["admin"], handleActualizarCategoria));
ipcMain.handle("eliminar-categoria", requiereRol(["admin"], handleEliminarCategoria));
// Conectar los eventos IPC con los controladores
ipcMain.handle("crear-usuario", requiereRol(["admin"], handleCrearUsuario));
ipcMain.handle("eliminar-usuario", requiereRol(["admin"], handleEliminarUsuario));
ipcMain.handle("eliminar-pareja", requiereRol(["admin"], handleEliminarPareja));
ipcMain.handle("obtener-rol-usuario", handleObtenerRolUsuario);
// Conectar los eventos IPC con los controladores
ipcMain.handle("registrar-estilo", requiereRol(["admin"], handleRegistrarEstilo));
ipcMain.handle("buscar-estilo-por-id", handleBuscarEstiloPorID);
ipcMain.handle("actualizar-estilo", requiereRol(["admin"], handleActualizarEstilo));
ipcMain.handle("eliminar-estilo", requiereRol(["admin"], handleEliminarEstilo));
// Conectar el evento IPC para generar el PDF
ipcMain.handle("generar-pdf-parejas", handleGenerarPDFParejas);
ipcMain.handle("generar-pdf-resultados", handleGenerarPDFResultados);
ipcMain.handle("generar-pdf-categorias", handleGenerarPDFCategorias);
ipcMain.handle("generar-pdf-estilos", handleGenerarPDFEstilos);
ipcMain.handle("generar-pdf-registros-generales", handleGenerarPDFRegistrosGenerales);
// Conectar el evento IPC para registrar evaluaciones
ipcMain.handle("registrar-evaluacion", requiereRol(["admin", "user", "juez"], handleRegistrarEvaluacion));
ipcMain.handle("obtener-evaluaciones-por-pareja", handleObtenerEvaluacionesPorPareja);
// Conectar el evento para guardar la configuración del archivo JSON dinamico.
ipcMain.handle("obtener-configuracion", desdeConfiguracion(handleObtenerConfiguracion));
ipcMain.handle("guardar-configuracion", desdeConfiguracion(handleGuardarConfiguracion));
ipcMain.handle("continuar-configuracion", desdeConfiguracion(async (event) => {
    if (continuandoConfiguracion) return { success: false, error: "Espera a que termine la conexión." };
    continuandoConfiguracion = true;
    try {
        await inicializarBaseDatos();
        cerrarSesion();
        global.userRole = "guest";
        const origen = BrowserWindow.fromWebContents(event.sender);
        if (!global.loginWindow || global.loginWindow.isDestroyed()) await createLoginWindow();
        else global.loginWindow.focus();
        for (const ventana of BrowserWindow.getAllWindows()) {
            if (ventana !== origen && ventana !== global.loginWindow) ventana.close();
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        continuandoConfiguracion = false;
    }
}));

// Conectar el evento IPC para abrir la ventana de configuración
ipcMain.on("abrir-ventana-emergente", () => { abrirConfiguracion(); });
ipcMain.handle("guardarImagenBuffer", handleGuardarImagenBuffer);
ipcMain.handle("guardarImagen", handleGuardarImagen);
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
    global.mainWindow.maximize();
    // global.mainWindow.loadFile("Vistas/index.html");
    global.mainWindow.loadFile("Vistas/MenuPrincipal.html");
    // Asegúrate de que este evento se registre después de que la ventana haya sido creada
    global.mainWindow.webContents.once("did-finish-load", () => {
        console.log("Enviando evento set-role con rol:", global.userRole || "guest");
        global.mainWindow.webContents.send("set-role", global.userRole || "guest");
    });
    global.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => { // CODIGO QUE HAY QUE BORRAR
        if (errorDescription.includes("Autofill.enable") || errorDescription.includes("Autofill.setAddresses")) {
            console.warn("Error de Autofill ignorado:", errorDescription);
        }
    });

    console.log("Ventana principal creada.");

}

// Función para abrir ventanas de secciones
function openWindow(file) {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false, // Mejor práctica  
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, "preload.js")
        },
    });

    const filePath = path.join(__dirname, "Vistas", file);
    console.log("Cargando archivo:", filePath);
    win.loadFile(filePath).catch(err => console.error("Error cargando archivo:", err));
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
                    { label: "Base de Datos", click() { abrirConfiguracion(); } }
                ]
            },
        ],
    },
];

// Solo la ventana local de configuración puede consultar o modificar la conexión.
let configWindow = null;
let continuandoConfiguracion = false;
function desdeConfiguracion(handler) {
    return (event, ...args) => {
        try {
            const ruta = fileURLToPath(event.sender.getURL());
            if (path.resolve(ruta) === path.join(__dirname, "Vistas", "configuracionBD.html")) {
                return handler(event, ...args);
            }
        } catch { /* No es un archivo local de la aplicación. */ }
        return { success: false, error: "Abre la pantalla de configuración para realizar esta operación." };
    };
}

function abrirConfiguracion(motivo = "") {
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
    configWindow.on("closed", () => { configWindow = null; });
    configWindow.loadFile(path.join(__dirname, "Vistas", "configuracionBD.html"), { query: { motivo } })
        .catch(() => {
            dialog.showErrorBox("Error de inicio", "No se pudo abrir la pantalla de configuración.");
            app.quit();
        });
}

app.whenReady().then(async () => {
    Menu.setApplicationMenu(Menu.buildFromTemplate(templateMenu));
    try {
        await inicializarBaseDatos();
        await createLoginWindow();
    } catch (error) {
        abrirConfiguracion(error.message);
    }
}).catch(() => {
    dialog.showErrorBox("Error de inicio", "No se pudo iniciar la aplicación.");
    app.quit();
});
app.on("window-all-closed", () => { app.quit(); });


// Escuchar eventos desde el renderizador
ipcMain.on("open-section", (event, section) => {
    console.log("Sección recibida:", section);
    openWindow(section);
});

// La identidad de la sesión nunca se lee del archivo de conexión a MySQL.
ipcMain.handle("get-role", () => obtenerSesion()?.userRole || "guest");
ipcMain.handle("get-usuario-id", () => obtenerSesion()?.userID ?? null);





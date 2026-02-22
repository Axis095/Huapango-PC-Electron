// Importaciones y dependencias
const { app, BrowserWindow, ipcMain, Menu, dialog, shell, contextBridge } = require("electron");
const path = require("path");
const { queryDatabase, verificarConexion  } = require("./db"); // Importación para la base de datos
const PDFDocument = require('pdfkit'); // Importación de libreria para creación de PDF's
const fs = require('fs'); // Importación de una dependencia de la libreria para el sistema de archivos 
const { type } = require("os");
//LAS EXPORTACIONES DE LOS CONTROLADORES SON LAS MÁS IMPORTANTES DEL MOMENTO
const { handleLogin } = require("./Controladores/authController");
const { handleRegistrarPareja, handleBuscarParejaPorID, handleBuscarTodasLasParejas, handleActualizarPareja } = require("./Controladores/parejaController");
const { handleRegistrarCategoria, handleActualizarCategoria, handleEliminarCategoria, handleBuscarCategoriaPorID } = require("./Controladores/categoriaController");
const { handleRegistrarEstilo, handleActualizarEstilo, handleEliminarEstilo, handleBuscarEstiloPorID } = require("./Controladores/estiloController");
const { handleCrearUsuario, handleEliminarUsuario, handleEliminarPareja, handleObtenerRolUsuario } = require("./Controladores/adminController");
const { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja } = require("./Controladores/evaluacionesController");
const { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias, handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales, handleDescargarManualUsuario  } = require("./Controladores/pdfController");
const { handleGuardarConfiguracion } = require("./Controladores/configController");
const { abrirVentanaEmergente } = require("./Controladores/ventanasController"); // ESTO ES POSIBLE QUE SE TERMINE ELIMINANDO TENGAN CUIDADO CON EL ARCHIVO DE PRELOAD
const {handleGuardarImagenBuffer, handleGuardarImagen} = require("./Controladores/imagenesController");



// MENSAJE GENERAL ELIMINAR POR FAVOR TODO EL CÓDIGO BASURA QUE NO SE UTILIZA, IGUAL LOS COMENTARIOS SOLO DEJAR LO QUE SEA DE UTILIDAD, IGUAL CON LAS LIBRERIAS QUE NO SE USAN


// Escuchar el evento de login y pasar createMainWindow como argumento
ipcMain.handle("login", (event, credentials) => handleLogin(event, credentials, createMainWindow));
// Conectar el evento IPC con el controlador
ipcMain.handle("registrar-pareja", handleRegistrarPareja);
ipcMain.handle("buscar-pareja-por-id", handleBuscarParejaPorID);
// ipcMain.handle("actualizar-pareja", handleActualizarPareja);
// ipcMain.handle("actualizar-pareja", (event, datos) => {
//     console.log("Enviando solicitud de actualización con datos DESDE MAIN.JS:", datos);
//     return handleActualizarPareja(event, datos);
// });
ipcMain.handle("actualizar-pareja-completa", handleActualizarPareja);
ipcMain.handle("buscar-todas-las-parejas", handleBuscarTodasLasParejas);
ipcMain.handle("registrar-categoria", handleRegistrarCategoria);
ipcMain.handle("buscar-categoria-por-id", handleBuscarCategoriaPorID);
ipcMain.handle("actualizar-categoria", handleActualizarCategoria);
ipcMain.handle("eliminar-categoria", handleEliminarCategoria);
// Conectar los eventos IPC con los controladores
ipcMain.handle("crear-usuario", handleCrearUsuario);
ipcMain.handle("eliminar-usuario", handleEliminarUsuario);
ipcMain.handle("eliminar-pareja", handleEliminarPareja);
ipcMain.handle("obtener-rol-usuario", handleObtenerRolUsuario);
// Conectar los eventos IPC con los controladores
ipcMain.handle("registrar-estilo", handleRegistrarEstilo);
ipcMain.handle("buscar-estilo-por-id", handleBuscarEstiloPorID);
ipcMain.handle("actualizar-estilo", handleActualizarEstilo);
ipcMain.handle("eliminar-estilo", handleEliminarEstilo);
// Conectar el evento IPC para generar el PDF
ipcMain.handle("generar-pdf-parejas", handleGenerarPDFParejas);
ipcMain.handle("generar-pdf-resultados", handleGenerarPDFResultados);
ipcMain.handle("generar-pdf-categorias", handleGenerarPDFCategorias);
ipcMain.handle("generar-pdf-estilos", handleGenerarPDFEstilos);
ipcMain.handle("generar-pdf-registros-generales", handleGenerarPDFRegistrosGenerales);
// Conectar el evento IPC para registrar evaluaciones
ipcMain.handle("registrar-evaluacion", handleRegistrarEvaluacion);
ipcMain.handle("obtener-evaluaciones-por-pareja", handleObtenerEvaluacionesPorPareja);
// Conectar el evento para guardar la configuración del archivo JSON dinamico.
ipcMain.handle("guardar-configuracion", (event, nuevaConfig) => handleGuardarConfiguracion(event, nuevaConfig));
// Conectar el evento IPC para abrir la ventana de configuración
ipcMain.on("abrir-ventana-emergente", () => { abrirVentanaEmergente(); });
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

    global.loginWindow.loadFile("Vistas/login.html");

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
        console.log("🔄 Enviando evento set-role con rol:", global.userRole || "guest");
        global.mainWindow.webContents.send("set-role", global.userRole || "guest");
    });

    global.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => { // CODIGO QUE HAY QUE BORRAR
    if (errorDescription.includes("Autofill.enable") || errorDescription.includes("Autofill.setAddresses")) {
        console.warn("⚠️ Error de Autofill ignorado:", errorDescription);
    }
});

    console.log("✅ Ventana principal creada.");
    
}

// Función para abrir ventanas de secciones
function openWindow(file) {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false , // Mejor práctica  
            contextIsolation: true,
            enableRemoteModule: false,
        },
    });

    const filePath = `Sections/Registros.html`;
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
        },
    });

    
    const filePath = path.join(__dirname, "Vistas", file);

    // 🔹 Agregar parámetro de query SOLO para `BusquedaParejas.html`
    if (file === "BusquedaParejas.html", "ModificarParejas.html") {
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
                    { label: "Base de Datos", click() { openNewWindow("modal","configuracionBD.html"); } }
                ]
            },
        ],
    },
];

// Inicialización de la aplicación
app.whenReady().then(async () => {
    const conexionValida = await verificarConexion();

    if (!conexionValida) {
        dialog.showErrorBox("Error de conexión", "No se pudo conectar a la base de datos. Verifica la configuración.");
        
        // 🔹 Abre la ventana de configuración para que el usuario pueda corregir la IP
        const configWindow = new BrowserWindow({
            width: 600,
            height: 400,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
            },
        });

        configWindow.loadFile(path.join(__dirname, "Vistas", "configuracionBD.html"));
        
        // 🔹 Cuando el usuario cierre la ventana, reinicia la aplicación para aplicar cambios
        configWindow.on("close", () => {
            app.relaunch();
            app.exit();
        });

        return; // 🔹 Detiene la ejecución para que no cargue la ventana principal aún
    }

    // 🔹 Si la conexión es válida, crear la ventana principal normalmente
    createLoginWindow();
    const mainMenu = Menu.buildFromTemplate(templateMenu);
    Menu.setApplicationMenu(mainMenu);
});

// Después del login exitoso:
// main.js
ipcMain.on("login-exitoso", (event, rol) => {
    global.userRole = rol; // Asigna el rol recibido
    createMainWindow();    // Crea la ventana principal
    const mainMenu = Menu.buildFromTemplate(crearTemplateMenu(global.userRole)); // Crea el menú según el rol
    Menu.setApplicationMenu(mainMenu); // Asigna el menú
    if (global.loginWindow) global.loginWindow.close(); // Cierra la ventana de login si existe
});


// Escuchar eventos desde el renderizador
ipcMain.on("open-section", (event, section) => {
    console.log("Sección recibida:", section);
    openWindow(section);
});

//EL CANAL ABIERTO QUE PERMITE EL ENVIO DE ROLES AL PRELOAD
ipcMain.handle("get-role", async () => {
    try {
        // Devuelve el rol del usuario actual
        return global.userRole || "guest"; // Usa "guest" como valor predeterminado si no hay un rol definido
    } catch (err) {
        console.error("❌ Error al obtener el rol del usuario:", err);
        return "guest"; // Devuelve un rol predeterminado en caso de error
    }
});

ipcMain.handle("get-usuario-id", async () => {
    try {
        // const configPath = path.join(__dirname, "config.json"); // SI ALGO NO FUNCIONA REVISA ACÁ ESTA RUTA FUNCIONA EN CÓDIGO NO EN PRODUCCIÓN
        const configPath = path.join(app.getPath('userData'), "config.json");
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            return config.user || null; // EL CAMPO TIENE QUE SER IGUAL A CONFIG.JSON SI NO NO VA A FUNCIONAR
        }
        return null;
    } catch (err) {
        console.error("Error al obtener el ID del usuario:", err);
        return null;
    }
});


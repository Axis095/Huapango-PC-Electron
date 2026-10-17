// Importaciones y dependencias
const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const path = require("path");
const { inicializarBaseDatos } = require("./db");
const { obtenerSesion, cerrarSesion, revalidarSesion, registrarActividad } = require("./Modelos/sesionModel");
const { fileURLToPath } = require("url");
const { crearSeguridadIPC } = require("./Seguridad/ipc");
const { ejecutarOperacion, ejecutarCambioConfiguracion, ejecutarCierreSesion } = require("./Servicios/operaciones");
let propietarioVentanas = null;
const seguridad = crearSeguridadIPC({ raiz: __dirname, obtenerSesion, revalidarSesion, registrarActividad,
    recuperarSesion, sesionPendiente: () => !!propietarioVentanas,
    ventanaDe: sender => BrowserWindow.fromWebContents(sender) });
function registrarEvento(canal, handler) {
    const protegido = seguridad.proteger(canal, handler);
    ipcMain.on(canal, async (...args) => {
        try { return await ejecutarOperacion(() => protegido(...args)); }
        catch (error) {
            if (error.code === "CONFIGURATION_BUSY") return { success: false, code: error.code };
            console.error("Evento IPC rechazado:", canal, error.code || "INTERNAL_ERROR");
            return { success: false, code: "INTERNAL_ERROR" };
        }
    });
}
async function recuperarSesion(_event, anterior) {
    propietarioVentanas ||= anterior;
    if (!propietarioVentanas) return false;
    for (const ventana of BrowserWindow.getAllWindows()) {
        if (ventana !== global.loginWindow) ventana.hide();
    }
    if (!global.loginWindow || global.loginWindow.isDestroyed()) await createLoginWindow(true);
    else global.loginWindow.focus();
    return true;
}
function registrarIPC(canal, handler) {
    const protegido = seguridad.proteger(canal, handler);
    const esConfiguracion = ["obtener-configuracion", "guardar-configuracion", "continuar-configuracion"].includes(canal);
    const informarOcupado = error => {
        if (error.code === "CONFIGURATION_BUSY") return { success: false, code: error.code, error: error.message };
        throw error;
    };
    ipcMain.handle(canal, (...args) => {
        try {
            const resultado = esConfiguracion ? protegido(...args) : ejecutarOperacion(() => protegido(...args));
            return resultado && typeof resultado.then === "function" ? resultado.catch(informarOcupado) : resultado;
        } catch (error) { return informarOcupado(error); }
    });
}
//LAS EXPORTACIONES DE LOS CONTROLADORES SON LAS MÁS IMPORTANTES DEL MOMENTO
const { handleLogin, autenticacionEnCurso } = require("./Controladores/authController");
const { handleRegistrarPareja, handleBuscarParejaPorID, handleBuscarParejaParaEvaluacion, handleBuscarTodasLasParejas, handleActualizarPareja } = require("./Controladores/parejaController");
const { handleRegistrarCategoria, handleActualizarCategoria, handleEliminarCategoria, handleBuscarCategoriaPorID } = require("./Controladores/categoriaController");
const { handleRegistrarEstilo, handleActualizarEstilo, handleEliminarEstilo, handleBuscarEstiloPorID } = require("./Controladores/estiloController");
const { handleCrearUsuario, handleEliminarUsuario, handleEliminarPareja, handleObtenerRolUsuario } = require("./Controladores/adminController");
const { handleRegistrarEvaluacion, handleObtenerEvaluacionesPorPareja } = require("./Controladores/evaluacionesController");
const { handleGenerarPDFParejas, handleGenerarPDFResultados, handleGenerarPDFCategorias, handleGenerarPDFEstilos, handleGenerarPDFRegistrosGenerales } = require("./Controladores/pdfController");
const { handleGuardarConfiguracion, handleObtenerConfiguracion } = require("./Controladores/configController");


const { obtenerBorradorRegistro, guardarBorradorRegistro, limpiarBorradorRegistro } = require("./Controladores/borradorRegistroController");
registrarIPC("obtener-borrador-registro", obtenerBorradorRegistro);
registrarIPC("guardar-borrador-registro", guardarBorradorRegistro);
registrarIPC("limpiar-borrador-registro", limpiarBorradorRegistro);
const { obtenerBorradorModificacion, guardarBorradorModificacion, limpiarBorradorModificacion } = require("./Controladores/borradorModificacionController");
registrarIPC("obtener-borrador-modificacion", obtenerBorradorModificacion);
registrarIPC("guardar-borrador-modificacion", guardarBorradorModificacion);
registrarIPC("limpiar-borrador-modificacion", limpiarBorradorModificacion);

// MENSAJE GENERAL ELIMINAR POR FAVOR TODO EL CÓDIGO BASURA QUE NO SE UTILIZA, IGUAL LOS COMENTARIOS SOLO DEJAR LO QUE SEA DE UTILIDAD, IGUAL CON LAS LIBRERIAS QUE NO SE USAN

// Escuchar el evento de login y pasar createMainWindow como argumento
registrarIPC("login", (event, credentials) => continuandoConfiguracion
    ? { success: false, error: "Espera a que termine la configuración." }
    : handleLogin(event, credentials, createMainWindow, () => seguridad.permitido("login", event)));
registrarIPC("cerrar-sesion", async () => {
    try {
        return await ejecutarCierreSesion(async () => {
            // La reserva impide cerrar ventanas durante otra escritura. Preparar
            // el acceso primero conserva la sesión si falla la carga del HTML.
            const anteriores = BrowserWindow.getAllWindows();
            try { await createLoginWindow(); }
            catch {
                if (global.loginWindow && !global.loginWindow.isDestroyed()) global.loginWindow.destroy();
                return { success: false, error: "No se pudo abrir el acceso. La sesión sigue activa." };
            }
            cerrarSesion();
            propietarioVentanas = null;
            global.userRole = "guest";
            for (const ventana of anteriores) ventana.close();
            return { success: true };
        });
    } catch (error) {
        if (error.code === "CONFIGURATION_BUSY") return { success: false, code: error.code, error: "Espera a que termine la operación en curso antes de cerrar sesión." };
        throw error;
    }
});
// Conectar el evento IPC con el controlador
registrarIPC("registrar-pareja", handleRegistrarPareja);
registrarIPC("buscar-pareja-por-id", handleBuscarParejaPorID);
registrarIPC("buscar-pareja-para-evaluacion", handleBuscarParejaParaEvaluacion);
// ipcMain.handle("actualizar-pareja", handleActualizarPareja);
//     console.log("Enviando solicitud de actualización con datos DESDE MAIN.JS:", datos);
//     return handleActualizarPareja(event, datos);
// });
registrarIPC("actualizar-pareja-completa", handleActualizarPareja);
registrarIPC("buscar-todas-las-parejas", handleBuscarTodasLasParejas);
registrarIPC("registrar-categoria", handleRegistrarCategoria);
registrarIPC("buscar-categoria-por-id", handleBuscarCategoriaPorID);
registrarIPC("actualizar-categoria", handleActualizarCategoria);
registrarIPC("eliminar-categoria", handleEliminarCategoria);
// Conectar los eventos IPC con los controladores
registrarIPC("crear-usuario", handleCrearUsuario);
registrarIPC("eliminar-usuario", handleEliminarUsuario);
registrarIPC("eliminar-pareja", handleEliminarPareja);
registrarIPC("obtener-rol-usuario", handleObtenerRolUsuario);
// Conectar los eventos IPC con los controladores
registrarIPC("registrar-estilo", handleRegistrarEstilo);
registrarIPC("buscar-estilo-por-id", handleBuscarEstiloPorID);
registrarIPC("actualizar-estilo", handleActualizarEstilo);
registrarIPC("eliminar-estilo", handleEliminarEstilo);
// Conectar el evento IPC para generar el PDF
registrarIPC("generar-pdf-parejas", handleGenerarPDFParejas);
registrarIPC("generar-pdf-resultados", handleGenerarPDFResultados);
registrarIPC("generar-pdf-categorias", handleGenerarPDFCategorias);
registrarIPC("generar-pdf-estilos", handleGenerarPDFEstilos);
registrarIPC("generar-pdf-registros-generales", handleGenerarPDFRegistrosGenerales);
// Conectar el evento IPC para registrar evaluaciones
registrarIPC("registrar-evaluacion", handleRegistrarEvaluacion);
registrarIPC("obtener-evaluaciones-por-pareja", handleObtenerEvaluacionesPorPareja);
// Conectar el evento para guardar la configuración del archivo JSON dinamico.
registrarIPC("obtener-configuracion", desdeConfiguracion(handleObtenerConfiguracion));
registrarIPC("guardar-configuracion", desdeConfiguracion(handleGuardarConfiguracion));
registrarIPC("continuar-configuracion", desdeConfiguracion(async (event) => {
    if (continuandoConfiguracion || autenticacionEnCurso()) return { success: false, error: "Espera a que termine la conexión o el inicio de sesión." };
    continuandoConfiguracion = true;
    try {
        return await ejecutarCambioConfiguracion(async () => {
        await inicializarBaseDatos();
        cerrarSesion();
        propietarioVentanas = null;
        global.userRole = "guest";
        const origen = BrowserWindow.fromWebContents(event.sender);
        if (!global.loginWindow || global.loginWindow.isDestroyed()) await createLoginWindow();
        else global.loginWindow.focus();
        for (const ventana of BrowserWindow.getAllWindows()) {
            if (ventana !== origen && ventana !== global.loginWindow) ventana.close();
        }
        return { success: true };
        });
    } catch (error) {
        return { success: false, error: error.message, code: error.code };
    } finally {
        continuandoConfiguracion = false;
    }
}));

// Conectar el evento IPC para abrir la ventana de configuración
registrarEvento("abrir-ventana-emergente", () => { abrirConfiguracion(); });
function createLoginWindow(recuperacion = false) {
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
    global.loginWindow.on("closed", () => {
        if (!obtenerSesion() && propietarioVentanas) app.quit();
    });
    return global.loginWindow.loadFile(path.join(__dirname, "Vistas", "login.html"),
        recuperacion ? { query: { sesion: "expirada" } } : undefined);

}

async function createMainWindow() {
    const actual = obtenerSesion();
    const anteriores = BrowserWindow.getAllWindows().filter(w => w !== global.loginWindow);
    const mismaIdentidad = propietarioVentanas && actual &&
        String(propietarioVentanas.userID) === String(actual.userID) && propietarioVentanas.userRole === actual.userRole;
    if (mismaIdentidad && global.mainWindow && !global.mainWindow.isDestroyed()) {
        for (const ventana of anteriores) ventana.show();
        global.mainWindow.focus();
        return;
    }
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
    // Cerrar antes del primer await: las ventanas de otra identidad no pueden
    // emitir IPC mientras se carga el menú de la nueva sesión.
    for (const ventana of anteriores) ventana.close();
    await global.mainWindow.loadFile(path.join(__dirname, "Vistas", "MenuPrincipal.html"));
    global.mainWindow.webContents.send("set-role", obtenerSesion()?.userRole || "guest");
    propietarioVentanas = actual;
}

// Función para abrir ventanas de secciones
function openWindow(file) {
    if (!seguridad.puedeAbrir(file) || ["login.html", "configuracionBD.html"].includes(file)) return;
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
    if (!seguridad.puedeAbrir(file)) {
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
    if (!seguridad.puedeConfigurar()) return;
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
registrarEvento("open-section", (event, section) => {
    console.log("Sección recibida:", section);
    openWindow(section);
});

// La identidad de la sesión nunca se lee del archivo de conexión a MySQL.
registrarIPC("get-role", () => obtenerSesion()?.userRole || "guest");
registrarIPC("get-usuario-id", () => obtenerSesion()?.userID ?? null);





app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
    const comprobar = (event, url) => {
        const vista = seguridad.vistaDeURL(url);
        if (!vista || !seguridad.puedeAbrir(vista)) event.preventDefault();
    };
    contents.on("will-navigate", comprobar);
    contents.on("will-redirect", comprobar);
    contents.on("will-attach-webview", event => event.preventDefault());
});

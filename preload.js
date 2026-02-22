const { contextBridge, ipcRenderer } = require("electron");
// const { buscarCategoriaPorID } = require("./Modelos/categoriaModel");

// Exponer una API segura al renderizador
contextBridge.exposeInMainWorld("api", {
    getUserRole: () => ipcRenderer.invoke("get-role"), // Exponer el canal "get-role"
    registrarPareja: (datos) => ipcRenderer.invoke("registrar-pareja", datos),
    buscarParejaPorID: (id) => ipcRenderer.invoke("buscar-pareja-por-id", id),
    buscarTodasLasParejas: () => ipcRenderer.invoke("buscar-todas-las-parejas"),
    // actualizarPareja: (datos) => ipcRenderer.invoke("actualizar-pareja", datos),
    // actualizarPareja: (datos) => {
    //     console.log("Enviando solicitud de actualización con datos:", datos);
    //     return ipcRenderer.invoke("actualizar-pareja", datos);
    // },
    
    actualizarParejaCompleta: (datos) => ipcRenderer.invoke("actualizar-pareja-completa", datos),
    registrarCategoria: (datos) => ipcRenderer.invoke("registrar-categoria", datos),
    actualizarCategoria: (datos) => ipcRenderer.invoke("actualizar-categoria", datos),
    eliminarCategoria: (categoriaId) => ipcRenderer.invoke("eliminar-categoria", categoriaId),
    buscarCategoriaPorID: (id) => ipcRenderer.invoke("buscar-categoria-por-id", id),
    crearUsuario: (datos) => ipcRenderer.invoke("crear-usuario", datos),
    // eliminarUsuario: (cNombreUsuario) => ipcRenderer.invoke("eliminar-usuario", cNombreUsuario),
    eliminarUsuario: (cNombreUsuario, tipoPermitido) => ipcRenderer.invoke("eliminar-usuario", cNombreUsuario, tipoPermitido),
//     eliminarUsuario: (cNombreUsuario, tipoPermitido) => {
//     console.log(`Enviando solicitud para eliminar: ${cNombreUsuario}, Tipo Permitido: ${tipoPermitido}`);
//     return ipcRenderer.invoke("eliminar-usuario", cNombreUsuario, tipoPermitido);
// },
    obtenerRolUsuario: (cNombreUsuario) => {return ipcRenderer.invoke("obtener-rol-usuario", cNombreUsuario);}, //POSIBLE ERROR HAY QUE REVISAR EL MAIN
    eliminarPareja: (nParejaID) => ipcRenderer.invoke("eliminar-pareja", nParejaID),
    registrarEstilo: (datos) => ipcRenderer.invoke("registrar-estilo", datos),
    buscarEstiloPorID: (id) => ipcRenderer.invoke("buscar-estilo-por-id", id),
    actualizarEstilo: (id, datos) => ipcRenderer.invoke("actualizar-estilo", { id, datos }),
    eliminarEstilo: (id) => ipcRenderer.invoke("eliminar-estilo", id),
    // GENERADORES DE PDF's
    generarPDFParejas: () => ipcRenderer.invoke("generar-pdf-parejas"),
    generarPDFResultados: () => ipcRenderer.invoke("generar-pdf-resultados"),
    generarPDFCategorias: () => ipcRenderer.invoke("generar-pdf-categorias"),
    generarPDFEstilos: () => ipcRenderer.invoke("generar-pdf-estilos"),
    generarPDFRegistrosGenerales: () => ipcRenderer.invoke("generar-pdf-registros-generales"),
    // obtenerCategorias: () => ipcRenderer.invoke("obtenerCategorias"),
    // obtenerEstilos: () => ipcRenderer.invoke("obtenerEstilos"),
    //Eventos para la evaluaciones
    registrarEvaluacion: (datos) => ipcRenderer.invoke("registrar-evaluacion", datos),
    obtenerEvaluacionesPorPareja: (nParejaID) => ipcRenderer.invoke("obtener-evaluaciones-por-pareja", nParejaID),
    guardarConfiguracion: (config) => ipcRenderer.invoke("guardar-configuracion", config),
    // DAMOS PERMISO A getUsuarioID para guardar automaticamente los ID de los jueces en el sistema
    guardarImagen: (origen, destino) => ipcRenderer.invoke("guardarImagen", origen, destino),
    guardarImagenBuffer: (buffer, destino) => ipcRenderer.invoke("guardarImagenBuffer", buffer, destino),


    abrirVentanaEmergente: () => ipcRenderer.send("abrir-ventana-emergente"), // POIBLEMENTE ESTO TENGAMOSS QUE BORRARLO SOLO ES PARA PRUEBAS
    getUsuarioID: () => ipcRenderer.invoke("get-usuario-id"),
    send: (channel, data) => {
        // Lista de canales permitidos
        const validChannels = ["open-section", "login"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, callback) => {
        // Lista de canales permitidos
        const validChannels = ["set-role", "login-failed", "login-success", "login-error"];
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    invoke: (channel, data) => {
        // Lista de canales permitidos para invocación
        const validChannels = ["get-role", "login"]; // Agregamos "login" aquí
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, data);
        }
    }
});
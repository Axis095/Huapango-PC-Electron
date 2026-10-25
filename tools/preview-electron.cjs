// Solo abre la vista previa HTTP. Perfil propio, sin preload ni acceso a MySQL.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const perfil = path.resolve(__dirname, '../../huapango-interfaz-preview-datos');
fs.mkdirSync(perfil, { recursive: true });
app.setName('HuapangoInterfazPreview');
app.setPath('userData', perfil);
let ventana;
app.whenReady().then(() => {
    ventana = new BrowserWindow({width:1280,height:900,webPreferences:{contextIsolation:true,nodeIntegration:false}});
    ventana.on('page-title-updated', event => {event.preventDefault();ventana.setTitle('Huapango — vista previa de interfaz');});
    const abrir = (pagina, rol='user') => ventana.loadURL(`http://127.0.0.1:4320/Vistas/${pagina}.html?rol=${rol}`);
    const dimensionar = (ancho, alto) => { ventana.unmaximize(); ventana.setSize(ancho, alto); };
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {label:'Vista previa',submenu:[
            {label:'Registro · usuario',click:()=>abrir('Registros')},
            {label:'Registro · administrador',click:()=>abrir('Registros','admin')},
            {label:'Evaluación · juez',click:()=>abrir('Resultados','juez')},
            {label:'Administración',click:()=>abrir('Administrador','admin')},
            {label:'Login',click:()=>abrir('login')},
            {label:'Configuración',click:()=>abrir('configuracionBD')},
            {type:'separator'},{label:'Ventana de laptop (800 × 600)',click:()=>dimensionar(800,600)},
            {label:'Ventana amplia (1280 × 900)',click:()=>dimensionar(1280,900)},
            {role:'reload'},{role:'quit'}
        ]}
    ]));
    abrir('Registros');
});
app.on('window-all-closed', () => app.quit());

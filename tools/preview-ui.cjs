// Vista previa exclusiva en localhost. No importa Electron, MySQL ni configuración real.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mock = `(() => {
 const rol = new URLSearchParams(location.search).get('rol');
 if (['admin','user','juez'].includes(rol)) sessionStorage.setItem('preview.rol',rol);
 const read = key => JSON.parse(sessionStorage.getItem(key) || 'null');
 const write = (key,value) => {sessionStorage.setItem(key,JSON.stringify(value));return {success:true};};
 const denied = async () => ({success:false,error:'Vista previa: esta operación no se envía a MySQL.'});
 window.api = {
   getUserRole: async()=>sessionStorage.getItem('preview.rol') || 'user',
   obtenerBorradorRegistro: async()=>({success:true,data:read('preview.registro')}),
   guardarBorradorRegistro: async datos=>write('preview.registro',datos),
   limpiarBorradorRegistro: async()=>write('preview.registro',null),
   obtenerBorradorModificacion: async()=>({success:true,data:read('preview.modificacion')}),
   guardarBorradorModificacion: async datos=>write('preview.modificacion',datos),
   limpiarBorradorModificacion: async()=>write('preview.modificacion',null),
   registrarPareja:denied,registrarCategoria:denied,registrarEstilo:denied,
   generarPDFParejas:denied,generarPDFCategorias:denied,generarPDFEstilos:denied,
   getUserId:async()=>1, getUserID:async()=>1, getIdUsuario:async()=>1,
   invoke:denied, buscarParejaPorID:denied, buscarParejaParaEvaluacion:denied,
   obtenerConfiguracion:async()=>({success:true,data:{host:'127.0.0.1',port:3306,user:'demo',database:'solo_vista_previa'}}),
   guardarConfiguracion:denied, requiereConfiguracionInicial:async()=>false
 };
 document.addEventListener('DOMContentLoaded',()=>{
   const aviso=document.createElement('p');aviso.className='aviso-preview';aviso.textContent='Vista previa · sin conexión a MySQL · datos ficticios';
   document.body.append(aviso);
 });
})();`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
 try {
  if(req.method!=='GET' || !['127.0.0.1:4320','localhost:4320'].includes(req.headers.host)) {res.writeHead(403);return res.end();}
  const url=new URL(req.url,'http://127.0.0.1:4320');
  if(url.pathname==='/__preview__/api.js'){res.writeHead(200,{'Content-Type':types['.js'],'Cache-Control':'no-store'});return res.end(mock);}
  const pathname=url.pathname==='/'?'/Vistas/Registros.html':decodeURIComponent(url.pathname);
  if(!/^\/(Vistas|Public)\//.test(pathname) || pathname.includes('..') || pathname.includes('\\')) {res.writeHead(404);return res.end();}
  const target=path.join(root,pathname),real=await fs.realpath(target);
  if(!real.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  let bytes=await fs.readFile(real);const ext=path.extname(real);
  if(ext==='.html')bytes=Buffer.from(bytes.toString('utf8').replace('<head>','<head><script src="/__preview__/api.js"></script>'));
  res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Archivo no encontrado.');}
});
server.listen(4320,'127.0.0.1',()=>console.log('Vista previa aislada: http://127.0.0.1:4320/Vistas/Registros.html · Ctrl+C para detener'));

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const calendar=import('data:text/javascript;base64,'+Buffer.from(read('Public/js/calendarioNacimiento.js')).toString('base64'));

test('calendario: febrero bisiesto, siglos y meses de 30/31 días',async()=>{
 const {diasDelMes,interpretarFecha}=await calendar;
 assert.equal(diasDelMes(2000,1),29);assert.equal(diasDelMes(1900,1),28);assert.equal(diasDelMes(2024,1),29);assert.equal(diasDelMes(2025,1),28);
 assert.equal(diasDelMes(2026,3),30);assert.equal(diasDelMes(2026,0),31);
 for(const value of ['2025-02-29','2000-02-30','2026-13-01','2026-00-01','2026-01-00','0000-01-01','01/02/2020',''])assert.equal(interpretarFecha(value),null,value);
});
test('calendario: mantiene el día y el año local sin conversión UTC ni desplazamiento 1900',async()=>{
 const {fechaLocal,isoLocal,interpretarFecha}=await calendar;
 for(const value of ['0001-01-01','0099-12-31','1900-01-01','2000-02-29','2026-10-25'])assert.equal(isoLocal(interpretarFecha(value)),value);
 assert.equal(isoLocal(fechaLocal(2024,1,30)),'2024-03-01');assert.equal(isoLocal(fechaLocal(2000,0,0)),'1999-12-31');
});
test('calendario: cuadrícula empieza el lunes y cada día aparece una sola vez',async()=>{
 const {celdasDelMes}=await calendar;
 assert.equal(celdasDelMes(2026,5)[0],1); // 1 de junio: lunes.
 assert.deepEqual(celdasDelMes(2026,1).slice(0,7),[null,null,null,null,null,null,1]);
 const days=celdasDelMes(2000,1).filter(Boolean);assert.equal(days.length,29);assert.equal(new Set(days).size,29);
});
function theme({saved=null,dark=false,blocked=false}={}) {
 const handlers={},mediaHandlers={},documentHandlers={},writes=[];
 const selector={value:'sistema',addEventListener(type,fn){this[type]=fn;}};
 const document={documentElement:{dataset:{}},querySelectorAll:()=>[selector],addEventListener:(name,fn)=>{documentHandlers[name]=fn;}};
 const media={matches:dark,addEventListener:(name,fn)=>{mediaHandlers[name]=fn;}};
 const window={matchMedia:()=>media,localStorage:{getItem(){if(blocked)throw Error('blocked');return saved;},setItem(k,v){if(blocked)throw Error('blocked');writes.push([k,v]);}},addEventListener:(name,fn)=>{handlers[name]=fn;}};
 vm.runInNewContext(read('Public/js/tema.js'),{window,document});
 return {document,window,selector,media,handlers,mediaHandlers,documentHandlers,writes};
}
test('tema: preferencia guardada se aplica antes de DOMContentLoaded',()=>{
 const t=theme({saved:'oscuro'});assert.equal(t.document.documentElement.dataset.tema,'oscuro');
 t.documentHandlers.DOMContentLoaded();assert.equal(t.selector.value,'oscuro');
 t.selector.value='claro';t.selector.change();assert.equal(t.document.documentElement.dataset.tema,'claro');assert.equal(t.writes[0][1],'claro');
});
test('tema: sistema cambia en vivo, pero no sobreescribe una elección explícita',()=>{
 const t=theme({dark:true});assert.equal(t.document.documentElement.dataset.tema,'oscuro');
 t.documentHandlers.DOMContentLoaded();t.media.matches=false;t.mediaHandlers.change();assert.equal(t.document.documentElement.dataset.tema,'claro');
 t.selector.value='oscuro';t.selector.change();t.mediaHandlers.change();assert.equal(t.document.documentElement.dataset.tema,'oscuro');
});
test('tema: almacenamiento bloqueado no impide alternar y un valor extraño usa el sistema',()=>{
 const t=theme({blocked:true,dark:false});t.documentHandlers.DOMContentLoaded();t.selector.value='oscuro';assert.doesNotThrow(()=>t.selector.change());assert.equal(t.document.documentElement.dataset.tema,'oscuro');
 assert.equal(theme({saved:'javascript:invalid',dark:true}).document.documentElement.dataset.tema,'oscuro');
});
test('tema: sincroniza otras ventanas e ignora claves que no son de apariencia',()=>{
 const t=theme();t.documentHandlers.DOMContentLoaded();t.handlers.storage({key:'otra',newValue:'oscuro'});assert.equal(t.document.documentElement.dataset.tema,'claro');
 t.handlers.storage({key:'huapango.apariencia.v1',newValue:'oscuro'});assert.equal(t.selector.value,'oscuro');
 t.handlers.storage({key:null,newValue:null});assert.equal(t.selector.value,'sistema');
});

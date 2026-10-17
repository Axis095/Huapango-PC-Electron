// Catálogo compartido por navegación, IPC, borradores y entradas de Vite.
const todos = ['admin', 'user', 'juez'];
const operadores = ['admin', 'user'];
const evaluadores = ['admin', 'juez'];
const vistas = Object.freeze({
    'login.html': null, 'configuracionBD.html': null,
    'MenuPrincipal.html': todos, 'Registros.html': operadores,
    'ModificarParejas.html': operadores, 'BusquedaParejas.html': operadores,
    'RegistroCategoriasEstilos.html': operadores, 'Parejas.html': operadores,
    'Resultados.html': evaluadores, 'Administrador.html': ['admin']
});
module.exports = { vistas };

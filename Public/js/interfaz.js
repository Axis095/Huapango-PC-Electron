import { inicializarCalendarios } from './calendarioNacimiento.js';
document.addEventListener('DOMContentLoaded', () => {
    const pagina = window.location.pathname.split('/').pop();
    const actual = {
        'MenuPrincipal.html': 'btnIndex', 'index.html': 'btnIndex',
        'Registros.html': 'btnRegistros', 'Parejas.html': 'btnRegistros', 'RegistroCategoriasEstilos.html': 'btnRegistros',
        'Resultados.html': 'btnResultados', 'BusquedaParejas.html': 'btnBusquedaParejas', 'ModificarParejas.html': 'btnBusquedaParejas',
        'Administrador.html': 'btnAdministrador', 'AdministradorInactivado.html': 'btnAdministrador'
    }[pagina];
    // No modifica permisos ni muestra botones privados.
    document.querySelectorAll('.menu-links button').forEach(button => {
        if (button.id === actual) { button.classList.add('active'); button.setAttribute('aria-current', 'page'); }
    });
    inicializarCalendarios();
});

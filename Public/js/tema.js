// Antes de las hojas de estilo: evita un destello del tema claro.
(() => {
    const clave = 'huapango.apariencia.v1';
    const permitidos = ['sistema', 'claro', 'oscuro'];
    const sistema = window.matchMedia('(prefers-color-scheme: dark)');
    let preferencia = 'sistema';
    try { const guardado = window.localStorage.getItem(clave); if (permitidos.includes(guardado)) preferencia = guardado; } catch { /* Funciona también sin almacenamiento. */ }
    function aplicar() {
        document.documentElement.dataset.tema = preferencia === 'sistema' ? (sistema.matches ? 'oscuro' : 'claro') : preferencia;
        document.querySelectorAll('[data-selector-tema]').forEach(select => { select.value = preferencia; });
    }
    aplicar();
    sistema.addEventListener('change', () => { if (preferencia === 'sistema') aplicar(); });
    window.addEventListener('storage', event => {
        if (event.key !== clave && event.key !== null) return;
        preferencia = permitidos.includes(event.newValue) ? event.newValue : 'sistema'; aplicar();
    });
    document.addEventListener('DOMContentLoaded', () => {
        aplicar();
        document.querySelectorAll('[data-selector-tema]').forEach(select => select.addEventListener('change', () => {
            if (!permitidos.includes(select.value)) return;
            preferencia = select.value; aplicar();
            try { window.localStorage.setItem(clave, preferencia); } catch { /* Preferencia de esta ventana. */ }
        }));
    });
})();

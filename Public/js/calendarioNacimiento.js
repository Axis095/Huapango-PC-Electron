const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export function fechaLocal(year, month, day) {
    const date = new Date(0); date.setFullYear(year, month, day); date.setHours(12, 0, 0, 0); return date;
}
export function isoLocal(date) {
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function interpretarFecha(texto) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!match || Number(match[1]) < 1) return null;
    const date = fechaLocal(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return isoLocal(date) === texto ? date : null;
}
export function diasDelMes(year, month) { return fechaLocal(year, month + 1, 0).getDate(); }
export function celdasDelMes(year, month) {
    const huecos = (fechaLocal(year, month, 1).getDay() + 6) % 7;
    return [...Array(huecos).fill(null), ...Array.from({ length: diasDelMes(year, month) }, (_, i) => i + 1)];
}
export function inicializarCalendarios(documento = document, ahora = () => new Date()) {
    const entradas = [...documento.querySelectorAll('input[type="date"]')];
    if (!entradas.length) return;
    const dialogo = documento.createElement('dialog'); dialogo.className = 'calendario-nacimiento';
    dialogo.setAttribute('aria-labelledby', 'tituloCalendarioNacimiento');
    // Plantilla fija: no se interpola contenido de usuarios ni de SQL.
    dialogo.innerHTML = `<div class="calendario-cabecera"><h2 id="tituloCalendarioNacimiento">Fecha de nacimiento</h2><button type="button" class="calendario-cerrar" aria-label="Cerrar calendario">×</button></div>
        <p class="ayuda-campo">Cambia el año y el mes directamente, después elige el día.</p>
        <div class="calendario-selectores"><label>Mes<select class="calendario-mes"></select></label><label>Año<input class="calendario-anio" type="number" inputmode="numeric" min="1" step="1"></label></div>
        <p class="calendario-error" role="status"></p>
        <div class="calendario-periodo"><button type="button" class="mes-anterior" aria-label="Mes anterior">‹</button><p class="mes-visible" aria-live="polite"></p><button type="button" class="mes-siguiente" aria-label="Mes siguiente">›</button></div>
        <div class="calendario-semana" aria-hidden="true"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
        <div class="calendario-dias" role="group" aria-label="Días del mes"></div>
        <p class="ayuda-campo">También puedes escribir la fecha directamente en el formulario.</p>
        <div class="calendario-acciones"><button type="button" class="borrar-fecha">Borrar fecha</button><button type="button" class="cerrar-fecha">Cancelar</button></div>`;
    documento.body.append(dialogo);
    const get = selector => dialogo.querySelector(selector);
    const mes = get('.calendario-mes'), anio = get('.calendario-anio'), dias = get('.calendario-dias'), error = get('.calendario-error');
    meses.forEach((nombre, i) => { const opcion = documento.createElement('option'); opcion.value = String(i); opcion.textContent = nombre; mes.append(opcion); });
    let entrada, year, month, diaEnfocado;
    const limite = () => isoLocal(ahora());
    const abierto = () => entrada && !entrada.disabled && !entrada.readOnly;
    function render(enfocar = false) {
        mes.value = String(month); anio.value = String(year); anio.max = String(ahora().getFullYear());
        error.textContent = ''; dias.replaceChildren();
        get('.mes-visible').textContent = `${meses[month]} de ${year}`;
        get('.mes-anterior').disabled = year === 1 && month === 0;
        get('.mes-siguiente').disabled = year === ahora().getFullYear() && month >= ahora().getMonth();
        diaEnfocado = Math.min(diaEnfocado || 1, diasDelMes(year, month));
        if (year === ahora().getFullYear() && month === ahora().getMonth()) diaEnfocado = Math.min(diaEnfocado, ahora().getDate());
        for (const day of celdasDelMes(year, month)) {
            const item = documento.createElement(day ? 'button' : 'span');
            if (day) {
                const iso = isoLocal(fechaLocal(year, month, day));
                item.type = 'button'; item.textContent = String(day); item.dataset.dia = String(day);
                item.disabled = iso > limite(); item.tabIndex = day === diaEnfocado ? 0 : -1;
                item.setAttribute('aria-label', `${day} de ${meses[month].toLowerCase()} de ${year}${iso === entrada.value ? ', fecha seleccionada' : ''}`);
                if (iso === entrada.value) item.classList.add('dia-seleccionado');
                if (iso === limite()) item.setAttribute('aria-current', 'date');
                item.addEventListener('click', () => elegir(iso));
            } else item.setAttribute('aria-hidden', 'true');
            dias.append(item);
        }
        if (enfocar) dias.querySelector(`[data-dia="${diaEnfocado}"]`)?.focus();
    }
    function elegir(iso) {
        if (!abierto() || (iso && (!interpretarFecha(iso) || iso > limite()))) return;
        entrada.value = iso;
        entrada.dispatchEvent(new Event('input', { bubbles: true })); entrada.dispatchEvent(new Event('change', { bubbles: true }));
        dialogo.close(); entrada.focus();
    }
    function cambiar() {
        const y = Number(anio.value), m = Number(mes.value);
        if (!/^\d{1,4}$/.test(anio.value) || y < 1 || y > ahora().getFullYear()) {
            error.textContent = `Escribe un año entre 1 y ${ahora().getFullYear()}.`;
            dias.replaceChildren();
            get('.mes-anterior').disabled = true; get('.mes-siguiente').disabled = true;
            return;
        }
        year = y; month = y === ahora().getFullYear() ? Math.min(m, ahora().getMonth()) : m; render();
    }
    anio.addEventListener('change', cambiar); mes.addEventListener('change', cambiar);
    anio.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); cambiar(); if (!error.textContent) dias.querySelector('[tabindex="0"]')?.focus(); } });
    for (const [selector, delta] of [['.mes-anterior', -1], ['.mes-siguiente', 1]]) get(selector).addEventListener('click', () => {
        const nuevo = fechaLocal(year, month + delta, 1);
        if (nuevo.getFullYear() < 1 || isoLocal(nuevo) > limite()) return;
        year = nuevo.getFullYear(); month = nuevo.getMonth(); render();
    });
    dias.addEventListener('keydown', event => {
        const actual = Number(event.target.dataset.dia); if (!actual) return;
        let siguiente; const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
        if (delta) siguiente = fechaLocal(year, month, actual + delta);
        else if (event.key === 'Home') siguiente = fechaLocal(year, month, 1);
        else if (event.key === 'End') siguiente = fechaLocal(year, month, diasDelMes(year, month));
        else if (event.key === 'PageUp' || event.key === 'PageDown') {
            const nuevo = fechaLocal(year, month + (event.key === 'PageUp' ? -1 : 1), 1);
            siguiente = fechaLocal(nuevo.getFullYear(), nuevo.getMonth(), Math.min(actual, diasDelMes(nuevo.getFullYear(), nuevo.getMonth())));
        } else return;
        event.preventDefault(); if (siguiente.getFullYear() < 1 || isoLocal(siguiente) > limite()) return;
        year = siguiente.getFullYear(); month = siguiente.getMonth(); diaEnfocado = siguiente.getDate(); render(true);
    });
    get('.borrar-fecha').addEventListener('click', () => elegir(''));
    get('.cerrar-fecha').addEventListener('click', () => dialogo.close()); get('.calendario-cerrar').addEventListener('click', () => dialogo.close());
    for (const input of entradas) {
        if (input.dataset.calendario) continue;
        input.dataset.calendario = 'listo'; input.max = limite();
        const wrapper = documento.createElement('div'); wrapper.className = 'fecha-con-control'; input.before(wrapper); wrapper.append(input);
        const button = documento.createElement('button'); button.type = 'button'; button.className = 'abrir-calendario';
        const nombre = input.getAttribute('aria-label') || input.labels?.[0]?.textContent || 'Fecha de nacimiento';
        button.setAttribute('aria-label', `Elegir ${nombre.toLowerCase()}`); button.setAttribute('aria-haspopup', 'dialog'); button.title = 'Elegir día, mes y año';
        button.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h3M14 15h3M7 18h3"/></svg>'; wrapper.append(button);
        const sincronizar = () => { button.disabled = input.disabled || input.readOnly; if (dialogo.open && entrada === input && !abierto()) dialogo.close(); };
        new MutationObserver(sincronizar).observe(input, { attributes: true, attributeFilter: ['disabled', 'readonly'] }); sincronizar();
        button.addEventListener('click', () => {
            if (input.disabled || input.readOnly) return;
            input.max = limite();
            entrada = input; const seleccion = interpretarFecha(input.value), fecha = seleccion && isoLocal(seleccion) <= limite() ? seleccion : ahora();
            year = fecha.getFullYear(); month = fecha.getMonth(); diaEnfocado = fecha.getDate();
            get('#tituloCalendarioNacimiento').textContent = nombre; render(); dialogo.showModal(); anio.focus(); anio.select();
        });
    }
}

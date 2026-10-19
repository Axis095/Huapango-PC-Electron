// Verificación visual en Electron real, reutilizable desde fuentes y ASAR.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function verificarPresentacion(ventana, vista, destino) {
    ventana.setContentSize(1280, 960);
    // El tamaño nativo puede aplicarse antes de que el renderer reciba resize.
    // Esperar su confirmación; no comparar una página aún en el viewport inicial.
    const resize = await ventana.webContents.executeJavaScript(`(async () => {
        const inicio = performance.now();
        const inicial = [innerWidth, innerHeight];
        while ((innerWidth !== 1280 || innerHeight !== 960) && performance.now() - inicio < 3000) {
            await new Promise(r => setTimeout(r, 30));
        }
        return { inicial, final: [innerWidth, innerHeight], esperaMs: Math.round(performance.now() - inicio) };
    })()`);
    const fuentes = await ventana.webContents.executeJavaScript(`(async () => {
        const familias = ['Montserrat', 'DM Sans', 'Space Grotesk'];
        const cargadas = await Promise.all(familias.map(f => document.fonts.load('400 16px "' + f + '"', 'Huapango áéíóú ñ')));
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, img => img.decode().catch(() => {})));
        await new Promise(r => setTimeout(r, 650));
        return {
            cargadas: cargadas.map(lista => lista.length > 0 && lista.every(f => f.status === 'loaded')),
            titulo: getComputedStyle(document.querySelector('h1')).fontFamily,
            cuerpo: getComputedStyle(document.body).fontFamily
        };
    })()`);
    assert.deepEqual(fuentes.cargadas, [true, true, true], 'Las familias deben existir y cargar, no usar fallback');
    assert.match(fuentes.titulo, /Space Grotesk/);
    assert.match(fuentes.cuerpo, /DM Sans/);
    const captura = await ventana.webContents.executeJavaScript(`(() => {
        const selectores = ['body', '.menu', 'h1', '.welcome-section', '.login-container', 'video'];
        const disposicion = Object.fromEntries(selectores.map(selector => {
            const nodo = document.querySelector(selector);
            if (!nodo) return [selector, null];
            const css = getComputedStyle(nodo), rect = nodo.getBoundingClientRect();
            return [selector, { fondo: css.backgroundColor, imagenFondo: css.backgroundImage,
                posicion: css.position, fuente: css.fontFamily, color: css.color,
                caja: [rect.x, rect.y, rect.width, rect.height].map(n => Math.round(n * 100) / 100) }];
        }));
        return { disposicion, viewport: { ancho: innerWidth, alto: innerHeight,
            cliente: document.documentElement.clientWidth, escala: devicePixelRatio } };
    })()`);
    const presentacion = { fuentes, disposicion: captura.disposicion };
    const entorno = {
        contenido: ventana.getContentSize(),
        ventana: ventana.getSize(),
        zoom: ventana.webContents.getZoomFactor(),
        viewport: captura.viewport, resize
    };
    fs.writeFileSync(path.join(destino, vista + '-entorno.json'), JSON.stringify(entorno, null, 2));
    console.log('ENTORNO_VISUAL:', vista, JSON.stringify(entorno));
    assert.deepEqual(entorno.contenido, [1280, 960], 'El ensayo requiere el mismo tamaño nativo');
    assert.equal(entorno.zoom, 1, 'El ensayo requiere zoom 100%');
    assert.equal(entorno.viewport.ancho, 1280, 'El viewport debe reflejar el tamaño solicitado');
    assert.equal(entorno.viewport.alto, 960, 'El viewport debe reflejar el tamaño solicitado');
    fs.writeFileSync(path.join(destino, vista + '-presentacion.json'), JSON.stringify(presentacion, null, 2));
    if (process.env.HUAPANGO_SMOKE_REFERENCIA) {
        const referencia = JSON.parse(fs.readFileSync(path.join(process.env.HUAPANGO_SMOKE_REFERENCIA, vista + '-presentacion.json'), 'utf8'));
        assert.deepEqual(presentacion, referencia, 'La composición visual debe conservar la referencia de fuentes');
        console.log('PARIDAD_OK:', vista);
    }
    fs.writeFileSync(path.join(destino, vista + '.png'), (await ventana.webContents.capturePage()).toPNG());
    if (vista !== 'menu') return;
    const video = await ventana.webContents.executeJavaScript(`(async () => {
        const v = document.querySelector('video');
        if (v.readyState < 2) await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error('No hay fotograma inicial sin pulsar play')), 10000);
            v.addEventListener('loadeddata', () => { clearTimeout(timer); resolve(); }, { once: true });
            v.addEventListener('error', () => { clearTimeout(timer); reject(Error('Error cargando video')); }, { once: true });
        });
        const portada = new Image();
        portada.src = v.poster;
        await portada.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 32; canvas.height = 18;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(portada, 0, 0, 32, 18);
        const pixels = ctx.getImageData(0, 0, 32, 18).data;
        let min = 255, max = 0;
        for (let i = 0; i < pixels.length; i += 4) {
            const brillo = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            min = Math.min(min, brillo); max = Math.max(max, brillo);
        }
        v.scrollIntoView({ block: 'center' });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const rect = v.getBoundingClientRect();
        return { pausado: v.paused, tiempo: v.currentTime, duracion: v.duration,
            ancho: v.videoWidth, alto: v.videoHeight, proporcion: rect.width / rect.height,
            contraste: max - min, autoplay: v.autoplay };
    })()`);
    assert.equal(video.pausado, true);
    assert.equal(video.autoplay, false);
    assert.equal(video.tiempo, 0);
    assert.ok(video.duracion > 90 && video.duracion < 105);
    assert.ok(video.ancho > 0 && video.alto > 0);
    assert.ok(Math.abs(video.proporcion - video.ancho / video.alto) < 0.01);
    assert.ok(video.contraste > 30, 'El fotograma inicial no debe ser negro');
    fs.writeFileSync(path.join(destino, 'video-inicial.png'), (await ventana.webContents.capturePage()).toPNG());
    const reproducido = await ventana.webContents.executeJavaScript(`(async () => {
        const v = document.querySelector('video');
        v.muted = true;
        await v.play();
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error('La reproducción no avanza')), 5000);
            const comprobar = () => { if (v.currentTime > 0) { clearTimeout(timer); v.removeEventListener('timeupdate', comprobar); resolve(); } };
            v.addEventListener('timeupdate', comprobar); comprobar();
        });
        v.pause();
        return v.currentTime;
    })()`, true);
    assert.ok(reproducido > 0);
    console.log('VISUAL_OK:', JSON.stringify({ fuentes, video, reproduccionManual: true }));
}
module.exports = { verificarPresentacion };

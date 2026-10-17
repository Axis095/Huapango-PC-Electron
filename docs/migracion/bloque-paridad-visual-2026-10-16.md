# F0-14 — Recuperación de tipografía y presentación del video

Fecha: 16 de octubre de 2026. Estado: corregido y verificado en fuentes y ASAR;
aceptación del usuario e instalación del nuevo paquete pendientes.
Referencia de solo lectura: C:/Users/raulc/Documents/HuapBkp/Huapango-PC-Electron.

## Defecto, evidencia y alcance antes del cambio

El usuario reportó diferencias visuales tras F0-09. Comparar los archivos confirma
que las familias Montserrat, DM Sans y Space Grotesk fueron sustituidas por fuentes
del sistema; el menú pasó a preload=none sin portada ni proporción reservada.
Los hashes del video y los dos logotipos coinciden con el respaldo. En los cuatro
CSS inicialmente comparados solo cambiaron imports y familias tipográficas.

Alcance: restaurar las familias originales mediante recursos locales, recuperar
la presentación inicial pausada del video y verificar fuentes/video en Electron
sin acceso a red. No cambiar controles de seguridad, SQL ni el respaldo.

Aceptación: familias originales realmente cargadas (no fallback), imagen inicial
y proporción correcta del video antes de pulsar play, reproducción manual válida,
capturas de login/menú/video inspeccionadas; regresión y smoke correctos. Verificar
también recursos y smoke en ASAR. Las pruebas anteriores no cubrían estos aspectos.

## Cambios realizados

- Restauradas las familias originales en los estilos de las vistas. fonts.css
  declara Montserrat, DM Sans y Space Grotesk con archivos variables locales.
  Procedencia, hashes y licencias OFL en Public/fonts/README.md. No se permite
  red en la CSP ni se agregaron dependencias npm.
- Video con preload=metadata, portada JPEG extraída del propio video en 0.5 s
  y proporción 16:9 reservada. Permanece pausado en 0:00; no se fuerza autoplay.
  El MP4 y los logotipos originales se conservan intactos.
- El primer ensayo con solo metadatos detectó un fotograma negro. Se añadió
  portada explícita y se repitió la prueba; así la presentación no depende del
  comportamiento inicial del decodificador de video.
- scripts/verificar-presentacion.cjs amplía el smoke: carga real de las tres
  familias, estilos de título/cuerpo, portada decodificable y no negra, duración,
  proporción, estado pausado y avance de reproducción al solicitar play.
  El smoke bloquea HTTP/HTTPS y conserva capturas de login, menú y video.
- Se retiró la aserción antigua que exigía preload=none: comprobaba una decisión
  de implementación que causaba la regresión. Su sustitución comprueba el
  comportamiento visual en Electron y mantiene las aserciones de CSP.

## Evidencia de esta sesión

- npm.cmd test: **238/238**, cero fallos, 924.2088 ms.
- Smoke de fuentes y ASAR: **VISUAL_OK y SMOKE_OK** sin acceso HTTP/HTTPS.
  Tres familias cargadas; video 1920×1080, 96.53551 s, proporción 16:9,
  pausado en cero y reproducción manual correcta.
- Capturas inspeccionadas: login legible, menú con tipografías recuperadas,
  portada visible a 800×450 dentro del reproductor. Resolución del ensayo:
  1280×960; usuario ficticio operador (admin/resultados se ocultan por su rol).
  No se confunden esas restricciones con una diferencia de diseño.
- Capturas de fuentes: .tmp/fase0-smoke-a1ZjJn; del primer ASAR:
  .tmp/fase0-smoke-wDqy9h. Son evidencia local ignorada por Git.
- Build de laboratorio NSIS correcto; fuentes, licencias, portada y HTML
  comprobados byte a byte dentro del ASAR. Firma: NotSigned. Se conserva la
  variante signAndEditExecutable=false ya documentada en F0-13.
- Verificación final del paquete: VISUAL_OK y SMOKE_OK; capturas en
  .tmp/fase0-smoke-bzU36X. Instalador: dist/HuapangoApp Setup 1.0.0.exe.
  SHA-256: F4FC0361FAA79677769C58A04E7C342EFFB18D27389E1F40B088FC4D0FD6BDBE.
- Respaldo utilizado solo para lectura; sin conexiones/escrituras en la base
  del evento. No corresponde repetir integración SQL al no haber cambios SQL.

## Autoevaluación y siguiente paso

La corrección recupera la familia tipográfica y la presentación inicial del video
sin retirar las mejoras de seguridad. Los archivos locales evitan depender del
acceso a Google Fonts o de su caché. Las capturas aportadas tienen dimensiones
distintas; no se afirma igualdad píxel a píxel entre equipos, zoom o escalas.

El smoke no certifica todas las vistas, audio audible ni instalación/actualización.
Siguiente acción: comparar esta build en la PC del usuario con igual resolución,
escala y zoom; incorporar cualquier diferencia restante al ensayo funcional.
Fase 0 sigue abierta. No se realizó commit ni publicación.

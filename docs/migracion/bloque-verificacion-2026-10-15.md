# F0-11 a F0-13 — Errores públicos, recuperación de sesión y distribución

Fecha: 15 de octubre de 2026. Base: `fd1b0da` más cambios de trabajo.
Estado: avance verificado; **Fase 0 abierta**. No se creó commit ni se publicó.

## F0-11 — Mensajes de error sin detalles privados

Defecto: los controladores podían devolver mensajes del driver con SQL, valores,
rutas o detalles internos. Hallazgo M12, limitado aquí a exposición de errores.

Cambio: `Seguridad/errores.js:mensajePublico` centraliza códigos de dominio
permitidos y mensajes genéricos de integridad/fallo interno. Los controladores
admin, pareja, categoría, estilo, evaluaciones y PDF usan ese límite; los modelos
conservan los códigos originales y los logs afectados registran el código.

Aceptación y evidencia: `tests/erroresPublicos.test.cjs` verifica que SQL, rutas y
valores de un error desconocido no llegan al usuario; los errores de dominio
siguen siendo explicativos. Incluido en la regresión completa de esta revisión.

Autoevaluación: sanitizar errores no crea auditoría operativa durable. M12 sigue
parcial; falta actor, operación, resultado y consulta de historial sin secretos.

## F0-12 — Regresiones detectadas al revisar los cambios

La revisión independiente identificó dos fallos reproducibles antes del cierre:

1. Revocación devolvía SESSION_EXPIRED sin abrir acceso; inactividad devolvía
   FORBIDDEN y dejaba la única ventana sin posibilidad de reingreso.
2. Los eventos open-section y abrir-ventana-emergente no reservaban la operación.
   Durante configuración, la revalidación encontraba CONFIGURATION_BUSY y
   revocaba una cuenta que seguía siendo válida.

Cambios: `main.js:registrarEvento` aplica la reserva antes de la autenticación.
`Seguridad/ipc.js:proteger` reconoce una sesión pendiente de recuperar y llama
`main.js:recuperarSesion` únicamente desde emisores locales válidos. Main oculta
las ventanas anteriores y abre un solo login con explicación visible.

Al reautenticarse la misma cuenta/rol, se conservan las ventanas y borradores
en memoria. Con cuenta o rol distintos se cierran las anteriores antes de esperar
la carga de la nueva principal, evitando IPC de una ventana antigua con la nueva
identidad. Una sesión expirada no obtiene permisos de configuración inicial.
Cerrar el login de recuperación termina la aplicación, según avisa esa pantalla.

Pruebas: `tests/recuperacionSesion.test.cjs` cubre los cinco escenarios anteriores;
la caducidad exacta usa reloj inyectado en `sesionRevocacion.test.cjs`. Smoke real
de Electron prueba reingreso conservando ventana, desde fuentes y desde ASAR.
No se esperaron físicamente 30 minutos; la prueba de recuperación usa la misma
salida de sesión nula que produce el gestor tras el vencimiento.

Autoevaluación: recuperación solo dentro del proceso vivo. Un apagón o cierre
descarta borradores; M8 continúa abierto. Los contadores de intentos se reinician
al cerrar el proceso. Falta ensayo visual completo de cambio de rol y de foco.

## F0-13 — Verificación de artefactos de laboratorio

El build normal encontró falta de privilegio para extraer enlaces simbólicos de
winCodeSign. Se utilizó una configuración temporal que copia `package.json:build`
y agrega `win.signAndEditExecutable=false`. No se alteraron privilegios Windows,
versiones de dependencias ni configuración normal del proyecto.

Para reproducir esa variante, desde la raíz del proyecto:

```powershell
New-Item -ItemType Directory -Force .tmp | Out-Null
$configLaboratorio = (Get-Content package.json -Raw | ConvertFrom-Json).build
$configLaboratorio.win | Add-Member -NotePropertyName signAndEditExecutable -NotePropertyValue $false -Force
$configLaboratorio | ConvertTo-Json -Depth 20 | Set-Content .tmp/build-laboratorio.json -Encoding utf8
npm.cmd run build -- --win --x64 --publish never --config .tmp/build-laboratorio.json
$env:HUAPANGO_SMOKE_APP_ROOT = Join-Path (Get-Location) 'dist/win-unpacked/resources/app.asar'
npm.cmd run test:smoke
Remove-Item Env:HUAPANGO_SMOKE_APP_ROOT
```

Se verifican archivos de ejecución dentro del ASAR contra fuentes y ausencia de
configuración privada, ensayos, uploads y documentos. El smoke usa Electron real
con módulos/vistas del ASAR, perfil temporal y SQL simulado. No ejecuta el
instalador ni certifica actualización, firma o primer arranque de una instalación.

La firma Authenticode del instalador de laboratorio es **NotSigned**. Los mensajes
de electron-builder sobre signtool no equivalen a una firma válida.

Artefacto final: `dist/HuapangoApp Setup 1.0.0.exe`.
SHA-256: `446D44CD6A12CF58642D1D8EB7EDF7213799D7D2DD684E09334E1E20465BD8A2`.
La generación concluyó con código 0. Se comprobaron 79 archivos de ejecución
contra las fuentes; el smoke del ASAR final también concluyó con código 0.

## Evidencia consolidada y pendientes

- Regresión: **238/238 correctas**, cero fallos (fuera del sandbox; 849.5409 ms).
  Tras reforzar la aserción de cierre previo a cargar otra identidad, sus cinco
  casos dirigidos volvieron a pasar (5/5).
- Smoke de fuentes y ASAR: **SMOKE_OK**, incluida recuperación de sesión.
- MySQL aislado: evidencia del [bloque de integridad](bloque-integridad-2026-10-14.md),
  dos esquemas y tres índices comprobados únicamente en servidor temporal.
- Instalador de laboratorio generado; instalación limpia pendiente.
- Base del evento: no se aplicaron índices, migraciones ni escrituras de ensayo.

Los primeros intentos dentro del sandbox fallaron al manipular temporales y
arrancar Electron. La repetición autorizada fuera del sandbox pasó; esos fallos
de entorno no se ocultaron ni se corrigieron relajando validaciones del producto.

La [reevaluación 360°](reevaluacion-fase-0-2026-10-14.md) conserva todos los IDs
anteriores. M9 incorpora ahora reingreso verificado; C2 incluye también eventos.
H8 sigue parcial y el diagnóstico general provisional de 7/10 no cambia.

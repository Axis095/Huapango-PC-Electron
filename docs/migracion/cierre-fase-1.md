# Control de cierre de Fase 1

18 de octubre de 2026. **Fase 1 abierta por decisión del usuario; Fase 2 no iniciada.**

## Decisión vigente

El usuario responde: **«Mantener Fase 1 abierta hasta probar identidad final»**.
No se adopta el cierre técnico reducido propuesto abajo. El laboratorio correcto
queda como evidencia complementaria; no sustituye el ensayo del instalador con
appId com.huapango.app, producto HuapangoApp y perfil original.

Siguiente acción: primera instalación y actualización de identidad final en otra
cuenta/PC/VM aislada. No se usará la sesión actual para sustituir Huapango.
No se reabre la pregunta de cierre reducido ni se avanza a Fase 2 por inferencia.

Actualización del 19 de octubre: el usuario solicita preparar el commit de los
avances en `codex/fase-1-vite`, dejando explícito que la integración está en
validación y se realizarán pruebas antes de cerrar Fase 1 y pasar a Fase 2.
Es un checkpoint de avance; no sustituye el ensayo de identidad final ni la
aceptación pendiente. [Registro y comprobaciones de preparación](fase-1.md#checkpoint-de-avance-para-validación-de-integración--19-de-octubre-de-2026).

Material preparado en `.tmp/f1-06/kit-identidad-final/`: base `2e913c3`, candidato
F1-05, manifiesto de hashes, verificador de solo lectura y hoja de resultados.
Los instaladores tienen identidad final: ejecutarlos únicamente en el entorno
separado. Preparar el kit no instala ni configura MySQL ni abre la aplicación.

## Propuesta anterior, no adoptada

El tooling está implementado y verificado: compilación Main/preload, Vite
multipágina, rutas, build desde build/app, inspección ASAR y NSIS. Se conserva la
interfaz; no se migraron vistas a React ni se tiparon los contratos del legado.

F1-06 añade instalación y actualización nativas **con identidad de laboratorio**,
porque el usuario solo dispone de su sesión actual. Catorce casos, recursos
offline, independencia del proyecto y retirada del laboratorio correctos.
El código compilado coincide con F1-05; nombres, appId y perfil son distintos
para no sustituir Huapango. [Evidencia y hashes](fase-1.md#f1-06--ensayo-de-instalación-y-actualización--18-de-octubre-de-2026).

Se propone cerrar el alcance técnico y conservar la instalación con identidad
final, en otra cuenta/PC, como condición operativa antes de usar datos del evento.
Esa instalación no fue ejecutada ni aceptada aquí; tampoco una PC Windows limpia.
No hay firma Authenticode ni certificación de producción. Hasta aceptar el alcance,
la fase permanece abierta. No se autoriza por inferencia merge, push ni publicación.

## Puertas y autoevaluación

| Pilar / puerta | Evidencia y límite |
| --- | --- |
| Arquitectura / F1-01/02 | Entrada compilada y preload aislado; EXE independiente de fuentes. Contratos y tipado integral en Fase 2. |
| Seguridad / F1-03 | Guards y roles conservados; EXE ignora origen dev inválido. C1/H3/H6/H7 siguen para despliegue operativo. |
| Presentación / F1-04 | Diez vistas y paridad dev/ASAR; fuentes, portada y video locales también desde EXE. No se infiere aceptación manual universal. |
| Rendimiento | Video duplicado y JS crudo retirados de distribución. M3/M4, capacidad/listados, antes de migrar sus vistas. |
| Calidad | Viewport sincronizado, guard de paquete con negativos y persistencia nativa. H5/M12 e historial; M8 y recuperación durable siguen en Fase 2. |
| Dependencias/distribución / F1-05 | NSIS compilado identificado; sin actualizaciones ajenas. Firma e identidad final pendientes. M14 conserva su aplazamiento. |
| QA / F1-06 | 14 casos nativos con MySQL real, PDF e independencia offline. Actualización manual 1.0.0 sobre 1.0.0; no auto-update. |
| Aceptación/Git | Checkpoint de avance solicitado en codex/fase-1-vite; aceptación del cierre y promoción pendientes. |

Regresión del último cambio de producto: **256/256**, tipos y smoke correctos,
registrados en F1-05. No se repitió en F1-06 sin cambios de producto; los nuevos
ensayos nativos son evidencia separada. La base del fork y su PR conservan su
decisión de promoción independiente.

## Transición después del cierre completo

Después del ensayo final y su aceptación: registrar la decisión y el candidato, guardar el
hito según el flujo del fork e iniciar contratos de API/preload. Inventariar
consumidores; definir solicitudes, respuestas, errores y validación runtime;
migrar por operación conservando roles, autoría, integridad, borradores y casos
negativos. No comenzar por rediseñar la UI o retirar el JavaScript heredado.

H5/M12 y M8 conservan su destino antes de migrar sus vistas. La instalación final
es una puerta de salida de Fase 1, no deuda trasladada por esta sesión.
No repetir los ensayos acreditados sin cambio de
candidato, fallo nuevo o una condición todavía no cubierta.

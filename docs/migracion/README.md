# Control de la migración

## Método de trabajo

Para separar la versión funcional del fork y promover entregas mediante PR,
consultar la [guía de organización del fork y fases](flujo-fork-y-fases.md).
Incluye comandos PowerShell, aislamiento de trabajo/datos, aceptación y recuperación.
Su adopción está en curso; el [registro operativo](flujo-fork-y-fases.md#13-adopción-del-flujo--17-de-octubre-de-2026)
distingue ramas publicadas, pruebas actuales y aceptación pendiente. No cierra fases.

Cada modificación se agrupa en un bloque auditable con identificador estable.
Antes de editar: registrar defecto, evidencia, alcance y criterio de aceptación.
Después: ejecutar regresiones pertinentes, revisar el diff y registrar resultado,
riesgo residual y siguiente acción. Un test simulado no certifica Electron ni MySQL.

Estados: pendiente → en curso → verificado por pruebas → validado en aplicación.
Un bloque con limitaciones se marca parcial, nunca aprobado por suponer éxito.
No rebajar validaciones de producción para satisfacer fixtures incompletos.
Tras cada merge, volver a medir la línea base y revisar módulos reales.

## Puertas de salida

| Fase | Evidencia necesaria | Estado |
| --- | --- | --- |
| 0 | Cierre técnico acotado según F0-17/18; deuda con destino explícito | Cerrada en ese alcance; validación manual/operativa pendiente en [acta](cierre-fase-0.md) |
| 1 | TS/Main/preload, Vite multipágina, rutas y build funcionales | F1-01 a F1-05 verificadas; F1-06 de laboratorio correcta. [Fase abierta](cierre-fase-1.md) hasta ensayar identidad final, por decisión del usuario. |
| 2 | Contratos y API específica, validación en ejecución y consumidores adaptados | Pendiente |
| 3 | Paridad por vista, pruebas de permisos/errores y rollback | Pendiente |
| 4 | Retirada selectiva del legado y ensayo de instalación/actualización | Pendiente |

## Estado vigente · 19 de octubre de 2026

**Checkpoint de avance de Fase 1.** Por solicitud del usuario se prepara el
commit en `codex/fase-1-vite` con los avances de distribución, sincronización del
ensayo visual y evidencia de F1-05/06. La integración permanece en validación:
se realizarán pruebas para comprobar que todo esté bien integrado antes de
cerrar Fase 1 y pasar a Fase 2. El ensayo de identidad final sigue siendo una
puerta obligatoria. Guardar este avance no aprueba el cierre ni promueve ramas.
El [registro del checkpoint](fase-1.md#checkpoint-de-avance-para-validación-de-integración--19-de-octubre-de-2026)
separa las comprobaciones de este acto de las pruebas históricas del 18.

**Decisión vigente del usuario:** mantener Fase 1 abierta hasta probar identidad
final. No se adopta el cierre reducido propuesto después del laboratorio; no se
inicia Fase 2. El [control de cierre](cierre-fase-1.md) identifica la puerta y el
kit preparado para otra cuenta/PC/VM. No se requiere repetir lo ya acreditado.

**F1-06: instalación/actualización de laboratorio correctas.** El usuario solo
dispone de la sesión actual; se usó identidad exclusiva para no sustituir Huapango.
Catorce casos nativos con MySQL real: configuración, fotos, persistencia, roles,
evaluación, reinicio y PDF. El EXE funciona fuera del proyecto con recursos offline
y sin node_modules en sus ancestros. Laboratorio retirado y MySQL apagado;
evidencia y datos ficticios conservados.

El código coincide con F1-05; la identidad NSIS/manifiesto es de laboratorio.
Instalador final sin cambios, no instalado con su identidad original. La propuesta
de cierre reducido no fue adoptada; se conserva la fase abierta como se indica
arriba. Evidencia al final de la bitácora.

**Continuidad de Fase 1.** La diferencia de paridad se reprodujo: tamaño nativo
1280×960, pero renderer todavía en 784×535. El ensayo ahora espera y comprueba
su resize antes de medir, sin cambiar CSS ni relajar la comparación. Dev y ASAR
compilado coinciden con la referencia de fuentes; evidencia de entorno guardada.

**F1-05 implementada.** Build compila y empaqueta build/app; inspección del ASAR
correcta, diez vistas y un video, sin datos privados ni herramientas del proyecto.
NSIS generado y candidato identificado por hash; identidad final no instalada ni publicada.
F1-06 añadió posteriormente el ensayo nativo de laboratorio indicado arriba.
Resultados actuales, límites y siguiente paso al final de [la bitácora](fase-1.md).

### Registro anterior y constancias recibidas

### Constancias de evidencias recibidas · 18 de octubre de 2026

- [Base estable: recorrido y PDF de Evidencia1](constancia-base-estable-2026-10-18.md).
- [Fase 1: pruebas, recorrido y paquete de Evidencia2](constancia-fase-1-2026-10-18.md).

Estas constancias añaden el material aportado por el usuario, sin ejecutar nuevas
pruebas ni promover ramas. El lote de Fase 1 muestra smoke dev correcto y paridad
del compilado; no acredita comparación de paridad dev con referencia para cerrar
el fallo previo. El build aportado tampoco demuestra distribución desde build/app.
Los registros siguientes conservan su contexto histórico del 17 de octubre;
la continuidad de hoy arriba y en la bitácora añade la nueva evidencia.

**Control Git y nueva comprobación.** El trabajo F1-03/04 quedó guardado en
`e19042d`, rama `codex/fase-1-vite`. Regresión 252/252, tipos, compilación y smoke
de fuentes/compilado correctos; Vite falla dos veces al comparar la geometría del
menú. Login sí coincide. No promover esa entrega hasta resolver la diferencia.
La base `2e913c3` tiene rama independiente y [PR #1 del fork](https://github.com/cazarau/Huapango-PC-Electron-refactorizacion/pull/1)
en borrador: 245/245, tipos, smoke de fuentes/compilado e integración MySQL con
Electron correctos. El usuario prefiere ensayarla antes de fusionar; se abrió un
laboratorio manual con perfil y servidor propios. `main` sigue en `7de3b2e`.
Detalle y siguiente acción en el registro operativo y al final de la bitácora.

**Evidencia previa de F1-03/04.** Vite multipágina y resolver común para navegación, IPC y
borradores; servidor limitado a frontend/loopback. Regresión 252/252 y smoke en
fuentes, Vite y compilado correctos. Comparación de estilos/geometría de login y
menú correcta tras preservar el orden CSS. Próximo trabajo: F1-05/06, distribución
desde la salida compilada e instalación/actualización. Detalle en la bitácora.

Contraste posterior de revisión externa: `/` restringida es comportamiento
esperado, aclarado en consola/README. Regresión 252/252 y smoke Vite con referencia
explícita correctos, incluido PARIDAD_OK y cierre del servidor. El reporte posterior
de ventana ausente permitió reproducir y corregir windowsHide del lanzador: dev
interactivo ya muestra la ventana, confirmado por el usuario. Regresión 252/252
y smoke Vite con paridad y cierre correctos tras la corrección. La apertura manual
del compilado, el recorrido de negocio y la instalación mantienen sus pendientes;
evidencia en [la bitácora](fase-1.md).

**Hito de cierre técnico de Fase 0 y apertura de Fase 1.** El usuario solicita
guardar esta transición en un commit. El [acta](cierre-fase-0.md) registra el
alcance reducido acordado, la evidencia previa y los pendientes trasladados.
La primera entrega de Fase 1 está verificada; la fase completa sigue en curso.

**F0-18 / inicio de Fase 1.** Pase automático por capas correcto: 245/245,
smoke de fuentes y laboratorio MySQL en Node/Electron. El modo Electron comprueba
dos fotos reales; ambos generan PDF y prueban ingreso de cuentas nuevas. Se
habilita tooling con deuda explícita y validación manual/operativa pendiente.
La primera entrega F1-01/02 dejó TypeScript/Vite fijados, compilación en build/app,
typecheck y smoke correctos. F1-03/04 añadió posteriormente Vite y rutas seguras;
instalación queda para el paquete compilado final.

**F0-17: ruta mínima.** Por solicitud del usuario, la transición se concentra en
tres pasos: acotar pendientes, un pase de aceptación crítica y registro de
entrada a Fase 1. Ver el [control de cierre](cierre-fase-0.md), que define destinos
de deuda y qué defectos siguen bloqueando. Referencia guardada: `98331dc`.
Historial/recuperación se programan en Fase 2; capacidad antes de migrar vistas
afectadas; instalación completa sobre el paquete compilado en Fase 1.
Ese ajuste documental no ejecutó código; el pase posterior F0-18 aporta la
evidencia y la decisión de entrada registradas arriba.

[F0-16: evaluación y transición](evaluacion-transicion-2026-10-17.md) compara los
27 hallazgos con los seis pilares y las puertas de salida. Regresión repetida:
245/245; smoke de fuentes correcto, incluidas presentación, cuentas y salida.
Integración MySQL y smoke ASAR correctos son evidencia previa de F0-15, no nuevas
ejecuciones de F0-16. Instalador de laboratorio identificado por hash; falta
ensayar instalación/actualización del candidato.

**La preparación técnica permite avanzar; la deuda permanece abierta.**
Historial/reporte, recuperación durable, controles de despliegue y capacidad
conservan sus hallazgos con destino en F0-17. La siguiente acción es registrar el
ensayo de la base antes de promover su PR. La paridad dev y la distribución
compilada se revalidaron posteriormente en F1-05; instalación/actualización y
aceptación completa de Fase 1 mantienen sus pendientes.

Correcciones recientes: [F0-14, presentación](bloque-paridad-visual-2026-10-16.md)
y [F0-15, cuentas y salida](bloque-cuentas-salida-2026-10-17.md). La conformidad
general del usuario no se convierte en aprobación individual de todas las pruebas.

- [Bitácora, cambios y autoevaluación](fase-0.md)
- [Inventario de permisos IPC](inventario-ipc.md)
- [Ensayo manual y casillas de evidencia](ensayo-fase-0.md)
- [Cobertura V01–V10/F01–F17](revision-pruebas-2026-10-17.md)
- [Guía de primera instalación y preparación del laboratorio](../guia-primera-instalacion.md)

## Evidencia histórica

La [bitácora inicial](fase-0.md), el [checkpoint del 14](checkpoint-fase-0-2026-10-14.md),
la [reevaluación del 14](reevaluacion-fase-0-2026-10-14.md) y la
[verificación del 15](bloque-verificacion-2026-10-15.md) conservan sus resultados
originales. Las cifras de 188/233/238 pruebas, el estado de dependencias y las
comprobaciones de instalación anteriores no certifican el candidato actual.
Los documentos externos de plan/traspaso también son históricos; prevalecen las
decisiones actuales del usuario y el control de cierre con su evidencia.

## Autoevaluación por bloque

Usar la evaluación vigente y el control de cierre para escoger el siguiente
bloque. El checkpoint histórico aporta el inventario de origen; no reemplaza
el estado actual ni las comprobaciones de la sesión en curso.

1. ¿El defecto se reprodujo o solo se infirió? ¿Qué prueba lo detecta?
2. ¿Se preservaron los cambios ajenos y los flujos autorizados?
3. ¿Se comprueba ausencia de efectos cuando se rechaza una operación?
4. ¿Se cubren errores y reintentos sin duplicar escrituras?
5. ¿La prueba atraviesa la frontera modificada o la sustituye por un mock?
6. ¿Quedan rutas, dependencias o recursos que solo fallarían al distribuir?
7. ¿El estado documentado coincide con lo ejecutado? ¿Qué no se probó?

Cada fase tendrá su bitácora, inventario de cambios, evidencia y pendientes.
El diagnóstico anterior se conserva como fotografía histórica; no se sobrescribe.

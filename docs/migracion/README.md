# Control de la migración

## Método de trabajo

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
| 1 | TS/Main/preload, Vite multipágina, rutas y build funcionales | En curso; primera entrega en [bitácora](fase-1.md) |
| 2 | Contratos y API específica, validación en ejecución y consumidores adaptados | Pendiente |
| 3 | Paridad por vista, pruebas de permisos/errores y rollback | Pendiente |
| 4 | Retirada selectiva del legado y ensayo de instalación/actualización | Pendiente |

## Estado vigente · 17 de octubre de 2026

**Hito de cierre técnico de Fase 0 y apertura de Fase 1.** El usuario solicita
guardar esta transición en un commit. El [acta](cierre-fase-0.md) registra el
alcance reducido acordado, la evidencia previa y los pendientes trasladados.
La primera entrega de Fase 1 está verificada; la fase completa sigue en curso.

**F0-18 / inicio de Fase 1.** Pase automático por capas correcto: 245/245,
smoke de fuentes y laboratorio MySQL en Node/Electron. El modo Electron comprueba
dos fotos reales; ambos generan PDF y prueban ingreso de cuentas nuevas. Se
habilita tooling con deuda explícita y validación manual/operativa pendiente.
Primera entrega F1-01/02: TypeScript/Vite fijados, compilación en build/app,
typecheck y smoke del árbol compilado correctos. La segunda entrega conectará
Vite con las rutas/seguridad; instalación queda para el paquete compilado final.

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
conservan sus hallazgos con destino en F0-17. La siguiente acción es F1-03/04:
integrar Vite multipágina y la identificación de rutas/origen en conjunto.

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

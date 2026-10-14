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
| 0 | Autenticación, permisos, arranque, integridad y ensayo funcional documentados | En curso; ver [bitácora](fase-0.md) |
| 1 | TS/Main/preload, Vite multipágina, rutas y build funcionales | Pendiente |
| 2 | Contratos y API específica, validación en ejecución y consumidores adaptados | Pendiente |
| 3 | Paridad por vista, pruebas de permisos/errores y rollback | Pendiente |
| 4 | Retirada selectiva del legado y ensayo de instalación/actualización | Pendiente |

## Estado de la revisión del 12 de octubre de 2026

188/188 pruebas correctas tras corregir IDs numéricos devueltos como texto;
smoke de Electron real correcto con SQL simulado;
instalación limpia verificada. Auditoría npm: cero avisos de producción, ocho
moderados en tooling. Fase 0 sigue abierta: ensayo real y decisiones pendientes.

- [Bitácora, cambios y autoevaluación](fase-0.md)
- [Inventario de permisos IPC](inventario-ipc.md)
- [Ensayo manual y casillas de evidencia](ensayo-fase-0.md)
- [Guía de primera instalación y preparación del laboratorio](../guia-primera-instalacion.md)

## Autoevaluación por bloque

Checkpoint actual: [avance de Fase 0 del 14 de octubre](checkpoint-fase-0-2026-10-14.md).
Incluye las decisiones de guardado, el estado de dependencias y el inventario
de pendientes de la auditoría 360°. Las verificaciones del 12 de octubre de arriba
son históricas y no certifican el empaquetador modificado posteriormente.

1. ¿El defecto se reprodujo o solo se infirió? ¿Qué prueba lo detecta?
2. ¿Se preservaron los cambios ajenos y los flujos autorizados?
3. ¿Se comprueba ausencia de efectos cuando se rechaza una operación?
4. ¿Se cubren errores y reintentos sin duplicar escrituras?
5. ¿La prueba atraviesa la frontera modificada o la sustituye por un mock?
6. ¿Quedan rutas, dependencias o recursos que solo fallarían al distribuir?
7. ¿El estado documentado coincide con lo ejecutado? ¿Qué no se probó?

Cada fase tendrá su bitácora, inventario de cambios, evidencia y pendientes.
El diagnóstico anterior se conserva como fotografía histórica; no se sobrescribe.

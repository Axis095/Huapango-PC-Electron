# Reevaluación del avance de Fase 0 · 14 de octubre de 2026

Base Git: `fd1b0da` más los cambios de este bloque. No es el acta de cierre.

Actualización del 15 de octubre: la [revisión integrada](bloque-verificacion-2026-10-15.md)
corrige recuperación de sesión (M9) y reserva de eventos (C2), con 238/238 pruebas
y smoke de fuentes/ASAR. La evidencia de 233 pruebas de abajo corresponde a la
primera revisión; el instalador de laboratorio ya se generó y permanece sin
firma y sin ensayo de instalación. La puntuación y el estado abierto se mantienen.
Decisiones del usuario: una sola PC; una evaluación definitiva por juez/pareja,
sin corrección posterior. Solo juez y administrador evalúan.

## A. Resumen ejecutivo y semáforo de salud

**Puntuación: 7/10, provisional.** Mejoran identidad, revocación, integridad,
límites y evidencia MySQL real. Siguen faltando cierre de credenciales heredadas,
recuperación durable, registro operativo y validación de distribución.

| Pilar | Estado | Resumen |
| --- | --- | --- |
| Arquitectura | 🟡 Atención | La operación completa tiene una reserva y existen módulos comunes; Main/render siguen acoplados. |
| Seguridad | 🟡 Atención | CSP, revalidación, límites e identidad reforzados; dos credenciales de la instalación requieren revisión y persiste confianza en el SO. |
| Rendimiento | 🟡 Atención | Cola/esperas y borradores acotados; listados/reportes aún no paginados ni medidos a escala. |
| Calidad | 🟡 Atención | Regresión ampliada y errores públicos comunes; falta auditoría operativa durable y separar más responsabilidades. |
| Dependencias/build | 🔴 Crítico para distribución | Se conserva el empaquetador aplazado; el build normal encuentra un requisito de privilegios de Windows. |
| QA | 🟡 Atención | Regresión y laboratorio real aportan evidencia; faltan ensayo visual completo e instalación limpia. |

### Evidencia utilizada

- `npm.cmd test`: **233/233**, cero fallos, 792.4992 ms en esta ejecución.
- Smoke Electron: login, preload, roles, navegación y borradores; SQL simulado.
- MySQL 8.0.46 temporal: mismos casos sobre esquema de laboratorio y copia vacía
  del esquema histórico. Datos ficticios; puertos/directorios independientes.
- Pruebas reales: alta bcrypt/VARCHAR, migración de contraseña, revocación por rol,
  IDs 7/07 distintos, carreras de asignación/evaluación/edición, rollback y borrado.
- Tres índices propuestos aplicados y comprobados únicamente en la copia temporal.
- Base local configurada: solo SELECT y SHOW CREATE TABLE. Cinco tablas InnoDB;
  no se ejecutaron DDL ni escrituras sobre el evento. Cero grupos duplicados en
  los tres conteos; dos credenciales fuera del patrón bcrypt esperado.
- `git diff --check`: correcto. No se ejecutó una nueva remediación de dependencias.

## B. Hallazgos detallados y trazabilidad

### 🔴 Críticos / riesgo alto

**C2 — Cambio de base durante escrituras y limpieza: corregido en código y probado.**
Ubicación: `Servicios/operaciones.js`, `main.js:registrarIPC`, `db.js`.
La reserva abarca la promesa completa y bloquea cambio/guardado mientras hay
operaciones. Pruebas de reserva, reentrada y fallos; se conserva resultado incierto
sin reintento automático. Falta el caso visual con archivos en el ensayo final.

**C1 — Frontera de confianza: alcance aclarado; control de despliegue pendiente.**
Ubicación: `Modelos/configModel.js:guardarConfiguracion`, `db.js:opcionesConexion`.
La aplicación está destinada a una sola PC. Su RBAC no protege frente a quien
controle la cuenta de Windows, modifique el programa o use directamente la cuenta
MySQL. No se exige una arquitectura de red para un escenario que el usuario descartó.
Recomendación: documentar usuarios de SO autorizados, permisos de configuración y
GRANT mínimos. Un futuro cliente externo requerirá revisar esa frontera.

### 🟠 Altos abiertos o parcialmente cubiertos

**H3 — Credenciales heredadas pendientes de completar.**
Ubicación: `Controladores/authController.js:crearAutenticador` y diagnóstico 002.
El login correcto migra mediante comparación binaria de la contraseña anterior;
una actualización concurrente no se sobrescribe. Dos filas de la base configurada
requieren revisión. La compatibilidad no puede retirarse aún sin riesgo de bloqueo.
Recomendación: completar migración/restablecimiento administrado y retirar después
la rama heredada. No publicar contraseñas ni hashes en la bitácora.

**H5/H6/H7 — Restricciones de BD y función de registros generales.**
Ubicación: `sql/000-esquema-observado-2026-10-14.sql`, `sql/003-unicidad-fase0.sql`,
`Modelos/pdfModel.js:generarPDFRegistrosGenerales`.
La aplicación serializa asignaciones/evaluaciones aun con el esquema histórico,
pero SQL directo todavía puede insertar duplicados. La tabla t_registros_generales
no existe en la instalación observada; ese reporte no queda funcional allí.
Recomendación: respaldar y aplicar índices revisados; definir/implementar un registro
operativo real antes de habilitar su reporte como función terminada.

**H8/M14 — Distribución y ensayo de instalación incompletos.**
Ubicación: `package.json:devDependencies/build`, `scripts/smoke-fase0.cjs`.
Build normal: winCodeSign falla al extraer enlaces simbólicos por falta de privilegio.
Los avisos del empaquetador conservado se aplazaron expresamente; no se reinterpretan
como resueltos. Un instalador de laboratorio sin edición/firma del ejecutable no
acredita el flujo normal de distribución.
Recomendación: resolver el entorno de build y decidir el tratamiento de dependencias;
ensayar instalación/primer arranque/actualización sobre perfil limpio.

### 🟡 Medios pendientes

| ID / título | Ubicación | Problema e impacto residual | Recomendación |
| --- | --- | --- | --- |
| M3 Listados y reportes completos | parejaModel.js:buscarTodasLasParejas; pdfModel.js:generarPDFParejas | Materializan todos los registros; sin límite de capacidad certificado. | Paginación/lectura por lotes y prueba con volumen representativo. |
| M4 Trabajo pesado en Main | almacenFotos.js:guardar; pdfModel.js:escribirPDF | Decodificación/dibujo síncronos pueden bloquear la interfaz. | Medir demora del event loop y aislar tareas según el resultado. |
| M8 Recuperación | borradorRegistroController.js:6; borradorModificacionController.js:6; almacenFotos.js:conFotos | Borradores en memoria; no hay reconciliación tras apagón entre SQL y archivos. | Persistencia/recuperación y ensayo de interrupción; mantener backups conjuntos. |
| M9 Sesión expirada | sesionModel.js; Seguridad/ipc.js:proteger; main.js:recuperarSesion | Reingreso implementado y probado el 15/10; contadores no persistentes y ensayo visual pendiente. | Validar foco, cambio de rol y borradores en ensayo visual; decidir persistencia de límites. |
| M11 Separación de responsabilidades | main.js; Public/js/render.js | Continúan controladores grandes y acoplamiento a DOM/rutas. | Extraer servicios de forma incremental con contratos antes de migrar vistas. |
| M12 Auditoría operativa | Controladores; pdfModel.js:generarPDFRegistrosGenerales | Errores públicos ya sanitizados; falta registro durable con actor, operación y resultado. | Añadir trazabilidad sin payload sensible y conectar su reporte. |

### 🔵 Bajos pendientes

**L1:** `package.json:scripts.clean` depende de rimraf transitivo; no hay CI
incorporada. El empaquetado ahora usa lista explícita de carpetas de ejecución.
Recomendación: herramienta directa o script nativo y CI con checks reproducibles.

**L3:** fuentes remotas retiradas y video con preload=none; el recurso de video
conserva su tamaño. Recomendación: medir/optimizar tamaño sin perder contenido.

### Matriz completa del inventario anterior

“Verificado” significa comprobación del cambio descrito; no sustituye el ensayo
funcional de cierre ni declara lista para producción toda la aplicación.

| ID | Resultado actual | Evidencia / límite |
| --- | --- | --- |
| C1 | Alcance aclarado; control pendiente | Una PC; revisar permisos Windows/MySQL. |
| C2 | Verificado | operaciones/conexionSegura; laboratorio y reserva del handler. |
| H1 | Verificado | U001/006 y rechazo de coerciones; MySQL real. |
| H2 | Verificado, ensayo final pendiente | Revocación real por rol, baja segura simulada; no cancela operaciones ya autorizadas. |
| H3 | Parcial | Migración CAS real; dos cuentas requieren revisión. |
| H4 | Implementado; no aplica a conexión local sin TLS | Tests de configuración; sin certificación de servidor remoto. |
| H5 | Parcial | Estructura real versionada, diferencias conocidas; reporte general pendiente. |
| H6 | Verificado en aplicación; índice real pendiente | Envío concurrente idempotente y corrección rechazada en ambos esquemas. |
| H7 | Verificado en aplicación; índices reales pendientes | Carrera con dos conexiones permite una asignación. |
| H8 | Parcial | Regresión, MySQL y smoke; faltan ensayo visual e instalación. |
| M1 | Verificado | CSP y texto seguro; estilos inline aún permitidos. |
| M2 | Verificado | Cola, espera, timeout y descarte; sin reintento de escrituras. |
| M3 | Pendiente | Listados/reportes sin paginación. |
| M4 | Pendiente | Sin medida de capacidad/latencia de UI representativa. |
| M5 | Verificado | Límites y rechazo sin perder borrador. |
| M6 | Verificado | Coalescencia de 1000 ediciones y fotos por delta. |
| M7 | Verificado | Conflicto bajo lock; test real de dos actualizaciones concurrentes. |
| M8 | Pendiente | Volatilidad y reconciliación tras interrupción. |
| M9 | Parcial | Intentos/inactividad y reingreso probados; contadores persistentes no implementados. |
| M10 | Mejorado | Contraseñas sin trim, IDs/longitudes; falta completar contrato de todas las vistas históricas. |
| M11 | Parcial | Nuevos módulos comunes y retirada de código muerto en pareja; Main/render siguen grandes. |
| M12 | Parcial | mensajePublico y logs sin error SQL completo; falta auditoría durable. |
| M13 | Verificado | PDF anterior intacto ante fallo; advertencia de apertura. |
| M14 | Aplazado por el usuario | No actualizado ni cerrado. |
| L1 | Parcial | Lista explícita de build; clean/CI pendientes. |
| L2 | Verificado en suscripciones | Cancelación idempotente; API genérica sigue limitada por allowlist. |
| L3 | Parcial | Fuentes locales/sistema; tamaño del video pendiente. |

## C. Plan de acción para lo restante

1. **Riesgos inmediatos:** completar credenciales heredadas, revisar control local
   de credenciales SQL y preparar aplicación administrada de los tres índices.
   Resolver el reporte de registros generales con datos de auditoría reales.
2. **Estabilización:** recuperar borradores y reconciliar fotos; ensayo visual de reautenticación;
   medir y limitar listados/PDF/decodificación. Repetir pruebas afectadas.
3. **Cierre funcional:** completar el ensayo por roles y fallos en aplicación,
   resolver build normal y probar instalador en perfil limpio. Reevaluar los seis
   pilares con esta matriz; solo entonces decidir cierre de Fase 0.

No se abre Fase 1 ni se cambia el criterio de conclusión solicitado por el usuario.

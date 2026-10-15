# Control de cierre de Fase 0

Inicio: 14 de octubre de 2026. Base: `fd1b0da`.
Estado: **en curso; no autoriza iniciar Fase 1**.

Actualizado: 15 de octubre de 2026. Regresión 238/238; smoke de fuentes y ASAR
correctos, MySQL temporal probado en dos esquemas. Instalador de laboratorio
generado, sin firma; no se ejecutó instalación ni ensayo visual completo.

El criterio solicitado por el usuario es ejecutar pruebas funcionales y repetir
la auditoría 360°, cubriendo los hallazgos de la evaluación anterior.
Una prueba unitaria o un riesgo documentado no equivalen a un hallazgo cerrado.
Se conserva el aplazamiento de advertencias del empaquetador decidido antes del
checkpoint: no se actualizan dependencias por sorpresa.

## Método y alcance

| Bloque | Hallazgos | Aceptación | Estado actual |
| --- | --- | --- | --- |
| Identidad | H1, H2, H3, M9, M10 | IDs, revocación, protección de administradores, migración e intentos limitados | Código y regresión verificados; credenciales heredadas y ensayo pendientes |
| Conexión | C2, H4, M2 | Exclusión durante operaciones completas; TLS remoto y límites | Reserva de invokes/eventos y límites probados; TLS sin servidor remoto real |
| Cliente | M1, M5, M6, L2, L3 | CSP, límites IPC, guardado ordenado y suscripciones cancelables | Regresión y smoke correctos; ensayo visual y tamaño de video pendientes |
| Integridad | H5, H6, H7, M7 | Esquemas versionados, concurrencia e idempotencia | MySQL aislado correcto; índices en instalación real y reporte general pendientes |
| Archivos y operación | M8, M12, M13 | Recuperación, PDF y errores sanitizados | PDF/errores verificados; persistencia y auditoría operativa pendientes |
| Capacidad y estructura | M3, M4, M11, L1 | Medición, separación y build comprobable | Parcial; faltan capacidad, paginación y deuda estructural |
| Frontera y distribución | C1, H8, M14 | Confianza, integración, ensayo visual e instalador | Una PC confirmada; laboratorio probado; distribución normal e instalación pendientes |

## Bitácoras y trazabilidad

- [Identidad, credenciales y revocación](bloque-identidad-2026-10-14.md).
- [F0-08: conexión](bloque-conexion-2026-10-14.md).
- [F0-09: cliente](bloque-cliente-2026-10-14.md).
- [F0-10: integridad y MySQL aislado](bloque-integridad-2026-10-14.md).
- [F0-11/12/13: errores, recuperación y distribución](bloque-verificacion-2026-10-15.md).
- [Reevaluación de los seis pilares y matriz de todos los hallazgos](reevaluacion-fase-0-2026-10-14.md).

Cada bloque debe enlazar su bitácora con defecto, cambio, pruebas ejecutadas,
autoevaluación y riesgo residual. La auditoría final debe rastrear todos los IDs
del [checkpoint](checkpoint-fase-0-2026-10-14.md), incluso los no corregidos.

## Puertas obligatorias

1. Regresión automática completa y smoke Electron correctos sobre la revisión final.
2. Prueba de integración en MySQL aislado, con datos ficticios y motor InnoDB.
3. Ensayo funcional por roles, fallos, reintentos, fotos, reportes y configuración.
4. Generación e instalación en perfil limpio, con evidencia de recursos/configuración.
5. Nueva auditoría de los seis pilares: cada hallazgo cerrado con evidencia o
   pendiente explícito. Ningún bloqueante puede omitirse ni darse por aceptado.
6. Decisión de cierre registrada después de las pruebas, no antes.

No se utiliza la BD del evento para pruebas de escritura. El laboratorio, si se
levanta con el MySQL instalado, usa un directorio y puerto independientes y no
modifica el servicio existente ni su configuración.

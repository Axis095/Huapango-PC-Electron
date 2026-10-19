# Control de cierre de Fase 0

Inicio: 14 de octubre de 2026. Base: `fd1b0da`.
Estado: **cierre técnico acotado de Fase 0 registrado; Fase 1 abierta.
La validación funcional manual completa y operativa sigue pendiente**.

## Acta de cierre técnico y apertura de Fase 1

17 de octubre de 2026. El usuario solicita preparar el commit de cierre de
Fase 0 y apertura de Fase 1, después de acordar la ruta mínima de F0-17 y
conocer los resultados de F0-18 y de la primera entrega de compilación.

- Alcance del cierre: estabilización técnica necesaria para continuar la
  migración. Referencia anterior recuperable: `98331dc`; este hito incorpora
  el laboratorio ampliado y F1-01/02, cuya evidencia está en la
  [bitácora de Fase 1](fase-1.md).
- Evidencia del bloque anterior: regresión final 245/245, MySQL aislado en
  Node/Electron, fotos y PDF reales, compilación/typecheck y smoke del compilado
  correctos. Preparar este commit solo añade el acta y revisa documentación/diff;
  no se presentan esas ejecuciones como pruebas nuevas de este acto.
- Deuda trasladada: H5/M12 y M8 a Fase 2; capacidad M3/M4 antes de migrar vistas
  afectadas; C1/H3/H6/H7 para despliegue operativo. H8 e instalación/actualización
  se validan con el paquete compilado de Fase 1. M14 mantiene su aplazamiento.
- Alcance pendiente: aceptación manual completa y operación/instalación. Este
  cierre no cambia los hallazgos pendientes a corregidos ni certifica producción.
- Siguiente trabajo: F1-03/04, Vite multipágina y resolución segura de vistas y
  origen de desarrollo. La Fase 1 completa permanece en curso.

## F0-18 — Ejecución del pase crítico

17 de octubre de 2026. El usuario solicita avanzar por la ruta mínima.
Se reutilizan regresión, smoke y laboratorio; se completan dos huecos concretos:
login de las cuentas recién creadas y generación real de PDF. El laboratorio
admite además ejecutarse con Electron para comprobar fotos con el decodificador
real y MySQL juntos. No se cambia lógica de producción ni se usa la BD del evento.
Aceptación: seis grupos críticos con evidencia identificada, sin fallos nuevos
y con límites manuales explícitos; registrar resultado antes de abrir tooling.

### Resultado y decisión

Regresión actual: **245/245**, cero fallos, 1008.9269 ms. Smoke de fuentes:
**VISUAL_OK / CUENTAS_SALIDA_OK / SMOKE_OK**, perfil `.tmp/fase0-smoke-S3b6bc`.
Laboratorio con Electron real y MySQL temporal en ambos esquemas:
**MYSQL_INTEGRACION_OK**, evidencia `.tmp/mysql-fase0-2NO5k4`.

| Grupo crítico | Resultado del pase automático | Límite conservado |
| --- | --- | --- |
| Acceso/roles | Alta y login de nuevas cuentas admin/user/juez con MySQL real; permisos y revocación en regresión/smoke. | Formulario y MySQL se verifican en capas distintas; no se certifica un E2E conjunto de toda la UI. |
| Registro | Dos fotos generadas con Electron, decodificadas y guardadas en disco/SQL; categoría/estilo y consultas reales en ambos esquemas. | Revisión visual de las fotos en formularios pendiente. |
| Modificación/errores | Conflicto y rollback reales; duplicados sin filas extra; conservación de campos y fotos en regresión. | No se repite toda la lista manual V/F. |
| Evaluación/salida | Reenvío único y cambio rechazado en MySQL; confirmación/cancelación y cierre nativo de ventana en smoke. | Audio/foco y todos los tiempos de espera manuales no certificados. |
| Presentación/reportes | Fuentes/video y navegación en Electron; PDFKit genera parejas/resultados con datos SQL y estructura PDF comprobada. | Diagramación de PDF e instalación pendientes; reporte general sigue incompleto. |
| Integridad/configuración | Reserva, permisos y configuración en regresión; carreras, borrado de relaciones y limpieza de fotos en laboratorio real. | Controles y DDL sobre instalación del evento no se ejecutan aquí. |

No se detectaron fallos nuevos del código de producción. Los duplicados SQL de
las salidas corresponden a rechazos esperados. Se completó el pase **automático
por capas**, sin convertirlo en aceptación manual ni cierre operativo completo.

Decisión técnica conforme al alcance reducido solicitado: **iniciar Fase 1 con
el candidato `98331dc` como referencia y los pendientes de F0-17 abiertos**.
El código de producción del candidato no cambió durante este pase; se amplió el
laboratorio. La instalación completa se valida con el paquete compilado de Fase 1.

Comando adicional reproducible, desde PowerShell en la raíz:

```powershell
& .\node_modules\.bin\electron.cmd scripts/integracion-fase0.cjs
```

El comando estándar con Node sigue disponible y no prueba el decodificador
nativo. Ambos modos usan directorio/puerto propios y datos ficticios. El servidor
temporal se apaga al terminar; no se altera servicio ni configuración del evento.

Autoevaluación: se cubrieron huecos concretos sin introducir servicios nuevos,
retirar controles ni crear otro ciclo de auditorías. La evidencia visual/manual
pendiente queda visible; habilitar tooling no afirma que esos casos se ejecutaron.

## F0-17 — Ruta mínima solicitada por el usuario

17 de octubre de 2026. Referencia recuperable: commit `98331dc`, publicado en
el fork. El usuario solicita reducir el tiempo y los procesos necesarios para
pasar a Fase 1. Esta decisión acota el orden de F0-16: el objetivo inmediato es
habilitar la migración del tooling conservando la aplicación; los pendientes
funcionales y de operación conservan su estado y trazabilidad.

Defecto del plan anterior: convertía mejoras independientes del compilador en
trabajos extensos previos a la transición. Alcance de este ajuste: planificación
y criterios de entrada; sin cambios de código, dependencias ni datos.
Aceptación: una secuencia de tres pasos, deuda con destino explícito y una sola
validación final pertinente. No declarar corregidos los hallazgos aplazados.

### Tres pasos para habilitar Fase 1

1. **Acotar pendientes, en el orden ya propuesto.** Aplicar la tabla siguiente.
   Corregir antes de avanzar cualquier fallo reproducible de autenticación,
   permisos, guardado, duplicación o integridad que afecte los flujos activos.
2. **Un único pase de aceptación crítica.** Confirmar los seis grupos de abajo
   sobre el candidato identificado. Usar la evidencia automática de `98331dc`;
   repetir regresión/smoke si se modifica código. Repetir integración cuando
   cambien SQL, esquema, transacciones o concurrencia. No repetir suites por
   editar Markdown ni generar otro instalador de la misma base sin cambios.
3. **Registrar la transición.** Anotar resultados, fallos y deuda trasladada;
   habilitar Fase 1 al pasar el conjunto crítico. La instalación/actualización
   completa se comprobará con su paquete compilado, antes del cierre de Fase 1.

| Orden previo / hallazgos | Mínimo antes de Fase 1 | Trabajo posterior y condición de cierre |
| --- | --- | --- |
| 1. Historial/reporte, H5/M12 | Identificarlo como función incompleta; el botón existe en Administrador y no tiene historial operativo que respalde el reporte. No incluirlo entre los reportes aprobados ni crear una tabla vacía como arreglo. | Resolver durante Fase 2, antes de migrar Administración en Fase 3: eventos, permisos, almacenamiento y PDF comprobados. |
| 2. Recuperación, M8 | Conservar aislamiento por ventana, protección ante errores y fotos referenciadas; declarar que cerrar el proceso pierde borradores. | Recuperación durable y reconciliación durante Fase 2, antes de migrar registro/modificación. Fallos nuevos que pierdan datos confirmados siguen siendo bloqueantes inmediatos. |
| 3. Instalación real, C1/H3/H6/H7 | Mantener controles existentes y laboratorio ya comprobado; no usar la BD del evento como ensayo. | Credenciales heredadas, permisos y aplicación administrada de índices siguen pendientes para el despliegue operativo. La migración de tooling no requiere DDL sobre el evento. |
| 4. Capacidad, M3/M4 | Revisar que el recorrido crítico no presente bloqueos observados; no afirmar capacidad certificada. | Medir antes de migrar listados/reportes en Fase 3; paginar/aislar tareas según evidencia. Un bloqueo reproducible durante la aceptación se atiende ahora. |
| 5. Distribución, H8 | Conservar hash y smoke ASAR existentes como referencia; el instalador de laboratorio no certifica instalación. | Resolver build reproducible y ensayar instalación/actualización en F1-05/06, sobre el paquete que realmente se va a conservar. |
| 6. Reevaluación/cierre | Actualizar estados de la matriz existente y registrar el resultado del pase crítico. | Revisión afectada por cada cambio; auditoría completa antes del despliegue operativo. M14 mantiene el aplazamiento ya solicitado. |

### Aceptación crítica consolidada

| Grupo | Confirmación necesaria |
| --- | --- |
| Acceso y roles | Admin, user y juez acceden a sus vistas; acciones prohibidas rechazadas; cuenta nueva puede ingresar. |
| Registro | Pareja ficticia con ambas fotos, categoría y estilo; consulta posterior coherente. |
| Modificación y errores | Guardado confirmado, entrada inválida y duplicado conservan formulario; conflicto no sobrescribe cambios. |
| Evaluación y salida | Juez guarda una evaluación, reenvío idéntico no duplica, cambio posterior rechazado; cancelar/confirmar cierre funcionan. |
| Presentación y reportes activos | Menú, fuentes, portada/play y navegación correctos; PDF de parejas/resultados utilizable. El reporte general queda identificado como pendiente. |
| Integridad y configuración | Permisos/revocación, rechazo durante cambio ocupado y atomicidad respaldados por regresión/laboratorio; cualquier fallo nuevo del recorrido se registra y resuelve. |

La conformidad general anterior no completa automáticamente esta tabla. Registrar
el resultado de cada grupo en este archivo, sin multiplicar informes ni exigir
repetir todos los casos V/F ya ejecutados. La lista completa continúa como
referencia de regresión, no como seis proyectos nuevos previos al tooling.

Resultado de F0-17: ruta acotada y documentos alineados; entrada a Fase 1 todavía
pendiente del resultado explícito del pase crítico. Las pruebas anteriores son
evidencia previa; no se ejecutaron pruebas de código por este ajuste documental.

## Evidencia anterior

Última revisión: 17 de octubre de 2026,
[F0-16: estado, hallazgos y transición](evaluacion-transicion-2026-10-17.md).
Regresión repetida 245/245 y smoke de fuentes correctos. Integración MySQL en dos
esquemas y smoke ASAR siguen como evidencia previa de F0-15. Hash del instalador
de laboratorio verificado; instalación/actualización pendientes.

La conformidad general del usuario se registra sin completar automáticamente
los casos V/F. Las correcciones de presentación, alta de cuentas y cierre del
juez están verificadas automáticamente; la [lista V/F](revision-pruebas-2026-10-17.md)
detalla la aceptación manual pendiente. AGENTS ya contiene las reglas aprobadas.

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
| Cliente | M1, M5, M6, L2, L3 | CSP, límites IPC, guardado ordenado y suscripciones cancelables | Fuentes/portada/reproducción verificadas; ensayo visual global y tamaño de video pendientes |
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
- [F0-14: tipografía original y portada del video](bloque-paridad-visual-2026-10-16.md).
- [F0-15: cuentas, cierre del juez y verificación](bloque-cuentas-salida-2026-10-17.md).
- [Cobertura V01–V10 y F01–F17](revision-pruebas-2026-10-17.md).
- [F0-16: evaluación vigente de seis pilares y 27 hallazgos](evaluacion-transicion-2026-10-17.md).
- [Reevaluación histórica del 14 de octubre](reevaluacion-fase-0-2026-10-14.md).
- [Preparación de Fase 1, pendiente de cierre](plan-fase-1.md).

Cada bloque debe enlazar su bitácora con defecto, cambio, pruebas ejecutadas,
autoevaluación y riesgo residual. La auditoría final debe rastrear todos los IDs
del [checkpoint](checkpoint-fase-0-2026-10-14.md), incluso los no corregidos.

## Validación completa pendiente

F0-17 concentra la entrada a Fase 1 en el pase crítico y la deuda identificada.
El siguiente conjunto conserva el alcance de validación completa de F0-16;
instalación y mejoras aplazadas no se consideran aprobadas por iniciar tooling.

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

## Secuencia pendiente

Secuencia amplia de F0-16, conservada como referencia. Para ejecución inmediata
prevalecen los tres pasos y destinos de F0-17, arriba.

1. Historial operativo y reporte general (H5/M12).
2. Recuperación de borradores y reconciliación de fotos (M8).
3. Preparar y verificar credenciales, índices y controles locales (C1/H3/H6/H7).
4. Medir capacidad y corregir cuellos de botella demostrados (M3/M4).
5. Completar ensayo funcional, distribución e instalación del candidato (H8).
6. Reevaluar y registrar cierre. Los aplazamientos explícitos de F0-17 permanecen
   abiertos y no se contabilizan como hallazgos corregidos.

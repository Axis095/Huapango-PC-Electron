# F0-16 — Evaluación del estado y preparación de la transición

Fecha: 17 de octubre de 2026. Base: `cb8c93f71adf036bfe62836d0ebac7fd93c78500`
con cambios locales de F0-14/F0-15, AGENTS y documentación todavía sin commit.
Estado: **evaluación terminada; Fase 0 abierta; Fase 1 no iniciada**.

## Motivo, alcance y aceptación del bloque

El usuario considera satisfactorio el avance y solicita comparar el estado de
Fase 0 con lo necesario para continuar a Fase 1. El índice mezclaba evidencias de
12, 15, 16 y 17 de octubre bajo un mismo encabezado histórico. La matriz del 14
no recogía todavía la corrección visual ni el cierre del juez.

Alcance: contrastar los 27 hallazgos anteriores con código, pruebas y bitácoras;
repetir regresión/smoke de fuentes; ordenar el control de cierre y preparar la
secuencia de transición. No modificar código, dependencias, BD ni HuapBkp.
Aceptación: cada hallazgo tiene estado y siguiente acción; cada puerta distingue
evidencia automática, histórica y manual; el plan no da por cerrada Fase 0.

## A. Dictamen y seis pilares

**La estabilización está avanzada, pero todavía no hay evidencia suficiente para
cerrar Fase 0.** Se conserva la valoración orientativa **7/10** de la reevaluación
anterior; no es un porcentaje de cumplimiento ni una nueva certificación integral.
Las correcciones recientes mejoran los flujos, pero no resuelven los pendientes
de recuperación, auditoría operativa, capacidad e instalación.

| Pilar | Estado | Evaluación actual |
| --- | --- | --- |
| Arquitectura | 🟡 Atención | Separación Electron y reservas de operación comprobadas; Main/render y validación de rutas siguen acoplados al árbol de fuentes. |
| Seguridad | 🟡 Atención | Roles, autoría, revocación y validaciones tienen regresión; falta verificar controles del despliegue local y completar credenciales heredadas. |
| Rendimiento | 🟡 Atención | Conexiones, esperas y payloads acotados; listados/PDF sin paginación ni medida representativa de memoria y respuesta. |
| Calidad | 🟡 Atención | Errores públicos y salida mejorados; faltan recuperación durable, historial operativo y completar contratos del legado. |
| Dependencias y distribución | 🔴 Bloquea la validación de distribución | Existe instalador de laboratorio; el build ordinario y la instalación/actualización del candidato no están certificados. Los avisos aplazados no se reabren aquí. |
| Pruebas | 🟡 Atención | Regresión y smoke actuales correctos; integración/ASAR anteriores documentados; ensayo manual individual e instalación pendientes. |

Esta revisión recorre los seis pilares y reconcilia el inventario conocido. No
incluye pentest, análisis nuevo de CVE, medición de carga ni inspección de datos
actuales del evento. No afirma ausencia de otros defectos.

### Qué mejoró respecto de la evaluación anterior

- F0-14 recuperó tipografías con archivos locales y portada de video; el smoke
  comprueba carga sin HTTP/HTTPS, proporción, pausa inicial y reproducción manual.
- F0-15 conserva códigos SQL en altas para distinguir duplicados/permisos sin
  revelar consultas; la causa exacta del fallo de la instalación del usuario no
  se puede deducir de su mensaje genérico anterior.
- Cerrar sesión desde Resultados ahora confirma/cancela, reserva la operación,
  vuelve al acceso y cierra ventanas anteriores. Se comprueban también sus fallos.
- AGENTS incorpora los criterios aprobados de continuidad, paridad y aceptación.

El comentario «hasta el momento lo veo bien» se registra como conformidad general
con el avance. No se asignan aprobaciones a casos V/F que no se individualizaron.

## B. Evidencia y límites

| Comprobación | Resultado | Procedencia y límite |
| --- | --- | --- |
| Regresión `npm.cmd test` | **245/245**, cero fallos; 1002.05 ms | Ejecutada de nuevo en esta evaluación, fuera del sandbox. |
| Primer intento de regresión | Fallos de acceso a temporales de arranque | El sandbox devolvió ENOENT; repetición autorizada fuera de él correcta, sin cambiar tests ni código. |
| `npm.cmd run test:smoke` | **VISUAL_OK, CUENTAS_SALIDA_OK, SMOKE_OK** | Ejecución actual, Electron real y SQL simulado; perfil `.tmp/fase0-smoke-9Wnhfm`. ER_DUP_ENTRY es el rechazo esperado del caso duplicado. |
| Integración MySQL | Correcta en dos esquemas | Evidencia previa de F0-15, `.tmp/mysql-fase0-fmUJmP`; no repetida en este bloque documental. |
| Smoke ASAR | Correcto | Evidencia previa de F0-15, `.tmp/fase0-smoke-ija8pu`; no repetido ahora. |
| Instalador existente | SHA-256 coincide con F0-15 | Hash recalculado ahora; no demuestra instalación ni correspondencia completa de todo el árbol de trabajo. |
| Base del evento | Sin nueva inspección ni escritura | Los resultados de estructura/duplicados/credenciales del 14 son históricos. |
| Markdown | Enlaces locales y diff revisados | Se comprueban después de actualizar los documentos; no sustituyen pruebas de aplicación. |

Instalador de laboratorio: `dist/HuapangoApp Setup 1.0.0.exe`.
SHA-256: `85B1DDF8D8E4FED40038D63C9FFF9D5F47E73F76DACFE4381BA030E5DC082D00`.
No se generó otro instalador, ni se hizo commit/publicación en este bloque.

## C. Matriz completa de hallazgos

Los IDs conservan la severidad de la [auditoría anterior](reevaluacion-fase-0-2026-10-14.md).
«Verificado» describe el control concreto, no el cierre funcional de la fase.
Las referencias de código son relativas a la raíz y nombran funciones estables.

| ID | Estado contrastado y ubicación | Acción/evidencia restante |
| --- | --- | --- |
| C1 | Alcance de una PC confirmado. `Modelos/configModel.js:guardarConfiguracion` conserva credenciales de MySQL en configuración local. | Verificar permisos de Windows, cuenta SQL de privilegio mínimo y restauración de respaldo SQL/fotos. No exigir un backend de red para este alcance. |
| C2 | Verificado: `Servicios/operaciones.js` y `main.js:registrarIPC` reservan handlers completos; cierre también exclusivo. | Ensayo visual de cambio de conexión durante operación con fotos; no interrumpir una escritura del evento. |
| H1 | Verificado: identidad VARCHAR, U001/006 y claves 7/07; `Seguridad/identidad.js` y pruebas de autenticación/integración. | Conservar estas propiedades en tipos y contratos; no convertir IDs a números al migrar. |
| H2 | Verificado automáticamente: revocación, autoeliminación y último administrador protegidos. `Modelos/sesionModel.js`, `Modelos/adminModel.js`. | Completar ensayo por roles y bajas ficticias en interfaz; no cancela retroactivamente una operación ya autorizada. |
| H3 | Parcial: `Controladores/authController.js:crearAutenticador` conserva rama de contraseña heredada y migración CAS. | Recontar sin mostrar valores; completar migración/restablecimiento administrado y probar retirada de compatibilidad. Las dos filas detectadas el 14 no son un conteo actual. |
| H4 | Configuración TLS remota protegida por código/tests; `db.js:opcionesConexion`. | Para uso loopback en una PC no se exige servidor TLS remoto. No afirmar que una conexión remota real se ensayó. |
| H5 | Parcial: esquema histórico versionado; `Modelos/pdfModel.js:generarPDFRegistrosGenerales` consulta una tabla ausente en el diagnóstico anterior. `Seguridad/datos.js:validarSolicitud` suspende dos actualizaciones. | Resolver historial/reporte y documentar el alcance de categorías/estilos; no habilitar SQL incompatible ni describirlo como CRUD completo. |
| H6 | Evaluación única definitiva verificada en aplicación/laboratorio; `Modelos/evaluacionesModel.js`, `sql/003-unicidad-fase0.sql`. | Diagnóstico actual y aplicación administrada del índice en instalación objetivo, con respaldo/restauración probados. |
| H7 | Asignaciones serializadas y carreras comprobadas; `Modelos/asignacionModel.js`. | Igual preparación para índices de categoría/estilo; no borrar duplicados automáticamente. |
| H8 | Parcial: regresión, integración y smoke de paquete; `package.json:build`. | Instalar/actualizar candidato en perfil limpio y completar ensayo; el ASAR por sí solo no lo acredita. |
| M1 | Verificado: CSP y DOM seguro; tipografías locales preservan presentación. | Mantener pruebas negativas y paridad; estilos inline permitidos siguen siendo una limitación. |
| M2 | Verificado: límites de pool/cola/espera y descarte por timeout; `db.js`. | Conservar error de resultado incierto sin reintento automático; medir capacidad con carga. |
| M3 | Abierto: `Modelos/parejaModel.js:buscarTodasLasParejas` y reportes materializan conjuntos completos. | Medir con volumen representativo y definir paginación/lotes si excede el presupuesto acordado. No hay capacidad certificada. |
| M4 | Abierto: `Modelos/almacenFotos.js:guardar` decodifica imagen; `Modelos/pdfModel.js:escribirPDF` dibuja en Main. | Medir event loop, memoria y respuesta; decidir aislamiento de trabajo según resultados. |
| M5 | Verificado: tamaño/formato/payload rechazados antes de escritura. | Mantener casos límite y corrección del formulario al migrar. |
| M6 | Verificado: coalescencia y envío de fotos por delta. | Mantener aislamiento por ventana y probar navegación con fotos en instalación. |
| M7 | Verificado: `Modelos/versionPareja.js` y actualización bajo bloqueo detectan conflicto. | Ensayar conservación de campos en dos ventanas. Es versión por contenido, no historial de revisiones. |
| M8 | Abierto: WeakMap en ambos controladores de borrador; `Modelos/almacenFotos.js:conFotos` no tiene reconciliación durable. | Diseñar recuperación ante cierre/apagón y probar interrupciones SQL/archivos sin borrar fotos referenciadas; definir retención/privacidad de borradores persistidos. |
| M9 | Parcial: intentos/inactividad, reingreso y salida probados; contadores solo en memoria. | Ensayo de espera/foco real y decisión explícita sobre persistencia de límites en una PC; reiniciar proceso reinicia contadores. |
| M10 | Mejorado: límites e identidad validados en ejecución; no existe contrato tipado integral. | Completar inventario de entradas/respuestas/errores; contratos compartidos en Fase 2 sin retirar validación runtime. |
| M11 | Parcial: módulos comunes extraídos; `main.js` y `Public/js/render.js` conservan responsabilidades extensas. | Separación gradual en Fases 2/3 con pruebas; no reescribir vistas durante Fase 1. |
| M12 | Parcial: `Seguridad/errores.js:mensajePublico` y códigos conservados en altas; falta historial durable. | Registrar actor/operación/resultado de forma sanitizada y conectar reporte. Un documento Markdown de auditoría no sustituye el historial de la aplicación. |
| M13 | Verificado: PDF temporal y renombrado al completar, advertencia si no se abre. | Inspeccionar contenido/paginación de PDFs reales del laboratorio. |
| M14 | Aplazado expresamente por el usuario. | Conservar aplazamiento sin declarar avisos resueltos; no actualizar dependencias en este bloque. |
| L1 | Parcial: allowlist de distribución; `package.json:scripts.clean` usa rimraf transitivo y no hay CI incorporada. | En Fase 1 hacer compilación/limpieza reproducibles y checks automáticos; preservar fuentes y datos. |
| L2 | Suscripciones cancelables verificadas; `preload.js` mantiene API genérica con allowlist. | Retirar API genérica solo en Fase 2 al migrar todos sus consumidores. |
| L3 | Paridad visual mejorada en F0-14: fuentes locales, poster y metadata del video. | Tamaño del video sin optimizar; medir distribución antes de comprimir y preservar contenido. |

### Pendientes funcionales que requieren atención antes de aprobar

1. **Historial/reporte general (H5/M12):** no basta con crear una tabla vacía;
   hace falta definir eventos, actor, resultado, acceso y retención, producir
   registros reales y comprobar que no contienen secretos ni datos personales.
2. **Recuperación (M8):** las pruebas actuales cubren excepciones en proceso,
   no apagón entre guardar fotos y confirmar SQL ni reinicio con borradores.
3. **Instalación (H8):** el error de privilegios/enlaces simbólicos del build
   normal es distinto de los avisos de dependencias aplazados. El instalador
   de laboratorio evita edición/firma del ejecutable; esa variante no certifica
   automáticamente la distribución definitiva.
4. **Esquema/credenciales/control local (C1/H3/H6/H7):** falta cerrar el procedimiento
   sobre la instalación objetivo, sin usarla como laboratorio ni publicar datos.
5. **Capacidad (M3/M4):** no existe medida suficiente para afirmar rendimiento
   adecuado al evento. Se requiere volumen de parejas/jueces/fotos representativo.

No se trasladan estos pendientes a otra fase como si estuvieran resueltos. El
desacoplamiento, tipado y sustitución de UI sí tienen lugar en el plan posterior;
cualquier aplazamiento adicional de un criterio de cierre requiere decisión
explícita, impacto documentado y evidencia compensatoria.

## D. Puertas de salida contrastadas

| Puerta | Estado | Qué falta para considerarla satisfecha |
| --- | --- | --- |
| 1. Regresión/smoke de revisión final | Correctos en el árbol actual | Repetir sobre el candidato final tras los cambios restantes e identificarlo sin ambigüedad. |
| 2. MySQL aislado | Evidencia previa correcta en dos esquemas | Repetir cuando cambien esquema/SQL/transacciones; vincular ejecución al candidato final. |
| 3. Ensayo funcional por roles | Parcial, conformidad general del usuario | Individualizar V01–V10/F01–F17, fallos, fotos, reportes, configuración y reintentos. |
| 4. Generación e instalación | Parcial | Build reproducible, perfil limpio, primer arranque, actualización, recursos offline y preservación de configuración/datos. |
| 5. Reevaluación y hallazgos | Matriz reconciliada; pendientes abiertos | Resolver bloqueantes; documentar evidencia por ID y tratamiento explícito de deuda restante. |
| 6. Decisión de cierre | Pendiente | Acta de cierre con candidato, evidencia, riesgos aceptados y autorización de transición. |

## E. Orden propuesto para terminar Fase 0

| Orden | Bloque propuesto | Entregable verificable |
| --- | --- | --- |
| 1 | Historial operativo y reporte general, H5/M12 | Diseño de eventos/privacidad/acceso, esquema de laboratorio y pruebas de éxito, fallo y rollback; PDF con registros verificables. |
| 2 | Recuperación y consistencia de fotos, M8 | Política de borradores y reconciliación, interrupciones controladas, reinicio y recuperación sin duplicación ni borrado de archivos en uso. |
| 3 | Preparación de instalación real, C1/H3/H6/H7 | Diagnóstico sanitizado reciente, respaldo/restauración ensayados y procedimiento revisable de credenciales/índices/permisos. Las escrituras sobre la base objetivo se tratan por separado. |
| 4 | Capacidad, M3/M4 | Dataset ficticio representativo, memoria/tiempo/UI medidos y límites definidos; corregir cuellos de botella demostrados. |
| 5 | Candidato funcional y distribución, H8 | Lista V/F individual, build/install/update en perfil aislado, comparaciones visuales y nueva regresión integral. |
| 6 | Cierre | Reevaluación final de los 27 IDs y acta; solo después iniciar Fase 1. |

El siguiente bloque recomendado es **historial operativo y reporte general**:
comenzar por el contrato de eventos y permisos, porque la consulta existe pero
no hay fuente durable que respalde ese reporte. Esta evaluación no lo implementa.

La [preparación de Fase 1](plan-fase-1.md) detalla cambios de compilación,
rutas, seguridad y aceptación sin introducir todavía TypeScript, Vite o React.

## Autoevaluación

- Se preservó todo el trabajo previo; los cambios de este bloque son documentales.
- Se actualizaron índice y control sin sobrescribir las bitácoras históricas.
- No se extrapola el smoke a MySQL ni el hash del instalador a instalación válida.
- No se interpretan cifras antiguas de la base como su estado actual.
- No se rebajó el criterio de cierre ni se marcaron hallazgos pendientes como cubiertos.
- AGENTS ya contiene las reglas estables necesarias; no necesita otra ampliación
  para esta evaluación. El estado específico permanece en esta carpeta.

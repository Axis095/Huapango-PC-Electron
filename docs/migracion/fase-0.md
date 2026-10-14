# Fase 0 — bitácora y auditoría

Fecha de inicio: 2026-10-12 (America/Mexico_City).
Base: `a88db5b`, rama `RefactorizacionTest-RC`, árbol inicialmente limpio.
Estado: correcciones implementadas; cierre funcional pendiente de ensayo manual.
Fase 1 no iniciada.

## Línea base actualizada

El merge incorporó transacciones y fotos validadas, además de borradores de
modificación. Se conservan estas implementaciones. El diagnóstico de 92 pruebas
corresponde a otra revisión; no se utiliza como medida del estado actual.

`npm.cmd test` fuera del sandbox: 154 pruebas, 152 correctas y 2 fallos en
`nombresUsuario.test.cjs`. Sus dependencias simuladas no incluyen bcrypt.
En sandbox se añaden cinco fallos de archivos temporales; no se modifica el
producto para ocultar esas restricciones del entorno.

Hallazgo adicional: Main importa `Controladores/imagenesController.js`, que fue
eliminado en el merge. El preload ya retiró los métodos antiguos. Los mocks de
Main fabrican dependencias vacías y no detectan el módulo inexistente.

## Bloques de modificación

| ID | Alcance | Estado | Aceptación |
| --- | --- | --- | --- |
| F0-01 | Login, altas y dependencia bcrypt | Verificado automáticamente | Denegar datos inválidos; hashes reales; sin sesión ante fallo; lock consistente |
| F0-02 | Permisos IPC, emisor/frame, navegación y configuración | Verificado automáticamente | Rechazos sin efectos y operador completa inscripción |
| F0-03 | Evaluaciones y validación de escrituras | Verificado con SQL simulado | Autor desde sesión y datos inválidos sin SQL |
| F0-04 | Arranque, ventanas y coherencia tras merge | Verificado en Electron oculto | Carga de módulos reales, preload, login, navegación y borradores |
| F0-05 | Revisión global y cierre | Parcial | Ensayo manual con MySQL pendiente; no se declara Fase 0 cerrada |
| F0-06 | Auditoría de dependencias | Parcial | Aviso alto corregido; ocho señalamientos moderados de tooling pendientes |

## F0-01 — preparación

Defecto confirmado: `isMatch = true` acepta cuentas sin contraseña de tipo string.
Los fixtures antiguos reproducen esta omisión y la consideran válida.
Plan: denegar por defecto, bcrypt obligatorio, compatibilidad de texto legado
explícita y temporal, alta con hash asíncrono y límite de 72 bytes UTF-8 para
evitar truncamiento silencioso. Conservar los espacios de la contraseña.
Probar error al abrir la ventana principal sin dejar sesión autenticada.

## F0-01 — evidencia y autoevaluación

Tras corregir un error de sintaxis en el test nuevo, las 12 regresiones de
autenticación dieron 3 correctas y 9 fallos sobre el código anterior. Después de
la corrección: 25/25 en autenticación, login y nombres de usuario. Se usa bcrypt
real, no un stub que siempre acepte. Los dos fallos originales eran fixtures
incompletos, ahora verifican también el hash escrito y su comparación.

Bcrypt fijado en 3.0.3 y entrada del lockfile regenerada con npm (descarga fuera
del sandbox por ENOTFOUND). `npm.cmd ls --depth=0`: correcto. Instalación limpia
aislada con `npm.cmd ci --prefix .tmp/fase0-install --ignore-scripts --no-audit
--no-fund`: 311 paquetes; `npm.cmd ls --prefix .tmp/fase0-install --depth=0`
correcto. Se omiten scripts de instalación: esto verifica lockfile/dependencias,
no la descarga ni el empaquetado de Electron. La compatibilidad de texto plano sigue temporalmente activa;
no se han migrado contraseñas almacenadas ni certificado el ancho de su columna.

## F0-02/F0-04 — implementación y decisiones

Se centraliza el inventario de permisos en `Seguridad/ipc.js`, con denegación
para canales desconocidos, frame secundario, URL no incluida o ventana ajena.
Se habilita al operador para completar categoría y estilo. Se retiran de Main
los dos canales de imágenes ya eliminados del preload y el require inexistente;
las fotos continúan por el servicio validado incorporado en el merge.

Decisión explícita del usuario: solo juez y administrador evalúan. No hay base
de pruebas disponible; se preparará el ensayo manual sin escribir datos reales.
Configuración disponible sin sesión para primer arranque y con sesión admin.
La navegación desde IPC usa catálogo de vistas y roles. Navegaciones externas,
redirecciones, ventanas nuevas y webviews se bloquean.

Se añade un harness que carga todos los módulos locales reales, reemplazando
solo Electron y SQL. Esto evita que un mock de controlador oculte otro require
inexistente. Las pruebas antiguas de cableado siguen teniendo alcance limitado.

## F0-03 — escrituras

El controlador de evaluaciones deriva nJuezID de la sesión, acepta solo juez o
admin, exige ID positivo, puntaje entero 0–60 y comentario de hasta 255 caracteres.
Un ID de juez falsificado en el payload no cambia el autor.

La frontera IPC valida campos obligatorios de ambos participantes, correo,
teléfono, fecha real no futura y sexo en altas; además valida IDs y nombres de
las asignaciones de categoría/estilo. Se mantienen las transacciones, validación
de fotos y reglas de resultado incierto introducidas por el merge.

**Excepción explícita:** `actualizar-categoria` y `actualizar-estilo` no tienen
consumidores activos en las vistas revisadas y escriben columnas distintas a las
utilizadas por sus altas. Se conservan los endpoints, pero devuelven
`UNSUPPORTED_OPERATION` antes de SQL. No se inventó un esquema ni se reescribieron
consultas sin evidencia. Rehabilitarlos requiere contrato y esquema verificados.
Registrar, consultar y eliminar categorías/estilos siguen disponibles según rol.

## F0-04 — prueba de Electron y distribución

`scripts/smoke-fase0.cjs` ejecuta Main, preload y HTML reales con ventanas ocultas,
perfil nuevo en `.tmp`, aceleración gráfica desactivada y SQL simulado. Comprueba
aislamiento de Node, rechazo sin sesión, contraseña incorrecta, login válido,
permisos de evaluación, navegación y acceso a borradores. Resultado:
`SMOKE_OK`. No prueba foco, apariencia, diálogos nativos ni consultas MySQL.

Se excluyen `.tmp`, pruebas, scripts de auditoría, documentos y `uploads` de
desarrollo del paquete. Se retira la copia `extraResources` de fotos de desarrollo;
el flujo vigente escribe en userData. No se borran fotos del repositorio ni se
migran referencias antiguas. No se generó un instalador en este bloque.

## Inventario de modificaciones y evidencia

| Bloque | Archivos | Motivo / evidencia |
| --- | --- | --- |
| F0-01 | authController, adminModel, package y lock | Denegación por defecto, hash asíncrono, límite UTF-8, await de ventana y dependencia reproducible |
| F0-01 | login, arranque, nombresUsuario, authSeguridad tests | Fixtures válidos y comparación bcrypt real; regresiones fallan antes del arreglo |
| F0-02 | Seguridad/ipc.js, main.js | Matriz única, origen/frame/ventana, configuración y navegación limitadas; inventario completo comprobado |
| F0-02 | ipcSeguridad tests | Roles, efectos ausentes, traversal, navegación, borradores y primer arranque |
| F0-03 | Seguridad/datos.js, evaluacionesController | Validación en frontera y autor desde sesión |
| F0-03 | escriturasSeguridad tests | Flujo completo de operador, tipos/límites inválidos y autoría; SQL simulado |
| F0-04 | main.js, ventanasController | Eliminar require roto y canales de fotos retirados; aislamiento explícito y carga esperada |
| F0-04 | tests/helpers/aplicacion.cjs, smoke-fase0.cjs | Grafo local real y Electron real complementan los mocks históricos |
| F0-04 | tests de búsquedas/borradores | Adaptar cableado al registro central sin cambiar expectativas funcionales |
| F0-04 | package.json | Comando test:smoke y exclusiones de artefactos/datos de desarrollo |
| F0-06 | package-lock.json | http-cache-semantics 4.2.0 → 4.3.0 dentro del rango transitivo ^4.0.0 |

## Autoevaluación posterior

- Se detectó un falso verde potencial: mocks de Main aceptaban un módulo borrado.
  Se añadió carga recursiva del grafo y prueba Electron con preload real.
- Se detectó una carrera adicional: login tardío después de navegación. Se
  revalida el emisor antes de crear sesión. Login y reconexión se excluyen mientras
  están en curso; sus pruebas cubren ambas direcciones.
- Se revisó el significado de los errores: endpoints suspendidos devuelven
  `UNSUPPORTED_OPERATION`, no un error engañoso sobre datos del formulario.
- El baseline externo ya no se presenta como vigente: se pasó de 154 pruebas
  con dos fallos a una suite ampliada. El resultado final se registra abajo.
- Las pruebas de transacciones/fotos existentes siguen verificando rollback y
  resultado incierto. No constituyen una nueva certificación del esquema real.
- La instalación aislada emite avisos de obsolescencia transitiva (inflight,
  rimraf, glob, boolean); un aviso de obsolescencia no es por sí mismo un resultado
  de auditoría de vulnerabilidades. No se aplican actualizaciones masivas.

## Límites y puerta de salida

El [ensayo manual](ensayo-fase-0.md) está pendiente porque no hay base de pruebas.
No afirmar equivalencia de escrituras contra MySQL ni funcionamiento del instalador.
El ancho de cContrasena debe admitir los hashes de 60 caracteres y debe definirse
el retiro de cuentas en texto plano antes de distribución con datos reales.

La CSP y las fuentes remotas heredadas requieren una revisión específica al
preparar el renderer; no se declara una auditoría exhaustiva de toda superficie.
La limitación de intentos de contraseña tampoco está implementada en este bloque.

Rollback: partir de `a88db5b` o revertir el commit de este bloque una vez creado;
el rollback recupera también los defectos documentados. No usarlo como solución
de seguridad. No hay cambios de esquema ni migración masiva de datos que revertir.

## Fuentes técnicas consultadas

- [bcrypt.js](https://github.com/dcodeIO/bcrypt.js): API asíncrona y límite de 72 bytes.
- [Seguridad de Electron](https://www.electronjs.org/docs/latest/tutorial/security):
  validación de emisor, aislamiento y restricciones de navegación.

## F0-06 — auditoría de dependencias y decisión

La consulta actual de npm inicialmente reportó 9 paquetes señalados: 1 high y
8 moderate. Se ejecutó `npm.cmd update http-cache-semantics --ignore-scripts
--no-audit --no-fund`; el diff del lock confirma únicamente 4.2.0 → 4.3.0 además
de la corrección previa de bcrypt. Auditoría posterior: 0 high, 0 critical y
8 moderate. `npm.cmd audit --omit=dev --json`: **0 vulnerabilidades reportadas**.

`npm.cmd explain` ubica ambos avisos originales en herramientas de desarrollo,
por la cadena electron-builder → app-builder-lib → @electron/get. Los ocho
señalamientos restantes propagan un aviso de sprintf-js a sus dependientes;
no representan ocho fallos independientes de la aplicación.

El aviso pendiente es [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).
npm propone electron-builder 26.5.0 fuera del rango declarado ^26.15.3. No se hizo
un downgrade forzado ni un override de API mayor para silenciar la auditoría.
Pendiente: resolver la cadena con versiones compatibles y validar empaquetado
antes de distribuir. No se declara el riesgo aceptado en nombre del usuario.

El aviso alto que dejó de reportarse es
[GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp).
La página del aviso consultada todavía indicaba sin versión parcheada; por ello
la evidencia afirmada aquí es la versión instalada y el resultado observado de
npm, sin extenderlo a una certificación independiente de la librería.

## Resultado final de esta revisión

| Verificación | Resultado |
| --- | --- |
| Línea base a88db5b | 152/154 correctas; dos fixtures fallaban |
| Suite final, fuera del sandbox | **184/184**, cero fallos, 677.5443 ms |
| Electron real oculto con SQL simulado | **SMOKE_OK**; login, preload, permisos, navegación, borradores |
| Instalación limpia del lockfile final | **311 paquetes**, npm ci correcto en .tmp/fase0-install-final, scripts omitidos |
| Árbol de dependencias principal | npm ls correcto, bcryptjs 3.0.3 |
| Auditoría npm de producción | **0 avisos** |
| Auditoría npm completa | **8 moderate**, 0 high/critical; pendiente tooling |
| Revisión de diff | git diff --check correcto |
| MySQL real / ensayo visual / instalador | **No ejecutados** |

Cambios locales sin commit ni push. Las carpetas `.tmp` están ignoradas por Git
y excluidas del empaquetado. No contienen copias de datos del evento.

Comando sugerido para guardar este bloque, desde la raíz y después de revisar:

```powershell
git add Controladores/authController.js Controladores/evaluacionesController.js Controladores/ventanasController.js Modelos/adminModel.js main.js package.json package-lock.json Seguridad tests scripts docs/migracion
git commit -m "fix: robustecer fase 0 y registrar auditoria de migracion"
```

La fase permanece **abierta** hasta registrar el ensayo funcional y resolver o
decidir explícitamente el tratamiento de los pendientes. La bitácora separa
seguridad implementada, pruebas realizadas y validación que aún falta.

## F0-DOC-01 — guía de primera instalación

Solicitud del usuario: documentar requisitos, comandos, creación de BD, inserción
de usuarios, ejecución, pruebas y generación. Se añade
[la guía](../guia-primera-instalacion.md) y enlaces en README/control de migración.

El DDL de seis tablas se reconstruye desde las consultas activas y se identifica
como propuesta de laboratorio, no como esquema histórico certificado. Incluye
InnoDB, referencias entre tablas, contraseñas con espacio para bcrypt y nombres
compatibles con el uso mixto de mayúsculas en Windows. Las restricciones escogidas
se explican y no se ejecutan automáticamente en ninguna base real.

La inyección de cuentas genera hashes de tres contraseñas públicas de prueba;
se distingue de las cuentas MySQL de conexión. Se documenta que SOURCE puede
continuar después de errores: se exige tabla vacía y revisión de conflictos.
No se confunde el reporte general con un historial automático que no existe en
el backend. El instalador tampoco incluye servidor MySQL ni inicializa tablas.

Autoevaluación: enlaces locales y comandos contrastados con package.json; script
de usuarios comprobado con bcrypt real y escritura SQL capturada en memoria.
El DDL/importación y la instalación MySQL quedan pendientes del ensayo real.

## F0-07 — regresión de login con ID numérico almacenado como texto

Reporte del usuario: INSERT de admin3, ID 6, contraseña de texto admin3 y rol admin
en huapango_db fue correcto en Workbench, pero el login rechazaba la cuenta.
La captura incluye un ID U001. El usuario confirmó mediante SHOW COLUMNS que
nUsuarioID es VARCHAR(50), NOT NULL y clave primaria.

Reproducción aislada: el controlador rechazaba nUsuarioID `"6"` porque se añadió
Number.isSafeInteger directamente sobre el valor recibido de MySQL. Dos nuevas
regresiones (ID `"6"` y `"006"`) fallaron antes del arreglo. Fue una suposición de
tipo introducida durante F0-01, no un fallo de comparación de texto plano.

Cambio: utilizar la validación compartida de ID positivo que admite número o
cadena numérica. Conservar la representación original en sesión y al insertar
la autoría de una evaluación, para no convertir claves `"006"` en otra clave `6`.
Mantener denegación de datos inválidos, comprobación bcrypt y validación del rol.

Archivos: authController, evaluacionesController, fixtures login/arranque,
authSeguridad, escriturasSeguridad y smoke. Los 30 tests dirigidos pasan;
la comprobación final de suite y Electron se registra a continuación.
No se leyó configuración privada ni se modificaron usuarios de la BD real.
El soporte de U001 no se presume: requiere validar el contrato alfanumérico.

Autoevaluación: ampliar únicamente las representaciones válidas del mismo ID;
probar valores incorrectos y conservación del ID en la frontera SQL. Los mocks
antiguos solo devolvían enteros y no detectaban una BD con columna de texto.

Resultado final F0-07: `npm.cmd test` fuera del sandbox, **188/188**, cero fallos;
663.0074 ms. Smoke con Electron real y ID textual: **SMOKE_OK**, SQL simulado.
Validación real reportada por el usuario el 12 de octubre de 2026: **admin3 pudo
iniciar sesión después de la corrección**. El tipo VARCHAR(50) confirma la causa
del rechazo por validar directamente el valor como entero JavaScript.
Esta evidencia cierra el caso de login F0-07; no cierra el ensayo funcional completo
de Fase 0. IDs alfanuméricos como U001 siguen pendientes de revisar con sus
referencias de evaluación y reglas de creación de cuentas.

## Reglas de alcance

Actualización del 14 de octubre de 2026: el usuario solicita guardar en Git el
avance actual y aplazar las advertencias recientes de dependencias.
Ver [checkpoint](checkpoint-fase-0-2026-10-14.md) para alcance y pendientes de
la auditoría 360°. Este guardado no cierra Fase 0 ni inicia Fase 1.

- No se escriben datos del evento ni se cambia el esquema automáticamente.
- Se pide disponibilidad de base de pruebas; mientras tanto se usan fronteras
  simuladas y archivos temporales aislados.
- Solo juez y administrador evalúan, según confirmación del usuario; la identidad
  del autor nunca se toma del renderer.
- Los bloques se registran con evidencia y limitaciones antes de declararlos
  completos. No se avanza a Fase 1 por tener solamente pruebas unitarias verdes.

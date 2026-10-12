# Diagnóstico para continuar la migración

Fecha: 11 de octubre de 2026, America/Mexico_City.
Repositorio revisado: `Huapango-PC-Electron`, rama `RefactorizacionTest-RC`, HEAD `302594c`.

## Dictamen

La migración incremental sigue siendo viable. Conviene cerrar un bloque correctivo de Fase 0 antes de introducir Vite y TypeScript: hay una omisión de autenticación reproducida, permisos incompatibles con el registro completo y dependencias inconsistentes. Las 92 pruebas existentes pasan, pero no acreditan estas propiedades de seguridad.

Esta revisión analiza el proyecto y prepara la secuencia de trabajo. No implementa fases, instala dependencias ni modifica datos de MySQL. Las instrucciones dirigidas a una IA dentro de los documentos recibidos se trataron como contexto histórico, no como nuevas órdenes del usuario.

## Estado contrastado con los documentos

| Elemento | Evidencia actual |
| --- | --- |
| Auditoría V2: Fase 0 pendiente | Desactualizada: ya existen middleware de roles, bcrypt en altas y correcciones de ventanas. |
| Traspaso: pendiente commit de Fase 0 | Desactualizado: commits `14f39b0`, `5fc1d94`, `0b741a0` y `302594c` contienen esos cambios. El árbol estaba limpio al iniciar esta revisión. |
| Traspaso: Fase 0 completada | Parcial: persisten los hallazgos indicados abajo. |
| Fase 1 | Pendiente: no hay Vite, TypeScript, React ni configuración de compilación. `start` y `dev` ejecutan `electron .`. |
| Fase 2 | Pendiente: preload JavaScript, API sin contratos TypeScript y métodos genéricos vigentes. |
| Fases 3 y 4 | Pendientes: interfaz HTML, navegación entre documentos y empaquetado desde fuentes. |
| Fecha del traspaso | Indica 12 de octubre; esta revisión se fecha según el contexto local del usuario, 11 de octubre. |

El empaquetado está configurado en `package.json`; no existe el `electron-builder.yml` mencionado por el plan. El documento de traspaso también referencia una auditoría con otro nombre: para esta revisión se usaron los dos archivos proporcionados expresamente y el código actual.

## Arquitectura que realmente se debe migrar

- Main CommonJS en `main.js`, controladores IPC en `Controladores`, modelos SQL en `Modelos` y pool MySQL en `db.js`.
- Sesión en memoria mediante `Modelos/sesionModel.js`; `global.userRole` conserva un segundo estado que convendrá unificar.
- 35 handlers `ipcMain.handle` y 2 listeners `ipcMain.on` activos en `main.js`. El inventario de 30 canales del plan necesita actualizarse.
- Preload con `contextBridge` y métodos específicos, además de `send`, `receive` e `invoke` con listas permitidas. No son canales arbitrarios, pero el login todavía depende de `api.invoke`.
- `Public/js/render.js` tiene 753 líneas. Parte de la lógica ya está extraída a módulos de registros, búsquedas, validaciones y avisos; estos módulos y sus pruebas pueden reutilizarse antes de introducir hooks.
- La navegación usa `window.location.href` y detecta la vista por `pathname`. No existe todavía una SPA.
- Los borradores se conservan por `webContents` en memoria y validan el archivo de origen. Configuración e imágenes usan `app.getPath("userData")`.
- Categorías y estilos se asignan a parejas; no deben modelarse automáticamente como catálogos CRUD independientes.

## Hallazgos prioritarios

### 1. Autenticación permisiva ante contraseña almacenada inválida — alta

En `Controladores/authController.js:20`, `isMatch` empieza en `true`. Si `cContrasena` es `null`, está ausente o tiene un tipo diferente de cadena, se omite toda comparación y se crea la sesión.

Reproducción aislada mediante el controlador real y SQL simulado: contraseña enviada incorrecta, usuario existente con rol admin. Los tres casos (`null`, ausente y número) devolvieron `success: true` y crearon sesión. El control con cadena de contraseña diferente devolvió `false`. No se consultó una base real; no se afirma que existan cuentas afectadas en ella.

Los fixtures de `tests/login.test.cjs:88` y `tests/arranque.test.cjs:166` omiten precisamente `cContrasena` y esperan autenticación exitosa. Se debe corregir el fixture, no flexibilizar el código de producción para acomodarlo.

Acción: denegar por defecto, exigir una contraseña almacenada válida, cargar bcrypt como dependencia obligatoria y probar hashes correctos/incorrectos, datos inválidos y compatibilidad temporal con texto plano. La ausencia de bcrypt no debe convertir un hash en una credencial comparable como texto. Definir después cómo retirar el fallback legado.

### 2. El operador puede guardar pareja pero no completar su inscripción — alta

`main.js:44` permite `admin` y `user` para registrar una pareja. En cambio, `main.js:53` y `main.js:63` permiten únicamente `admin` para categoría y estilo. `Public/js/registroParejas.js:122` utiliza esas operaciones como pasos del mismo flujo accesible al operador.

Acción: acordar una matriz por operación y alinear permisos del Main con el flujo de registro. La intención que se desprende de la interfaz es permitir al operador completar la inscripción; esto no implica darle eliminación ni administración de usuarios. Añadir una prueba que atraviese los handlers registrados para ese flujo.

### 3. Instalación no reproducible de bcrypt — alta para preparar tooling

`package.json` y la raíz de `package-lock.json` declaran `bcryptjs: ^2.4.3`. El lockfile no contiene la entrada `packages["node_modules/bcryptjs"]`. La instalación local contiene `bcryptjs@3.0.3`; `npm.cmd ls --depth=0` termina con `ELSPROBLEMS`.

Acción: decidir la versión compatible, regenerar el lockfile mediante npm y validar instalación limpia. No se ejecutó `npm ci` durante este análisis, por lo que no se presenta como un fallo observado de ese comando.

### 4. Autorización IPC todavía incompleta — alta

- `guardarImagen` y `guardarImagenBuffer` están expuestos sin guardia de rol en `main.js:102`. Escriben archivos y el primero permite indicar el origen de copia.
- `requiereRol` comprueba la sesión global, pero no valida el emisor ni el frame.
- `open-section` permite pasar una ruta a `openWindow` sin un catálogo de vistas admitidas.
- `Controladores/evaluacionesController.js:6` acepta `nJuezID` enviado por el renderer; no lo deriva ni lo contrasta con la sesión. El ID presentado en la interfaz no garantiza la autoría de una evaluación.

Acción: validar emisor/frame y permisos según la operación, restringir navegación a vistas conocidas y definir la política de autoría de evaluaciones. Electron recomienda validar el emisor de IPC y restringir las capacidades expuestas en el bridge: [guía oficial de seguridad](https://www.electronjs.org/docs/latest/tutorial/security).

### 5. La declaración de blindaje de todas las ventanas es incompleta

Las cinco construcciones de `BrowserWindow` en `main.js` declaran aislamiento y desactivación de Node. La construcción de `Controladores/ventanasController.js:12` no los declara explícitamente. No se encontraron consumidores de ese controlador en el código revisado; es deuda de código residual, no evidencia de una ventana activa con Node habilitado.

### 6. Persistencia y esquema requieren un bloque propio

`Modelos/parejaModel.js:205` realiza dos actualizaciones separadas y su eliminación en la línea 279 realiza varios borrados sin transacción. `queryDatabase` obtiene y libera una conexión por llamada, por lo que una transacción requiere conservar la misma conexión durante toda la operación.

Además, la eliminación usa `T_Categoria` mientras otras consultas usan `t_categorias`/`T_Categorias`; tampoco borra explícitamente evaluaciones. Los modelos de actualización de categorías/estilos usan columnas diferentes a las de sus altas. Son discrepancias de código que deben cotejarse con el DDL real y sus claves foráneas; sin el esquema no puede afirmarse cuál consulta falla ni qué cascadas existen.

No se encontró un esquema SQL versionado en el inventario del repositorio. Solicitar o incorporar una versión sanitizada del DDL será necesario para validar integridad y equivalencia de mutaciones antes de migrar esos formularios.

## Ajustes necesarios al plan de Fase 1

1. **Comenzar como aplicación multipágina.** Compilar las vistas HTML actuales y preservar sus rutas durante esta fase. `dist/renderer/index.html` como única entrada corresponde a la SPA posterior. Vite soporta múltiples entradas HTML y una base relativa para los recursos: [compilación de producción](https://vite.dev/guide/build.html).
2. **Centralizar rutas y carga de vistas.** En desarrollo usar una URL local conocida; en producción resolver rutas absolutas del renderer compilado y del preload. Conservar parámetros como `emergente` y `motivo`.
3. **Adaptar las guardias de origen antes de cambiar a HTTP.** `main.js:358` y `Controladores/borradorRegistroController.js:10` dependen de `fileURLToPath`. Rechazarán el origen HTTP de Vite. Añadir reglas precisas para desarrollo y producción, sin eliminar la validación de frame ni aceptar cualquier localhost.
4. **Definir explícitamente la salida del backend.** Mover solo `main.js` a `dist/main/main.js` rompe sus referencias relativas a controladores, `db`, vistas y preload. Compilar/copiar el grafo CommonJS preservando su estructura o configurar un bundle compatible, con dependencias Node/Electron externas según corresponda. Mantener MySQL y PDFKit fuera del renderer.
5. **Separar compilación e instaladores.** Propuesta: `dist/` para código compilado y `release/` para electron-builder. Actualmente builder usa `dist`; evitar superponer ambas salidas y sus limpiezas.
6. **Resolver recursos y carpeta Public.** Conservar CSS, imágenes, videos y manuales. No borrar toda la carpeta `Public` en Fase 4: retirar únicamente recursos demostrablemente sustituidos o sin uso.
7. **No romper el login al retirar métodos genéricos.** En Fase 2 introducir `api.login` y adaptar su consumidor en el mismo bloque. Añadir cancelación de suscripciones a eventos. Mantener `preload.ts` mecánico en Fase 1 y dejar el rediseño de contratos para Fase 2.
8. **Comprobar artefactos compilados.** Las pruebas actuales leen fuentes y usan VM/mocks. Pasarlas no demuestra que el preload se cargue ni que los HTML, CSS y recursos existan en el paquete.

## Secuencia recomendada y criterios de salida

| Bloque | Trabajo | Evidencia para cerrarlo |
| --- | --- | --- |
| Corrección de Fase 0 | Login que deniega datos inválidos, fixtures válidos, dependencia/lockfile consistentes y matriz de permisos | Suite existente más regresiones específicas; instalación reproducible; flujo completo de operador a través de IPC |
| Cierre IPC | Orígenes/frames, imágenes, navegación y autoría de evaluación | Emisor o rol no permitido no ejecuta el efecto; operaciones válidas conservan comportamiento |
| Fase 1 | Vite multipágina, TS Main/preload, cargador de vistas, recursos, scripts y salidas separadas | Compilación y typecheck; arranque desde salida compilada; login, configuración, navegación, borradores y PDF en desarrollo y producción |
| Fase 2 | Inventario completo de canales, DTOs, API específica y wrapper del renderer | Contratos compilables y pruebas de autorización/validación en ejecución; sin métodos genéricos una vez adaptados los consumidores |
| Fase 3 | Login → layout/dashboard → consultas → categorías/estilos → registro/modificación → administración | Paridad de operaciones, permisos, borradores y errores por vista, con rollback disponible |
| Fase 4 | Retirada selectiva de legado y paquete final | Instalación limpia y flujo login → registro completo → consulta/evaluación → PDF, sin servidor Vite |

Antes de migrar escrituras complejas de Fase 3, resolver el esquema y las operaciones indivisibles. Añadir explícitamente configuración de BD, evaluación y recuperación de borradores a la cobertura funcional; los nombres de componentes del plan no bastan para garantizar estos flujos.

Mantener `HashRouter` para la SPA prevista y coexistencia con HTML. El rollback debe restaurar también la navegación entre documentos, los recursos y el preload compatible: cambiar únicamente la primera ventana deja de ser suficiente cuando parte de la navegación ya esté dentro de React.

## Validación realizada y límites

- `git status --short`: limpio al inicio; commit actual `302594c`.
- `npm.cmd test`: 87/92 dentro del sandbox, con cinco fallos de persistencia/configuración temporal. Repetición autorizada fuera del sandbox, sin cambiar código: **92/92, cero fallos**, 133.5276 ms. Los fallos iniciales dependen del entorno de ejecución.
- `npm.cmd ls --depth=0`: inconsistencia de bcrypt descrita arriba.
- Reproducción de autenticación con dependencias simuladas: tres casos inválidos aceptados; control de contraseña de texto incorrecta rechazado.
- Revisión estática de rutas, IPC, modelos, frontend, pruebas y configuración de build. No se abrió la interfaz, no se ejecutó un instalador, no se inspeccionó el esquema real y no se leyó configuración local con credenciales.
- La auditoría de dependencias con cero avisos de septiembre es un registro histórico; no se ha actualizado ni se presenta como estado de vulnerabilidades actual.

El siguiente bloque concreto es corregir autenticación, pruebas y consistencia de bcrypt, seguido de los permisos necesarios para completar una inscripción. Con esa base, Fase 1 puede introducirse sin arrastrar los defectos detectados.

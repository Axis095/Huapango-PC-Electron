# Permisos de consultas y PDF

La autorización se comprueba en el proceso principal antes de consultar MySQL o
mostrar el diálogo de exportación. La interfaz también oculta y deshabilita los
botones PDF desde el HTML, hasta conocer el rol. Ocultar un botón no concede ni
sustituye permisos.

## Política aplicada

| Canal | Administrador | Usuario (`user`) | Juez | Vistas locales autorizadas |
| --- | --- | --- | --- | --- |
| `buscar-pareja-por-id` | Sí | Sí | No | BusquedaParejas, ModificarParejas |
| `buscar-todas-las-parejas` | Sí | Sí | No | BusquedaParejas, ModificarParejas |
| `buscar-pareja-para-evaluacion` | Sí | No | Sí | Resultados |
| `buscar-categoria-por-id`, `buscar-estilo-por-id` | Sí | Sí | No | BusquedaParejas, ModificarParejas |
| `obtener-rol-usuario` | Sí | No | No | Administrador |
| `obtener-evaluaciones-por-pareja` | Todas las de la pareja | No | Solo las propias de la pareja | Resultados |
| `generar-pdf-parejas` | Sí | No | No | Registros |
| `generar-pdf-categorias`, `generar-pdf-estilos` | Sí | Sí | No | Registros, RegistroCategoriasEstilos, Parejas |
| `generar-pdf-resultados` | Todas | No | Solo las propias | Resultados |
| `generar-pdf-registros-generales` | Sí | No | No | Administrador |

Todas las vistas indicadas son archivos `.html` de `Vistas` en esta instalación.
Se admite el parámetro de ventana emergente. Se rechazan vistas ajenas, URLs
remotas, subframes, sesiones incompletas y roles desconocidos. Sin sesión se
deniegan los doce canales con `FORBIDDEN` y textos `error`/`message`.

La respuesta exitosa de `obtener-rol-usuario` sigue siendo un texto o `null`;
su consumidor comprueba el error de permisos antes de preparar la confirmación
de eliminación. Consultar el rol de otra cuenta es distinto de `get-role`, que
describe la sesión propia.

## Evaluaciones propias

El controlador de consultas toma el ID del juez de `sesionModel` y exige un ID
de pareja entero positivo. El controlador PDF ignora todos los argumentos extra
enviados por IPC. Ambos pasan al modelo un alcance explícito:

- Administrador: `null`, permite todos los jueces.
- Juez: su ID de sesión, entero positivo.
- Una identidad ausente o inválida es un error, nunca acceso global.

SQL incluye `e.nJuezID = ?` para los jueces. No se descargan las evaluaciones
ajenas para filtrarlas en el navegador. Si no hay evaluaciones propias, la
consulta devuelve una lista vacía y el PDF informa que no hay registros, sin
crear archivo. El botón del juez dice «Exportar mis evaluaciones» y el PDF
lleva el título «Mis Evaluaciones». El administrador conserva el informe completo.

## Exportaciones

El PDF de parejas incluye teléfonos y correos de todos los participantes y queda
exclusivo de administradores. Este parche no agrega una versión reducida para
usuarios. El informe de registros generales es la bitácora de acciones.

Los cinco PDF comprueban permisos antes de abrir el diálogo y repiten la
comprobación al regresar de él. Debe continuar la misma identidad y rol desde
una vista autorizada. También se comprueba después de la consulta SQL, antes de
crear el archivo, y antes de abrirlo con la aplicación del sistema.

Una escritura a disco que ya comenzó no se revierte automáticamente si después
cambia la sesión. Las consultas normales autorizan al comenzar cada solicitud;
no cancelan SQL en curso, pero no entregan sus resultados a una sesión posterior.
Todas las operaciones exigen que la ventana pertenezca a la sesión actual; ver
[cierre de la revisión IPC](cierre-permisos-ipc.md). Los cambios externos de rol en
MySQL requieren renovar la sesión.

## Validación

`tests/permisosConsultasPDF.test.cjs` ejecuta los registros IPC, controladores y
modelos reales con Electron, SQL y PDF/disco simulados. Cubre la matriz completa,
emisor inválido, suplantación, aislamiento entre jueces, administrador, ausencia
de registros, cambio de sesión durante diálogo/consulta, cancelación y fallos.
`tests/menu.test.cjs` cubre los botones inicialmente ocultos y su presentación
por rol. `tests/pdf.test.cjs` conserva las pruebas de escritura y errores de flujos.

Después de reiniciar Electron con `npm.cmd start`, verificar con cuentas de
prueba de los tres roles. En particular, registrar evaluaciones con dos jueces
y comprobar que cada PDF contiene únicamente las del juez conectado; el informe
del administrador debe contener ambas. Las pruebas automáticas no conectan a la
base MySQL instalada ni verifican el diálogo nativo de Electron.

## Alcance y controles relacionados

Este cambio protege los doce canales de consulta de negocio y PDF revisados.
`obtener-configuracion` conserva su protección de administrador y la excepción
de instalación inicial. Los emisores de `get-role` y
`get-usuario-id` y el vínculo de los borradores a la sesión ya cuentan con
protección adicional: ver [permisos de sesión y borradores](permisos-sesion-borradores.md).

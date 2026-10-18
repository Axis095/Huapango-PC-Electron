# Menú según el rol

## Causa del parpadeo y corrección

Las vistas incluían botones privados visibles. El renderizador esperaba la respuesta asíncrona de `getUserRole()` antes de ocultarlos; durante esa espera podían verse y pulsarse. Un error de IPC, un rol desconocido o la falta de uno de los botones también podía dejar el menú sin filtrar.

Ahora cada botón privado parte de `hidden disabled` en el HTML. La regla de CSS respeta `hidden` incluso si otra hoja cambia el estilo del botón. `Public/js/menu.js` habilita cada botón existente únicamente después de recibir un rol permitido. No se guarda el rol en el navegador ni se sustituye la consulta por IPC síncrono.

| Rol | Opciones privadas visibles |
| --- | --- |
| admin | Administrador, Resultados, Registro y búsqueda/edición de parejas |
| user | Registro y búsqueda/edición de parejas |
| juez | Resultados |
| Sin sesión, desconocido o error | Ninguna |

Las rutas antiguas de modificación y el botón opcional de categorías/estilos siguen las opciones de Registro. Los botones de regreso al menú principal permanecen disponibles.

## Autorización administrativa en el proceso principal

`main.js` protege los canales `crear-usuario`, `eliminar-usuario` y `eliminar-pareja` con `soloAdministrador`, antes de llamar al controlador o consultar la base de datos. Cada solicitud debe cumplir:

- Sesión activa de `Modelos/sesionModel.js`, con ID entero positivo y rol exacto `admin`.
- Emisor en su marco principal, cargando el archivo local `Vistas/Administrador.html` de esta instalación. También se admite su parámetro de ventana emergente.

Se rechazan usuarios, jueces, sesiones ausentes/incompletas, roles desconocidos, otras vistas, archivos ajenos, contenido remoto y subframes. La respuesta es `{ success: false, code: "FORBIDDEN", error, message }`; ambos textos mantienen compatibilidad con los avisos existentes del frontend.

Los datos del formulario, argumentos adicionales y `global.userRole` no conceden permisos. El rol de una cuenta destino es independiente del rol de quien realiza la solicitud: un administrador puede crear cuentas de cualquiera de los tres tipos.

La sesión se comprueba al comenzar cada solicitud y no se cachea la autorización. Una operación ya autorizada y en curso no se cancela automáticamente si la sesión cambia después. Los cambios externos al rol en MySQL requieren renovar la sesión; este parche no incorpora revocación en tiempo real.

El menú oculto sigue siendo solo presentación. El registro de evaluaciones también cuenta con autorización en su controlador del proceso principal, para jueces y administradores, y toma la identidad de la sesión; ver [permisos de evaluaciones](permisos-evaluaciones.md). Los canales de registro y edición tienen las restricciones descritas a continuación. Los demás canales pendientes de la auditoría requieren su propia protección.

## Registro y edición de parejas, categorías y estilos

`main.js` aplica `conPermisosRegistro` antes de invocar los controladores, consultar MySQL, abrir transacciones o procesar fotos.

| Operación IPC | Roles | Vistas locales permitidas |
| --- | --- | --- |
| `registrar-pareja` | `user`, `admin` | `Registros.html` |
| `actualizar-pareja-completa` | `user`, `admin` | `BusquedaParejas.html`, `ModificarParejas.html` |
| `registrar-categoria`, `actualizar-categoria` | `user`, `admin` | `Registros.html`, `RegistroCategoriasEstilos.html`, `Parejas.html` |
| `registrar-estilo`, `actualizar-estilo` | `user`, `admin` | Las mismas tres vistas de categorías |
| `eliminar-categoria`, `eliminar-estilo` | `admin` | Las mismas tres vistas de categorías |

Cada solicitud necesita una sesión con ID entero positivo y el marco principal de una vista autorizada de esta instalación. Los parámetros de URL de las ventanas emergentes siguen siendo válidos. Se rechazan jueces, sesiones ausentes/incompletas, roles desconocidos, vistas no autorizadas, archivos de otra instalación, contenido remoto y subframes. El rol del formulario y `global.userRole` no conceden acceso. La respuesta `FORBIDDEN` incluye `error` y `message`, compatibles con los avisos existentes.

La comprobación se repite al comenzar cada solicitud; no cancela una operación ya autorizada que esté en curso. Eliminar una pareja completa conserva su permiso exclusivo de administrador desde Administración, incluido el borrado asociado de categorías y estilos.

Los canales de actualización y eliminación de categorías/estilos estaban expuestos en `preload.js`, aunque actualmente no tienen controles activos que los invoquen. Quedan protegidos para su futura interfaz; este cambio no agrega botones ni modifica sus consultas o el esquema. Sus consultas de actualización antiguas aún deben contrastarse con el esquema real antes de habilitar esa interfaz.

## Verificación

La revisión posterior aplica el vínculo ventana–sesión a todos los canales de
negocio, restringe el login y retira `open-section`. Ver [cierre de la revisión IPC](cierre-permisos-ipc.md).

`get-role` y `get-usuario-id` validan la ventana, el marco y la sesión que abrió
esa ventana. Los borradores también se aíslan por sesión y requieren usuario o
administrador. Ver [permisos de sesión y borradores](permisos-sesion-borradores.md).

Los siete canales de consulta de negocio y los cinco de exportación PDF también
cuentan con autorización. Los jueces consultan y exportan únicamente sus propias
evaluaciones; el PDF completo de parejas es exclusivo de administradores.
Ver la [matriz de permisos de consultas y PDF](permisos-consultas-pdf.md).

La configuración de MySQL también exige administrador en una instalación existente,
con una excepción controlada para el primer arranque. Ver [primer arranque y
recuperación](primer-arranque.md).

`tests/menu.test.cjs` cubre el HTML inicial, respuesta de rol demorada, los tres roles, error IPC, roles desconocidos y vistas con botones ausentes. Las pruebas usan un DOM simulado y no conectan con MySQL.

`tests/permisosAdministracion.test.cjs` ejecuta los registros IPC de `main.js` con la sesión, controlador y modelo de usuarios reales, simulando Electron y el acceso a datos. Comprueba denegaciones sin consultas ni eliminaciones, intentos de elevar permisos desde el formulario, emisores inválidos, cambio/cierre de sesión y operaciones autorizadas. La suite completa se ejecuta con `npm.cmd test`.

`tests/permisosRegistros.test.cjs` ejecuta los ocho canales de registro, edición y eliminación de la tabla con sesión, controladores y modelos reales. Simula Electron, MySQL y el almacenamiento de fotos. Cubre los roles, todas las vistas permitidas, emisores inválidos, suplantación de rol, cambio/cierre de sesión, denegación sin efectos, operaciones autorizadas y conservación de errores de datos. No verifica el esquema de una base MySQL instalada.

Después de actualizar, cerrar completamente Electron y ejecutar `npm.cmd start`: recargar solo la vista no actualiza el proceso principal. Probar las operaciones permitidas con una cuenta administradora y datos de prueba.

Comprobación manual pendiente en Electron: entrar por separado con cada rol, navegar entre módulos y recargar. Las opciones restringidas no deben aparecer ni aceptar foco por Tab durante la carga. Revisar también que las opciones permitidas se habiliten al terminar.

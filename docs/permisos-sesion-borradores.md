# Permisos de sesión y aislamiento de borradores

## Política

| Canales | Administrador | Usuario | Juez | Sin sesión o emisor no autorizado |
| --- | --- | --- | --- | --- |
| `get-role`, `get-usuario-id`, `get-usuario-nombre` | Identidad propia | Identidad propia | Identidad propia | `guest` / `null` |
| `obtener-borrador-registro`, `guardar-borrador-registro`, `limpiar-borrador-registro` | Sí | Sí | No | `FORBIDDEN` |
| `obtener-borrador-modificacion`, `guardar-borrador-modificacion`, `limpiar-borrador-modificacion` | Sí | Sí | No | `FORBIDDEN` |

La autorización se realiza en el proceso principal. Una sesión válida tiene ID
entero positivo y rol exacto `admin`, `user` o `juez`. Los datos enviados desde
el formulario, argumentos adicionales y `global.userRole` no conceden acceso.

## Ventanas autorizadas

`main.js` asocia cada ventana principal o emergente a la sesión que la abrió.
Los nueve canales exigen esa asociación, una ventana viva y su marco principal,
cargando una vista local conocida de esta instalación. Una ventana con el mismo
nombre de archivo pero sin registrar no queda autorizada.

Para consultar la identidad se admiten MenuPrincipal, index, Administrador,
AdministradorInactivado, Registros, Resultados, BusquedaParejas, ModificarParejas,
RegistroCategoriasEstilos y Parejas, todos archivos `.html` de `Vistas`.
Se mantiene el parámetro de ventana emergente. Login, configuración inicial,
vistas desconocidas, URLs remotas, archivos ajenos y subframes no revelan identidad.

Consultar la identidad propia no autoriza las operaciones de esa pantalla: cada
canal de negocio conserva sus restricciones de rol. Los getters siguen devolviendo
texto/número o `guest`/`null`, de modo que el menú permanece cerrado ante rechazo.

Los borradores de Registro exigen `Registros.html`. Los de Modificación admiten
`BusquedaParejas.html` y `ModificarParejas.html`, y requieren `user` o `admin`.

## Duración y aislamiento

Cada llamada exitosa a `guardarSesion` crea una clave interna nueva, incluso si
se inicia sesión nuevamente con el mismo usuario. `cerrarSesion` la revoca. La
clave nunca se incluye en la copia pública de sesión ni se devuelve por IPC.

Cada controlador guarda sus borradores en memoria por clave de sesión y por
ventana, usando mapas débiles. Registro y Modificación tienen almacenes separados.
Texto, fotos y estado del formulario permanecen disponibles al navegar y regresar
dentro de la misma ventana y sesión. Las versiones anteriores aceptadas del formato
se conservan: Registro 1; Modificación 1 y 2.

Cambiar de cuenta, cerrar sesión o volver a iniciar sesión vuelve inaccesibles los
borradores anteriores. Una nueva ventana empieza sin borrador. Las ventanas viejas
no pueden leer, guardar ni limpiar borradores en nombre de la nueva sesión, incluso
si terminan de serializar una foto después del cambio. Debe usarse la nueva ventana
de la cuenta. No se guardan borradores en disco ni se recuperan entre inicios de sesión.

El vínculo ventana–sesión también se aplica ahora a todos los canales de negocio.
Al abrir la ventana de una nueva sesión se cierran las anteriores; sus mensajes
quedan bloqueados incluso si tardan en cerrarse. No se modifican los datos ya
confirmados en MySQL. Ver [cierre de la revisión IPC](cierre-permisos-ipc.md).

## Verificación

El perfil de Registro, Evaluaciones y Administración muestra `cNombreUsuario`, obtenido
durante el login y conservado en memoria. `get-usuario-nombre` devuelve únicamente
el nombre de la sesión autorizada; no recibe un ID ni consulta MySQL de nuevo.
El texto se inserta con `textContent`. No se envían contraseñas ni claves internas.

Para comprobar el perfil, reiniciar Electron e iniciar sesión como juez; abrir
Evaluaciones y comparar el nombre con la cuenta usada. Repetir con un administrador
en Administración y Evaluaciones, y luego con otra cuenta. Debe aparecer el nombre
de cada cuenta, también al cambiar de módulo o de tema, sin conservar el anterior.
En Registro, comprobar la tarjeta «Cuenta activa» con usuario y administrador.
Las pruebas automatizadas usan ventanas y consultas simuladas.

`tests/permisosSesionBorradores.test.cjs` ejecuta `main.js`, sesión y controladores
reales con ventanas Electron simuladas. Comprueba los roles, las vistas, ambos
módulos, navegación, ventanas emergentes, cambio de cuenta, nuevo login de la misma
cuenta, cierre de sesión, envíos tardíos desde ventanas anteriores, identidad
incompleta y emisores inválidos. Las pruebas existentes de formularios comprueban
que texto y fotos se conservan al navegar. No se modifica MySQL en estas pruebas.

Para probar manualmente, reiniciar Electron, completar parcialmente Registro y
Modificación y navegar entre módulos con `user` y `admin`. Cada formulario debe
recuperar solo su borrador. Iniciar otra sesión debe comenzar con formularios nuevos.
Con `juez`, el menú debe seguir mostrando sus opciones y los borradores deben
rechazarse. Revisar también una ventana emergente.

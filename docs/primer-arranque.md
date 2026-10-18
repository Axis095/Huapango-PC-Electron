# Primer arranque y recuperación de configuración

## Uso

1. Ejecutar `npm.cmd start` desde el proyecto.
2. En una PC nueva (configuración ausente o plantilla vacía original), completar
   servidor, puerto, usuario de MySQL, contraseña y nombre de la base de datos ya creada.
3. Pulsar **Comprobar y guardar**. Una contraseña incorrecta o un servidor
   inaccesible muestran un mensaje y permiten reintentar sin cambiar lo guardado.
4. Pulsar **Continuar al inicio de sesión** después de una comprobación exitosa.
5. Al volver a abrir, una configuración válida conduce directamente al login.

La comprobación abre y cierra una conexión; no crea ni modifica tablas. Acceder
a la base no garantiza que tenga todas las tablas del esquema requerido por la app.

## Modificar una instalación configurada

Iniciar sesión con una cuenta administradora y abrir **Ayuda → Configuración →
Base de Datos**. El menú se deshabilita para usuarios y jueces. El proceso
principal comprueba también los permisos aunque se invoque el IPC directamente.

Obtener, guardar y continuar requieren la instancia de ventana de configuración
creada por el proceso principal, su marco principal y la ruta local correcta.
Una copia del HTML abierta desde otra ventana no recibe autorización.

La excepción inicial se determina una sola vez al arrancar, a partir del archivo
local ausente o la plantilla vacía exacta. No se obtiene de parámetros del
renderer ni simplemente de que no haya sesión. Al continuar al login, la excepción
se desactiva. Guardar y continuar no pueden ejecutarse simultáneamente; tampoco
se inicia otra sesión mientras se está cambiando la conexión.

El permiso se vuelve a comprobar después de la prueba de MySQL, antes de escribir
el archivo o activar el nuevo pool. Si se cierra la ventana o cambia la cuenta,
se rechaza la operación. El formulario muestra el error y se bloquea ante
`FORBIDDEN`.

## Recuperación de una instalación existente

Un servidor detenido, una contraseña rechazada, un JSON dañado o una configuración
incompleta no habilitan la excepción inicial. Si la conexión existente falla
durante el arranque, la aplicación muestra el problema y termina sin abrir el editor.

Restablecer el servicio/red/credenciales del servidor, o recuperar una copia
conocida de la configuración mediante el responsable del equipo, y reiniciar.
Una vez que se pueda iniciar sesión, el administrador puede cambiar la conexión
desde la aplicación. No se incorpora todavía un procedimiento de recuperación
offline con autenticación propia; no borrar la configuración como solución rutinaria.

## Archivos y compatibilidad

- Se mantiene `app.getPath('userData')/config.json`, que en esta instalación suele
  corresponder a `%APPDATA%/huapango-app/config.json`.
- Si falta, se genera con campos vacíos, servidor `127.0.0.1` y puerto `3306`.
- Desarrollo y paquete instalado usan la misma inicialización. No se copia la
  configuración del repositorio ni una plantilla con credenciales.
- Una configuración previa válida no se modifica al arrancar. El formato antiguo
  sin `port` sigue funcionando con `3306`.
- Un JSON dañado o datos incompatibles al arrancar requieren recuperación; no
  abren el editor sin autorización. Si un administrador ya autenticado repara
  datos inválidos desde el formulario, se conserva el archivo anterior como
  `config.json.backup-*`.
- La escritura utiliza un archivo temporal y un reemplazo, evitando truncar la
  configuración anterior si la escritura falla. No es una garantía frente a todos
  los escenarios de corte de energía; los respaldos operativos siguen pendientes.
- El archivo local `config.json` y sus variantes quedan excluidos del empaquetado.

Las credenciales locales mantienen el formato JSON previo; aún no se cifra la
contraseña en disco. El archivo y sus copias deben tratarse como sensibles. La
integración con el almacén de credenciales de Windows queda pendiente antes de
distribuir el producto. La contraseña guardada no se devuelve al formulario ni
se registra en los mensajes de este flujo.

## Sesión y conexión

- `db.js` no realiza I/O ni crea un pool al importarse. El arranque valida la
  configuración y prueba MySQL antes de crear el pool.
- Las conexiones de prueba tienen un tiempo de conexión de 5 segundos. Esto no
  introduce un límite al tiempo de ejecución de las consultas SQL posteriores.
- Guardar no reinicia la aplicación ni cierra el formulario antes de recibir la
  respuesta. Continuar comprueba otra vez la conexión y abre el login.
- Cerrar la última ventana termina la aplicación; no provoca un relanzamiento.
- `sesionModel.js` conserva ID y rol solo en memoria. El login no escribe sobre
  las credenciales MySQL. Al cambiar de conexión se cierra la sesión anterior.
- Obtener/guardar configuración y continuar exigen rol administrador, salvo el
  flujo inicial descrito arriba. También se verifican ventana y marco emisor.

## Verificación

`npm.cmd test` verifica configuración ausente, datos previos, JSON dañado,
fallo de escritura, validación de campos, conexión rechazada, liberación de
conexiones, sesión, navegación y comportamiento del formulario. Usa archivos
temporales reales y dobles de MySQL/Electron; no necesita una base instalada.
También cubre la excepción inicial, roles, ventanas ajenas, subframes, operaciones
simultáneas, revocación durante la conexión y conservación del pool anterior.

Pendiente en la PC del desarrollador: probar el formulario con su MySQL real,
login con su esquema y el instalador final en un Windows limpio. Las pruebas
automatizadas no validan el foco nativo de Windows ni el problema original de
congelamiento de consultas. Las actualizaciones de seguridad de las dependencias
son una tarea separada y no se han aplicado en este cambio.

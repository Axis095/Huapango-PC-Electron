# Configuración desde Ayuda — 1.0.3

Se restaura el formulario de conexión anterior. El login no tiene un botón adicional;
se abre desde **Ayuda → Configuración → Base de Datos**. Se retiran la clave local,
su formulario y sus canales IPC. No se modifica el esquema MySQL ni las fotografías.

## Uso

1. Abrir Huapango. Si la conexión guardada falla, se muestra el formulario habitual
   con el error y se mantiene abierta la ventana de login.
2. Escribir servidor, puerto, usuario SQL, contraseña y base de datos.
3. Pulsar **Comprobar y guardar**. Si falla, conserva los campos escritos y el archivo anterior.
4. Si funciona, pulsar **Continuar al inicio de sesión** y entrar con una cuenta de Huapango.
5. Si se abre la configuración desde un login que ya funcionaba y no se quiere cambiar nada,
   cerrar la ventana con la X, confirmar el cierre y continuar con el login.

La contraseña SQL guardada no se muestra: hay que escribirla de nuevo para guardar.
Cada reemplazo comprobado conserva una copia `config.json.backup-*`; tratarla como sensible.

## Alcance de permisos

La conexión puede modificarse sin iniciar sesión en Huapango por quien tenga acceso a la
instalación. Es el flujo solicitado para preparar las estaciones desde el login.
Durante una sesión activa, solo el administrador puede modificarla; usuarios y jueces
siguen sin acceso. La configuración no habilita registros, consultas de participantes,
evaluaciones ni administración: esas operaciones siguen exigiendo su sesión y rol.

El proceso principal valida la ventana exacta, el documento local y el marco emisor.
Una ventana de configuración ya finalizada o de otra sesión pierde el permiso.
Se bloquean registros y cambios de sesión durante la comprobación o activación de la conexión.

## Cierre y actualización

Se corrige `Object has been destroyed`: el callback `closed` ya no accede a `webContents`
después de destruirse la ventana de Electron. Mantiene una sola confirmación para la X / Alt+F4.

Actualizar la instalación 1.0.2 con el instalador 1.0.3. Si la versión anterior creó
`recuperacion.json`, el archivo queda sin uso; esta versión no lo lee ni lo exige.
No es necesario borrarlo para iniciar. La conexión existente permanece en `config.json`.

## Checklist con MySQL real

| Caso | Resultado esperado | Resultado / incidencia |
|---|---|---|
| Abrir login | Sin botón adicional de conexión | |
| Ayuda → Configuración → Base de Datos | Formulario anterior, sin clave local | |
| Cerrar con X y cancelar | Sigue abierta y editable | |
| Cerrar con X y confirmar, repetir tres veces | Sin error de JavaScript; se puede reabrir desde Ayuda | |
| Alt+F4 en configuración | Una confirmación y cierre sin error | |
| Puerto o contraseña SQL incorrectos | Conserva campos y configuración guardada | |
| Guardar conexión válida y continuar | Abre login y cierra configuración sin error | |
| Reiniciar con MySQL detenido | Muestra error en el formulario; permite corregir conexión | |
| Admin autenticado | Puede configurar | |
| Usuario o juez autenticado | No puede configurar ni usar IPC ajenos | |
| Actualizar desde 1.0.2 con clave creada | No pide clave; conserva datos MySQL | |
| Registrar una pareja desde otra laptop | Llega a la base central con categoría y estilo | |

Las pruebas automáticas usan dobles de MySQL; completar este checklist antes de distribuir.

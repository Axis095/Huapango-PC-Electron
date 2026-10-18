# Permisos para registrar evaluaciones

## Política

Pueden registrar evaluaciones las cuentas con rol exacto `juez` o `admin`, según el criterio acordado. En ambos casos, la columna histórica `nJuezID` recibe el ID de la cuenta que inició sesión. Un administrador registra con su propia identidad, no en nombre de otro juez.

`main.js` conecta `registrar-evaluacion` con `handleRegistrarEvaluacion`. Este controlador se ejecuta en el proceso principal y, antes de acceder a MySQL, comprueba:

- Sesión activa en `Modelos/sesionModel.js`, con rol autorizado e ID entero positivo.
- Solicitud desde el marco principal del archivo local `Vistas/Resultados.html` de esta instalación.
- ID de pareja entero positivo, puntaje entero entre 0 y 60 y comentario de hasta 255 caracteres. El comentario omitido se guarda como texto vacío.

Una solicitud sin autorización devuelve `FORBIDDEN`; los datos inválidos devuelven `INVALID_DATA`. Ninguno de esos casos ejecuta SQL.

El controlador construye un objeto nuevo con los campos admitidos y `nJuezID: sesion.userID`. Ignora cualquier ID o rol enviado por el renderer, incluidos clientes antiguos que aún envíen `nJuezID`. La vista actual ya no solicita ni transmite ese dato.

La sesión se comprueba en cada solicitud, sin cachear el permiso. Un cambio de cuenta afecta a las solicitudes posteriores; una escritura ya iniciada conserva la identidad con la que se autorizó. No se reintentan automáticamente los errores de SQL.

## Verificación

`tests/permisosEvaluaciones.test.cjs` ejecuta el canal registrado por el main, el controlador, la sesión y el modelo reales con Electron y SQL simulados. Cubre:

- Juez y administrador autorizados con su propia identidad.
- Intentos de suplantar al juez mediante datos o argumentos adicionales.
- Usuarios, sesiones ausentes/incompletas, roles desconocidos y emisores inválidos.
- Cambio y cierre de sesión, validación de datos y errores SQL.

`tests/avisos.test.cjs` comprueba que la vista no solicita/envía el ID y conserva puntajes, comentario y foco simulado cuando el guardado es denegado.

Ejecutar `npm.cmd test`. No se modifica la base instalada.

Para probar manualmente, cerrar completamente Electron e iniciar con `npm.cmd start`. En una base de prueba, guardar una evaluación desde una cuenta juez y otra desde administrador; comprobar que cada fila tiene el ID de su autor. La prueba con MySQL real y el foco nativo de Windows queda pendiente.

## Alcance

La configuración de MySQL cuenta con su propia protección, descrita en [primer arranque](primer-arranque.md). Las consultas y exportaciones también están protegidas; ver [permisos de consultas y PDF](permisos-consultas-pdf.md). Todos los canales de negocio exigen ahora el vínculo entre ventana y sesión, además del rol y la vista; ver [cierre de la revisión IPC](cierre-permisos-ipc.md). No se modifica el esquema ni se impide registrar evaluaciones repetidas.

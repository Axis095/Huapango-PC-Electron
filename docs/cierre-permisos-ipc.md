# Cierre de la revisión IPC

## Problemas corregidos

La auditoría detectó que una ventana de una cuenta anterior podía usar la sesión
global nueva en operaciones que solo comprobaban rol y URL. El vínculo con la
sesión que abrió la ventana ya se exigía para borradores e identidad, pero faltaba
aplicarlo a los demás canales de negocio. También faltaba validar el origen del
login y seguía expuesto el canal obsoleto `open-section`.

## Frontera común de autorización

Los 30 canales de negocio y borradores pasan por `desdeVentanaDeSesion` (los PDF,
mediante `exportacionDeSesion`). Se exige una ventana registrada, viva, de la sesión
actual, con su marco principal y una vista local conocida. Después se comprueba el
rol y la vista concreta de cada operación, conservando las matrices anteriores.

Una ventana vieja o no registrada se rechaza antes de invocar el controlador,
consultar SQL, procesar fotos o abrir un diálogo. Los resultados asíncronos tampoco
se entregan si cambia la sesión antes de terminar. Un nuevo inicio de sesión con
el mismo ID y rol genera otra clave y también revoca los permisos anteriores.

Los PDF reciben desde main una comprobación interna de la clave de sesión y su
ventana. La ejecutan antes y después del diálogo y antes de escribir/abrir el
archivo. Los argumentos IPC no pueden sustituir esa comprobación.

Los tres canales de configuración mantienen su control específico: ventana exacta,
rol administrador y clave de sesión que abrió el formulario. La instalación inicial
conserva su excepción sin sesión, limitada a la ventana de configuración creada
para ese flujo. La apertura por IPC también exige la ventana principal de la sesión.

## Login y ventanas

`login` solo acepta el marco principal de la instancia viva `loginWindow`, cargando
`Vistas/login.html`. No permite sustituir una sesión activa, iniciar antes de terminar
la configuración inicial ni solaparse con otra autenticación o cambio de conexión.
El origen se vuelve a validar después de consultar credenciales y antes de guardar
la sesión. Una cuenta con ID o rol inválido no se activa.

Al abrir la ventana de la cuenta se cierran las de sesiones anteriores. Aunque una
ventana tarde en cerrarse, sus mensajes quedan rechazados por la clave anterior.
Si la ventana principal no carga, se revoca la sesión creada, se cierra esa ventana
y se conserva el login para reintentar. El login espera la carga antes de anunciar éxito.

Este parche no añade una interfaz nueva de cambio de cuenta: para volver al login
se utiliza el reinicio de la aplicación o el flujo existente que cierra la sesión
al reconectar MySQL. Las pruebas simulan explícitamente una nueva sesión para cubrir
los mensajes tardíos que podrían quedar de ventanas anteriores.

## Canal retirado

`open-section` no tenía consumidores activos y cargaba la ruta inexistente
`Sections/Registros.html`. Se eliminaron su receptor y su función de apertura. El
preload ya no autoriza `open-section` ni el envío genérico de `login`; el login real
sigue usando `invoke`. La función genérica `send` queda como operación vacía para
compatibilidad con clientes antiguos. La navegación actual entre módulos se conserva.

Inventario actual: **37 canales: 36 `handle` y 1 `on`**.

- 30 operaciones de negocio y borradores con sesión de ventana.
- 2 consultas de identidad con sesión de ventana.
- 3 operaciones de configuración con su control específico.
- 1 login con su origen autorizado.
- 1 apertura de configuración desde la ventana principal autorizada.

## Pruebas y límites

`tests/cierrePermisosIPC.test.cjs` cubre los 30 canales contra ventanas anteriores
y no registradas, el cambio juez A → juez B, login desde emisores ajenos, invalidación
durante una consulta de credenciales, error de carga, revocación con el mismo ID,
respuesta de consulta tardía, PDF pendiente, primer arranque y retirada de `open-section`.
Las suites previas conservan sus pruebas de roles y modelos con ventanas simuladas
registradas explícitamente. Ejecutar `npm.cmd test`.

Las pruebas no modifican la base instalada ni ejecutan Electron real. Antes del commit,
reiniciar con `npm.cmd start` y comprobar login de los tres roles, navegación,
borradores y PDF. Una escritura SQL o a disco ya iniciada no se revierte por cambiar
la sesión: si se pierde su confirmación, verificar el registro antes de repetirla.
La revisión cierra estos tres hallazgos; no equivale a una auditoría completa de
contraseñas, almacenamiento, dependencias o seguridad de la máquina local.

# Login y compatibilidad de contraseñas

## Integración del merge

- Se conservan los permisos IPC ligados a la sesión de cada ventana, el origen restringido del login y la revocación de resultados pendientes.
- No se recuperan `open-section` ni los canales genéricos de escritura de imágenes de la versión entrante. El flujo actual de fotografías sigue en los modelos de parejas.
- Se conservan los ajustes entrantes de ventanas emergentes: aislamiento de contexto, Node deshabilitado y selección correcta de la vista de búsqueda/modificación.
- `bcryptjs` queda registrado también en `package-lock.json`. En otra computadora ejecutar `npm.cmd ci` para instalar las dependencias del lock.

## Contraseñas

Las cuentas nuevas guardan un hash bcrypt con coste 10. Tanto el cálculo como la comparación usan la API asíncrona para ceder tiempo al bucle de eventos de Electron. Esto no significa que el cálculo deje de consumir CPU.

El login consulta por nombre mediante parámetros y verifica la contraseña en el proceso principal. Acepta hashes existentes `$2a$`, `$2b$` y `$2y$`. Una contraseña incorrecta, vacía, ausente o de tipo inválido no crea sesión. Tampoco se aceptan nombres duplicados o identidades/roles inválidos. Si bcrypt falla, no hay una alternativa que conceda acceso.

Las cuentas antiguas en texto plano siguen funcionando mediante comparación exacta (incluye mayúsculas, acentos y espacios). No se cambian contraseñas, tablas ni datos al iniciar sesión. Esta compatibilidad es temporal; queda pendiente una migración controlada de contraseñas antiguas a hash.

Se reserva el prefijo `$2` para hashes: valores corruptos con ese prefijo se rechazan, aunque se envíen literalmente como contraseña. Una cuenta antigua cuya contraseña literal empezara así necesita restablecerla. No se convierte un hash inválido en texto plano.

bcrypt solo distingue los primeros 72 bytes de una contraseña. Las altas rechazan valores superiores a 72 bytes UTF-8; el login bcrypt también los rechaza para evitar aceptar una extensión de la misma contraseña. Las contraseñas antiguas en texto plano conservan su comparación completa. Una cuenta bcrypt creada previamente con más de 72 bytes necesita restablecimiento.

La columna `cContrasena` debe poder almacenar al menos los 60 caracteres del hash. Este parche no modifica el esquema de MySQL; hay que confirmar esa capacidad en la instalación real antes de probar altas. Los hashes ya truncados no se pueden recuperar.

## Validación

`npm.cmd test` cubre bcrypt real, los tres roles, cuentas antiguas, altas seguidas de login, contraseñas incorrectas, hashes inválidos, límite UTF-8, sesión revocada durante la comparación y fallos recuperables. Las pruebas de IPC mantienen los casos de ventanas antiguas, consultas, borradores, PDF y configuración inicial. Electron y MySQL se simulan; no se utilizan cuentas ni datos reales.

Comprobación manual pendiente en la instalación real:

1. Ejecutar `npm.cmd start` y entrar con una cuenta existente de cada rol.
2. Probar una contraseña incorrecta y luego la correcta, sin cerrar la aplicación.
3. Crear una cuenta de prueba desde Administración, reiniciar y entrar con ella.
4. Confirmar sus permisos y repetir un borrador y una exportación PDF según el rol.

No se realiza commit ni push automáticamente.

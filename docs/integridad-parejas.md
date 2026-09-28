# Modificación y eliminación de parejas

## Comportamiento

- Modificar guarda los dos participantes con un único `UPDATE` sobre la misma
  fila. Los campos obligatorios vacíos se rechazan antes de adquirir conexión.
  No seleccionar una foto nueva conserva la referencia anterior.
- Se comprueba la existencia de la pareja con `SELECT ... FOR UPDATE` dentro de
  la transacción. El resultado distingue `NOT_FOUND`, `UNCHANGED` y `UPDATED`.
  Guardar los mismos datos es una operación válida, sin cambios.
- El controlador verifica el resultado del modelo; un objeto de error ya no se
  interpreta como actualización exitosa. La pantalla muestra el mensaje devuelto.
- Administración y parejas comparten una única implementación de eliminación:
  evaluaciones, categorías, estilos y participantes se borran en una conexión y
  se confirman juntos. Un error anterior a la confirmación provoca `ROLLBACK`.
- Si falla la respuesta a `COMMIT`, no se afirma que los cambios se deshicieron:
  devuelve `TRANSACTION_OUTCOME_UNKNOWN` y pide consultar antes de reintentar.
  No hay reintentos automáticos. Las conexiones con fallo de inicio, confirmación
  o reversión se descartan y no vuelven al pool.

## Base de datos

`withTransaction(tablas, callback)` en `db.js` entrega al callback una función
de consulta ligada a una sola conexión. Dentro de ese callback se debe usar esa
función, esperar todas las consultas y evitar `queryDatabase`, que adquiriría
otra conexión. La función de consulta deja de estar disponible al finalizar.

Antes de operar, se comprueba que las tablas declaradas existan y sean InnoDB.
Una instalación incompatible se rechaza antes de escribir; no se modifica su
esquema automáticamente. El usuario MySQL necesita acceso a los metadatos de
esas tablas además de los permisos de lectura/escritura correspondientes.

En la base local inspeccionada las seis tablas usan InnoDB, `nParejaID` es clave
primaria en participantes y no se encontraron triggers. Si se añaden triggers,
tablas relacionadas o cambios de motor, hay que revisar también sus efectos y
ampliar las comprobaciones. No cambiar el esquema mientras haya operadores activos.

## Validación realizada

Las pruebas en `tests/integridadParejas.test.cjs` cargan el código real con un
driver simulado que separa datos pendientes de datos confirmados. Cubren éxito,
inexistencia, datos iguales, errores SQL, fallo en cada eliminación, esquema
incompatible y pérdida de conexión al confirmar o revertir. Las pruebas de vista
verifican los mensajes y que los campos continúan disponibles tras la respuesta.

Además se probó el helper contra MySQL local con consultas de lectura: metadatos,
`BEGIN`, `SELECT 1`, `COMMIT`, `ROLLBACK` y reutilización de la conexión. No se
ejecutaron INSERT, UPDATE, DELETE ni cambios de esquema en la base real.

El merge había retirado `avisos.css` de cuatro vistas. Se restauró su enlace,
conservando `modern-ui.css` y el diseño nuevo.

## Ensayo antes del piloto

Usar una base de prueba con respaldo, no registros del evento:

1. Completar los bloques **Nuevos datos** de ambos participantes y modificar una
   pareja existente. Buscarla y verificar ambos participantes.
2. Repetir con los mismos valores: debe indicar que no hubo cambios.
3. Probar un ID inexistente: debe informar que no existe, sin anunciar éxito.
4. Intentar usar un correo/teléfono duplicado: confirmar que ninguno de los dos
   participantes cambia y que el formulario conserva lo escrito.
5. Eliminar una pareja desechable con categoría, estilo y evaluaciones; comprobar
   que desaparece con sus relaciones y que otra pareja permanece intacta.

La comprobación manual de escrituras y del foco real en Electron está pendiente.

## Límites

- La transacción cubre MySQL. No revierte archivos de imágenes que ya se hayan
  guardado antes del envío; pueden quedar archivos sin referencia si falla SQL.
- El formulario todavía requiere los datos completos de ambos participantes;
  no se implementó carga automática ni edición parcial. Conserva sus bloques
  auxiliares anteriores; solo **Nuevos datos** se envía al actualizar.
- Se evita una escritura parcial, pero todavía no se detecta si dos operadores
  editaron versiones antiguas de la misma ficha: la última escritura confirmada
  puede reemplazar cambios de otra estación.
- No se cambiaron permisos por rol, almacenamiento de contraseñas, límites de
  espera ni persistencia de borradores al cerrar la aplicación.

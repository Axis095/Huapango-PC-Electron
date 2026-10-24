# Edición simultánea de parejas

## Comportamiento

Al buscar una pareja se recibe `versionEdicion`, una huella SHA-256 calculada por MySQL a partir de su ID y los datos de ambos participantes, incluidas las referencias de fotografías. No se modifica el esquema ni se utilizan los relojes de las laptops.

El formulario conserva esa huella junto al borrador. Al guardar, el modelo bloquea la fila con `SELECT ... FOR UPDATE` dentro de la transacción existente y compara la huella actual con la recibida. Si difieren, devuelve `EDIT_CONFLICT` sin ejecutar el UPDATE. No hay reintento automático. Si falta la huella o tiene un formato inválido, devuelve `VERSION_REQUIRED` antes de preparar fotos o consultar MySQL.

Tras un guardado válido se lee la huella resultante dentro del mismo bloqueo y se devuelve al formulario. Esto permite continuar editando sin recargar ni utilizar una versión antigua. Se mantienen los permisos de usuario/administrador y de sesión por ventana.

## Resolver un conflicto

1. El guardado se bloquea y se conservan los campos, las fotos seleccionadas y la versión original. Cambiar de módulo y regresar conserva el conflicto en la misma ventana y sesión.
2. **Consultar datos actuales** muestra la información de MySQL y los valores propuestos sin reemplazar el formulario ni guardar nada.
3. El operador compara y puede corregir sus campos. Los campos que no cambió respecto a la ficha original tomarán el valor actual de MySQL. Los campos editados localmente y las fotos seleccionadas tienen prioridad solo después de la revisión explícita; la pantalla advierte que pueden reemplazar cambios de otro operador en esos mismos campos.
4. **Revisé los datos: preparar este borrador** actualiza la base de comparación y prepara el formulario. Todavía no escribe en MySQL.
5. **Guardar cambios** vuelve a validar la huella. Si otro operador guardó durante la revisión, aparece un nuevo conflicto.

Una revisión fallida, una pareja eliminada o una respuesta con otro ID no sustituyen el borrador. Los borradores anteriores sin huella requieren revisión, pero conservan su texto y fotos. La revisión consultada no se persiste: al salir antes de aplicarla, se conserva el borrador original y se debe consultar nuevamente.

Si el conflicto se detecta después de preparar archivos nuevos, estos se eliminan; las fotos ya referenciadas por MySQL permanecen. No se cambian las reglas existentes para un COMMIT incierto.

## Alcance y despliegue

- Actualizar **todas** las instalaciones antes del ensayo. Una aplicación antigua que ejecute UPDATE sin esta comprobación puede seguir sobrescribiendo datos.
- Se requiere MySQL con `JSON_ARRAY` y `SHA2` disponibles, y tablas InnoDB como ya exige el flujo transaccional. No hay una migración SQL adicional.
- La huella describe el contenido de la fila; no es un historial ni un contador. Cambiar datos y restaurarlos exactamente produce la misma huella. No identifica una eliminación/recreación con contenido idéntico.
- Las categorías, estilos y evaluaciones son operaciones separadas y no forman parte de esta huella.
- Los borradores siguen en memoria: no sobreviven al cierre de la ventana o al cambio de sesión.
- Este cambio no habilita el almacenamiento compartido de fotos entre laptops.

## Pruebas

La suite ejecuta modelos/controladores y lógica de formulario reales con MySQL y Electron simulados. Incluye dos solicitudes con la misma versión, ausencia de versión, huella de otro ID, cambio de fotografía, limpieza de fotos preparadas, recuperación del borrador, revisión fallida, campos editados por ambos operadores y un nuevo conflicto después de revisar.

### Ensayo manual con dos instalaciones actualizadas

1. En A y B, iniciar sesión como usuario o administrador contra la misma base de pruebas y abrir la misma pareja.
2. En A, cambiar el teléfono y guardar.
3. En B, cambiar el correo y seleccionar una foto; intentar guardar. Debe aparecer el conflicto y el teléfono de A debe permanecer en MySQL.
4. En B, cambiar de módulo y volver: correo, foto y aviso de revisión deben mantenerse.
5. Consultar datos actuales y comprobar el teléfono nuevo junto al correo propuesto. Preparar el borrador revisado y guardar: deben conservarse ambas correcciones.
6. Repetir cambiando el mismo campo en ambas computadoras. Comparar y elegir conscientemente el valor final antes de preparar y guardar.
7. Repetir modificando en A después de que B consulte la revisión: el siguiente guardado de B debe volver a rechazarse.
8. Eliminar desde Administración una pareja de prueba que B tenga abierta: B no debe recrearla ni perder su borrador al intentar guardar.

No se han utilizado cuentas ni datos reales en las pruebas automatizadas. El ensayo sobre MySQL real queda pendiente antes del commit.

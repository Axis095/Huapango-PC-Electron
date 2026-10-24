# Esperas y recuperación de MySQL

## Límites

El proceso principal limita las esperas en `db.js`. Los plazos se aplican a cada etapa, no a todo el recorrido de una pantalla:

| Etapa | Límite |
| --- | --- |
| Prueba inicial de conexión | 5 segundos |
| Obtener conexión del pool | 5 segundos |
| Cada consulta | 15 segundos |
| Iniciar una transacción | 5 segundos |
| Comprobación de tablas y operaciones dentro de la transacción | 30 segundos en conjunto |
| Confirmar o revertir la transacción | 5 segundos |

Una consulta independiente puede tardar hasta aproximadamente 20 segundos sumando adquisición y ejecución; una operación transaccional, hasta aproximadamente 45 segundos sumando sus etapas. Un controlador que realiza varias consultas independientes suma sus plazos. Los temporizadores dependen del bucle de eventos de Node: no son una garantía de tiempo real frente a CPU bloqueada o suspensión de Windows.

El pool mantiene un máximo de diez conexiones y no encola solicitudes cuando está lleno. En ese caso devuelve `DB_BUSY` sin enviar SQL; el usuario puede intentar nuevamente cuando termine otra operación. No se reintentan consultas automáticamente.

## Conexiones vencidas y respuestas tardías

- Una conexión adquirida después de vencer el plazo se destruye sin ejecutar la operación abandonada.
- Una conexión cuya consulta vence o pierde la comunicación se retira mediante `destroy()`; nunca se devuelve al pool para otro usuario.
- Una respuesta tardía no cambia el error ya devuelto por una operación vencida.
- El callback de una transacción vencida no puede enviar nuevas consultas ni ejecutar un COMMIT tardío desde este flujo.
- Terminar la espera y cerrar la conexión no prueba que una escritura ya enviada haya sido cancelada en el servidor.

## Resultados seguros e inciertos

- **Sin conexión o pool ocupado:** la operación no se envió. Se conservan los datos para reintentar.
- **Lectura agotada o conexión perdida:** se informa del fallo y se recuperan los controles para volver a consultar.
- **Error SQL con rollback confirmado:** se mantiene el error original; no se anuncia éxito.
- **Escritura independiente sin confirmación:** `WRITE_OUTCOME_UNKNOWN`. La escritura podría haberse aplicado; comprobar los registros antes de repetirla, especialmente en evaluaciones.
- **Transacción sin confirmación o sin rollback comprobado:** `TRANSACTION_OUTCOME_UNKNOWN`. Se conservan las precauciones existentes sobre fotografías y no se anuncia éxito ni se reintenta.

Los modelos y controladores conservan los códigos de error de MySQL al añadir sus mensajes. El login muestra mensajes de conexión reconocidos y mantiene la respuesta genérica para errores internos.

## Formularios

Registro y edición conservan explícitamente su borrador cuando falla la operación, incluido un rechazo de la llamada IPC. En Registro se conserva también el aviso de error al cambiar de módulo y volver. Los datos confirmados de una pareja no se descartan si después falla el alta de categoría o estilo.

En Evaluación, los puntajes y comentarios permanecen en la pantalla al fallar y los controles se habilitan nuevamente. Este parche no agrega borradores de evaluaciones entre módulos. Los borradores de parejas siguen en memoria y no sobreviven al cierre de la ventana, cambio de cuenta o reinicio.

El usuario todavía puede ordenar un nuevo intento manual. Un resultado incierto debe comprobarse antes; no se incorpora una clave de idempotencia ni una garantía contra duplicados entre varios intentos manuales.

## Validación automatizada

`npm.cmd test` incluye un reloj virtual para simular los plazos sin esperar segundos reales. Cubre conexión inicial, adquisición tardía, saturación, lectura y escritura detenidas, errores de red, inicio de transacción, callback detenido, COMMIT/ROLLBACK sin respuesta y conservación del formulario de registro, modificación y evaluaciones.

Las pruebas simulan MySQL y Electron. No detienen servicios ni modifican datos de instalaciones reales.

## Ensayo manual antes del commit

Usar una base de pruebas y coordinar la interrupción con las demás personas conectadas.

1. Abrir Registro, completar una pareja y seleccionar una foto. Detener MySQL antes de guardar. Debe aparecer un error, recuperarse los controles y conservarse el formulario y la foto, también al cambiar de módulo y volver.
2. Reiniciar MySQL y volver a consultar. Si la operación anterior no se envió, registrar la pareja una sola vez y comprobarla.
3. En Edición, preparar cambios y desconectar la red antes de guardar. Debe conservarse la ficha y su versión original. Al recuperar la red, comprobar la pareja antes de repetir si el resultado fue incierto.
4. En Evaluación, introducir puntajes y comentario e interrumpir la conexión durante el envío. Deben conservarse los campos y recuperarse los controles. Consultar las evaluaciones antes de volver a pulsar Guardar.
5. Repetir una búsqueda y un PDF con MySQL detenido. No deben mostrar éxito ni dejar sus controles permanentemente deshabilitados. Al restaurar el servicio, una nueva consulta debe funcionar sin volver a configurar credenciales.
6. Una desconexión detectada inmediatamente puede producir un error antes del plazo; para probar el vencimiento completo se necesita simular una conexión que permanezca abierta sin responder.

Las esperas de disco, fotografías, diálogos de archivo y renderizado de PDF quedan fuera de estos límites de MySQL.

# Buscar y editar parejas

El menú «Parejas: buscar y editar» abre `BusquedaParejas.html`. La ruta anterior `ModificarParejas.html` conserva compatibilidad y presenta la misma ficha con el mismo módulo `fichaPareja.js`.

## Flujo

1. Buscar por ID. Los datos de ambos participantes se precargan en modo lectura con etiquetas legibles y fechas compatibles con el formulario.
2. Pulsar Editar, corregir y guardar. El ID de destino pertenece a la ficha cargada; cambiar el campo del buscador no modifica ese destino.
3. Al guardar se envían los datos de ambos participantes y únicamente las fotos nuevas seleccionadas. No seleccionar una foto conserva la anterior. La ficha indica si existe una foto guardada; esta entrega no incorpora una vista previa de la imagen existente.
4. Cancelar una edición con cambios o buscar otra pareja requiere confirmación dentro de la página. Escape cancela la confirmación. Si la nueva búsqueda falla o no encuentra el ID, se conserva la ficha anterior y sus cambios, identificados por su ID.
5. Cerrar ficha descarta solo el borrador después de confirmar. No elimina registros de MySQL.

Las consultas de categorías y estilos siguen disponibles en la sección desplegable inferior. Esta entrega no añade edición de categoría, estilo o sexo ni modifica el esquema SQL.

## Borrador y errores

La ficha utiliza los canales de borrador de Modificación, ahora permitidos únicamente desde ambos archivos locales en el frame principal. Se mantienen el aislamiento por ventana y la separación del borrador de Registro.

El borrador versión 2 guarda el ID cargado, los valores originales, la edición, el texto de búsqueda y las fotos seleccionadas. Navegar espera su conservación; si falla no se abandona la página. No se admite cargar un borrador versión 1 como ficha verificada: completar la edición anterior antes de actualizar y reiniciar la aplicación. Los borradores son temporales y se pierden al cerrar la ventana o el proceso.

Un fallo SQL conserva las ediciones. Un resultado `TRANSACTION_OUTCOME_UNKNOWN` se muestra sin reintento automático: verificar la pareja antes de repetir. Después de confirmar SQL, la ficha pasa a lectura y las fotos ya guardadas dejan de seleccionarse. Si falla la actualización del borrador, se comunica que SQL sí confirmó, para evitar repetir el guardado.

Los borradores también se aíslan por sesión. Cambiar de cuenta o volver a iniciar sesión, incluso con la misma cuenta, los vuelve inaccesibles. Las ventanas anteriores no pueden reenviarlos a la sesión nueva. Ver [permisos de sesión y borradores](permisos-sesion-borradores.md).

La modificación conserva la transacción existente. Aún no hay detección de ediciones concurrentes realizadas desde otras estaciones; se requiere antes de operar con varios registradores.

## Verificación manual

Reiniciar completamente Electron. Usar una base de prueba.

- Desplazarse hasta el final: el menú debe permanecer visible. En ventanas estrechas, sus opciones se recorren horizontalmente o con Tab.
- Comprobar la ficha a 1366 × 768 y con la ventana estrecha: dos columnas en escritorio y una por debajo de 760 px, sin tarjetas anidadas ni campos fuera del contenedor.
- En lectura se indica si hay foto; los selectores y su ayuda aparecen únicamente al editar, también al recuperar un borrador.
- Guardar mantiene el énfasis principal; Cancelar/Cerrar son neutros y la confirmación de descarte es roja. Mientras una acción está en curso, sus botones deshabilitados no deben animarse al pasar el cursor.

- Buscar una pareja existente y comprobar los diez campos de ambos participantes, especialmente fechas.
- Editar un nombre, ir a Registro y regresar. Confirmar que se conserva y guardar.
- Editar, buscar otro ID y cancelar; comprobar que permanece la edición. Confirmar otra búsqueda y comprobar que cambia el encabezado al ID correcto.
- Buscar un ID inexistente con una edición pendiente y comprobar que esta se conserva.
- Seleccionar foto, provocar un error de validación, corregir y guardar. Navegar y regresar para comprobar que la foto no sigue seleccionada.
- Cancelar edición y Cerrar ficha: verificar confirmación, Escape y conservación del teclado.
- Comprobar categorías y estilos, y acceso desde el menú usando roles administrador y usuario.

Las pruebas automatizadas usan datos simulados y no modifican la base real. La interacción visual y el foco nativo necesitan una comprobación en Electron.

# Borrador de Modificación de Parejas

La pantalla conserva el ID, todos los campos de referencia y edición, y las cuatro selecciones de fotos al navegar a otro módulo en la misma ventana. El borrador está separado del de Registro y no escribe cambios en MySQL. Los campos de referencia siguen siendo auxiliares; Guardar utiliza los campos de nuevos datos (`...Update`).

El menú espera a que se copien los bytes de las fotos y se confirme la conservación del borrador. Si falla, impide salir y mantiene los datos editables. Mientras se guarda una modificación, evita un segundo envío y la navegación. Un error SQL conserva el formulario y las fotos para corregirlos.

Tras una actualización confirmada, se conservan los textos y el ID; las fotos nuevas ya guardadas se deseleccionan y el borrador se actualiza para no volver a enviarlas al regresar. Si falla este último paso, se informa que SQL sí confirmó y se pide reintentar la navegación, sin repetir la escritura SQL.

**Limpiar formulario** requiere confirmar dentro de la página. Cancela las ediciones y selecciones locales sin borrar una pareja de la base de datos. Cancelar mantiene el borrador. Si no se puede recuperar el borrador al entrar, el formulario permanece deshabilitado para impedir sobrescribirlo y permite salir para reabrir el módulo.

## Alcance

- Memoria del proceso principal, aislada por ventana y accesible solo desde `ModificarParejas.html` local en el frame principal.
- Cerrar la ventana o aplicación, reiniciar o una caída del proceso puede perder el borrador. No es recuperación ante fallos ni respaldo.
- El cambio no recupera datos perdidos antes de instalarlo.
- Fotos PNG/JPEG de hasta 5 MiB por archivo para el borrador; el almacenamiento definitivo valida además contenido y dimensiones al guardar.

## Comprobación manual

Reiniciar completamente con `npm.cmd start` para cargar los nuevos canales IPC. Usar una base y datos de prueba.

1. Escribir el ID y datos parciales en Modificación, incluyendo campos de referencia y nuevos datos. Seleccionar fotos.
2. Ir a Búsqueda, consultar una pareja y regresar. Comprobar textos, ID y fotos; debe poder seguir escribiéndose.
3. Visitar Registro y regresar a Modificación. Los dos borradores deben permanecer independientes.
4. Provocar un error de validación o SQL. Navegar y regresar; comprobar que se conservan los datos para corregirlos.
5. Guardar correctamente una modificación con foto, navegar y volver. El texto permanece y la foto ya guardada no debe seguir seleccionada para reenviarse.
6. Pulsar Limpiar formulario y Cancelar: todo permanece. Confirmar después y navegar de nuevo: debe volver vacío.

Las pruebas automatizadas usan DOM simulado, IPC simulado y archivos en memoria; no escriben en la base real ni demuestran por sí solas el foco nativo de Windows.

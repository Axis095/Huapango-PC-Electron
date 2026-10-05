# Fotografías de participantes

## Almacenamiento

Registro y modificación envían los bytes de las fotos junto con los datos de la pareja. El proceso principal valida y guarda los archivos en `app.getPath("userData")/uploads/fotos/`, normalmente `%APPDATA%/huapango-app/uploads/fotos/` en Windows. MySQL conserva únicamente referencias relativas como `uploads/fotos/<uuid>.png` en `oFoto` e `IFotoM`.

No requiere dependencias nuevas ni cambios de esquema. Las fotos son opcionales: al registrar sin fotos se usa cadena vacía en `oFoto` (la columna actual es NOT NULL) y NULL en `IFotoM`. Al modificar sin seleccionar una foto se conserva la referencia anterior. No se permite asignar rutas arbitrarias desde el formulario.

Se aceptan PNG y JPEG entre 1 byte y 5 MiB, hasta 16 megapíxeles y 8192 píxeles por lado. Se comprueban cabecera, dimensiones y decodificación con Electron; el nombre y el MIME enviados no determinan el formato real. Se conservan los bytes originales, incluidos sus metadatos; no se comprimen ni se eliminan metadatos automáticamente. El acceso al disco es asíncrono; la decodificación nativa tiene límites de entrada pero sigue ejecutándose en el proceso principal.

## Consistencia con SQL

1. Se crean archivos con nombres UUID exclusivos, antes de iniciar la transacción SQL.
2. Si falla una foto o SQL revierte, se intenta eliminar únicamente los archivos nuevos de esa operación.
3. Después de confirmar una sustitución o eliminación, se retiran las fotos administradas por este flujo que ya no aparecen en `oFoto` ni `IFotoM` de la base configurada.
4. Si el resultado del COMMIT es incierto, se conservan los archivos y se propaga `TRANSACTION_OUTCOME_UNKNOWN`. Verificar el registro antes de repetir la operación.
5. Los errores al limpiar se registran en consola y no convierten una escritura confirmada en un falso fallo.

Un cierre forzado entre disco y SQL, una confirmación incierta o permisos insuficientes pueden dejar archivos sin referencia. No hay un barrido automático: su reconciliación debe considerar la base, respaldos y otras instalaciones. Las rutas heredadas no se eliminan automáticamente. No compartir la misma carpeta entre bases independientes que hayan copiado referencias.

## Fotos anteriores y respaldos

Las referencias existentes no se migran. El registro antiguo guardaba solo el nombre: si nunca copió el archivo, hay que volver a seleccionarlo al modificar la pareja. Este cambio no añade una galería o vista previa; la consulta sigue mostrando la referencia.

Respaldar SQL **y** la carpeta `uploads` como un conjunto, con escrituras detenidas. Restaurar ambos en la PC de destino. No incluir fotos personales en Git ni dentro del instalador.

Este almacenamiento es local a la PC que ejecuta Electron. Para varias estaciones, el siguiente paso es trasladar este servicio al equipo central y transferir las fotos por una API; conectar varias laptops al mismo MySQL no comparte sus archivos.

## Comprobación manual en una base de pruebas

1. Registrar una pareja con PNG y JPEG; consultar sus referencias y comprobar ambos archivos en `uploads/fotos`.
2. Reiniciar la aplicación y verificar que los archivos permanecen.
3. Actualizar datos sin seleccionar fotos; comprobar que las referencias no cambian.
4. Reemplazar una foto; comprobar la nueva y la retirada de la anterior una vez confirmado SQL.
5. Intentar un ID duplicado con fotos nuevas; comprobar que los archivos previos permanecen y los nuevos se retiran.
6. Probar un archivo mayor de 5 MiB o que no sea una imagen; corregirlo y volver a guardar sin perder el resto del formulario.
7. Eliminar la pareja de prueba; comprobar que las fotos nuevas sin referencias se retiran.

`npm.cmd test` utiliza carpetas temporales y SQL simulado. No escribe en la base ni en la carpeta de fotos real del usuario.

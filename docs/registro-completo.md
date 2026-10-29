# Registro completo de parejas

## Flujo actual

1. Capturar los datos de ambos participantes.
2. Seleccionar categoría y estilo, con sus respectivos IDs de registro.
3. Pulsar **Guardar pareja, categoría y estilo** al final del formulario.

El proceso principal valida las clasificaciones y guarda los tres registros en
una sola transacción. No confía en las validaciones del formulario. Un fallo en
cualquiera de los INSERT revierte el alta completa; los campos y fotos elegidas
permanecen disponibles para corregir y reintentar. Un resultado de commit incierto
mantiene el aviso existente de consultar la pareja antes de repetir la operación.

Los IDs de categoría y estilo conservan el significado del esquema actual: son
IDs de sus registros, no el valor de la opción del desplegable. Si están ocupados,
MySQL rechaza el alta sin dejar una pareja a medias. No se cambian tablas ni IDs.
Las tres tablas deben usar InnoDB; la capa de conexión lo comprueba antes de escribir.

Un formulario sin guardar puede conservarse como borrador al cambiar de módulo.
Eso no crea una pareja en MySQL. Para borradores antiguos con pareja ya guardada y
clasificación incompleta, se mantienen los botones de completar categoría y estilo.
Hasta confirmar ambos, se bloquean el cambio de módulo y el inicio de otra pareja.
Esta compatibilidad no completa automáticamente registros antiguos de la base.

## Nombres y correos

Registro y edición admiten nombres con letras, acentos, espacios, guiones,
apóstrofos rectos o tipográficos y puntos: por ejemplo, `Jean-Luc`, `O'Connor`,
`Anne-Marie` y `D’Arcy`. No se exige un mínimo arbitrario de letras. Se conservan
los caracteres del nombre y se normaliza su representación Unicode a NFC.

Los correos se recortan y convierten a minúsculas antes de guardar, tanto en la
vista como en el modelo del proceso principal. No se cambian masivamente los correos
antiguos; se normalizan cuando se edita la pareja.

## Verificación

- Probar nombres con guion, apóstrofo recto, apóstrofo tipográfico y acentos.
- Registrar y editar con correos en mayúsculas; comprobar que quedan en minúsculas.
- Dejar sin seleccionar categoría o estilo: no debe enviarse el alta.
- Probar IDs de clasificación vacíos, cero, negativos o fraccionarios: se rechazan.
- Usar un ID de categoría o estilo ya ocupado: comprobar que tampoco se creó la pareja.
- Corregir los IDs y guardar: deben existir los tres registros asociados a la pareja.
- Cambiar de módulo y regresar: una pareja completa no se vuelve a insertar.
- Con un borrador antiguo incompleto, comprobar que no permite navegar ni vaciarlo
  hasta guardar ambas clasificaciones.
- Detener MySQL durante el alta: comprobar que conserva los campos y las fotografías.
  Si avisa que no se pudo confirmar el resultado, consultar antes de volver a guardar.

Las pruebas automatizadas usan conexiones simuladas con estado y rollback, e incluyen
permisos, fotografías, edición simultánea y errores de conexión. La inspección de
metadatos del MySQL local del 29 de octubre de 2026 confirmó las tres tablas InnoDB,
sin CHECK ni triggers en participantes. Su codificación actual es latin1; esta
revisión no cambia la codificación ni los registros existentes. No se realizaron
altas ni modificaciones en la base real durante esa inspección.

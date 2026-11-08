# Checklist del instalador 1.0.1

Pruebas manuales de nombres, identificadores y borradores con MySQL, antes del commit de `fix/validaciones-piloto`.

## Datos del ensayo

| Dato | Completar |
|---|---|
| Fecha y hora | |
| Responsable | |
| Laptop y versión de Windows | |
| Versión instalada | 1.0.1 |
| Rol de Huapango utilizado | |
| IP de la PC central | |
| Nombre de la base de datos | |
| IDs reservados para las pruebas | |
| Resultado general | Pendiente |

Usar datos ficticios e IDs libres. Anotar los IDs creados para verificarlos en Workbench. Registrar los resultados sin incluir contraseñas. Marcar una casilla únicamente después de comprobar su resultado esperado. Documentar los fallos en la tabla final.

## Instalación y conexión

- [ ] Cerrar Huapango e instalar la versión 1.0.1.
- [ ] Abrir la aplicación y comprobar que conecta con la PC central.
- [ ] Iniciar sesión con una cuenta de Huapango de rol `user` o `admin`.
- [ ] Buscar una pareja existente y comprobar que carga correctamente.

## Nombres y apellidos al registrar

Completar los demás campos, incluida categoría y estilo. Probar cada valor inválido por separado.

- [ ] `A` rechaza el registro.
- [ ] ` A ` rechaza el registro.
- [ ] `A-`, `A'` y `Aʼ` rechazan el registro en cada intento.
- [ ] `Á` rechaza el registro porque contiene una sola letra.
- [ ] Repetir los casos anteriores con el nombre y el apellido de ambos participantes.
- [ ] El aviso indica que se requieren al menos dos letras y permite corregir el campo.
- [ ] `Li`, `María-José`, `O'Neill` y `D’Ávila` superan la validación.
- [ ] Corregir el formulario, guardar y comprobar en Workbench los nombres, categoría y estilo.

## Identificadores

Repetir en número de pareja, ID de categoría, ID de estilo y los tres buscadores correspondientes.

- [ ] Escribir letras o símbolos impide su inserción y muestra un aviso.
- [ ] Pegar `12a3`, `1e2` o `1.5` rechaza el pegado completo.
- [ ] Si el campo tenía `42`, pegar `12a3` conserva `42`.
- [ ] Se pueden escribir y pegar dígitos, borrar, seleccionar y corregir.
- [ ] Intentar enviar un ID vacío o `0` se rechaza.
- [ ] Buscar un ID válido existente muestra la pareja correspondiente.
- [ ] Buscar un ID numérico inexistente muestra el aviso y permite seguir escribiendo.
- [ ] Repetir la búsqueda desde la pantalla de evaluaciones con una cuenta autorizada.

Los valores `1e2` y `1.5` deben rechazarse completos, sin convertirse en otro número. Para los buscadores de categoría y estilo, utilizar el ID de pareja que solicita la pantalla.

## Borrador de registro

- [ ] Completar una pareja ficticia y seleccionar una fotografía.
- [ ] Poner `A` en un nombre e intentar registrar.
- [ ] Comprobar que permanecen los demás datos, categoría, estilo y fotografía.
- [ ] Cambiar de módulo y regresar, manteniendo la misma ventana y sesión.
- [ ] Comprobar que se recupera el formulario, incluido el nombre inválido y la foto.
- [ ] Corregir el nombre y guardar.
- [ ] Confirmar en Workbench que existe una sola pareja con ese ID y sus asignaciones.

## Edición y borrador de modificación

- [ ] Buscar una pareja ficticia existente y entrar en edición.
- [ ] Cambiar un apellido a `A'`, modificar otro dato y seleccionar una foto de reemplazo.
- [ ] Intentar guardar muestra el aviso y devuelve el foco al apellido.
- [ ] Consultar en Workbench y comprobar que los valores guardados corresponden a la versión anterior al intento.
- [ ] Cambiar de módulo y regresar recupera las modificaciones pendientes y la foto seleccionada.
- [ ] Corregir el apellido a `O'Neill` y guardar.
- [ ] Volver a buscar la pareja y confirmar los cambios en Workbench.
- [ ] Si existe un registro antiguo con un nombre de una letra, comprobar que puede consultarse y que al editarlo pide corregir ese nombre antes de guardar. Si no existe un caso disponible, registrar este punto como pendiente con su motivo.

## Fallo de conexión

Avisar al equipo y realizar esta parte cuando hayan terminado las otras operaciones en curso.

- [ ] Preparar un registro completo con datos válidos.
- [ ] Interrumpir temporalmente la conexión de esa laptop e intentar guardar.
- [ ] La operación termina con un aviso, conserva los campos y permite continuar usando el formulario.
- [ ] Restablecer la conexión.
- [ ] Buscar primero el ID para comprobar si la operación alcanzó a guardarse.
- [ ] Si está ausente, reintentar y comprobar que queda una sola pareja completa.

La conservación de borradores se prueba dentro de la misma ventana y sesión. Cerrar la aplicación o cambiar de cuenta termina ese borrador.

## Registro de resultados

Completar cada fila y añadir las necesarias para distinguir laptops, roles y valores probados. Usar los estados **Pasa**, **Falla** o **Pendiente**. Una casilla sin marcar representa una comprobación pendiente.

| Caso | Equipo y rol | ID de pareja | Resultado esperado | Resultado observado | Estado |
|---|---|---|---|---|---|
| Instalación y conexión | | | Arranca y consulta la PC central | | Pendiente |
| Nombre `A` al registrar | | | Rechazo y formulario conservado | | Pendiente |
| Nombres con acentos, guiones y apóstrofos | | | Guardado con los caracteres correctos | | Pendiente |
| Pegado `12a3` en ID | | | Valor anterior conservado | | Pendiente |
| ID vacío, cero o mal formado | | | Rechazo antes de enviar la operación | | Pendiente |
| Búsqueda de pareja inexistente | | | Aviso y teclado operativo | | Pendiente |
| Borrador de registro con foto | | | Datos y foto recuperados al regresar | | Pendiente |
| Edición inválida y cambio de módulo | | | Aviso, foco y borrador recuperado | | Pendiente |
| Registro antiguo con una sola letra | | | Consulta disponible y corrección requerida al editar | | Pendiente |
| Corrección y guardado | | | Una pareja completa en MySQL | | Pendiente |
| Fallo de conexión y recuperación | | | Aviso, campos conservados y guardado verificado | | Pendiente |

Para cada fallo, completar lo siguiente.

| Dato de la incidencia | Descripción |
|---|---|
| Pantalla y rol | |
| Pasos para reproducir | |
| Valor exacto ingresado | |
| Mensaje recibido | |
| Resultado en Workbench | |
| Evidencia o captura | |
| Responsable y resultado del reintento | |

## Cierre del ensayo

- [ ] Todas las comprobaciones tienen resultado registrado.
- [ ] Cada fallo fue corregido y vuelto a probar satisfactoriamente.
- [ ] Los casos pendientes están identificados con su motivo antes de decidir el commit.
- [ ] El equipo confirmó los registros de prueba y sus asignaciones en la base central.

Antes de generar el instalador 1.0.1 se aprobaron **375 pruebas automatizadas**, incluidas solicitudes directas al proceso principal para comprobar las validaciones. Este checklist documenta la comprobación manual del instalador con MySQL y la red del equipo.

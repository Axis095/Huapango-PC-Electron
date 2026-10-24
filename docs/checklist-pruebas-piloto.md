# Checklist de pruebas del piloto

Rama: `fix-permisos-ipc`  
Versión de referencia: `a32c26d`  
Objetivo: comprobar permisos, login, edición simultánea y recuperación ante fallos de MySQL.

Este documento no certifica que las pruebas estén realizadas. Marcar cada casilla únicamente después de comprobar el resultado. Registrar el commit realmente probado, aunque el documento se publique en un commit posterior.

## Registro de la ejecución

- Fecha y responsable:
- Commit probado (`git rev-parse HEAD`):
- Equipos y versión de Windows:
- Versión de Node.js (`node --version`):
- Versión de MySQL:
- Base de pruebas (sin contraseñas ni datos personales):
- Cuentas/roles de prueba:

Estados: **Pendiente**, **Aprobado**, **Fallido**, **Bloqueado** o **No aplica** (justificar).

| Bloque | Responsable | Estado | Evidencia o incidencias |
| --- | --- | --- | --- |
| Preparación | | Pendiente | |
| Login y sesión | | Pendiente | |
| Permisos | | Pendiente | |
| Borradores | | Pendiente | |
| Edición simultánea | | Pendiente | |
| Fallos de MySQL | | Pendiente | |
| Recuperación de MySQL | | Pendiente | |

Para otra ronda, copiar el registro y los resultados indicando el nuevo commit; conservar las incidencias anteriores y anotar su comprobación posterior.

## 1. Preparación

- [ ] Guardar los cambios locales antes de cambiar de rama y cerrar la aplicación.
- [ ] Actualizar e instalar las dependencias:

```powershell
git fetch origin
git switch fix-permisos-ipc
git pull --ff-only origin fix-permisos-ipc
npm.cmd ci
git log -1 --oneline
npm.cmd test
npm.cmd start
```

- [ ] Confirmar que todos prueban el mismo commit acordado. La referencia inicial es `a32c26d`.
- [ ] Confirmar que pasan las 309 pruebas automatizadas de esa referencia. Si cambia el número en otra versión, registrar el resultado real.
- [ ] Utilizar una base de pruebas con administrador, usuario y dos jueces.
- [ ] Preparar cuentas antiguas y nuevas, además de parejas ficticias.
- [ ] Para edición simultánea, usar dos instalaciones actualizadas conectadas a la misma base.
- [ ] Verificar la configuración de conexión: otra carpeta del repositorio no aísla automáticamente la configuración de Electron ni la base de datos.

## 2. Login y sesión

- [ ] Iniciar sesión con una cuenta antigua de cada rol.
- [ ] Crear una cuenta nueva y comprobar que puede iniciar sesión.
- [ ] Introducir una contraseña incorrecta: debe rechazar el acceso.
- [ ] Probar usuario inexistente y campos vacíos: debe mostrar un error y permitir corregirlos.
- [ ] Pulsar varias veces el botón de login: no debe abrir ventanas duplicadas.
- [ ] Entrar con cada rol: no deben aparecer momentáneamente opciones privadas.
- [ ] Cerrar completamente la aplicación y entrar con otra cuenta: no debe conservar la identidad ni los permisos anteriores.

Resultado esperado: las cuentas antiguas y nuevas funcionan; los intentos fallidos permiten volver a intentarlo. Consultar también [Login con bcrypt](login-bcrypt.md).

## 3. Permisos por rol

| Operación | Administrador | Usuario | Juez |
| --- | --- | --- | --- |
| Crear/eliminar cuentas | Sí | No | No |
| Registrar/editar parejas | Sí | Sí | No |
| Eliminar parejas | Sí | No | No |
| Registrar/editar categorías y estilos | Sí | Sí | No |
| Eliminar categorías y estilos | Sí | No | No |
| Registrar evaluaciones | Sí | No | Sí |
| Consultar/exportar evaluaciones | Todas | No | Solo propias |
| Exportar PDF completo de parejas | Sí | No | No |
| Exportar PDF de categorías/estilos | Sí | Sí | No |
| Modificar configuración de MySQL | Sí | No | No |

La configuración inicial de una instalación nueva conserva su excepción de acceso. Esta tabla no enumera todas las consultas internas: los jueces tienen acceso a los datos necesarios para evaluar.

- [ ] Comprobar las acciones permitidas y las restricciones con cada rol.
- [ ] Evaluar la misma pareja con dos jueces: cada juez debe consultar y exportar únicamente sus propias evaluaciones.
- [ ] Comprobar que el administrador puede consultar ambas.
- [ ] Confirmar que una evaluación queda atribuida a quien inició sesión.
- [ ] Abrir los PDF generados y comprobar su contenido, no solo el aviso de éxito.
- [ ] Revisión técnica: intentar una operación prohibida mediante IPC desde una ventana no autorizada; debe rechazarse sin modificar la base. Ocultar botones por sí solo no demuestra que el permiso esté protegido.

Registrar el canal, rol y ventana usados en la revisión técnica. Consultar [Cierre de permisos IPC](cierre-permisos-ipc.md) y [Permisos de consultas y PDF](permisos-consultas-pdf.md).

## 4. Borradores y conservación de datos

- [ ] Escribir un registro sin guardarlo, seleccionar fotografías y cambiar de módulo.
- [ ] Volver: los datos y fotografías deben mantenerse.
- [ ] Repetir con la modificación de una pareja.
- [ ] Provocar una validación fallida: los campos deben conservarse y el teclado debe seguir funcionando.
- [ ] Cambiar de cuenta mediante el flujo disponible: la otra cuenta no debe recibir el borrador anterior.

Alcance: los borradores no garantizan conservación después de cerrar completamente la aplicación. Las evaluaciones conservan los datos ante un fallo mientras se permanece en su pantalla; no tienen borrador entre módulos.

## 5. Edición simultánea

- [ ] Los operadores A y B abren la misma pareja para editarla.
- [ ] A cambia un dato y guarda correctamente.
- [ ] B modifica otro dato e intenta guardar sin actualizar.
- [ ] B recibe un aviso de conflicto.
- [ ] Los cambios de A permanecen en la base.
- [ ] B conserva su texto y fotografías seleccionadas.
- [ ] B cambia de módulo y vuelve: conserva el borrador y el conflicto.
- [ ] B utiliza la revisión de cambios y ve la información actual junto con su propuesta.
- [ ] Los campos que B no modificó incorporan los valores actuales.
- [ ] Aplicar la revisión no guarda todavía: requiere confirmar el guardado.
- [ ] Tras guardar, una consulta nueva muestra el resultado esperado.

### Casos adicionales

- [ ] Ambos cambian el mismo campo: revisar explícitamente qué valor quedará.
- [ ] A vuelve a guardar mientras B revisa: B debe recibir otro conflicto al intentar guardar.
- [ ] La pareja se elimina mientras B la edita: debe informar que ya no existe, sin recrearla.
- [ ] Repetir seleccionando fotografías.

Esta comprobación cubre la ficha de la pareja; no implica protección simultánea de categorías, estilos o evaluaciones. La distribución de fotografías entre distintas PC es un asunto separado. Consultar [Edición simultánea](edicion-simultanea.md).

## 6. Fallos de conexión con MySQL

Avisar a los demás y detener el servicio únicamente en el servidor de pruebas. Cerrar Workbench no detiene MySQL.

En Windows: abrir `services.msc`, identificar el servicio MySQL de pruebas y usar Detener/Iniciar. El nombre del servicio depende de la instalación. No cambiar la configuración de la base de producción.

### Con MySQL detenido

- [ ] Buscar una pareja: aparece un error y los controles vuelven a responder.
- [ ] Intentar registrar una pareja: conserva texto y fotografías.
- [ ] Intentar modificar una pareja: conserva los cambios pendientes.
- [ ] Intentar guardar una evaluación: conserva puntuaciones y comentario en la pantalla.
- [ ] Intentar generar un PDF: informa del fallo sin anunciar una exportación exitosa.
- [ ] Intentar iniciar sesión: muestra el error y permite reintentar.
- [ ] Ninguna operación queda esperando indefinidamente. Registrar la duración aproximada.
- [ ] En registro y modificación, cambiar de módulo después del error y comprobar que el borrador se conserva.
- [ ] Si la pareja ya se guardó y falla la asignación de categoría o estilo, conservar el registro confirmado y las selecciones pendientes; no volver a insertar la pareja.

Referencia: una consulta individual puede tardar hasta unos 20 segundos, incluida la adquisición de conexión; una transacción, hasta unos 45 segundos. Una acción que encadene varias consultas puede sumar esos tiempos. Una conexión rechazada puede fallar inmediatamente; detener el servicio no necesariamente reproduce un timeout completo.

### Después de reiniciar MySQL

- [ ] Buscar nuevamente sin reiniciar la aplicación.
- [ ] Comprobar qué operaciones quedaron guardadas antes de repetirlas.
- [ ] Guardar los datos pendientes y verificar que no haya duplicados.
- [ ] Generar y abrir un PDF nuevo.
- [ ] Confirmar que botones y teclado funcionan normalmente.
- [ ] Reintentar el login si se había probado con MySQL detenido.

### Interrupción durante un guardado

- [ ] Interrumpir MySQL justo después de pulsar Guardar.
- [ ] Si aparece un aviso de resultado incierto, consultar el registro al recuperar la conexión.
- [ ] Confirmar que la aplicación no repite automáticamente la escritura.

Un guardado puede completarse antes del corte; eso no constituye un fallo. No repetir a ciegas una operación de resultado incierto. Para evaluaciones, usar un comentario ficticio identificable y comprobar las evaluaciones de la cuenta antes de reintentar.

Consultar [Conexión MySQL](conexion-mysql.md).

## 7. Registro de incidencias

Copiar este bloque para cada incidencia. No adjuntar contraseñas, configuración privada ni datos reales de participantes.

```text
Incidencia:
Fecha y responsable:
Commit:
Rol:
Pantalla y acción (canal y ventana, si es una prueba IPC):
ID de prueba:
Pasos para reproducir:
Resultado esperado:
Resultado obtenido:
Mensaje exacto o enlace a captura:
Duración aproximada de la espera:
¿Se conservaron los datos?:
¿Se recuperó al reiniciar MySQL?:
Estado (abierta/corregida/pendiente de comprobar):
Commit de corrección y resultado de la nueva prueba:
```

## 8. Criterios de aprobación

Bloquean la entrega: acceso indebido, pérdida de datos escritos dentro de los flujos cubiertos, sobrescritura silenciosa de otro operador, duplicación automática, éxito falso o espera indefinida.

- [ ] Se completaron los bloques aplicables con evidencia.
- [ ] Las pruebas automatizadas pasan.
- [ ] No quedan incidencias bloqueantes abiertas.
- [ ] Las limitaciones conocidas están registradas y fueron comunicadas al equipo.

Resultado de esta ronda: **Pendiente**.

Responsable de la revisión final:  
Fecha:  
Observaciones:

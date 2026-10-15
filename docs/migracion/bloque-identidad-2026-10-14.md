# Fase 0 — Identidad, credenciales y revocación

Fecha: 14 de octubre de 2026. Estado: implementado y probado en aislamiento;
pendiente de ensayo MySQL separado y de revisión integrada de IPC.

Actualización posterior: la integración MySQL está registrada en el
[bloque de integridad](bloque-integridad-2026-10-14.md); la revisión integrada
de IPC y la corrección de reingreso están en el
[bloque del 15 de octubre](bloque-verificacion-2026-10-15.md).

## Objetivo y reproducción

El checkpoint fd1b0da rechazaba U001 aunque la clave real es VARCHAR(50), admitía
coerciones como [6] en el alta, conservaba indefinidamente contraseñas antiguas en
texto y no revocaba la sesión al eliminar su cuenta. Las bajas podían eliminar
al propio administrador. No había vencimiento por inactividad ni presupuesto de
intentos de acceso. Corresponde a H1, H2, H3, M9 y parte de M10.

## Cambios y contratos

| Área | Comportamiento incorporado | Archivos principales |
| --- | --- | --- |
| Identidad | Claves de 1–50 caracteres ASCII: letras, números, guion y guion bajo; primer carácter alfanumérico y valor distinto de solo ceros. Los números primitivos deben ser enteros positivos seguros. Se conservan U001, 006 y cadenas numéricas largas sin convertirlas a Number. Objetos, arrays, espacios y decimales se rechazan. | Seguridad/identidad.js; authController; adminModel; evaluacionesController |
| Nombres | Trim en login, alta y baja; máximo 100 caracteres, sin controles. Alta exige 3 caracteres; login/baja admiten nombres antiguos de 1–2 caracteres. | Seguridad/identidad.js |
| Credencial antigua | Después de verificar exactamente la contraseña, generar bcrypt de costo 10 y ejecutar UPDATE condicionado al ID, rol y contraseña anterior comparada en binario. Confirmar nuevamente la fila antes de crear sesión. | Controladores/authController.js |
| Revocación | Antes de operaciones IPC autorizadas, releer cuenta y comprobar ID, rol y credencial actual contra la sesión. Una eliminación, cambio de rol o contraseña, o un error de validación SQL, revoca. Una respuesta asíncrona de una sesión anterior no autentica ni revoca una sesión posterior. | Modelos/sesionModel.js; integración en Seguridad/ipc.js y main.js |
| Inactividad | La sesión vence a los 30 minutos sin actividad autorizada. Leer el estado de sesión o revalidar contra SQL no renueva por sí solo la actividad. Reloj inyectable en pruebas. | Modelos/sesionModel.js |
| Intentos | Máximo de 5 intentos por nombre normalizado y 30 globales por proceso dentro de ventanas de 15 minutos. Se reserva el intento antes de consultar SQL. El bloqueo impide nuevas consultas y caduca según reloj. | Controladores/authController.js |
| Baja de cuenta | Transacción InnoDB: bloquear administradores en orden, verificar actor administrador, bloquear cuenta por nombre y eliminar por ID. Prohibir autoeliminación, eliminación del último admin y nombres ambiguos. Fallos de commit no se anuncian como éxito. | Modelos/adminModel.js; Controladores/adminController.js |

La identidad del juez continúa procediendo de la sesión, nunca del nJuezID
enviado por la vista. Los roles autorizados para evaluar siguen siendo juez/admin.

## Pruebas y evidencia

Comando ejecutado:

`node --test tests/authSeguridad.test.cjs tests/login.test.cjs tests/nombresUsuario.test.cjs tests/sesionRevocacion.test.cjs tests/administracionSegura.test.cjs`

Resultado focalizado: **41/41 correctas**, cero fallos, 800.403 ms.

- Login de U001 y 006, rechazo de coerciones y conservación de claves.
- Bcrypt real; migración de contraseña con espacios sin recortarla; comparación
  binaria de la credencial anterior; cambio concurrente que impide sobrescritura.
- Fallo de carga de ventana que revoca la sesión y permite reintento.
- Límites por usuario/global, liberación temporal con reloj inyectado e intentos
  concurrentes que no crean dos sesiones.
- Revocación por cuenta ausente, rol cambiado, contraseña cambiada o fallo SQL.
- Vencimiento exacto de inactividad, renovación explícita y respuesta vieja que
  no afecta a una sesión posterior.
- Dos bajas cruzadas bajo un simulador serializado conservan un administrador;
  autoeliminación y nombres duplicados no producen DELETE.

Los simuladores verifican contratos y comportamiento, no acreditan los locks del
servidor MySQL. El smoke de Electron se preparó para simular la migración de la
contraseña y la lectura de revocación; su ejecución integrada se registra en el
informe general del bloque.

## Autoevaluación y límites pendientes

1. **H1:** la limitación numérica quedó corregida en backend. El esquema de
   laboratorio y la interfaz deben compartir el contrato; una instalación que
   todavía utilice INT no admitirá U001 hasta migrar sus claves relacionadas.
2. **H2:** la revocación es comprobación al iniciar cada solicitud IPC. No cancela
   retroactivamente una operación ya autorizada en otro equipo. La baja valida al
   actor dentro de la transacción; SQL ejecutado directamente por una cuenta con
   privilegios puede evadir reglas de aplicación (C1 continúa siendo decisión
   arquitectónica). Requiere ensayo de dos conexiones reales y claves foráneas.
3. **H3:** se elimina el texto de cada cuenta cuando inicia correctamente. Las
   cuentas que no vuelvan a iniciar conservan texto hasta un restablecimiento
   administrado. Antes de darlo por cerrado se necesita inventario sin revelar
   secretos, completar migración/reset y después retirar la rama heredada.
   Contraseñas heredadas de más de 72 bytes o valores que empiezan por $2 sin ser
   un hash válido requieren restablecimiento; no se truncan. La columna debe
   admitir al menos 60 caracteres y la cuenta SQL debe permitir UPDATE.
4. **M9:** el límite es local al proceso: reiniciar la aplicación reinicia sus
   contadores; varias estaciones no comparten presupuesto. El control global
   reduce el bypass por variantes de nombre que la collation trate iguales.
   Garantías contra estaciones hostiles requieren la frontera de servicio de C1.
5. La lectura SQL de validación en cada solicitud tiene coste de una consulta y
   debe comprobarse bajo la carga real del evento. Los fallos de SQL revocan por
   seguridad; la interfaz integrada debe devolver al acceso sin destruir los
   datos de formularios pendientes inadvertidamente.
6. No se accedió ni se modificó ninguna base real, no se modificaron dependencias
   y no se creó commit. Este bloque por sí solo no concluye la Fase 0.

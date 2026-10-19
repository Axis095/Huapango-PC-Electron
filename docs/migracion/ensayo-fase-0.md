# Ensayo manual de cierre de Fase 0

Estado del ensayo visual: **pendiente**. Actualización: 15 de octubre de 2026.

Revisión posterior: [cobertura V01–V10/F01–F17 al 17 de octubre](revision-pruebas-2026-10-17.md).
El usuario reportó mayoría exitosa sin individualizar casos; no se marcaron
casillas automáticamente. Alta de cuentas y salida del juez se revisan en F0-15.
El usuario confirmó que no dispone de una base de pruebas permanente. Ya se
ejecutó integración automática en un MySQL temporal independiente; eso no sustituye
la revisión visual de la aplicación ni certifica los datos del evento.
No ejecutar altas, cambios o eliminaciones sobre registros del evento.

## Preparación

Preparar una copia de pruebas del esquema y datos ficticios, con usuarios admin,
user y juez. Verificar columnas, restricciones y motores InnoDB; comprobar que
cContrasena admite 60 caracteres. No versionar credenciales ni datos personales.
Usar [sql/001-laboratorio.sql](../../sql/001-laboratorio.sql) para el laboratorio
documentado en la [guía de primera instalación](../guia-primera-instalacion.md).
La copia histórica sin datos está en sql/000; sql/003 se probó únicamente en esa
copia temporal y requiere respaldo/revisión antes de aplicarse a una instalación.
Los dos endpoints de actualización de categoría/estilo están suspendidos hasta
validar su contrato/esquema; su rehabilitación se auditará por separado.

Respaldar SQL y uploads como conjunto antes de cualquier ensayo con datos que
deban conservarse. Identificar las cuentas y parejas de prueba para su limpieza.

## Comprobaciones automáticas repetibles

Desde la raíz del repositorio:

```powershell
npm.cmd test
npm.cmd ls --depth=0
npm.cmd run test:smoke
npm.cmd run test:integration
git diff --check
```

El smoke usa Electron real, SQL simulado, ventanas ocultas y un perfil temporal;
no permite escribir SQL. Conserva sus perfiles en `.tmp` para inspección. No
certifica el driver ni el servidor MySQL. Desde F0-14 incorpora comprobaciones
visuales parciales de login/menú/video; no certifica toda la interfaz.

La integración sí usa MySQL real en un proceso, puerto y datadir propios con datos
ficticios. Requiere mysqld instalado; no lee la configuración privada de la app.
Apaga su servidor al terminar y conserva evidencia en .tmp. No deja una base
visual permanente lista para que la aplicación se conecte a ella.

## Casos y resultados esperados

| Caso | Procedimiento | Resultado esperado | Evidencia |
| --- | --- | --- | --- |
| Primer arranque | Perfil limpio, configurar la base de pruebas | Formulario utilizable; error de conexión recuperable | Pendiente |
| Login | Usuario inexistente, contraseña incorrecta y correcta con Enter/doble clic | Rechazo sin sesión o una sola ventana principal | Pendiente |
| Alta de usuario | Admin crea cuenta con contraseña; consultar hash sin publicarlo | Hash de 60 caracteres, login válido, contraseña incorrecta rechazada | Pendiente |
| Operador | Registrar ambos participantes y completar categoría/estilo | Tres pasos confirmados, consulta coherente | Pendiente |
| Permisos | Operador intenta evaluar/administrar por API | FORBIDDEN y ningún cambio | Pendiente |
| Juez | Evaluar con payload que declara otro nJuezID | Autor guardado coincide con sesión; puntaje 0–60 | Pendiente |
| Datos inválidos | IDs parciales, correo/fecha erróneos, puntaje fuera de rango | Rechazo sin escritura y posibilidad de corregir | Pendiente |
| Fotos | PNG/JPEG válidos, imagen rota y superior a 5 MiB | Válidas persistidas; inválidas conservan formulario sin SQL | Pendiente |
| Borradores | Salir y volver a registro/modificación con datos y fotos | Trabajo recuperado por ventana | Pendiente |
| Reingreso | Dejar vencer sesión; entrar con misma cuenta/rol | Login visible; ventanas y borradores recuperados; foco utilizable | Pendiente visual; regresión y smoke correctos |
| Cambio de identidad | Tras expirar, entrar con otra cuenta o rol cambiado | Ventanas anteriores cerradas; ningún borrador heredado | Pendiente visual; regresión correcta |
| Configuración ocupada | Intentar abrir sección mientras cambia la conexión | No abrir sección, no revocar sesión por CONFIGURATION_BUSY | Pendiente visual; regresión correcta |
| Evaluación definitiva | Reenviar evaluación idéntica y luego diferente del mismo juez/pareja | Idéntica reconoce el envío; diferente rechazada sin UPDATE | Pendiente visual; MySQL aislado correcto |
| Edición concurrente | Dos ventanas cargan la misma pareja; ambas intentan guardar | Una confirma; otra recibe EDIT_CONFLICT y conserva campos | Pendiente visual; MySQL aislado correcto |
| Modificación | Cambiar ambos participantes; repetir valores; ID inexistente | UPDATED, UNCHANGED o NOT_FOUND según corresponda | Pendiente |
| Atomicidad | Provocar error de restricción durante modificación | Ninguna modificación parcial | Pendiente |
| Eliminación | Admin elimina pareja desechable con relaciones y fotos | Relaciones eliminadas juntas; otra pareja intacta | Pendiente |
| Reportes | Generar reportes disponibles y cancelar el diálogo | PDF correcto; cancelar permite continuar | Pendiente; reporte general bloqueado por tabla/historial ausentes |
| Configuración | Abrir en primer arranque, con admin, user, juez y sesión expirada | Solo primer arranque y admin vigente pueden configurar | Pendiente |
| Navegación | Recorrer vistas, atajos y ventanas auxiliares | Sin vistas vacías, pérdida de foco o recursos faltantes | Pendiente |

## Registro de ejecución

Al ejecutar, reemplazar Pendiente con resultado, fecha, revisión Git, entorno y
evidencia sanitizada. Si falla un caso, abrir un hallazgo con reproducción y volver
a probar únicamente lo afectado más la regresión pertinente. No marcar la fase
cerrada con casillas pendientes ni usar datos reales para acelerar la validación.

# Ensayo manual de cierre de Fase 0

Estado: **pendiente**. El usuario confirmó que no dispone de una base de pruebas.
No ejecutar altas, cambios o eliminaciones sobre registros del evento.

## Preparación

Preparar una copia de pruebas del esquema y datos ficticios, con usuarios admin,
user y juez. Verificar columnas, restricciones y motores InnoDB; comprobar que
cContrasena admite 60 caracteres. No versionar credenciales ni datos personales.
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
git diff --check
```

El smoke usa Electron real, SQL simulado, ventanas ocultas y un perfil temporal;
no permite escribir SQL. Conserva sus perfiles en `.tmp` para inspección. No
certifica el driver, el servidor MySQL ni la presentación visual.

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
| Modificación | Cambiar ambos participantes; repetir valores; ID inexistente | UPDATED, UNCHANGED o NOT_FOUND según corresponda | Pendiente |
| Atomicidad | Provocar error de restricción durante modificación | Ninguna modificación parcial | Pendiente |
| Eliminación | Admin elimina pareja desechable con relaciones y fotos | Relaciones eliminadas juntas; otra pareja intacta | Pendiente |
| Reportes | Generar los reportes autorizados y cancelar el diálogo | PDF correcto; cancelar permite continuar | Pendiente |
| Configuración | Abrir sin sesión, con admin, user y juez | Solo primer arranque/sin sesión y admin pueden configurar | Pendiente |
| Navegación | Recorrer vistas, atajos y ventanas auxiliares | Sin vistas vacías, pérdida de foco o recursos faltantes | Pendiente |

## Registro de ejecución

Al ejecutar, reemplazar Pendiente con resultado, fecha, revisión Git, entorno y
evidencia sanitizada. Si falla un caso, abrir un hallazgo con reproducción y volver
a probar únicamente lo afectado más la regresión pertinente. No marcar la fase
cerrada con casillas pendientes ni usar datos reales para acelerar la validación.

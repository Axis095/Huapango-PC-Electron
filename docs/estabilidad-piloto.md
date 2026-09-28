# Estabilidad antes del piloto — 25 de septiembre de 2026

## Correcciones de esta revisión

### Evaluación: búsqueda y PDF simultáneos

La búsqueda y los avisos administraban `disabled` por separado. Si se iniciaba
un PDF mientras una búsqueda seguía pendiente, cada operación podía restaurar
estados incompatibles y dejar Buscar o el ID deshabilitados. Ahora comparten
un turno por documento. El PDF queda deshabilitado mientras se busca; durante
la generación, la búsqueda no modifica la ficha. Al terminar se recupera el
estado que corresponde a una búsqueda exitosa o fallida.

Las tres regresiones nuevas de este flujo fallan con el código anterior y pasan
con la corrección. La protección es por ventana, no una restricción de MySQL.

### Inicio de sesión

El formulario atiende `submit`, para que Enter y el botón compartan el flujo.
Rechaza campos vacíos, evita solicitudes simultáneas, muestra tanto `message`
como `error` y captura rechazos IPC. Un fallo conserva los campos y permite
reintentar. No se recortan los espacios de la contraseña.

El controlador también impide autenticaciones concurrentes y valida la forma
de las credenciales antes de consultar. Esto no sustituye autorización por canal
IPC, almacenamiento seguro de contraseñas ni manejo de fallos al cargar ventanas.

### PDF

Los cinco generadores usan una función común con `pipeline` para esperar la
finalización y manejar errores del documento y del archivo. Los errores son
objetos `Error`, de modo que el controlador puede leer su mensaje. Un fallo
durante el dibujo destruye el flujo y rechaza la operación.

Se conservan las consultas y el contenido de los reportes. No se añaden
reintentos automáticos, tiempos límite ni guardado mediante archivo temporal:
un fallo de escritura todavía puede dejar un PDF incompleto en el destino.

## Validación

- `npm.cmd test`: pruebas de lógica, DOM simulado, IPC simulado y flujos de Node.
- Prueba adicional con PDFKit instalado: cinco PDF completos con datos ficticios
  y un destino inexistente que rechaza la operación. No se escribió en MySQL.
- Pendiente: confirmar el foco real y los diálogos de archivos en Electron.

### Ensayo manual

1. Reiniciar la aplicación. Ingresar con Enter, contraseña incorrecta y doble
   clic; corregir y verificar que abre una sola ventana principal.
2. En Evaluación, buscar y pulsar Generar PDF rápidamente. Repetir con una pareja
   inexistente. Al terminar, Buscar y el ID deben estar disponibles; Guardar solo
   debe habilitarse cuando exista una ficha válida.
3. Generar un PDF, cancelar el selector y continuar trabajando. Probar un reporte
   sin datos y verificar un mensaje comprensible. No usar archivos importantes
   como destino de pruebas de escritura.

## Hallazgos pendientes, por prioridad

La revisión original no incorporaba el fork. Tras el merge, el parche de
integridad actualiza el estado del punto 1. Esto no certifica el proyecto completo.

1. **Integridad al eliminar y modificar parejas: parche aplicado.** Ahora se
   usa una conexión transaccional, un UPDATE para ambos participantes y una
   eliminación común. Se corrigieron los falsos mensajes de éxito. Ver
   [integridad-parejas.md](integridad-parejas.md) para pruebas, límites y ensayo
   manual pendiente.
2. **Esperas de MySQL.** `connectTimeout` limita el establecimiento de conexión,
   no toda la consulta. El pool permite una cola ilimitada. Definir límites y
   recuperación; un tiempo agotado en la interfaz no prueba que una escritura
   haya sido cancelada y no debe provocar un reintento automático.
3. **Permisos y credenciales.** Varios controladores de escritura no comprueban
   sesión/rol del emisor. Ocultar botones no equivale a autorización. El login
   compara la contraseña directamente y el modelo de alta de usuarios registra
   el objeto de entrada en consola. Abordarlo antes de usar datos reales.
4. **Recuperación de trabajo.** El borrador de registro vive en memoria de la
   ventana; no protege frente a cierre o caída del proceso. Los demás formularios
   tampoco tienen una política general de recuperación al cambiar de módulo.

La siguiente revisión recomendada es permisos y credenciales, seguida de las
esperas de MySQL y la recuperación de trabajo. No es necesario migrar a TypeScript.

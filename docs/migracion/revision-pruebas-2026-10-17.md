# Revisión de la lista de aceptación · 17 de octubre de 2026

El usuario reporta que la mayoría de pruebas fue exitosa. No especificó cuáles,
por lo que esto es evidencia reportada general, sin aprobación individual.
Excepciones: mensaje genérico al crear usuario y salida del juez sin acción.

Se revisaron pruebas, código y evidencia; esto no es una nueva auditoría 360°
completa ni el acta de cierre. La matriz 360° y sus pendientes siguen en
[la reevaluación](reevaluacion-fase-0-2026-10-14.md).

| Casos de la lista entregada | Evidencia revisada/ejecutada | Límite o siguiente comprobación manual |
| --- | --- | --- |
| V01, V03: login/menú | Smoke visual de fuentes con fuentes locales y capturas | Aceptación a igual resolución, escala, zoom y rol |
| V02: teclado/contraseña | Regresión login y vistas | Recorrido completo con Tab y foco nativo pendiente |
| V04: resto de vistas | Smoke navega registro/modificación/búsqueda/admin/resultados | No certifica cada control ni composición visual |
| V05: tamaños y scroll | Revisión de estilos, sin nueva matriz de tamaños | Ensayar tamaños de uso y controles accesibles |
| V06: presentación inicial | Smoke verifica portada decodificable, 16:9 y pausa en cero | Confirmar aspecto en la PC del usuario |
| V07: reproducción | Smoke comprueba avance con play y audio silenciado | Audio audible, volumen, avance manual y pantalla completa pendientes |
| V08: volver al menú | Navegación cubierta parcialmente | Comprobar abandono durante reproducción y ausencia de audio residual |
| V09: sin internet | Smoke bloquea HTTP/HTTPS y carga recursos locales | Reinicio manual en instalación del usuario pendiente |
| V10: paquete | Smoke del ASAR requerido en este bloque | No equivale a instalar/actualizar |
| F01: login/reintentos | Regresión y smoke login real con SQL simulado | Doble clic y foco en instalación final |
| F02: roles | Políticas IPC y smoke con roles ficticios | Recorrido manual completo por cada rol |
| F03: alta/login de cuenta | Formulario real para tres roles; MySQL aislado con bcrypt/VARCHAR | Repetir el alta reportada con ID/nombre nuevos y conservar mensaje exacto si falla |
| F04: protección de admin | Regresión transaccional simulada y permisos | Baja real de administradores en laboratorio manual pendiente |
| F05: pareja/categoría/estilo | Integración real y concurrencia en dos esquemas | Flujo visual completo pendiente de individualizar |
| F06: datos inválidos | Regresión de validaciones y duplicados SQL reales | Confirmar mensajes/corrección en vistas |
| F07: fotos | Regresión de formatos/límites/limpieza | Fotos reales ficticias y verificación visual instalada pendientes |
| F08: borradores | Regresión y smoke por ventana | Confirmar fotos y navegación; no sobreviven al cierre de proceso |
| F09: modificación | Regresión y MySQL aislado | Confirmar fotos y campos de ambos participantes en interfaz |
| F10: edición concurrente | Integración real EDIT_CONFLICT | Repetir con dos ventanas y revisar conservación de campos |
| F11, F12: evaluación definitiva/autor | Integración real: reenvío sin duplicado, cambio rechazado; permisos y autoría en regresión | Ensayo de distintos jueces en interfaz pendiente |
| F13: sesión expirada | Reloj inyectado, revocación y smoke de reingreso | Espera real de 30 minutos y foco pendientes; salida explícita añadida en F0-15 |
| F14: reportes | Regresión PDF/atomicidad/cancelación | Inspección visual de PDFs; reporte general aún bloqueado |
| F15: eliminación | Integración rollback/relaciones y regresión de fotos | Comprobación visual del conjunto SQL/fotos pendiente |
| F16: configuración/fallo de conexión | Regresión arranque, reserva y errores | Ensayo manual en servidor de laboratorio; nunca interrumpir el evento |
| F17: instalación limpia | Build de laboratorio | Instalación/actualización siguen pendientes |

## Hallazgos al revisar la cobertura

1. La suite no probaba el botón Salir de Resultados. Estaba sin conexión a código.
   El smoke ahora pulsa cerrar, cancelar y confirmar; comprueba login y sesión nula.
2. El alta perdida de códigos SQL convertía duplicados/permisos en un error genérico.
   Se conserva el código y se sanitiza el mensaje. El mensaje aportado por el usuario
   no permite confirmar qué error SQL ocurrió en su instalación.
3. El harness de ventanas ocultas no aparecía en el inventario nativo de Electron.
   Se corrige el inventario con las ventanas reales observadas, sin reemplazar su
   carga o cierre. El ensayo final de salida pasa con cierre nativo.
4. Los éxitos automáticos no se convierten en aceptación manual. Siguen abiertos
   los hallazgos de recuperación durable, auditoría operativa, capacidad, esquema
   real y distribución descritos en la matriz general.

## Repetición mínima solicitada al usuario

- Crear cuenta con ID y nombre nuevos; probar ingreso con ella.
- Intentar repetir ID y nombre por separado: debe avisar duplicado y conservar campos.
- En Resultados, pulsar Cerrar sesión y cancelar: conservar cuenta y datos.
- Confirmar cierre: volver al acceso y cerrar las ventanas de la sesión anterior.
- Registrar qué casos V/F se aprobaron, fallaron o siguen sin ejecutar, indicando build.

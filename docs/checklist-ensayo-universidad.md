# Checklist del ensayo en la universidad

Fecha prevista: **lunes 9 de noviembre de 2026**. Seguir la [guía con laptop servidor](guia-ensayo-universidad.md). Marcar una casilla únicamente al verificarla y registrar cada fallo o pendiente. Utilizar datos ficticios.

## Datos generales

| Dato | Completar |
|---|---|
| Fecha real, horario y ubicación | |
| Responsable del ensayo | |
| Responsable de la laptop servidor | |
| Versión de aplicación | 1.0.1 |
| Commit de referencia | 39d0dd6 |
| Nombre de red utilizada | |
| IP de laptop servidor y puerto MySQL | |
| Esquema de ensayo | |
| Cantidad de estaciones | |
| Ubicación del respaldo inicial | |
| Ubicación del respaldo al terminar | |
| Resultado general | Pendiente |

## Preparación de la laptop servidor

- [ ] MySQL Server instalado y servicio iniciado.
- [ ] Copia del esquema importada al destino correcto y tablas comprobadas.
- [ ] Datos ficticios y cuentas de Huapango disponibles para los operadores.
- [ ] Cuentas MySQL de conexión identificadas por separado.
- [ ] Huapango 1.0.1 abre, inicia sesión y consulta usando MySQL local.
- [ ] Registro local de una pareja comprobado con categoría y estilo.
- [ ] Cargador disponible y suspensión configurada para el ensayo.
- [ ] Instaladores o copias verificadas de la versión listos para las estaciones.

## Conexión en la universidad

- [ ] Responsable de redes consultado sobre la prueba TCP 3306 entre equipos.
- [ ] Laptop servidor y primera estación conectadas a la red indicada.
- [ ] Autenticación de la red completada cuando corresponda.
- [ ] IPv4 de cada equipo anotada.
- [ ] MySQL escucha en una interfaz accesible desde la red.
- [ ] Firewall permite TCP 3306 desde las IP de las estaciones en el perfil activo.
- [ ] Primera estación obtiene conexión TCP satisfactoria antes de ampliar el ensayo.
- [ ] Cada estación tiene una cuenta MySQL autorizada para su IP actual.
- [ ] Cada estación supera Comprobar y guardar y accede con su cuenta de Huapango.

Completar una fila por estación. Registrar el usuario de conexión y el rol utilizado, manteniendo las contraseñas fuera del documento.

| Estación / operador | Sistema y versión de Huapango | IP | Usuario MySQL | Rol Huapango | Prueba TCP | Login | Estado |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | Pendiente |
| 2 | | | | | | | Pendiente |
| 3 | | | | | | | Pendiente |
| 4 | | | | | | | Pendiente |
| 5 | | | | | | | Pendiente |

## Asignación de IDs

- [ ] Cada rango está libre en las tablas correspondientes.
- [ ] Cada operador conoce sus rangos y los datos ficticios que utilizará.

| Estación | Rango de parejas | Rango de registros de categoría | Rango de registros de estilo |
|---|---|---|---|
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |

## Prueba progresiva

- [ ] Una estación registra una pareja y se comprueba en Workbench del servidor.
- [ ] Dos estaciones registran a la misma señal con IDs distintos y ambos registros se comprueban.
- [ ] Todas las estaciones completan tres rondas simultáneas.
- [ ] Cada pareja confirmada aparece una sola vez con categoría y estilo correctos.
- [ ] Una estación consulta una pareja registrada por otra.
- [ ] Los formularios siguen respondiendo al terminar las rondas.
- [ ] Ante un error, se consulta el ID antes de decidir el reintento.

Duplicar filas para documentar **cada pareja**, incluidas las pruebas iniciales. Si son cinco estaciones y tres rondas, completar quince filas para esas rondas. Usar **Pasa**, **Falla** o **Pendiente**.

| Fase / ronda | Estación | ID pareja | ID categoría / nombre esperado | ID estilo / nombre esperado | Respuesta de Huapango | Resultado en Workbench | Estado |
|---|---|---|---|---|---|---|---|
| Inicial: una estación | | | | | | | Pendiente |
| Inicial: dos estaciones | | | | | | | Pendiente |
| Inicial: dos estaciones | | | | | | | Pendiente |
| Ronda 1 | | | | | | | Pendiente |
| Ronda 2 | | | | | | | Pendiente |
| Ronda 3 | | | | | | | Pendiente |

| Recuento de las tres rondas | Resultado |
|---|---|
| Parejas esperadas (estaciones × 3) | |
| Parejas con guardado confirmado en Huapango | |
| Parejas completas comprobadas en Workbench | |
| Operaciones fallidas o inciertas | |

## Incidencias

| Hora / estación | Pantalla y rol | Pasos y valor ingresado | Mensaje exacto | Evidencia | Responsable | Resultado del reintento |
|---|---|---|---|---|---|---|
| | | | | | | |
| | | | | | | |

Anotar si el problema fue de conectividad, permisos MySQL, datos de entrada o comportamiento de la aplicación. Mantener la causa como pendiente cuando falte evidencia.

## Cierre

- [ ] Resultados e incidencias completados, incluidos los casos pendientes.
- [ ] Base de ensayo exportada desde la laptop servidor.
- [ ] Archivos de fotografías de prueba respaldados si se utilizaron.
- [ ] Equipo informado sobre la ubicación de la copia del ensayo y sus resultados.
- [ ] Pruebas adicionales de nombres, IDs y borradores registradas en el [checklist 1.0.1](checklist-validaciones-1.0.1.md), si se realizaron.

El ensayo se considera satisfactorio cuando las estaciones previstas pueden conectarse, los registros confirmados se verifican completos y las incidencias tienen resultado documentado. Si la red universitaria bloquea la conexión entre clientes, registrar esa limitación y coordinar la alternativa con el TP-Link. Una prueba en la red universitaria con Internet solo acredita esa configuración; la operación sin Internet debe ensayarse por separado.

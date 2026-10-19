# Constancia de pruebas aportadas: avance de Fase 1

Fecha de registro: **18 de octubre de 2026**, America/Mexico_City.
Grupo: **Evidencia2**, identificado por el usuario como pruebas de la integración.
Estado: **pruebas automáticas y recorrido funcional aportados; Fase 1 abierta**.

Seguimiento posterior del mismo día: se retomó el proceso y se verificaron
paridad dev y F1-05 con un candidato nuevo. Ver [continuidad en la bitácora](fase-1.md#continuidad-desde-la-constancia--18-de-octubre-de-2026)
y sección 8. Las secciones 1–7 describen el lote recibido y su estado al revisarlo.

## 1. Objeto, procedencia y trazabilidad

Registrar los resultados compartidos por el usuario sin volver a ejecutar
regresión, smoke, MySQL, compilación, build ni instalación. Se inspeccionaron
las **30 capturas PNG** del lote externo:

```text
C:/Users/raulc/Documents/ProySerch/pruebas-lira/evidencias-fase-0-inicio1/Evidencia2/
```

Los nombres de las tablas se resuelven dentro de esa carpeta. No se copian al
repositorio capturas, datos personales ni hashes de cuentas. Las terminales
corresponden a otro checkout del usuario, cuyo nombre termina en
`codex-fase-1-vite`; no incluyen un `git rev-parse HEAD` visible.

La [bitácora](fase-1.md) identifica `e19042d` como código guardado de F1-03/04 y
commits documentales posteriores. Al preparar esta constancia, el checkout local
estaba limpio en `a9880cffccce769fb498cbeb9f6501be1585e995`, rama
`codex/fase-1-vite`. **Ese HEAD es contexto de la revisión documental, no el SHA
demostrado por las capturas externas.** Tampoco se verificó el hash del instalador
probado. La asociación a la integración procede del usuario y del material.

## 2. Comprobaciones automáticas visibles

| Comprobación | Archivo original | Resultado respaldado |
| --- | --- | --- |
| Dependencias y tipos | `Comandos_Rama_integracion.png` | Árbol de dependencias visible sin errores; invocación de typecheck visible. La captura termina en su encabezado y no muestra un código de salida final. |
| Regresión | `npm_cmd_test.png` | **252 pruebas, 252 correctas, 0 fallos**, 0 canceladas/omitidas/pendientes. |
| Smoke de fuentes | `npm_test_smoke.png` | `CUENTAS_OK`, `CUENTAS_SALIDA_OK`, `RUTAS_OK` y `SMOKE_OK`; SQL simulado. |
| Smoke Vite | `npm_test_smoke_dev.png` | `CUENTAS_SALIDA_OK`, `RUTAS_OK`, `SMOKE_OK` y `VITE_DETENIDO`, **código 0**; SQL simulado. El recorte no contiene `PARIDAD_OK` ni el inicio del servidor. |
| Compilación | `npm_run_compile.png` | Salidas HTML/assets bajo `build/app`, final `built in 364ms` y retorno al prompt sin error visible. |
| Paridad del compilado | `Fase2.png` | Variables `HUAPANGO_SMOKE_REFERENCIA` y `HUAPANGO_SMOKE_APP_ROOT=build/app`; **`PARIDAD_OK: login` y `PARIDAD_OK: menu`**, además de `VISUAL_OK`. |
| Final del smoke compilado | `Fase2.1.png` | `CUENTAS_SALIDA_OK`, `RUTAS_OK` y `SMOKE_OK`, coherente con el ensayo compilado del recorte anterior. La continuidad entre ambos recortes se interpreta por su contenido; no es un log completo. |
| MySQL con Node | `npm_cmd_run_test_integration.png` | **`MYSQL_INTEGRACION_OK`**; altas/roles, migración bcrypt, IDs VARCHAR, concurrencia, evaluación idempotente, PDF, rollback y copia vacía para índices. |
| MySQL con Electron | `scripts_integracion-fase0.cjs.png` | **`MYSQL_INTEGRACION_OK`**, incluyendo dos fotos con decodificador Electron, disco y referencias SQL. |
| Build | `npm_run_build.png` | Construcción NSIS x64 de `HuapangoApp Setup 1.0.0.exe`, blockmap y retorno al prompt sin error visible. No acredita por sí solo instalación ni firma con certificado. |

Las capturas de integración indican expresamente que el laboratorio no certifica
datos del evento, fotos visuales ni instalador. Los `ER_DUP_ENTRY` que acompañan
los marcadores de éxito corresponden al ensayo de duplicados, no a una regresión
fallida en esas ejecuciones.

Los archivos llamados `Fase2.png` y `Fase2.1.png` documentan el smoke compilado;
**su nombre no significa que haya comenzado Fase 2 de la migración**.

## 3. Recorrido manual visible

| Área | Archivos originales | Hecho observable |
| --- | --- | --- |
| Roles | `Vista_Admin_VITE.png`, `Vista_User_VITE.png`, `Vista_Juez_VITE.png` | Ventanas del menú con opciones diferenciadas por rol. No demuestran por sí solas denegación de IPC ni login con cada contraseña. |
| Registro | `Creacion_Parejas_VITE.png` | Mensaje de pareja guardada y continuación hacia categoría/estilo. |
| Asignaciones | `Registro_Categoria_VITE.png`, `Registro_Estilo_VITE.png` | Mensajes de guardado correcto de categoría y estilo. |
| Consultas | `Consulta_Parejas_VITE.png`, `Consulta_Categorias_Estilo_VITE.png` | Consulta completada y datos recuperados en los módulos correspondientes. |
| Actualización | `Actualizacion_Datos_Pareja_VITE.png` | Mensaje de pareja actualizada exitosamente. |
| Evaluación | `Evaluacion_Rol_Admin_VITE.png` | Pareja encontrada y evaluación definitiva guardada exitosamente en el caso identificado como admin. |
| Cuentas | `Creacion_Usuarios_VITE.png`, `Creacion_Usuarios_VITE1.1.png` | Alta confirmada y registros con tres roles y valores con formato bcrypt; no se transcriben las credenciales derivadas. |
| Baja de cuentas | `Eliminacion_Cuentas_VITE.png` | Diálogo de confirmación abierto. No muestra el mensaje final ni la ausencia de la cuenta después. |
| Baja de pareja | `Eliminacion_Parejas_VITE.png` | Diálogo de confirmación abierto. No muestra el resultado SQL final. |
| Aplicación identificada como instalada | `Busqueda_Parejas_instalador_vite.png` | Ventana de búsqueda/modificación con una ficha consultada. El nombre atribuye el caso al instalador; la imagen no identifica binario, SHA, origen compilado ni proceso de instalación. |

Se registra el recorrido que el usuario comunica como realizado. Para los puntos
con éxito visible hay respaldo del resultado en la interfaz; para los diálogos
solo se acredita su presentación. El sufijo VITE es la clasificación del lote,
no una prueba individual del modo HTTP/file de cada ventana.

## 4. Inspección del paquete y alcance del build

| Archivos originales | Observación |
| --- | --- |
| `No_filtra_scripts.png`, `No_filtra_tests.png` | Búsquedas sin coincidencias de `scripts/` y `tests/` en el material mostrado del listado de ASAR. |
| `No_filtra_VITE.png` | Búsqueda sin coincidencias de VITE; terminal con `npx asar list dist/win-unpacked/resources/app.asar > asar-contenido.txt`. |
| `Si_esta_main_js.png` | Búsqueda con una coincidencia de `main.js`. |
| `Si_esta_pdfkit.png` | Búsqueda con coincidencias de `pdfkit`. |

Son indicios de inspección del contenido, no un inventario ASAR completo recibido
ni una auditoría exhaustiva de exclusión. No se dispone del listado de texto,
manifiesto interno, binario o instalador para verificarlos en esta revisión.

**Al recibir este lote, el build del checkout tomaba las fuentes de la raíz**, según
`package.json`; no está configurado para distribuir `build/app`. Por tanto, el
build correcto y la captura atribuida al instalador aportan evidencia del
empaquetado disponible, pero no cierran F1-05/06 ni prueban que el instalador
ensayado contenga las vistas compiladas por Vite. La ausencia de la dependencia
de desarrollo Vite dentro del ASAR tampoco demuestra ese origen compilado.

## 5. Contraste con el fallo de paridad documentado

La bitácora del 17 de octubre registra dos fallos de paridad **del menú en modo
Vite**: body de 769 px frente a 1265 px de la referencia; login sí coincidía.

El nuevo lote acredita dos hechos distintos:

1. El smoke de desarrollo mostrado termina correctamente con código 0.
2. El **compilado** sí muestra `PARIDAD_OK` para login y menú con referencia.

La captura de desarrollo no muestra si se habilitó la comparación con referencia.
No incluye medidas del menú ni explicación de una corrección. No se puede
convertir su `SMOKE_OK` en cierre del hallazgo anterior, ni trasladarle el
`PARIDAD_OK` del compilado. **Permanece pendiente conciliar el resultado de dev
con el ensayo fallido anterior**, ligando referencia, entorno y commit exacto.
Esto conserva el avance funcional aportado sin ignorar resultados contradictorios.

## 6. Estado resultante y continuidad

| Dimensión | Constancia al recibir el lote |
| --- | --- |
| Regresión y smoke | Resultados correctos visibles según la matriz; no ejecutados de nuevo por este chat. |
| Integración SQL/fotos/PDF | Marcadores correctos en Node/Electron, con límites de laboratorio explícitos. |
| Manual | Altas, asignaciones, consultas, edición y evaluación con éxito visible; roles y confirmaciones documentados. |
| Paridad | Compilado acreditado para login/menú; dev requiere contraste con el hallazgo previo. |
| Distribución | Build disponible documentado; origen compilado, inventario completo e instalación/actualización aún sin acreditar. |
| Aceptación del usuario | Comunicación de pruebas realizadas y entrega de evidencias; no equivale a autorización de merge ni cierre de fase. |

Para continuar desde esta constancia, registrar el SHA realmente probado,
conciliar la paridad dev y completar la distribución compilada de F1-05/06 con
identificación del artefacto e instalación/actualización. Las pruebas de borradores,
cancelaciones, fallos de escritura y permisos cuentan con evidencia por capas
referenciada en las bitácoras; estas capturas no convierten todos esos casos en
aceptación manual nueva. No repetir automáticamente los ensayos ya acreditados.

La [constancia de base](constancia-base-estable-2026-10-18.md) es independiente.
Recibir ambos lotes no promueve ramas ni modifica el alcance del PR de base.

## 7. Integridad e identificación del lote

Inventario revisado: **30 archivos PNG**. Huella del lote:

```text
SHA-256: 9db72227f404b5a7d92d2b7985397c3702cf7199f091ef278c11d789b942f6ea
```

Método: ordenar archivos directos por nombre en orden lexicográfico de Python;
concatenar `nombre<TAB>tamaño_en_bytes<TAB>sha256_del_contenido<LF>` por archivo;
codificar en UTF-8 y calcular SHA-256. Identifica el lote recibido, no fecha,
autoría, versión del código ni hash del instalador.

Preparación exclusivamente documental: inspección de capturas y contraste con
el estado local; no se ejecutaron pruebas de aplicación, build, instalación,
operaciones SQL, commits, push ni fusiones.

## 8. Seguimiento al continuar el proceso

18 de octubre de 2026. La nueva ejecución local no modifica ni completa por
inferencia el lote Evidencia2 ni su SHA desconocido. La bitácora identifica el
HEAD de partida, los cambios sin commit, el ASAR y el instalador generados.

Se reprodujo la discordancia de viewport del smoke dev y se corrigió la
sincronización de la medición, manteniendo la comparación estricta. Dev y ASAR
compilado pasan con referencia. F1-05 ahora compila y empaqueta build/app,
inspecciona contenido/recursos y genera NSIS; regresión ampliada 256/256.
Instalación/actualización y aceptación del candidato nuevo siguen pendientes.
El detalle ejecutado, sus hashes y el ensayo F1-06 están en la bitácora; esta
constancia conserva la procedencia y los límites de las pruebas aportadas.

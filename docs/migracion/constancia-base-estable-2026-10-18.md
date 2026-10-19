# Constancia de pruebas aportadas: base estable

Fecha de registro: **18 de octubre de 2026**, America/Mexico_City.
Grupo: **Evidencia1**, identificado por el usuario como pruebas de la base estable.
Estado: **recorrido funcional aportado y evidencias revisadas**. Esta constancia
no fusiona el PR de base ni declara completada la aceptación operativa.

## 1. Objeto y procedencia

Registrar el avance comunicado por el usuario: se realizaron las pruebas
pertinentes y se entregaron sus evidencias. Se revisaron las 20 capturas y los
cuatro PDF del primer grupo, sin volver a ejecutar la aplicación ni sus pruebas.

Ubicación externa de los originales:

```text
C:/Users/raulc/Documents/ProySerch/pruebas-lira/evidencias-fase-0-inicio1/Evidencia1/
```

Los archivos permanecen fuera del repositorio. Los nombres de la matriz se
resuelven dentro de esa carpeta. No se reproducen datos de participantes,
contactos, contraseñas ni hashes de cuentas en esta constancia.

Referencia del proceso: [control de cierre](cierre-fase-0.md) y
[registro operativo del fork](flujo-fork-y-fases.md). Estos identifican
`2e913c3` como candidato de base, separado de la integración Vite.
**Las capturas no muestran un SHA de ejecución**: su asociación a la base
procede de la declaración del usuario y del contexto del proceso; no constituye
una identificación independiente del ejecutable ni de su configuración SQL.

## 2. Resultados visibles del recorrido

"Éxito visible" significa que la interfaz muestra el resultado indicado.
"Pantalla/diálogo visible" documenta ese punto del recorrido, sin inferir los
pasos posteriores que no están capturados.

| Área | Archivos originales | Hecho observable |
| --- | --- | --- |
| Vistas por rol | `Vista_Admin.png`, `Vista_Usuario.png`, `Vista_Juez.png` | Menús diferenciados y pantalla de evaluación disponible en el recorrido del juez. No sustituye una prueba negativa de permisos por IPC. |
| Registro de pareja | `RegistroParejas.png`, `Registro_Pareja_Rol_Usuario.png` | Éxito visible de guardado y continuación hacia categoría/estilo, también en el recorrido identificado como operador. |
| Categoría y estilo | `RegistroCategoria.png`, `RegistroEstilo.png` | Mensajes de categoría y estilo guardados correctamente. |
| Consultas | `Consulta_Categoria.png`, `Consulta_Estilo.png`, `Consulta_Rol_Usuario.png` | Consulta completada y presentación de datos recuperados. |
| Edición | `Modificacion_parejas.png`, `Confirmacion_actualizacion .png`, `Actualizacion_Datos_Rol_Usuario.png` | Datos actuales consultados y mensajes de actualización exitosa; incluye recorrido identificado como operador. El nombre del segundo archivo contiene un espacio antes de `.png`. |
| Evaluación | `Busqueda_Parejas_Rol_Juez.png`, `EvaluacionPareja.png` | Pareja encontrada y mensaje de evaluación definitiva guardada exitosamente. |
| Alta de cuentas | `Creacion_usuarios.png`, `Creacion_Usuarios_Diferentes_Roles.png` | Mensaje de alta y vista de registros con tres roles y valores con formato bcrypt. La captura no verifica por sí sola la comparación de contraseña. |
| Baja de cuentas | `Eliminacion_Usuarios.png` | Mensaje de eliminación exitosa de una cuenta. |
| Baja de pareja | `Eliminacion_pareja.png` | Mensaje de pareja eliminada con éxito. No hay verificación SQL posterior del borrado de relaciones en este grupo. |
| Cierre de sesión | `Cierre_Sesion_Funcional.png` | Diálogo de confirmación abierto. El nombre del archivo identifica el caso, pero la captura no muestra el regreso final al login. |

Las capturas permiten dejar constancia del recorrido manual que antes aparecía
como pendiente de reporte. No son una grabación continua ni una comprobación
independiente de persistencia de todas las operaciones después de reiniciar.

## 3. Reportes recibidos y revisión

Se abrieron los cuatro PDF, se extrajo su estructura de páginas y se renderizaron
sus **13 páginas** para inspección visual. No se regeneraron ni modificaron.

| Archivo original | Páginas | Resultado de la revisión |
| --- | --- | --- |
| `categorias_registradas.pdf` | 2 | Reporte con categorías y referencias de pareja; un bloque continúa en la segunda página. |
| `estilos_registrados.pdf` | 1 | Reporte con estilos y referencias de pareja. |
| `parejas_registradas.pdf` | 3 | Reporte con participantes y campos de contacto; hay bloques que atraviesan páginas. No se transcriben esos datos. |
| `registros_generales.pdf` | 7 | Reporte con acciones fechadas en 2025. Acredita un documento con historial existente, no que las operaciones de este ensayo generen auditoría nueva. |

La legibilidad general y la presencia de contenido se observaron en el render.
La diagramación no se declara aprobada: hay cortes de bloques entre páginas.
Poppler emitió avisos de fuentes `Symbol` y `ArialUnicode`, y la extracción de
texto sustituyó algunos acentos; el render mostró los títulos y acentos legibles.
Se registra como límite de revisión, sin atribuir automáticamente un defecto
de producción a esos avisos.

No se recibió un PDF de resultados en este grupo. La evaluación guardada y la
presencia del botón de reporte no prueban su generación en este ensayo.
El PDF de registros generales **no cierra H5/M12**: el almacenamiento de nuevos
eventos y su cobertura siguen sujetos a la decisión vigente de migración.

## 4. Relación con las comprobaciones anteriores

El registro operativo del 17 de octubre documenta para la base `2e913c3`:
**245/245**, typecheck, smoke de fuentes/compilado y laboratorio Electron/MySQL
correctos. Son ejecuciones anteriores identificadas allí; este grupo no incluye
capturas de esas terminales ni se volvieron a ejecutar para preparar el acta.

Las evidencias recibidas ahora añaden el recorrido manual mostrado en la sección 2
y los reportes de la sección 3. No deben sustituirse ambas fuentes entre sí ni
presentar las 252 pruebas de la integración como cifra de la base.

## 5. Alcance de la constancia y pendientes

| Dimensión | Situación registrada |
| --- | --- |
| Ejecución por el usuario | Comunicada, con capturas y reportes revisados. |
| Validación manual | Respaldada para los puntos visibles de la matriz. |
| Automáticas | Evidencia previa referenciada, sin nueva ejecución en esta revisión. |
| Aceptación/promoción | Esta entrega de evidencias no es una instrucción de fusionar, etiquetar ni publicar. |
| Cierre global | Se conserva el cierre técnico acotado y la deuda del control de cierre; no se declara producción certificada. |

No consta en este grupo una secuencia completa de cancelación/confirmación de
salida, recuperación de borradores, fotos guardadas y recuperadas, pruebas
negativas por rol, fallos SQL, instalación/actualización o uso sin internet.
Consultar la evidencia automática previa para su cobertura por capas; no marcar
esos casos manuales por inferencia.

Siguiente paso del proceso: asociar la aceptación del alcance ensayado al
candidato exacto antes de promover el PR de base, conservando separada Fase 1.
Este documento deja constancia; no vuelve a exigir ejecutar casos ya respaldados.

## 6. Integridad e identificación del lote

Inventario revisado: **24 archivos: 20 PNG y 4 PDF**. Huella del lote:

```text
SHA-256: 3031efd41cf5294af9847e0e931c4583fc7952789dc6feabd01b10af37f87d55
```

Método reproducible: ordenar los archivos directos por nombre mediante el orden
lexicográfico de Python; construir una línea por archivo con
`nombre<TAB>tamaño_en_bytes<TAB>sha256_del_contenido<LF>`; codificar la concatenación
en UTF-8 y calcular SHA-256. El hash identifica el conjunto recibido, no acredita
fecha, autoría ni versión de la aplicación. No se usaron fechas de modificación
como prueba de cuándo se ejecutó cada caso.

Constancia relacionada: [avance de Fase 1](constancia-fase-1-2026-10-18.md).
La preparación de ambos documentos solo revisó evidencia y documentación.

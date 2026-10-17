# F0-10 · Esquema, concurrencia y archivos

Fecha: 14-10-2026. Hallazgos: H5, H6, H7, M7, M13.

## Evidencia previa

La consulta autorizada de solo lectura confirmó MySQL 8.0.46,
lower_case_table_names=1, cinco tablas InnoDB, IDs VARCHAR(50), ausencia de
t_registros_generales y de las tres restricciones únicas nuevas. Los conteos
de grupos duplicados en categorías, estilos y evaluaciones dieron cero.
Dos credenciales están fuera del patrón bcrypt esperado; no se exportaron valores.

Se guarda únicamente estructura en `sql/000-esquema-observado-2026-10-14.sql`.
`001-laboratorio.sql` es una propuesta más estricta, no una copia de datos reales.
`002-diagnostico-esquema.sql` permite repetir los SELECT de diagnóstico;
`scripts/diagnostico-bd.cjs` añade SHOW CREATE TABLE de cinco tablas conocidas.

## Modificaciones y criterios

- IDs de pareja/categoría/estilo se enlazan como texto. Se conservan 7 y 07 como
  claves distintas; no se amplía todavía su formato funcional a letras.
- `asignacionModel.js`: bloquear primero la pareja y comprobar/insertar asignación
  dentro de la misma transacción. Una carrera permite solo una categoría/estilo.
- Evaluación definitiva: una por juez/pareja; reenvío del mismo puntaje y comentario
  devuelve el ID existente. Un valor distinto se rechaza. Duplicados históricos
  requieren revisión, nunca se borran automáticamente.
- `versionPareja.js`: huella del contenido editable; el modelo la compara bajo
  FOR UPDATE y rechaza EDIT_CONFLICT antes del UPDATE. Evita sobrescritura entre
  ventanas. Es detección por contenido, no contador de revisiones ni historial.
- PDF: escribir con nombre temporal exclusivo, terminar pipeline y renombrar en
  el mismo directorio. Un fallo conserva el PDF anterior. openPath fallido informa
  documento guardado sin prometer apertura.
- Propuesta `003-unicidad-fase0.sql`: tres índices únicos, sin borrar registros.
  La aplicación a la BD del evento queda pendiente de respaldo y revisión.

## Pruebas y autoevaluación

El laboratorio inicia mysqld con `--no-defaults`, directorio nuevo y puerto
loopback independiente. Usa contraseña aleatoria, apaga su proceso y conserva
evidencia ignorada por Git en `.tmp`. No carga la configuración de la aplicación.

En ambas estructuras, con datos ficticios: bcrypt/ID alfanumérico, migración de
contraseña, revocación por rol, 7 frente a 07, carreras de asignación/evaluación/
edición, rollback y eliminación de relaciones. La propuesta de índices se prueba
solo en la copia histórica temporal. No certifica el estado de los datos reales.

La primera repetición entre esquemas detectó que el harness reutilizaba prepared
statements después de USE. Se corrigió abriendo una conexión nueva por esquema;
no se relajaron las aserciones ni la aplicación para hacer pasar esa prueba.

`pdfAtomico.test.cjs` verifica con disco real que un fallo de dibujo mantiene el
archivo anterior y elimina el temporal; la apertura fallida se comunica.
Los tests anteriores de fotos y fallos de transacción siguen formando parte de
la regresión. M8 (huérfanos/apagón) continúa abierto.

Referencia: [Locks de InnoDB](https://dev.mysql.com/doc/refman/8.0/en/innodb-locks-set.html).

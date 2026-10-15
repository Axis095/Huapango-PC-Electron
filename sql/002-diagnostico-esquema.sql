-- SOLO LECTURA. Seleccionar primero la base que se desea auditar en Workbench.
-- No exporta nombres, contraseñas, comentarios ni datos personales.
SELECT VERSION() AS version_mysql, @@lower_case_table_names AS nombres_tablas;
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()
 ORDER BY TABLE_NAME, ORDINAL_POSITION;
SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE,
 GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnas
 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()
 GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE ORDER BY TABLE_NAME, INDEX_NAME;
SELECT COUNT(*) AS grupos_evaluaciones_duplicadas FROM (
 SELECT nJuezID, nParejaID FROM t_evaluaciones GROUP BY nJuezID, nParejaID HAVING COUNT(*) > 1
) AS duplicados;
SELECT COUNT(*) AS parejas_con_varias_categorias FROM (
 SELECT nParejaID FROM t_categorias GROUP BY nParejaID HAVING COUNT(*) > 1
) AS duplicados;
SELECT COUNT(*) AS parejas_con_varios_estilos FROM (
 SELECT nParejaID FROM t_estilos GROUP BY nParejaID HAVING COUNT(*) > 1
) AS duplicados;
SELECT COUNT(*) AS credenciales_que_requieren_revision
 FROM t_usuarios WHERE cContrasena IS NULL OR cContrasena NOT REGEXP '^\\$2[aby]\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$';

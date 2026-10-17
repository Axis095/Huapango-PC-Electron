-- Propuesta revisable; NO aplicada a la base del evento.
-- Requisitos: copia verificada, app cerrada, diagnóstico 002 sin duplicados,
-- y revisar que estos índices aún no existen. MySQL DDL hace commit implícito.
-- Aplicar primero a una copia aislada. No hay eliminación automática de filas.
ALTER TABLE t_categorias ADD UNIQUE KEY uq_categoria_pareja (nParejaID);
ALTER TABLE t_estilos ADD UNIQUE KEY uq_estilo_pareja (nParejaID);
ALTER TABLE t_evaluaciones ADD UNIQUE KEY uq_evaluacion_juez_pareja (nJuezID, nParejaID);

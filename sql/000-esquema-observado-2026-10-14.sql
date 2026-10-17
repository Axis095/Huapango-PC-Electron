-- Estructura observada el 14-10-2026 America/Mexico_City mediante SHOW CREATE TABLE.
-- Sin registros, credenciales ni contadores AUTO_INCREMENT. No ejecutar sobre tablas existentes.
-- Conservar como evidencia histórica; no es una migración.

CREATE TABLE `t_usuarios` (
  `nUsuarioID` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cNombreUsuario` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cContrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('admin','user','juez') COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`nUsuarioID`),
  UNIQUE KEY `cNombreUsuario` (`cNombreUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `t_participantes` (
  `nParejaID` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `oFoto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dNacimiento` date DEFAULT NULL,
  `ISexo` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nTelefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cNombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cApellido` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cEmail` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cNombreM` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cApellidoM` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dNacimientoM` date DEFAULT NULL,
  `nTelefonoM` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cEmailM` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ISexoM` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IFotoM` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`nParejaID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `t_categorias` (
  `nIDCategoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cCategoriaNombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nParejaID` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`nIDCategoria`),
  KEY `nParejaID` (`nParejaID`),
  CONSTRAINT `t_categorias_ibfk_1` FOREIGN KEY (`nParejaID`) REFERENCES `t_participantes` (`nParejaID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `t_estilos` (
  `nEstiloID` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cEstiloNombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nParejaID` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`nEstiloID`),
  KEY `nParejaID` (`nParejaID`),
  CONSTRAINT `t_estilos_ibfk_1` FOREIGN KEY (`nParejaID`) REFERENCES `t_participantes` (`nParejaID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `t_evaluaciones` (
  `nEvaluacionID` int NOT NULL AUTO_INCREMENT,
  `nJuezID` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nParejaID` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nPuntaje` decimal(5,2) DEFAULT NULL,
  `cComentario` text COLLATE utf8mb4_unicode_ci,
  `dFechaEvaluacion` datetime DEFAULT NULL,
  PRIMARY KEY (`nEvaluacionID`),
  KEY `nJuezID` (`nJuezID`),
  KEY `nParejaID` (`nParejaID`),
  CONSTRAINT `t_evaluaciones_ibfk_1` FOREIGN KEY (`nJuezID`) REFERENCES `t_usuarios` (`nUsuarioID`),
  CONSTRAINT `t_evaluaciones_ibfk_2` FOREIGN KEY (`nParejaID`) REFERENCES `t_participantes` (`nParejaID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE DATABASE huapango_pruebas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE huapango_pruebas;

CREATE TABLE t_usuarios (
  nUsuarioID VARCHAR(50) NOT NULL,
  cNombreUsuario VARCHAR(100) NOT NULL,
  cContrasena VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rol ENUM('admin', 'user', 'juez') NOT NULL,
  PRIMARY KEY (nUsuarioID),
  UNIQUE KEY uq_usuario_nombre (cNombreUsuario)
) ENGINE=InnoDB;

CREATE TABLE t_participantes (
  nParejaID VARCHAR(50) NOT NULL,
  oFoto VARCHAR(512) NOT NULL DEFAULT '',
  dNacimiento DATE NOT NULL,
  ISexo ENUM('M', 'F') NOT NULL,
  nTelefono VARCHAR(25) NOT NULL,
  cNombre VARCHAR(100) NOT NULL,
  cApellido VARCHAR(100) NOT NULL,
  cEmail VARCHAR(254) NOT NULL,
  cNombreM VARCHAR(100) NOT NULL,
  cApellidoM VARCHAR(100) NOT NULL,
  dNacimientoM DATE NOT NULL,
  nTelefonoM VARCHAR(25) NOT NULL,
  cEmailM VARCHAR(254) NOT NULL,
  ISexoM ENUM('M', 'F') NOT NULL,
  IFotoM VARCHAR(512) NULL,
  PRIMARY KEY (nParejaID),
  UNIQUE KEY uq_email_1 (cEmail),
  UNIQUE KEY uq_email_2 (cEmailM)
) ENGINE=InnoDB;

CREATE TABLE t_categorias (
  nIDCategoria VARCHAR(50) NOT NULL,
  cCategoriaNombre VARCHAR(100) NOT NULL,
  nParejaID VARCHAR(50) NOT NULL,
  PRIMARY KEY (nIDCategoria),
  UNIQUE KEY uq_categoria_pareja (nParejaID),
  CONSTRAINT fk_categoria_pareja FOREIGN KEY (nParejaID)
    REFERENCES t_participantes (nParejaID) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE t_estilos (
  nEstiloID VARCHAR(50) NOT NULL,
  cEstiloNombre VARCHAR(100) NOT NULL,
  nParejaID VARCHAR(50) NOT NULL,
  PRIMARY KEY (nEstiloID),
  UNIQUE KEY uq_estilo_pareja (nParejaID),
  CONSTRAINT fk_estilo_pareja FOREIGN KEY (nParejaID)
    REFERENCES t_participantes (nParejaID) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE t_evaluaciones (
  nEvaluacionID INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nJuezID VARCHAR(50) NOT NULL,
  nParejaID VARCHAR(50) NOT NULL,
  nPuntaje INT NOT NULL,
  cComentario VARCHAR(255) NOT NULL DEFAULT '',
  dFechaEvaluacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nEvaluacionID),
  UNIQUE KEY uq_evaluacion_juez_pareja (nJuezID, nParejaID),
  KEY ix_evaluacion_pareja (nParejaID),
  CONSTRAINT fk_evaluacion_usuario FOREIGN KEY (nJuezID)
    REFERENCES t_usuarios (nUsuarioID) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluacion_pareja FOREIGN KEY (nParejaID)
    REFERENCES t_participantes (nParejaID) ON DELETE RESTRICT,
  CONSTRAINT ck_puntaje CHECK (nPuntaje BETWEEN 0 AND 60)
) ENGINE=InnoDB;

CREATE TABLE t_registros_generales (
  nDatos_nuevos INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cAcción` VARCHAR(255) NOT NULL,
  dFecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nDatos_nuevos)
) ENGINE=InnoDB;

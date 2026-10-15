# Guía de primera instalación — Huapango-PC-Electron

Actualizada: 14 de octubre de 2026. Entorno: Windows x64 y PowerShell.
Proyecto actual: Electron, JavaScript y MySQL; Fase 0 reforzada. React, TypeScript y Vite todavía no están incorporados.

Esta guía cubre preparación del equipo, base de laboratorio, usuarios iniciales, ejecución, pruebas y generación del instalador. Los pasos SQL son instrucciones para ejecutar: **no se ha creado una base ni instalado MySQL al redactar esta guía**.

## 1. Requisitos

| Componente | Desarrollo y generación | Ejecución del instalador |
| --- | --- | --- |
| Windows de 64 bits | Sí | Sí |
| Node.js >= 22.12.0 y npm | Sí; utilizar una versión LTS compatible | No |
| Git | Obtener/versionar fuentes | No |
| MySQL Server | Local o accesible por red | Local o accesible por red |
| Cliente mysql o Workbench | Crear BD y usuarios iniciales | Administración inicial |
| Internet | npm, Electron y herramientas de empaquetado | No requerido para fuentes; conexión con MySQL si es remoto |
| Lector PDF | Revisar reportes | Revisar reportes |

Instalar Node desde [su descarga oficial](https://nodejs.org/en/download).
La guía utiliza MySQL Community Server 8.4 para Windows como referencia de laboratorio. El MSI y MySQL Configurator permiten instalar/configurar el servidor como servicio; comprobar también el runtime Visual C++ requerido por MySQL. Seguir [la instalación oficial](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html). Workbench es opcional y no sustituye al servidor.

Configurar puerto TCP 3306 y contraseña del administrador MySQL. Para una sola PC no es necesario exponerlo a toda la red. La aplicación usará una cuenta limitada propia.

## 2. Preparar las fuentes y dependencias

En esta PC:

```powershell
Set-Location 'C:\Users\raulc\Documents\HuapangoAntigravity\Huapango-PC-Electron'
git branch --show-current
git status --short
node --version
npm.cmd --version
```

En una PC nueva, sustituir el marcador por la URL del repositorio que contiene los cambios:

```powershell
git clone <URL_DEL_REPOSITORIO> Huapango-PC-Electron
Set-Location .\Huapango-PC-Electron
git switch RefactorizacionTest-RC
```

El checkpoint `fd1b0da` guarda el primer avance; el bloque posterior del 14 de octubre debe revisarse, guardarse y publicarse antes de estar disponible mediante clonación. Revisar [la bitácora y su comando de commit](migracion/fase-0.md). No sobrescribir cambios locales para obtener una instalación limpia.

Usar `npm.cmd` en PowerShell para evitar restricciones de ejecución de `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd exec --no -- install-electron
npm.cmd ls --depth=0
```

`npm ci` instala desde el lockfile y reemplaza node_modules: cerrar la app antes de ejecutarlo. `install-electron` está declarado por el paquete Electron instalado y prepara su ejecutable. No instalar Electron/electron-builder globalmente.

Dependencias de ejecución: bcryptjs, mysql2 y pdfkit. Herramientas de desarrollo: Electron y electron-builder. Las versiones exactas se resuelven en package-lock.json.

## 3. Comprobar MySQL

```powershell
Get-Service -Name '*MySQL*'
Test-NetConnection 127.0.0.1 -Port 3306
mysql --version
```

Si el servicio está detenido, iniciarlo desde Servicios de Windows o una terminal administrativa usando el nombre real mostrado. Si mysql no está en PATH, utilizar la ruta de su instalación:

```powershell
$mysqlExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe'
& $mysqlExe --version
& $mysqlExe --host=127.0.0.1 --port=3306 --user=root --password --default-character-set=utf8mb4
```

`--password` pide la clave sin incluirla en el comando. Mantener abierta esta consola MySQL para los bloques SQL. En Workbench se pueden ejecutar desde una conexión administrativa.

```sql
SELECT VERSION(), @@lower_case_table_names;
```

El código mezcla nombres como `T_Usuarios` y `t_usuarios`. Esta guía requiere `lower_case_table_names = 1`, habitual en MySQL sobre Windows. Si el valor es distinto, resolver la compatibilidad antes de importar. No modificar esta variable sobre un directorio de datos inicializado. Consultar [las reglas oficiales de nombres](https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html).

## 4. Crear la base de laboratorio

**Ya se conserva una copia sin datos de la estructura histórica en [sql/000-esquema-observado-2026-10-14.sql](../sql/000-esquema-observado-2026-10-14.sql).** El esquema siguiente es una propuesta mínima reconstruida de las consultas activas. Tipos, longitudes, índices y restricciones son decisiones para el laboratorio; no certifican ni reproducen todas las reglas de la BD histórica. Si existe un dump oficial, restaurarlo en una BD separada y cotejarlo con los modelos.

Ejecutar solo para una base **nueva** `huapango_pruebas`. Si CREATE DATABASE informa que existe, detenerse y revisar su contenido; no continuar con el resto del bloque. No usarlo como migración de una BD del evento.

```sql
CREATE DATABASE huapango_pruebas
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE huapango_pruebas;

CREATE TABLE T_Usuarios (
  nUsuarioID VARCHAR(50) NOT NULL,
  cNombreUsuario VARCHAR(100) NOT NULL,
  cContrasena VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  rol ENUM('admin', 'user', 'juez') NOT NULL,
  PRIMARY KEY (nUsuarioID),
  UNIQUE KEY uq_usuario_nombre (cNombreUsuario)
) ENGINE=InnoDB;

CREATE TABLE T_Participantes (
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

CREATE TABLE T_Categorias (
  nIDCategoria VARCHAR(50) NOT NULL,
  cCategoriaNombre VARCHAR(100) NOT NULL,
  nParejaID VARCHAR(50) NOT NULL,
  PRIMARY KEY (nIDCategoria),
  UNIQUE KEY uq_categoria_pareja (nParejaID),
  CONSTRAINT fk_categoria_pareja FOREIGN KEY (nParejaID)
    REFERENCES T_Participantes (nParejaID) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE T_Estilos (
  nEstiloID VARCHAR(50) NOT NULL,
  cEstiloNombre VARCHAR(100) NOT NULL,
  nParejaID VARCHAR(50) NOT NULL,
  PRIMARY KEY (nEstiloID),
  UNIQUE KEY uq_estilo_pareja (nParejaID),
  CONSTRAINT fk_estilo_pareja FOREIGN KEY (nParejaID)
    REFERENCES T_Participantes (nParejaID) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE T_Evaluaciones (
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
    REFERENCES T_Usuarios (nUsuarioID) ON DELETE RESTRICT,
  CONSTRAINT fk_evaluacion_pareja FOREIGN KEY (nParejaID)
    REFERENCES T_Participantes (nParejaID) ON DELETE RESTRICT,
  CONSTRAINT ck_puntaje CHECK (nPuntaje BETWEEN 0 AND 60)
) ENGINE=InnoDB;

CREATE TABLE t_registros_generales (
  nDatos_nuevos INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cAcción` VARCHAR(255) NOT NULL,
  dFecha_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (nDatos_nuevos)
) ENGINE=InnoDB;
```

Decisiones de este esquema:

- Una fila guarda ambos participantes de la pareja; los teléfonos son texto.
- Categoría/estilo son asignaciones por pareja. Sus IDs manuales identifican filas: no repetir un ID para todas las parejas de una categoría.
- No preinsertar catálogos: la interfaz inserta las asignaciones después de guardar la pareja.
- Se permite una categoría y un estilo por pareja, y una evaluación definitiva por juez/pareja. Un reenvío idéntico recupera el resultado original; un cambio posterior se rechaza.
- No se añaden columnas cPequenos/cPotosino: los endpoints antiguos de actualización están suspendidos en Fase 0.
- No hay triggers. El backend no escribe automáticamente en registros generales.
- Eliminar un usuario con evaluaciones se rechaza por FK; no quitar restricciones para aparentar éxito.

Verificar seis tablas InnoDB y la longitud suficiente para hashes de 60 caracteres:

```sql
SHOW TABLES;
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'huapango_pruebas';
SHOW CREATE TABLE T_Usuarios;
SHOW CREATE TABLE T_Participantes;
```

## 5. Crear la cuenta de conexión MySQL

Esta cuenta permite a Electron acceder a SQL. **No es el admin de la pantalla de login.** Sustituir ambos marcadores por la misma contraseña propia antes de ejecutar; no versionar ese SQL con credenciales reales.

```sql
CREATE USER 'huapango_app'@'127.0.0.1'
  IDENTIFIED BY 'SUSTITUIR_POR_CLAVE_MYSQL_PROPIA';
GRANT SELECT, INSERT, UPDATE, DELETE ON huapango_pruebas.*
  TO 'huapango_app'@'127.0.0.1';

CREATE USER 'huapango_app'@'localhost'
  IDENTIFIED BY 'SUSTITUIR_POR_LA_MISMA_CLAVE_MYSQL';
GRANT SELECT, INSERT, UPDATE, DELETE ON huapango_pruebas.*
  TO 'huapango_app'@'localhost';
```

Las dos cuentas cubren variantes locales de resolución de host. No se concede CREATE, DROP, GRANT ni acceso administrativo. No hace falta FLUSH PRIVILEGES después de CREATE USER/GRANT. Si ya existen, revisar qué instalaciones las usan antes de cambiar contraseñas.

En otra terminal, comprobar la cuenta:

```powershell
& $mysqlExe --host=127.0.0.1 --port=3306 --user=huapango_app --password --default-character-set=utf8mb4 huapango_pruebas
```

Definir nuevamente `$mysqlExe` si es otra sesión PowerShell. En MySQL:

```sql
SELECT CURRENT_USER(), DATABASE();
SELECT COUNT(*) FROM T_Usuarios;
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE();
```

La app comprueba los metadatos de las tablas en cada transacción. Deben ser visibles con los permisos sobre la BD; no conceder acceso global para compensar un nombre de tabla incorrecto.

## 6. Insertar admin, operador y juez con bcrypt

Crear un admin inicial permite usar después la pantalla de administración. Para probar los tres roles, generar las tres filas siguientes. Las contraseñas son **públicas y exclusivamente de laboratorio**; no usarlas con datos reales. No existe un flujo general de cambio de contraseña en la interfaz actual.

| ID | Nombre | Rol | Contraseña de laboratorio |
| --- | --- | --- | --- |
| 1 | admin_pruebas | admin | AdminPruebas-2026! |
| 2 | operador_pruebas | user | OperadorPruebas-2026! |
| 3 | juez_pruebas | juez | JuezPruebas-2026! |

Desde la raíz del proyecto, ejecutar en PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path '.tmp' | Out-Null
@'
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
(async () => {
  const usuarios = [
    [1, 'admin_pruebas', 'AdminPruebas-2026!', 'admin'],
    [2, 'operador_pruebas', 'OperadorPruebas-2026!', 'user'],
    [3, 'juez_pruebas', 'JuezPruebas-2026!', 'juez']
  ];
  const sql = ['USE huapango_pruebas;', 'START TRANSACTION;'];
  for (const [id, nombre, password, rol] of usuarios) {
    const hash = await bcrypt.hash(password, 10);
    sql.push(`INSERT INTO T_Usuarios (nUsuarioID,cNombreUsuario,cContrasena,rol) VALUES (${id},'${nombre}','${hash}','${rol}');`);
  }
  sql.push('COMMIT;');
  fs.writeFileSync('.tmp/usuarios-prueba.sql', sql.join('\n') + '\n', 'utf8');
  console.log('Generado .tmp/usuarios-prueba.sql con hashes bcrypt.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'@ | node
```

El script utiliza nombres/roles fijos. Si se generaliza a entradas arbitrarias, usar inserciones parametrizadas. Puedes sustituir las contraseñas antes de generarlo. El SQL generado guarda hashes, no texto plano; no necesita Electron ni config.json.

Importar desde el cliente mysql conectado como administrador:

```sql
SOURCE C:/Users/raulc/Documents/HuapangoAntigravity/Huapango-PC-Electron/.tmp/usuarios-prueba.sql;
```

En otra PC ajustar la ruta absoluta. SOURCE es una orden del cliente mysql; en Workbench abrir el archivo y ejecutar su contenido. No usar la sintaxis `mysql < archivo.sql` directamente en PowerShell.

Ejecutar una sola vez sobre una tabla vacía. Si existe alguna cuenta con esos IDs/nombres, detenerse antes de importar. SOURCE puede continuar después de un error y alcanzar COMMIT: no asumir que un error implica rollback del conjunto. Revisar las filas y resolver conflictos antes de repetir.

Comprobar sin publicar hashes:

```sql
SELECT nUsuarioID, cNombreUsuario, rol, CHAR_LENGTH(cContrasena) AS longitud_hash,
       LEFT(cContrasena, 4) AS prefijo
FROM T_Usuarios ORDER BY nUsuarioID;
```

Esperado: tres cuentas, longitud 60 y prefijo `$2b$`. El siguiente usuario necesita un ID libre, nombre de al menos tres caracteres y contraseña de máximo 72 bytes UTF-8. Al iniciar correctamente con una contraseña heredada se reemplaza por bcrypt; las cuentas sin usar requieren revisión antes de retirar la compatibilidad.

Compatibilidad con una BD previa: un ID numérico puede llegar desde MySQL como
texto, por ejemplo `"6"`; el login lo valida y conserva su representación.
Los IDs de usuario alfanuméricos como `U001` ya se admiten (máximo 50 caracteres, letras, números, guiones y guiones bajos). Los IDs de pareja/categoría/estilo siguen admitiendo dígitos positivos y conservan ceros iniciales; se envían como texto a MySQL. No renumerar cuentas existentes ni alterar
claves foráneas para resolver un error de login.

## 7. Primer arranque

```powershell
npm.cmd start
```

Si no hay configuración válida, completar el formulario:

| Campo | Valor |
| --- | --- |
| Servidor | 127.0.0.1 |
| Puerto | 3306 |
| Usuario MySQL | huapango_app |
| Contraseña MySQL | La elegida en el paso 5 |
| Base de datos | huapango_pruebas |

1. Pulsar **Comprobar y guardar**.
2. Pulsar **Continuar al inicio de sesión**.
3. Entrar con admin_pruebas y la contraseña del paso 6.
4. Cerrar y volver a abrir la app para probar otra cuenta.

La aplicación verifica conectividad: **no crea tablas ni inserta usuarios automáticamente**. Una conexión correcta no acredita que el esquema esté completo.

Si hay configuración anterior, puede abrir directamente el login de otra BD. Entrar como su admin para usar Ayuda → Configuración → Base de Datos, o respaldar y apartar config.json con la app cerrada para recuperar el primer arranque. Confirmar la BD antes de probar escrituras.

La configuración habitual de desarrollo está en `%APPDATA%/huapango-app/config.json`. La ubicación efectiva es `app.getPath('userData')`; el nombre puede variar en el paquete. El JSON conserva la clave MySQL local: protegerlo y sus respaldos, y excluirlos de Git. Las cuentas del login guardan hashes en la BD; son credenciales diferentes.

## 8. Pruebas y ensayo real

```powershell
npm.cmd test
npm.cmd run test:smoke
npm.cmd run test:integration
npm.cmd audit --omit=dev
npm.cmd audit
```

Consultar la [evidencia vigente de cierre](migracion/cierre-fase-0.md). El laboratorio automático usa un servidor MySQL temporal con puerto/directorio propios, sin copiar registros reales. Requiere mysqld instalado; admite la variable HUAPANGO_TEST_MYSQLD. Conserva evidencia en .tmp/mysql-fase0-* y apaga su servidor al terminar.

- La suite utiliza SQL/Electron simulados y archivos temporales; no requiere MySQL real.
- El smoke usa Electron, preload y HTML reales con ventanas ocultas, perfil aislado y SQL simulado. No verifica el servidor MySQL ni presentación visual.
- En la última revisión, npm reportó cero avisos de producción y ocho moderados en herramientas de empaquetado. Registrar resultados actuales; no aplicar audit fix --force sin revisión.

Para el ensayo funcional, usar solo huapango_pruebas:

1. Entrar como operador y registrar pareja **1001**, con nombres ficticios, fechas válidas, teléfonos aceptados y correos uno@example.test y dos@example.test.
2. Guardar la pareja y asignar categoría: ID de fila **1001**, seleccionar Adulto. Estilo: ID de fila **1001**, seleccionar Potosino. Cada tabla tiene su propia secuencia de IDs.
3. Consultar 1001 y comprobar datos; probar PNG/JPEG válidos, imagen rota y archivo mayor de 5 MiB.
4. Navegar y volver para comprobar borradores de registro/modificación.
5. Cerrar y entrar como juez; buscar 1001 y evaluar con seis valores 0–10, total 0–60.
6. Cerrar y entrar como admin; generar PDF de parejas, categorías, estilos y resultados.
7. Modificar ambos participantes, repetir valores y comprobar un ID inexistente.
8. Eliminar solo la pareja ficticia y comprobar retirada de relaciones.

User no evalúa ni administra cuentas; juez y admin evalúan. El autor se deriva de la sesión. Verificar mediante SQL de lectura:

```sql
USE huapango_pruebas;
SELECT nParejaID, cNombre, cNombreM FROM T_Participantes;
SELECT nIDCategoria, cCategoriaNombre, nParejaID FROM T_Categorias;
SELECT nEstiloID, cEstiloNombre, nParejaID FROM T_Estilos;
SELECT nJuezID, nParejaID, nPuntaje FROM T_Evaluaciones;
```

Para probar opcionalmente el PDF de registros generales, insertar como administrador MySQL:

```sql
INSERT INTO t_registros_generales (`cAcción`)
VALUES ('Evento ficticio de laboratorio: comprobación del reporte');
```

Es una fila ficticia manual, no un historial automático. Sin filas, el reporte vacío es esperado. Registrar el ensayo en [la hoja de cierre de Fase 0](migracion/ensayo-fase-0.md).

## 9. Generar aplicación e instalador

Cerrar la aplicación. Primero generar una carpeta ejecutable:

```powershell
npm.cmd run build -- --win --x64 --dir --publish never
```

Normalmente queda en dist/win-unpacked. Probar su ejecutable. Después generar NSIS:

```powershell
npm.cmd run build -- --win --x64 --publish never
Get-ChildItem -LiteralPath .\dist
```

Buscar el `.exe` de instalación en dist; el nombre depende del producto, versión y configuración. `--publish never` genera localmente sin publicar. El primer build puede descargar herramientas adicionales.

El empaquetado actual usa fuentes CommonJS y HTML. El instalador **no contiene MySQL, BD, usuarios iniciales, configuración local ni fotos**. La PC destino necesita acceso al servidor y completar el paso 7; para ejecutar el paquete no necesita Node/npm/Git.

Un instalador sin firma puede mostrar avisos de Windows. La firma y distribución final requieren revisión propia; no desactivar protecciones como requisito del ensayo.

No usar npm run clean como paso obligatorio: actualmente depende de rimraf sin una dependencia directa declarada. Registrar cualquier error de limpieza en lugar de borrar carpetas de datos para resolverlo.

## 10. Primera instalación en otra PC o perfil

1. Registrar revisión Git y pruebas usadas para construir.
2. Copiar el instalador a una PC de pruebas o cuenta Windows separada.
3. Instalar, configurar conexión, iniciar sesión y repetir registro → evaluación → PDF.
4. Reiniciar y confirmar persistencia de configuración/fotos.

`127.0.0.1` en otra PC se refiere a esa PC. Para un servidor remoto, usar su dirección, una cuenta MySQL autorizada para esa estación y conectividad/transporte adecuados. Las cuentas localhost de esta guía no permiten otras PCs.

Las fotos están en el disco de cada estación: compartir MySQL no comparte archivos. Desarrollo y paquete pueden reutilizar userData si tienen el mismo nombre; preferir una cuenta Windows distinta para comprobar un primer arranque limpio.

## 11. Archivos y respaldos

| Elemento | Ubicación |
| --- | --- |
| Usuarios, parejas, asignaciones y evaluaciones | Servidor MySQL configurado |
| Conexión | userData/config.json |
| Fotografías nuevas | userData/uploads/fotos/ |
| Borradores | Memoria de ventana; no sobreviven al cierre/caída |
| PDF | Destino elegido en el diálogo |
| Instaladores | dist/ en desarrollo |

Respaldar SQL y uploads como conjunto, con escrituras detenidas. Exportar la BD de laboratorio en PowerShell usando una cuenta autorizada para respaldos:

```powershell
$dumpExe = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe'
$backupFile = Join-Path (Get-Location) '.tmp\huapango-pruebas-backup.sql'
& $dumpExe --host=127.0.0.1 --port=3306 --user=root --password --single-transaction --default-character-set=utf8mb4 --result-file=$backupFile huapango_pruebas
```

La carpeta .tmp se creó en el paso 6. Conservar dump y copia de uploads fuera de Git y de las carpetas temporales que se limpian. No restaurar sobre una BD existente sin comprobar respaldo y destino.

## 12. Problemas frecuentes

| Síntoma | Revisar |
| --- | --- |
| npm.ps1 bloqueado | Usar npm.cmd |
| mysql no reconocido | Ruta completa de mysql.exe o PATH |
| ECONNREFUSED | Servicio, host y puerto |
| Acceso denegado | Cuenta MySQL, clave y host; no confundirla con admin_pruebas |
| Base/tabla inexistente | Importación completa en BD correcta y nombres compatibles |
| UNSAFE_STORAGE_ENGINE | Tablas InnoDB y metadatos visibles |
| Login rechazado | Usuarios insertados, hash completo, ID positivo y rol permitido |
| FORBIDDEN | Sesión, rol y vista; mantener guardias IPC |
| ID de categoría/estilo duplicado | Usar un ID de fila libre |
| UNSUPPORTED_OPERATION | Endpoint antiguo suspendido hasta verificar contrato/esquema |
| TRANSACTION_OUTCOME_UNKNOWN | Consultar antes de repetir escrituras |
| PDF vacío | Datos ausentes; crear datos del reporte |
| Fotos ausentes en otra PC | Respaldar/restaurar uploads con SQL |
| Descarga de build falla | Red, proxy, caché y mensaje exacto |

## 13. Checklist de instalación comprobada

- [ ] Revisión Git identificada; dependencias desde lockfile.
- [ ] Servicio activo, seis tablas InnoDB y permisos de conexión comprobados.
- [ ] Tres usuarios de login con hashes; cuentas SQL y de aplicación diferenciadas.
- [ ] Suite y smoke sin fallos.
- [ ] Registro, evaluación y reportes reales sobre huapango_pruebas.
- [ ] Modificación, eliminación, fotos y borradores comprobados.
- [ ] Paquete e instalador probados fuera del entorno de desarrollo.
- [ ] Evidencia y pendientes registrados en la bitácora.

La guía se contrastó con consultas activas y configuración. El DDL propuesto no se ejecutó contra MySQL durante esta redacción; registrar esa validación al crear el laboratorio.

## Diferencias de la instalación histórica comprobadas el 14 de octubre

La base local tiene cinco tablas InnoDB, IDs VARCHAR(50), dos credenciales fuera del formato bcrypt esperado y no tiene t_registros_generales. No tiene índices únicos por pareja en categorías/estilos ni por juez/pareja en evaluaciones. El laboratorio propuesto sí incluye estas restricciones y la sexta tabla. No ejecutar altas de prueba ni ALTER sobre la base del evento.

La propuesta [003-unicidad-fase0.sql](../sql/003-unicidad-fase0.sql) se ensaya únicamente sobre una copia temporal. La aplicación protege concurrencia con transacciones incluso antes de añadirla, pero la base real sigue requiriendo revisión y aplicación administrada de esos índices.

El build normal puede fallar en winCodeSign por falta del privilegio de enlaces simbólicos de Windows. Un build de laboratorio sin edición/firma del ejecutable no acredita el build normal ni una instalación validada; consultar la reevaluación antes de distribuir.

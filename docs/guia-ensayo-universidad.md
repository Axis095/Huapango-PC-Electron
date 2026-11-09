# Ensayo en la universidad con la laptop como servidor

Fecha prevista del ensayo: lunes 9 de noviembre de 2026. Versión de Huapango: **1.0.1**, rama `Prototipo-v1.0`, commit de aplicación `39d0dd6`.

El objetivo es registrar parejas desde las estaciones del equipo y comprobar que llegan, con categoría y estilo, al MySQL de la laptop servidor. Registrar los resultados en el [checklist del ensayo](checklist-ensayo-universidad.md).

## Preparación antes de salir

1. Instalar y comprobar **MySQL Server** en la laptop que será servidor. Usar Workbench para administrarlo y Huapango 1.0.1 para probar la aplicación.
2. Preparar una copia de ensayo con datos ficticios, cuentas de Huapango y números de pareja disponibles.
3. Tener preparados el instalador y los cargadores de todos los equipos. En la Mac, comprobar previamente que abre la versión 1.0.1 utilizada para el ensayo.
4. Mantener la laptop servidor conectada a corriente y configurar la suspensión para que permanezca despierta durante la prueba.

### Llevar la base de datos a la laptop

En Workbench de la PC de escritorio, abrir su conexión local y seleccionar **Server → Data Export**. Elegir el esquema del evento y todas sus tablas, seleccionar **Dump Structure and Data** y **Export to Self-Contained File**, y ejecutar **Start Export**. Hacer la exportación cuando hayan terminado las capturas en curso.

Copiar el archivo SQL a la laptop servidor. En Workbench de esa laptop, abrir su conexión a MySQL local y seleccionar **Server → Data Import**, elegir el archivo exportado y comprobar el esquema de destino antes de iniciar la importación.

Estas instrucciones utilizan `bdhuapango2026`. Si ese esquema ya contiene información en la laptop, revisar y respaldar su contenido antes de importar. El archivo SQL puede incluir instrucciones `CREATE DATABASE` o `USE`; comprobar que apuntan al destino del ensayo. Si se usa otro esquema, sustituir `bdhuapango2026` en las consultas y en la configuración de todas las estaciones.

Las cuentas de Huapango se trasladan con `t_usuarios`. Las cuentas de conexión de MySQL, como `registro01`, se crean aparte en el MySQL de la laptop. Los archivos de fotografías requieren su propio traslado o respaldo; la exportación SQL conserva sus referencias.

En la laptop servidor, comprobar la importación:

```sql
USE bdhuapango2026;
SHOW TABLES;

SELECT
    (SELECT COUNT(*) FROM t_participantes) AS parejas,
    (SELECT COUNT(*) FROM t_categorias) AS categorias,
    (SELECT COUNT(*) FROM t_estilos) AS estilos;
```

Configurar Huapango en esa laptop con servidor `127.0.0.1`, puerto `3306`, el esquema importado y una cuenta MySQL local apropiada. Si la aplicación conserva la conexión anterior, usar una sesión administradora para entrar en **Ayuda → Configuración → Base de Datos**. Si la conexión guardada impide arrancar, resolver ese cambio antes de salir, siguiendo la [guía de primer arranque y recuperación](primer-arranque.md).

Comprobar login, consulta y registro en la propia laptop. Guardar el ID utilizado como referencia del ensayo.

## Primera prueba de red en la universidad

Consultar con el responsable de redes si se permite la comunicación local entre las estaciones y la laptop servidor por TCP `3306`. Tener acceso a Internet y estar conectado al mismo nombre de Wi-Fi puede coexistir con restricciones de comunicación entre clientes.

1. Conectar primero la laptop servidor y una estación a la red indicada por la universidad. Completar cualquier autenticación que solicite esa red.
2. Ejecutar `ipconfig` en cada equipo Windows. Anotar la IPv4 del adaptador conectado a esa red. En la Mac, consultar la dirección IP en los detalles de la conexión Wi-Fi.
3. Desde la estación Windows, ejecutar en PowerShell:

   ```powershell
   $ipServidor = Read-Host 'Escribe la IPv4 de la laptop servidor'
   Test-NetConnection -ComputerName $ipServidor -Port 3306
   ```

   El resultado esperado es **`TcpTestSucceeded : True`**.

   Desde una Mac, sustituir `IP_REAL_SERVIDOR` por la dirección anotada y ejecutar en Terminal:

   ```bash
   nc -vz IP_REAL_SERVIDOR 3306
   ```

   El resultado esperado indica que la conexión tuvo éxito.

4. Si falla, comprobar que el servicio MySQL esté iniciado en la laptop servidor y escuche en la interfaz de red. Se puede inspeccionar el puerto desde PowerShell de esa laptop:

   ```powershell
   Get-NetTCPConnection -State Listen -LocalPort 3306
   ```

   Una escucha limitada a `127.0.0.1` o `::1` permite únicamente acceso local. Revisar la configuración de escucha de MySQL si corresponde.

5. Revisar una regla entrante del firewall que permita TCP `3306` desde las IP de las estaciones y en el perfil de red activo. Mantener el firewall habilitado y limitar el alcance a los equipos del ensayo.
6. Si servicio, escucha y firewall son correctos, solicitar al responsable de redes que revise restricciones entre clientes o subredes. Antes de incorporar más estaciones, conseguir una conexión satisfactoria desde la primera.

## Autorizar cada estación en MySQL

Abrir Workbench en la **laptop servidor**, usando su conexión administrativa local. Consultar las cuentas existentes:

```sql
SELECT User, Host
FROM mysql.user
WHERE User IN ('registro01', 'registro02', 'registro03', 'registro04', 'registro05')
ORDER BY User, Host;
```

Para cada estación, sustituir **todas** las apariciones de `IP_REAL_ESTACION` por su IPv4 actual, elegir un usuario y asignar una contraseña privada. La IP de esta cuenta corresponde a la estación que se conecta. La IP del campo Servidor en Huapango corresponde a la laptop central.

```sql
CREATE USER 'registro01'@'IP_REAL_ESTACION'
IDENTIFIED BY 'REEMPLAZAR_POR_UNA_CLAVE_PRIVADA';

GRANT SELECT ON bdhuapango2026.t_usuarios
TO 'registro01'@'IP_REAL_ESTACION';

GRANT SELECT, INSERT, UPDATE ON bdhuapango2026.t_participantes
TO 'registro01'@'IP_REAL_ESTACION';

GRANT SELECT, INSERT, UPDATE ON bdhuapango2026.t_categorias
TO 'registro01'@'IP_REAL_ESTACION';

GRANT SELECT, INSERT, UPDATE ON bdhuapango2026.t_estilos
TO 'registro01'@'IP_REAL_ESTACION';

SHOW GRANTS FOR 'registro01'@'IP_REAL_ESTACION';
```

Si ya existe la combinación exacta de usuario e IP, omitir `CREATE USER`, utilizar su contraseña existente y ejecutar los `GRANT` y `SHOW GRANTS`. Repetir con `registro02`, `registro03`, etc. Estos permisos cubren el ensayo de registro, consulta y edición de parejas. Las evaluaciones y operaciones administrativas requieren sus permisos específicos.

## Configurar las estaciones

En Huapango de cada estación, configurar la IP actual de la laptop servidor, puerto `3306`, esquema del ensayo, usuario MySQL asignado y su contraseña. Pulsar **Comprobar y guardar** y continuar al login. Para una instalación previamente configurada, usar el flujo de configuración autorizado descrito arriba.

Cada operador inicia sesión con su propia cuenta de Huapango de rol `user`. Anotar equipo, usuario MySQL e IP en el checklist. Si una IP cambia durante el ensayo, revisar la cuenta autorizada y el destino de conexión.

## Registros simultáneos y comprobación

1. Asignar a cada operador rangos de IDs libres para pareja, registro de categoría y registro de estilo. Consultar las tres tablas para confirmar disponibilidad.
2. Hacer un registro desde una estación y comprobarlo en Workbench de la laptop servidor.
3. Hacer una ronda con dos estaciones pulsando Registrar a una señal, usando IDs distintos.
4. Incorporar las demás y hacer tres rondas simultáneas, con una pareja nueva por estación y ronda. Cinco estaciones y tres rondas producen un objetivo de **15 parejas nuevas**, además de las pruebas iniciales.
5. Anotar el ID y el resultado de cada operación. Confirmar en Workbench cada registro anunciado como exitoso. Consultar también desde una estación una pareja capturada por otra.

```sql
USE bdhuapango2026;

SELECT
    p.nParejaID AS id_pareja,
    CONCAT_WS(' ', p.cNombre, p.cApellido) AS participante_1,
    CONCAT_WS(' ', p.cNombreM, p.cApellidoM) AS participante_2,
    c.cCategoriaNombre AS categoria,
    e.cEstiloNombre AS estilo
FROM t_participantes AS p
LEFT JOIN t_categorias AS c ON c.nParejaID = p.nParejaID
LEFT JOIN t_estilos AS e ON e.nParejaID = p.nParejaID
ORDER BY p.nParejaID DESC;
```

Volver a ejecutar la consulta después de cada ronda. Comparar los IDs y las asignaciones con la lista del equipo. Cada registro confirmado debe aparecer una sola vez y con los datos esperados.

Si la aplicación avisa de un fallo o una confirmación incierta, buscar primero el ID antes de reintentar. Consultar también el [checklist de validaciones 1.0.1](checklist-validaciones-1.0.1.md) para probar nombres, IDs y borradores.

## Cierre y alternativa de red

Exportar la base de ensayo desde la laptop servidor al terminar y guardar el checklist completado. Los registros creados durante esta prueba pertenecen a esa copia de la base. Su incorporación a otra instalación requiere una decisión y un procedimiento posterior.

Si la red universitaria restringe la comunicación entre clientes, coordinar con el recinto el uso del TP-Link del equipo. Al cambiar de red, repetir la identificación de IP, la autorización MySQL y la prueba del puerto. Con el router propio, realizar también un ensayo con su puerto WAN desconectado para comprobar la operación local sin Internet.

## Referencias

- [Exportación e importación SQL en MySQL Workbench](https://dev.mysql.com/doc/workbench/en/wb-admin-export-import-management.html)
- [Test-NetConnection de Microsoft](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection)

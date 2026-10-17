# F0-08 · Conexión y exclusión de operaciones

Fecha: 14-10-2026. Base: fd1b0da. Hallazgos: C2, H4, M2.

## Defecto y criterio

Un cambio de pool entre SQL y limpieza de fotografías podía consultar otra base.
La cola era ilimitada y una consulta podía no terminar. Se requiere impedir el
cambio durante todo el handler, incluida lectura de sesión, preparación y limpieza
de archivos, no solo durante una sentencia SQL.

## Cambios

- `Servicios/operaciones.js`: reserva de operación y cambio excluyente; la
  reentrada solo funciona dentro del mismo contexto asíncrono.
- `main.js`, `db.js`, `configController.js`: mantienen la reserva hasta resolver
  la promesa. Rechazo `CONFIGURATION_BUSY` antes de cambiar configuración/pool.
- Pool: 10 conexiones, cola 20, espera de conexión 5 s, comando 30 s.
  Una conexión tardía se libera; un comando vencido descarta su conexión y devuelve
  resultado incierto, sin reintentar escrituras automáticamente.
- Configuración y GUI: remoto exige TLS con CA verificable e identidad del
  servidor; usa nombre DNS, no IP para ese modo. Loopback admite configuración
  local anterior. El usuario confirmó una sola PC.

## Evidencia y autoevaluación

`tests/conexionSegura.test.cjs` prueba reserva durante limpieza posterior, rechazo
de otra cadena, liberación ante error, TLS, cola y conexiones perdidas/vencidas.
`tests/integridadParejas.test.cjs` conserva fallos de COMMIT/rollback y aislamiento.
La integración MySQL real se ejecuta con dos bases temporales independientes.

El timeout de comando es una decisión conservadora: perder la respuesta no
demuestra que una escritura haya sido revertida. El test de TLS valida opciones
y rechazos de configuración; no acredita certificados de un servidor remoto.
No se cambiaron credenciales ni el servicio MySQL existente.

Referencia: [MySQL2 TLS](https://sidorares.github.io/node-mysql2/docs/documentation/ssl).

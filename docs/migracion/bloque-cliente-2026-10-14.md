# F0-09 · Frontera del cliente y borradores

Fecha: 14-10-2026. Hallazgos: M1, M5, M6, M10, L2, L3; integración con M7.

Corrección posterior: [F0-14 del 16 de octubre](bloque-paridad-visual-2026-10-16.md)
sustituye la decisión de fuentes del sistema y preload=none por fuentes originales
locales, portada y metadatos. El texto de abajo conserva la evidencia histórica
del cambio que originó las diferencias reportadas por el usuario.

## Defecto y cambios

- Todas las vistas declaran CSP antes de los recursos. Scripts solo del proyecto,
  sin scripts/eventos inline, conexiones de red, objetos ni frames. Se conservan
  estilos inline existentes; no equivale a una CSP sin excepciones.
- Fuentes del sistema sustituyen imports remotos. El video usa preload=none;
  su tamaño original todavía forma parte del paquete.
- `domHelpers.js` crea nodos y texto, sin interpretar HTML de datos o errores.
- Borradores: esquema de claves conocido, campos de texto de hasta 2048 caracteres,
  total 16 KiB; fotos de hasta 5 MiB cada una (dos en registro, cuatro en modificación).
  Rechazo sin reemplazar el borrador anterior. El límite sucede después de la
  clonación inicial IPC, no evita ese coste del transporte.
- `borradores.js`: una escritura activa y solo la última instantánea pendiente.
  Las fotografías confirmadas se omiten de envíos posteriores; null elimina una
  selección. Al navegar se espera la última escritura.
- `preload.receive` devuelve cancelación idempotente y oculta el evento Electron.
- Administración conserva contraseñas sin trim y admite IDs alfanuméricos.
- Modificación consulta y conserva versionEdicion; conflicto preserva ediciones y
  exige consultar de nuevo. Cambiar ID invalida el token; volver al módulo lo recupera.

## Evidencia y autoevaluación

Pruebas de `clienteLimites`, `registroParejas`, `borradorModificacion`, `avisos`,
`nombresUsuario` y `configuracionVista`: coalescencia de 1000 ediciones, límites,
rechazos, cancelación y conservación de datos. Smoke Electron real correcto con
preload, login y navegación. SQL simulado en ese smoke.

Los borradores continúan siendo de memoria y por ventana: cerrar la aplicación
los pierde. Las vistas lo indican; esto no cierra M8 ni acredita restauración tras
un apagón. El ensayo visual y las fotos en Electron instalado siguen pendientes.

Referencia: [Seguridad de Electron](https://www.electronjs.org/docs/latest/tutorial/security).

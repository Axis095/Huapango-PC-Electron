# Checkpoint de avance — Fase 0

Fecha: 14 de octubre de 2026 (America/Mexico_City).
Rama: RefactorizacionTest-RC.
Estado: avance parcial guardado en Git; Fase 0 abierta, Fase 1 no iniciada.
Mensaje del commit: `chore: guardar avance auditado de fase 0`.

## Alcance del punto de retorno

- Autenticación que deniega contraseñas almacenadas inválidas, valida hashes
  bcrypt y conserva temporalmente la compatibilidad con texto plano.
- Alta de usuarios con bcrypt asíncrono y límite de 72 bytes UTF-8.
- Matriz IPC centralizada, validación de emisor/frame/ventana, navegación limitada
  y validación de datos en la frontera.
- Operador autorizado para completar inscripción con categoría y estilo.
- Evaluaciones solo de juez/admin; autor obtenido desde sesión.
- Corrección del require roto tras el merge y opciones explícitas de ventanas.
- Login compatible con IDs numéricos recibidos como texto, conservando su valor.
  El usuario confirmó VARCHAR(50) y login exitoso de admin3 en su BD.
- Pruebas de seguridad, carga del grafo local y smoke de Electron aislado.
- Guía de primera instalación, bitácora, inventario IPC y ensayo manual pendiente.

Las transacciones y el servicio de fotos introducidos por el merge previo se
conservan. Este checkpoint no los presenta como nuevas modificaciones propias.

## Dependencias al guardar

El usuario ejecutó npm audit fix --force, que cambió electron-builder de 26.15.3
a 26.5.0. package.json declara ^26.5.0 y el lockfile fija esa instalación.
El reporte aportado por el usuario señala ocho paquetes high y uno critical.
No equivale a nueve fallos independientes ni prueba explotación de la aplicación.

Por instrucción explícita del usuario, la remediación de estos avisos se aplaza
para guardar el estado actual. Se incluye el lockfile actual, sin restaurar la
versión anterior ni aplicar nuevos cambios de dependencias.
La verificación del 12 de octubre con 26.15.3 se conserva como evidencia histórica;
no acredita el empaquetador 26.5.0 ni el estado de avisos de este checkpoint.

## Pendientes de la auditoría 360°

Estos identificadores corresponden al reporte entregado en el chat; son
diagnósticos y recomendaciones, no cambios implementados ni riesgos cerrados.

| ID | Pendiente | Ubicación principal |
| --- | --- | --- |
| C1 | Definir confianza de estaciones y frontera RBAC con MySQL directo | db.js; Modelos/configModel.js |
| C2 | Coordinar cambio de base con escrituras y limpieza de fotos en vuelo | main.js; db.js; Modelos/parejaModel.js |
| H1 | Contrato para IDs alfanuméricos existentes como U001 | Controladores/authController.js; Seguridad/datos.js |
| H2 | Revocación de sesiones y protección de continuidad administrativa | Modelos/sesionModel.js; Controladores/adminController.js |
| H3 | Retiro de contraseñas heredadas en texto plano | Controladores/authController.js |
| H4 | TLS y verificación de servidor para MySQL remoto | db.js |
| H5 | Versionar esquema real y reconciliar contratos/columnas | Modelos; docs/guia-primera-instalacion.md |
| H6 | Idempotencia y regla de reevaluación | Modelos/evaluacionesModel.js |
| H7 | Unicidad y concurrencia de categorías/estilos | Controladores y Modelos de categoría/estilo |
| H8 | Integración real con MySQL, ensayo visual e instalador | tests; scripts/smoke-fase0.cjs |
| M1 | CSP y utilidades de HTML inseguro sin consumidores detectados | Vistas/login.html; Public/js/domHelpers.js |
| M2 | Capacidad de cola y tiempos de consulta | db.js |
| M3 | Paginación y reportes por lotes | Modelos/parejaModel.js; Modelos/pdfModel.js |
| M4 | Medir y aislar tareas pesadas en Main | Modelos/almacenFotos.js; Modelos/pdfModel.js |
| M5 | Límites de tamaño/estructura de borradores IPC | Controladores/borradorRegistroController.js; borradorModificacionController.js |
| M6 | Reducir copias de fotos y cola de guardado por edición | Public/js/registroParejas.js; borradorModificacion.js |
| M7 | Conflictos de edición entre estaciones | Modelos/parejaModel.js |
| M8 | Recuperación durable y reconciliación de fotos | Controladores de borradores; Modelos/almacenFotos.js |
| M9 | Límites de intentos de login e inactividad | Controladores/authController.js |
| M10 | Normalización/validaciones consistentes | Public/js/render.js; Modelos/adminModel.js; Seguridad/datos.js |
| M11 | Separación de servicios y controladores de vista | main.js; Public/js/render.js |
| M12 | Errores públicos y auditoría operativa coherentes | Controladores; Modelos/pdfModel.js |
| M13 | Escritura segura y apertura de PDF | Modelos/pdfModel.js; Controladores/pdfController.js |
| M14 | Cadena de dependencias del empaquetador | package.json; package-lock.json |
| L1 | Herramientas directas, build reproducible y CI | package.json |
| L2 | API específica y suscripciones cancelables | preload.js |
| L3 | Fuentes locales y optimización de recursos | Public/css; Public/images |

## Criterios para continuar

Verificación antes de guardar: `npm.cmd test` fuera del sandbox, **188/188**
correctas, cero fallos, 676.308 ms. `git diff --check` sin errores. No se ejecutó
build ni una nueva prueba de instalador sobre las dependencias modificadas.

El commit guarda trabajo, no certifica producción. La siguiente intervención
debe empezar con el estado de este checkpoint y un bloque acotado de auditoría,
con reproducción, modificación, regresión y autoevaluación registradas.

No se escribe en datos reales ni se avanza a Fase 1 hasta resolver los bloqueantes
y documentar el ensayo funcional que corresponde. No hay una base de pruebas
separada confirmada; el ensayo manual continúa pendiente.

La revisión de archivos antes del commit no incluye node_modules, perfiles .tmp,
credenciales locales ni nuevos datos personales. No se realiza push en este paso.

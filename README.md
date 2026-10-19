# Huapango-PC-Electron
Respaldo de la aplicación de huapango desarrollada en ELECTRON.

Para preparar el equipo, crear una base de pruebas, insertar usuarios y generar
el instalador, consultar la [guía de primera instalación](docs/guia-primera-instalacion.md).

El progreso de la refactorización y sus verificaciones se registran en
[el control de migración](docs/migracion/README.md).

## Compilación gradual · Fase 1

La primera entrega permite comprobar un árbol compilado conservando las vistas
actuales. Desde la raíz en PowerShell, después de instalar dependencias:

```powershell
npm.cmd run compile:main
npm.cmd run typecheck
npm.cmd run start:compiled
```

La salida está en `build/app`; `npm.cmd start` continúa abriendo las fuentes.
Ambas entradas usan la configuración local de la aplicación. El smoke usa un
perfil temporal y SQL simulado; los detalles y límites están en la
[bitácora de Fase 1](docs/migracion/fase-1.md). Vite está instalado; la integración
de su servidor y la salida multipágina corresponde a la siguiente entrega.

## Trabajo con Codex

Las instrucciones compartidas del proyecto están en [AGENTS.md](AGENTS.md), en
la raíz del repositorio. Mantenerlo versionado permite que acompañe al código.
Contiene el mapa del proyecto, comandos de verificación y criterios de trabajo;
el avance y las decisiones se mantienen en `docs/migracion/`.

Al iniciar un chat nuevo de Codex en este proyecto, puedes comprobar el contexto
con: «Resume las instrucciones de AGENTS.md y el estado de la migración; indica
qué documentos consultaste antes de continuar con [tarea]».

Al terminar un bloque, pide: «Actualiza la bitácora con los cambios, las pruebas
ejecutadas, los pendientes y el siguiente paso». Actualiza `AGENTS.md` cuando
cambien las reglas estables, la arquitectura o los comandos, sin copiar allí
todo el historial de conversaciones.

## Trabajo realizado en esta base funcional

Esta rama reúne la estabilización de Fase 0 y la primera entrega de Fase 1
(F1-01/02), contenidas en el candidato `2e913c3`. El trabajo se centró en reforzar
la seguridad y la confiabilidad de la aplicación, conservando sus flujos de
registro, administración, evaluación y reportes.

### Estabilización de Fase 0

- **Acceso y sesiones:** validación de usuarios y contraseñas, altas con bcrypt,
  migración de credenciales heredadas al autenticar, límites de intentos y
  vencimiento por inactividad. Se conservaron los identificadores de texto y se
  añadió revocación por baja de cuenta o cambio de rol/contraseña, junto con
  protección contra la eliminación del propio administrador o del último admin.
- **Permisos e interfaz:** controles por rol, canal IPC, vista y frame emisor;
  restricciones de navegación y configuración; CSP y creación segura de contenido
  del DOM. El operador puede completar categoría y estilo, mientras que la
  evaluación corresponde al juez y al administrador.
- **Conexión e integridad:** coordinación de operaciones para impedir cambios de
  conexión durante una escritura, límites de espera y validación de TLS remoto.
  Se reforzaron transacciones, asignaciones concurrentes, detección de conflictos
  de edición y evaluación definitiva con reenvío idempotente.
- **Formularios, fotografías y borradores:** validación de datos y archivos,
  conservación de campos ante errores, borradores por ventana y envío ordenado de
  cambios y fotos. Se corrigieron recorridos de arranque, reingreso y confirmación
  de salida desde la pantalla de evaluación.
- **Errores, reportes y presentación:** mensajes sin detalles privados de SQL,
  escritura de PDF mediante archivo temporal y renombrado al completar, fuentes
  originales locales y portada del video con pausa inicial y reproducción manual.
- **Pruebas y trazabilidad:** regresiones de seguridad y comportamiento, smoke
  con Electron real, laboratorio MySQL desechable y scripts SQL de esquema,
  diagnóstico e índices propuestos. Se documentaron hallazgos, evidencia y deuda
  sin aplicar cambios de esquema sobre la base del evento.

### Primera entrega de Fase 1

Se incorporaron TypeScript, Vite y tipos de Node como herramientas de desarrollo,
con una entrada Main TypeScript que conserva los módulos CommonJS existentes.
`compile:main` genera un árbol de ensayo en `build/app`, separado de `dist`,
manteniendo preload, vistas, recursos y rutas. El chequeo de tipos se aplica a
las entradas configuradas; los contratos del JavaScript heredado siguen pendientes.
En este punto Vite está instalado, pero su servidor, compilación multipágina y
distribución desde la salida compilada corresponden a entregas posteriores.

### Evidencia y alcance alcanzado

Las bitácoras de esta base registran **245/245 pruebas de regresión**, chequeo de
tipos, smoke de fuentes y compilado, y laboratorio MySQL con Node y Electron,
incluidas fotos y PDF con datos ficticios. Son resultados históricos del trabajo
documentado; redactar este resumen no supone volver a ejecutar esas pruebas.

El resultado fue el **cierre técnico acotado de Fase 0 y el inicio de Fase 1**.
Quedaron pendientes la aceptación manual/operativa completa, instalación y
actualización, historial y reporte general, recuperación durable de borradores
y mediciones de capacidad. Los borradores de esta base permanecen en memoria.
El alcance y la deuda se detallan en el [control de cierre de Fase 0](docs/migracion/cierre-fase-0.md)
y la [bitácora de Fase 1](docs/migracion/fase-1.md).

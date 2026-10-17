# Preparación de Fase 1 — Compilación conservando la aplicación

Fecha: 17 de octubre de 2026. Estado: **en curso, primera entrega verificada**;
evidencia actual en la [bitácora](fase-1.md). Consultar la [evaluación vigente](evaluacion-transicion-2026-10-17.md)
y el [control de cierre](cierre-fase-0.md).

## Objetivo y fronteras

Añadir TypeScript y Vite, compilar Main/preload y servir/empaquetar las vistas
HTML existentes conservando roles, navegación, formularios, fotos, reportes y
apariencia. No rediseñar ni migrar vistas a React en esta fase. Los contratos
integrales corresponden a Fase 2 y la sustitución de vistas a Fase 3.

El plan V2 externo se usa como referencia histórica, no como instrucción para
iniciar cambios. Necesita estas precisiones basadas en el código actual:

- No hay `electron-builder.yml`: la configuración vigente está en `package.json`.
- `dist` ya contiene la distribución y `clean` lo elimina. Deben distinguirse
  salidas del compilador y del empaquetador para evitar borrados/inclusiones cruzadas.
- Hay varias vistas y ventanas; una única entrada `dist/renderer/index.html` no
  conserva por sí misma los flujos actuales. Primero se necesita salida multipágina.
- `Seguridad/ipc.js:crearSeguridadIPC` reconoce archivos exactos bajo `Vistas`;
  HTTP de Vite se rechazaría. Los dos controladores de borrador también validan
  rutas `file://` por separado. No basta con modificar `loadFile` en Main.
- `main.js` resuelve preload, vistas y configuración desde `__dirname`; mover
  el ejecutable compilado obliga a revisar cada ruta y los recursos dependientes.
- Resultados permite **guardar evaluaciones**. Su futura migración requiere
  autoría, permisos, inmutabilidad e idempotencia, además de consultas.
- Categorías/estilos no constituyen hoy un CRUD completo: dos actualizaciones
  están suspendidas. El compilador no debe habilitarlas indirectamente.

## Entrada obligatoria

Desde F0-17 se usa la ruta mínima del [control de cierre](cierre-fase-0.md):
referencia `98331dc`, pase crítico consolidado con resultado registrado y deuda
con destino explícito. Resolver cualquier fallo nuevo de permisos, guardado o
integridad antes de avanzar. Las funciones aplazadas no se consideran terminadas.
La instalación/actualización completa se verifica en F1-05/06 con el paquete
compilado. Conservar comparación visual a igual resolución/escala/zoom, recursos
offline y copia recuperable del candidato. Los commits posteriores requieren su
instrucción correspondiente.

## Ejecución por bloques pequeños

Para reducir procesos, ejecutar en **tres entregas**, conservando los IDs de la
tabla para trazabilidad: (1) F1-01/02 inventario y compilación; (2) F1-03/04 rutas,
seguridad y multipágina; (3) F1-05/06 distribución y validación final. Una bitácora
de Fase 1 basta para las tres entregas; repetir checks por cambios o fallos,
sin crear un informe separado por cada tarea.

| Bloque | Trabajo | Aceptación antes de continuar |
| --- | --- | --- |
| F1-01 Inventario y diseño | Enumerar entradas activas, ventanas, consumidores IPC, rutas y recursos; decidir salidas separadas, estrategia CommonJS/ESM y tipado gradual. | Documento de rutas desarrollo/producción y matriz de flujos; sin renombrado masivo ni cambios visuales. |
| F1-02 Dependencias y compilación Main/preload | Elegir versiones compatibles con Node/Electron del proyecto y fijarlas en lockfile; añadir TS/Vite/tipos y configurar compilación incremental. React solo como preparación si lo requiere el plan acordado. | Instalación reproducible, compilación/typecheck, runtime sin módulos faltantes, preload aislado y API vigente. No actualizar paquetes ajenos por arrastre. |
| F1-03 Resolución de vistas y seguridad | Centralizar identificación de vista confiable en Main/IPC/borradores; distinguir desarrollo y paquete. | Rechazo de origen ajeno, subframe, archivo externo y vista no permitida; roles/revocación/configuración conservados en ambos modos. |
| F1-04 Renderer multipágina | Configurar Vite para todas las entradas activas; adaptar importaciones, navegación relativa, CSS y assets. | Login, menú, registro, modificación, búsqueda, categorías/estilos, resultados, administración y configuración operativos; ventanas auxiliares y borradores intactos. |
| F1-05 Distribución compilada | Actualizar entrada Electron y allowlist del paquete; separar outputs y limpiar solo lo generado. | ASAR contiene código/recursos necesarios, excluye secretos/datos/tests; funciona sin servidor de desarrollo ni árbol de fuentes. |
| F1-06 Comparación y cierre | Ejecutar regresión, integración pertinente, smoke desarrollo/producción, comparación visual y ensayo de instalación/actualización. | Evidencias ligadas a candidato, diferencias explicadas y aprobadas; sin regresiones de Fase 0; acta antes de abrir Fase 2. |

Avance F1-01/02: compilación de ensayo y typecheck correctos, entrada Main
TypeScript y preload JavaScript emitido; smoke del árbol compilado correcto.
Vite instalado, aún sin conectar servidor ni multipágina. No confundir esta
entrega con el pipeline completo o con contratos ya tipados.

### Decisiones técnicas que deben quedar verificadas

1. **Formato de módulos.** Conservar inicialmente compatibilidad con los módulos
   CommonJS actuales; comprobar Electron/preload, imports de mysql2/pdfkit y carga
   de assets. No introducir un cambio global de formato sin prueba del paquete.
2. **Tipos graduales.** Definir qué código se compila y qué JavaScript convive
   temporalmente. No usar `any` generalizado o apagar comprobaciones para declarar
   completada la migración. Compilar no reemplaza validar datos en ejecución.
3. **Origen de desarrollo.** Permitir únicamente el origen exacto del servidor
   iniciado para desarrollo, con catálogo explícito de vistas y emisor principal.
   El paquete no debe aceptar URLs de desarrollo, aunque exista una variable de
   entorno. Mantener `nodeIntegration: false`, `contextIsolation: true`, RBAC y
   restricciones de navegación. No ampliar permisos a cualquier localhost.
4. **CSP y recursos.** Si desarrollo requiere conexiones para recarga, limitarlas
   a ese modo/origen; producción mantiene recursos locales. Probar fuentes,
   poster, video, imágenes, estilos y PDFs con red bloqueada.
5. **Datos mutables.** Configuración y fotos siguen en su ubicación de datos;
   no moverlos al ASAR ni copiarlos como recursos. Instalar/actualizar no debe
   reemplazar datos del usuario.
6. **Harness.** Adaptar tests a las rutas compiladas sin simular la frontera que
   se pretende verificar. Smoke actual supone URLs de archivo y requiere versión
   específica para desarrollo. Mantener casos negativos y controles de ventanas.

Las versiones concretas, opciones de Vite/TS y comandos nuevos se verifican con
documentación oficial y un piloto al ejecutar F1-01/F1-02. No se anuncian aquí
comandos inexistentes como si ya estuvieran disponibles.

## Matriz mínima de paridad

| Área | Qué debe conservarse en desarrollo y paquete |
| --- | --- |
| Acceso/sesión | Roles, IDs VARCHAR, login fallido, bloqueo de intentos, inactividad, reingreso y salida confirmada/cancelada. |
| Navegación | Rutas permitidas, ventanas auxiliares, foco, volver al menú y borradores por ventana. |
| Escrituras | Altas y duplicados, fotos, asignaciones, conflicto de edición, evaluación definitiva y autor autenticado. |
| Fallos | Validación en Main, errores comprensibles, campos conservados, SQL incierto sin reintentos automáticos. |
| Presentación | Tipografía, dimensiones, scroll, portada/video pausado y play; comparación a igual entorno y sin red. |
| Operación | Primer arranque, configuración protegida, reportes aprobados, instalación y actualización preservando datos. |

## Retroceso y autoevaluación

Cada bloque documenta defecto/necesidad, alcance, archivos afectados, evidencia y
límites antes de avanzar. Mantener el candidato anterior recuperable y no hacer
cambios de esquema por introducir compilación. Si falla paridad, corregir el
bloque o volver al candidato de Fase 0 conservando datos; no retirar legado antes
de probar al sustituto. Revisar compatibilidad de configuración y datos antes
de ejecutar cualquier vuelta a una versión previa.

Al terminar: actualizar README, comandos/mapa de AGENTS e índice de migración con
lo realmente implementado. Los cinco pasos del plan original de Fase 0 y el
documento de traspaso antiguo no sustituyen las puertas ampliadas por el usuario.

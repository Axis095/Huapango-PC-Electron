# Huapango-PC-Electron
Respaldo de la aplicación de huapango desarrollada en ELECTRON.

Para preparar el equipo, crear una base de pruebas, insertar usuarios y generar
el instalador, consultar la [guía de primera instalación](docs/guia-primera-instalacion.md).

El progreso de la refactorización y sus verificaciones se registran en
[el control de migración](docs/migracion/README.md).

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

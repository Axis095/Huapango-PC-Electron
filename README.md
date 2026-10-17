# Huapango-PC-Electron
Respaldo de la aplicación de huapango desarrollada en ELECTRON.

Para preparar el equipo, crear una base de pruebas, insertar usuarios y generar
el instalador, consultar la [guía de primera instalación](docs/guia-primera-instalacion.md).

El progreso de la refactorización y sus verificaciones se registran en
[el control de migración](docs/migracion/README.md).

## Compilación gradual · Fase 1

Desde la raíz en PowerShell, después de instalar dependencias:

```powershell
npm.cmd run compile
npm.cmd run typecheck
npm.cmd run start:compiled
```

`compile` genera Main y las diez vistas con Vite en `build/app`; `compile:main`
solo prepara Main con recursos sin procesar. `npm.cmd start` abre las fuentes.
`npm.cmd run dev` inicia Vite en 127.0.0.1:5173 y Electron; termina ambos al salir.
Usar la ventana de Electron que abre el comando: aparecerá login o configuración
según el perfil. La dirección HTTP es interna; abrir `/` devuelve 404 por diseño.
Un navegador normal tampoco tiene la API del preload para operar el sistema.
La consola confirma `VITE_DETENIDO` al terminar el servidor.
Reiniciar dev tras cambiar Main; los recursos de interfaz tienen recarga de Vite.
Estas entradas usan la configuración local de la aplicación.

`npm.cmd run test:smoke` prueba fuentes y `npm.cmd run test:smoke:dev` prueba Vite,
con perfil temporal y SQL simulado. Evidencia, comparación del compilado y
limitaciones en la [bitácora de Fase 1](docs/migracion/fase-1.md).
La distribución aún usa la entrada anterior; su adaptación es F1-05/06.

Para comparar automáticamente login/menú contra capturas de fuentes, indicar el
perfil de un smoke de fuentes (ruta `CAPTURAS_VISUALES`) que contenga `login-presentacion.json` y
`menu-presentacion.json`. Por ejemplo, en PowerShell:

```powershell
$env:HUAPANGO_SMOKE_REFERENCIA = 'RUTA_ABSOLUTA_AL_PERFIL_DE_REFERENCIA'
try { npm.cmd run test:smoke:dev }
finally { Remove-Item Env:HUAPANGO_SMOKE_REFERENCIA }
```

Debe imprimir `PARIDAD_OK: login` y `PARIDAD_OK: menu`. Sin referencia, el smoke
comprueba fuentes/video y genera capturas, pero no acredita esa comparación.

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

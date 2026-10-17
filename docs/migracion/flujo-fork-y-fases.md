# Organización del fork y promoción de las fases de migración

Fecha de preparación: 17 de octubre de 2026.
Estado: procedimiento documentado; adopción en curso según el [registro operativo](#13-adopción-del-flujo--17-de-octubre-de-2026).
La preparación original no ejecutó comandos; las acciones posteriores se registran
por separado, sin convertir publicación ni pruebas parciales en aceptación.

## 1. Objetivo y referencias

Mantener `main` del fork como versión funcional aceptada. Desarrollar y probar
cada fase en una rama independiente; incorporarla a `main` mediante PR después
de cumplir su aceptación. Proponer posteriormente el resultado al repositorio
original, con revisión independiente de sus mantenedores.

Esta guía complementa el [índice de migración](README.md), el
[control de cierre](cierre-fase-0.md), el [plan de Fase 1](plan-fase-1.md) y su
[bitácora](fase-1.md). Las puertas de salida y decisiones vigentes prevalecen
sobre los ejemplos de nombres y comandos de esta guía.

### Fotografía de partida

Referencias confirmadas en la revisión anterior de esta conversación y
contrastadas con el estado local al preparar el documento:

| Elemento | Referencia | Significado |
| --- | --- | --- |
| Fork (`origin`) | `cazarau/Huapango-PC-Electron-refactorizacion` | Destino de publicación propio. |
| Original (`upstream`) | `Axis095/Huapango-PC-Electron` | Fuente de cambios y destino de un PR futuro. Su push local está deshabilitado. |
| `origin/main` y `upstream/main` | `7de3b2e` | Base principal publicada en ese momento. |
| `RefactorizacionTest-RC` y su rama remota | `2e913c3` | Último commit publicado de refactorización; candidato a nueva base del fork. |
| Árbol de trabajo | F1-03/04 sin commit | Vite, rutas compartidas, borradores, pruebas y documentación; incluye corrección de ventana oculta. |

`2e913c3` ya contiene F1-01/02: preparación TypeScript y compilación gradual.
No es una versión anterior a toda la migración. La intención es aceptar ese
commit como base funcional y mantener aparte los cambios posteriores de Vite.
Su condición de publicado no sustituye la validación funcional pendiente.

Antes de seguir, volver a consultar GitHub mediante `fetch`; los hashes de esta
tabla son una fotografía, no valores que deban imponerse sobre nuevas ramas.

## 2. Estructura de ramas y carpetas

```text
upstream/main                  repositorio original
        |
origin/main                    versión funcional aceptada del fork
        |
        +-- codex/fase-1-vite   integración actual, revisada por PR
        |
        +-- codex/fase-2-...    se crea después, desde main actualizado
        |
        +-- codex/fase-3-...    bloques de vistas, con aceptación por bloque
```

Primero habrá un PR especial `codex/base-funcional-2e913c3 -> main` para promover
solo el último commit publicado y sus antecedentes. Después habrá otro PR
`codex/fase-1-vite -> main` para la integración. No mezclar ambos alcances.

| Rama | Regla |
| --- | --- |
| `main` | Recibe cambios revisados y aceptados; no desarrollar directamente aquí. |
| `codex/fase-N-descripcion` | Rama de la fase o entrega actual; puede contener trabajo todavía no aceptado. |
| `codex/fix-descripcion` | Corrección urgente desde `origin/main`; se reintegra después a la fase activa. |
| `RefactorizacionTest-RC` | Conservar como referencia histórica mientras se adopta este flujo. |

Para trabajar sin cambiar de rama en la misma carpeta, usar worktrees:

```text
Huapango-PC-Electron/             integración actual
Huapango-PC-Electron-base/        candidato 2e913c3
Huapango-PC-Electron-main/        main del fork
```

Los worktrees comparten objetos Git, ramas y remotos; tienen archivos y
`node_modules` separados. No son copias de seguridad independientes.
Una rama no puede estar abierta simultáneamente en dos worktrees.

**Aislamiento de datos:** otra carpeta o rama no crea otro perfil Electron.
Las ejecuciones normales pueden compartir `userData`, configuración y fotos.
Usar una cuenta Windows de laboratorio o un mecanismo de perfil aislado
verificado, con MySQL de pruebas. No asumir que existe una variable de perfil
de la aplicación. El smoke sí prepara su propio perfil temporal y SQL simulado.

## 3. Cómo ejecutar los ejemplos

Todos los comandos son para PowerShell. Ejecutar un bloque por vez, leer su
resultado y detenerse ante un error. Un fallo nativo no siempre detiene un bloque
PowerShell: comprobar `$LASTEXITCODE` inmediatamente después del comando.
No continuar un merge, commit, push o promoción con errores anteriores pendientes.

Los nombres `N`, `BLOQUE`, `SHA_ACEPTADO`, `NUMERO_PR` y `SHA_MERGE` son marcadores
que deben sustituirse; no pegarlos literalmente. Las rutas siguientes son
ejemplos concretos que se pueden ajustar antes de crear carpetas.

En cada terminal nueva, definir las rutas necesarias:

```powershell
$Repo = 'C:\Users\raulc\Documents\HuapangoAntigravity\Huapango-PC-Electron'
$Base = 'C:\Users\raulc\Documents\HuapangoAntigravity\Huapango-PC-Electron-base'
$Estable = 'C:\Users\raulc\Documents\HuapangoAntigravity\Huapango-PC-Electron-main'
Set-Location -LiteralPath $Repo
```

No usar `reset --hard`, `clean -fd`, push forzado ni eliminación de ramas como
parte de este procedimiento. No ejecutar simultáneamente otros cambios Git
desde el otro chat. Coordinar quién modifica cada carpeta.

## 4. Conservar el trabajo actual y separar la integración

### 4.1. Inspeccionar sin cambiar los archivos

```powershell
git status --short
git branch -vv
git remote -v
git log -8 --oneline --decorate
git worktree list
git diff --stat
```

Confirmar la rama actual `RefactorizacionTest-RC` y su HEAD `2e913c3`.
Si difieren, revisar qué avanzó antes de ejecutar los ejemplos siguientes.
Revisar también archivos nuevos: `git diff` no muestra su contenido.

```powershell
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Falló fetch de origin.' }
git fetch upstream
if ($LASTEXITCODE -ne 0) { throw 'Falló fetch de upstream.' }
git branch -avv
```

`fetch` actualiza referencias remotas; no mezcla cambios en la carpeta actual.
Confirmar que los remotos siguen apuntando a los repositorios de la sección 1.

### 4.2. Crear la rama de Fase 1 conservando los cambios locales

Solo si no existe ya el nombre propuesto y se mantiene el estado anterior:

```powershell
git switch -c codex/fase-1-vite
if ($LASTEXITCODE -ne 0) { throw 'No se creó la rama; revisar el estado.' }
git status --short
```

Crear una rama desde el HEAD actual conserva los cambios sin commit. Verificar
que todos siguen presentes. No cambiar a `main` con ese árbol pendiente.
Si la rama ya existe, inspeccionarla: no borrarla ni recrearla automáticamente.

### 4.3. Preparar un commit revisable

Seleccionar cambios de archivos ya versionados:

```powershell
git add -p
```

Añadir explícitamente los archivos nuevos de esta entrega, revisados previamente:

```powershell
git add -- Seguridad/vistas.js Servicios/rutasVistas.js scripts/compilar-app.mjs scripts/desarrollo.mjs scripts/vite-recursos.cjs tests/rutasVistas.test.cjs vite.config.mjs
```

Esta guía también es nueva; incluirla si pertenece al commit que se prepara:

```powershell
git add -- docs/migracion/flujo-fork-y-fases.md
git diff --cached --stat
git diff --cached
git diff --cached --check
git status --short
```

Revisar coherencia del conjunto: si Main requiere el resolver nuevo, ambos deben
estar en el mismo candidato. Excluir configuración privada, fotos, logs,
`node_modules`, `.tmp`, `build` y `dist`. Evitar `git add .` sin inspección.
Un checkpoint puede guardar trabajo sin declararlo aprobado:

```powershell
git commit -m 'feat: integrar Vite multipagina y rutas compartidas'
if ($LASTEXITCODE -ne 0) { throw 'El commit no se creó.' }
git status --short
git rev-parse HEAD
git push -u origin codex/fase-1-vite
```

Publicar esta rama no la integra en `main`. Si se necesita visibilidad temprana,
abrir su PR como borrador y señalar aceptación pendiente. No marcar pruebas
como ejecutadas por crear el commit. Los comandos de esta sección solo se
ejecutan cuando se decida guardar/publicar el trabajo.

## 5. Validar y promover la base funcional publicada

### 5.1. Abrir exactamente el candidato, sin cambios locales de Vite

La carpeta `$Base` debe no existir. Desde `$Repo`:

```powershell
git worktree add -b codex/base-funcional-2e913c3 "$Base" 2e913c3
if ($LASTEXITCODE -ne 0) { throw 'No se creó el worktree de base.' }
git -C "$Base" status --short
git -C "$Base" rev-parse HEAD
git -C "$Base" diff --stat origin/main...HEAD
```

Debe mostrar un árbol limpio y el commit `2e913c3`. El PR incluye todos los
cambios de refactorización acumulados desde `main`, no solo F1-01/02.
Revisar ese alcance antes de promoverlo.

### 5.2. Validar esa base por sus comandos disponibles

```powershell
Set-Location -LiteralPath $Base
npm.cmd ci
if ($LASTEXITCODE -ne 0) { throw 'Falló la instalación reproducible.' }
npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Falló typecheck.' }
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw 'Falló la regresión.' }
npm.cmd run test:smoke
if ($LASTEXITCODE -ne 0) { throw 'Falló el smoke.' }
```

Completar la aceptación funcional de la sección 7 con datos de laboratorio.
En esta base `npm.cmd run dev` aún equivale a Electron; no existen los scripts
`compile` ni `test:smoke:dev` posteriores. Consultar siempre su `package.json`.
Registros de validación pueden guardarse en la bitácora de la rama de integración,
indicando expresamente el SHA de la base ensayada, para no alterar este candidato.

### 5.3. Abrir el PR de base en el fork

Después de aceptar el candidato:

```powershell
git push -u origin codex/base-funcional-2e913c3
```

En GitHub, abrir el fork y crear un PR con estos valores:

| Campo | Valor |
| --- | --- |
| Repositorio base | `cazarau/Huapango-PC-Electron-refactorizacion` |
| Rama base | `main` |
| Repositorio de origen | El mismo fork |
| Rama de origen | `codex/base-funcional-2e913c3` |

Describir alcance, commit probado, resultados, aceptación manual y deuda conocida.
Comprobar que el destino no es accidentalmente el repositorio original.
Revisar el diff del PR y fusionar cuando se apruebe. Usar **Create a merge commit**
para conservar la ascendencia de `2e913c3`; así la rama Vite no vuelve a presentar
como nuevos los commits de la base. Esta guía supone esa estrategia, sin squash.

### 5.4. Abrir y configurar el main funcional del fork

Cerrar aplicaciones de prueba. Si `main` ya está abierto en otro worktree,
usar esa carpeta. En caso contrario, desde `$Repo`:

```powershell
git fetch origin
git worktree add "$Estable" main
if ($LASTEXITCODE -ne 0) { throw 'No se abrió main; revisar worktrees.' }
git -C "$Estable" status --short
```

Continuar únicamente con ese árbol limpio. Actualmente `main` local sigue
`upstream/main`; cambiar su seguimiento al fork de forma explícita:

```powershell
git -C "$Estable" branch --set-upstream-to=origin/main main
git -C "$Estable" merge --ff-only origin/main
if ($LASTEXITCODE -ne 0) { throw 'Main diverge; revisar antes de continuar.' }
git -C "$Estable" log -3 --oneline --decorate
```

No forzar si `--ff-only` falla. Con el merge revisado y un pase pertinente sobre
el resultado de `main`, se puede marcar la versión aceptada:

```powershell
git -C "$Estable" tag -a estable-base-2026-10-17 -m 'Base funcional aceptada; ver evidencia de migracion'
git -C "$Estable" push origin estable-base-2026-10-17
```

La etiqueta se crea solo después de la aceptación, sobre el commit real de
`main`. Si ya existe, no moverla. Etiqueta, commit y evidencia deben coincidir.
Una etiqueta no publica un instalador ni garantiza estabilidad por sí misma.

## 6. Continuar Fase 1 sin cambiar la versión principal

Desde la carpeta de integración, con trabajo guardado y árbol limpio:

```powershell
Set-Location -LiteralPath $Repo
git switch codex/fase-1-vite
git fetch origin
git merge origin/main
```

Esto incorpora a la fase la base ya aceptada y cualquier corrección aprobada.
No modifica `main`. Si hay conflictos, revisar cada archivo, resolverlo y
seleccionar solo lo resuelto con `git add -- RUTA`. Después:

```powershell
git diff --cached
git merge --continue
```

Si no se puede resolver, con el merge iniciado desde un árbol limpio:

```powershell
git merge --abort
```

Tras sincronizar, repetir las pruebas afectadas y la regresión. Publicar el
avance con `git push origin codex/fase-1-vite`. Evitar rebase de esta rama
compartida y cualquier reescritura de historia publicada.

## 7. Puerta de aceptación de cada entrega

### 7.1. Evidencia mínima

Antes de promover, identificar un commit guardado y un árbol limpio:

```powershell
git status --short
git rev-parse HEAD
node --version
npm.cmd --version
```

Registrar en la bitácora de la fase:

| Campo | Contenido |
| --- | --- |
| Candidato | SHA completo y rama; diff respecto a `origin/main`. |
| Entorno | Windows, Node/npm, Electron, escala/zoom para comparación visual. |
| Automáticas | Comando, resultado, fecha y evidencia sanitizada. |
| Manuales | Caso, rol, modo, esperado, obtenido y captura si aporta información. |
| Pendientes | Fallo nuevo, defecto previo o deuda aceptada con destino. |
| Aceptación | Confirmación explícita del usuario para el alcance probado. |
| Distribución | SHA del código, versión, hash del instalador y ensayo instalado. |

Un cambio de código después de probar produce otro candidato: revalidar lo
afectado y la regresión. No afirmar que cifras históricas corresponden al SHA nuevo.

### 7.2. Comprobaciones de la Fase 1 actual

En la rama Vite, ejecutar secuencialmente y detenerse ante cada fallo:

```powershell
npm.cmd ls --depth=0
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:smoke
npm.cmd run test:smoke:dev
npm.cmd run compile
```

Esperado: cero fallos, `SMOKE_OK`, `RUTAS_OK`, `VITE_FRONTERA_OK` y diez vistas
compiladas. Para paridad, usar una referencia revisada del smoke de fuentes:

```powershell
$env:HUAPANGO_SMOKE_REFERENCIA = 'RUTA_ABSOLUTA_AL_PERFIL_CON_JSON_DE_REFERENCIA'
try {
    npm.cmd run test:smoke:dev
    if ($LASTEXITCODE -ne 0) { throw 'Falló smoke Vite con referencia.' }
    $env:HUAPANGO_SMOKE_APP_ROOT = Join-Path (Get-Location) 'build/app'
    npm.cmd run test:smoke
    if ($LASTEXITCODE -ne 0) { throw 'Falló smoke compilado con referencia.' }
}
finally {
    Remove-Item Env:HUAPANGO_SMOKE_APP_ROOT -ErrorAction SilentlyContinue
    Remove-Item Env:HUAPANGO_SMOKE_REFERENCIA -ErrorAction SilentlyContinue
}
```

Usar una terminal de pruebas sin valores previos de esas variables. La referencia
debe contener `login-presentacion.json` y `menu-presentacion.json`; el smoke de
fuentes imprime su ruta como `CAPTURAS_VISUALES`. Exigir `PARIDAD_OK` para ambas.
Comparar las demás vistas manualmente: esa comprobación automática no las cubre.

En laboratorio, según alcance y antes de aceptar el candidato final:

```powershell
npm.cmd run test:integration
```

Requiere `mysqld`; consultar la [guía de laboratorio](../guia-primera-instalacion.md).
Para fotos con decodificador real y MySQL juntos:

```powershell
& .\node_modules\.bin\electron.cmd scripts/integracion-fase0.cjs
```

Esperado: `MYSQL_INTEGRACION_OK`. Usa servidor/directorio/puerto temporales;
no deja preparada la base que utilizará el ensayo manual de la interfaz.

### 7.3. Aceptación funcional en fuentes, Vite y compilado

Abrir los modos uno por vez, con perfil y base de laboratorio:

```powershell
npm.cmd start
# Cerrar antes de abrir el siguiente modo.
npm.cmd run dev
# Cerrar y comprobar VITE_DETENIDO antes de continuar.
npm.cmd run start:compiled
```

| Grupo | Resultado que se debe conservar |
| --- | --- |
| Arranque y acceso | Ventana visible, conexión recuperable, tres roles y rechazo de contraseña incorrecta. |
| Navegación | Vistas autorizadas, auxiliares, foco, recarga y vuelta al menú. |
| Registro | Ambos participantes, dos fotos, categoría/estilo y consulta posterior coherente. |
| Borradores | Volver a la vista recupera texto/fotos durante la sesión; aislamiento entre ventanas. |
| Edición y errores | Guardado, sin cambios, conflicto y duplicado sin pérdida de campos ni doble escritura. |
| Evaluación | Autor de sesión, envío definitivo y reenvío idéntico sin duplicados. |
| Administración | Crear cuentas, ingresar con ellas y comprobar acciones prohibidas. |
| Reportes | PDF de parejas/resultados legibles y cancelación recuperable. |
| Sesión/configuración | Cancelar/confirmar salida, reingreso y restricciones de configuración. |
| Presentación | CSS, fuentes, fotos, scroll y video; mismas dimensiones/escala/zoom/rol que la referencia. |
| Sin internet | Recursos visuales locales; mantener accesible MySQL si reside en otro equipo. |

Usar nuevos datos ficticios por recorrido. Las evaluaciones definitivas y
duplicados intencionales pueden impedir reutilizar exactamente la misma ficha.
El 404 de `/` en Vite es esperado; usar Electron, no el navegador, para operar.
Los borradores actuales en memoria no prometen recuperación tras cerrar el proceso.
No habilitar actualizaciones suspendidas de categoría/estilo ni declarar resuelto
el reporte general para completar esta aceptación.

### 7.4. Distribución e instalación de F1-05/06

Actualmente `npm.cmd run build` empaqueta las fuentes anteriores. No acredita
Vite hasta adaptar y verificar que electron-builder consume `build/app`.
Después de implementar ese bloque y consultar sus comandos vigentes:

1. Compilar desde un checkout limpio del candidato con dependencias del lockfile.
2. Generar candidato local sin publicación automática; el comando actual admite
   `npm.cmd run build -- --win --x64 --publish never`, pero debe revisarse tras
   cambiar la configuración de distribución.
3. Inspeccionar ASAR: entrada compilada, preload, módulos y recursos necesarios;
   exclusión de credenciales, fotos personales, pruebas y temporales.
4. Ejecutar sin Vite ni dependencia del árbol fuente o `node_modules` del checkout.
5. Instalar en perfil Windows limpio y completar el recorrido crítico.
6. Actualizar una instalación base de laboratorio con datos ficticios y comprobar
   conservación de configuración, referencias SQL y fotos.
7. Registrar hash con `Get-FileHash -Algorithm SHA256 -LiteralPath 'RUTA_AL_INSTALADOR.exe'`.

Una compilación correcta no equivale a instalador correcto. Un build de
laboratorio que omite firma/edición del ejecutable no acredita el build normal.

## 8. Promover una fase al main del fork

Cuando la entrega esté aceptada, desde su rama limpia:

```powershell
git fetch origin
git merge origin/main
# Si incorpora cambios, volver a validar el resultado antes de publicar.
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
git push origin codex/fase-1-vite
```

Abrir PR **en el fork**, base `main`, origen `codex/fase-1-vite`. Confirmar que
solo contiene el delta de Fase 1; si reaparecen cambios de la base ya promovida,
revisar ascendencia y estrategia del merge anterior antes de fusionar.

Descripción mínima del PR:

```markdown
## Problema y comportamiento final
Qué se integra y qué comportamiento funcional se conserva.

## Candidato y validación
- Commit probado:
- Pruebas automáticas y evidencias:
- Recorrido manual y aceptación:
- Instalación/actualización, si aplica:

## Pendientes y recuperación
- Deuda conservada y destino:
- Referencia funcional anterior:
- Compatibilidad de configuración/SQL/fotos:
```

Fusionar mediante merge commit después de revisar y aceptar el resultado.
Si `main` cambió durante la revisión, integrar sus cambios y revalidar antes.
Actualizar el worktree estable con `fetch origin` y `merge --ff-only origin/main`;
comprobar el resultado fusionado antes de etiquetar. Una etiqueta de fase aceptada
podría llamarse `estable-fase-1-2026-10-17`, con la fecha real de aceptación.

En GitHub, configurar protección o ruleset para `main` si está disponible:
exigir PR y bloquear force-push/eliminación. Solo exigir checks que existan
realmente en CI; esta guía no crea workflows. Sin CI, registrar el pase local
ligado al candidato y aplicar la revisión manual de forma explícita.

## 9. Repetir el flujo en las siguientes fases

Crear la siguiente rama desde `origin/main` actualizado, nunca desde una fase
sin aceptar. Con la carpeta de integración limpia y la fase anterior incorporada:

```powershell
git fetch origin
git switch -c codex/fase-N-descripcion origin/main
```

| Fase | Alcance principal | Condición antes de promover |
| --- | --- | --- |
| 1 | TS gradual, Vite multipágina, rutas y distribución | Tres modos, paridad, paquete e instalación/actualización comprobados. |
| 2 | Contratos, API y validación en ejecución | Consumidores adaptados; permisos/datos/errores conservados; deuda asignada atendida según su puerta. |
| 3 | Migración por vistas | Aceptación funcional y visual por vista; capacidad medida antes de las vistas afectadas. |
| 4 | Retirada del legado y operación | Sustitutos probados, recursos necesarios conservados y ensayo instalado final. |

Si una fase es grande, dividirla en entregas funcionales completas con PR propio.
Aceptar una entrega no cierra la fase. Cada PR debe dejar `main` utilizable y
explicar lo que sigue pendiente. Actualizar el índice y control de cierre cuando
cambie el estado; no reescribir evidencias históricas como si fueran actuales.

### Correcciones urgentes

Crear `codex/fix-descripcion` desde `origin/main` en un worktree independiente,
corregir/probar y promover por PR al fork. Después incorporar `origin/main` a la
fase activa con merge y ejecutar la regresión. No llevar la fase incompleta a
`main` para resolver una corrección pequeña.

## 10. Incorporar novedades del original y proponer la refactorización

### 10.1. Actualizar el fork desde upstream

No hacer `pull upstream main` directamente sobre un trabajo pendiente. Preparar
una rama de sincronización desde `origin/main`, en una carpeta limpia:

```powershell
git fetch origin
git fetch upstream
git log --oneline origin/main..upstream/main
```

Si no hay commits nuevos, no hay nada que incorporar. Si los hay:

```powershell
git switch -c codex/sincronizar-upstream-BLOQUE origin/main
git merge upstream/main
```

Resolver, probar y abrir PR hacia `main` del fork. Incorporar después ese main
aceptado a la fase activa. Mantener el push de `upstream` deshabilitado.

### 10.2. PR al repositorio original

Cuando el main del fork contenga un alcance aceptado, crear una rama de propuesta
desde su commit exacto para que avances futuros no cambien el PR sin revisión:

```powershell
git fetch origin
git fetch upstream
git switch -c codex/propuesta-upstream-BLOQUE origin/main
git diff --stat upstream/main...HEAD
git log --oneline upstream/main..HEAD
git push -u origin codex/propuesta-upstream-BLOQUE
```

En GitHub elegir base **`Axis095/Huapango-PC-Electron:main`**, origen
**`cazarau/Huapango-PC-Electron-refactorizacion:codex/propuesta-upstream-BLOQUE`**.
El diff debe revisarse contra el original: puede incluir varias entregas del fork.
Si es demasiado amplio, acordar entregas con los mantenedores; no asumir que un
PR de Fase 1 contiene solo Vite si el original todavía no recibió la base anterior.

No prometer aprobación del original por haber aceptado el fork. Si upstream
cambia o solicita ajustes, guardar nuevos commits en la rama de propuesta,
revalidarlos y llevar las correcciones también al fork por PR.

## 11. Recuperación y vuelta a una versión anterior

Antes de una promoción conservar etiqueta funcional anterior y, cuando aplique,
respaldo conjunto de SQL y fotos con escrituras detenidas. Git no respalda
`userData` ni la base. Revisar compatibilidad de datos antes de ejecutar versiones
anteriores; un revert de código no revierte una migración SQL.

Si un merge aceptado introduce una regresión, crear una rama de corrección desde
`origin/main`. Para revertir específicamente un PR integrado por merge commit:

```powershell
git fetch origin
git switch -c codex/revertir-BLOQUE origin/main
git show --no-patch --pretty=raw SHA_MERGE
```

Verificar que el SHA corresponde al merge del PR y que el primer padre es el
main anterior. Solo entonces:

```powershell
git revert -m 1 SHA_MERGE
```

Probar y abrir otro PR hacia `main` del fork. Si fue squash o commit simple,
no usar `-m 1`: revisar la historia y revertir el commit correspondiente.
No usar push forzado para ocultar el merge.

Después de revertir un merge, volver a fusionar la misma rama no reaplica por sí
solo los commits revertidos. Preparar una corrección y decidir si corresponde
revertir el revert; validar el diff y el resultado completo antes de otro PR.

## 12. Checklist operativo y continuidad entre chats

- [ ] Identifiqué el main funcional y su evidencia; no confundí publicado con aceptado.
- [ ] Conservé el trabajo sin commit antes de cambiar de contexto.
- [ ] Separé el PR de base del PR de integración Vite.
- [ ] Confirmé perfil, MySQL y fotos de laboratorio antes de abrir la aplicación.
- [ ] Guardé el candidato y asocié las pruebas a su SHA.
- [ ] Diferencié implementación, pruebas automáticas, ensayo manual y aceptación.
- [ ] Probé distribución/instalación cuando el bloque lo requiere.
- [ ] Revisé destino, diff y ascendencia del PR antes de fusionarlo.
- [ ] Actualicé bitácora/índice y conservé referencia de recuperación.
- [ ] La siguiente fase parte del main aceptado.

Mensaje sugerido para continuar en otro chat:

> Consulta AGENTS.md, docs/migracion/README.md, el control de cierre, la bitácora
> vigente y docs/migracion/flujo-fork-y-fases.md. Revisa estado, ramas y remotos.
> Aplica solo el siguiente paso pendiente del flujo, conserva cambios ajenos y
> separa base funcional de integración. Antes de publicar o fusionar, identifica
> candidato, destino, evidencia y alcance autorizado. Actualiza la bitácora con
> resultados reales y pendientes; no cierres una fase por un pase parcial.

Registro de preparación de esta guía: cambio exclusivamente documental. No se
crearon ramas/worktrees, no se hicieron commits/push/PR y no se ejecutaron pruebas
de aplicación. La comprobación de este documento es de contenido, enlaces y diff.

## 13. Adopción del flujo — 17 de octubre de 2026

Necesidad y evidencia inicial: 14 archivos modificados y ocho nuevos en
`RefactorizacionTest-RC`, HEAD `2e913c3`, mezclaban F1-03/04 con la referencia
histórica. Alcance autorizado: conservar ese trabajo en una rama de fase,
preparar por separado la base del fork y registrar validaciones reales.
Aceptación del bloque de control: candidatos identificados, ramas separadas,
diff revisado, publicaciones solo al fork y promoción pendiente de aceptación.
El usuario confirma que las operaciones Git quedan concentradas en este chat.

### Ramas y propuesta de base

- `fetch origin` y `fetch upstream` correctos: ambos main siguen en `7de3b2e`;
  la rama histórica del fork sigue en `2e913c3`. Push de upstream: `DISABLED`.
- Rama de fase: `codex/fase-1-vite`; commit de código/documentación original
  `e19042dcb9e9f090ef8366a6482a10927dc38378`, 22 archivos; árbol limpio después
  de guardarlo. Las actualizaciones de control posteriores solo modifican Markdown.
- Base: `codex/base-funcional-2e913c3`, exactamente
  `2e913c347d00ddb706124cfc1854600681df9561`, en worktree administrado
  `base-funcional-2e913c3/Huapango-PC-Electron`, independiente y limpio.
- La rama de base está publicada y tiene [PR #1](https://github.com/cazarau/Huapango-PC-Electron-refactorizacion/pull/1)
  **en borrador**, destino main del fork. Incluye seis commits y 133 archivos.
  GitHub ofreció inicialmente el original como destino; se seleccionó y comprobó
  el fork antes de crear el PR. No se modificó el PR existente del original.
- El usuario decide ensayar la base antes de fusionarla. No se cambió el
  seguimiento de main, no se fusionó el PR ni se creó etiqueta funcional.
  El PR de Vite espera a la promoción de la base para mostrar solo su delta.

### Validación ejecutada sobre ambos candidatos

Entorno: Windows, Node 26.4.0, npm 12.0.2, Electron 44.4.0, TypeScript 7.0.2,
Vite 8.3.4 y MySQL 8.0 del equipo únicamente como ejecutable de laboratorios.
Evidencia local en `.tmp/control-git-2026-10-17-e19042d/` del proyecto de integración.

| Candidato | Comprobación actual | Resultado |
| --- | --- | --- |
| Base `2e913c3` | `npm.cmd ci --prefer-offline --no-audit --no-fund`, `npm.cmd ls --depth=0`, `npm.cmd run typecheck` | Correctos; 356 paquetes. Aviso de script bloqueado de electron-winstaller; no se ensaya el instalador normal. |
| Base `2e913c3` | `npm.cmd test` | 245/245; cero fallos, 999.3239 ms; `base-regresion.log`. |
| Base `2e913c3` | Smoke de fuentes, compile:main y smoke del compilado | SMOKE_OK y CUENTAS_SALIDA_OK; `base-smoke.log` y `base-smoke-compilado.log`. |
| Base `2e913c3` | Electron con `scripts/integracion-fase0.cjs` | MYSQL_INTEGRACION_OK: ambos esquemas, fotos, PDF, concurrencia y rollback; `base-integracion-electron.log`. |
| Vite `e19042d` | Dependencias, tipos, regresión y compile | Correctos; 252/252, cero fallos, 984.3368 ms y diez vistas; `regresion-fuera-sandbox.log` y `compilacion.log`. |
| Vite `e19042d` | Smoke de fuentes y compilado con referencia de fuentes | Correctos; compilado con PARIDAD_OK login/menu; `smoke-fuentes.log` y `smoke-compilado.log`. |
| Vite `e19042d` | Smoke Vite con referencia, dos intentos | Fallo de paridad del menú: body 769 px frente a 1265 px; login coincide. VITE_DETENIDO, código 1; `smoke-vite.log` y `smoke-vite-repeticion.log`. |

El primer intento de regresión de Vite falló por acceso a perfiles temporales del
sandbox; fuera de él pasó sin cambios. El fallo de paridad Vite es posterior e
independiente: permanece abierto. La compilación y los otros smoke no lo suplen.
No se actualizaron dependencias ni se modificaron fuentes de producción durante
esta adopción. No se habilitaron funciones aplazadas ni se cerraron fases.

Perfiles de la base: `.tmp/fase0-smoke-qjiU0e` (fuentes),
`.tmp/fase0-smoke-QTqxCM` (compilado) y `.tmp/mysql-fase0-P7ozXU` (integración),
relativos a su worktree. Los servidores automáticos terminaron al finalizar.
Los duplicados SQL registrados corresponden a rechazos esperados con datos ficticios.

### Ensayo manual preparado, pendiente de resultado

Se abrió Main real de `2e913c3` desde el worktree limpio, mediante un lanzador
local ignorado que fija userData y sessionData antes de importar la aplicación.
Ventana de acceso nativa visible y URL de la base confirmadas. El título identifica
`ENSAYO BASE 2e913c3`; no se modificó el código del candidato.

Entorno separado: `.tmp/control-git-2026-10-17-e19042d/manual-base-Gi0jUG/`,
con directorio MySQL nuevo, loopback en puerto `57264`, perfil propio y dos PNG
ficticios en `fotos-ficticias/`. La cuenta SQL solo tiene SELECT/INSERT/UPDATE/DELETE
en la base de laboratorio. Se verificó que puede consultar las tres cuentas
bcrypt de la [guía de instalación](../guia-primera-instalacion.md#6-insertar-admin-operador-y-juez-con-bcrypt).
Las credenciales SQL aleatorias permanecen en la configuración local ignorada;
no se copian a documentación, commits ni logs. No se leyó configuración del evento.

El supervisor mantiene el MySQL mientras se prueba la aplicación. Al cerrar
Electron apaga únicamente ese servidor y conserva los archivos del ensayo.
Preparación verificada; recorrido manual y aceptación del usuario **pendientes**.
Los resultados se añadirán después de la prueba, sin marcar casillas por inferencia.

Siguiente acción: registrar el recorrido de la base antes de promover el PR;
diagnosticar la diferencia de tamaño del menú Vite (tamaño nativo/viewport,
escala y zoom) y revalidar lo afectado. Distribución e instalación siguen en
F1-05/06; el fallo de Vite no pertenece al diff del PR de base.

# Fase 1 — Bitácora de compilación y convivencia

Fecha de inicio: 17 de octubre de 2026. Referencia recuperable: `98331dc`.
Entrada técnica: pase F0-18 del [control de cierre](cierre-fase-0.md).
Estado al 19 de octubre: **avances de F1-01 a F1-06 en validación de integración;
Fase 1 abierta y Fase 2 no iniciada**. La paridad dev/ASAR y el laboratorio nativo
cuentan con evidencia previa correcta; falta ensayar identidad final por decisión del usuario, sin retirada de vistas
ni contratos heredados.

Hito solicitado por el usuario: commit de cierre técnico acotado de Fase 0 y
apertura de Fase 1. Consultar el [acta y la deuda trasladada](cierre-fase-0.md).
Los resultados siguientes corresponden a la ejecución de la primera entrega;
el acto de preparar el commit no los vuelve a ejecutar.

## Primera entrega — F1-01/02

Necesidad: incorporar compilación sin cambiar a la vez navegación, identidad o
interfaz. El árbol actual resuelve vistas, preload y borradores desde rutas de
archivo relativas; mover solo Main rompería esas comprobaciones.

Alcance: dependencias de desarrollo fijadas, configuración TypeScript gradual y
salida de ensayo bajo `build/app`, separada de instaladores en `dist`. Mantener
la estructura de módulos y recursos para comprobar la aplicación compilada con
el smoke existente. El servidor Vite y sus reglas de origen se integran juntos
en la segunda entrega; instalar la herramienta no abre un servidor todavía.

Aceptación: compilación/typecheck, smoke del árbol compilado y regresión;
versiones ejecutables de producción conservadas; los comandos de uso existentes conservan
su entrada hasta completar la transición. No declarar toda la aplicación tipada.

### Inventario y decisiones

| Elemento | Tratamiento inicial |
| --- | --- |
| Main y preload | Entrada Main TypeScript CommonJS que carga el módulo actual; preload JavaScript emitido conservando nombre y rutas. Tipado de su API en Fase 2. |
| Controladores/Modelos/Seguridad/Servicios/db | JavaScript en convivencia, emitido con allowJs; validaciones runtime intactas. Tipado integral en Fase 2. |
| Diez vistas del catálogo IPC | login, configuracionBD, MenuPrincipal, Registros, ModificarParejas, BusquedaParejas, RegistroCategoriasEstilos, Parejas, Resultados, Administrador. |
| HTML fuera del catálogo | index y AdministradorInactivado no se habilitan como destinos por copiar recursos. |
| UI y recursos | Vistas/Public conservan rutas durante la primera entrega; Vite multipágina en la segunda. |
| Desarrollo HTTP | Aún deshabilitado; solo se incorporará junto con validación exacta de origen/vista y pruebas negativas. |
| Datos del usuario | Configuración/fotos permanecen en userData; nunca se copian al árbol generado. |
| Salidas | build/app para aplicación de ensayo; dist para distribución. Ninguna limpieza general de dist ni datos. |

TypeScript permite convivencia con JavaScript mediante
[allowJs](https://www.typescriptlang.org/tsconfig/allowJs.html) y emisión separada
con [outDir](https://www.typescriptlang.org/tsconfig/outDir.html). Se conserva
CommonJS y se evita un cambio global de formato. El control de tipos estricto se
aplica a las entradas nuevas; el legado JavaScript conserva checkJs desactivado
de forma explícita hasta tipar contratos y módulos gradualmente.

Vite admite varias entradas HTML y requiere Node 20.19+/22.12+ según su
[guía oficial](https://vite.dev/guide/); el proyecto ya exige Node >=22.12.0.
Registro npm consultado en esta sesión: TypeScript 7.0.2, Vite 8.3.4 y tipos de
Node 22.20.5. Elegidos como herramientas de desarrollo; React se incorpora al
trabajo de vistas posterior cuando haya consumidor real.

### Comprobaciones y siguiente entrega

- `npm.cmd run compile:main`: correcto; salida generada e ignorada por Git.
  Limpia únicamente build/app, rechazando enlaces de directorio en esa ruta.
  Copia Vistas/Public y manifiesto mínimo; no incluye configuración privada,
  uploads, scripts, pruebas ni documentación de migración. Las licencias de
  fuentes se conservan con sus recursos; el preload conserva su nombre.
- `npm.cmd run typecheck`: correcto. El legado JavaScript todavía no tiene
  chequeo de tipos integral; la entrada nueva usa strict y emisión sin errores.
- Smoke del compilado: **VISUAL_OK / CUENTAS_SALIDA_OK / SMOKE_OK**.
  Perfil `.tmp/fase0-smoke-9fjZwL`. El harness usa ahora la entrada real indicada
  por package.json: en build/app carga electron/main.cjs, no evita el bootstrap.
- Regresión final tras instalar herramientas: **245/245**, 1045.0082 ms.
  MySQL estándar ampliado: **MYSQL_INTEGRACION_OK**, ambos esquemas, evidencia
  `.tmp/mysql-fase0-eCFwRs`; modo Electron de F0-18 conserva evidencia de fotos.
- `npm.cmd ls --depth=0` y `vite --version`: correctos. Electron 44.4.0,
  electron-builder 26.5.0, bcryptjs 3.0.3, mysql2 3.24.4 y pdfkit 0.17.1
  conservados. El lockfile cambia las declaraciones compartidas @types/node
  24.13.5 → 22.20.5 y undici-types 7.18.2 → 6.21.0 al fijar tipos del mínimo
  Node soportado; no son módulos ejecutables de la aplicación.
- Comparación de salida: **56 recursos de Public/Vistas idénticos por SHA-256**,
  identidad name/version del manifiesto conservada y ausencia de carpetas
  privadas/de ensayo. No cambió la versión de ningún módulo ejecutable de
  producción del lockfile. Diff y 41 enlaces locales revisados correctamente.
- Sin build/instalación nueva: el empaquetado sigue usando la entrada anterior
  hasta F1-05/06. Las dependencias nuevas son devDependencies y la allowlist de
  distribución no cambia en esta entrega. No se hizo commit ni publicación.

Para repetir el smoke de la salida compilada, en PowerShell:

```powershell
npm.cmd run compile:main
$env:HUAPANGO_SMOKE_APP_ROOT = Join-Path (Get-Location) 'build/app'
try { npm.cmd run test:smoke }
finally { Remove-Item Env:HUAPANGO_SMOKE_APP_ROOT }
```

Autoevaluación: la compilación mantiene la estructura que usa la seguridad por
ruta; no fue necesario ampliar orígenes ni permisos para obtener éxito. El smoke
comprueba la entrada compilada con SQL simulado; MySQL/fotos se prueban en el
laboratorio separado. No es un ensayo instalado ni un E2E visual completo.

Siguiente entrega al concluir F1-01/02: **F1-03/04**, centralizar identificación de vistas para Main,
IPC y borradores; incorporar Vite multipágina con origen de desarrollo exacto,
pruebas negativas y recursos locales en producción. No introducir React todavía.

## Segunda entrega — F1-03/04

Base: `2e913c3`. Necesidad: los guards actuales solo reconocen file:// y los
borradores duplican esa lógica; Vite instalado aún no sirve ni compila las vistas.
Alcance: catálogo único, resolución de vistas en archivo/HTTP, servidor limitado
a frontend local y compilación multipágina. El paquete debe ignorar el origen de
desarrollo. Preservar roles, contexto aislado, navegación, borradores y apariencia.
Aceptación: regresión, pruebas negativas de rutas/orígenes/subframes, smoke real
en fuentes, Vite y salida compilada; recursos offline. Sin SQL ni dependencias
nuevas. Instalación/actualización permanecen para F1-05/06.

### Cambios y decisiones

- `Seguridad/vistas.js` concentra las diez vistas y sus roles. Main, IPC y
  borradores usan `Servicios/rutasVistas.js`: archivo local en fuentes/salida
  compilada, origen HTTP exacto en desarrollo. Rechaza otro puerto, hostname,
  protocolo, subframe, ruta ajena o vista fuera del catálogo. El modo empaquetado
  ignora HUAPANGO_DEV_ORIGIN incluso si tiene un valor inválido.
- `npm.cmd run dev` inicia Vite en 127.0.0.1 y Electron; cierra el servidor cuando
  termina Electron. Se observan recursos de frontend y se ignoran temporales,
  datos, backend y distribución. Los cambios de Main requieren reiniciar dev.
- Middleware limita host, métodos y recursos; HTTP no sirve Main, modelos,
  configuración, SQL, @fs ni herramientas del editor. Vite no carga .env del
  proyecto. CSP solo admite conexión del cliente Vite en desarrollo; las diez
  salidas conservan connect-src 'none'.
- `npm.cmd run compile` compila Main y las diez entradas HTML con Vite. Mantiene
  build/app separado de dist. Las hojas CSS del legado y sus fuentes se conservan
  como recursos estáticos para respetar su orden; JS/HTML y medios referenciados
  se procesan con Vite. No cambian dependencias, SQL ni contratos IPC.
- El smoke usa el mismo resolver y recorre las diez vistas, ventana auxiliar,
  configuración autorizada, guardado/relectura de borradores y rechazo de un
  borrador desde otra vista. Compara login/menú con una referencia de fuentes a
  1280×960: estilos, familias y geometría; conserva capturas para inspección.

### Defectos detectados y corrección

1. El agrupado inicial de CSS de Vite reordenó la cascada y cambió colores,
   posición y altura del menú, aunque el smoke funcional pasó. Las capturas lo
   detectaron. Se preserva el orden original de las hojas, sin modificar su
   contenido; se añadió comparación de composición, además de tipografías/video.
2. El watcher inicial alcanzaba Cookies y temporales del perfil de Electron y
   producía EBUSY. Se excluyen esas carpetas; el ensayo final ya no mostró avisos.
3. Dos harnesses de pruebas de Main suponían el catálogo de dependencias previo.
   Se conectaron al resolver real; no se omitieron casos ni se relajaron guards.

### Comprobaciones ejecutadas

| Comprobación | Resultado y evidencia |
| --- | --- |
| Regresión completa | **252/252**, cero fallos, 1001.7508 ms; siete casos nuevos de rutas, origen, permisos y recursos. |
| compile y typecheck | Correctos; diez entradas HTML producidas. |
| Smoke de fuentes | **SMOKE_OK / RUTAS_OK**, `.tmp/fase0-smoke-9Dp4Uk`, referencia visual del bloque. |
| Smoke Vite | **VITE_FRONTERA_OK / PARIDAD_OK login/menu / RUTAS_OK / SMOKE_OK**, `.tmp/fase0-smoke-ynVvpC`. |
| Terminación de desarrollo | Repetición final con manejo de salida ajustado: código 0 y cierre de Vite/Electron; `.tmp/fase0-smoke-UVmm2l`. |
| Smoke compilado offline | **PARIDAD_OK login/menu / RUTAS_OK / SMOKE_OK**, `.tmp/fase0-smoke-lJyA64`. |
| Recursos y CSP | Las diez vistas compiladas mantienen orden de CSS y connect-src 'none'. |
| Comparación visual | Capturas de menú fuente/compilado inspeccionadas; estilos y geometría coinciden. Los PNG no tienen hashes idénticos; no se declara igualdad píxel a píxel. |
| Integración MySQL | No repetida: sin cambios SQL/transaccionales. Sigue la evidencia anterior de Node/Electron; estos smoke usan SQL simulado. |

El rechazo ER_DUP_ENTRY del smoke es el caso esperado de cuenta duplicada. Las
capturas cubren login/menú/video; el recorrido de diez vistas no certifica cada
control, foto ni composición del resto de formularios. Tampoco certifica
instalación ni actualización. El modo empaquetado se cubre con pruebas de
resolución; el ensayo del ejecutable queda para la tercera entrega.

Autoevaluación de los seis pilares: arquitectura con resolver compartido;
seguridad conserva roles/validación y restringe desarrollo; rendimiento evita
vigilar datos/temporales; calidad agrega casos negativos y paridad; dependencias
sin cambios; QA en tres modos con límites explícitos. La deuda de F0-17 permanece.

Siguiente entrega **F1-05/06**: empaquetar desde build/app, depurar recursos
duplicados de la salida (incluido el video), verificar exclusión de datos privados,
generar candidato e inspeccionar instalación/actualización en perfil limpio.
Fase 1 sigue en curso. Cambios de este bloque pendientes de commit.

Referencias de configuración: [API JavaScript de Vite](https://vite.dev/guide/api-javascript.html)
y [opciones de compilación](https://vite.dev/config/build-options).

### Contraste de revisión externa antes de F1-05/06

El usuario aporta una revisión de sus salidas: raíz HTTP con 404, comprobaciones
automáticas correctas y ausencia de PARIDAD_OK en esa ejecución. Alcance de esta
revisión: aclarar consola/documentación y comprobar evidencia faltante, sin
ampliar rutas ni repetir inicialmente la batería ya correcta.

Defecto confirmado de comunicación: la consola mostraba solo el origen interno
de Vite, lo que invitaba a abrir `/` en el navegador. Esa ruta está excluida por
el middleware; la aplicación se abre en Electron, donde existe el preload.
En ese momento no había evidencia aportada de un defecto de apertura de ventana.
Se solicitó confirmar lo observado en dev/start:compiled, separadamente del smoke.
El diagnóstico posterior de ventana ausente, al final de este documento, amplía
esa evidencia y registra la corrección necesaria en el lanzador.

Evidencia contrastada de solo lectura: los JSON guardados de login/menú coinciden
con `.tmp/fase0-smoke-9Dp4Uk` tanto en `.tmp/fase0-smoke-ynVvpC` como en
`.tmp/fase0-smoke-lJyA64`. Son resultados anteriores recontrastados, no nuevas
ejecuciones. PARIDAD_OK solo se imprime al establecer HUAPANGO_SMOKE_REFERENCIA.

Aceptación del ajuste: instrucciones claras en consola/README, `/` permanece
restringida, cierre de Vite informado y verificaciones pertinentes tras cambiar
el lanzador. El recorrido manual de negocio y el paquete instalado conservan
sus pendientes. El build sigue tomando fuentes hasta F1-05/06.

Resultado de esta revisión: consola y README aclaran el uso de Electron y el
404 de `/`; el smoke comprueba ahora también esa raíz restringida y el lanzador
informa VITE_DETENIDO tras cerrar el servidor. Regresión exigida por el cambio:
**252/252**, cero fallos, 1047.6779 ms. Smoke Vite con referencia explícita:
**PARIDAD_OK login/menu / VITE_FRONTERA_OK / RUTAS_OK / SMOKE_OK** y
**VITE_DETENIDO, código 0**, perfil `.tmp/fase0-smoke-bw5MEG`.

No se repitieron instalación de dependencias, typecheck, compilación, MySQL ni
smoke compilado: no cambió su código desde las comprobaciones anteriores.
Se recontrastaron los JSON de paridad guardados del compilado. Diff y enlaces
revisados. La confirmación manual solicitada de apertura en ambos modos sigue
pendiente de respuesta; no se atribuye al usuario la aceptación de los seis
recorridos de negocio propuestos por la revisión externa. Estos casos se
mantienen pendientes y pueden registrarse por separado al ensayar el candidato.

### F1-03/04 — Diagnóstico de ventana ausente en desarrollo

17 de octubre de 2026. El usuario informa que dev mantiene Vite activo, pero no
observa Electron. La inspección encuentra proceso principal, GPU, red y renderer
del proyecto activos; el inventario nativo no encuentra ventana de Huapango.
Esto amplía la evidencia anterior: el 404 sigue siendo esperado, pero no explica
la ausencia de ventana. El smoke existente oculta ventanas deliberadamente y no
certifica esta propiedad del arranque interactivo.

Alcance: reproducir con perfil temporal y comprobar si windowsHide del lanzador
oculta la primera ventana; no cambiar rutas, permisos, UI ni datos del evento.
Aceptación: ventana nativa observable en arranque interactivo, regresión y smoke
correctos, conservando el cierre del entorno.

Reproducción: una sonda temporal carga Main real con perfil nuevo, sin credenciales
ni conexión SQL. Con windowsHide=true, Configurar conexión termina de cargar pero
isVisible() devuelve false; con false devuelve true. El proceso principal original
identificado se detuvo para liberar el puerto y reiniciar dev; no se finalizaron
otros procesos. La sonda y sus perfiles quedan ignorados bajo `.tmp/sonda-ventana*`.

Cambio: `scripts/desarrollo.mjs` utiliza windowsHide solo en modo smoke. No se
modifican BrowserWindow, rutas, permisos, compilación ni interfaz. El ocultamiento
de ventanas del smoke queda intacto.

| Evidencia de esta corrección | Resultado |
| --- | --- |
| Reproducción con Main real | Ventana oculta/visible según windowsHide, perfil temporal y sin SQL. |
| Regresión completa | **252/252**, cero fallos, 1023.2779 ms. |
| Smoke Vite con referencia | **PARIDAD_OK login/menu / VITE_FRONTERA_OK / RUTAS_OK / SMOKE_OK**, perfil `.tmp/fase0-smoke-kxz4ab`. |
| Cierre del smoke | **VITE_DETENIDO, código 0**. |
| Arranque interactivo normal | El usuario confirma: «Sí, apareció y la cerré»; el cierre devuelve código 0 y detiene Vite. |

El primer intento del smoke no pudo hacer fetch local dentro del sandbox; se
repitió fuera y terminó correctamente. El ER_DUP_ENTRY corresponde al rechazo
intencional de cuenta duplicada. Diff revisado sin errores de espacios.

Autoevaluación: el defecto era del arranque interactivo y no aparecía en pruebas
que ocultan ventanas por diseño. La comparación controlada y la confirmación del
usuario cubren ese hueco. No se presenta el smoke como prueba de visibilidad,
MySQL real ni instalación. No hubo cambios SQL ni de dependencias. El arranque
manual del compilado y el recorrido completo conservan sus pendientes.

Estado: corrección implementada, verificada y apertura dev confirmada por el
usuario. F1-05/06 sigue siendo el siguiente bloque: distribución desde build/app,
inspección del paquete y ensayo de instalación/actualización. Fase 1 abierta.

## Control Git y comprobación del candidato — 17 de octubre de 2026

Necesidad: separar el trabajo sin commit de F1-03/04 de la base publicada, antes
de promover cambios al main del fork. El usuario concentra aquí las operaciones
Git y solicita continuar el flujo. Se conservan los 22 archivos pendientes en
`e19042dcb9e9f090ef8366a6482a10927dc38378`, rama `codex/fase-1-vite`, sin cambios
adicionales de producción. El [registro operativo](flujo-fork-y-fases.md#13-adopción-del-flujo--17-de-octubre-de-2026)
contiene las ramas, el PR de base y la evidencia de ambos candidatos.

Comprobaciones nuevas sobre `e19042d`: dependencias/tipos correctos, regresión
252/252 (984.3368 ms), compilación de las diez vistas y smoke de fuentes correctos.
El smoke compilado coincide con la referencia de fuentes en login y menú.
El primer pase de regresión falló al acceder a temporales del sandbox; la
repetición fuera de él pasó sin modificar código.

**Fallo actual reproducido dos veces:** el smoke Vite compara correctamente
login, pero rechaza la geometría del menú. El ancho medido de body es 769 frente
a 1265 en fuentes; los estilos y familias reportados coinciden. La causa de esa
diferencia de tamaño no está confirmada: no se atribuye a CSS ni se relaja la
comparación para obtener éxito. Ambos intentos terminaron Vite con código 1.
El primer perfil fallido es `.tmp/fase0-smoke-8HZvTH`; logs del pase y repetición
en `.tmp/control-git-2026-10-17-e19042d/`.

La evidencia anterior de paridad correcta sigue siendo histórica. El resultado
de esta sesión impide considerar aceptado el candidato actual en los tres modos.
Fuentes: `.tmp/fase0-smoke-77wu4c`; compilado: `.tmp/fase0-smoke-dmBmPx`.
No se repitió integración sobre Vite: no cambia SQL respecto de la base, cuya
integración con Electron/MySQL sí se ejecutó nuevamente en su worktree aislado.

El [PR #1 de base](https://github.com/cazarau/Huapango-PC-Electron-refactorizacion/pull/1)
conserva exactamente `2e913c3` y no incluye Vite ni este registro. El usuario
prefiere ensayarlo antes de fusionar. Se abrió un acceso visible con perfil,
MySQL y fotos ficticias separados; preparar el entorno no constituye completar
el recorrido ni obtener aceptación. `main` permanece en `7de3b2e`.

Siguiente acción: recoger el resultado del ensayo de la base; diagnosticar tamaño
nativo, viewport, escala y zoom del smoke Vite antes de modificar producción.
F1-05/06 y el cierre de Fase 1 siguen pendientes. Esta actualización posterior
solo cambia documentación y no presenta una nueva ejecución de pruebas de código.

## Continuidad desde la constancia — 18 de octubre de 2026

Entrada: [constancia de Fase 1](constancia-fase-1-2026-10-18.md), HEAD local
`a9880cffccce769fb498cbeb9f6501be1585e995`, código de F1-03/04 en `e19042d`.
Las dos constancias y el índice tienen cambios documentales previos sin commit;
se conservan. El lote externo no identifica su SHA y no se atribuye al HEAD local.

Defecto pendiente: dos comparaciones dev midieron body de 769 px frente a 1265
en fuentes, mientras login y compilado coincidían. Antes de alterar producción,
registrar tamaño nativo, viewport y zoom del ensayo para explicar la diferencia.
Alcance inicial: diagnóstico/paridad, sin repetir MySQL ni el recorrido aportado.
Aceptación: entorno equivalente, comparación estricta correcta y evidencia del
candidato; conservar el hallazgo si no se reproduce o no se explica. Después,
abordar F1-05/06 con paquete compilado e identidad verificable del artefacto.

Primer contraste puntual: dev pasa login/menú contra `.tmp/fase0-smoke-77wu4c`,
perfil `.tmp/fase0-smoke-OqaWg4`, con contenido/viewport de 1280×960, zoom 1 y
escala 1; SMOKE_OK y cierre 0. No se reprodujo la diferencia anterior y no se
afirma una causa. Se añade evidencia de entorno y rechazo explícito de tamaño
o zoom distintos, conservando la comparación estricta. Pendiente revalidación
final del harness tras añadir estas precondiciones.

### F1-05 — Distribución desde la aplicación compilada

Necesidad confirmada por la constancia y package.json: build toma las fuentes
de la raíz y duplica video/JS junto a assets de Vite. Alcance: compilar antes del
build, empaquetar build/app con sus dependencias de producción e inspeccionar
ASAR antes de generar NSIS. Conservar appId/productName/version y ubicación de
datos; sin instalación sobre el perfil del evento, publicación ni merge.

Aceptación automática: entrada electron/main.cjs, diez HTML compilados, CSS y
licencias locales, un solo video, dependencias de runtime presentes; ausencia
de datos/configuración/herramientas de desarrollo; igualdad con el árbol generado
y smoke offline del ASAR. Identificar instalador por hash. Instalación y
actualización son aceptación separada F1-06, no inferidas del build.

### Diagnóstico y cambios realizados

- El segundo ensayo instrumentado reprodujo el defecto de medición: contenido
  nativo 1280×960, zoom 1, renderer 784×535 y cliente 769. El tamaño nativo solo
  no certificaba el viewport. El harness espera hasta 3 s a que el renderer
  confirme 1280×960, registra inicio/final/espera y luego conserva sus aserciones
  estrictas. Los pases finales registran menú 784×535 → 1280×960 en 31 ms.
  No se cambió la UI; el fallo queda cubierto por sincronización y precondiciones
  del ensayo. No se atribuye retrospectivamente una medida nativa al log antiguo.
- `prebuild` compila; directories.app apunta a build/app. Main de distribución
  es electron/main.cjs. La compilación completa copia CSS/fuentes/licencias y
  deja a Vite emitir las diez vistas, JS y medios; no duplica Public/js/imágenes.
  compile:main conserva su modo de ensayo con recursos originales.
- `afterPack` compara los archivos de aplicación del ASAR byte a byte con el
  árbol compilado mediante SHA-256, valida entrada, dependencias de runtime,
  catálogo, recursos HTML/CSS y exclusiones. Genera auditoria-paquete.json.
  Cuatro pruebas con ASAR real cubren aceptación, datos privados añadidos,
  módulo alterado y dependencia ausente. Se corrigió normalización de separadores
  Windows en la primera ejecución del verificador.
- Dependencias y lockfile intactos. npmRebuild=false evita instalaciones/rebuilds
  implícitos en la salida; no hay addons nativos en el runtime actual. El hook
  rechaza .node para obligar a revisar esta decisión cuando se añada uno.
  Builder recoge las dependencias de producción instaladas en la raíz tras
  buscar primero en build/app; el paquete final contiene las tres dependencias.

### Evidencia del candidato local

Base Git: `a9880cf` + cambios F1-05 de esta sesión, aún sin commit. Los SHA de
abajo identifican el candidato generado, no un commit externo de Evidencia2.
NSIS conserva appId com.huapango.app, productName HuapangoApp y versión 1.0.0.

| Elemento | Identificación |
| --- | --- |
| Instalador | dist/HuapangoApp Setup 1.0.0.exe; **169317307 bytes**. |
| SHA-256 instalador | `9b6ac198b1f7d0f4ec27812745861f9f69d4d10739926f3fbd49e2c78b05fa76` |
| SHA-256 ASAR | `f45f9b274549ad8f69ac2c2f7f22947ccb0f530b653785a4477b0002e86c7a0c` |
| SHA-256 aplicación compilada | `2c0670f0c9877b516197f4118e28b26c23e5bc7e988060fd6d0ce54046905c4d` |
| Inventario | 1027 archivos, 76 de aplicación, diez vistas, un video. |
| Authenticode | **NotSigned**, comprobado por Get-AuthenticodeSignature; el mensaje signing de builder no acredita certificado. |

La huella de aplicación concatena, por ruta ordenada, `ruta<TAB>sha256<LF>`
de los archivos compilados salvo package.json. La del ASAR incluye manifiesto y
dependencias. Auditoría completa en dist/auditoria-paquete.json.

| Comprobación actual | Resultado y evidencia local |
| --- | --- |
| Regresión completa final | **256/256**, cero fallos, 1001.1488 ms; `.tmp/regresion-f1-05-cierre-2026-10-18.log`. Pase previo 256/256 en `.tmp/regresion-f1-05-final-2026-10-18.log`. |
| Typecheck | Correcto. |
| Compilación | Diez vistas; ejecutada también por prebuild antes de NSIS. |
| Inspección de ASAR | **PAQUETE_COMPILADO_OK**; archivos de aplicación iguales a build/app y recursos locales presentes. |
| Dev final con referencia | **PARIDAD_OK login/menu / RUTAS_OK / SMOKE_OK / VITE_DETENIDO 0**; `.tmp/fase0-smoke-F7SJmR`, log `.tmp/paridad-dev-espera-final-2026-10-18.log`. |
| ASAR compilado offline | **PARIDAD_OK login/menu / RUTAS_OK / SMOKE_OK**; `.tmp/fase0-smoke-jL02jk`, log `.tmp/smoke-asar-f1-05-2026-10-18.log`. |
| Capturas | Menú fuente `.tmp/fase0-smoke-77wu4c` y ASAR final inspeccionados a igual viewport/rol; composición conservada. No se declara igualdad píxel a píxel. |
| NSIS | Generado con código 0; `.tmp/build-f1-05-cache-windows-2026-10-18.log`. |

Incidencias del entorno: primer build sin red del sandbox; repetición fuera
alcanzó ASAR, pero falló extrayendo enlaces darwin de winCodeSign-2.6.0. Se usó
`.tmp/builder-cache/winCodeSign/winCodeSign-2.6.0`, copiando appxAssets,
openssl-ia32, windows-10, windows-6 y rcedit del bundle oficial recién descargado
por builder, sin darwin/linux. No se cambiaron permisos del sistema, no se instaló
software ni se desactivó signAndEditExecutable. Comando del build correcto:

```powershell
$env:ELECTRON_BUILDER_CACHE = Join-Path (Get-Location) '.tmp/builder-cache'
try { npm.cmd run build }
finally { Remove-Item Env:ELECTRON_BUILDER_CACHE }
```

Esta ruta presupone la caché preparada anterior; no es una nueva dependencia
del proyecto ni un directorio que se distribuya. Las advertencias de búsqueda
de dependencias preceden al fallback correcto a la raíz. DEP0190 procede de
builder/npm y conserva su revisión aplazada; no se actualizaron paquetes por ello.
La regresión también necesitó repetición fuera del sandbox por acceso a perfiles
temporales. No se modificaron validaciones para evitar esa restricción.

### Autoevaluación y F1-06 restante

| Pilar | Evaluación de este bloque |
| --- | --- |
| Arquitectura | Entrada y distribución compiladas; separación Main/preload/renderer conservada. Contratos integrales en Fase 2. |
| Seguridad | Inspección de exclusiones y hashes; permisos IPC sin cambios, sin uso de BD del evento. Controles operativos siguen pendientes. |
| Rendimiento | Eliminada segunda copia del video de 49.6 MB y JS fuente del renderer; sin cambios de consultas. |
| Calidad | Verificación de contenido con negativos y diagnóstico de viewport; no se relajó la paridad para obtener éxito. |
| Dependencias/distribución | Sin actualizaciones, NSIS compilado identificado. Firma, instalación y actualización aún no aceptadas. |
| QA | Regresión, dev y ASAR offline correctos. Recorrido manual recibido se conserva con sus límites. |

No se repitió MySQL: no cambió SQL, transacciones ni módulos de negocio; se
conserva lo acreditado en la constancia. El smoke carga el ASAR con Electron de
desarrollo y SQL simulado; no equivale a ejecutar el EXE instalado con
app.isPackaged=true ni a probar una actualización. Las pruebas de rutas cubren
el rechazo del origen dev en modo empaquetado, pero no suplen ese ensayo nativo.

Siguiente acción concreta F1-06, en otra cuenta Windows o PC/VM de laboratorio:

1. Comprobar hash del instalador, instalar y confirmar primer arranque en
   configuración; sin proyecto/Node/Vite en la máquina de ensayo y con red externa
   desconectada. Preparar MySQL local de laboratorio y cuentas ficticias según guía.
2. Recorrer admin/user/juez: registro con dos fotos, asignaciones, consulta,
   modificación/borrador, evaluación definitiva, salida cancelada/confirmada y PDF.
   Confirmar reinicio y recuperación de configuración/fotos/filas SQL.
3. Ensayar actualización sobre una instalación anterior en ese mismo laboratorio,
   con respaldo SQL+uploads, y comprobar los mismos datos y acceso después.
   Registrar hashes de ambos instaladores y versión/origen del ejecutable abierto.
4. Registrar correcto/fallido/pendiente por caso y aceptación del usuario;
   evaluar las seis puertas/pilares y emitir acta de Fase 1 antes de abrir Fase 2.

No se hizo instalación, actualización, commit, push, promoción del PR de base ni
merge. Las constancias del usuario se conservaron sin convertirlas en aprobación
de este candidato nuevo. Estado: F1-05 verificada automáticamente; F1-06 parcial.

Referencias de configuración: [estructura con salida separada de electron-builder](https://www.electron.build/tutorials/two-package-structure/)
y [opciones de archivos](https://www.electron.build/file-patterns/); contrastadas
también con el código local de app-builder-lib 26.5.0.

## F1-06 — Ensayo de instalación y actualización · 18 de octubre de 2026

Entrada: candidato F1-05 con SHA-256 NSIS `9b6ac198b1f7d0f4ec27812745861f9f69d4d10739926f3fbd49e2c78b05fa76`,
recontrastado sin cambios al retomar. Alcance: preparar y ejecutar lo posible del
ensayo nativo en un entorno separado, conservando datos del evento y trabajo sin
commit. No repetir las suites ya correctas mientras no cambie código.

Precondición del ensayo: otra cuenta Windows/PC/VM. No se encontró ejecutable
de Windows Sandbox ni un gestor VM en los comandos disponibles; se solicitó al
usuario identificar el entorno que puede usar. Se prepara el material mientras
responde, sin instalar en la sesión actual.

Riesgo comprobado en las plantillas NSIS locales: /D cambia la carpeta destino,
pero conserva las claves de instalación y desinstala una versión anterior con la
misma identidad. Una carpeta temporal en la cuenta actual no aísla el registro
ni userData. La configuración usa app.getPath('userData'); debe preservarse su
identidad entre base y candidato. Este diagnóstico no prueba instalación real.

Aceptación: hashes de ambos instaladores y ASAR, primer arranque limpio,
actualización conservando configuración/fotos/datos ficticios y recorrido breve
en el EXE instalado; resultados y aceptación por separado antes del acta final.

### Entorno y candidatos del ensayo ejecutado

El usuario confirma que solo dispone de la sesión actual. Se usó la identidad
exclusiva `com.huapango.ensayo.f106-29682974e9`, producto
HuapangoEnsayo-f106-29682974e9 y perfil huapango-ensayo-f106-29682974e9.
Sin accesos directos ni arranque al terminar instalación. El NSIS final de F1-05
conservó su hash; no se ejecutó con identidad de producción.

Evidencia en `.tmp/f1-06/f106-29682974e9/`; supervisores ignorados en
`.tmp/f1-06/`. La base procede del worktree limpio `2e913c3`; sus fuentes no
cambiaron. Su instalador de referencia, sin instalar, está en
`.tmp/f1-06-base-2e913c3/`, SHA-256
`bd70d7a062c763074f83d54eaeb79f3b597abf9f30725ebd6704c8fa66c7b05f`.

| Artefacto de laboratorio | SHA-256 |
| --- | --- |
| NSIS base | `520b7587831b9a4e1fac5ec549dba742d62273159c5adf200a8d36352f824532` |
| NSIS compilado | `f62a898e2276e23a14853afc2d8748585a5dd79ba25cab0a90f57a1d1c6751a6` |
| ASAR base instalado | `73b3b2b84ca4bf951bcb9b0928db21a97ef2bf48cd1a26852d7d2f679f71b74a` |
| ASAR compilado instalado | `c2b3d01988de1fbf1870ffa67ed446ced29622f6a08d9e337a0c1347d33020b6` |
| Código compilado sin manifiesto | `2c0670f0c9877b516197f4118e28b26c23e5bc7e988060fd6d0ce54046905c4d`, igual a F1-05. |

Los archivos de aplicación de la base se compararon con su ASAR de referencia;
los del compilado con el árbol emitido mediante el verificador existente.
Identidad/manifiesto y NSIS son diferentes deliberadamente; la igualdad del
código no certifica la identidad original. Ambos conservan versión 1.0.0:
actualización/reinstalación manual, no incremento de versión ni auto-update.

### Resultados nativos actuales

MySQL 8.0.46 desechable con --no-defaults, directorio nuevo y puerto loopback
propio; cuenta de aplicación solo DML, tres usuarios bcrypt y dos PNG ficticios.
Credenciales aleatorias en archivos ignorados, fuera de logs/documentación.
Sin leer configuración del evento. Formularios y API real del preload conducidos
por CDP en loopback, sin mocks SQL ni de BrowserWindow. El producto se ejecuta
como EXE instalado; los switches de depuración son exclusivos del ensayo.

| Caso | Resultado correcto |
| --- | --- |
| I01 | NSIS base instalado con código 0; ASAR esperado comprobado. |
| I02 | Arranque en configuración con perfil nuevo y usuario SQL vacío. |
| I03 | Configuración comprobada/guardada y login por formularios reales. |
| I04 | Pareja, categoría/estilo y dos fotos guardados con SQL/decodificador nativos. |
| I05 | Evaluación definitiva y cierre de la base. |
| U01 | NSIS compilado actualiza la misma identidad de laboratorio; ASAR correcto. |
| U02 | Configuración y ambas fotos preservadas byte a byte por SHA-256. |
| U03 | EXE usa file, require no expuesto, preload presente y origen dev inválido ignorado. |
| U04 | Consulta recupera pareja y evaluación anteriores a actualizar. |
| U05 | Modificación de pareja después de actualizar confirmada. |
| U06 | Operador recibe FORBIDDEN al evaluar o crear cuentas. |
| U07 | Juez: reenvío idempotente, cambio rechazado, salida cancelada/confirmada. |
| U08 | Reinicio recupera configuración y modificación persistida. |
| U09 | PDF real desde EXE instalado mediante diálogo nativo. |

**INSTALACION_ACTUALIZACION_LAB_OK**, 14 casos en resultados.json y
`.tmp/f1-06/ejecucion-final.log`. PDF parejas-instalado.pdf: 1497 bytes,
cabecera PDF y SHA-256 `1e11b55edf63dad13460cb8a5f20f062515a634d57428bfa443c995b442cbe88`.
El diálogo ya se había cerrado al intentar capturarlo; se recogió la ruta
devuelta por el controlador y se copió el documento al laboratorio conservando
el original. No se declara revisión completa de su diagramación.

Dos intentos iniciales corrigieron el arnés, no el producto: normalización de
file:///C:/ y espera del DOM/API. Los perfiles ficticios aún vacíos se respaldaron
y se crearon servidores nuevos. No se relajaron guards ni se cambiaron fuentes.
El EVALUATION_EXISTS posterior es el rechazo esperado del cambio de nota.

### Independencia y retirada

Se copió el EXE instalado a un temporal fuera del proyecto; se confirmó ausencia
de node_modules en sus ancestros y se arrancó con PATH solo System32,
NODE_PATH/NODE_OPTIONS vacíos. Node es necesario para el supervisor, no para
ejecutar el producto. Tras login se desactivó la red del renderer mediante CDP
y se recargó el menú: tres fuentes, portada y video 1920×1080 locales cargaron,
pausa en 0 y reproducción manual correctas; consulta MySQL local correcta.
**EXE_INDEPENDIENTE_OFFLINE_OK** en independencia.json y
`.tmp/f1-06/independencia.log`; captura menu-independiente-offline.png.
No equivale a una PC limpia ni a desconectar toda la red del host.

La primera captura del menú se tomó durante su animación y no se usa para
comparar paridad. La paridad a 1280×960 conserva el ensayo de F1-05.
La copia temporal externa se retiró tras comprobar ruta absoluta, padre y
prefijo propios. Se desinstaló solo la identidad de laboratorio sin borrar sus
datos: **LAB_RETIRADO_OK**, retirada.json; EXE ausente y configuración conservada.
NSIS devuelve 0 desde su stub antes de terminar el proceso interno; la
comprobación final esperó la ausencia efectiva del EXE. MySQL terminó con
SHUTDOWN normal; datos y perfiles ficticios quedan conservados para auditoría.

### Autoevaluación y cierre propuesto

Arquitectura: EXE independiente de fuentes. Seguridad: permisos/preload reales,
recursos locales y aislamiento del evento. Rendimiento: sin medidas nuevas de
capacidad. Calidad: persistencia y reemplazo nativo comprobados sin cambios de
producto. Dependencias/distribución: NSIS ensayado con identidad de laboratorio;
identidad final/PC limpia pendientes. QA: 14 casos nativos, offline e independencia.

La regresión 256/256 y smoke de F1-05 son evidencia previa, no se repitieron sin
cambios de producto. No se hizo commit, push, merge ni apertura de Fase 2.
La [propuesta de cierre técnico](cierre-fase-1.md) requiere aceptar el alcance
del laboratorio y mantener identidad final como pendiente operativo, o conservar
Fase 1 abierta hasta contar con otra cuenta/PC. No se infiere aceptación del usuario.

Decisión posterior del usuario: **«Mantener Fase 1 abierta hasta probar identidad
final»**. No se adopta el cierre reducido. El [control de cierre](cierre-fase-1.md)
registra esa puerta obligatoria y el kit de instaladores preparado en
`.tmp/f1-06/kit-identidad-final/`, con hashes y hoja de resultados. La evidencia
de laboratorio queda correcta y complementaria; Fase 2 no iniciada. Worktree de
base limpio, sin procesos del laboratorio y hash del instalador F1-05 intacto,
confirmados al terminar. No hubo cambios adicionales de código de producto.

## Checkpoint de avance para validación de integración — 19 de octubre de 2026

Necesidad: los avances de F1-05/06 y sus constancias siguen sin commit sobre
`a9880cffccce769fb498cbeb9f6501be1585e995`. El usuario solicita guardarlos en la
rama correspondiente y dejar explícito que **Fase 1 está en validación de su
integración; se realizarán pruebas antes de cerrarla y pasar a Fase 2**.

Alcance del checkpoint: conservar los 15 archivos de avance en
`codex/fase-1-vite`, incluyendo distribución desde build/app, verificador ASAR,
pruebas de distribución, sincronización del viewport, constancias y control de
cierre. No se añaden cambios funcionales en este acto. Aceptación de este bloque
de control: commit revisable con ese estado explícito, sin declarar la fase
cerrada ni autorizar su promoción a main.

Comprobaciones de preparación: diff y selección de archivos revisados, enlaces
locales comprobados y artefactos anteriores recontrastados mediante el verificador
de paquete. El ASAR sigue coincidiendo byte a byte con build/app y con la auditoría
guardada: diez vistas, un video y huella de aplicación
`2c0670f0c9877b516197f4118e28b26c23e5bc7e988060fd6d0ce54046905c4d`.
El instalador conserva SHA-256
`9b6ac198b1f7d0f4ec27812745861f9f69d4d10739926f3fbd49e2c78b05fa76`.
Este contraste es de solo lectura; no vuelve a generar ni instalar el paquete.

Las 256/256 pruebas, los smoke y los ensayos nativos registrados el 18 conservan
su fecha y alcance. No se reejecutan por preparar este commit ni se presentan
como resultados nuevos del 19. Tampoco se copian al repositorio los lotes de
evidencias externas, datos personales, configuraciones ni artefactos generados.

Siguiente acción: ejecutar y registrar las pruebas pendientes sobre el candidato
guardado, en particular primera instalación y actualización con identidad final
en el entorno separado indicado por el [control de cierre](cierre-fase-1.md).
Después de comprobar la integración y obtener aceptación se decidirá el cierre
de Fase 1; Fase 2 permanece sin iniciar.

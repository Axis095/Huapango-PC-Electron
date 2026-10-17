# Fase 1 — Bitácora de compilación y convivencia

Fecha de inicio: 17 de octubre de 2026. Referencia recuperable: `98331dc`.
Entrada técnica: pase F0-18 del [control de cierre](cierre-fase-0.md).
Estado: **primera entrega verificada; segunda guardada con paridad dev pendiente;
distribución pendiente**, sin retirada de vistas
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
prefiere ensayarlo antes de fusionar. Hay un acceso visible abierto con perfil,
MySQL y fotos ficticias separados; preparar el entorno no constituye completar
el recorrido ni obtener aceptación. `main` permanece en `7de3b2e`.

Siguiente acción: recoger el resultado del ensayo de la base; diagnosticar tamaño
nativo, viewport, escala y zoom del smoke Vite antes de modificar producción.
F1-05/06 y el cierre de Fase 1 siguen pendientes. Esta actualización posterior
solo cambia documentación y no presenta una nueva ejecución de pruebas de código.

# Fase 1 — Bitácora de compilación y convivencia

Fecha de inicio: 17 de octubre de 2026. Referencia recuperable: `98331dc`.
Entrada técnica: pase F0-18 del [control de cierre](cierre-fase-0.md).
Estado: **primera entrega verificada; segunda pendiente**, sin retirada de vistas
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

Siguiente entrega **F1-03/04**: centralizar identificación de vistas para Main,
IPC y borradores; incorporar Vite multipágina con origen de desarrollo exacto,
pruebas negativas y recursos locales en producción. No introducir React todavía.

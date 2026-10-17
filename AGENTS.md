# Instrucciones para trabajar en Huapango-PC-Electron

## Propósito y comunicación

Aplicación de escritorio para registrar parejas, administrar categorías y estilos,
capturar evaluaciones y generar reportes de un evento de huapango.
Comunícate en español. Explica qué cambió, cómo se verificó y qué queda pendiente.

## Contexto que debes consultar

Antes de modificar código:

1. Lee `README.md` y `package.json` para conocer la entrada y los comandos vigentes.
2. Consulta `docs/migracion/README.md` y `docs/migracion/cierre-fase-0.md` para
   identificar el estado vigente, sus evidencias y las puertas de salida.
3. Lee la bitácora del bloque relacionado con la tarea y los módulos afectados.
4. Revisa `git status --short` y el diff pertinente: puede haber trabajo previo
   sin commit. Consérvalo y limita los cambios al alcance solicitado.

Los documentos de migración contienen el avance entre sesiones. Las cifras y
resultados allí registrados son evidencia histórica; no afirman que las pruebas
se hayan ejecutado sobre los cambios de la sesión actual. Si encuentras estados
contradictorios, revisa la evidencia y señala la discrepancia.

## Mapa del código

- `main.js`: proceso principal de Electron, ventanas y registro de canales IPC.
- `preload.js`: API expuesta al renderizador mediante `contextBridge`.
- `Vistas/`, `Public/js/`, `Public/css/`: interfaz HTML, JavaScript y estilos.
- `Controladores/`: atención de operaciones y respuestas hacia la interfaz.
- `Modelos/`, `db.js`: acceso a MySQL y conexión.
- `Seguridad/`: permisos IPC, identidad, datos y tratamiento de errores.
- `Servicios/`: lógica compartida de servicios.
- `sql/`: scripts SQL; `tests/` y `scripts/`: pruebas y laboratorios.
- `electron/main.cts`, `tsconfig.main.json`: entrada TypeScript y compilación
  gradual; `build/app` es salida generada, separada de instaladores en `dist`.

El código usa principalmente JavaScript con CommonJS y una entrada TypeScript de
Fase 1. Conserva las convenciones y capitalización de rutas. Consulta la bitácora
de Fase 1 antes de ampliar TypeScript/Vite o modificar la resolución de vistas;
la compilación gradual no significa que los contratos del legado estén tipados.

## Límites y criterios del proyecto

- Mantén la separación entre renderizador, preload y proceso principal. La
  interfaz usa la API del preload; valida datos y permisos en el límite confiable.
- No debilites permisos, validaciones ni integridad para hacer pasar una prueba.
- No incluyas credenciales, configuración privada, datos del evento ni fotos
  personales en código, documentación, fixtures o logs.
- Usa datos ficticios y una base aislada para pruebas de escritura. El laboratorio
  de integración no debe modificar la base del evento ni el servicio instalado.
- Mantén las decisiones y puertas de salida documentadas de la migración.
  No marques una fase como cerrada ni avances por asumir que pruebas parciales
  cubren el ensayo funcional o la instalación.
- Evita actualizar dependencias o reformatear módulos ajenos al objetivo de la
  tarea. Si la tarea requiere cambiar dependencias, explica el motivo y valida
  los flujos afectados.

## Comandos y verificación

Desde la raíz, en PowerShell, usa `npm.cmd`. La versión de Node requerida está
en `package.json` (`engines`).

| Comando | Uso |
| --- | --- |
| `npm.cmd start` | Abrir la aplicación; puede usar la configuración local |
| `npm.cmd run compile:main` | Generar el árbol de ensayo en build/app |
| `npm.cmd run typecheck` | Comprobar la configuración y entradas TypeScript actuales |
| `npm.cmd run start:compiled` | Abrir build/app; usa configuración local |
| `npm.cmd test` | Regresión con el ejecutor de pruebas de Node |
| `npm.cmd run test:smoke` | Smoke con Electron real y SQL simulado |
| `npm.cmd run test:integration` | Laboratorio MySQL desechable; revisar sus requisitos antes de ejecutarlo |
| `npm.cmd run build` | Generar la distribución con electron-builder |

Para cambios de código, ejecuta las pruebas pertinentes y la regresión completa.
Añade smoke al modificar ventanas, IPC, preload, vistas o arranque; integración
aislada al cambiar SQL, transacciones o concurrencia; build al cambiar distribución.
Para cambios exclusivamente documentales, revisa contenido, enlaces locales y diff.
No hace falta abrir la aplicación ni ejecutar pruebas de código por editar Markdown.

Una prueba con mocks no certifica MySQL real; el smoke no certifica instalación.
Si un comando falla o no puede ejecutarse, registra el motivo y la validación
pendiente. No presentes una comprobación histórica como resultado de esta sesión.

## Objetivo y aceptación de la migración

La migración debe mejorar seguridad, mantenibilidad y confiabilidad conservando
los flujos y la presentación aprobados por el usuario. No introducir rediseños
ni cambios de comportamiento ajenos al bloque solicitado.

Antes de cada bloque:

- Consultar la auditoría vigente y su matriz de hallazgos desde el índice de
  docs/migracion/README.md, además del control de cierre.
- Identificar el hallazgo o regresión atendidos, el comportamiento que debe
  conservarse y la evidencia necesaria para aceptar el cambio.
- Respetar las decisiones funcionales documentadas; si existe una contradicción,
  señalarla antes de cambiar el comportamiento afectado.

Para cambios visuales o de interacción, comparar con la referencia aprobada
usando iguales dimensiones, escala, zoom y rol. Verificar recursos sin internet
y comportamiento en la aplicación empaquetada. Las pruebas unitarias no
sustituyen esta comparación.

Mantener trazabilidad entre hallazgo, modificación, prueba y resultado.
Registrar por separado: implementado, verificado automáticamente, validado
manualmente y aceptado por el usuario. No tratar pendientes como aprobados.

El visto bueno de un bloque no cierra una fase. Antes de avanzar, comprobar
las puertas de salida y actualizar la evaluación de arquitectura, seguridad,
rendimiento, calidad, dependencias/distribución y pruebas.

Las referencias antiguas indicadas como solo lectura no se modifican.
El progreso, las decisiones y la evidencia se guardan en docs/migracion;
AGENTS.md contiene únicamente las reglas estables para consultarlos y actuar.

## Continuidad entre sesiones

Para cambios de la migración, sigue el método de `docs/migracion/README.md`:
registra defecto, evidencia, alcance y aceptación antes de editar; después añade
cambio, comprobaciones ejecutadas, limitaciones y siguiente acción concreta.
Actualiza el índice o control de cierre cuando cambie el estado de un bloque.

Mantén este archivo breve y centrado en instrucciones estables. Guarda el avance
y las decisiones específicas en `docs/migracion/`, con enlaces a su evidencia.
Actualiza este archivo cuando cambien arquitectura, comandos o reglas del proyecto.

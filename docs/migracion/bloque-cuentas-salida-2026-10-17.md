# F0-15 — Revisión de alta de cuentas y salida del juez

Estado: correcciones verificadas automáticamente; repetición del usuario pendiente.
Fecha: 17 de octubre de 2026.

## Reporte, alcance y aceptación

El usuario reporta mayoría de pruebas exitosa, posible error al crear usuarios y
salida del juez sin acción. No especifica todavía el mensaje de alta ni el control
de salida. No convertir este reporte general en aprobación individual V01–F17.

Inspección: Resultados.html contiene un botón Salir sin ID ni evento asociado.
El alta de cuentas descarta los códigos de errores SQL, por lo que un duplicado
termina como mensaje genérico de conexión. Falta reproducir el formulario real.

Alcance: verificar alta en interfaz y modelo con datos ficticios, resolver los
defectos confirmados, conectar la salida de sesión con aislamiento y comprobar
que no interrumpe operaciones. Incorporar el bloque de AGENTS aprobado.

Aceptación: altas de los tres roles y reintentos comprensibles; duplicados sin
escrituras adicionales; salida confirmada/cancelada, acceso posterior sin heredar
sesión; regresión, smoke Electron y revisión de cobertura de la lista manual.
No modificar base del evento ni HuapBkp; conservar trabajo previo sin commit.

## Diagnóstico y cambios

El usuario confirmó el mensaje genérico: «No se pudo completar la operación.
Comprueba la conexión y consulta los datos antes de reintentar». No identifica
el error MySQL original; no se afirma que su cuenta tuviera un ID duplicado.

- adminModel conserva el error SQL; adminController devuelve código y mensaje
  sanitizado. Duplicados informan dato único existente; falta de permisos SQL
  tiene explicación propia. Ningún mensaje revela consulta, credencial o fila.
- El formulario real crea user/admin/juez, restablece campos solo al confirmar
  éxito, conserva datos en error y permite corregir/reintentar. Los roles son
  radios excluyentes; no se cambió el contrato ni se eliminaron restricciones.
- Resultados incluye Cerrar sesión, confirmación y cancelación. Se advierte sobre
  trabajo sin guardar de todas las ventanas. La API del preload y política IPC
  requieren sesión válida y emisor local; no se abre configuración privilegiada.
- La salida revalida la cuenta dentro de una operación reservada y solo procede
  si no hay otras operaciones activas. Reserva el cambio mientras carga login;
  luego revoca sesión y cierra ventanas anteriores. Si login no carga, conserva
  sesión/ventanas y permite reintento. Nuevas operaciones/navegación se rechazan
  durante la salida. Archivo → Salir sigue cerrando la aplicación.
- AGENTS.md incorpora el bloque aprobado de objetivo/aceptación. La evidencia
  histórica y los pendientes permanecen en docs/migracion, sin duplicarlos allí.

## Comprobaciones de esta sesión

- Regresión final: **245/245**, cero fallos, 947.0816 ms.
- Smoke de fuentes y ASAR: **VISUAL_OK, CUENTAS_SALIDA_OK y SMOKE_OK**.
  Formulario real, tres roles, duplicado, reintento, cancelación que conserva
  observaciones, confirmación que cierra la ventana y login sin sesión.
- Integración MySQL real en ambos esquemas temporales: **MYSQL_INTEGRACION_OK**.
  Alta y bcrypt de tres roles; ID/nombre duplicados rechazados sin fila adicional;
  además evaluación única, asignación, edición concurrente, rollback y borrado.
  Evidencia: .tmp/mysql-fase0-fmUJmP. Base y servicio del evento intactos.
- Build de laboratorio: código 0, sin cambios de dependencias. Smoke final del
  paquete con perfil .tmp/fase0-smoke-ija8pu; conserva fuentes/video verificados.
- Instalador: dist/HuapangoApp Setup 1.0.0.exe; SHA-256:
  85B1DDF8D8E4FED40038D63C9FFF9D5F47E73F76DACFE4381BA030E5DC082D00.
  Misma variante de laboratorio de F0-13; no certifica instalación ni firma.
- Diff y enlaces Markdown comprobados. No se hizo commit ni publicación.

## Autoevaluación y límites

Los primeros smoke de salida detectaron que el inventario nativo no incluía la
subclase usada para ocultar ventanas. Se corrigió el harness con las ventanas
reales observadas; se conserva el cierre nativo. También se evita esperar una
respuesta JavaScript de una ventana que se cierra. No se relajaron los permisos
ni se reemplazó el cierre real por mocks para obtener un resultado exitoso.

La [revisión de la lista V/F](revision-pruebas-2026-10-17.md) distingue cobertura
automática y ensayo manual pendiente. El alta fallida concreta de la instalación
requiere repetirse con esta versión para conocer el mensaje específico; no se
inspeccionaron credenciales ni datos privados para deducir su causa.
La mayoría exitosa reportada por el usuario no equivale a aprobar todos los casos.
Fase 0 sigue abierta, con los hallazgos generales pendientes de la auditoría.

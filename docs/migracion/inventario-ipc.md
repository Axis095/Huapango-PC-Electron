# Inventario IPC de Fase 0

Fuente: `Seguridad/ipc.js`. Actualizado el 2026-10-17.
Todos los canales requieren un frame principal de una ventana local reconocida.

| Canal | Permisos adicionales | Origen específico |
| --- | --- | --- |
| login | Sin sesión | login.html |
| cerrar-sesion | admin, user, juez; sin otras operaciones pendientes | Vista del catálogo local |
| get-role | Identidad actual; guest/null sin sesión | Vista del catálogo local |
| get-usuario-id | Identidad actual; guest/null sin sesión | Vista del catálogo local |
| obtener-configuracion | Sin sesión o admin | configuracionBD.html |
| guardar-configuracion | Sin sesión o admin | configuracionBD.html |
| continuar-configuracion | Sin sesión o admin | configuracionBD.html |
| abrir-ventana-emergente | Sin sesión o admin | Vista del catálogo local |
| open-section | admin, user, juez | Vista del catálogo local |
| registrar-pareja | admin, user | Vista del catálogo local |
| actualizar-pareja-completa | admin, user | Vista del catálogo local |
| eliminar-pareja | admin | Vista del catálogo local |
| buscar-pareja-por-id | admin, user, juez | Vista del catálogo local |
| buscar-pareja-para-evaluacion | admin, juez | Vista del catálogo local |
| buscar-todas-las-parejas | admin, user, juez | Vista del catálogo local |
| registrar-categoria | admin, user | Vista del catálogo local |
| registrar-estilo | admin, user | Vista del catálogo local |
| buscar-categoria-por-id | admin, user, juez | Vista del catálogo local |
| buscar-estilo-por-id | admin, user, juez | Vista del catálogo local |
| actualizar-categoria | admin | Vista del catálogo local |
| eliminar-categoria | admin | Vista del catálogo local |
| actualizar-estilo | admin | Vista del catálogo local |
| eliminar-estilo | admin | Vista del catálogo local |
| crear-usuario | admin | Vista del catálogo local |
| eliminar-usuario | admin | Vista del catálogo local |
| obtener-rol-usuario | admin | Vista del catálogo local |
| registrar-evaluacion | admin, juez | Vista del catálogo local |
| obtener-evaluaciones-por-pareja | admin, juez | Vista del catálogo local |
| generar-pdf-resultados | admin, juez | Vista del catálogo local |
| generar-pdf-parejas | admin, user, juez | Vista del catálogo local |
| generar-pdf-categorias | admin, user, juez | Vista del catálogo local |
| generar-pdf-estilos | admin, user, juez | Vista del catálogo local |
| generar-pdf-registros-generales | admin, user, juez | Vista del catálogo local |
| obtener-borrador-registro | admin, user | Registros.html |
| obtener-borrador-modificacion | admin, user | ModificarParejas.html |
| guardar-borrador-registro | admin, user | Registros.html |
| guardar-borrador-modificacion | admin, user | ModificarParejas.html |
| limpiar-borrador-registro | admin, user | Registros.html |
| limpiar-borrador-modificacion | admin, user | ModificarParejas.html |

Los endpoints actualizar-categoria y actualizar-estilo devuelven UNSUPPORTED_OPERATION antes de SQL hasta validar esquema/contrato.
Los dos canales antiguos de imágenes se retiraron; el registro/modificación utilizan el servicio de fotos validado.

# Interfaz, apariencia y captura de fechas

Trabajo preparado en `feat/interfaz-modo-oscuro`, a partir de `fix-permisos-ipc` (`9dc0aa1`). No requiere migraciones de MySQL ni dependencias nuevas.

## Cambios

- Barra de navegación compartida con indicador de sección activa. Los botones privados conservan `hidden` y `disabled` hasta que se verifica el rol.
- Opciones **Sistema**, **Claro** y **Oscuro**, disponibles también en login y configuración. La preferencia se conserva localmente en el perfil de Electron; no contiene datos de participantes ni credenciales. Si el almacenamiento no está disponible, se aplica durante esa ventana.
- Paleta azul grisácea, degradado de fondo tenue, bordes discretos y fuentes locales para trabajar sin Internet.
- Registro agrupado por participante. Se conservan los identificadores de los campos y la lógica de validación, guardado y borradores.
- Calendario HTML para fechas de nacimiento en registro y ficha de edición: escribir año, seleccionar mes y día; también se mantiene la escritura directa en el campo original. Rechaza días futuros, contempla años bisiestos y respeta campos bloqueados o de solo lectura.
- El calendario permite flechas, Inicio/Fin y RePág/AvPág al enfocar un día. Enter en el año lleva a la cuadrícula. Escape o Cancelar cierran sin cambiar la fecha; elegir un día devuelve el foco al campo y notifica al borrador mediante los eventos habituales.

## Vista previa aislada

Carpeta de trabajo local: `C:\Users\santi\Documents\Codex\huapango-interfaz`.

En una terminal situada en esa carpeta:

```powershell
npm.cmd run preview:ui
```

Abrir en el navegador `http://127.0.0.1:4320/Vistas/Registros.html`. Para abrirla dentro de Electron, con las dependencias instaladas en esta carpeta, ejecutar en otra terminal:

```powershell
npm.cmd run preview:electron
```

El menú nativo **Vista previa** permite cambiar pantalla, rol simulado y tamaño de ventana. El servidor solo escucha en localhost y no importa MySQL ni la configuración real. Las operaciones de guardado/exportación se rechazan deliberadamente. Los borradores de texto son simulados y no sirven para verificar persistencia de fotografías ni permisos reales.

La ventana de demostración usa un perfil propio en `huapango-interfaz-preview-datos`, junto a la carpeta del proyecto. Cerrar la ventana y detener el servidor con Ctrl+C al terminar. Las herramientas de vista previa se excluyen del paquete final.

`npm.cmd start` sigue siendo el programa real: usa su configuración y datos habituales. Para la revisión visual aislada utilizar los comandos de vista previa anteriores.

## Comprobaciones antes de integrar

- [ ] Revisar registro, búsqueda/edición, evaluaciones, administración, login y configuración en Claro y Oscuro.
- [ ] Cambiar tema con datos escritos: ningún campo debe perder su contenido. Navegar y volver; comprobar que se mantiene el tema y se recupera el borrador.
- [ ] Cerrar y reabrir la aplicación: debe conservarse el tema elegido. Con Sistema, seguir los cambios de apariencia de Windows.
- [ ] Elegir 29/02/2000 y 29/02/2024; comprobar que febrero de 1900 y 2025 solo tienen 28 días.
- [ ] Escribir una fecha directamente, reabrir el calendario y comprobar la selección. Cancelar y Escape deben conservarla; Borrar fecha debe vaciar únicamente ese campo.
- [ ] Intentar seleccionar una fecha futura; comprobar también el mensaje de año vacío o inválido.
- [ ] Cambiar de módulo con una fecha elegida y regresar: debe seguir en el borrador. Probar un error de validación y continuar escribiendo sin perder foco.
- [ ] En búsqueda, comprobar que los calendarios permanecen bloqueados hasta activar edición. Guardar y verificar las fechas con una base de pruebas.
- [ ] Con cada rol, comprobar los botones visibles y probar consultas/guardados con la aplicación real sobre una base de pruebas.
- [ ] Probar 800 × 600 y 1280 × 900, desplazamiento vertical y navegación con Tab; todas las acciones deben ser alcanzables.

Pruebas automatizadas nuevas: fechas locales y bisiestos; preferencia de tema, cambios del sistema, sincronización de ventanas y almacenamiento no disponible. La comprobación visual usa una API simulada; no sustituye la prueba funcional con MySQL antes de integrar.

# Salir de la sesión desde la barra

El botón **Salir** usa el mismo estilo de la navegación en ambos temas. Vuelve al
login sin cerrar la aplicación y exige dos confirmaciones HTML consecutivas:

1. **Sí, continuar**: confirma la intención de cerrar sesión.
2. **Sí, cerrar sesión**: confirma que se descarten los borradores y cambios sin guardar.

Cancelar o pulsar Escape en cualquiera de los pasos conserva la sesión, los campos
y el foco del teclado. Los registros confirmados en MySQL no se eliminan.
La salida afecta a todas las ventanas de la cuenta, incluidas las consultas emergentes.

El canal `cerrar-sesion` valida la sesión y la ventana en el proceso principal.
Rechaza ventanas ajenas, antiguas, subframes y la pantalla de login. Una operación
IPC de negocio pendiente o una configuración en curso impide salir. Durante la
apertura del login se rechazan nuevos envíos de negocio y nuevos inicios de sesión.
Si el login no carga, la sesión y sus formularios siguen abiertos para reintentar.

La **X**, **Alt+F4** y **Archivo → Salir / Ctrl+Q** muestran una sola confirmación
HTML antes de cerrar. Cancelar o pulsar Escape conserva la ventana y sus datos.
Cerrar la ventana principal termina la aplicación y sus ventanas auxiliares;
cerrar una consulta o la configuración solo cierra esa ventana. El login también
pide confirmación cuando el usuario intenta cerrarlo manualmente.

Los cierres automáticos del login y del cambio de sesión no añaden avisos.
`responder-cierre-ventana` exige una petición pendiente de esa misma ventana,
documento y sesión, con un identificador generado por el proceso principal.
Una respuesta repetida, antigua o enviada por otra ventana no permite cerrar.
Si hay operaciones pendientes, se conserva la ventana y se pide esperar.

## Comprobación manual antes del commit

- Probar con usuario, juez y administrador en los módulos que tiene cada rol.
- Escribir datos sin guardar, pulsar Salir y cancelar el primer paso. Seguir escribiendo.
- Repetir, aceptar el primer paso y cancelar el segundo; comprobar que siguen los datos.
- Probar Escape en ambos pasos y comprobar que no se cierra la sesión.
- Aceptar ambos pasos: debe abrirse el login y cerrarse la ventana de la cuenta anterior.
- Iniciar sesión con otra cuenta: comprobar su nombre, sus permisos y sus borradores vacíos.
- Comprobar ambos temas y que varios clics no abran confirmaciones duplicadas.
- Durante un guardado o una exportación, esperar a que termine antes de salir.
- Con datos sin guardar, probar X y Alt+F4: cancelar y Escape deben permitir seguir escribiendo.
- Confirmar la X: debe aparecer un solo aviso y cerrarse la aplicación.
- Repetir en una consulta emergente: solo debe cerrarse esa ventana.
- Confirmar las dos preguntas del botón Salir: debe volver al login sin un tercer aviso.

Las pruebas automatizadas simulan ventanas, formularios y consultas; no modifican MySQL.

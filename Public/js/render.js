import { validarDatosPareja, validarDatosCategoria, validarDatosModificarPareja, validarEvaluacion } from "./validaciones.js";
import { validarIDPareja, validarDatosEstilo, validarIDCategoria, validarIDEstilo, validarDatosUsuario, validarDatosEliminarUsuario } from "./validaciones.js";
import { inicializarBusquedaEvaluacion } from "./busquedaEvaluacion.js";
import { inicializarBusquedaParejas } from "./busquedaParejas.js";
import { inicializarRegistros } from "./registroParejas.js";
import { mostrarAviso, confirmarEliminacion, ejecutarAccion } from "./avisos.js";

// Detectar si la ventana es emergente (por query string)
const params = new URLSearchParams(window.location.search);
const esEmergente = params.get("emergente") === "1";

if (esEmergente) {
    // Oculta la barra de navegación solo en la ventana emergente
    document.addEventListener("DOMContentLoaded", () => {
        const menu = document.querySelector('.menu');
        if (menu) menu.style.display = "none";
    });
}

// Escuchar el evento DOMContentLoaded para inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
    // Configurar los botones del menú
    configurarMenu();
    configurarMenuConScroll();

    // Asociar eventos a las secciones del menú
    // document.getElementById("btnIndex").addEventListener("click", () => cargarVista("MenuPrincipal"));
    // document.getElementById("btnRegistros").addEventListener("click", () => cargarVista("Registros", inicializarRegistros));
    // document.getElementById("btnParejas").addEventListener("click", () => cargarVista("RegistroCategoriasEstilos", inicializarParejas));
    // document.getElementById("btnResultados").addEventListener("click", () => cargarVista("Resultados", inicializarResultados));
    // document.getElementById("btnBusquedaParejas").addEventListener("click", () => cargarVista("BusquedaParejas", inicializarBusquedaParejas));
    // document.getElementById("btnModificarParejas").addEventListener("click", () => cargarVista("ModificarParejas", inicializarModificarParejas));
    // document.getElementById("btnAdministrador").addEventListener("click", () => cargarVista("Administrador", incializaAdministrador));
    // document.getElementById("btnRegreso").addEventListener("click", () => cargarVista("MenuPrincipal"));

    // Cargar la vista inicial
    // cargarVista("MenuPrincipal");
    // Navegación directa entre vistas
    // document.getElementById("btnIndex")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/MenuPrincipal.html";
    // });
    // document.getElementById("btnRegistros")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/Registros.html";
    // });
    // // document.getElementById("btnParejas")?.addEventListener("click", () => { //Si se requiere su uso o cargarlo aparte se puede descomentar y la logica ya esta aplicada en este archivo
    // //     window.location.href = "../Vistas/RegistroCategoriasEstilos.html";
    // // });
    // document.getElementById("btnResultados")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/Resultados.html";
    // });
    // document.getElementById("btnBusquedaParejas")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/BusquedaParejas.html";
    // });
    // document.getElementById("btnModificarParejas")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/ModificarParejas.html";
    // });
    // document.getElementById("btnAdministrador")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/Administrador.html";
    // });
    // document.getElementById("btnRegreso")?.addEventListener("click", () => {
    //     window.location.href = "../Vistas/MenuPrincipal.html";
    // });

        document.getElementById("btnIndex")?.addEventListener("click", () => {
        window.location.href = "../Vistas/MenuPrincipal.html";
    });
    document.getElementById("btnRegistros")?.addEventListener("click", () => {
        window.location.href = "../Vistas/Registros.html";
    });
    document.getElementById("btnResultados")?.addEventListener("click", () => {
        window.location.href = "../Vistas/Resultados.html";
    });
    document.getElementById("btnBusquedaParejas")?.addEventListener("click", () => {
        window.location.href = "../Vistas/BusquedaParejas.html";
    });
    document.getElementById("btnModificarParejas")?.addEventListener("click", () => {
        window.location.href = "../Vistas/ModificarParejas.html";
    });
    document.getElementById("btnAdministrador")?.addEventListener("click", () => {
        window.location.href = "../Vistas/Administrador.html";
    });
    document.getElementById("btnRegreso")?.addEventListener("click", () => {
        window.location.href = "../Vistas/MenuPrincipal.html";
    });

        // Detectar la vista actual y ejecutar la inicialización correspondiente
    const ruta = window.location.pathname;
    if (ruta.endsWith("Registros.html")) {
        inicializarRegistros();
    } else if (ruta.endsWith("RegistroCategoriasEstilos.html")) {
        inicializarParejas();
    } else if (ruta.endsWith("Resultados.html")) {
        inicializarResultados();
    } else if (ruta.endsWith("BusquedaParejas.html")) {
        inicializarBusquedaParejas();
    } else if (ruta.endsWith("ModificarParejas.html")) {
        inicializarModificarParejas();
    } else if (ruta.endsWith("Administrador.html")) {
        inicializaAdministrador();
    }
});

// Oculta la barra mientras se recorre el contenido y la devuelve al inicio.
function configurarMenuConScroll() {
    const menu = document.querySelector('.menu');
    if (!menu || esEmergente) return;

    const actualizarVisibilidad = () => {
        menu.classList.toggle('menu-hidden', window.scrollY > 8);
    };

    window.addEventListener('scroll', actualizarVisibilidad, { passive: true });
    actualizarVisibilidad();
}

// Función para configurar el menú según el rol del usuario
async function configurarMenu() {
    try {
        const userRole = await window.api.getUserRole(); // Obtener el rol del usuario desde el proceso principal
        console.log(`Rol recibido: ${userRole}`);

        // Configurar visibilidad de botones según el rol
        const btnAdministrador = document.getElementById("btnAdministrador");
        const btnResultados = document.getElementById("btnResultados");
        const btnRegistros = document.getElementById("btnRegistros");
        const btnBusquedaParejas = document.getElementById("btnBusquedaParejas");
        // const btnParejas = document.getElementById("btnParejas");
        const btnModificarParejas = document.getElementById("btnModificarParejas");

        if (btnAdministrador && btnResultados && btnRegistros && btnBusquedaParejas) {
            if (userRole === "admin") {
                btnAdministrador.style.display = "block";
                btnResultados.style.display = "block";
                btnRegistros.style.display = "block";
                btnBusquedaParejas.style.display = "block";
            } else if (userRole === "user") {
                btnAdministrador.style.display = "none";
                btnResultados.style.display = "none";
                btnRegistros.style.display = "block";
                btnBusquedaParejas.style.display = "block";
            } else if (userRole === "juez") {
                btnAdministrador.style.display = "none";
                btnResultados.style.display = "block";
                btnRegistros.style.display = "none";
                btnBusquedaParejas.style.display = "none";
                // btnParejas.style.display = "none";
                btnModificarParejas.style.display = "none";
            }
        } else {
            console.warn("Los botones no se encontraron en el DOM.");
        }
    } catch (err) {
        console.error("Error al configurar el menú:", err);
    }
}



// Función para cargar vistas dinámicamente
// function cargarVista(archivo, callback) {
//     const ruta = `../Vistas/${archivo}.html`;
//     console.log(`Intentando cargar: ${ruta}`);
//     fetch(ruta)
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`No se pudo cargar el archivo HTML: ${response.statusText}`);
//             }
//             return response.text();
//         })
//         .then(html => {
//             const content = document.getElementById("content");
//             if (content) {
//                 content.innerHTML = html;
//                 if (callback) callback(); // Ejecutar lógica adicional después de cargar la vista
//             } else {
//                 console.error("No se encontró el contenedor con ID 'content'.");
//             }
//         })
//         .catch(error => {
//             console.error("Error al cargar la vista:", error);
//         });
// }

// Inicializar la lógica para la sección de Registros
// Inicializar la lógica para la sección de Parejas
function inicializarParejas() {
    document.getElementById("btnRegistrarCategoria")?.addEventListener("click", registrarCategoria);
    document.getElementById("btnRegistrarEstilo")?.addEventListener("click", registrarEstilo);
    vincularPDF("btnGenerarPDFCategorias", "generarPDFCategorias");
    vincularPDF("btnGenerarPDFEstilos", "generarPDFEstilos");
}

// Función para registrar una categoría
async function registrarCategoria() {
    return ejecutarAccion("btnRegistrarCategoria", async () => {
        try {
            const datos = {
                nIDCategoria: document.getElementById("nIDCategoria").value.trim(),
                cCategoriaNombre: document.getElementById("categoriaRegistro").options[document.getElementById("categoriaRegistro").selectedIndex].text,
                nParejaID: document.getElementById("nParejaID").value.trim()
            };

            validarDatosCategoria(datos); // Usamos la validación externa en `validaciones.js`

            console.log("Enviando datos al backend:", datos);

            const response = await window.api.registrarCategoria(datos);
            mostrarAviso(response.success ? "Categoría registrada exitosamente." : "Error: " + response.error);
        } catch (err) {
            console.error("Error al registrar categoría:", err);
            mostrarAviso("" + err.message);
        }
    });
}


// Función para registrar un estilo
async function registrarEstilo() {
    return ejecutarAccion("btnRegistrarEstilo", async () => {
        try {
            const nEstiloInput = document.getElementById("nEstiloID");
            if (!nEstiloInput) {
                console.error("Error: No se encontró el elemento con ID 'nEstiloID'.");
                mostrarAviso("Error: No se encontró el campo para ingresar el ID del estilo.");
                return;
            }

            const estiloSelect = document.getElementById("estiloRegistro");
            const nEstiloID = nEstiloInput.value.trim(); // ID del estilo ingresado manualmente
            const cEstiloNombre = estiloSelect.options[estiloSelect.selectedIndex].text;
            const nParejaID = document.getElementById("nParejaIDEstilo").value.trim();

            validarDatosEstilo({ nEstiloID, cEstiloNombre, nParejaID });

            console.log("Enviando datos al backend:", { nEstiloID, cEstiloNombre, nParejaID });

            const response = await window.api.registrarEstilo({ nEstiloID, cEstiloNombre, nParejaID });

            mostrarAviso(response.success ? "Estilo registrado exitosamente." : "Error: " + response.error);
        } catch (err) {
            console.error("Error al registrar estilo:", err);
            mostrarAviso("" + err.message);
        }
    });
}



function inicializarModificarParejas() {
    document.getElementById("BTNUpdate")?.addEventListener("click", modificarPareja);
}


function inicializarResultados() {
    console.log("Inicializando sistema de evaluación de parejas...");

    //  Vincular evento del botón de búsqueda en evaluación
    const btnBuscarPareja = document.getElementById("buscar-pareja");
    if (btnBuscarPareja) {
        inicializarBusquedaEvaluacion();
    } else {
        console.error("No se encontró el botón con la ID 'buscar-pareja'.");
    }

    //  Vincular evento del botón de guardar evaluación
    const btnGuardarEvaluacion = document.getElementById("guardar-evaluacion");
    if (btnGuardarEvaluacion) {
        btnGuardarEvaluacion.addEventListener("click", guardarEvaluacion);
    } else {
        console.error("No se encontró el botón con la ID 'guardar-evaluacion'.");
    }

    vincularPDF("btnGenerarPDFResultados", "generarPDFResultados");

    //  Función para actualizar los elementos evitando errores
    function actualizarElemento(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor || "--";
        } else {
            console.error(`No se encontró el elemento con ID '${id}'`);
        }
    }

    //  Seleccionar todos los inputs de tipo range y contenedores de valores
    const aspectos = document.querySelectorAll(".rango-aspecto");

    function actualizarTotal() {
        let total = 0;

        aspectos.forEach((input) => {
            const id = input.id.replace("aspecto", "valor-aspecto");
            const valor = parseInt(input.value, 10);
            total += valor;

            // Actualizar el número junto al slider
            actualizarElemento(id, valor);
        });

        // Actualizar el puntaje total
        actualizarElemento("puntaje-total", total);
    }

    //  Vincular eventos de actualización de sliders
    aspectos.forEach((input) => {
        input.addEventListener("input", actualizarTotal);
    });

    //  Inicializar valores al cargar
    actualizarTotal();
}



function inicializaAdministrador() {
    document.getElementById("btnCrearUsuario")?.addEventListener("click", crearUsuario);
    document.getElementById("btnEliminarUsuario")?.addEventListener("click", eliminarUsuario);
    document.getElementById("btnEliminarPareja")?.addEventListener("click", eliminarPareja);
    vincularPDF("btnGenerarPDFRegistros", "generarPDFRegistrosGenerales");
}



async function guardarEvaluacion() {
    return ejecutarAccion("guardar-evaluacion", async () => {
        try {
            document.getElementById("pareja-id-info")?.innerText // LOG QUE LUEGO SE VA A BORRAR
            const nJuezID = await window.api.getUsuarioID(); // ID del juez desde la sesión
            const nParejaID = document.getElementById("pareja-id-info").innerText.trim(); //REVISAR EL MALDITO id

            if (!nJuezID || !nParejaID) {
                mostrarAviso("Error: No se ha identificado al juez o la pareja.");
                return;
            }

            const aspecto1 = document.getElementById("aspecto1").value;
            const aspecto2 = document.getElementById("aspecto2").value;
            const aspecto3 = document.getElementById("aspecto3").value;
            const aspecto4 = document.getElementById("aspecto4").value;
            const aspecto5 = document.getElementById("aspecto5").value;
            const aspecto6 = document.getElementById("aspecto6").value;
            const cComentario = document.getElementById("observaciones").value.trim();
            // Calcular el puntaje total
            const nPuntaje = parseInt(aspecto1) + parseInt(aspecto2) + parseInt(aspecto3) + parseInt(aspecto4) + parseInt(aspecto5) + parseInt(aspecto6);

            const datos = { nJuezID, nParejaID, nPuntaje, cComentario };

            console.log("nJuezID:", nJuezID, "nParejaID:", nParejaID);
            console.log("Datos de evaluación capturados:", datos);

            //  Validar antes de enviar
            const resultadoValidacion = validarEvaluacion(datos);
            if (!resultadoValidacion.success) {
                mostrarAviso(resultadoValidacion.error);
                return;
            }

            console.log("Enviando evaluación al backend:", datos);
            const response = await window.api.registrarEvaluacion(datos);

            mostrarAviso(response.success ? "Evaluación guardada exitosamente." : "Error: " + response.error);
        } catch (err) {
            console.error("Error al guardar evaluación:", err);
            mostrarAviso("" + err.message);
        }
    });
}


// Función para modificar una pareja
// async function modificarPareja() {
//     try {
//         console.log("Ejecutando modificarPareja...");

//         const inputFoto = document.getElementById("fotoMasculinoUpdate");
//         let oFoto = null;

//         if (inputFoto.files.length > 0) {
//             const file = inputFoto.files[0];

//             if (!file.path) {
//                 console.error("La imagen seleccionada no tiene una ruta válida.");
//                 return;
//             }

//             const rutaDestino = `C:/Proyecto/uploads/${file.name}`;
//             const resultado = await window.api.guardarImagen(file.path, rutaDestino);

//             if (resultado.success) {
//                 oFoto = resultado.ruta;
//             } else {
//                 console.error("Error al guardar la imagen:", resultado.error);
//                 oFoto = null;
//             }
//         }


//         // Capturar los datos del formulario
//         const datos = {
//             nParejaID: document.getElementById("nParejaID").value.trim(),
//             oFoto: oFoto ?? null, // Ahora `oFoto` se inicializa correctamente
//             dNacimiento: document.getElementById("fechaNacimientoMasculinoUpdate").value.trim(),
//             ISexo: "M",
//             nTelefono: document.getElementById("telefonoMasculinoUpdate").value.trim(),
//             cNombre: document.getElementById("nombreMasculinoUpdate").value.trim(),
//             cApellido: document.getElementById("apellidoMasculinoUpdate").value.trim(),
//             cEmail: document.getElementById("emailMasculinoUpdate").value.trim(),
//             cNombreM: document.getElementById("nombreFemeninoUpdate").value.trim(),
//             cApellidoM: document.getElementById("apellidoFemeninoUpdate").value.trim(),
//             dNacimientoM: document.getElementById("fechaNacimientoFemeninoUpdate").value.trim(),
//             nTelefonoM: document.getElementById("telefonoFemeninoUpdate").value.trim(),
//             cEmailM: document.getElementById("emailFemeninoUpdate").value.trim(),
//         };

//         console.log("Enviando solicitud de actualización con datos:", datos);
//         const response = await window.api.actualizarPareja(datos);

//         if (response.success) {
//         } else {
//         }
//     } catch (err) {
//         console.error("Error al actualizar pareja:", err);
//     }
// }

async function modificarPareja() {
    return ejecutarAccion("BTNUpdate", async () => {
        try {
            const nParejaID = document.getElementById("nParejaID").value.trim();
            if (!nParejaID) {
                mostrarAviso("El ID de la pareja es obligatorio");
                return;
            }

            // --- Guardar imagen masculina si hay nueva ---
            let oFotoMasculino = document.getElementById("fotoMasculinoActual")?.value || null;
            const inputFotoMasculino = document.getElementById("fotoMasculinoUpdate");
            if (inputFotoMasculino.files.length > 0) {
                const file = inputFotoMasculino.files[0];
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const rutaDestino = `uploads/${fileName}`;
                const arrayBuffer = await file.arrayBuffer();
                const resultado = await window.api.guardarImagenBuffer(arrayBuffer, rutaDestino);
                if (resultado.success) {
                    oFotoMasculino = rutaDestino;
                } else {
                    mostrarAviso(`Error al guardar imagen masculina: ${resultado.error}`);
                    return;
                }
            }

            // --- Guardar imagen femenina si hay nueva ---
            let oFotoFemenino = document.getElementById("fotoFemeninoActual")?.value || null;
            const inputFotoFemenino = document.getElementById("fotoFemeninoUpdate");
            if (inputFotoFemenino.files.length > 0) {
                const file = inputFotoFemenino.files[0];
                const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
                const rutaDestino = `uploads/${fileName}`;
                const arrayBuffer = await file.arrayBuffer();
                const resultado = await window.api.guardarImagenBuffer(arrayBuffer, rutaDestino);
                if (resultado.success) {
                    oFotoFemenino = rutaDestino;
                } else {
                    mostrarAviso(`Error al guardar imagen femenina: ${resultado.error}`);
                    return;
                }
            }

            // --- Preparar datos para el update ---
            const datos = {
                nParejaID,
                // Masculino
                cNombreMasculino: document.getElementById("nombreMasculinoUpdate").value.trim(),
                cApellidoMasculino: document.getElementById("apellidoMasculinoUpdate").value.trim(),
                cEmailMasculino: document.getElementById("emailMasculinoUpdate").value.trim(),
                nTelefonoMasculino: document.getElementById("telefonoMasculinoUpdate").value.trim(),
                dNacimientoMasculino: document.getElementById("fechaNacimientoMasculinoUpdate").value.trim(),
                oFotoMasculino,
                // Femenino
                cNombreFemenino: document.getElementById("nombreFemeninoUpdate").value.trim(),
                cApellidoFemenino: document.getElementById("apellidoFemeninoUpdate").value.trim(),
                cEmailFemenino: document.getElementById("emailFemeninoUpdate").value.trim(),
                nTelefonoFemenino: document.getElementById("telefonoFemeninoUpdate").value.trim(),
                dNacimientoFemenino: document.getElementById("fechaNacimientoFemeninoUpdate").value.trim(),
                oFotoFemenino
            };

            console.log("Enviando solicitud de actualización con datos:", datos);
            const response = await window.api.actualizarParejaCompleta(datos);

            if (response.success) {
                mostrarAviso("Pareja actualizada exitosamente.");
                // Recargar datos si es necesario
            } else {
                mostrarAviso("Error al actualizar pareja: " + response.error);
            }
        } catch (err) {
            mostrarAviso("Error: " + err.message);
        }
    });
}




// Crear un usuario
async function crearUsuario() {
    return ejecutarAccion("btnCrearUsuario", async () => {
        try {
            console.log("Ejecutando crearUsuario...");

            // Capturar los datos del formulario
            const nUsuarioID = document.getElementById("nuevoID").value.trim(); // ID manual del usuario
            const cNombreUsuario = document.getElementById("nuevoUsuario").value.trim();
            const cContrasena = document.getElementById("nuevaContrasena").value.trim();
            const esAdmin = document.getElementById("esAdmin").checked; // Checkbox de administrador
            const esJuez = document.getElementById("juez")?.checked || false; // Checkbox de juez

            // Validar que el ID sea un número positivo
            if (!nUsuarioID || isNaN(nUsuarioID) || parseInt(nUsuarioID) <= 0) {
                mostrarAviso("Debes ingresar un ID de usuario válido (número positivo).");
                return;
            }

            // Determinar el rol basado en los checkboxes
            let rol = "user"; // Valor por defecto
            if (esAdmin) rol = "admin";
            if (esJuez) rol = "juez"; // Si es juez, sobrescribe "admin"

            // Validar los datos
            validarDatosUsuario({ nUsuarioID, cNombreUsuario, cContrasena, rol });

            // Realizar la solicitud al backend
            const response = await window.api.crearUsuario({ nUsuarioID, cNombreUsuario, cContrasena, rol });

            if (response.success) {
                mostrarAviso("Usuario creado con éxito, ID: " + response.id);
                document.getElementById("nuevoID").value = "";
                document.getElementById("nuevoUsuario").value = "";
                document.getElementById("nuevaContrasena").value = "";
                document.getElementById("esAdmin").checked = false;
                if (document.getElementById("juez")) document.getElementById("juez").checked = false;
                document.getElementById("tipoUsuario").checked = true;
            } else {
                mostrarAviso("Error al crear usuario: " + response.error);
            }
        } catch (err) {
            console.error("Error al crear usuario:", err);
            mostrarAviso(`${err.message}`);
        }
    });
}

async function crearJuez() {
    return ejecutarAccion("btnCrearJuez", async () => {
        try {
            console.log("Ejecutando crearJuez...");

            // Capturar los datos específicos del juez
            const nUsuarioID = document.getElementById("nuevoJuezID").value.trim(); // Se mantiene igual
            const cNombreUsuario = document.getElementById("nuevoJuezUsuario").value.trim();
            const cContrasena = document.getElementById("nuevoJuezContrasena").value.trim();
            const esJuez = document.getElementById("juez").checked; // Checkbox para jueces

            // Validar que el ID sea un número positivo
            if (!nUsuarioID || isNaN(nUsuarioID) || parseInt(nUsuarioID) <= 0) {
                mostrarAviso("Debes ingresar un ID de usuario válido (número positivo).");
                return;
            }

            // Definir el rol correctamente
            let rol = "user"; // Por defecto es "user"
            if (esJuez) rol = "juez"; // Si se marca el checkbox de juez, asignar "juez"

            // Validar los datos
            validarDatosUsuario({ nUsuarioID, cNombreUsuario, cContrasena, rol });

            // Realizar la solicitud al backend
            const response = await window.api.crearUsuario({ nUsuarioID, cNombreUsuario, cContrasena, rol });

            if (response.success) {
                mostrarAviso("Juez creado con éxito, ID: " + response.id);
                document.getElementById("nuevoID").value = "";
                document.getElementById("nuevoJuezUsuario").value = "";
                document.getElementById("nuevoJuezContrasena").value = "";
                document.getElementById("juez").checked = false;
            } else {
                mostrarAviso("Error al crear juez: " + response.error);
            }
        } catch (err) {
            console.error("Error al crear juez:", err);
            mostrarAviso(`${err.message}`);
        }
    });
}

// document.getElementById("btnCrearUsuario").addEventListener("click", async () => {
//     try {
//         const cNombreUsuario = document.getElementById("nuevoUsuario").value;
//         const cContrasena = document.getElementById("nuevaContrasena").value;
//         const esAdmin = document.getElementById("esAdmin").checked;

//         if (!cNombreUsuario || !cContrasena) {
//             return;
//         }

//         const response = await window.api.crearUsuario({ cNombreUsuario, cContrasena, esAdmin });

//         if (response.success) {
//         } else {
//         }
//     } catch (err) {
//         console.error("Error al crear usuario:", err);
//     }
// });

// Eliminar un usuario
async function eliminarUsuario() {
    return ejecutarAccion("btnEliminarUsuario", async () => {
        try {
            console.log("Ejecutando eliminarUsuario...");

            const cNombreUsuario = document.getElementById("usuarioEliminar")?.value.trim();
            console.log(` Valor ingresado: '${cNombreUsuario}'`);

            if (!cNombreUsuario || cNombreUsuario.length < 3) {
                mostrarAviso("Debes ingresar un nombre de usuario válido (mínimo 3 caracteres).");
                return;
            }

            validarDatosEliminarUsuario({ cNombreUsuario });

            //  Consultar el rol antes de eliminar
            console.log(`Consultando rol del usuario: '${cNombreUsuario}'`);
            const rolUsuarioAEliminar = await window.api.obtenerRolUsuario(cNombreUsuario);
            console.log(`Rol obtenido: '${rolUsuarioAEliminar}'`);

            if (!rolUsuarioAEliminar) {
                mostrarAviso("Usuario no encontrado.");
                return;
            }

            //  Crear el mensaje de confirmación dinámico
            const confirmacion = await confirmarEliminacion(`¿Estás seguro de que deseas eliminar a "${cNombreUsuario}" (${rolUsuarioAEliminar})?`);
            if (!confirmacion) {
                mostrarAviso("Eliminación cancelada. No se cambió ningún registro.");
                return;
            }

            //  Enviar solicitud de eliminación
            console.log(`Eliminando usuario: '${cNombreUsuario}'`);
            const response = await window.api.eliminarUsuario(cNombreUsuario);
            console.log(` Respuesta del backend:`, response);

            if (response.success) {
                mostrarAviso(`${rolUsuarioAEliminar} eliminado con éxito.`);
                document.getElementById("usuarioEliminar").value = "";
            } else {
                mostrarAviso(response.message || response.error || "No se pudo eliminar el usuario.");
            }
        } catch (err) {
            console.error("Error al eliminar usuario:", err.message);
            mostrarAviso(`${err.message}`);
        }
    });
}






// Eliminar una pareja
async function eliminarPareja() {
    return ejecutarAccion("btnEliminarPareja", async () => {
        try {
            console.log("Ejecutando eliminarPareja...");

            // Capturar el ID de la pareja desde el formulario
            const nParejaID = document.getElementById("nParejaID").value.trim();

            if (!nParejaID) {
                mostrarAviso("Error: Debes ingresar un ID válido antes de eliminar.");
                return;
            }

            console.log("ID de pareja a eliminar:", nParejaID);

            // Validar el ID
            validarIDPareja(nParejaID);

            // Confirmar la eliminación
            const confirmacion = await confirmarEliminacion(`¿Eliminar la pareja con ID ${nParejaID}? Confirma para continuar.`);
            if (!confirmacion) {
                mostrarAviso("Eliminación cancelada. No se cambió ningún registro.");
                return;
            }

            // Realizar la solicitud al backend
            const response = await window.api.eliminarPareja(nParejaID);

            if (response.success) {
                mostrarAviso("Pareja eliminada con éxito.");
                document.getElementById("nParejaID").value = "";
            } else {
                mostrarAviso(response.message || response.error || "Ocurrió un error inesperado.");
            }
        } catch (err) {
            console.error("Error al eliminar pareja:", err);
            mostrarAviso(`${err.message}`);
        }
    });
}


// document.getElementById("btnGenerarPDF").addEventListener("click", async () => {
//     try {
//         const response = await window.api.generarPDFParejas();

//         if (response.success) {
//             console.log("PDF generado en:", response.ruta);
//         } else {
//         }
//     } catch (err) {
//         console.error("Error al generar el PDF:", err);
//     }
// });

// ipcRenderer.on("generar-pdf", async () => {
//     try {
//         console.log("Generación de PDF solicitada desde el menú");

//         const response = await window.api.generarPDFParejas();

//         if (response.success) {
//             console.log("PDF generado en:", response.ruta);
//         } else {
//             console.error("Error:", response.error);
//         }
//     } catch (err) {
//         console.error("Error al generar el PDF:", err);
//     }
// });


function vincularPDF(botonID, metodo) {
    document.getElementById(botonID)?.addEventListener("click", () => ejecutarAccion(botonID, async () => {
        const response = await window.api[metodo]();
        mostrarAviso(response?.success ? `PDF generado con éxito. Ruta: ${response.ruta}` :
            (response?.error || response?.message || "No se pudo generar el PDF."));
    }));
}

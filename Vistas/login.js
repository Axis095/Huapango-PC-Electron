const ipcRenderer = window.api;

document.getElementById("loginBtn").addEventListener("click", (event) => {
    event.preventDefault(); // Evita que el formulario recargue la página
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    ipcRenderer.invoke("login", { username, password }).then((response) => {
        if (response.success) {
            console.log("Login exitoso");
        } else {
            document.getElementById("errorMsg").textContent = response.message || "Error desconocido";
        }
    });
});
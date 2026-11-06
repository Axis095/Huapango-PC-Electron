# Huapango · Prototipo v1.0

## Instalar en una laptop del evento (Windows x64)

Ejecuta el instalador de HuapangoApp que te entregue el equipo. En el primer arranque, introduce la IP de la PC que ejecuta MySQL, el puerto, la cuenta de conexión y el nombre de la base de datos del evento. Pulsa **Comprobar y guardar** y después **Continuar al inicio de sesión**. En la laptop basta con instalar HuapangoApp. La PC central debe tener MySQL en ejecución y el esquema del evento cargado.

Consulta la [guía de primer arranque](docs/primer-arranque.md) para cambiar la conexión de una instalación existente.

## Probar desde el código fuente

En Windows, con Git y Node.js 22.12 o posterior, abre una terminal en la carpeta donde quieras guardar una copia nueva. La descarga de dependencias y el primer inicio de Electron requieren acceso a Internet.

```powershell
git clone --branch Prototipo-v1.0 --single-branch https://github.com/Axis095/Huapango-PC-Electron.git Huapango-Prototipo
cd Huapango-Prototipo
npm.cmd ci
npm.cmd test
npm.cmd start
```

## Generar el instalador

Desde esa misma copia, cierra Huapango y ejecuta `npm.cmd run build`. El instalador de Windows queda en `dist`. Distribuye el instalador a las estaciones del evento y configura cada una con sus propias credenciales.

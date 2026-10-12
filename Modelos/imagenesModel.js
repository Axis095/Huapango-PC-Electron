const { app, nativeImage } = require("electron");
const { crearAlmacenFotos } = require("./almacenFotos");
const almacen = crearAlmacenFotos({
    directorio: () => app.getPath("userData"),
    decodificar: buffer => nativeImage.createFromBuffer(buffer)
});
module.exports = { conFotos: almacen.conFotos, limpiarFotos: almacen.limpiar };

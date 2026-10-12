export async function leerFoto(archivo) {
    if (!archivo) return null;
    if (!archivo.size || archivo.size > 5 * 1024 * 1024) {
        throw new Error("Cada foto debe ocupar entre 1 byte y 5 MiB. Selecciona una imagen más pequeña.");
    }
    if (!/\.(png|jpe?g)$/i.test(archivo.name)) throw new Error("Selecciona una foto PNG o JPEG.");
    return { nombre: archivo.name, tipo: archivo.type, fecha: archivo.lastModified, bytes: await archivo.arrayBuffer() };
}

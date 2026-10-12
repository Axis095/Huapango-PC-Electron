const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const MAX_BYTES = 5 * 1024 * 1024;
const REFERENCIA = /^uploads\/fotos\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg)$/;
function invalida(mensaje) { return Object.assign(new Error(mensaje), { code: "INVALID_PHOTO" }); }

// Leer dimensiones antes de decodificar evita reservar memoria para imágenes enormes.
function formatoImagen(buffer) {
    let ancho, alto, extension;
    if (buffer.length >= 33 && buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
        buffer.readUInt32BE(8) === 13 && buffer.toString("ascii", 12, 16) === "IHDR") {
        ancho = buffer.readUInt32BE(16); alto = buffer.readUInt32BE(20); extension = "png";
    } else if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        let posicion = 2;
        while (posicion + 4 <= buffer.length) {
            if (buffer[posicion++] !== 0xff) break;
            while (posicion < buffer.length && buffer[posicion] === 0xff) posicion++;
            const marcador = buffer[posicion++];
            if (marcador === 0xda || marcador === 0xd9 || posicion + 2 > buffer.length) break;
            const longitud = buffer.readUInt16BE(posicion);
            if (longitud < 2 || posicion + longitud > buffer.length) break;
            if ([0xc0, 0xc1, 0xc2].includes(marcador) && longitud >= 8) {
                alto = buffer.readUInt16BE(posicion + 3); ancho = buffer.readUInt16BE(posicion + 5);
                extension = "jpg"; break;
            }
            posicion += longitud;
        }
    }
    if (!extension || !ancho || !alto) throw invalida("Selecciona una foto PNG o JPEG válida.");
    if (ancho > 8192 || alto > 8192 || ancho * alto > 16000000) throw invalida("La foto supera 16 megapíxeles o 8192 píxeles por lado. Reduce sus dimensiones.");
    return extension;
}

function crearAlmacenFotos({ directorio, decodificar }) {
    async function guardar(foto) {
        const bytes = foto?.bytes;
        if (!(bytes instanceof ArrayBuffer) && !ArrayBuffer.isView(bytes)) throw invalida("No se recibieron los bytes de la foto.");
        if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw invalida("Cada foto debe ocupar entre 1 byte y 5 MiB.");
        const buffer = Buffer.from(bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
        const extension = formatoImagen(buffer);
        const imagen = decodificar(buffer);
        if (imagen.isEmpty()) throw invalida("La foto está dañada o no puede abrirse.");
        const { width, height } = imagen.getSize();
        if (!width || !height || width > 8192 || height > 8192 || width * height > 16000000) throw invalida("Las dimensiones de la foto no son válidas.");
        const referencia = `uploads/fotos/${randomUUID()}.${extension}`;
        const destino = path.join(directorio(), referencia);
        await fs.mkdir(path.dirname(destino), { recursive: true });
        // Nunca sobrescribir archivos ni utilizar rutas enviadas por el formulario.
        const archivo = await fs.open(destino, "wx");
        try { await archivo.writeFile(buffer); await archivo.sync(); }
        catch (error) {
            await archivo.close().catch(() => {});
            await fs.unlink(destino).catch(() => {});
            throw error;
        }
        await archivo.close();
        return referencia;
    }
    async function borrar(referencia) {
        if (typeof referencia !== "string" || !REFERENCIA.test(referencia)) return;
        try { await fs.unlink(path.join(directorio(), referencia)); }
        catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    async function limpiar(referencias, enUso = async () => false) {
        for (const referencia of new Set(referencias)) {
            if (typeof referencia !== "string" || !REFERENCIA.test(referencia)) continue;
            try { if (!(await enUso(referencia))) await borrar(referencia); }
            catch (error) {
                // SQL ya pudo confirmar: un fallo de limpieza no debe provocar repetir el registro.
                console.warn("No se pudo limpiar una foto; se conserva para revisión:", referencia, error.code);
            }
        }
    }
    async function conFotos(datos, operacion, enUso) {
        const nuevas = [];
        const preparados = { ...datos, oFotoMasculino: null, oFotoFemenino: null };
        try {
            for (const lado of ["Masculino", "Femenino"]) {
                const foto = datos.fotos?.[lado];
                if (foto != null) {
                    const referencia = await guardar(foto);
                    nuevas.push(referencia); preparados[`oFoto${lado}`] = referencia;
                }
            }
            const resultado = await operacion(preparados);
            if (resultado?.success === false) await limpiar(nuevas);
            else if (resultado?.fotosAnteriores) {
                await limpiar(resultado.fotosAnteriores, enUso);
                delete resultado.fotosAnteriores;
            }
            return resultado;
        } catch (error) {
            // Ante un COMMIT incierto SQL podría haber guardado las referencias.
            if (error.code !== "TRANSACTION_OUTCOME_UNKNOWN") await limpiar(nuevas);
            throw error;
        }
    }
    return { guardar, borrar, limpiar, conFotos };
}
module.exports = { crearAlmacenFotos, MAX_BYTES };

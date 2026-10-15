// Una escritura activa y una instantánea pendiente. Las ediciones intermedias
// se sustituyen; al navegar se espera a que la última instantánea esté confirmada.
export function crearColaBorrador(guardar) {
    let siguiente = null, ciclo = null;
    return {
        solicitar(datos) {
            siguiente = datos;
            if (!ciclo) ciclo = Promise.resolve().then(async () => {
                let errorFinal = null;
                while (siguiente !== null) {
                    const actual = siguiente;
                    siguiente = null;
                    try { await guardar(actual); errorFinal = null; }
                    catch (error) { errorFinal = error; }
                }
                ciclo = null;
                if (errorFinal) throw errorFinal;
            });
            return ciclo;
        },
        esperar() { return ciclo ?? Promise.resolve(); }
    };
}

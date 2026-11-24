// Descripción de una solicitud: el portal la guarda como texto libre con renglones «Etiqueta: valor».
// Se separa en párrafos, subtítulos (renglones que terminan en «:») y datos (etiqueta y valor).
export type BloqueDescripcion = { tipo: 'parrafo'; texto: string } | { tipo: 'subtitulo'; texto: string } | { tipo: 'datos'; pares: [string, string][] };

export function partirDescripcion(texto: string): BloqueDescripcion[] {
    const bloques: BloqueDescripcion[] = [];
    let parrafo: string[] = [];
    const cerrarParrafo = () => { if (parrafo.length) { bloques.push({ tipo: 'parrafo', texto: parrafo.join('\n') }); parrafo = []; } };
    for (const crudo of texto.split(/\r?\n/)) {
        const linea = crudo.trim();
        if (!linea) { cerrarParrafo(); continue; }
        const par = linea.match(/^([^:]{2,40}):\s+(.+)$/);
        if (/^[^:]{2,60}:$/.test(linea)) { cerrarParrafo(); bloques.push({ tipo: 'subtitulo', texto: linea.slice(0, -1) }); }
        else if (par) {
            cerrarParrafo();
            const ultimo = bloques[bloques.length - 1];
            if (ultimo?.tipo === 'datos') ultimo.pares.push([par[1], par[2]]);
            else bloques.push({ tipo: 'datos', pares: [[par[1], par[2]]] });
        } else parrafo.push(linea);
    }
    cerrarParrafo();
    return bloques;
}

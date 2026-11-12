import { useEffect, useState } from 'react';
import { mensajeError } from './api';
import { listarPublicados, publicadosEnMemoria, type ContenidoPublico } from './publicacion';

// Contenido publicado. Si ya se había cargado en esta pestaña, se muestra al instante y se actualiza
// en segundo plano cuando llega la respuesta nueva.
export function usePublicados(tipo?: string) {
    const clave = tipo ?? '';
    const [resultado, setResultado] = useState<{ clave?: string; datos?: ContenidoPublico[]; error?: string }>(
        () => ({ clave, datos: publicadosEnMemoria(tipo) }));
    useEffect(() => {
        let vigente = true;
        listarPublicados(tipo).then(datos => { if (vigente) setResultado({ clave, datos }); })
            .catch(error => {
                // Con datos en pantalla no se cambia a error: se queda lo que ya se veía
                if (vigente) setResultado(previo => previo.clave === clave && previo.datos ? previo : { clave, error: mensajeError(error) });
            });
        return () => { vigente = false; };
    }, [clave, tipo]);
    if (resultado.clave === clave) return resultado;
    // Cambió el tipo: mientras llega, lo que haya en memoria para el nuevo tipo
    return { clave, datos: publicadosEnMemoria(tipo) };
}

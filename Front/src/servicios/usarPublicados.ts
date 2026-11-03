import { useEffect, useState } from 'react';
import { mensajeError } from './api';
import { listarPublicados, type ContenidoPublico } from './publicacion';

export function usePublicados(tipo?: string) {
    const [resultado, setResultado] = useState<{ clave?: string; datos?: ContenidoPublico[]; error?: string }>({});
    const clave = tipo ?? '';
    useEffect(() => {
        let vigente = true;
        listarPublicados(tipo).then(datos => { if (vigente) setResultado({ clave, datos }); })
            .catch(error => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, tipo]);
    return resultado.clave === clave ? resultado : {};
}

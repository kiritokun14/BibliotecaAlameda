import { useEffect, useState } from 'react';
import { cargarAgendaPublica } from './agendaPublica';
import { mensajeError } from './api';
import type { ActividadAgenda } from '../pages/publico/eventos/datosAgenda';

export function useAgendaPublica(desde = '', hasta = '') {
    const [intento, reintentar] = useState(0);
    const [revision, actualizar] = useState(0);
    const clave = JSON.stringify([desde, hasta, intento, revision]);
    const [resultado, setResultado] = useState<{ clave: string; actividades: ActividadAgenda[]; error?: string }>();
    useEffect(() => {
        let vigente = true;
        cargarAgendaPublica(desde, hasta).then(actividades => { if (vigente) setResultado({ clave, actividades }); })
            .catch(error => { if (vigente) setResultado({ clave, actividades: [], error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [desde, hasta, clave]);
    useEffect(() => {
        const refrescar = () => actualizar(v => v + 1);
        window.addEventListener('focus', refrescar);
        return () => window.removeEventListener('focus', refrescar);
    }, []);
    const actual = resultado?.clave === clave ? resultado : undefined;
    return { actividades: actual?.actividades ?? [], cargando: !actual, error: actual?.error, reintentar: () => reintentar(v => v + 1) };
}

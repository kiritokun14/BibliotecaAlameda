import { useEffect, useState } from 'react';
import { agendaEnMemoria, cargarAgendaPublica } from './agendaPublica';
import { mensajeError } from './api';
import type { ActividadAgenda } from '../pages/publico/eventos/datosAgenda';

// Agenda pública de un periodo. Si ya se había cargado en esta pestaña se muestra al instante
// (cargando = false) y se actualiza cuando llega la respuesta nueva.
export function useAgendaPublica(desde = '', hasta = '') {
    const [intento, reintentar] = useState(0);
    const [revision, actualizar] = useState(0);
    const clave = JSON.stringify([desde, hasta, intento, revision]);
    const [resultado, setResultado] = useState<{ clave: string; periodo: string; actividades: ActividadAgenda[]; error?: string }>();
    const periodo = `${desde}|${hasta}`;
    useEffect(() => {
        let vigente = true;
        cargarAgendaPublica(desde, hasta).then(actividades => { if (vigente) setResultado({ clave, periodo, actividades }); })
            .catch(error => { if (vigente) setResultado({ clave, periodo, actividades: [], error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [desde, hasta, clave, periodo]);
    useEffect(() => {
        const refrescar = () => actualizar(v => v + 1);
        window.addEventListener('focus', refrescar);
        return () => window.removeEventListener('focus', refrescar);
    }, []);
    const actual = resultado?.clave === clave ? resultado : undefined;
    // Mientras llega la consulta: lo último que se vio de este periodo (también al volver a la ventana)
    const mismoPeriodo = resultado && resultado.periodo === periodo && !resultado.error;
    const previas = actual ? undefined : (mismoPeriodo ? resultado.actividades : agendaEnMemoria(desde, hasta));
    return {
        actividades: actual?.actividades ?? previas ?? [],
        cargando: !actual && !previas,
        error: actual?.error,
        reintentar: () => reintentar(v => v + 1),
    };
}

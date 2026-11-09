import { useContext, useEffect, useState } from 'react';
import { ContextoPanel } from './accesoPanel';
import { bandejaEspacios, diaLocal, horaLocal, type SolicitudEspacioPersonal } from './espacios';
import { mensajeError } from './api';
import type { Visita, EstadoVisita } from '../pages/admin/actividades/visitas';

const estados: Record<string, EstadoVisita> = { en_revision: 'por-confirmar', requiere_correccion: 'propuesta', aprobada: 'confirmada', rechazada: 'rechazada', cancelada: 'cancelada' };
export function visitaDesdeSolicitud(s: SolicitudEspacioPersonal): Visita {
    const tramo = s.acuerdo ?? s;
    return { folio: s.folio, grupo: s.institucion || s.solicitante.nombre || 'Persona solicitante', descripcion: s.motivo,
        personas: s.personas, detallePersonas: `${s.personas} personas`, fecha: diaLocal(tramo.inicio), hora: horaLocal(tramo.inicio), espacio: tramo.espacio?.nombre || 'Por acordar',
        contacto: [s.solicitante.correo, s.solicitante.telefono].filter(Boolean).join(' · '), comentarios: s.observaciones || '', recibida: diaLocal(s.creadaEn), responderAntes: '', estado: estados[s.estado],
    };
}
export function useVisitasPersonal() {
    const usuario = useContext(ContextoPanel)?.acceso.usuarioId;
    const [intento, reintentar] = useState(0);
    const clave = JSON.stringify([usuario, intento]);
    const [resultado, setResultado] = useState<{ clave: string; visitas: Visita[]; error?: string }>();
    useEffect(() => {
        if (!usuario) return;
        let vigente = true;
        async function cargar() {
            const solicitudes: SolicitudEspacioPersonal[] = [];
            for (let pagina = 0; pagina < 10; pagina++) {
                const lote = await bandejaEspacios(pagina);
                solicitudes.push(...lote.solicitudes);
                if (solicitudes.length >= lote.total || lote.solicitudes.length < 100) return solicitudes.filter(s => s.tipo === 'visita').map(visitaDesdeSolicitud);
            }
            throw new Error('Hay demasiadas solicitudes para esta vista. Consulta la bandeja de Atención.');
        }
        cargar().then(visitas => { if (vigente) setResultado({ clave, visitas }); })
            .catch(error => { if (vigente) setResultado({ clave, visitas: [], error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [usuario, clave]);
    const actual = resultado?.clave === clave ? resultado : undefined;
    return { visitas: actual?.visitas ?? [], cargando: !actual, error: actual?.error, reintentar: () => reintentar(v => v + 1) };
}

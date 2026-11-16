import { useContext, useEffect, useState } from 'react';
import { ContextoPanel } from './accesoPanel';
import { consultarEspaciosAgenda, listarActividades } from './actividades';
import { mensajeError } from './api';
import type { Actividad } from '../pages/admin/actividades/datos';
import type { Sala } from '../pages/admin/actividades/salas';

export function useCalendarioPersonal() {
    const usuario = useContext(ContextoPanel)?.acceso.usuarioId;
    const [intento, reintentar] = useState(0);
    const clave = JSON.stringify([usuario, intento]);
    const [resultado, setResultado] = useState<{ clave: string; actividades: Actividad[]; salas: Sala[]; error?: string }>();
    useEffect(() => {
        if (!usuario) return;
        let vigente = true;
        Promise.all([listarActividades(), consultarEspaciosAgenda()]).then(([lista, espacios]) => {
            const actividades = lista.flatMap(a => a.sesiones.map(s => ({ ...a, fecha: s.fecha, inicio: s.inicio, fin: s.fin, espacio: s.espacio, cupo: String(s.cupo), estado: a.estado as Actividad['estado'], autorizo: a.autorizo ?? undefined, publicadaEl: a.publicadaEl ?? undefined })));
            const salas = espacios.map((s, i) => ({ id: String(i), nombre: s.nombre, capacidad: s.capacidad, equipo: 'Por confirmar', accesibilidad: 'Por confirmar', ubicacion: 'Por confirmar', abre: '', cierra: '', dias: 'Por confirmar', habilitada: true }));
            if (vigente) setResultado({ clave, actividades, salas });
        }).catch(error => { if (vigente) setResultado({ clave, actividades: [], salas: [], error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [usuario, clave]);
    const actual = resultado?.clave === clave ? resultado : undefined;
    return { actividades: actual?.actividades ?? [], salas: actual?.salas ?? [], error: actual?.error, cargando: !actual, reintentar: () => reintentar(v => v + 1) };
}

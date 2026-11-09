import { consultarAgenda, type ActividadPublica } from './actividades';
import type { ActividadAgenda, Categoria } from '../pages/publico/eventos/datosAgenda';
import imagenIlustrativa from '../assets/comun/fotos/noticia-3.jpg';

export function categoriaPublica(tipo: string): Categoria {
    const valor = tipo.toLocaleLowerCase('es-MX');
    return valor.includes('club') ? 'club' : valor.includes('visita') ? 'visita' : valor.includes('taller') || valor.includes('curso') ? 'taller' : 'evento';
}

export function sesionesDeAgenda(actividad: ActividadPublica): ActividadAgenda[] {
    return actividad.sesiones.map(sesion => ({
        id: actividad.folio, sesionId: sesion.id, categoria: categoriaPublica(actividad.tipo), titulo: actividad.nombre,
        fecha: sesion.fecha, horario: `${sesion.inicio} a ${sesion.fin}`, lugar: sesion.espacio,
        publico: actividad.publico, imagen: imagenIlustrativa, resumen: actividad.descripcion,
        descripcion: [actividad.descripcion], cancelada: sesion.estado === 'cancelada',
        inscripcionAbierta: sesion.registroAbierto,
        // El endpoint no devuelve ocupación: no se inventan inscritos ni lugares libres.
    }));
}

export async function cargarAgendaPublica(desde = '', hasta = '') {
    const actividades: ActividadPublica[] = [];
    for (let pagina = 0; pagina < 20; pagina++) {
        const lote = await consultarAgenda({ desde, hasta, pagina, limite: 50 });
        actividades.push(...lote.actividades);
        if (actividades.length >= lote.total || lote.actividades.length < 50) return actividades.flatMap(sesionesDeAgenda)
            .filter(a => (!desde || a.fecha >= desde) && (!hasta || a.fecha <= hasta))
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario));
    }
    throw new Error('La consulta es demasiado amplia. Consulta un periodo más corto.');
}

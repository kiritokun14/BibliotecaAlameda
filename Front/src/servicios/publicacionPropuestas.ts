import type { DatosActividadReal } from './actividades';
import type { SolicitudAtencion } from './tramites';

export function datosPublicosPropuesta(s: SolicitudAtencion): DatosActividadReal {
    // El bloque de captura puede contener teléfono y otros datos privados: nunca se publica.
    const descripcion = (s.descripcion ?? '').split('\n\nDatos de la propuesta:')[0];
    const horario = /^(\d{2}:\d{2}) a (\d{2}:\d{2})/.exec(s.horarioSolicitado ?? '');
    return { nombre: s.tituloPropuesta ?? '', tipo: s.tipoPropuesta ?? 'Evento', descripcion,
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(s.diasSolicitados ?? '') ? s.diasSolicitados! : '',
        inicio: horario?.[1] ?? '', fin: horario?.[2] ?? '', espacio: s.necesidadEspacio ?? '',
        cupo: '', inscripcion: false, publico: s.publicoDirigido ?? '', responsable: '', materiales: '' };
}

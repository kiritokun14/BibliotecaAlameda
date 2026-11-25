// Administración › Estadísticas: GET /administracion/estadisticas (Back/estadisticas.py → Supabase/estadisticas_panel.sql).
// Solo conteos, sin datos personales. Permiso: 'consultar_estadisticas'.
import { pedirAdministracion, pedirArchivoAdministracion } from './auth';
import type { Estadisticas, Periodo, SeccionEstadistica } from '../pages/admin/administracion/datos';

export function consultarEstadisticas(seccion: SeccionEstadistica, periodo: Periodo) {
    return pedirAdministracion<Estadisticas>(`/estadisticas?seccion=${seccion}&periodo=${periodo}`);
}

export interface FiltrosParticipacion { desde: string; hasta: string; actividadId: string }
export interface ConteoParticipacion {
    solicitudes: number; confirmaciones: number; asistencias: number; ausencias: number;
    listasCerradas: number; sesionesRealizadas: number; sesionesCanceladas: number;
    incidencias: number | null; visitasGenerales: number | null; atenciones: number | null;
}
export interface CapturaEstadistica { total: number; referencia: string; version: string | null }
export interface DiaParticipacion extends ConteoParticipacion {
    fecha: string; registroVisitas: CapturaEstadistica | null;
}
export interface SesionParticipacion extends Pick<ConteoParticipacion, 'solicitudes' | 'confirmaciones' | 'asistencias' | 'ausencias' | 'incidencias'> {
    id: string; fecha: string; folio: string; titulo: string; estado: string; listaCerrada: boolean;
    registroIncidencias: CapturaEstadistica | null; puedeRegistrarIncidencias: boolean;
}
export interface ReporteParticipacion {
    desde: string; hasta: string; ambito: 'global' | 'actividades_asignadas'; actividadId: string | null;
    actividades: { id: string; folio: string; titulo: string }[];
    puedeRegistrarVisitas: boolean;
    totales: ConteoParticipacion & { diasConVisitas: number | null; sesionesConIncidencias: number };
    dias: DiaParticipacion[]; sesiones: SesionParticipacion[];
    fuentes: Partial<Record<keyof ConteoParticipacion, string>>;
}

function parametrosParticipacion({ desde, hasta, actividadId }: FiltrosParticipacion) {
    const parametros = new URLSearchParams({ desde, hasta });
    if (actividadId) parametros.set('actividad_id', actividadId);
    return parametros;
}

export function consultarParticipacion(filtros: FiltrosParticipacion) {
    return pedirAdministracion<ReporteParticipacion>(`/estadisticas/participacion?${parametrosParticipacion(filtros)}`);
}

export function descargarParticipacion(filtros: FiltrosParticipacion) {
    return pedirArchivoAdministracion(`/estadisticas/participacion.csv?${parametrosParticipacion(filtros)}`);
}

export function guardarConteo(tipo: 'visitas-generales' | 'incidencias', clave: string, captura: CapturaEstadistica) {
    return pedirAdministracion<CapturaEstadistica>(`/estadisticas/${tipo}/${encodeURIComponent(clave)}`, {
        method: 'PUT', body: JSON.stringify(captura),
    });
}

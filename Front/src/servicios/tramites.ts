import type { ActividadGestion, DatosActividadReal } from './actividades';
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultasEditor } from './consultas';

export type TipoTramite = 'credencial' | 'propuesta';
export interface AcuerdoDireccion { responsable: string; fecha: string; referencia: string }
export const ESTADOS_CREDENCIAL: Record<string, string> = { recibida: 'Recibida', en_atencion: 'En atención', cita_programada: 'Cita programada', atendida: 'Atendida', rechazada: 'Rechazada', cancelada: 'Cancelada' };
export const ESTADOS_PROPUESTA: Record<string, string> = { borrador: 'Borrador', en_revision: 'En revisión', requiere_correccion: 'Requiere corrección', aprobada: 'Aprobada', rechazada: 'Rechazada', cancelada: 'Cancelada' };
export interface DatosPropuesta {
    tituloPropuesta: string; descripcion: string; tipoPropuesta: string; publicoDirigido: string;
    necesidadEspacio: string; frecuenciaReunion: string; diasSolicitados: string; horarioSolicitado: string;
    abiertaAlPublico: boolean; sinFinesDeLucro: boolean;
}
export interface SolicitudAtencion {
    id: string; creadaEn: string; actualizadaEn?: string; actualizadoEn?: string;
    tipoSolicitud?: string; estadoSolicitud?: string; fechaCita?: string | null; observaciones?: string | null;
    tituloPropuesta?: string; descripcion?: string; tipoPropuesta?: string; publicoDirigido?: string;
    necesidadEspacio?: string; frecuenciaReunion?: string; diasSolicitados?: string; horarioSolicitado?: string;
    estadoRevision?: string; observacionesInstitucionales?: string | null; actividadId?: string | null; propuestoPor?: string;
    perfil?: { nombres: string; primerApellido: string; segundoApellido?: string; telefono: string; municipio?: string };
    historial: { accion: string; estadoAnterior: string | null; estadoNuevo: string; nota: string | null; fecha: string; registradoPor?: string; acuerdoDireccion?: AcuerdoDireccion | null }[];
}
export interface ListaTramites { total: number; solicitudes: SolicitudAtencion[] }
export function estadoTramite(s: SolicitudAtencion) { return s.estadoSolicitud ?? s.estadoRevision ?? ''; }
export function rutaTramite(tipo: TipoTramite) { return tipo === 'credencial' ? '/credenciales/solicitudes' : '/propuestas'; }
async function pedir<T>(tipo: TipoTramite, ruta = '', opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para consultar tus trámites.', 401);
    const token = data.session.access_token;
    const ejecutar = () => pedirApi<T>(`${rutaTramite(tipo)}${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${token}` } });
    if (!opciones.method) return consultasEditor.obtener(`tramites:${token}:${tipo}:${ruta}`, ejecutar);
    consultasEditor.limpiar();
    try { return await ejecutar(); } finally { consultasEditor.limpiar(); }
}
export function listarTramites(tipo: TipoTramite, propios: boolean, pagina = 0, estado = '', busqueda = '') {
    const parametros = new URLSearchParams({ limite: '20', desplazamiento: String(pagina * 20) });
    if (estado && !propios) parametros.set(tipo === 'credencial' ? 'estadoSolicitud' : 'estadoRevision', estado);
    if (busqueda.trim() && !propios) parametros.set('busqueda', busqueda.trim());
    return pedir<ListaTramites>(tipo, `${propios ? '/me' : ''}?${parametros}`);
}
export function consultarTramite(tipo: TipoTramite, id: string) { return pedir<SolicitudAtencion>(tipo, `/${encodeURIComponent(id)}`); }
export function solicitarCredencial(tipoSolicitud: string, observaciones: string) {
    return pedir<SolicitudAtencion>('credencial', '', { method: 'POST', body: JSON.stringify({ tipoSolicitud, observaciones: observaciones.trim() || null }) });
}
export function enviarPropuesta(datos: DatosPropuesta, anterior?: SolicitudAtencion) {
    return pedir<SolicitudAtencion>('propuesta', anterior ? `/${encodeURIComponent(anterior.id)}/corregir` : '', {
        method: anterior ? 'PUT' : 'POST', body: JSON.stringify({ ...datos, ...(anterior ? { actualizadoEn: anterior.actualizadoEn } : {}) }),
    });
}
export function resolverTramite(tipo: TipoTramite, anterior: SolicitudAtencion, estado: string, nota: string, fechaCita?: string, acuerdoDireccion?: AcuerdoDireccion) {
    const cuerpo = tipo === 'credencial' ? { estadoSolicitud: estado, actualizadaEn: anterior.actualizadaEn,
        observaciones: nota.trim() || null, fechaCita: fechaCita || null }
        : { estadoRevision: estado, actualizadoEn: anterior.actualizadoEn, observacionesInstitucionales: nota.trim() || null, ...(acuerdoDireccion ? { acuerdoDireccion } : {}) };
    return pedir<SolicitudAtencion>(tipo, `/${encodeURIComponent(anterior.id)}`, { method: 'PATCH', body: JSON.stringify(cuerpo) });
}

export function publicarPropuesta(anterior: SolicitudAtencion, datos: DatosActividadReal) {
    return pedir<ActividadGestion>('propuesta', `/${encodeURIComponent(anterior.id)}/publicar`, {
        method: 'POST', body: JSON.stringify({ ...datos, actualizadoEn: anterior.actualizadoEn, confirmacion: true }),
    });
}

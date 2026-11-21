import type { ActividadGestion, DatosActividadReal } from './actividades';
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultarConMemoria, consultasEditor, enMemoria, olvidarMemoria } from './consultas';

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
    versiones?: { numero: number; accion: string; motivo: string; fecha: string }[];
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
    consultasEditor.limpiar(); olvidarMemoria();
    try { return await ejecutar(); } finally { consultasEditor.limpiar(); }
}
const claveLista = (tipo: TipoTramite, propios: boolean, pagina: number, estado: string, busqueda: string) => `tramites:${tipo}:${propios}:${pagina}:${estado}:${busqueda.trim()}`;
// Lo último que se recibió para esa lista (o esa solicitud), para mostrarlo al instante mientras se actualiza
export const tramitesEnMemoria = (tipo: TipoTramite, pagina = 0, estado = '', busqueda = '') => enMemoria<ListaTramites>(claveLista(tipo, false, pagina, estado, busqueda));
export const tramiteEnMemoria = (tipo: TipoTramite, id: string) => enMemoria<SolicitudAtencion>(`tramite:${tipo}:${id}`);
export function listarTramites(tipo: TipoTramite, propios: boolean, pagina = 0, estado = '', busqueda = '') {
    const parametros = new URLSearchParams({ limite: '20', desplazamiento: String(pagina * 20) });
    if (estado && !propios) parametros.set(tipo === 'credencial' ? 'estadoSolicitud' : 'estadoRevision', estado);
    if (busqueda.trim() && !propios) parametros.set('busqueda', busqueda.trim());
    return consultarConMemoria(claveLista(tipo, propios, pagina, estado, busqueda), () => pedir<ListaTramites>(tipo, `${propios ? '/me' : ''}?${parametros}`));
}
export function consultarTramite(tipo: TipoTramite, id: string) { return consultarConMemoria(`tramite:${tipo}:${id}`, () => pedir<SolicitudAtencion>(tipo, `/${encodeURIComponent(id)}`)); }
export function solicitarCredencial(tipoSolicitud: string, observaciones: string) {
    return pedir<SolicitudAtencion>('credencial', '', { method: 'POST', body: JSON.stringify({ tipoSolicitud, observaciones: observaciones.trim() || null }) });
}
// La persona cancela su propia solicitud de credencial (en revisión o con corrección solicitada).
// POST /credenciales/solicitudes/{id}/cancelar (Back/credenciales.py; en la base, Supabase/cancelacion_credencial_propia.sql).
export function cancelarSolicitudCredencial(id: string) {
    return pedir<SolicitudAtencion>('credencial', `/${encodeURIComponent(id)}/cancelar`, { method: 'POST' });
}
export const puedeCorregirPropuesta = (s: SolicitudAtencion) => !s.actividadId && ['borrador', 'en_revision', 'requiere_correccion', 'aprobada'].includes(s.estadoRevision ?? '');
export const puedeCancelarPropuesta = (s: SolicitudAtencion) => !s.actividadId && ['borrador', 'en_revision', 'requiere_correccion'].includes(s.estadoRevision ?? '');
export function enviarPropuesta(datos: DatosPropuesta, anterior?: SolicitudAtencion, motivoCambio?: string) {
    return pedir<SolicitudAtencion>('propuesta', anterior ? `/${encodeURIComponent(anterior.id)}/corregir` : '', {
        method: anterior ? 'PUT' : 'POST', body: JSON.stringify({ ...datos, ...(anterior ? { actualizadoEn: anterior.actualizadoEn, motivoCambio: motivoCambio?.trim() } : {}) }),
    });
}
export function cancelarPropuesta(anterior: SolicitudAtencion, motivoCambio: string) {
    return pedir<SolicitudAtencion>('propuesta', `/${encodeURIComponent(anterior.id)}/cancelacion`, {
        method: 'POST', body: JSON.stringify({ actualizadoEn: anterior.actualizadoEn, motivoCambio: motivoCambio.trim() }),
    });
}
// La persona cancela su propia propuesta (borrador, en revisión o con cambios pedidos).
// POST /propuestas/{id}/cancelar con { actualizadoEn }: TODO backend, aún no existe (PARA_BACKEND.md, punto 8).
export function cancelarPropuestaPropia(anterior: SolicitudAtencion) {
    return pedir<SolicitudAtencion>('propuesta', `/${encodeURIComponent(anterior.id)}/cancelar`, {
        method: 'POST', body: JSON.stringify({ actualizadoEn: anterior.actualizadoEn }),
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

// Cuántas solicitudes hay en cada estado (para las tarjetas de resumen de la bandeja).
// TODO backend: no hay un endpoint de conteos; se cuentan las 50 más recientes (el máximo que acepta) en una sola consulta.
export type ConteoTramites = { porEstado: Record<string, number>; revisadas: number; total: number };
export function conteosTramites(tipo: TipoTramite) {
    return consultarConMemoria(`conteos:${tipo}`, async () => {
        const lista = await pedir<ListaTramites>(tipo, '?limite=50&desplazamiento=0');
        const porEstado: Record<string, number> = {};
        for (const s of lista.solicitudes) porEstado[estadoTramite(s)] = (porEstado[estadoTramite(s)] ?? 0) + 1;
        return { porEstado, revisadas: lista.solicitudes.length, total: lista.total } satisfies ConteoTramites;
    });
}
export const conteosEnMemoria = (tipo: TipoTramite) => enMemoria<ConteoTramites>(`conteos:${tipo}`);

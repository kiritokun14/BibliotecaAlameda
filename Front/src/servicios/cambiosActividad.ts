import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import type { ActividadPublica } from './actividades';

export interface ProgramacionCambio {
    sesionId: string; fecha: string; inicio: string; fin: string; espacio: string;
}
export interface SolicitudCambioActividad {
    actividad: string; actualizado: string; tipo: 'reprogramacion' | 'cancelacion';
    sesiones: string[]; programacion: ProgramacionCambio[]; motivo: string;
}
export interface AcuerdoCambio { referencia: string; autoridad: string; fecha: string }
export interface CambioActividad {
    folio: string; actividad: string; nombre: string; tipo: SolicitudCambioActividad['tipo']; motivo: string;
    sesiones: string[]; anterior: { sesionId: string; espacio: string; inicio: string; fin: string }[];
    programacion: ProgramacionCambio[]; estado: 'pendiente' | 'autorizado' | 'rechazado' | 'aplicado';
    version: number; acuerdo: AcuerdoCambio | null; solicitado: string; puedeResolver: boolean;
    historial: { accion: string; actor: string; responsable: string; fecha: string; motivo?: string }[];
    avisos: { registrados: number; fallidos: number };
}
async function consultar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para consultar tus actividades.', 401);
    return pedirApi<T>(`/actividades/cambios${ruta}`, {
        method: cuerpo === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    });
}
export const actividadesParaCambio = () => consultar<ActividadPublica[]>('/actividades');
export const listarCambiosActividad = (propias = false, desplazamiento = 0) =>
    consultar<{ total: number; cambios: CambioActividad[] }>(`?propias=${propias}&limite=20&desplazamiento=${desplazamiento}`);
export const obtenerCambioActividad = (folio: string) => consultar<CambioActividad>(`/${encodeURIComponent(folio)}`);
export const solicitarCambioActividad = (datos: SolicitudCambioActividad) => consultar<CambioActividad>('', datos);
export const resolverCambioActividad = (cambio: CambioActividad, decision: 'autorizar' | 'rechazar', motivo: string, acuerdo?: AcuerdoCambio) =>
    consultar<CambioActividad>(`/${encodeURIComponent(cambio.folio)}/resolver`, { version: cambio.version, decision, motivo, acuerdo: acuerdo ?? null });
export const aplicarCambioActividad = (cambio: CambioActividad) =>
    consultar<CambioActividad>(`/${encodeURIComponent(cambio.folio)}/aplicar`, { version: cambio.version });
export const reintentarAvisosCambio = (cambio: CambioActividad) =>
    consultar<CambioActividad>(`/${encodeURIComponent(cambio.folio)}/reintentar-avisos`, { version: cambio.version });
export interface EstadoCorreos { pendientes: number; enviados: number; fallidos: number; inciertos: number }
export const consultarCorreosCambio = (folio: string) => consultar<EstadoCorreos>(`/${encodeURIComponent(folio)}/correos`);
export const reintentarCorreosCambio = (folio: string) => consultar<EstadoCorreos>(`/${encodeURIComponent(folio)}/correos/reintentar`, {});
export interface AvisoCambioActividad { id: string; titulo: string; texto: string; fecha: string; leida: boolean }
export const consultarAvisosCambios = (desplazamiento = 0) =>
    consultar<{ total: number; avisos: AvisoCambioActividad[] }>(`/avisos?desplazamiento=${desplazamiento}`);
export const leerAvisoCambio = (id: string) => consultar<{ leido: boolean }>(`/avisos/${encodeURIComponent(id)}/leer`, {});

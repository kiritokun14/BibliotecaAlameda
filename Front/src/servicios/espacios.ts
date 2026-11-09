// T-076 / HU-16. Solicitudes de visita o uso de espacio (Back/espacios.py).
// Persona usuaria: /espacios/areas y /espacios/solicitudes (no se pide credencial).
// Personal: /espacios/atencion/solicitudes (capacidad registrar_resoluciones_actividades).
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export type TipoSolicitudEspacio = 'visita' | 'uso_espacio';
export type EstadoSolicitudEspacio = 'en_revision' | 'requiere_correccion' | 'aprobada' | 'rechazada' | 'cancelada';

export interface AreaEspacio { slug: string; nombre: string; capacidad: number | null; descripcion: string | null }
export interface EspacioCorto { slug: string; nombre: string }
export interface Tramo { espacio: EspacioCorto | null; inicio: string; fin: string }

export interface SolicitudEspacioApi {
    folio: string;
    tipo: TipoSolicitudEspacio;
    estado: EstadoSolicitudEspacio;
    espacio: EspacioCorto | null;
    inicio: string;
    fin: string;
    personas: number;
    motivo: string;
    institucion: string | null;
    observaciones: string | null;
    acuerdo: (Tramo & { condiciones: string | null }) | null;
    propuesta: (Tramo & { mensaje: string | null }) | null;
    creadaEn: string;
    actualizadoEn: string;
    resueltaEn: string | null;
    canceladaEn: string | null;
    motivoCancelacion: string | null;
    historial: { accion: string; nota: string | null; fecha: string; porPersonal: boolean }[];
}

export interface SolicitudEspacioPersonal extends Omit<SolicitudEspacioApi, 'historial'> {
    solicitante: { nombre: string | null; telefono: string | null; correo: string | null };
    autorizadoPor: string | null;
    historial?: { accion: string; nota: string | null; detalles: Record<string, unknown> | null; fecha: string; realizadoPor: string | null }[];
    ocupacion?: { tipo: 'solicitud' | 'actividad'; folio?: string; titulo?: string; inicio: string; fin: string }[];
}

export interface NuevaSolicitudEspacio {
    tipo: TipoSolicitudEspacio; areaId: string | null; fecha: string; horaInicio: string; horaFin: string;
    personas: number; motivo: string; institucion?: string;
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<T>('/espacios' + ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}
const enviarJson = (datos: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(datos) });
const folioUrl = (folio: string) => encodeURIComponent(folio);

// ---------- Persona usuaria ----------
export const listarAreas = () => pedir<AreaEspacio[]>('/areas');
export const enviarSolicitud = (datos: NuevaSolicitudEspacio) => pedir<SolicitudEspacioApi>('/solicitudes', enviarJson(datos));
export const listarMisSolicitudes = () => pedir<{ total: number; solicitudes: SolicitudEspacioApi[] }>('/solicitudes?limite=50');
export const obtenerMiSolicitud = (folio: string) => pedir<SolicitudEspacioApi>('/solicitudes/' + folioUrl(folio));
export const cancelarMiSolicitud = (folio: string, motivo: string, comentarios: string) =>
    pedir<SolicitudEspacioApi>(`/solicitudes/${folioUrl(folio)}/cancelacion`, enviarJson({ motivo: motivo || null, comentarios: comentarios.trim() || null }));
export const responderPropuesta = (folio: string, acepta: boolean, comentarios: string) =>
    pedir<SolicitudEspacioApi>(`/solicitudes/${folioUrl(folio)}/respuesta`, enviarJson({ acepta, comentarios: comentarios.trim() || null }));

// ---------- Personal ----------
export const bandejaEspacios = () =>
    pedir<{ total: number; conteos: Record<EstadoSolicitudEspacio, number>; solicitudes: SolicitudEspacioPersonal[] }>('/atencion/solicitudes?limite=100');
export const detalleEspacio = (folio: string) => pedir<SolicitudEspacioPersonal>('/atencion/solicitudes/' + folioUrl(folio));
export const aprobarEspacio = (folio: string, verificacion: boolean[], condiciones?: string, mensaje?: string) =>
    pedir<SolicitudEspacioPersonal>(`/atencion/solicitudes/${folioUrl(folio)}/aprobacion`,
        enviarJson({ verificacion, condiciones: condiciones?.trim() || null, mensaje: mensaje?.trim() || null }));
export const proponerEspacio = (folio: string, cambio: { areaId?: string; fecha?: string; horaInicio?: string; horaFin?: string; mensaje: string }) =>
    pedir<SolicitudEspacioPersonal>(`/atencion/solicitudes/${folioUrl(folio)}/propuesta`, enviarJson(cambio));
export const rechazarEspacio = (folio: string, motivo: string, mensaje: string) =>
    pedir<SolicitudEspacioPersonal>(`/atencion/solicitudes/${folioUrl(folio)}/rechazo`, enviarJson({ motivo, mensaje: mensaje.trim() }));
export const cancelarEspacioAprobado = (folio: string, motivo: string, mensaje: string) =>
    pedir<SolicitudEspacioPersonal>(`/atencion/solicitudes/${folioUrl(folio)}/cancelacion`, enviarJson({ motivo, mensaje: mensaje.trim() }));

// ---------- Fechas en la hora de la biblioteca (Tepic) ----------
const ZONA = 'America/Mexico_City';
const partes = (iso: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
// "2026-11-20T16:00:00+00:00" → "2026-11-20"
export function diaLocal(iso: string | null | undefined) {
    if (!iso) return '';
    const p = partes(iso);
    return `${p.year}-${p.month}-${p.day}`;
}
// → "10:00"
export function horaLocal(iso: string | null | undefined) {
    if (!iso) return '';
    const p = partes(iso);
    return `${p.hour}:${p.minute}`;
}
// → "10:00 a 12:00"
export const horarioLocal = (inicio: string | null | undefined, fin: string | null | undefined) =>
    inicio && fin ? `${horaLocal(inicio)} a ${horaLocal(fin)}` : '';
// Hoy en Tepic, "AAAA-MM-DD"
export const hoyLocal = () => diaLocal(new Date().toISOString());

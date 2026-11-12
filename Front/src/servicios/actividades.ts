import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultasEditor } from './consultas';

export interface DatosActividadReal {
    nombre: string; tipo: string; descripcion: string; fecha: string; inicio: string; fin: string;
    espacio: string; cupo: string; inscripcion: boolean; publico: string; responsable: string; materiales: string;
}
export interface SesionPublica {
    id: string; fecha: string; inicio: string; fin: string; espacio: string; cupo: number;
    estado: string; registroAbierto: boolean;
}
export interface ActividadPublica extends DatosActividadReal {
    folio: string; slug: string; estado: string; actualizado: string; publicadaEl: string | null;
    sesiones: SesionPublica[];
}
export interface ActividadGestion extends ActividadPublica {
    creadoPor: string; inscritos: number; espera: number;
    autorizo: { quien: string; fecha: string } | null;
    historial: { accion: string; motivo: string; referencia: string; fecha: string }[];
}
export interface FiltrosAgenda { desde?: string; hasta?: string; tipo?: string; busqueda?: string; pagina?: number; limite?: number }
export interface ListaAgenda { total: number; pagina: number; actividades: ActividadPublica[] }

export function consultarAgenda(filtros: FiltrosAgenda = {}) {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) if (valor !== undefined && valor !== '') parametros.set(clave, String(valor));
    const ruta = `/actividades/publicas?${parametros}`;
    // Se recuerda 60 s: volver a Inicio o a Eventos no espera otra vez al servidor
    return consultasEditor.obtener(ruta, () => pedirApi<ListaAgenda>(ruta), 60000);
}
export function consultarActividadPublica(folio: string) {
    return pedirApi<ActividadPublica>(`/actividades/publicas/${encodeURIComponent(folio)}`);
}
async function gestion<T>(ruta = '', opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<T>(`/actividades/gestion${ruta}`, { ...opciones,
        headers: { Authorization: `Bearer ${data.session.access_token}` } });
}
export const listarActividades = () => gestion<ActividadGestion[]>();
export const consultarActividad = (folio: string) => gestion<ActividadGestion>(`/${encodeURIComponent(folio)}`);
export const consultarEspaciosAgenda = () => gestion<{ nombre: string; capacidad: number }[]>('/espacios');
export function guardarActividad(datos: DatosActividadReal, estado: 'borrador' | 'en-revision', anterior?: ActividadGestion) {
    // Los campos de fecha y hora vacíos son válidos solo en un borrador.
    const cuerpo = { ...datos, fecha: datos.fecha || null, inicio: datos.inicio || null, fin: datos.fin || null,
        ...(anterior ? { actualizado: anterior.actualizado } : { estado }) };
    return gestion<ActividadGestion>(anterior ? `/${encodeURIComponent(anterior.folio)}` : '', {
        method: anterior ? 'PATCH' : 'POST', body: JSON.stringify(cuerpo),
    });
}
export type AccionActividad = 'enviar' | 'aprobar' | 'publicar' | 'rechazar' | 'retirar' | 'archivar';
export function decidirActividad(actividad: ActividadGestion, accion: AccionActividad, referencia = '', motivo = '') {
    return gestion<ActividadGestion>(`/${encodeURIComponent(actividad.folio)}/${accion}`, {
        method: 'POST', body: JSON.stringify({ actualizado: actividad.actualizado, referencia, motivo }),
    });
}

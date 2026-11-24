import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export interface SesionInscripciones { id: string; inicio: string; estado: string; registroAbierto: boolean }
export interface ActividadInscripciones {
    id: string; titulo: string; requiereInscripcion: boolean; requerimientos: string | null; sesiones: SesionInscripciones[];
}
export interface SolicitudInscripcion {
    id: string; usuarioId: string; nombre: string; status: 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada'; creadoA: string;
}
export interface CuposInscripciones { sesionId: string; capacidad: number; confirmados: number; disponibles: number }
async function consultar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<T>(ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}
export const listarActividadesInscripciones = (pagina: number) => consultar<ActividadInscripciones[]>(`/responsable/actividades?limite=20&desplazamiento=${pagina * 20}`);
export const listarSolicitudesInscripcion = (sesion: string, pagina: number) => consultar<SolicitudInscripcion[]>(`/sesiones/${encodeURIComponent(sesion)}/inscripciones?limite=20&desplazamiento=${pagina * 20}`);
export const consultarCuposInscripciones = (sesion: string) => consultar<CuposInscripciones>(`/sesiones/${encodeURIComponent(sesion)}/cupos`);
export const confirmarSolicitudInscripcion = (id: string, motivo: string) => consultar<{ id: string; status: 'confirmada' }>(`/inscripciones/${encodeURIComponent(id)}/confirmar`, { method: 'PATCH', body: JSON.stringify({ motivo: motivo.trim() }) });

import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultarConMemoria, enMemoria } from './consultas';

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
export const listarActividadesInscripciones = (pagina: number) => consultarConMemoria('inscripciones:' + pagina, () => consultar<ActividadInscripciones[]>(`/responsable/actividades?limite=20&desplazamiento=${pagina * 20}`));
export const inscripcionesEnMemoria = (pagina: number) => enMemoria<ActividadInscripciones[]>('inscripciones:' + pagina);
export const listarSolicitudesInscripcion = (sesion: string, pagina: number) => consultar<SolicitudInscripcion[]>(`/sesiones/${encodeURIComponent(sesion)}/inscripciones?limite=20&desplazamiento=${pagina * 20}`);
export const consultarCuposInscripciones = (sesion: string) => consultar<CuposInscripciones>(`/sesiones/${encodeURIComponent(sesion)}/cupos`);
export type DecisionInscripcion = 'confirmar' | 'rechazar' | 'cancelar';
export function decidirSolicitudInscripcion(id: string, accion: DecisionInscripcion, motivo: string) {
    return consultar<{ id: string; status: SolicitudInscripcion['status'] }>(
        `/inscripciones/${encodeURIComponent(id)}/${accion}`,
        { method: 'PATCH', body: JSON.stringify({ motivo: motivo.trim() }) },
    );
}

type EstadoPropio = SolicitudInscripcion['status'];
export interface InscripcionPropia {
    id: string | null; estado: EstadoPropio | null; actualizadoA: string | null;
    registroAbierto: boolean; hayCupo: boolean; puedeCancelar: boolean;
}
export interface EventoPropio {
    id: string; status: EstadoPropio; folio: string; titulo: string;
    inicio: string; sesionId: string; publicada: boolean;
    asistencia?: 'presente' | 'ausente' | null;
}
export const estadoInscripcionPropia: Record<EstadoPropio, string> = {
    pendiente: 'Pendiente de confirmación', confirmada: 'Confirmada', rechazada: 'Rechazada', cancelada: 'Cancelada',
};
const rutaPropia = (sesion: string) => `/sesiones/${encodeURIComponent(sesion)}/mi-inscripcion`;
export const consultarInscripcionPropia = (sesion: string) => consultar<InscripcionPropia>(rutaPropia(sesion));
export const solicitarInscripcionPropia = (sesion: string) => consultar<InscripcionPropia>(rutaPropia(sesion), { method: 'POST' });
export const cancelarInscripcionPropia = (sesion: string, actualizadoA: string) =>
    consultar<InscripcionPropia>(rutaPropia(sesion) + '/cancelar', { method: 'PATCH', body: JSON.stringify({ actualizadoA }) });
export const listarInscripcionesPropias = (pagina: number) => consultar<EventoPropio[]>(`/mis-inscripciones?pagina=${pagina}`);

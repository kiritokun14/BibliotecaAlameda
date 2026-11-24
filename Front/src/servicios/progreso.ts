// HU-28 / HU-29. Progreso por participación y recompensas (Back/recompensas.py, Supabase/progreso_recompensas.sql).
// Cuenta una participación por sesión con asistencia «presente» registrada por el personal y credencial
// validada y vigente en la fecha de la sesión. Niveles fijos del documento (D-11).
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export type Nivel = 0 | 1 | 2;
export const NIVELES: { nivel: Nivel; nombre: string; desde: number; hasta: number | null }[] = [
    { nivel: 0, nombre: 'Inicial', desde: 0, hasta: 2 },
    { nivel: 1, nombre: 'Lector activo', desde: 3, hasta: 5 },
    { nivel: 2, nombre: 'Lector constante', desde: 6, hasta: null },
];
export const nombreNivel = (n: number) => NIVELES[Math.max(0, Math.min(2, n))].nombre;

/** Participaciones que faltan para el siguiente nivel; null en el último. */
export function siguienteNivel(total: number) {
    const siguiente = NIVELES.find((n) => n.desde > total);
    return siguiente ? { ...siguiente, faltan: siguiente.desde - total } : null;
}

/** Avance (0–100) dentro del tramo hacia el siguiente nivel. */
export function avanceNivel(total: number) {
    const s = siguienteNivel(total);
    if (!s) return 100;
    return Math.round((Math.max(0, total) / s.desde) * 100);
}

export type RazonParticipacion = 'valida' | 'sin_credencial' | 'sesion_cancelada';
export const NOMBRE_RAZON: Record<RazonParticipacion, string> = {
    valida: 'Cuenta', sin_credencial: 'No cuenta: sin credencial vigente ese día', sesion_cancelada: 'No cuenta: sesión cancelada',
};

export interface ResumenProgreso {
    usuarioId: string;
    nombre: string;
    validas: number;
    ajustes: number;
    total: number;
    nivel: Nivel;
    noContadas: number;
    credencial: { estado: 'pendiente' | 'validada' | 'rechazada' | 'vencida'; vence: string; vigente: boolean } | null;
    asignadas: number;
    entregadas: number;
    ultimaParticipacion: string | null;
}

export interface Participacion { sesionId: string; actividad: string; folio?: string; inicio: string; cuenta: boolean; razon: RazonParticipacion }
export interface Ajuste { id: string; cambio: number; motivo: string; quien: string; fecha: string }

export type EstadoRecompensaApi = 'activa' | 'inactiva' | 'agotada' | 'archivada';
export interface Recompensa {
    id: string;
    nombre: string;
    descripcion: string;
    nivelRequerido: Nivel;
    existencias: number;
    vigenciaInicio: string;
    vigenciaFin: string;
    estado: EstadoRecompensaApi;
    asignadas: number;
    entregadas: number;
    actualizadoEn: string;
}

export type EstadoEntrega = 'asignada' | 'entregada' | 'cancelada';
export interface Entrega {
    id: string;
    estado: EstadoEntrega;
    recompensaId: string;
    recompensa: string;
    usuarioId: string;
    persona: string;
    asignadaPor: string;
    asignadaEn: string;
    autorizacion: { referencia: string; autoridad: string; fecha: string } | null;
    confirmadaPor: string | null;
    confirmadaEn: string | null;
    canceladaPor: string | null;
    canceladaEn: string | null;
    motivoCancelacion: string | null;
    notas: string;
}

export interface FichaProgreso { resumen: ResumenProgreso; participaciones: Participacion[]; ajustes: Ajuste[]; entregas: Entrega[] }

export interface MiProgreso {
    resumen: ResumenProgreso;
    participaciones: Participacion[];
    recompensas: { id: string; nombre: string; descripcion: string; nivelRequerido: Nivel; disponible: boolean; vigenciaFin: string }[];
    entregas: { id: string; recompensaId: string; recompensa: string; estado: Exclude<EstadoEntrega, 'cancelada'>; asignadaEn: string; confirmadaEn: string | null }[];
}

export interface DatosRecompensa {
    nombre: string;
    descripcion: string;
    nivelRequerido: Nivel;
    existencias: number;
    vigenciaInicio: string;
    vigenciaFin: string;
    estado: 'activa' | 'inactiva' | 'archivada';
}

export interface DatosAsignacion { recompensaId: string; usuarioId: string; referencia: string; autoridad: string; fechaAutorizacion: string; notas: string }

async function token() {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return data.session.access_token;
}

async function pedir<T>(ruta: string, metodo = 'GET', cuerpo?: unknown): Promise<T> {
    return pedirApi<T>(ruta, {
        method: metodo, headers: { Authorization: `Bearer ${await token()}` },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
}

const id = (x: string) => encodeURIComponent(x);

export const consultarMiProgreso = () => pedir<MiProgreso>('/progreso/mio');
export const listarParticipantes = () => pedir<ResumenProgreso[]>('/participantes/progreso');
export const consultarParticipante = (usuarioId: string) => pedir<FichaProgreso>(`/participantes/progreso/${id(usuarioId)}`);
export const ajustarProgreso = (usuarioId: string, cambio: number, motivo: string) =>
    pedir<FichaProgreso>(`/participantes/progreso/${id(usuarioId)}/ajustes`, 'POST', { cambio, motivo });
export const listarRecompensas = () => pedir<Recompensa[]>('/participantes/recompensas');
export const crearRecompensa = (d: DatosRecompensa) => pedir<Recompensa>('/participantes/recompensas', 'POST', d);
export const editarRecompensa = (recompensaId: string, d: DatosRecompensa, actualizadoEn: string) =>
    pedir<Recompensa>(`/participantes/recompensas/${id(recompensaId)}`, 'PATCH', { ...d, actualizadoEn });
export const listarEntregas = () => pedir<Entrega[]>('/participantes/entregas');
export const asignarRecompensa = (d: DatosAsignacion) => pedir<Entrega>('/participantes/entregas', 'POST', d);
export const confirmarEntrega = (entregaId: string) => pedir<Entrega>(`/participantes/entregas/${id(entregaId)}/confirmar`, 'POST');
export const cancelarAsignacion = (entregaId: string, motivo: string) =>
    pedir<Entrega>(`/participantes/entregas/${id(entregaId)}/cancelar`, 'POST', { motivo });

/** Si una persona puede recibir una recompensa ahora (lo mismo que revisa la base; ella tiene la última palabra). */
export function puedeRecibir(p: ResumenProgreso, r: Recompensa, entregas: Entrega[], ahora = new Date()) {
    if (r.estado !== 'activa' || r.existencias < 1) return 'No está activa o no tiene existencias.';
    if (new Date(r.vigenciaInicio) > ahora || new Date(r.vigenciaFin) < ahora) return 'No está vigente hoy.';
    if (!p.credencial?.vigente) return 'Necesita credencial validada y vigente.';
    if (p.nivel < r.nivelRequerido) return `Pide nivel ${nombreNivel(r.nivelRequerido)}.`;
    if (entregas.some((e) => e.recompensaId === r.id && e.usuarioId === p.usuarioId && e.estado !== 'cancelada')) return 'Ya la tiene asignada o entregada.';
    return null;
}

export function disponibilidad(r: Pick<Recompensa, 'estado' | 'existencias'>) {
    if (r.estado === 'archivada') return { texto: 'Archivada', tono: 'gris' as const };
    if (r.estado === 'inactiva') return { texto: 'Inactiva', tono: 'gris' as const };
    if (r.existencias === 0 || r.estado === 'agotada') return { texto: 'Agotada', tono: 'guinda' as const };
    if (r.existencias <= 5) return { texto: 'Pocas', tono: 'dorado' as const };
    return { texto: 'Disponible', tono: 'verde' as const };
}

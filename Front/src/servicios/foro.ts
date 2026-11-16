import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import type { Respuesta, Tema } from '../pages/publico/club/datos';
export interface TemaReal extends Tema { respuestas: number; ultimaActividad: string }
export interface RespuestaReal extends Respuesta { version: string | null; reportada: boolean }
interface TemaBase { id: string; titulo: string; descripcion: string; fecha: string; respuestas: number; ultimaActividad: string }
interface RespuestaBase { id: string; temaId: string; texto: string; autor: string; fecha: string; propia: boolean; estado: string; version: string | null; reportada: boolean }
export interface ContenidoPendiente { tipo: 'tema' | 'comentario'; id: string; titulo?: string; texto: string; estado: string; version: string }
async function pedir<T>(ruta: string, opciones: RequestInit = {}, privada = false): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || (privada && !data.session)) throw new ErrorServicio('Inicia sesión para participar en el foro.', 401);
    return pedirApi<T>('/foro' + ruta, { ...opciones, headers: data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
}
export function fechaForo(fecha: string) {
    const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mazatlan', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(fecha));
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(p => p.type === tipo)?.value;
    return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}
export function adaptarTema(t: TemaBase, numero = 0): TemaReal {
    return { slug: t.id, numero: String(numero + 1).padStart(2, '0'), etiqueta: 'CONVERSACIÓN', color: 'verde', titulo: t.titulo, descripcion: t.descripcion,
        inicial: { fecha: fechaForo(t.fecha), titulo: t.titulo, texto: t.descripcion }, respuestas: t.respuestas, ultimaActividad: fechaForo(t.ultimaActividad) };
}
export async function consultarTemasForo(pagina = 0) {
    const datos = await pedir<{ total: number; temas: TemaBase[] }>('/temas?desplazamiento=' + pagina * 20);
    return { total: datos.total, temas: datos.temas.map((t, i) => adaptarTema(t, pagina * 20 + i)) };
}
export async function consultarTemaForo(id: string) { return adaptarTema(await pedir<TemaBase>('/temas/' + encodeURIComponent(id))); }
export async function consultarRespuestasForo(id: string, pagina = 0) {
    const datos = await pedir<{ total: number; respuestas: RespuestaBase[] }>('/temas/' + encodeURIComponent(id) + '/respuestas?desplazamiento=' + pagina * 20);
    return { total: datos.total, respuestas: datos.respuestas.map((r): RespuestaReal => ({ ...r, tema: r.temaId, fecha: fechaForo(r.fecha), estado: r.estado === 'pendiente' ? 'en-revision' : 'publicada' })) };
}
export const publicarRespuestaForo = (tema: string, id: string, texto: string) => pedir<ContenidoPendiente>('/temas/' + encodeURIComponent(tema) + '/respuestas', { method: 'POST', body: JSON.stringify({ id, texto: texto.trim() }) }, true);
export const editarRespuestaForo = (respuesta: RespuestaReal, texto: string) => pedir<ContenidoPendiente>('/respuestas/' + encodeURIComponent(respuesta.id), { method: 'PATCH', body: JSON.stringify({ version: respuesta.version, texto: texto.trim() }) }, true);
export const retirarRespuestaForo = (respuesta: RespuestaReal) => pedir<ContenidoPendiente>('/respuestas/' + encodeURIComponent(respuesta.id), { method: 'DELETE', body: JSON.stringify({ version: respuesta.version }) }, true);
export const consultarPendientesForo = (pagina = 0) => pedir<{ total: number; contenidos: ContenidoPendiente[] }>('/moderacion/pendientes?desplazamiento=' + pagina * 20, {}, true);
export const revisarContenidoForo = (contenido: ContenidoPendiente, medida: 'publicar' | 'rechazar', motivo: string) => pedir<ContenidoPendiente>(`/moderacion/pendientes/${contenido.tipo}/${encodeURIComponent(contenido.id)}`, { method: 'PATCH', body: JSON.stringify({ version: contenido.version, medida, motivo: motivo.trim() }) }, true);

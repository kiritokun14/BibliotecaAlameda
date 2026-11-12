import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultasEditor } from './consultas';
import type { Contenido } from './contenidos';

export interface EventoContenido {
    accion: string; nota: string | null; observaciones: string[];
    detalles: { referencia?: string }; fecha: string; responsable: string;
}
export interface ContenidoRevision extends Contenido { autor: string; historial: EventoContenido[] }
export interface ListaRevision { total: number; contenidos: ContenidoRevision[] }
export const ESTADOS_PUBLICACION: Record<string, string> = {
    borrador: 'Borrador', en_revision: 'Por autorizar', con_observaciones: 'Con observaciones',
    aprobado: 'Aprobado', publicado: 'Publicado', retirado: 'Retirado', rechazado: 'Rechazado', archivado: 'Archivado',
};
export function rutaPublica(c: { tipo: string; folio: string; datos: Record<string, unknown> }) {
    if (c.tipo === 'noticia') return `/noticias/${c.folio}`;
    if (c.tipo === 'resena') return `/lecturas/${c.folio}`;
    if (c.tipo === 'memoria') return `/lecturas/memoria/${c.folio}`;
    const seccion = String(c.datos.seccion ?? '').toLowerCase();
    return `/acerca/${seccion.includes('misi') ? 'mision-vision' : seccion.includes('sol') ? 'solon-arguello' : seccion.includes('rol') ? 'rol' : 'historia'}`;
}
async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    const token = data.session.access_token;
    const ejecutar = () => pedirApi<T>(ruta, { headers: { Authorization: `Bearer ${token}` },
        ...(cuerpo === undefined ? {} : { method: 'POST', body: JSON.stringify(cuerpo) }) });
    if (cuerpo === undefined) return consultasEditor.obtener(`${token}:${ruta}`, ejecutar);
    consultasEditor.limpiar();
    memoriaPublicados.clear(); // una decisión del personal cambia lo publicado
    try { return await ejecutar(); } finally { consultasEditor.limpiar(); }
}
// limite: de 1 a 50 (el backend no acepta más); la página se cuenta con ese mismo tamaño
export function listarRevision(estado: string, busqueda: string, pagina: number, limite = 10) {
    const p = new URLSearchParams({ limite: String(limite), desplazamiento: String(pagina * limite) });
    if (estado) p.set('estado', estado);
    if (busqueda.trim()) p.set('busqueda', busqueda.trim());
    return pedir<ListaRevision>(`/contenidos/revision?${p}`);
}
export function obtenerRevision(folio: string, propio = false) {
    return pedir<ContenidoRevision>(propio ? `/contenidos/editor/${encodeURIComponent(folio)}/historial`
        : `/contenidos/revision/${encodeURIComponent(folio)}`);
}
export type DecisionPublicacion = { referencia: string; nota?: string } | { observaciones: string[]; nota?: string } | { nota: string };
export function decidirContenido(c: ContenidoRevision, accion: 'publicar' | 'observaciones' | 'rechazar' | 'retirar', datos: DecisionPublicacion) {
    return pedir<ContenidoRevision>(`/contenidos/revision/${encodeURIComponent(c.folio)}/${accion}`,
        { ...datos, actualizadoEn: c.actualizadoEn });
}

export interface ContenidoPublico {
    imagenUrl?: string | null;
    folio: string; slug: string; tipo: string; titulo: string; resumen: string;
    cuerpo: string; datos: Record<string, unknown>; publicadoEn: string;
}
// Última respuesta de cada consulta pública, solo en memoria de esta pestaña (se pierde al recargar).
// Sirve para pintar al instante al volver a una página; la consulta se hace de todos modos y la reemplaza,
// así que retirar una publicación se sigue reflejando en cuanto llega la respuesta nueva.
const memoriaPublicados = new Map<string, ContenidoPublico[]>();

// Lo último que se recibió para ese tipo (o lo que se puede sacar de la consulta sin tipo); undefined si nunca se pidió
export function publicadosEnMemoria(tipo?: string): ContenidoPublico[] | undefined {
    const propio = memoriaPublicados.get(tipo ?? '');
    if (propio || !tipo) return propio;
    return memoriaPublicados.get('')?.filter((c) => c.tipo === tipo);
}

// Adelanta la consulta (por ejemplo, al pasar el mouse por un enlace del menú)
export function precargarPublicados(tipo?: string) {
    listarPublicados(tipo).catch(() => undefined);
}

export async function listarPublicados(tipo?: string): Promise<ContenidoPublico[]> {
    const filas: ContenidoPublico[] = [];
    for (let desplazamiento = 0; desplazamiento <= 100000; desplazamiento += 50) {
        const p = new URLSearchParams({ limite: '50', desplazamiento: String(desplazamiento) });
        if (tipo) p.set('tipo', tipo);
        const lote = await consultasEditor.obtener(`publicos:${p}`, () => pedirApi<ContenidoPublico[]>(`/contenidos/publicos?${p}`));
        filas.push(...lote);
        if (lote.length < 50) break;
    }
    memoriaPublicados.set(tipo ?? '', filas);
    return filas;
}
export async function obtenerPublicado(identificador: string, tipo?: string): Promise<ContenidoPublico | null> {
    try { return await pedirApi<ContenidoPublico>(`/contenidos/publicos/${encodeURIComponent(identificador)}${tipo ? `?tipo=${tipo}` : ''}`); }
    catch (error) { if (error instanceof ErrorServicio && error.estado === 404) return null; throw error; }
}

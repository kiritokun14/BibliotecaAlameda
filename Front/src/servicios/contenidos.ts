import { consultasEditor } from './consultas';
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

// T-054 / HU-11: Editor de contenidos. La BD comprueba en cada operación la capacidad
// 'preparar_contenidos' y que el contenido sea de quien lo pide.
export type TipoContenidoApi = 'noticia' | 'resena' | 'acerca' | 'memoria' | 'servicio' | 'programa' | 'recurso';
export type TipoEditable = Extract<TipoContenidoApi, 'noticia' | 'resena' | 'acerca' | 'memoria'>;
export type EstadoFiltroEditor = 'borrador' | 'en_revision' | 'con_observaciones' | 'publicado';
// 'en_revision' es lo que la pantalla llama "Por autorizar"
export type EstadoContenidoApi = 'borrador' | 'en_revision' | 'con_observaciones' | 'aprobado' | 'publicado' | 'retirado' | 'archivado' | 'rechazado';

export interface ResumenContenidos {
    borrador: number; en_revision: number; con_observaciones: number; publicado: number; total: number;
}
export interface FilaContenidoApi {
    folio: string; tipo: TipoContenidoApi; estado: EstadoContenidoApi; titulo: string; actualizadoEn: string;
}
export interface ListaContenidos { total: number; contenidos: FilaContenidoApi[] }
export interface Contenido extends FilaContenidoApi {
    tieneImagen?: boolean;
    resumen: string; cuerpo: string; datos: Record<string, unknown>;
    creadoEn: string; enviadoEn: string | null; publicadoEn: string | null;
    observaciones?: { lista: string[]; nota: string | null; realizadoEn: string } | null;
}
export interface CambiosContenido {
    titulo?: string; resumen?: string; cuerpo?: string; datos?: Record<string, unknown>;
}

async function pedirEditor<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data } = await (await obtenerSupabase()).auth.getSession();
    if (!data.session) throw new ErrorServicio('Inicia sesión con una cuenta del personal para continuar.', 401);
    const token = data.session.access_token;
    const ejecutar = () => pedirApi<T>(`/contenidos/editor${ruta}`, { ...opciones,
        headers: { ...opciones.headers, Authorization: `Bearer ${token}` } });
    if (!opciones.method || opciones.method === 'GET')
        return consultasEditor.obtener(`${token}:${ruta}`, ejecutar);
    consultasEditor.limpiar();
    try { return await ejecutar(); }
    finally { consultasEditor.limpiar(); }
}

export function consultarResumen() {
    return pedirEditor<ResumenContenidos>('/resumen');
}
export function listarContenidos(filtros: { estado?: EstadoFiltroEditor; busqueda?: string; limite?: number; desplazamiento?: number } = {}) {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros))
        if (valor !== undefined && valor !== '') parametros.set(clave, String(valor));
    const consulta = parametros.toString();
    return pedirEditor<ListaContenidos>(consulta ? `?${consulta}` : '');
}
export function obtenerContenido(folio: string) {
    return pedirEditor<Contenido>(`/${encodeURIComponent(folio)}`);
}
export function crearBorrador(tipo: TipoEditable, cambios: CambiosContenido) {
    return pedirEditor<Contenido>('', { method: 'POST', body: JSON.stringify({ tipo, ...cambios }) });
}
export function guardarBorrador(folio: string, cambios: CambiosContenido) {
    return pedirEditor<Contenido>(`/${encodeURIComponent(folio)}`, { method: 'PUT', body: JSON.stringify(cambios) });
}
export function enviarAAutorizacion(folio: string, nota?: string) {
    return pedirEditor<Contenido>(`/${encodeURIComponent(folio)}/enviar`, {
        method: 'POST', body: JSON.stringify(nota?.trim() ? { nota: nota.trim() } : {}) });
}

// Guarda (creando el borrador si aún no tiene folio) y devuelve el contenido guardado.
export async function guardar(folio: string | null, tipo: TipoEditable, cambios: CambiosContenido) {
    return folio ? guardarBorrador(folio, cambios) : crearBorrador(tipo, cambios);
}

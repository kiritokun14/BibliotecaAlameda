// Reacciones a un contenido publicado (noticia, reseña o registro de memoria): «Me gusta», «Me sirvió» y «Compartir».
// Todos comparten folio (CN-0045), así que la ruta es una sola para los tres.
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export type TipoReaccion = 'me_gusta' | 'me_sirvio';
export interface ReaccionesNoticia {
    meGusta: number; meSirvio: number; compartir: number;
    mias: TipoReaccion[]; // las que marcó la persona con sesión
}

async function pedirReacciones(ruta: string, method: string, requiereSesion = false): Promise<ReaccionesNoticia> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    const token = error ? undefined : data.session?.access_token;
    if (requiereSesion && !token) throw new ErrorServicio('Inicia sesión para reaccionar.', 401);
    return pedirApi<ReaccionesNoticia>(ruta, { method, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
}

const base = (id: string) => `/contenidos/publicos/${encodeURIComponent(id)}`;
const ruta = (id: string) => `${base(id)}/reacciones`;
export const consultarReacciones = (id: string) => pedirReacciones(ruta(id), 'GET');
export const marcarReaccion = (id: string, tipo: TipoReaccion, activa: boolean) =>
    pedirReacciones(`${ruta(id)}/${tipo}`, activa ? 'PUT' : 'DELETE', true);
export const registrarCompartido = (id: string) =>
    pedirReacciones(`${base(id)}/compartidos`, 'POST');

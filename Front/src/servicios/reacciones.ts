// Reacciones a un contenido publicado (noticia, reseña o registro de memoria): «Me gusta», «Me sirvió» y «Compartir».
// Todos comparten folio (CN-0045), así que la ruta es una sola para los tres.
// TODO backend (contrato en PARA_BACKEND.md, «Reacciones»):
//   GET    /contenidos/publicos/{folio}/reacciones          → ReaccionesNoticia (público; con sesión incluye «mias»)
//   PUT    /contenidos/publicos/{folio}/reacciones/{tipo}   → ReaccionesNoticia (con sesión; marca me_gusta | me_sirvio)
//   DELETE /contenidos/publicos/{folio}/reacciones/{tipo}   → ReaccionesNoticia (con sesión; quita la marca)
//   POST   /contenidos/publicos/{folio}/compartidos         → ReaccionesNoticia (público; suma 1 al compartir)
// Mientras no existan, la pantalla funciona con los conteos que trae el contenido y guarda la marca de la
// persona en este navegador (`reaccionesLocales`), para que el botón responda.
import { ErrorServicio, obtenerSupabase, pedirApi } from './api';

export type TipoReaccion = 'me_gusta' | 'me_sirvio';
export interface ReaccionesNoticia {
    meGusta: number; meSirvio: number; compartir: number;
    mias: TipoReaccion[]; // las que marcó la persona con sesión
}

async function conSesion<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para reaccionar.', 401);
    return pedirApi<T>(ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}

const base = (id: string) => `/contenidos/publicos/${encodeURIComponent(id)}`;
const ruta = (id: string) => `${base(id)}/reacciones`;
export const consultarReacciones = (id: string) => conSesion<ReaccionesNoticia>(ruta(id)).catch(() => pedirApi<ReaccionesNoticia>(ruta(id)));
export const marcarReaccion = (id: string, tipo: TipoReaccion, activa: boolean) =>
    conSesion<ReaccionesNoticia>(`${ruta(id)}/${tipo}`, { method: activa ? 'PUT' : 'DELETE' });
export const registrarCompartido = (id: string) =>
    pedirApi<ReaccionesNoticia>(`${base(id)}/compartidos`, { method: 'POST' });

// ---------- Respaldo local mientras no hay backend ----------
// Marcas por cuenta y noticia, y veces compartida por noticia (en este navegador). Sobreviven a recargar la página.
const CLAVE = 'alameda.reacciones';
type Locales = { marcas: Record<string, TipoReaccion[]>; compartidos: Record<string, number> };
function leer(): Locales {
    try {
        const d = JSON.parse(localStorage.getItem(CLAVE) ?? '{}');
        return { marcas: d?.marcas ?? {}, compartidos: d?.compartidos ?? {} };
    } catch { return { marcas: {}, compartidos: {} }; }
}
function escribir(d: Locales) { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* sin almacenamiento */ } }
export const reaccionesLocales = {
    de: (cuenta: string, noticia: string): TipoReaccion[] => leer().marcas[`${cuenta}:${noticia}`] ?? [],
    guardar(cuenta: string, noticia: string, mias: TipoReaccion[]) { const d = leer(); d.marcas[`${cuenta}:${noticia}`] = mias; escribir(d); },
    compartidos: (noticia: string): number => leer().compartidos[noticia] ?? 0,
    sumarCompartido(noticia: string) { const d = leer(); d.compartidos[noticia] = (d.compartidos[noticia] ?? 0) + 1; escribir(d); },
};

// Conteos que se muestran sin backend: los de la noticia más las marcas y compartidos guardados aquí
export function conteoLocal(base: { meGusta: number; meSirvio: number; compartir: number }, noticia: string, mias: TipoReaccion[]) {
    return {
        meGusta: base.meGusta + (mias.includes('me_gusta') ? 1 : 0),
        meSirvio: base.meSirvio + (mias.includes('me_sirvio') ? 1 : 0),
        compartir: base.compartir + reaccionesLocales.compartidos(noticia),
    };
}

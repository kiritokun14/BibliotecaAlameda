import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { decidirContenido, listarRevision, obtenerRevision, obtenerPublicado, listarPublicados, rutaPublica, type ContenidoRevision } from '../src/servicios/publicacion';
import { invalidarConsultas } from '../src/servicios/consultas';
import { noticiaPublicada } from '../src/pages/publico/noticias/datos';
import { resenaPublicada, memoriaPublicada } from '../src/pages/publico/lecturas/publicados';

const peticiones = vi.fn();
const contenido = { folio: 'CN-0010', tipo: 'noticia', estado: 'en_revision', actualizadoEn: '2026-11-02T12:00:00.123456Z', datos: {} } as ContenidoRevision;
beforeEach(() => {
    vi.clearAllMocks(); invalidarConsultas();
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-revisor' } } });
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' } : []), { status: 200 }));
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());
it('publicar conserva la versión revisada y la autorización, sin cambiar estado desde el navegador', async () => {
    await decidirContenido(contenido, 'publicar', { referencia: 'Acta 1' });
    const llamada = peticiones.mock.calls.find(([url]) => url.endsWith('/publicar'))!;
    expect(llamada[1].headers.Authorization).toBe('Bearer token-revisor');
    expect(JSON.parse(llamada[1].body)).toEqual({ actualizadoEn: contenido.actualizadoEn, referencia: 'Acta 1' });
});
it('bandeja consulta los enviados reales con filtro y paginación', async () => {
    await listarRevision('en_revision', ' título ', 2);
    const url = peticiones.mock.calls.find(([url]) => url.includes('/contenidos/revision?'))![0];
    const parametros = new URLSearchParams(url.split('?')[1]);
    expect(parametros.get('desplazamiento')).toBe('20');
    expect(parametros.get('busqueda')).toBe('título');
});
it('sin sesión no consulta contenido de revisión', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(obtenerRevision('CN-0010')).rejects.toMatchObject({ estado: 401 });
    expect(peticiones.mock.calls.some(([url]) => url.includes('/contenidos/revision'))).toBe(false);
});
it('el autor consulta su historial por una ruta propia', async () => {
    await obtenerRevision('CN-0010', true);
    expect(peticiones.mock.calls.some(([url]) => url === '/api/contenidos/editor/CN-0010/historial')).toBe(true);
});
it('un conflicto no se presenta como una decisión guardada', async () => {
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'Recarga' }), { status: 409 }));
    await expect(decidirContenido(contenido, 'retirar', { nota: 'Motivo' })).rejects.toMatchObject({ estado: 409 });
});
it('un retirado o desconocido devuelve no disponible y no un ejemplo', async () => {
    peticiones.mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await obtenerPublicado('CN-0010')).toBeNull();
    peticiones.mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(listarPublicados('noticia')).rejects.toMatchObject({ estado: 503 });
});
it('la consulta pública es anónima y vuelve a pedir resultados después de terminar', async () => {
    await listarPublicados('noticia'); await listarPublicados('noticia');
    expect(cliente.auth.getSession).not.toHaveBeenCalled();
    expect(peticiones.mock.calls.filter(([url]) => url.includes('/publicos?'))).toHaveLength(2);
});
it('los cuatro tipos conservan folio, texto y destino público del registro real', () => {
    const publico = { folio: 'CN-1234', slug: 'cn-1234', tipo: 'noticia', titulo: 'Título real', resumen: 'Resumen real', cuerpo: 'Texto real', publicadoEn: '2026-11-02T12:00:00Z', datos: {} };
    expect(noticiaPublicada(publico).id).toBe('CN-1234');
    expect(resenaPublicada(publico).cuerpo[0].texto).toBe('Texto real');
    expect(memoriaPublicada(publico).cuerpo).toEqual(['Texto real']);
    expect(rutaPublica({ ...publico, tipo: 'memoria' })).toBe('/lecturas/memoria/CN-1234');
    expect(rutaPublica({ ...publico, tipo: 'acerca', datos: { seccion: 'mision' } })).toBe('/acerca/mision-vision');
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { decidirContenido, listarPublicados, publicadosEnMemoria, type ContenidoRevision } from '../src/servicios/publicacion';
import { invalidarConsultas } from '../src/servicios/consultas';

// Memoria de lo publicado: pinta al instante al volver a una página, pero siempre se vuelve a consultar
const fila = (folio: string, tipo: string) => ({ folio, slug: folio, tipo, titulo: folio, resumen: '', cuerpo: '', datos: {}, publicadoEn: '2026-11-01T10:00:00Z' });
let publicados = [fila('N-1', 'noticia'), fila('R-1', 'resena')];
const peticiones = vi.fn();

beforeEach(() => {
    vi.clearAllMocks(); invalidarConsultas();
    publicados = [fila('N-1', 'noticia'), fila('R-1', 'resena')];
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    peticiones.mockImplementation(async (url: string) => {
        if (url.endsWith('/configuracion')) return new Response(JSON.stringify({ url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' }));
        const tipo = new URL(url, 'http://local').searchParams.get('tipo');
        return new Response(JSON.stringify(publicados.filter((c) => !tipo || c.tipo === tipo)));
    });
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());

it('guarda la última respuesta y la deriva por tipo desde la consulta general', async () => {
    await listarPublicados();
    expect(publicadosEnMemoria()?.map((c) => c.folio)).toEqual(['N-1', 'R-1']);
    // Sin haber pedido «noticia» todavía, sale de la consulta general
    expect(publicadosEnMemoria('noticia')?.map((c) => c.folio)).toEqual(['N-1']);
});

it('cada consulta reemplaza la memoria: lo retirado deja de mostrarse', async () => {
    await listarPublicados('noticia');
    publicados = [fila('R-1', 'resena')];
    invalidarConsultas();
    await listarPublicados('noticia');
    expect(publicadosEnMemoria('noticia')).toEqual([]);
});

it('una decisión del personal borra la memoria de lo publicado', async () => {
    await listarPublicados('noticia');
    expect(publicadosEnMemoria('noticia')).toHaveLength(1);
    await decidirContenido({ folio: 'N-1', actualizadoEn: '2026-11-01T10:00:00Z' } as ContenidoRevision, 'retirar', { nota: 'Ya pasó' });
    expect(publicadosEnMemoria('noticia')).toBeUndefined();
});

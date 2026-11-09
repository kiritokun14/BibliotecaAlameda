import { beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('../src/servicios/api', () => ({ obtenerSupabase: vi.fn(async () => cliente), pedirApi: vi.fn(), ErrorServicio: class extends Error {} }));
import { pedirApi } from '../src/servicios/api';
import { consultarTemasForo, consultarRespuestasForo, publicarRespuestaForo, editarRespuestaForo, retirarRespuestaForo, revisarContenidoForo, type RespuestaReal } from '../src/servicios/foro';
beforeEach(() => { vi.clearAllMocks(); cliente.auth.getSession.mockResolvedValue({ data: { session: null } }); });
it('muestra los temas reales con su identificador; no rellena conversaciones de ejemplo', async () => {
    vi.mocked(pedirApi).mockResolvedValue({ total: 1, temas: [{ id: 'uuid', titulo: 'Tema real', descripcion: 'Lectura', fecha: '2026-11-08T19:30:00Z', respuestas: 4, ultimaActividad: '2026-11-08T19:30:00Z' }] });
    const r = await consultarTemasForo();
    expect(r.temas).toHaveLength(1); expect(r.temas[0]).toMatchObject({ slug: 'uuid', titulo: 'Tema real', respuestas: 4, ultimaActividad: '2026-11-08T12:30' });
    expect(pedirApi).toHaveBeenCalledWith('/foro/temas?desplazamiento=0', { headers: {} });
});
it('las respuestas respetan estado y propiedad decididos por el servidor', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'actual' } } });
    vi.mocked(pedirApi).mockResolvedValue({ total: 1, respuestas: [{ id: 'respuesta', temaId: 'tema', texto: 'Opinión', fecha: '2026-11-08T19:30:00Z', estado: 'pendiente', propia: true, autor: 'Ana', version: 'a'.repeat(32), reportada: false }] });
    const r = await consultarRespuestasForo('tema');
    expect(r.respuestas[0]).toMatchObject({ estado: 'en-revision', propia: true, version: 'a'.repeat(32) });
    expect(vi.mocked(pedirApi).mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer actual' });
});
it('publicar exige sesión y mantiene el identificador para un reintento seguro', async () => {
    await expect(publicarRespuestaForo('tema', 'intento', 'Texto')).rejects.toThrow('Inicia sesión');
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'actual' } } });
    await publicarRespuestaForo('tema', 'intento', ' Texto '); await publicarRespuestaForo('tema', 'intento', ' Texto ');
    expect(vi.mocked(pedirApi).mock.calls.map(c => JSON.parse(c[1]!.body as string))).toEqual([{ id: 'intento', texto: 'Texto' }, { id: 'intento', texto: 'Texto' }]);
});
it('editar y retirar incluyen la versión propia sin aprobar automáticamente', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'actual' } } });
    const r = { id: 'respuesta', version: 'a'.repeat(32) } as RespuestaReal;
    await editarRespuestaForo(r, ' Edición '); await retirarRespuestaForo(r);
    expect(JSON.parse(vi.mocked(pedirApi).mock.calls[0][1]!.body as string)).toEqual({ version: r.version, texto: 'Edición' });
    expect(vi.mocked(pedirApi).mock.calls[1][1]?.method).toBe('DELETE');
});
it('la aprobación real requiere versión y motivo, sin funciones de simulación', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'actual' } } });
    await revisarContenidoForo({ id: 'respuesta', tipo: 'comentario', estado: 'pendiente', texto: 'Opinión', version: 'a'.repeat(32) }, 'publicar', ' Revisado ');
    expect(pedirApi).toHaveBeenCalledWith('/foro/moderacion/pendientes/comentario/respuesta', { method: 'PATCH', headers: { Authorization: 'Bearer actual' }, body: JSON.stringify({ version: 'a'.repeat(32), medida: 'publicar', motivo: 'Revisado' }) });
});
it('los errores de carga no se sustituyen por datos simulados', async () => {
    vi.mocked(pedirApi).mockRejectedValue(new Error('Sin conexión'));
    await expect(consultarTemasForo()).rejects.toThrow('Sin conexión');
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { consultarAgenda, consultarActividadPublica, decidirActividad, guardarActividad, listarActividades, type ActividadGestion } from '../src/servicios/actividades';
import { invalidarConsultas } from '../src/servicios/consultas';
const peticiones = vi.fn();
const datos = { nombre: 'Taller', tipo: 'Taller', descripcion: '', fecha: '', inicio: '', fin: '', espacio: '', cupo: '', inscripcion: true, publico: '', responsable: '', materiales: '' };
const actividad = { ...datos, folio: 'AC-000001', actualizado: '2026-11-05T12:00:00Z' } as ActividadGestion;
beforeEach(() => {
    vi.clearAllMocks(); invalidarConsultas();
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } });
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' } : { total: 0, actividades: [] }), { status: 200 }));
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());
it('la agenda y su detalle son públicos y envían las fechas reales', async () => {
    await consultarAgenda({ desde: '2026-11-01', hasta: '2026-11-30', tipo: 'Club', pagina: 2 });
    await consultarActividadPublica('AC-000001');
    expect(cliente.auth.getSession).not.toHaveBeenCalled();
    expect(peticiones.mock.calls[0][0]).toContain('desde=2026-11-01');
    expect(peticiones.mock.calls[0][0]).toContain('pagina=2');
    expect(peticiones.mock.calls[1][0]).toBe('/api/actividades/publicas/AC-000001');
});
it('crear borrador no envía identidad ni un estado publicado', async () => {
    await guardarActividad(datos, 'borrador');
    const llamada = peticiones.mock.calls.find(([url]) => url === '/api/actividades/gestion')!;
    const cuerpo = JSON.parse(llamada[1].body);
    expect(cuerpo).toMatchObject({ estado: 'borrador', fecha: null, inicio: null, fin: null });
    expect(cuerpo).not.toHaveProperty('creadoPor');
    expect(llamada[1].headers.Authorization).toBe('Bearer sesion');
});
it('aprobar, publicar y retirar pasan por el servidor con la versión revisada', async () => {
    for (const accion of ['aprobar', 'publicar', 'retirar'] as const) await decidirActividad(actividad, accion, 'Acta', 'Motivo');
    const llamadas = peticiones.mock.calls.filter(([url]) => url.includes('/gestion/AC-000001/'));
    expect(llamadas).toHaveLength(3);
    for (const [, opciones] of llamadas) expect(JSON.parse(opciones.body)).toEqual({ actualizado: actividad.actualizado, referencia: 'Acta', motivo: 'Motivo' });
});
it('la edición conserva versión y no fuerza un estado', async () => {
    await guardarActividad(datos, 'borrador', actividad);
    const [, opciones] = peticiones.mock.calls.find(([url]) => url.endsWith('/gestion/AC-000001'))!;
    expect(opciones.method).toBe('PATCH');
    expect(JSON.parse(opciones.body)).toHaveProperty('actualizado', actividad.actualizado);
    expect(JSON.parse(opciones.body)).not.toHaveProperty('estado');
});
it('sin sesión no consulta la gestión privada', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(listarActividades()).rejects.toMatchObject({ estado: 401 });
    expect(peticiones.mock.calls.some(([url]) => url.includes('/actividades/gestion'))).toBe(false);
});
it('fallos y conflictos se propagan sin sustituirlos por ejemplos', async () => {
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'Recarga' }), { status: 409 }));
    await expect(decidirActividad(actividad, 'publicar')).rejects.toMatchObject({ estado: 409 });
    peticiones.mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(consultarAgenda()).rejects.toMatchObject({ estado: 503 });
});

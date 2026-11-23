import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => cliente }));
import { aplicarCambioActividad, consultarAvisosCambios, leerAvisoCambio, listarCambiosActividad, resolverCambioActividad, solicitarCambioActividad, type CambioActividad } from '../src/servicios/cambiosActividad';
import { capacidadPanel } from '../src/servicios/accesoPanel';
const peticiones = vi.fn();
beforeEach(() => {
    vi.clearAllMocks();
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } });
    peticiones.mockImplementation(async (url: string) => new Response(JSON.stringify(url.endsWith('/configuracion')
        ? { url: 'https://ejemplo.supabase.co', clavePublicable: 'sb_publishable_prueba' } : { folio: 'CB-000001' }), { status: 200 }));
    vi.stubGlobal('fetch', peticiones);
});
afterEach(() => vi.unstubAllGlobals());
it('solicitar un horario llama solo al recurso de solicitudes con sesión y versión oficial', async () => {
    const solicitud = { actividad: 'AC-000001', actualizado: '2026-11-16T12:00:00Z', tipo: 'reprogramacion' as const,
        sesiones: ['sesion-1'], motivo: 'Otro horario', programacion: [{ sesionId: 'sesion-1', fecha: '2035-01-01', inicio: '10:00', fin: '11:00', espacio: 'Sala' }] };
    await solicitarCambioActividad(solicitud);
    const [, opciones] = peticiones.mock.calls.find(([url]) => url === '/api/actividades/cambios')!;
    expect(JSON.parse(opciones.body)).toEqual(solicitud);
    expect(opciones.headers.Authorization).toBe('Bearer sesion');
    expect(peticiones.mock.calls.some(([url]) => url.includes('/actividades/gestion'))).toBe(false);
});
it('registrar autorización y aplicarla son peticiones separadas que conservan la versión', async () => {
    const c = { folio: 'CB-000001', version: 2 } as CambioActividad;
    const acuerdo = { referencia: 'Acta 17', autoridad: 'Dirección', fecha: '2026-11-16' };
    await resolverCambioActividad(c, 'autorizar', 'Procede', acuerdo);
    const resolver = peticiones.mock.calls.find(([url]) => url.endsWith('/resolver'))!;
    expect(JSON.parse(resolver[1].body)).toEqual({ version: 2, decision: 'autorizar', motivo: 'Procede', acuerdo });
    expect(peticiones.mock.calls.some(([url]) => url.endsWith('/aplicar'))).toBe(false);
    await aplicarCambioActividad({ ...c, version: 3 });
    const aplicar = peticiones.mock.calls.find(([url]) => url.endsWith('/aplicar'))!;
    expect(JSON.parse(aplicar[1].body)).toEqual({ version: 3 });
});
it('sin sesión no consulta datos privados y los conflictos se muestran como errores', async () => {
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(listarCambiosActividad(true)).rejects.toMatchObject({ estado: 401 });
    expect(peticiones.mock.calls.some(([url]) => url.includes('/actividades/cambios'))).toBe(false);
    cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } });
    peticiones.mockResolvedValue(new Response(JSON.stringify({ detail: 'Recarga la solicitud.' }), { status: 409 }));
    await expect(aplicarCambioActividad({ folio: 'CB-000001', version: 2 } as CambioActividad)).rejects.toMatchObject({ estado: 409 });
});
it('el panel exige permiso de resolución para cambios y cancelaciones', () => {
    expect(capacidadPanel('/admin/actividades/cambios/CB-000001')).toBe('registrar_resoluciones_actividades');
});
it('los avisos se consultan con sesión y marcar leído no envía identidad del usuario', async () => {
    await consultarAvisosCambios(20);
    await leerAvisoCambio('aviso-propio');
    const lectura = peticiones.mock.calls.find(([url]) => url.endsWith('/avisos?desplazamiento=20'))!;
    expect(lectura[1].headers.Authorization).toBe('Bearer sesion');
    const marcado = peticiones.mock.calls.find(([url]) => url.endsWith('/avisos/aviso-propio/leer'))!;
    expect(JSON.parse(marcado[1].body)).toEqual({});
});

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('../src/servicios/api', () => ({ obtenerSupabase: vi.fn(async () => cliente), pedirApi: vi.fn(async () => ({})), ErrorServicio: class extends Error {} }));
import { pedirApi } from '../src/servicios/api';
import { buscarDestinatarios, crearAviso, prepararAviso, registrarResultadoAviso, estadosSiguientes, type AvisoManual } from '../src/servicios/avisos';
beforeEach(() => { vi.clearAllMocks(); cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } }); });
afterEach(() => vi.restoreAllMocks());
it('abrir WhatsApp solo prepara un enlace; no registra un resultado', async () => {
    await prepararAviso('folio');
    expect(pedirApi).toHaveBeenCalledExactlyOnceWith('/avisos/whatsapp/folio/preparar', { headers: { Authorization: 'Bearer sesion' } });
});
it('registra resultados con versión y nota sin cambiar el titular', async () => {
    await registrarResultadoAviso({ id: 'folio', version: 4 } as AvisoManual, 'fallido', ' No se pudo enviar ');
    expect(pedirApi).toHaveBeenCalledWith('/avisos/whatsapp/folio', { method: 'PATCH', headers: { Authorization: 'Bearer sesion' }, body: JSON.stringify({ version: 4, estadoEnvio: 'fallido', nota: 'No se pudo enviar' }) });
});
it('la creación conserva la clave para impedir duplicados al reintentar', async () => {
    const datos = { id: 'intento', usuarioId: 'persona', titulo: 'Aviso', cuerpoAviso: 'Mensaje', tipoAviso: 'atencion' };
    await crearAviso(datos); await crearAviso(datos);
    expect(vi.mocked(pedirApi).mock.calls.map(c => JSON.parse(c[1]!.body as string).id)).toEqual(['intento', 'intento']);
});
it('codifica la búsqueda y no consulta sin sesión', async () => {
    await buscarDestinatarios('Ana & Luz');
    expect(vi.mocked(pedirApi).mock.calls[0][0]).toContain('busqueda=Ana%20%26%20Luz');
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(prepararAviso('folio')).rejects.toThrow('Inicia sesión');
    expect(pedirApi).toHaveBeenCalledTimes(1);
});
it('no ofrece entrega antes del envío ni reabre una entrega confirmada', () => {
    expect(estadosSiguientes('pendiente')).toEqual(['enviado', 'fallido']);
    expect(estadosSiguientes('enviado')).toEqual(['entregado', 'fallido']);
    expect(estadosSiguientes('fallido')).toEqual(['pendiente']);
    expect(estadosSiguientes('entregado')).toEqual([]);
});

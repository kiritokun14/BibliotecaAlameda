import { beforeEach, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('../src/servicios/api', () => ({ obtenerSupabase: vi.fn(async () => cliente), pedirApi: vi.fn(async () => ({})), ErrorServicio: class extends Error {} }));
import { pedirApi } from '../src/servicios/api';
import { reportarContenidoForo, consultarMisReportes, resolverReporteForo, medidasDisponibles, type ReporteForo } from '../src/servicios/moderacion';
const reporte = { reporteId: 'reporte', estadoReporte: 'pendiente', actualizadoEn: '2026-11-08T12:00:00Z', contenido: { tipo: 'tema', id: 'tema', estado: 'publicado', version: 'a'.repeat(32) } } as ReporteForo;
beforeEach(() => { vi.clearAllMocks(); cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'actual' } } }); });
it('reportar no admite atribuir el denunciante ni resolver el contenido', async () => {
    await reportarContenidoForo('tema', 'tema', ' Abuso ');
    expect(pedirApi).toHaveBeenCalledWith('/foro/reportes', { method: 'POST', headers: { Authorization: 'Bearer actual' }, body: JSON.stringify({ tipoContenido: 'tema', contenidoId: 'tema', motivo: 'Abuso' }) });
});
it('resolver incluye ambas versiones para impedir medidas sobre contenido editado', async () => {
    await resolverReporteForo(reporte, 'ocultar', ' Motivo ');
    expect(pedirApi).toHaveBeenCalledWith('/foro/moderacion/reportes/reporte', { method: 'PATCH', headers: { Authorization: 'Bearer actual' }, body: JSON.stringify({ actualizadoEn: reporte.actualizadoEn, versionContenido: reporte.contenido.version, medida: 'ocultar', motivo: 'Motivo' }) });
});
it('el usuario solo consulta sus reportes y se exige sesión', async () => {
    await consultarMisReportes(1);
    expect(vi.mocked(pedirApi).mock.calls[0][0]).toBe('/foro/reportes/me?desplazamiento=20');
    cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(consultarMisReportes()).rejects.toThrow('Inicia sesión');
    expect(pedirApi).toHaveBeenCalledTimes(1);
});
it('no ofrece publicar, reabrir reportes cerrados ni restaurar contenido retirado', () => {
    expect(medidasDisponibles(reporte)).toEqual(['revisar', 'descartar', 'ocultar', 'retirar']);
    expect(medidasDisponibles({ ...reporte, estadoReporte: 'resuelto' })).toEqual([]);
    expect(medidasDisponibles({ ...reporte, estadoReporte: 'descartado' })).toEqual([]);
    expect(medidasDisponibles({ ...reporte, estadoReporte: 'en_revision', contenido: { ...reporte.contenido, estado: 'retirado' } })).toEqual(['descartar', 'retirar']);
});

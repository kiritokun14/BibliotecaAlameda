import { beforeEach, describe, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('../src/servicios/api', () => ({ obtenerSupabase: vi.fn(async () => cliente), pedirApi: vi.fn(async () => ({})), ErrorServicio: class extends Error {} }));
import { pedirApi } from '../src/servicios/api';
import {
    aprobarEspacio, cancelarMiSolicitud, diaLocal, enviarSolicitud, horarioLocal, proponerEspacio, responderPropuesta,
    type SolicitudEspacioPersonal,
} from '../src/servicios/espacios';
import { validarSolicitud, type DatosSolicitud } from '../src/pages/publico/espacios/datosSesion';
import { aSolicitudAdmin } from '../src/pages/admin/atencion/espacios/mapeo';

const ok: DatosSolicitud = { tipo: 'uso_espacio', fecha: '2026-11-20', horaInicio: '16:00', horaFin: '18:00', personas: '15', motivo: 'Taller de lectura', institucion: '' };
const cuerpo = (llamada: number) => JSON.parse(vi.mocked(pedirApi).mock.calls[llamada][1]!.body as string);

beforeEach(() => { vi.clearAllMocks(); cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } }); });

describe('Espacios con sesión (T-076)', () => {
    it('valida fecha, horario, personas, motivo y capacidad del área', () => {
        expect(validarSolicitud(ok, '2026-11-03')).toEqual({});
        const e = validarSolicitud({ ...ok, fecha: '2026-11-01', horaInicio: '18:00', horaFin: '16:00', personas: '0', motivo: ' ' }, '2026-11-03');
        expect(Object.keys(e).sort()).toEqual(['fecha', 'horaFin', 'motivo', 'personas']);
        expect(validarSolicitud({ ...ok, personas: '25' }, '2026-11-03', 20).personas).toBe('El área admite hasta 20 personas.');
    });
    it('envía la solicitud con sesión y sin pedir credencial', async () => {
        await enviarSolicitud({ tipo: 'uso_espacio', areaId: 'sala-lectura', fecha: '2026-11-20', horaInicio: '16:00', horaFin: '18:00', personas: 15, motivo: 'Taller' });
        expect(vi.mocked(pedirApi).mock.calls[0][0]).toBe('/espacios/solicitudes');
        expect(vi.mocked(pedirApi).mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer sesion' } });
        expect(cuerpo(0)).toMatchObject({ areaId: 'sala-lectura', personas: 15 });
    });
    it('cancela y responde propuestas por folio', async () => {
        await cancelarMiSolicitud('SE-0007', '', '  ');
        await responderPropuesta('SE-0007', true, ' Gracias ');
        expect(vi.mocked(pedirApi).mock.calls.map((c) => c[0])).toEqual(['/espacios/solicitudes/SE-0007/cancelacion', '/espacios/solicitudes/SE-0007/respuesta']);
        expect(cuerpo(0)).toEqual({ motivo: null, comentarios: null });
        expect(cuerpo(1)).toEqual({ acepta: true, comentarios: 'Gracias' });
    });
    it('el personal aprueba con la lista de cotejo y propone solo lo que cambia', async () => {
        await aprobarEspacio('SE-0007', '2026-11-09T12:00:00Z', [true, true, true, true], ' ', 'Listo');
        await proponerEspacio('SE-0007', '2026-11-09T12:00:00Z', { fecha: '2026-11-21', mensaje: 'Ese día hay evento' });
        expect(vi.mocked(pedirApi).mock.calls[0][0]).toBe('/espacios/atencion/solicitudes/SE-0007/aprobacion');
        expect(cuerpo(0)).toEqual({ actualizadoEn: '2026-11-09T12:00:00Z', verificacion: [true, true, true, true], condiciones: null, mensaje: 'Listo' });
        expect(cuerpo(1)).toEqual({ actualizadoEn: '2026-11-09T12:00:00Z', fecha: '2026-11-21', mensaje: 'Ese día hay evento' });
    });
    it('no consulta sin sesión', async () => {
        cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
        await expect(cancelarMiSolicitud('SE-0007', '', '')).rejects.toThrow('Inicia sesión');
        expect(pedirApi).not.toHaveBeenCalled();
    });
    it('muestra fechas y horas en la hora de Tepic', () => {
        expect(diaLocal('2026-11-21T03:30:00Z')).toBe('2026-11-20');
        expect(horarioLocal('2026-11-20T22:00:00Z', '2026-11-21T00:00:00Z')).toBe('15:00 a 17:00');
    });
    it('convierte una solicitud del backend a la bandeja del personal', () => {
        const base = {
            folio: 'SE-0007', tipo: 'uso_espacio', estado: 'requiere_correccion', espacio: { slug: 'sala-lectura', nombre: 'Sala de lectura' },
            inicio: '2026-11-20T22:00:00Z', fin: '2026-11-21T00:00:00Z', personas: 15, motivo: 'Taller', institucion: null, observaciones: null,
            acuerdo: null, propuesta: { espacio: null, inicio: '2026-11-21T22:00:00Z', fin: '2026-11-22T00:00:00Z', mensaje: 'Otro día' },
            creadaEn: '2026-11-09T18:00:00Z', actualizadoEn: '2026-11-09T19:00:00Z', resueltaEn: null, canceladaEn: null, motivoCancelacion: null,
            solicitante: { nombre: 'Ana Pérez', telefono: '3110000000', correo: 'ana@correo.mx' }, autorizadoPor: null,
        } as SolicitudEspacioPersonal;
        expect(aSolicitudAdmin(base)).toMatchObject({
            folio: 'SE-0007', persona: 'Ana Pérez', estado: 'observaciones', area: 'Sala de lectura', fecha: '2026-11-20',
            horario: '15:00 a 17:00', contacto: 'ana@correo.mx · 3110000000', resolucion: { mensaje: 'Otro día' },
        });
        expect(aSolicitudAdmin({ ...base, estado: 'cancelada', canceladaEn: '2026-11-10T18:00:00Z' }).resolucion).toMatchObject({ cancelada: true });
    });
});

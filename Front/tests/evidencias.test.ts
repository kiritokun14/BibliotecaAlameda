import { beforeEach, describe, expect, it, vi } from 'vitest';
const cliente = vi.hoisted(() => ({ auth: { getSession: vi.fn() } }));
vi.mock('../src/servicios/api', () => ({ obtenerSupabase: vi.fn(async () => cliente), pedirApi: vi.fn(async () => ({})), ErrorServicio: class extends Error {} }));
import { pedirApi } from '../src/servicios/api';
import { cambiarAccesoEvidencia, retirarEvidenciaApi, subirEvidenciaApi, type EvidenciaDetalle } from '../src/servicios/evidencias';
import { aEvidencia, aEvidenciaCompleta, revisarArchivo } from '../src/pages/admin/actividades/evidencias';

beforeEach(() => { vi.clearAllMocks(); cliente.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'sesion' } } }); });

const detalle: EvidenciaDetalle = {
    folio: 'EV-0001', actividad: 'AC-000016', titulo: 'Club de lectura', sesionInicio: '2026-10-27T17:00:00+00:00', tipo: 'lista_firmada',
    acceso: 'personal', subio: 'Ana Pérez', subidaEn: '2026-10-27T18:00:00+00:00', retirada: false, puedeVer: true, solicitada: false,
    nombreArchivo: 'lista.pdf', tamanoBytes: 1258291, tipoArchivo: 'application/pdf', nota: null,
    historial: [
        { fecha: '2026-10-27T18:00:00+00:00', persona: 'Ana Pérez', accion: 'subio', detalle: { acceso: 'personal' } },
        { fecha: '2026-10-27T19:00:00+00:00', persona: 'Coordinación', accion: 'cambio_acceso', detalle: { acceso: 'coordinacion' } },
    ],
};

describe('Evidencias privadas (HU-21)', () => {
    it('solo PDF, JPG o PNG de hasta 10 MB', () => {
        expect(revisarArchivo({ name: 'a.docx', size: 10, type: 'application/msword' })).toMatch(/PDF, JPG o PNG/);
        expect(revisarArchivo({ name: 'a.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' })).toMatch(/10 MB/);
        expect(revisarArchivo({ name: 'a.pdf', size: 0, type: 'application/pdf' })).toMatch(/vacío/);
        expect(revisarArchivo({ name: 'a.pdf', size: 1024, type: 'application/pdf' })).toBeNull();
    });

    it('traduce la respuesta de la API a la pantalla', () => {
        const e = aEvidenciaCompleta(detalle);
        expect(e.tipo).toBe('Lista firmada');
        expect(e.actividadTexto).toBe('Club de lectura · 27 oct');
        expect(e.tamano).toBe(1.2);
        expect(e.consultas.map((c) => c.accion)).toEqual(['Subió el archivo', 'Cambió el acceso a «Solo Coordinación y Administración»']);
        expect(aEvidencia({ ...detalle, puedeVer: false }).puedeVer).toBe(false);
    });

    it('sube el archivo tal cual con sus datos en la dirección y la sesión', async () => {
        const archivo = new File(['%PDF-1.4'], 'lista.pdf', { type: 'application/pdf' });
        await subirEvidenciaApi({ sesionId: 's-1', tipo: 'lista_firmada', acceso: 'coordinacion', nota: ' Firmas ', archivo });
        const [ruta, opciones] = vi.mocked(pedirApi).mock.calls[0];
        const parametros = new URLSearchParams(ruta.split('?')[1]);
        expect(ruta.startsWith('/actividades/evidencias?')).toBe(true);
        expect(Object.fromEntries(parametros)).toEqual({ sesionId: 's-1', tipo: 'lista_firmada', acceso: 'coordinacion', nombreArchivo: 'lista.pdf', nota: 'Firmas' });
        expect(opciones?.body).toBe(archivo);
        expect(opciones?.headers).toMatchObject({ 'Content-Type': 'application/pdf', Authorization: 'Bearer sesion' });
    });

    it('cambia el acceso y retira con motivo', async () => {
        await cambiarAccesoEvidencia('EV-0001', 'personal');
        await retirarEvidenciaApi('EV-0001', '  Duplicada ');
        const llamadas = vi.mocked(pedirApi).mock.calls;
        expect(llamadas[0][0]).toBe('/actividades/evidencias/EV-0001/acceso');
        expect(llamadas[0][1]?.method).toBe('PATCH');
        expect(JSON.parse(llamadas[1][1]!.body as string)).toEqual({ motivo: 'Duplicada' });
    });

    it('sin sesión no llama a la API', async () => {
        cliente.auth.getSession.mockResolvedValue({ data: { session: null } });
        await expect(cambiarAccesoEvidencia('EV-0001', 'personal')).rejects.toThrow();
        expect(pedirApi).not.toHaveBeenCalled();
    });
});

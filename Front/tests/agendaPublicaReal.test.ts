import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/servicios/actividades', () => ({ consultarAgenda: vi.fn() }));
import { consultarAgenda, type ActividadPublica } from '../src/servicios/actividades';
import { cargarAgendaPublica, categoriaPublica, sesionesDeAgenda } from '../src/servicios/agendaPublica';
import { filtrarTodas, filtrosVacios } from '../src/pages/publico/eventos/datosAgenda';

const actividad = { folio: 'AC-0001', nombre: 'Lectura real', tipo: 'Club', descripcion: 'Descripción publicada', publico: 'General',
    sesiones: [{ id: 's1', fecha: '2026-11-12', inicio: '10:00', fin: '11:00', espacio: 'Sala', cupo: 20, estado: 'programada', registroAbierto: false },
        { id: 's2', fecha: '2026-11-19', inicio: '12:00', fin: '13:00', espacio: 'Patio', cupo: 15, estado: 'cancelada', registroAbierto: false }] } as ActividadPublica;
beforeEach(() => vi.clearAllMocks());
it('conserva todas las sesiones y sus avisos sin inventar ocupación', () => {
    const filas = sesionesDeAgenda(actividad);
    expect(filas.map(s => s.sesionId)).toEqual(['s1', 's2']);
    expect(filas[1]).toMatchObject({ id: 'AC-0001', lugar: 'Patio', cancelada: true });
    expect(filas[0]).not.toHaveProperty('cupo');
    expect(filas[0].inscripcionAbierta).toBe(false);
    expect(categoriaPublica('Curso')).toBe('taller');
    expect(categoriaPublica('Visita guiada')).toBe('visita');
});
it('filtra sesiones dentro del periodo solicitado y consulta páginas reales', async () => {
    vi.mocked(consultarAgenda).mockResolvedValue({ total: 1, pagina: 0, actividades: [actividad] });
    expect((await cargarAgendaPublica('2026-11-18', '2026-11-20')).map(a => a.sesionId)).toEqual(['s2']);
    expect(consultarAgenda).toHaveBeenCalledWith({ desde: '2026-11-18', hasta: '2026-11-20', pagina: 0, limite: 50 });
});
it('una respuesta vacía o fallida nunca se sustituye por ejemplos', async () => {
    vi.mocked(consultarAgenda).mockResolvedValue({ total: 0, pagina: 0, actividades: [] });
    expect(await cargarAgendaPublica()).toEqual([]);
    vi.mocked(consultarAgenda).mockRejectedValue(new Error('Sin conexión'));
    await expect(cargarAgendaPublica()).rejects.toThrow('Sin conexión');
});
it('no anuncia inscripción abierta cuando el servidor la tiene cerrada', () => {
    expect(filtrarTodas(sesionesDeAgenda(actividad), { ...filtrosVacios, disponibilidad: 'abierta' }, '2026-11-09', new Set())).toEqual([]);
});

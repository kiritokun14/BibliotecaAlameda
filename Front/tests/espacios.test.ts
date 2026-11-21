import { describe, expect, it } from 'vitest';
import { areas, separarAreas } from '../src/pages/publico/espacios/datos';

describe('Agenda de espacios (visitante)', () => {
    it('separa las áreas que se pueden solicitar de las que no', () => {
        const { solicitables, noSolicitables } = separarAreas();
        expect(solicitables).toHaveLength(6);
        expect(noSolicitables.map((a) => a.nombre)).toEqual(['Acervo especializado Heriberto Camacho', 'Préstamo a domicilio']);
        expect(solicitables.length + noSolicitables.length).toBe(areas.length);
    });

    it('las que no se solicitan explican por qué', () => {
        expect(separarAreas().noSolicitables.every((a) => Boolean(a.nota))).toBe(true);
    });
});

describe('Mapa de la biblioteca', () => {
    it('cada espacio para eventos tiene su zona, un slug único y capacidad', async () => {
        const { espaciosEvento, zonaPorId, zonaPorSlug } = await import('../src/pages/publico/espacios/datos');
        const slugs = Object.values(espaciosEvento).map((e) => e.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        for (const [id, e] of Object.entries(espaciosEvento)) {
            expect(zonaPorId(id)).toBeDefined();
            expect(zonaPorSlug(e.slug)?.id).toBe(id);
            expect(e.capacidad).toBeGreaterThan(0);
        }
    });

    it('el Mesanim está en la planta alta y pide condiciones', async () => {
        const { zonaPorId, disponibilidadDe } = await import('../src/pages/publico/espacios/datos');
        expect(zonaPorId('M')?.planta).toBe('alta');
        expect(disponibilidadDe('M')).toBe('condiciones');
        expect(disponibilidadDe('19')).toBe('no');
    });
});

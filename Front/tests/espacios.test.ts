import { describe, expect, it } from 'vitest';
import { areas, separarAreas } from '../src/pages/publico/espacios/datos';

describe('Agenda de espacios (visitante)', () => {
    it('separa las áreas que se pueden solicitar de las que no', () => {
        const { solicitables, noSolicitables } = separarAreas();
        expect(solicitables).toHaveLength(6);
        expect(noSolicitables.map((a) => a.nombre)).toEqual(['Fondo especial', 'Préstamos']);
        expect(solicitables.length + noSolicitables.length).toBe(areas.length);
    });

    it('las que no se solicitan explican por qué', () => {
        expect(separarAreas().noSolicitables.every((a) => Boolean(a.nota))).toBe(true);
    });
});

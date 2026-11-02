import { describe, expect, it } from 'vitest';
import { actividadElegida, partirFecha } from '../src/pages/eventos/datos';

describe('Eventos para visitante (T-052)', () => {
    it('sin elegir en el carrusel no se muestra ninguna actividad', () => {
        expect(actividadElegida(undefined)).toBeNull();
        expect(actividadElegida('')).toBeNull();
    });

    it('un id que no existe tampoco muestra actividad', () => {
        expect(actividadElegida('no-existe')).toBeNull();
    });

    it('la actividad elegida en Inicio se encuentra por su id', () => {
        expect(actividadElegida('actividad-1')?.titulo).toBe('Taller de escritura creativa');
    });

    it('parte la fecha de Inicio para la caja "8 NOV"', () => {
        expect(partirFecha('Sáb 8 nov')).toEqual({ dia: '8', mes: 'NOV' });
        expect(partirFecha('Vie 14 nov')).toEqual({ dia: '14', mes: 'NOV' });
        expect(partirFecha('Próximamente')).toEqual({ dia: '', mes: '' });
    });
});

import { describe, expect, it } from 'vitest';
import { EJEMPLO, filtrar, marcarLeida, marcarTodas, quitar, quitarLeidas, sinLeer } from '../src/pages/publico/notificaciones/datos';

describe('Notificaciones de la persona con sesión', () => {
    it('cuenta las no leídas de los ejemplos de Figma', () => {
        expect(sinLeer(EJEMPLO)).toBe(5);
    });
    it('filtra por no leídas y por área', () => {
        expect(filtrar(EJEMPLO, 'todas')).toHaveLength(6);
        expect(filtrar(EJEMPLO, 'no-leidas').every((n) => !n.leida)).toBe(true);
        expect(filtrar(EJEMPLO, 'actividades').map((n) => n.id)).toEqual(['n4', 'n5']);
        expect(filtrar(EJEMPLO, 'avisos').map((n) => n.id)).toEqual(['n6']);
    });
    it('marcar una o todas como leídas baja el contador sin tocar el original', () => {
        expect(sinLeer(marcarLeida(EJEMPLO, 'n1'))).toBe(4);
        expect(sinLeer(marcarTodas(EJEMPLO))).toBe(0);
        expect(sinLeer(EJEMPLO)).toBe(5);
    });
    it('eliminar quita una o todas las leídas', () => {
        expect(quitar(EJEMPLO, 'n6')).toHaveLength(5);
        expect(quitarLeidas(EJEMPLO).some((n) => n.leida)).toBe(false);
        expect(quitarLeidas(marcarTodas(EJEMPLO))).toHaveLength(0);
    });
});

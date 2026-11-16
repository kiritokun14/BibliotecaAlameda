import { describe, expect, it } from 'vitest';
import { actividadRelativa, fechaPublicacion, inicialDe, textoRespuestas, validarReporte, validarRespuesta } from '../src/pages/publico/club/datos';
describe('Club Alameda · validaciones de las pantallas conectadas', () => {
    it('valida respuestas vacías y su longitud antes de enviarlas', () => {
        expect(validarRespuesta('   ')).not.toBeNull();
        expect(validarRespuesta('a'.repeat(1001))).not.toBeNull();
        expect(validarRespuesta('Me gustó mucho.')).toBeNull();
    });
    it('el reporte requiere una norma existente y limita el comentario', () => {
        for (const norma of ['', 0, 5, 1.5] as const) expect(validarReporte(norma, '').norma).toBeDefined();
        expect(validarReporte(2, 'a'.repeat(301)).comentario).toBeDefined();
        expect(validarReporte(2, '')).toEqual({});
    });
    it('conserva el formato de fechas y textos del diseño', () => {
        expect(fechaPublicacion('2026-11-02T09:15')).toBe('2 nov 2026, 09:15');
        const hoy = new Date(2026, 10, 4);
        expect(actividadRelativa('2026-11-04T10:30', hoy)).toBe('hoy, 10:30');
        expect(actividadRelativa('2026-11-03T18:15', hoy)).toBe('ayer, 18:15');
        expect(textoRespuestas(1)).toBe('1 respuesta'); expect(inicialDe('luis')).toBe('L');
    });
});

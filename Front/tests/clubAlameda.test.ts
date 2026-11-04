import { beforeEach, describe, expect, it } from 'vitest';
import {
    TEMAS, actividadRelativa, aprobarMisRespuestas, consultarClub, fechaPublicacion, inicialDe, publicarRespuesta, reiniciarClub,
    reportarRespuesta, respuestasDe, resumenTema, temaPorSlug, textoRespuestas, validarReporte, validarRespuesta,
} from '../src/pages/publico/club/datos';

describe('Club Alameda · foro', () => {
    beforeEach(() => reiniciarClub());

    it('tiene los cuatro temas con los mismos hilos que Moderación del foro', () => {
        expect(TEMAS.map((t) => t.titulo)).toEqual(['Reseña: Cuentos de la Alameda', 'Intercambio de libros', 'Recomendaciones', 'Taller de escritura']);
        expect(temaPorSlug('recomendaciones')?.numero).toBe('03');
        expect(temaPorSlug('no-existe')).toBeUndefined();
    });
    it('cuenta las respuestas publicadas y la última actividad', () => {
        const r = resumenTema(TEMAS[0]);
        expect(r).toEqual({ respuestas: 2, ultimaActividad: '2026-11-04T10:30' });
    });
    it('valida la respuesta: no vacía y máximo 1,000 caracteres', () => {
        expect(validarRespuesta('   ')).not.toBeNull();
        expect(validarRespuesta('a'.repeat(1001))).not.toBeNull();
        expect(validarRespuesta('Me gustó mucho.')).toBeNull();
    });
    it('la primera respuesta queda en revisión, solo la ve quien la escribió y no cuenta hasta aprobarse', () => {
        const nueva = publicarRespuesta('cuentos-de-la-alameda', 'Ana', '  Mi opinión  ', new Date(2026, 10, 4, 12, 5));
        expect(nueva).toMatchObject({ estado: 'en-revision', propia: true, texto: 'Mi opinión', fecha: '2026-11-04T12:05' });
        expect(respuestasDe('cuentos-de-la-alameda').map((x) => x.id)).toContain(nueva.id);
        expect(resumenTema(TEMAS[0]).respuestas).toBe(2);
        aprobarMisRespuestas();
        expect(resumenTema(TEMAS[0]).respuestas).toBe(3);
    });
    it('después de una respuesta aprobada, las siguientes se publican de inmediato', () => {
        publicarRespuesta('recomendaciones', 'Ana', 'Primera');
        aprobarMisRespuestas();
        expect(publicarRespuesta('recomendaciones', 'Ana', 'Segunda').estado).toBe('publicada');
    });
    it('el reporte pide la norma y limita el comentario; se registra una sola vez', () => {
        expect(validarReporte('', '').norma).toBeDefined();
        expect(validarReporte(2, 'a'.repeat(301)).comentario).toBeDefined();
        expect(validarReporte(2, '')).toEqual({});
        reportarRespuesta('r1');
        reportarRespuesta('r1');
        expect(consultarClub().reportadas).toEqual(['r1']);
    });
    it('escribe las fechas como en Figma', () => {
        expect(fechaPublicacion('2026-11-02T09:15')).toBe('2 nov 2026, 09:15');
        const hoy = new Date(2026, 10, 4);
        expect(actividadRelativa('2026-11-04T10:30', hoy)).toBe('hoy, 10:30');
        expect(actividadRelativa('2026-11-03T18:15', hoy)).toBe('ayer, 18:15');
        expect(actividadRelativa('2026-11-02T12:00', hoy)).toBe('2 nov, 12:00');
        expect(textoRespuestas(1)).toBe('1 respuesta');
        expect(inicialDe('luis')).toBe('L');
    });
});

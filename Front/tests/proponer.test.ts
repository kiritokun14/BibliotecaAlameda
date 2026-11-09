import { describe, expect, it } from 'vitest';
import { enviarPropuesta, obtenerPropuesta, propuestaVacia, reenviarPropuesta, validarCorreccion, validarPropuesta } from '../src/pages/publico/proponer/datos';

const completa = { ...propuestaVacia('Ana López', '3110000000'), titulo: 'Club de cómic', descripcion: 'Leer y comentar cómics', publico: 'Jóvenes', participantes: '20', acepta: true };

describe('Proponer una actividad', () => {
    it('pide título, descripción, público, participantes, responsable, teléfono y la casilla', () => {
        expect(validarPropuesta(completa, '2026-11-03')).toEqual({});
        const e = validarPropuesta(propuestaVacia(), '2026-11-03');
        expect(Object.keys(e).sort()).toEqual(['acepta', 'descripcion', 'participantes', 'publico', 'responsable', 'telefono', 'titulo']);
    });
    it('revisa fecha y horario si se escriben', () => {
        expect(validarPropuesta({ ...completa, fecha: '2026-10-01' }, '2026-11-03').fecha).toBeDefined();
        expect(validarPropuesta({ ...completa, horaInicio: '18:00', horaFin: '17:00' }, '2026-11-03').horaFin).toBeDefined();
    });
    it('enviar deja la propuesta en revisión y una corrección la regresa a revisión', () => {
        expect(enviarPropuesta(completa)).toMatchObject({ estado: 'en-revision', folio: null, titulo: 'Club de cómic' });
        expect(obtenerPropuesta('p2')?.estado).toBe('con-observaciones');
        expect(validarCorreccion({ cupo: '', fecha: '', comentarios: '' }, '2026-11-03').cupo).toBeDefined();
        reenviarPropuesta('p2');
        expect(obtenerPropuesta('p2')?.estado).toBe('en-revision');
    });
});

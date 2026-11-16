import { describe, expect, it } from 'vitest';
import { propuestaVacia, validarPropuesta } from '../src/pages/publico/proponer/datos';

import { adaptarPropuesta, fechaHoyTepic } from '../src/servicios/propuestasUsuario';

const completa = { ...propuestaVacia('Ana López', '3110000000'), titulo: 'Club de cómic', descripcion: 'Leer y comentar cómics', publico: 'Jóvenes', participantes: '20', acepta: true, abiertaAlPublico: true, sinFinesDeLucro: true };

describe('Proponer una actividad', () => {
    it('pide título, descripción, público, participantes, responsable, teléfono y la casilla', () => {
        expect(validarPropuesta(completa, '2026-11-03')).toEqual({});
        const e = validarPropuesta(propuestaVacia(), '2026-11-03');
        expect(Object.keys(e).sort()).toEqual(['abiertaAlPublico', 'acepta', 'descripcion', 'participantes', 'publico', 'responsable', 'sinFinesDeLucro', 'telefono', 'titulo']);
    });
    it('revisa fecha y horario si se escriben', () => {
        expect(validarPropuesta({ ...completa, fecha: '2026-10-01' }, '2026-11-03').fecha).toBeDefined();
        expect(validarPropuesta({ ...completa, horaInicio: '18:00', horaFin: '17:00' }, '2026-11-03').horaFin).toBeDefined();
    });
    it('conserva los campos de la pantalla en el contrato real sin imponer identidad ni estado', () => {
        const entrada = adaptarPropuesta({ ...completa, fecha: '2026-11-12', horaInicio: '13:00', horaFin: '15:00', espacio: 'Sala de lectura', material: 'Libros' });
        expect(entrada).toMatchObject({ tituloPropuesta: 'Club de cómic', diasSolicitados: '2026-11-12', horarioSolicitado: '13:00 a 15:00 (hora de Tepic)', necesidadEspacio: 'Sala de lectura', abiertaAlPublico: true, sinFinesDeLucro: true });
        for (const dato of ['Participantes estimados: 20', 'Material solicitado: Libros', 'Persona responsable: Ana López', 'Teléfono de contacto: 3110000000']) expect(entrada.descripcion).toContain(dato);
        expect(entrada).not.toHaveProperty('propuestoPor');
        expect(entrada).not.toHaveProperty('estadoRevision');
    });
    it('no inventa fechas ni confirma las reglas por el usuario', () => {
        const entrada = adaptarPropuesta(propuestaVacia());
        expect(entrada.diasSolicitados).toContain('Por acordar');
        expect(entrada.abiertaAlPublico).toBe(false);
        expect(entrada.sinFinesDeLucro).toBe(false);
        expect(fechaHoyTepic(new Date('2026-11-10T02:00:00Z'))).toBe('2026-11-09');
    });
});

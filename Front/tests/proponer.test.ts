import { describe, expect, it } from 'vitest';
import { etapasPropuesta, propuestaDesdeSolicitud, propuestaPublicada, propuestaVacia, puedeCancelar, puedeEditar, validarPropuesta } from '../src/pages/publico/proponer/datos';

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

describe('Editar y cancelar una propuesta', () => {
    it('al editar, el formulario se llena con lo que se envió', () => {
        const datos = { ...completa, tipo: 'club' as const, fecha: '2026-11-27', horaInicio: '16:00', horaFin: '18:00', espacio: 'Sala de lectura', material: 'Proyector' };
        const enviada = { ...adaptarPropuesta(datos), id: 'p1', creadaEn: '2026-11-21T10:00:00Z', historial: [] };
        expect(propuestaDesdeSolicitud(enviada)).toEqual(datos);
        const sinFecha = { ...adaptarPropuesta(completa), id: 'p2', creadaEn: '2026-11-21T10:00:00Z', historial: [] };
        const leida = propuestaDesdeSolicitud(sinFecha);
        expect([leida.fecha, leida.horaInicio, leida.espacio, leida.material]).toEqual(['', '', '', '']);
    });
    it('editar solo con cambios pedidos o en borrador (en revisión solo en la vista de ejemplo); cancelar mientras no hay decisión', () => {
        expect(puedeEditar('requiere_correccion')).toBe(true);
        expect(puedeEditar('en_revision')).toBe(false);
        expect(puedeEditar('en_revision', true)).toBe(true);
        expect(puedeEditar('aprobada', true)).toBe(false);
        expect(puedeCancelar('en_revision')).toBe(true);
        expect(puedeCancelar('rechazada')).toBe(false);
    });
});

describe("propuesta publicada en la agenda", () => {
    const base = { id: "p1", creadaEn: "2026-11-23T10:00:00Z", estadoRevision: "aprobada" };
    it("aprobada sin actividad: el paso 4 sigue en curso", () => {
        expect(propuestaPublicada(base)).toBe(false);
        expect(etapasPropuesta("aprobada").map((e) => e.estado)).toEqual(["hecho", "hecho", "hecho", "actual"]);
    });
    it("aprobada con actividad ligada: los cuatro pasos quedan hechos", () => {
        const s = { ...base, actividadId: "a1" };
        expect(propuestaPublicada(s)).toBe(true);
        expect(etapasPropuesta("aprobada", true).map((e) => e.estado)).toEqual(["hecho", "hecho", "hecho", "hecho"]);
        expect(propuestaPublicada({ ...s, estadoRevision: "rechazada" })).toBe(false);
    });
});

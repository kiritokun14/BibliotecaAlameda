import { describe, expect, it } from 'vitest';
import {
    alternar, canalesEjemplo, estadoNivel, filtrarInscripciones, inscripcionesEjemplo, seccionDeRuta, seccionesDe,
    siguienteMeta, validarCambioContrasena, validarResponsable,
} from '../src/pages/publico/perfil/datos';
import { contarPorGrupo, estadoEspacio, estadoPropuesta, fechaCorta, historialEjemplo } from '../src/pages/publico/perfil/solicitudes';

describe('Perfil · cuenta de persona menor de edad', () => {
    it('no muestra Mis propuestas ni Mis espacios', () => {
        expect(seccionesDe(true).map((s) => s.clave)).not.toContain('propuestas');
        expect(seccionesDe(true).map((s) => s.clave)).not.toContain('espacios');
        expect(seccionesDe(false)).toHaveLength(9);
        expect(seccionDeRuta('espacios', true)).toBeNull();
        expect(seccionDeRuta('espacios', false)).toBe('espacios');
    });
    it('pide nombre, teléfono de 10 dígitos y relación de la persona responsable', () => {
        expect(validarResponsable({ nombre: 'Ana', telefono: '3111234567', relacion: 'Madre' })).toEqual({});
        expect(Object.keys(validarResponsable({ nombre: ' ', telefono: '311', relacion: '' })).sort())
            .toEqual(['responsableNombre', 'responsableRelacion', 'responsableTelefono']);
    });
});

describe('Perfil · eventos, progreso y avisos', () => {
    it('filtra los eventos de ejemplo como en Figma (5 · 2 · 3 · 0)', () => {
        expect(filtrarInscripciones(inscripcionesEjemplo, 'todos')).toHaveLength(5);
        expect(filtrarInscripciones(inscripcionesEjemplo, 'proximos')).toHaveLength(2);
        expect(filtrarInscripciones(inscripcionesEjemplo, 'asistidos')).toHaveLength(3);
        expect(filtrarInscripciones(inscripcionesEjemplo, 'cancelados')).toHaveLength(0);
    });
    it('marca los niveles: alcanzado, en progreso y pendiente', () => {
        expect(estadoNivel(3, 3)).toBe('alcanzado');
        expect(estadoNivel(6, 3)).toBe('en-progreso');
        expect(estadoNivel(10, 3)).toBe('pendiente');
        expect(siguienteMeta(3)).toBe(6);
        expect(siguienteMeta(12)).toBe(10);
    });
    it('los avisos fijos no se pueden apagar', () => {
        expect(alternar(canalesEjemplo, 'portal').find((p) => p.clave === 'portal')?.activo).toBe(true);
        expect(alternar(canalesEjemplo, 'telefono').find((p) => p.clave === 'telefono')?.activo).toBe(true);
    });
    it('valida el cambio de contraseña', () => {
        expect(validarCambioContrasena('', 'corta').actual).toBeDefined();
        expect(validarCambioContrasena('actual123', 'corta').nueva).toBeDefined();
        expect(validarCambioContrasena('igual1234', 'igual1234').nueva).toBeDefined();
        expect(validarCambioContrasena('actual123', 'nueva12345')).toEqual({});
    });
});

describe('Perfil · Mis propuestas y Mis espacios', () => {
    it('cuenta por estado como los filtros de Figma', () => {
        const p = contarPorGrupo(historialEjemplo.propuestas_eventos, (x) => estadoPropuesta[x.estadoRevision].grupo);
        expect([p.atencion, p.observaciones, p.borradores]).toEqual([1, 1, 1]);
        const e = contarPorGrupo(historialEjemplo.solicitudes_espacio, (x) => estadoEspacio[x.estadoSolicitud].grupo);
        expect([e.atencion, e.observaciones, e.canceladas]).toEqual([1, 1, 1]);
    });
    it('escribe la fecha corta', () => {
        expect(fechaCorta('2026-10-20T12:00:00Z')).toBe('20 oct 2026');
    });
});

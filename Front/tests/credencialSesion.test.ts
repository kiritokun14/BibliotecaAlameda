import { beforeEach, describe, expect, it } from 'vitest';
import {
    consultarTramite, enviarCorreccion, enviarSolicitud, fechaLarga, pasoDelEstado, validarCorreccion,
    validarSolicitud, verEjemplo, type SolicitudCredencial,
} from '../src/pages/publico/credencial/datos';

const solicitud: SolicitudCredencial = { tipo: 'primera-vez', horario: '', comentarios: '', aceptaCotejo: true, aceptaAviso: true };

describe('Credencial con sesión · trámite', () => {
    beforeEach(() => verEjemplo('sin-solicitud'));

    it('empieza sin solicitud', () => {
        expect(consultarTramite().estado).toBe('sin-solicitud');
    });
    it('exige aceptar el cotejo presencial y el aviso de privacidad', () => {
        expect(validarSolicitud(solicitud)).toEqual({});
        expect(Object.keys(validarSolicitud({ ...solicitud, aceptaCotejo: false, aceptaAviso: false })).sort())
            .toEqual(['aceptaAviso', 'aceptaCotejo']);
        expect(validarSolicitud({ ...solicitud, comentarios: 'a'.repeat(501) }).comentarios).toBeDefined();
    });
    it('al enviar queda en revisión, con el tipo elegido y folio por asignar', () => {
        const t = enviarSolicitud({ ...solicitud, tipo: 'renovacion' });
        expect(t).toMatchObject({ estado: 'en-revision', tipo: 'renovacion', folio: null });
        expect(consultarTramite().estado).toBe('en-revision');
    });
    it('una corrección pide nombre e identificación y regresa el trámite a revisión', () => {
        verEjemplo('correccion');
        expect(Object.keys(validarCorreccion({ nombre: ' ', numero: '12' })).sort()).toEqual(['nombre', 'numero']);
        expect(validarCorreccion({ nombre: 'Ana López', numero: 'INE 1234' })).toEqual({});
        expect(enviarCorreccion()).toMatchObject({ estado: 'en-revision', motivoCorreccion: null });
    });
    it('marca el paso del trámite según la pantalla y el estado', () => {
        expect(pasoDelEstado('informacion', 'sin-solicitud')).toBe(1);
        expect(pasoDelEstado('solicitud', 'sin-solicitud')).toBe(2);
        expect(pasoDelEstado('seguimiento', 'en-revision')).toBe(3);
        expect(pasoDelEstado('seguimiento', 'vigente')).toBe(4);
    });
    it('escribe la fecha en palabras', () => {
        expect(fechaLarga('2026-10-02')).toBe('02 de octubre de 2026');
    });
});

import { mapearCredencial } from '../src/pages/publico/credencial/datos';

describe('Credencial · estado real desde /mis-solicitudes', () => {
    const base = { id: 'c1', tipoSolicitud: 'obtencion' as const, fechaCita: null, observaciones: null, creadaEn: '2026-10-01T12:00:00Z' };
    const hoy = new Date(2026, 10, 4);
    it('sin solicitud o cancelada → sin solicitud', () => {
        expect(mapearCredencial(undefined, hoy).estado).toBe('sin-solicitud');
        expect(mapearCredencial({ ...base, estadoSolicitud: 'cancelada' }, hoy).estado).toBe('sin-solicitud');
    });
    it('recibida, en atención y cita programada → en revisión', () => {
        for (const e of ['recibida', 'en_atencion', 'cita_programada'] as const)
            expect(mapearCredencial({ ...base, estadoSolicitud: e }, hoy).estado).toBe('en-revision');
    });
    it('rechazada → corrección con las observaciones del personal', () => {
        expect(mapearCredencial({ ...base, estadoSolicitud: 'rechazada', observaciones: 'El nombre no coincide.' }, hoy))
            .toMatchObject({ estado: 'correccion', motivoCorreccion: 'El nombre no coincide.' });
    });
    it('atendida → vigente por 2 años desde la cita (o la solicitud); después, vencida', () => {
        expect(mapearCredencial({ ...base, estadoSolicitud: 'atendida', fechaCita: '2026-10-10T16:00:00Z' }, hoy))
            .toMatchObject({ estado: 'vigente', emision: '2026-10-10', vencimiento: '2028-10-10' });
        expect(mapearCredencial({ ...base, estadoSolicitud: 'atendida', creadaEn: '2024-01-15T12:00:00Z' }, hoy).estado).toBe('vencida');
        expect(mapearCredencial({ ...base, tipoSolicitud: 'renovacion', estadoSolicitud: 'recibida' }, hoy).tipo).toBe('renovacion');
    });
});

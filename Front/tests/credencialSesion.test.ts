import { beforeEach, describe, expect, it, vi } from 'vitest';
const servidor = vi.hoisted(() => ({ solicitarCredencial: vi.fn(), cancelarSolicitudCredencial: vi.fn() }));
vi.mock('../src/servicios/tramites', () => ({ solicitarCredencial: servidor.solicitarCredencial, cancelarSolicitudCredencial: servidor.cancelarSolicitudCredencial }));
import {
    cancelarSolicitud, consultarTramite, enviarCorreccion, enviarSolicitud, fechaLarga, pasoDelEstado, puedeCancelar, puedeSolicitar,
    validarCorreccion, validarSolicitud, verEjemplo, type SolicitudCredencial,
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
    it('al enviar registra la solicitud en el servidor y queda en revisión con su folio', async () => {
        servidor.solicitarCredencial.mockResolvedValue({ id: 'abcd1234-0000-4000-8000-000000000001', creadaEn: '2026-11-12T10:00:00Z' });
        const t = await enviarSolicitud({ ...solicitud, tipo: 'renovacion', horario: 'Mañana', comentarios: 'Gracias' });
        expect(servidor.solicitarCredencial).toHaveBeenCalledWith('renovacion', 'Horario preferido para el cotejo: Mañana\nGracias');
        expect(t).toMatchObject({ estado: 'en-revision', tipo: 'renovacion', folio: 'abcd1234-0000-4000-8000-000000000001' });
        expect(consultarTramite().estado).toBe('en-revision');
    });
    it('si el servidor falla, el trámite no cambia', async () => {
        servidor.solicitarCredencial.mockRejectedValue(new Error('sin conexión'));
        await expect(enviarSolicitud(solicitud)).rejects.toThrow();
        expect(consultarTramite().estado).toBe('sin-solicitud');
    });
    it('una corrección pide nombre e identificación y regresa el trámite a revisión', () => {
        verEjemplo('correccion');
        expect(Object.keys(validarCorreccion({ nombre: ' ', numero: '12' })).sort()).toEqual(['nombre', 'numero']);
        expect(validarCorreccion({ nombre: 'Ana López', numero: 'INE 1234' })).toEqual({});
        expect(enviarCorreccion()).toMatchObject({ estado: 'en-revision', motivoCorreccion: null });
    });
    it('marca el paso del trámite según su estado, no solo la pantalla', () => {
        expect(pasoDelEstado('informacion', 'sin-solicitud')).toBe(1);
        expect(pasoDelEstado('solicitud', 'sin-solicitud')).toBe(2);
        // con una solicitud en proceso, las tres pantallas dicen lo mismo: 1 y 2 hechos, 3 en curso
        for (const vista of ['informacion', 'solicitud', 'seguimiento'] as const) {
            expect(pasoDelEstado(vista, 'en-revision')).toBe(3);
            expect(pasoDelEstado(vista, 'correccion')).toBe(3);
            expect(pasoDelEstado(vista, 'vigente')).toBe(4);
        }
        expect(pasoDelEstado('informacion', 'vencida')).toBe(1); // la renovación empieza de nuevo
        expect(pasoDelEstado('solicitud', 'vencida')).toBe(2);
    });
    it('solo deja solicitar sin solicitud o con la credencial vencida (no se duplican)', () => {
        expect(['sin-solicitud', 'en-revision', 'correccion', 'vigente', 'vencida'].filter((e) => puedeSolicitar(e as never)))
            .toEqual(['sin-solicitud', 'vencida']);
    });
    it('cancela una solicitud en revisión en el servidor y el trámite queda sin solicitud', async () => {
        servidor.solicitarCredencial.mockResolvedValue({ id: 'abcd1234-0000-4000-8000-000000000002', creadaEn: '2026-11-19T10:00:00Z' });
        servidor.cancelarSolicitudCredencial.mockResolvedValue({});
        await enviarSolicitud(solicitud);
        expect(puedeCancelar(consultarTramite().estado)).toBe(true);
        expect((await cancelarSolicitud()).estado).toBe('sin-solicitud');
        expect(servidor.cancelarSolicitudCredencial).toHaveBeenCalledWith('abcd1234-0000-4000-8000-000000000002');
    });
    it('si el servidor no permite cancelar, la solicitud sigue en revisión', async () => {
        servidor.solicitarCredencial.mockResolvedValue({ id: 'abcd1234-0000-4000-8000-000000000003', creadaEn: '2026-11-19T10:00:00Z' });
        servidor.cancelarSolicitudCredencial.mockRejectedValue(new Error('404'));
        await enviarSolicitud(solicitud);
        await expect(cancelarSolicitud()).rejects.toThrow();
        expect(consultarTramite().estado).toBe('en-revision');
    });
    it('no cancela una credencial ya vigente', async () => {
        verEjemplo('vigente');
        expect(puedeCancelar('vigente')).toBe(false);
        await expect(cancelarSolicitud()).rejects.toThrow();
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

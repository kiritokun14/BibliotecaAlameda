import { describe, expect, it } from 'vitest';
import { areas } from '../src/pages/publico/espacios/datos';
import { cancelarSolicitudEspacio, disponibilidad, enviarSolicitudEspacio, obtenerSolicitud, validarSolicitud } from '../src/pages/publico/espacios/datosSesion';

const ok = { fecha: '2026-11-20', horaInicio: '16:00', horaFin: '18:00', personas: '15', motivo: 'Taller de lectura' };

describe('Espacios con sesión', () => {
    it('marca la disponibilidad como en Figma', () => {
        expect(disponibilidad(areas.find((a) => a.id === 'cubiculos-estudio')!)).toBe('no-disponible');
        expect(disponibilidad(areas.find((a) => a.id === 'prestamos')!)).toBe('no-reservable');
        expect(disponibilidad(areas.find((a) => a.id === 'area-actividades')!)).toBe('disponible');
    });
    it('valida fecha, horario, personas y motivo', () => {
        expect(validarSolicitud(ok, '2026-11-03')).toEqual({});
        const e = validarSolicitud({ fecha: '2026-11-01', horaInicio: '18:00', horaFin: '16:00', personas: '0', motivo: ' ' }, '2026-11-03');
        expect(Object.keys(e).sort()).toEqual(['fecha', 'horaFin', 'motivo', 'personas']);
    });
    it('enviar y cancelar una solicitud', () => {
        const s = enviarSolicitudEspacio('area-actividades', ok);
        expect(obtenerSolicitud(s.id)).toMatchObject({ estado: 'en-revision', personas: 15, folio: null });
        cancelarSolicitudEspacio(s.id);
        expect(obtenerSolicitud(s.id)?.estado).toBe('cancelada');
    });
});

// Perfil de Préstamos (T3, 22 nov 2026): decisiones de una solicitud de credencial y cifras del Resumen.
import { beforeEach, describe, expect, it } from 'vitest';
import { decisionesDe, negativa, partesFecha } from '../src/pages/admin/atencion/credenciales/utiles';
import { cifrasPrestamos, estadoAccesoPrestamos, textoPrestamos, RUTA_COTEJOS, RUTA_SOLICITUDES, type DatosPrestamos } from '../src/pages/admin/resumen/datosPrestamos';
import { enFiltroCotejo, iconoResultado, leerCotejos, obtenerCotejo, reiniciarCotejos, vincular } from '../src/pages/admin/participantes/cotejos';

describe('Solicitudes de credencial', () => {
    it('ofrece solo las decisiones que acepta el backend en cada estado', () => {
        expect(decisionesDe('recibida')).toEqual(['en_atencion', 'cita_programada', 'rechazada', 'cancelada']);
        expect(decisionesDe('cita_programada')).toContain('atendida');
        expect(decisionesDe('atendida')).toEqual([]);
        expect(decisionesDe('rechazada')).toEqual([]);
        expect(negativa('cancelada') && negativa('rechazada') && !negativa('atendida')).toBe(true);
    });
    it('parte la fecha en día y mes para el bloque de fecha', () => {
        expect(partesFecha('2026-11-19T18:00:00')).toEqual(['19', 'nov']);
    });
});

describe('Resumen de Préstamos', () => {
    beforeEach(() => reiniciarCotejos());
    const datos = (porEstado: Record<string, number>): DatosPrestamos => ({
        credenciales: { estado: 'listo', abiertas: [], porEstado, error: '' },
        cotejos: { estado: 'listo', pendientes: leerCotejos().filter((c) => enFiltroCotejo(c, 'pendientes')) },
    });

    it('cuenta solicitudes abiertas y cotejos pendientes; lo urgente son las filas en guinda', () => {
        const c = cifrasPrestamos(datos({ recibida: 2, en_atencion: 1, cita_programada: 1, atendida: 9 }));
        expect(c.porAtender).toBe(2);
        expect(c.enProceso).toBe(2);
        expect(c.porCotejar).toBe(5);
        expect(c.total).toBe(9);
        // 2 recibidas + 2 cotejos que no coinciden (con diferencias y sin coincidencia); «Ya vinculada» no es urgente
        expect(c.urgentes).toBe(4);
    });

    it('cada acceso rápido dice cuánto tiene esperando', () => {
        expect(estadoAccesoPrestamos(RUTA_SOLICITUDES, datos({ recibida: 2 }))).toEqual({ texto: '2 por atender', tono: 'guinda' });
        expect(estadoAccesoPrestamos(RUTA_SOLICITUDES, datos({}))).toEqual({ texto: 'Al día', tono: 'verde' });
        expect(estadoAccesoPrestamos(RUTA_COTEJOS, datos({}))?.tono).toBe('guinda');
        expect(textoPrestamos(datos({ recibida: 1 }))).toMatch(/^Tienes 1 solicitud por atender, 5 cuentas por cotejar/);
    });

    it('al vincular un cotejo baja lo pendiente', () => {
        vincular('CT-0051');
        expect(iconoResultado(obtenerCotejo('CT-0051')!)).toBe('check');
        expect(cifrasPrestamos(datos({})).porCotejar).toBe(4);
    });
});

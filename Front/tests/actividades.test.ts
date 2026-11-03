import { beforeEach, describe, expect, it } from 'vitest';
import {
    archivarActividad,
    crearActividad,
    fechaCorta,
    filtrarActividades,
    obtenerActividad,
    publicarActividad,
    reiniciarActividades,
    useActividades,
    VACIA,
    validarActividad,
} from '../src/pages/admin/actividades/datos';
import { capacidadPanel } from '../src/servicios/accesoPanel';

const completa = {
    ...VACIA, nombre: 'Taller', descripcion: 'Desc', fecha: '2026-11-12', inicio: '16:00', fin: '17:00',
    espacio: 'Sala infantil', cupo: '20', responsable: 'Fomento a la lectura',
};

describe('Validación de una actividad', () => {
    it('una actividad completa no tiene errores', () => {
        expect(validarActividad(completa)).toEqual({});
    });

    it('la hora de fin debe ser posterior al inicio', () => {
        expect(validarActividad({ ...completa, fin: '15:00' }).fin).toBe('La hora de fin debe ser posterior al inicio.');
    });

    it('el cupo no pasa la capacidad del espacio', () => {
        expect(validarActividad({ ...completa, cupo: '26' }).cupo).toBe('Máximo 25 personas en este espacio.');
        expect(validarActividad({ ...completa, cupo: '0' }).cupo).toMatch(/mayor que 0/);
    });

    it('el borrador solo exige el nombre', () => {
        expect(validarActividad({ ...VACIA, nombre: 'Algo' }, true)).toEqual({});
        expect(validarActividad(VACIA, true).nombre).toBeDefined();
    });
});

describe('Flujo de propuestas', () => {
    beforeEach(() => reiniciarActividades());

    it('una actividad nueva recibe el siguiente folio', () => {
        expect(crearActividad(completa, 'en-revision')).toBe('AC-0109');
        expect(obtenerActividad('AC-0109')?.estado).toBe('en-revision');
    });

    it('solo se publica lo aprobado', async () => {
        await expect(publicarActividad('AC-0107')).rejects.toThrow();
        await publicarActividad('AC-0106');
        expect(obtenerActividad('AC-0106')?.estado).toBe('publicada');
    });

    it('archivar pide motivo y no aplica a publicadas', () => {
        expect(() => archivarActividad('AC-0106', ' ')).toThrow();
        expect(() => archivarActividad('AC-0108', 'x')).toThrow();
        archivarActividad('AC-0106', 'Ya no se realizará');
        expect(obtenerActividad('AC-0106')?.estado).toBe('archivada');
    });

    it('"Todas" no muestra las archivadas y se busca por folio o nombre', () => {
        archivarActividad('AC-0105', 'x');
        const todas = ['AC-0100', 'AC-0101', 'AC-0102', 'AC-0103', 'AC-0104', 'AC-0105', 'AC-0106', 'AC-0107', 'AC-0108'].map((f) => obtenerActividad(f)!);
        expect(filtrarActividades(todas, 'todas', '').some((a) => a.folio === 'AC-0105')).toBe(false);
        expect(filtrarActividades(todas, 'todas', 'tepic').map((a) => a.folio)).toEqual(['AC-0106']);
        expect(filtrarActividades(todas, 'todas', 'ac-0108').map((a) => a.folio)).toEqual(['AC-0108']);
    });
});

describe('Formatos y permisos', () => {
    it('fecha corta', () => {
        expect(fechaCorta('2026-11-12')).toBe('12 nov 2026');
        expect(fechaCorta('')).toBe('Por definir');
    });

    it('Actividades pide registrar_resoluciones_actividades', () => {
        expect(capacidadPanel('/admin/actividades/propuestas')).toBe('registrar_resoluciones_actividades');
        expect(capacidadPanel('/admin/actividades/calendario')).toBe('registrar_resoluciones_actividades');
    });

    it('el almacén se puede usar como hook', () => {
        expect(typeof useActividades).toBe('function');
    });
});

import { celdasDelMes, conflictoBloqueo, diaLargo, eventosDelDia, ocupacion, semanaDe } from '../src/pages/admin/actividades/calendario';
import { guardarBloqueo, leerSalas, quitarBloqueo, reiniciarSalas, validarBloqueo } from '../src/pages/admin/actividades/salas';

describe('Calendario y salas', () => {
    beforeEach(() => { reiniciarActividades(); reiniciarSalas(); });
    const actividades = () => ['AC-0101', 'AC-0106', 'AC-0104'].map((f) => obtenerActividad(f)!);

    it('detecta el choque de un bloqueo con una actividad', () => {
        const base = { sala: 'Auditorio', fecha: '2026-11-19', motivo: 'Mantenimiento' };
        expect(conflictoBloqueo({ ...base, desde: '17:00', hasta: '19:00' }, actividades())?.folio).toBe('AC-0106');
        expect(conflictoBloqueo({ ...base, desde: '09:00', hasta: '11:00' }, actividades())).toBeUndefined();
        expect(conflictoBloqueo({ ...base, desde: '', hasta: '' }, actividades())?.folio).toBe('AC-0106');
    });

    it('una actividad cancelada ya no ocupa la sala', () => {
        expect(conflictoBloqueo({ sala: 'Sala infantil', fecha: '2026-10-24', desde: '', hasta: '', motivo: 'x' }, actividades())).toBeUndefined();
    });

    it('ocupación por bloque de dos horas', () => {
        expect(ocupacion('Auditorio', '2026-11-19', '17:00', actividades(), []).texto).toBe('Charla');
        expect(ocupacion('Auditorio', '2026-11-19', '09:00', actividades(), []).tipo).toBe('libre');
        const bloqueo = { id: 'b', sala: 'Auditorio', fecha: '2026-11-19', desde: '', hasta: '', motivo: 'x' };
        expect(ocupacion('Auditorio', '2026-11-19', '09:00', actividades(), [bloqueo]).tipo).toBe('bloqueada');
    });

    it('la agenda del día pone "todo el día" al final', () => {
        const bloqueo = { id: 'b', sala: 'Sala B', fecha: '2026-11-19', desde: '', hasta: '', motivo: 'Mantenimiento (ejemplo)' };
        const ev = eventosDelDia('2026-11-19', actividades(), [bloqueo]);
        expect(ev.map((e) => e.clase)).toEqual(['actividad', 'bloqueo']);
    });

    it('el mes empieza en lunes y la semana va de lunes a viernes', () => {
        const celdas = celdasDelMes(2026, 9); // octubre 2026 empieza en jueves
        expect(celdas.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
        expect(celdas.length % 7).toBe(0);
        expect(semanaDe('2026-10-28')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
        expect(diaLargo('2026-10-27')).toBe('Martes 27 de octubre');
    });

    it('valida, guarda y quita bloqueos', async () => {
        expect(validarBloqueo({ sala: 'Auditorio', fecha: '2026-11-20', desde: '15:00', hasta: '11:00', motivo: 'x' }).hasta).toMatch(/posterior/);
        expect(validarBloqueo({ sala: '', fecha: '', desde: '', hasta: '', motivo: '' })).toHaveProperty('motivo');
        const id = await guardarBloqueo({ sala: 'Sala B', fecha: '2026-11-20', desde: '', hasta: '', motivo: 'x' });
        expect(leerSalas().bloqueos.some((b) => b.id === id)).toBe(true);
        quitarBloqueo(id);
        expect(leerSalas().bloqueos.some((b) => b.id === id)).toBe(false);
    });
});

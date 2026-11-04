import { describe, expect, it } from 'vitest';
import { agendaEjemplo, comoActividad, fechaCaja, fechaTexto, proximas } from '../src/pages/publico/eventos/datosAgenda';
import { actividadElegida } from '../src/pages/publico/eventos/datos';

describe('T-052 · Agenda pública', () => {
    it('muestra solo las próximas, ordenadas por fecha y hora', () => {
        const lista = proximas(agendaEjemplo, '2026-11-03');
        expect(lista.map((a) => a.id)).toEqual(['agenda-escritura', 'agenda-circulo', 'agenda-visita', 'agenda-cuentacuentos', 'agenda-dibujo', 'agenda-tertulia']);
        expect(proximas(agendaEjemplo, '2026-11-19').map((a) => a.id)).toEqual(['agenda-cuentacuentos', 'agenda-dibujo', 'agenda-tertulia']);
    });
    it('filtra por categoría', () => {
        expect(proximas(agendaEjemplo, '2026-11-03', 'taller')).toHaveLength(2);
        expect(proximas(agendaEjemplo, '2026-11-03', 'club').map((a) => a.titulo)).toEqual(['Círculo de lectura', 'Tertulia mensual']);
    });
    it('escribe la fecha para la caja y para el detalle', () => {
        expect(fechaCaja('2026-11-14')).toEqual({ dia: '14', mes: 'NOV' });
        expect(fechaTexto('2026-11-14')).toBe('Sáb 14 nov');
    });
    it('el detalle /eventos/:id reconoce las actividades de la agenda', () => {
        expect(actividadElegida('agenda-dibujo')?.titulo).toBe('Iniciación al dibujo');
        expect(comoActividad(agendaEjemplo[0]).tipo).toBe('Taller');
        expect(actividadElegida('actividad-1')?.titulo).toBe('Taller de escritura creativa');
    });
});

import { agruparPorMes, estadoActividad, filtrarTodas, filtrosVacios, HOY_EJEMPLO } from '../src/pages/publico/eventos/datosAgenda';

describe('T-052 · Todas las actividades', () => {
    const hoy = HOY_EJEMPLO;
    it('agrupa por mes, del más reciente al más antiguo, con próximas y pasadas (6 y 6)', () => {
        const grupos = agruparPorMes(filtrarTodas(agendaEjemplo, filtrosVacios, hoy), hoy);
        expect(grupos.map((g) => [g.titulo, g.pasado, g.actividades.length])).toEqual([['Noviembre 2026', false, 6], ['Octubre 2026', true, 6]]);
    });
    it('busca sin importar acentos y filtra por fecha exacta', () => {
        expect(filtrarTodas(agendaEjemplo, { ...filtrosVacios, texto: 'poesia' }, hoy).map((a) => a.id)).toEqual(['agenda-poesia']);
        expect(filtrarTodas(agendaEjemplo, { ...filtrosVacios, fecha: '2026-11-14' }, hoy)).toHaveLength(2);
    });
    it('filtra por disponibilidad y horario', () => {
        expect(filtrarTodas(agendaEjemplo, { ...filtrosVacios, disponibilidad: 'cupo' }, hoy).map((a) => a.id)).toEqual(['agenda-dibujo']);
        expect(filtrarTodas(agendaEjemplo, { ...filtrosVacios, disponibilidad: 'inscrito' }, hoy).map((a) => a.id)).toEqual(['agenda-escritura']);
        expect(filtrarTodas(agendaEjemplo, { ...filtrosVacios, horario: 'tarde' }, hoy).every((a) => Number(a.horario.slice(0, 2)) >= 14)).toBe(true);
    });
    it('una actividad pasada queda finalizada', () => {
        expect(estadoActividad(agendaEjemplo.find((a) => a.id === 'agenda-poesia')!, hoy)).toBe('finalizada');
        expect(estadoActividad(agendaEjemplo.find((a) => a.id === 'agenda-dibujo')!, hoy)).toBe('cupo');
    });
});

import { diaInicial, diaLargo, moverMes, semanasDelMes } from '../src/pages/publico/eventos/datosAgenda';

describe('T-052 · Calendario', () => {
    it('arma las semanas de lunes a domingo (noviembre 2026: del 26 oct al 6 dic)', () => {
        const semanas = semanasDelMes(2026, 11, agendaEjemplo);
        expect(semanas).toHaveLength(6);
        expect(semanas.every((s) => s.length === 7)).toBe(true);
        expect(semanas[0][0]).toMatchObject({ fecha: '2026-10-26', delMes: false });
        expect(semanas[5][6]).toMatchObject({ fecha: '2026-12-06', delMes: false });
        expect(semanas.flat().find((d) => d.fecha === '2026-11-14')?.actividades).toHaveLength(2);
    });
    it('abre en el primer día con actividades desde hoy', () => {
        expect(diaInicial(semanasDelMes(2026, 11, agendaEjemplo), '2026-11-03')).toBe('2026-11-14');
        expect(diaInicial(semanasDelMes(2026, 12, agendaEjemplo), '2026-11-03')).toBeNull();
    });
    it('cambia de mes y de año', () => {
        expect(moverMes(2026, 12, 1)).toEqual({ anio: 2027, mes: 1 });
        expect(moverMes(2026, 1, -1)).toEqual({ anio: 2025, mes: 12 });
    });
    it('escribe el día elegido', () => {
        expect(diaLargo('2026-11-14')).toEqual({ semana: 'SÁBADO', texto: '14 de noviembre' });
    });
});

import { fechaCompleta, inscripciones, obtenerActividad, textoCupo } from '../src/pages/publico/eventos/datosAgenda';

describe('T-052 · Detalle e inscripción', () => {
    it('describe el cupo como en Figma', () => {
        expect(textoCupo(obtenerActividad('agenda-escritura')!, false)).toBe('8 lugares disponibles');
        expect(textoCupo(obtenerActividad('agenda-escritura')!, true)).toBe('Tu lugar: 1');
        expect(textoCupo(obtenerActividad('agenda-dibujo')!, false)).toBe('Completo · 20 de 20');
    });
    it('escribe la fecha completa', () => {
        expect(fechaCompleta('2026-11-14')).toBe('Sábado 14 de noviembre');
    });
    it('inscribir y cancelar avisa a quien escucha', () => {
        let avisos = 0;
        const dejar = inscripciones.suscribir(() => { avisos++; });
        inscripciones.inscribir('agenda-visita');
        expect(inscripciones.tiene('agenda-visita')).toBe(true);
        inscripciones.cancelar('agenda-visita');
        expect(inscripciones.tiene('agenda-visita')).toBe(false);
        dejar();
        expect(avisos).toBe(2);
    });
    it('una actividad que no existe no tiene detalle de agenda', () => {
        expect(obtenerActividad('no-existe')).toBeNull();
    });
});

describe('T-052 · Lista de espera', () => {
    it('anotarse, salir y confirmar el lugar', () => {
        inscripciones.anotarEnEspera('agenda-dibujo');
        expect(inscripciones.lugarEnEspera('agenda-dibujo')).toBe(3);
        inscripciones.salirDeEspera('agenda-dibujo');
        expect(inscripciones.lugarEnEspera('agenda-dibujo')).toBeNull();
        inscripciones.anotarEnEspera('agenda-dibujo');
        inscripciones.inscribir('agenda-dibujo'); // confirmar el lugar liberado
        expect(inscripciones.lugarEnEspera('agenda-dibujo')).toBeNull();
        expect(inscripciones.tiene('agenda-dibujo')).toBe(true);
        inscripciones.cancelar('agenda-dibujo');
    });
});

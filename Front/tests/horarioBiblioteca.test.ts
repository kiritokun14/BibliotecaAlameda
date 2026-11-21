import { describe, expect, it } from 'vitest';
import { estadoBiblioteca } from '../src/pages/publico/inicio/horarioBiblioteca';

// Hora de Tepic = UTC-7 todo el año (America/Mazatlan, sin horario de verano desde 2022)
const tepic = (iso: string) => new Date(`${iso}-07:00`);

describe('estado de la biblioteca según su horario', () => {
    it('entre semana dentro del horario está abierta y dice a qué hora cierra', () => {
        expect(estadoBiblioteca(tepic('2026-11-18T10:00:00'))).toEqual({ abierta: true, texto: 'Abierto ahora · cierra a las 19:30 h' });
    });
    it('antes de abrir dice que abre hoy', () => {
        expect(estadoBiblioteca(tepic('2026-11-18T07:15:00'))).toEqual({ abierta: false, texto: 'Cerrado ahora · abre hoy a las 8:00 h' });
    });
    it('a las 19:30 ya está cerrada y abre mañana', () => {
        expect(estadoBiblioteca(tepic('2026-11-18T19:30:00')).texto).toBe('Cerrado ahora · abre mañana a las 8:00 h');
    });
    it('el viernes en la noche abre el sábado a las 9:00', () => {
        expect(estadoBiblioteca(tepic('2026-11-20T21:00:00')).texto).toBe('Cerrado ahora · abre mañana a las 9:00 h');
    });
    it('el sábado cierra a las 14:00', () => {
        expect(estadoBiblioteca(tepic('2026-11-21T12:00:00'))).toEqual({ abierta: true, texto: 'Abierto ahora · cierra a las 14:00 h' });
    });
    it('el domingo está cerrada y abre el lunes', () => {
        expect(estadoBiblioteca(tepic('2026-11-22T11:00:00')).texto).toBe('Cerrado ahora · abre mañana a las 8:00 h');
        expect(estadoBiblioteca(tepic('2026-11-21T15:00:00')).texto).toBe('Cerrado ahora · abre el lunes a las 8:00 h');
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { avanceNivel, disponibilidad, nombreNivel, puedeRecibir, siguienteNivel, type Entrega, type Recompensa, type ResumenProgreso } from '../src/servicios/progreso';
import { aDatos, diaDe, estadoCredencial, validarRecompensa } from '../src/pages/admin/participantes/progreso';

const persona = (cambios: Partial<ResumenProgreso> = {}): ResumenProgreso => ({
    usuarioId: 'u1', nombre: 'Persona', validas: 3, ajustes: 0, total: 3, nivel: 1, noContadas: 0,
    credencial: { estado: 'validada', vence: '2028-09-26', vigente: true }, asignadas: 0, entregadas: 0, ultimaParticipacion: null, ...cambios,
});
const recompensa = (cambios: Partial<Recompensa> = {}): Recompensa => ({
    id: 'r1', nombre: 'Separador', descripcion: '', nivelRequerido: 1, existencias: 3, vigenciaInicio: '2026-11-01T00:00:00-07:00',
    vigenciaFin: '2027-01-24T23:59:59-07:00', estado: 'activa', asignadas: 0, entregadas: 0, actualizadoEn: '2026-11-22T00:00:00Z', ...cambios,
});
const HOY = new Date('2026-11-23T18:00:00Z');

describe('Niveles del documento (D-11)', () => {
    it('Inicial 0–2, Lector activo 3–5, Lector constante 6+', () => {
        expect(nombreNivel(0)).toBe('Inicial');
        expect(siguienteNivel(2)).toMatchObject({ nombre: 'Lector activo', faltan: 1 });
        expect(siguienteNivel(3)).toMatchObject({ nombre: 'Lector constante', faltan: 3 });
        expect(siguienteNivel(6)).toBeNull();
        expect(avanceNivel(3)).toBe(50);
        expect(avanceNivel(9)).toBe(100);
    });
});

describe('Quién puede recibir una recompensa', () => {
    it('pide nivel, credencial vigente, existencias, vigencia y no repetir', () => {
        expect(puedeRecibir(persona(), recompensa(), [], HOY)).toBeNull();
        expect(puedeRecibir(persona({ nivel: 0, total: 2 }), recompensa(), [], HOY)).toMatch(/Lector activo/);
        expect(puedeRecibir(persona({ credencial: null }), recompensa(), [], HOY)).toMatch(/credencial/);
        expect(puedeRecibir(persona(), recompensa({ existencias: 0 }), [], HOY)).toMatch(/existencias/);
        expect(puedeRecibir(persona(), recompensa({ vigenciaFin: '2026-11-01T00:00:00-07:00' }), [], HOY)).toMatch(/vigente/);
        const ya = { recompensaId: 'r1', usuarioId: 'u1', estado: 'asignada' } as Entrega;
        expect(puedeRecibir(persona(), recompensa(), [ya], HOY)).toMatch(/Ya la tiene/);
        expect(puedeRecibir(persona(), recompensa(), [{ ...ya, estado: 'cancelada' }], HOY)).toBeNull();
    });

    it('disponibilidad y estado de la credencial', () => {
        expect(disponibilidad(recompensa({ existencias: 0, estado: 'agotada' })).texto).toBe('Agotada');
        expect(disponibilidad(recompensa({ existencias: 4 })).texto).toBe('Pocas');
        expect(disponibilidad(recompensa({ estado: 'inactiva' })).texto).toBe('Inactiva');
        expect(estadoCredencial(persona({ credencial: { estado: 'vencida', vence: '2026-01-01', vigente: false } }))).toBe('vencida');
        expect(estadoCredencial(persona({ credencial: null }))).toBe('sin');
    });
});

describe('Formulario de recompensa', () => {
    afterEach(() => vi.useRealTimers());
    it('valida y convierte las fechas al horario de Tepic', () => {
        const vacio = { nombre: ' ', descripcion: '', nivelRequerido: '1', existencias: '', inicio: '2026-11-10', fin: '2026-11-01', estado: 'activa' as const };
        expect(Object.keys(validarRecompensa(vacio))).toEqual(['nombre', 'existencias', 'fin']);
        const d = aDatos({ ...vacio, nombre: ' Separador ', existencias: '50', fin: '2027-01-24' });
        expect(d).toMatchObject({ nombre: 'Separador', nivelRequerido: 1, existencias: 50, vigenciaInicio: '2026-11-10T00:00:00-07:00', vigenciaFin: '2027-01-24T23:59:59-07:00' });
        expect(diaDe('2026-11-24T05:00:00Z')).toBe('2026-11-23');
    });
});

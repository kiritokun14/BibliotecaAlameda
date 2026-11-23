// Mi cuenta del personal y notificaciones por cuenta (T3, 22 nov 2026)
import { describe, expect, it } from 'vitest';
import { accesosPorSeccion, tonoRol, validarContrasena, validarDatos } from '../src/pages/admin/perfil/utiles';
import { EJEMPLO, deLaCuenta } from '../src/pages/admin/notificaciones/datos';
import type { AccesoCuenta } from '../src/servicios/auth';
import { capacidadPanel } from '../src/servicios/accesoPanel';

const prestamos: AccesoCuenta = { usuarioId: 'p', roles: [{ rolCodigo: 'usuario', capacidades: ['validar_credenciales'] }], permisosAdicionales: [] };
const admin: AccesoCuenta = { usuarioId: 'a', roles: [{ rolCodigo: 'administrador', capacidades: ['validar_credenciales', 'publicar_contenidos', 'atender_contactos', 'registrar_asistencia'] }], permisosAdicionales: [] };

describe('Mi cuenta del personal', () => {
    it('es del panel para todo el personal', () => {
        expect(capacidadPanel('/admin/perfil')).toBe('panel_general');
        expect(capacidadPanel('/admin/perfil/seguridad')).toBe('panel_general');
    });
    it('valida nombre, teléfono y contraseña como el portal', () => {
        expect(validarDatos('', '311')).toEqual({ nombres: 'Escribe tu nombre.', telefono: 'Escribe un teléfono de 10 dígitos.' });
        expect(validarDatos('Pedro', '3110000008')).toEqual({});
        expect(validarContrasena('', 'nuevaClave1', 'nuevaClave1')).toMatch(/actual/);
        expect(validarContrasena('vieja1234', 'corta', 'corta')).toMatch(/8 y 128/);
        expect(validarContrasena('vieja1234', 'nuevaClave1', 'otra')).toMatch(/no coincide/);
        expect(validarContrasena('vieja1234', 'nuevaClave1', 'nuevaClave1')).toBe('');
    });
    it('muestra lo que la cuenta puede abrir según el menú', () => {
        const secciones = accesosPorSeccion(prestamos);
        expect(secciones.find((s) => s.id === 'participantes')?.puede).toEqual(['Cotejo de credenciales']);
        expect(secciones.find((s) => s.id === 'contenidos')?.puede).toEqual([]);
        expect(tonoRol(prestamos)).toBe('usuario');
        expect(tonoRol(admin)).toBe('administrador');
    });
});

describe('Notificaciones por cuenta', () => {
    it('solo llegan las de lo que la cuenta atiende', () => {
        expect(deLaCuenta(EJEMPLO, prestamos).map((n) => n.id)).toEqual(['CT-0051']);
        expect(deLaCuenta(EJEMPLO, undefined)).toHaveLength(EJEMPLO.length);
    });
});

import { describe, expect, it } from 'vitest';
import { capacidadPanel, permisoGlobal, rutaInicialPanel, tienePanel } from '../src/servicios/accesoPanel';
import type { AccesoCuenta } from '../src/servicios/auth';
const acceso = (capacidad?: string): AccesoCuenta => ({ usuarioId: 'persona',
    roles: [{ rolCodigo: 'administrador', capacidades: ['administrar_cuentas'] }],
    permisosAdicionales: capacidad ? [{ capacidad, ambito: 'global', actividadId: null }] : [] });
describe('Acceso a las pantallas de atención', () => {
    it('administrar cuentas no concede atención ni publicación automáticamente', () => {
        expect(tienePanel(acceso())).toBe(false);
        expect(permisoGlobal(acceso(), 'publicar_contenidos')).toBe(false);
        expect(rutaInicialPanel(acceso())).toBeNull();
    });
    it('entra a la primera sección realmente autorizada', () => {
        expect(rutaInicialPanel(acceso('registrar_resoluciones_actividades'))).toBe('/admin/atencion/espacios');
        expect(rutaInicialPanel(acceso('validar_credenciales'))).toBe('/admin/atencion/credenciales');
    });
    it('publicar exige un permiso distinto al de resolver propuestas', () => {
        expect(capacidadPanel('/admin/atencion/propuestas/PR-1')).toBe('registrar_resoluciones_actividades');
        expect(capacidadPanel('/admin/atencion/propuestas/PR-1/publicar')).toBe('publicar_contenidos');
        expect(permisoGlobal(acceso('registrar_resoluciones_actividades'), 'publicar_contenidos')).toBe(false);
    });
    it('un permiso limitado a una actividad no abre una bandeja global', () => {
        const cuenta = acceso();
        cuenta.permisosAdicionales = [{ capacidad: 'registrar_resoluciones_actividades', ambito: 'actividad', actividadId: 'actividad' }];
        expect(tienePanel(cuenta)).toBe(false);
    });
    it('sin rutas conocidas no presume permiso', () => {
        expect(capacidadPanel('/admin/desconocida')).toBeNull();
    });
});

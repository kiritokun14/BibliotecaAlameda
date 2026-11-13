import { describe, expect, it } from 'vitest';
import { capacidadPanel, permisoGlobal, rutaInicialPanel, tienePanel } from '../src/servicios/accesoPanel';
import type { AccesoCuenta } from '../src/servicios/auth';
const acceso = (capacidad?: string): AccesoCuenta => ({ usuarioId: 'persona',
    roles: [{ rolCodigo: 'administrador', capacidades: ['administrar_cuentas'] }],
    permisosAdicionales: capacidad ? [{ capacidad, ambito: 'global', actividadId: null }] : [] });
describe('Acceso a las pantallas de atención', () => {
    it('la moderación requiere permiso propio y no acepta ámbito limitado como global', () => {
        expect(capacidadPanel('/admin/participantes/foro')).toBe('moderar_foro');
        expect(tienePanel(acceso('moderar_foro'))).toBe(true);
        expect(permisoGlobal(acceso('enviar_avisos'), 'moderar_foro')).toBe(false);
        const limitada = acceso();
        limitada.permisosAdicionales = [{ capacidad: 'moderar_foro', ambito: 'actividades_asignadas', actividadId: 'actividad' }];
        expect(permisoGlobal(limitada, 'moderar_foro')).toBe(false);
    });
    it('avisos exige su capacidad y permite entrar con ella sin otorgar otras', () => {
        expect(capacidadPanel('/admin/atencion/avisos')).toBe('enviar_avisos');
        expect(tienePanel(acceso('enviar_avisos'))).toBe(true);
        expect(permisoGlobal(acceso(), 'enviar_avisos')).toBe(false);
        expect(permisoGlobal(acceso('enviar_avisos'), 'publicar_contenidos')).toBe(false);
    });
    it('administrar cuentas no concede atención ni publicación automáticamente', () => {
        expect(tienePanel(acceso())).toBe(true);
        expect(permisoGlobal(acceso(), 'validar_credenciales')).toBe(false);
        expect(permisoGlobal(acceso(), 'publicar_contenidos')).toBe(false);
        expect(rutaInicialPanel(acceso())).toBe('/admin/resumen');
    });
    it('entra a la primera sección realmente autorizada', () => {
        expect(rutaInicialPanel(acceso('registrar_resoluciones_actividades'))).toBe('/admin/resumen');
        expect(rutaInicialPanel(acceso('validar_credenciales'))).toBe('/admin/resumen');
    });
    it('publicar exige un permiso distinto al de resolver propuestas', () => {
        expect(capacidadPanel('/admin/atencion/propuestas/PR-1')).toBe('registrar_resoluciones_actividades');
        expect(capacidadPanel('/admin/atencion/propuestas/PR-1/publicar')).toBe('publicar_contenidos');
        expect(permisoGlobal(acceso('registrar_resoluciones_actividades'), 'publicar_contenidos')).toBe(false);
    });
    it('un permiso limitado a una actividad no abre una bandeja global', () => {
        const cuenta = { ...acceso(), roles: [] };
        cuenta.permisosAdicionales = [{ capacidad: 'registrar_resoluciones_actividades', ambito: 'actividad', actividadId: 'actividad' }];
        expect(tienePanel(cuenta)).toBe(false);
    });
    it('un editor no obtiene permisos de publicación ni de actividades', () => {
        const editor = acceso('preparar_contenidos');
        expect(tienePanel(editor)).toBe(true);
        expect(permisoGlobal(editor, capacidadPanel('/admin/resumen')!)).toBe(true);
        expect(permisoGlobal(editor, capacidadPanel('/admin/contenidos/revision')!)).toBe(false);
        expect(permisoGlobal(editor, capacidadPanel('/admin/actividades/asistencia')!)).toBe(false);
    });
    it('resolver solicitudes no concede gestión de actividades o evidencias', () => {
        const atencion = acceso('registrar_resoluciones_actividades');
        expect(permisoGlobal(atencion, capacidadPanel('/admin/actividades/propuestas')!)).toBe(false);
        expect(permisoGlobal(atencion, capacidadPanel('/admin/actividades/evidencias')!)).toBe(false);
    });
    it('sin rutas conocidas no presume permiso', () => {
        expect(capacidadPanel('/admin/desconocida')).toBeNull();
    });
});

import { createContext } from 'react';
import type { AccesoCuenta } from './auth';
export interface IdentidadPanel { acceso: AccesoCuenta; correo: string }
export const ContextoPanel = createContext<IdentidadPanel | null>(null);
export const PANEL_GENERAL = 'panel_general';
export function capacidadPanel(ruta: string): string | null {
    if (['/admin/resumen', '/admin/notificaciones'].includes(ruta)) return PANEL_GENERAL;
    if (ruta.startsWith('/admin/atencion/contactos')) return 'atender_contactos';
    if (ruta.startsWith('/admin/administracion/fuentes')) return 'gestionar_fuentes_asistente';
    if (ruta.startsWith('/admin/administracion/estadisticas')) return 'consultar_estadisticas';
    if (ruta.startsWith('/admin/administracion/cuentas') || ruta.startsWith('/admin/administracion/bitacora')
        || ruta.startsWith('/admin/administracion/configuracion')) return 'administrar_cuentas';
    if (ruta.startsWith('/admin/contenidos/revision')) return 'publicar_contenidos';
    if (ruta.startsWith('/admin/actividades/asistencia')) return 'registrar_asistencia';
    if (ruta.startsWith('/admin/actividades/inscripciones')) return 'confirmar_inscripciones';
    if (ruta.startsWith('/admin/actividades/evidencias')) return 'gestionar_evidencias';
    if (ruta.startsWith('/admin/actividades')) return 'gestionar_actividades';
    // Participantes: progreso y recompensas, cotejo de credenciales y moderación del foro
    if (ruta.startsWith('/admin/participantes/progreso')) return 'registrar_recompensas';
    if (ruta.startsWith('/admin/participantes/cotejo')) return 'validar_credenciales';
    if (ruta.startsWith('/admin/participantes/foro')) return 'moderar_foro';
    if (ruta.startsWith('/admin/atencion/recuperacion')) return 'orientar_recuperacion';
    if (ruta.startsWith('/admin/atencion/cuentas')) return 'consultar_cuentas_atencion';
    if (ruta.startsWith('/admin/atencion/avisos')) return 'enviar_avisos';
    if (ruta.startsWith('/admin/atencion/credenciales')) return 'validar_credenciales';
    if (ruta.startsWith('/admin/atencion/espacios')) return 'registrar_resoluciones_actividades';
    if (ruta.startsWith('/admin/atencion/propuestas'))
        return ruta.endsWith('/publicar') ? 'publicar_contenidos' : 'registrar_resoluciones_actividades';
    if (ruta.startsWith('/admin/contenidos')) return 'preparar_contenidos';
    return null;
}
export function permisoGlobal(acceso: AccesoCuenta, capacidad: string): boolean {
    if (capacidad === PANEL_GENERAL) return tienePanel(acceso);
    return acceso.roles.some(rol => rol.capacidades.includes(capacidad)) ||
        acceso.permisosAdicionales.some(p => p.capacidad === capacidad && p.ambito === 'global' && !p.actividadId);
}
export function tienePanel(acceso: AccesoCuenta): boolean {
    return ['validar_credenciales', 'registrar_resoluciones_actividades', 'preparar_contenidos', 'publicar_contenidos', 'gestionar_actividades', 'registrar_asistencia', 'confirmar_inscripciones', 'gestionar_evidencias', 'atender_contactos', 'atender_bibliocomunidad', 'gestionar_fuentes_asistente'].some(c => permisoGlobal(acceso, c));
}
export function nombresRoles(acceso: AccesoCuenta): string {
    const nombres: Record<string,string> = { usuario: 'Usuario / Cliente', editor: 'Editor',
        responsable_actividades: 'Responsable de actividades', administrador: 'Administrador del portal' };
    return acceso.roles.map(r => nombres[r.rolCodigo] ?? r.rolCodigo).join(', ');
}
export function rutaInicialPanel(acceso: AccesoCuenta): string | null {
    return ['/admin/resumen', '/admin/atencion/credenciales', '/admin/atencion/espacios', '/admin/atencion/propuestas', '/admin/contenidos/editor']
        .find(ruta => permisoGlobal(acceso, capacidadPanel(ruta)!)) ?? null;
}

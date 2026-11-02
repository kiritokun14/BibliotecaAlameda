import { createContext } from 'react';
import type { AccesoCuenta } from './auth';
export interface IdentidadPanel { acceso: AccesoCuenta; correo: string }
export const ContextoPanel = createContext<IdentidadPanel | null>(null);
export function capacidadPanel(ruta: string): string | null {
    // Contenidos (HU-12): el Editor prepara; quien autoriza publica
    if (ruta.startsWith('/admin/contenidos/editor')) return 'preparar_contenidos';
    if (ruta.startsWith('/admin/contenidos/revision')) return 'publicar_contenidos';
    if (ruta.startsWith('/admin/atencion/credenciales')) return 'validar_credenciales';
    if (ruta.startsWith('/admin/atencion/espacios')) return 'registrar_resoluciones_actividades';
    if (ruta.startsWith('/admin/atencion/propuestas'))
        return ruta.endsWith('/publicar') ? 'publicar_contenidos' : 'registrar_resoluciones_actividades';
    return null;
}
// Modo desarrollo con TODOS los permisos del panel (atajo temporal mientras backend asigna los reales).
// Solo funciona con `npm run dev` y VITE_PANEL_COMPLETO=true en Front/.env.development.local.
// En el build de producción import.meta.env.DEV es false, así que esta línea no concede nada.
// Ojo: solo abre las pantallas del frontend; cualquier llamada real al backend sigue revisando permisos.
export const PANEL_COMPLETO_DEV = import.meta.env.DEV && import.meta.env.VITE_PANEL_COMPLETO === 'true';
if (PANEL_COMPLETO_DEV) console.warn('[Panel] Modo desarrollo: todas las secciones del panel están abiertas para cualquier sesión.');

export function permisoGlobal(acceso: AccesoCuenta, capacidad: string): boolean {
    if (PANEL_COMPLETO_DEV) return true;
    return acceso.roles.some(rol => rol.capacidades.includes(capacidad)) ||
        acceso.permisosAdicionales.some(p => p.capacidad === capacidad && p.ambito === 'global' && !p.actividadId);
}
export function tienePanel(acceso: AccesoCuenta): boolean {
    return ['validar_credenciales', 'registrar_resoluciones_actividades', 'preparar_contenidos', 'publicar_contenidos'].some(c => permisoGlobal(acceso, c));
}
export function nombresRoles(acceso: AccesoCuenta): string {
    const nombres: Record<string,string> = { usuario: 'Usuario / Cliente', editor: 'Editor',
        responsable_actividades: 'Responsable de actividades', administrador: 'Administrador del portal' };
    return acceso.roles.map(r => nombres[r.rolCodigo] ?? r.rolCodigo).join(', ');
}
export function rutaInicialPanel(acceso: AccesoCuenta): string | null {
    return ['/admin/atencion/credenciales', '/admin/atencion/espacios', '/admin/atencion/propuestas',
        '/admin/contenidos/editor', '/admin/contenidos/revision']
        .find(ruta => permisoGlobal(acceso, capacidadPanel(ruta)!)) ?? null;
}

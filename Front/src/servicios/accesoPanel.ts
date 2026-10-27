import { createContext } from 'react';
import type { AccesoCuenta } from './auth';
export interface IdentidadPanel { acceso: AccesoCuenta; correo: string }
export const ContextoPanel = createContext<IdentidadPanel | null>(null);
export function capacidadPanel(ruta: string): string | null {
    if (ruta.startsWith('/admin/atencion/credenciales')) return 'validar_credenciales';
    if (ruta.startsWith('/admin/atencion/espacios')) return 'registrar_resoluciones_actividades';
    if (ruta.startsWith('/admin/atencion/propuestas'))
        return ruta.endsWith('/publicar') ? 'publicar_contenidos' : 'registrar_resoluciones_actividades';
    return null;
}
export function permisoGlobal(acceso: AccesoCuenta, capacidad: string): boolean {
    return acceso.roles.some(rol => rol.capacidades.includes(capacidad)) ||
        acceso.permisosAdicionales.some(p => p.capacidad === capacidad && p.ambito === 'global' && !p.actividadId);
}
export function tienePanel(acceso: AccesoCuenta): boolean {
    return ['validar_credenciales', 'registrar_resoluciones_actividades'].some(c => permisoGlobal(acceso, c));
}
export function nombresRoles(acceso: AccesoCuenta): string {
    const nombres: Record<string,string> = { usuario: 'Usuario / Cliente', editor: 'Editor',
        responsable_actividades: 'Responsable de actividades', administrador: 'Administrador del portal' };
    return acceso.roles.map(r => nombres[r.rolCodigo] ?? r.rolCodigo).join(', ');
}
export function rutaInicialPanel(acceso: AccesoCuenta): string | null {
    return ['/admin/atencion/credenciales', '/admin/atencion/espacios', '/admin/atencion/propuestas']
        .find(ruta => permisoGlobal(acceso, capacidadPanel(ruta)!)) ?? null;
}

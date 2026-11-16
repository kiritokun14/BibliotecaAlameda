import { pedirAdministracion } from './auth';

// Atención › Consulta de cuentas. Usa los endpoints de Back/administracion.py (/administracion/cuentas…).
// La base exige facultad administrativa para listar, ver y cambiar el estado: una cuenta sin ella
// recibe 403 con el mensaje del backend. TODO backend: permitir 'consultar_cuentas_atencion' (solo lectura)
// y registrar en bitácora cada consulta de datos sensibles con su motivo.

export type EstatusCuenta = 'activo' | 'inactivo' | 'bloqueado';

export interface RolDeCuenta { rolCodigo: string; asignadoEn?: string; motivoAsignacion?: string }
export interface PermisoDeCuenta { capacidad: string; ambito: 'global' | 'actividades_asignadas'; actividadId: string | null; vigenteHasta?: string | null }
export interface CuentaResumen {
    id: string; nombres: string; primerApellido: string; segundoApellido: string | null;
    estatus: EstatusCuenta; correo: string; correoConfirmado: boolean;
    roles: RolDeCuenta[] | null; permisosAdicionales?: PermisoDeCuenta[];
}
export interface ListaCuentas { total: number; cuentas: CuentaResumen[]; limite: number; desplazamiento: number }
export interface CambioCuenta {
    id: string; usuarioId: string; realizadoPor: string; accion: 'asignar_rol' | 'retirar_rol' | 'cambiar_estado';
    motivo: string; anterior: Record<string, unknown>; posterior: Record<string, unknown>; realizadoEn: string;
}
export interface HistorialCuenta { total: number; cambios: CambioCuenta[] }

export function listarCuentas(busqueda: string, pagina: number, limite = 10) {
    const p = new URLSearchParams({ busqueda: busqueda.trim(), limite: String(limite), desplazamiento: String(pagina * limite) });
    return pedirAdministracion<ListaCuentas>(`/cuentas?${p}`);
}

export function verCuenta(id: string) {
    return pedirAdministracion<CuentaResumen>(`/cuentas/${encodeURIComponent(id)}`);
}

export function historialCuenta(id: string, limite = 25) {
    return pedirAdministracion<HistorialCuenta>(`/cuentas/${encodeURIComponent(id)}/historial?limite=${limite}`);
}

// Suspender = 'inactivo'; reactivar = 'activo'. El motivo es obligatorio (1 a 500 caracteres).
export function cambiarEstatus(id: string, estatus: EstatusCuenta, motivo: string) {
    return pedirAdministracion<unknown>(`/cuentas/${encodeURIComponent(id)}/estado`, {
        method: 'PATCH', body: JSON.stringify({ estatus, motivo: motivo.trim() }),
    });
}

export const nombreCompleto = (c: Pick<CuentaResumen, 'nombres' | 'primerApellido' | 'segundoApellido'>) =>
    [c.nombres, c.primerApellido, c.segundoApellido].filter(Boolean).join(' ');

// Cómo se nombra cada estado en pantalla
export function estadoCuenta(c: Pick<CuentaResumen, 'estatus' | 'correoConfirmado'>) {
    if (c.estatus === 'bloqueado') return 'Bloqueada';
    if (c.estatus === 'inactivo') return 'Suspendida';
    return c.correoConfirmado ? 'Activa' : 'Pendiente de activar';
}

// «persona.a@correo.mx» → «pe***@correo.mx»
export function ocultarCorreo(correo: string) {
    const [usuario, dominio] = correo.split('@');
    return dominio ? `${usuario.slice(0, 2)}***@${dominio}` : '***';
}

// ---------- Administración › Cuentas y permisos ----------

export type RolPersonal = 'editor' | 'responsable_actividades' | 'administrador';

// Mismas reglas que capacidad_admite_roles() en Back/administracion.py
const DE_ACTIVIDADES = ['gestionar_actividades', 'confirmar_inscripciones', 'registrar_asistencia', 'moderar_foro',
    'registrar_recompensas', 'gestionar_evidencias', 'consultar_estadisticas', 'registrar_resoluciones_actividades'];
export function capacidadAdmiteRoles(capacidad: string, roles: string[]) {
    if (DE_ACTIVIDADES.includes(capacidad)) return roles.includes('responsable_actividades');
    if (capacidad === 'preparar_contenidos' || capacidad === 'gestionar_fuentes_asistente') return roles.includes('editor');
    if (capacidad === 'publicar_contenidos') return roles.some((r) => ['editor', 'responsable_actividades', 'administrador'].includes(r));
    return true;
}

// Guarda de una vez los roles del personal y las capacidades (ámbito global), con su motivo
export function guardarAcceso(id: string, roles: RolPersonal[], capacidades: string[], motivo: string) {
    return pedirAdministracion<unknown>(`/cuentas/${encodeURIComponent(id)}/acceso`, {
        method: 'PUT', body: JSON.stringify({ roles, capacidades, motivo: motivo.trim(), ambito: 'global' }),
    });
}

export const rolesDe = (c: Pick<CuentaResumen, 'roles'>) => (c.roles ?? []).map((r) => r.rolCodigo);
export const capacidadesDe = (c: Pick<CuentaResumen, 'permisosAdicionales'>) =>
    [...new Set((c.permisosAdicionales ?? []).filter((p) => p.ambito === 'global').map((p) => p.capacidad))];

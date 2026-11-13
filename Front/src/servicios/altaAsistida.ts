import { ErrorServicio, obtenerSupabase, pedirApi } from './api';
import { consultarMiAcceso, type AccesoCuenta, type SolicitudRegistro } from './auth';

// T-033 / HU-09: el personal captura los datos sin contraseña; el titular la elige desde la invitación.
export type DatosAltaAsistida = Omit<SolicitudRegistro, 'contrasena'> & { motivo: string };
export type EstadoAlta = 'lista' | 'en_revision' | 'invitada' | 'descartada' | 'cancelada';
export interface ResultadoAlta {
    id: string; correo: string; estado: EstadoAlta; candidatos: string[]; invitacionEnviada: boolean;
}
export interface Candidato {
    id: string; nombres: string; primerApellido: string; segundoApellido: string | null;
    fechaNacimiento: string; telefono: string; correo: string; estatus: string;
}
export interface SolicitudAbierta {
    id: string; correo: string; estado: 'lista' | 'en_revision'; nombres: string; primerApellido: string;
    segundoApellido: string | null; fechaNacimiento: string; telefono: string; solicitadoEn: string;
    candidatos: Candidato[];
}

export const CAPACIDAD_ALTA_ASISTIDA = 'alta_asistida';

export function tieneCapacidad(acceso: AccesoCuenta, capacidad: string) {
    return acceso.roles.some(rol => rol.capacidades?.includes(capacidad))
        || acceso.permisosAdicionales.some(permiso => permiso.capacidad === capacidad);
}

// La BD vuelve a comprobar el permiso en cada operación; esto solo decide qué se muestra.
export async function puedeHacerAltaAsistida() {
    return tieneCapacidad(await consultarMiAcceso(), CAPACIDAD_ALTA_ASISTIDA);
}

async function pedirAlta<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data } = await (await obtenerSupabase()).auth.getSession();
    if (!data.session) throw new ErrorServicio('Inicia sesión con una cuenta del personal para continuar.', 401);
    return pedirApi<T>(`/cuentas/alta-asistida${ruta}`, { ...opciones,
        headers: { ...opciones.headers, Authorization: `Bearer ${data.session.access_token}` } });
}

export function prepararAlta(datos: DatosAltaAsistida) {
    return pedirAlta<ResultadoAlta>('', { method: 'POST', body: JSON.stringify(datos) });
}
export function listarSolicitudes() {
    return pedirAlta<SolicitudAbierta[]>('?limite=100');
}
export function resolverDuplicado(id: string, decision: 'persona_distinta' | 'misma_persona', motivo: string) {
    return pedirAlta<ResultadoAlta>(`/${id}/resolver`, { method: 'POST', body: JSON.stringify({ decision, motivo }) });
}
export function cancelarSolicitud(id: string, motivo: string) {
    return pedirAlta<ResultadoAlta>(`/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) });
}
export function reintentarInvitacion(id: string) {
    return pedirAlta<ResultadoAlta>(`/${id}/invitar`, { method: 'POST' });
}

import { ErrorServicio, obtenerSupabase, pedirApi } from '../../../servicios/api';

export type EstatusAsistencia = 'presente' | 'ausente';
export type MarcaNueva = { usuarioId: string; estatus: EstatusAsistencia };
export type DatosCorreccion = MarcaNueva & { version: number; motivo: string };

export type SesionAsistencia = {
    id: string;
    folio: string;
    nombre: string;
    espacio: string;
    inicio: string;
    estado: 'programada' | 'en_curso' | 'finalizada' | 'cancelada';
    cerrada: { quien: string; fecha: string } | null;
    inscritos: number;
    total: number;
    presentes: number;
    ausentes: number;
    sinMarcar: number;
};

export type PersonaAsistencia = {
    usuarioId: string;
    nombre: string;
    marca: EstatusAsistencia | null;
    version: number | null;
    confirmada: boolean;
    motivoAnterior: string | null;
};

export type ListaAsistencia = {
    sesion: SesionAsistencia;
    personas: PersonaAsistencia[];
    correcciones: {
        id: string;
        persona: string;
        anterior: EstatusAsistencia;
        nuevo: EstatusAsistencia;
        motivo: string;
        fecha: string;
        quien: string;
    }[];
};

async function consultar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio('Inicia sesión para continuar.', 401);
    return pedirApi<T>(ruta, { ...opciones, headers: { Authorization: `Bearer ${data.session.access_token}` } });
}

const rutaSesion = (id: string) => `/sesiones/${encodeURIComponent(id)}/asistencia`;
export const listarSesionesAsistencia = () => consultar<SesionAsistencia[]>('/responsable/asistencia/sesiones');
export const consultarListaAsistencia = (id: string) => consultar<ListaAsistencia>(rutaSesion(id));

export function guardarListaAsistencia(id: string, marcas: MarcaNueva[], cerrar: boolean) {
    return consultar<ListaAsistencia>(rutaSesion(id) + (cerrar ? '/cerrar' : ''), {
        method: cerrar ? 'POST' : 'PUT', body: JSON.stringify({ marcas }),
    });
}

export function guardarCorreccion(id: string, datos: DatosCorreccion) {
    return consultar<ListaAsistencia>(`${rutaSesion(id)}/correcciones`, {
        method: 'POST', body: JSON.stringify(datos),
    });
}

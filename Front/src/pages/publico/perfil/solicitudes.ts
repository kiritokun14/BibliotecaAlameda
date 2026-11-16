// Mis espacios y Mis propuestas: GET /mis-solicitudes (Back/solicitudes.py, ya existe).
// El backend devuelve solicitudes de espacio, de credencial y propuestas de la persona con sesión.
import { ErrorServicio, obtenerSupabase, pedirApi } from "../../../servicios/api";

export type EstadoRevision = "borrador" | "en_revision" | "requiere_correccion" | "aprobada" | "rechazada" | "cancelada";

export interface SolicitudEspacio {
    id: string; propositoVisita: string; cantidadPersonas: number;
    fechaInicioSolicitado: string; fechaFinSolicitado: string;
    estadoSolicitud: EstadoRevision; observaciones: string | null; creadaEn: string;
}
export interface PropuestaEvento {
    id: string; tituloPropuesta: string; descripcion: string; tipoPropuesta: string;
    estadoRevision: EstadoRevision; observacionesInstitucionales: string | null; creadaEn: string;
}
export interface SolicitudCredencialBack {
    id: string; tipoSolicitud: "obtencion" | "renovacion";
    estadoSolicitud: "recibida" | "en_atencion" | "cita_programada" | "atendida" | "rechazada" | "cancelada";
    fechaCita: string | null; observaciones: string | null; creadaEn: string;
}
export interface HistorialSolicitudes {
    solicitudes_espacio: SolicitudEspacio[];
    propuestas_eventos: PropuestaEvento[];
    solicitudes_credencial?: SolicitudCredencialBack[];
}

export async function consultarMisSolicitudes(): Promise<HistorialSolicitudes> {
    const { data, error } = await (await obtenerSupabase()).auth.getSession();
    if (error || !data.session) throw new ErrorServicio("Inicia sesión para consultar tus solicitudes.", 401);
    return pedirApi<HistorialSolicitudes>("/mis-solicitudes?limite=50", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
}

// ---------- Cómo se muestra cada estado (chips de Figma) ----------
export type ColorEstado = "dorado" | "guinda" | "gris" | "verde";
export type GrupoFiltro = "atencion" | "observaciones" | "borradores" | "canceladas" | "otras";

type Presentacion = { texto: string; color: ColorEstado; grupo: GrupoFiltro; accion: string | null };

export const estadoPropuesta: Record<EstadoRevision, Presentacion> = {
    en_revision: { texto: "En atención", color: "dorado", grupo: "atencion", accion: "Ver" },
    requiere_correccion: { texto: "Con observaciones", color: "guinda", grupo: "observaciones", accion: "Corregir" },
    borrador: { texto: "Borrador", color: "gris", grupo: "borradores", accion: "Continuar" },
    aprobada: { texto: "Aprobada", color: "verde", grupo: "otras", accion: null },
    rechazada: { texto: "No aprobada", color: "guinda", grupo: "otras", accion: "Ver" },
    cancelada: { texto: "Cancelada", color: "gris", grupo: "canceladas", accion: null },
};

export const estadoEspacio: Record<EstadoRevision, Presentacion> = {
    en_revision: { texto: "Pendiente de autorización", color: "dorado", grupo: "atencion", accion: "Ver" },
    requiere_correccion: { texto: "Cambio propuesto", color: "guinda", grupo: "observaciones", accion: "Responder" },
    borrador: { texto: "Borrador", color: "gris", grupo: "borradores", accion: "Continuar" },
    aprobada: { texto: "Aprobada", color: "verde", grupo: "otras", accion: "Ver" },
    rechazada: { texto: "No aprobada", color: "guinda", grupo: "otras", accion: "Ver" },
    cancelada: { texto: "Cancelada", color: "verde", grupo: "canceladas", accion: null },
};

export function contarPorGrupo<T>(lista: T[], grupo: (x: T) => GrupoFiltro) {
    const cuenta: Record<GrupoFiltro, number> = { atencion: 0, observaciones: 0, borradores: 0, canceladas: 0, otras: 0 };
    for (const x of lista) cuenta[grupo(x)]++;
    return cuenta;
}

// "2026-10-20T15:00:00Z" → "20 oct 2026"
const mesesCortos = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return fecha;
    return `${String(dia).padStart(2, "0")} ${mesesCortos[mes - 1]} ${anio}`;
}

// ---------- Ejemplos de Figma (solo para ?simular=sesion en desarrollo) ----------
export const historialEjemplo: HistorialSolicitudes = {
    propuestas_eventos: [
        { id: "p1", tituloPropuesta: "Taller de encuadernación (ejemplo)", descripcion: "", tipoPropuesta: "taller", estadoRevision: "en_revision", observacionesInstitucionales: null, creadaEn: "2026-10-10T12:00:00Z" },
        { id: "p2", tituloPropuesta: "Tertulia de poesía regional", descripcion: "", tipoPropuesta: "evento", estadoRevision: "requiere_correccion", observacionesInstitucionales: "Ajusta la fecha propuesta.", creadaEn: "2026-10-02T12:00:00Z" },
        { id: "p3", tituloPropuesta: "Cine-debate familiar", descripcion: "", tipoPropuesta: "evento", estadoRevision: "borrador", observacionesInstitucionales: null, creadaEn: "2026-09-28T12:00:00Z" },
        { id: "p5", tituloPropuesta: "Taller de fotografía (ejemplo)", descripcion: "", tipoPropuesta: "taller", estadoRevision: "rechazada", observacionesInstitucionales: null, creadaEn: "2026-09-20T12:00:00Z" },
        { id: "p4", tituloPropuesta: "Club de ajedrez", descripcion: "", tipoPropuesta: "club", estadoRevision: "aprobada", observacionesInstitucionales: null, creadaEn: "2026-09-15T12:00:00Z" },
    ],
    solicitudes_espacio: [
        { id: "e1", propositoVisita: "Sala de usos múltiples (ejemplo)", cantidadPersonas: 12, fechaInicioSolicitado: "2026-11-20T16:00:00Z", fechaFinSolicitado: "2026-11-20T18:00:00Z", estadoSolicitud: "en_revision", observaciones: null, creadaEn: "2026-10-20T12:00:00Z" },
        { id: "e2", propositoVisita: "Auditorio (ejemplo)", cantidadPersonas: 40, fechaInicioSolicitado: "2026-11-25T16:00:00Z", fechaFinSolicitado: "2026-11-25T19:00:00Z", estadoSolicitud: "requiere_correccion", observaciones: "Te proponemos otro horario.", creadaEn: "2026-10-12T12:00:00Z" },
        { id: "e4", propositoVisita: "Sala de proyección (ejemplo)", cantidadPersonas: 20, fechaInicioSolicitado: "2026-11-10T16:00:00Z", fechaFinSolicitado: "2026-11-10T18:00:00Z", estadoSolicitud: "rechazada", observaciones: null, creadaEn: "2026-10-05T12:00:00Z" },
        { id: "e3", propositoVisita: "Sala de lectura grupal (ejemplo)", cantidadPersonas: 6, fechaInicioSolicitado: "2026-10-05T16:00:00Z", fechaFinSolicitado: "2026-10-05T17:00:00Z", estadoSolicitud: "cancelada", observaciones: null, creadaEn: "2026-09-30T12:00:00Z" },
    ],
};

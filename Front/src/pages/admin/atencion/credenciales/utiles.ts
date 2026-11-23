// Atención › Solicitudes de credencial: ayudas que no son componentes (22 nov 2026, rediseño del perfil de Préstamos).
// Los datos son los reales del backend (servicios/tramites.ts); aquí solo hay textos, tonos y etapas.
import type { NombreIcono, TonoEstado } from "../../piezasPanel";
import { estadoTramite, type SolicitudAtencion } from "../../../../servicios/tramites";

export const RUTA_CREDENCIALES = "/admin/atencion/credenciales";
export const RUTA_COTEJO = "/admin/participantes/cotejo";
export const POR_PAGINA = 20; // el backend entrega de 20 en 20

export const TONO_CREDENCIAL: Record<string, TonoEstado> = {
    recibida: "guinda", en_atencion: "dorado", cita_programada: "dorado", atendida: "verde", rechazada: "gris", cancelada: "gris",
};

// Ícono de cada estado en las filas y en el historial
export const ICONO_ESTADO: Record<string, NombreIcono> = {
    recibida: "credencial", en_atencion: "revision", cita_programada: "calendario", atendida: "check", rechazada: "alerta", cancelada: "alerta",
};

export const fechaHora = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha");
export const fechaCorta = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "—");
// La cita se guarda en UTC; se muestra con la hora de Tepic
export const fechaCita = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mazatlan", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });
export const folioCorto = (id: string) => id.slice(0, 8).toUpperCase();
export const nombreDe = (s: SolicitudAtencion) => [s.perfil?.nombres, s.perfil?.primerApellido, s.perfil?.segundoApellido].filter(Boolean).join(" ") || "Sin nombre";
export const tramiteDe = (s: SolicitudAtencion) => (s.tipoSolicitud === "renovacion" ? "Renovación" : "Obtención");
export const pendiente = (s: SolicitudAtencion) => estadoTramite(s) === "recibida";
export const abierta = (s: SolicitudAtencion) => ["recibida", "en_atencion", "cita_programada"].includes(estadoTramite(s));

// Día y mes para el bloque de fecha de una fila
export function partesFecha(iso: string) {
    const f = new Date(iso);
    return [String(f.getDate()), f.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")] as const;
}

// «Hoy», «Ayer» o «Hace N días»: lo que lleva esperando una solicitud
export function antiguedad(iso: string, hoy = new Date()) {
    const dia = (f: Date) => new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
    const dias = Math.round((dia(hoy) - dia(new Date(iso))) / 86400000);
    return dias <= 0 ? "Llegó hoy" : dias === 1 ? "Llegó ayer" : `Hace ${dias} días`;
}

// Etapas del trámite (en fila, como en Actividades)
export const ETAPAS = [
    { id: "recibida", texto: "Recibida" },
    { id: "en_atencion", texto: "En atención" },
    { id: "cita_programada", texto: "Cita de cotejo" },
    { id: "atendida", texto: "Atendida" },
] as const;

// Qué sigue en cada estado (título de la tarjeta de decisión y su ayuda)
export const SIGUIENTE: Record<string, { titulo: string; texto: string }> = {
    recibida: { titulo: "Revisa la solicitud", texto: "Comprueba los datos y márcala en atención, o agenda de una vez la cita de cotejo." },
    en_atencion: { titulo: "Agenda la cita de cotejo", texto: "Acuerda con la persona el día para revisar sus documentos, o registra que ya se atendió." },
    cita_programada: { titulo: "Espera a la persona en su cita", texto: "Cuando acuda y revises sus documentos, registra la solicitud como atendida." },
    atendida: { titulo: "Trámite concluido", texto: "Se registró la atención. Esto no emite la credencial automáticamente." },
    rechazada: { titulo: "Solicitud rechazada", texto: "El trámite quedó cerrado. La persona ve el motivo en su perfil." },
    cancelada: { titulo: "Solicitud cancelada", texto: "El trámite quedó cerrado sin atenderse." },
};

// Decisiones posibles en cada estado (las mismas que acepta el backend)
export function decisionesDe(estado: string): string[] {
    if (estado === "recibida") return ["en_atencion", "cita_programada", "rechazada", "cancelada"];
    if (estado === "en_atencion") return ["cita_programada", "atendida", "rechazada", "cancelada"];
    if (estado === "cita_programada") return ["cita_programada", "atendida", "rechazada", "cancelada"];
    return [];
}
export const TEXTO_DECISION: Record<string, string> = {
    en_atencion: "Marcar en atención", cita_programada: "Agendar cita de cotejo", atendida: "Registrar como atendida", rechazada: "Rechazar la solicitud", cancelada: "Cancelar la solicitud",
};
export const negativa = (d: string) => d === "rechazada" || d === "cancelada";

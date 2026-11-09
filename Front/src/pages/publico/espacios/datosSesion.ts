// Agenda de espacios con sesión (Figma A-02, 476:28195).
// TODO backend: POST /espacios/solicitudes { areaId, fecha, horaInicio, horaFin, personas, motivo } → folio;
// POST /espacios/solicitudes/{id}/cancelacion { motivo, comentarios }. La lista ya sale de GET /mis-solicitudes.
// Mientras, las solicitudes nuevas viven solo en esta pestaña.
import { areas, type Area } from "./datos";

// Disponibilidad de ejemplo (Figma): los cubículos no están disponibles.
export const noDisponibles = new Set(["cubiculos-estudio"]);
export function disponibilidad(a: Area): "disponible" | "no-disponible" | "no-reservable" {
    if (!a.solicitable) return "no-reservable";
    return noDisponibles.has(a.id) ? "no-disponible" : "disponible";
}

export type SolicitudEspacio = {
    id: string; folio: string | null; areaId: string; fecha: string; horaInicio: string; horaFin: string;
    personas: number; motivo: string; estado: "en-revision" | "cancelada" | "no-aprobada"; titulo?: string;
};
export type DatosSolicitud = { fecha: string; horaInicio: string; horaFin: string; personas: string; motivo: string };
export type ErroresSolicitud = Partial<Record<keyof DatosSolicitud, string>>;

export function validarSolicitud(d: DatosSolicitud, hoy: string): ErroresSolicitud {
    const e: ErroresSolicitud = {};
    if (!d.fecha) e.fecha = "Elige la fecha.";
    else if (d.fecha < hoy) e.fecha = "Elige una fecha a partir de hoy.";
    if (!d.horaInicio) e.horaInicio = "Indica la hora de inicio.";
    if (!d.horaFin) e.horaFin = "Indica la hora de término.";
    else if (d.horaInicio && d.horaFin <= d.horaInicio) e.horaFin = "Debe ser después de la hora de inicio.";
    const n = Number(d.personas);
    if (!d.personas.trim() || !Number.isInteger(n) || n < 1) e.personas = "Escribe cuántas personas asistirán.";
    else if (n > 200) e.personas = "Escribe un número menor a 200.";
    if (!d.motivo.trim()) e.motivo = "Describe brevemente la actividad.";
    else if (d.motivo.trim().length > 300) e.motivo = "Usa 300 caracteres o menos.";
    return e;
}

let solicitudes: SolicitudEspacio[] = [
    // Ejemplo de Figma («Mi solicitud de espacio»).
    { id: "e1", folio: null, areaId: "area-actividades", fecha: "", horaInicio: "", horaFin: "", personas: 15, motivo: "Taller de lectura (ejemplo)", estado: "en-revision" },
    // «Solicitud de espacio no aprobada» (Figma 543:15939)
    { id: "e4", folio: "VS-2026-0230", areaId: "", titulo: "Sala de proyección (ejemplo)", fecha: "", horaInicio: "", horaFin: "", personas: 20, motivo: "", estado: "no-aprobada" },
];

export function enviarSolicitudEspacio(areaId: string, d: DatosSolicitud): SolicitudEspacio {
    const nueva: SolicitudEspacio = {
        id: `s-${Date.now()}`, folio: null, areaId, fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin,
        personas: Number(d.personas), motivo: d.motivo.trim(), estado: "en-revision",
    };
    solicitudes = [nueva, ...solicitudes];
    return nueva;
}
export const obtenerSolicitud = (id: string | undefined) => solicitudes.find((s) => s.id === id) ?? null;
export function cancelarSolicitudEspacio(id: string) {
    solicitudes = solicitudes.map((s) => (s.id === id ? { ...s, estado: "cancelada" } : s));
}
export const nombreArea = (id: string) => areas.find((a) => a.id === id)?.nombre ?? "Área por confirmar";

export const motivosCancelacion = ["Cambio de planes", "Ya no necesito el espacio", "Cambió el número de personas", "Otro motivo"];

// "2026-11-20" → "20/11/2026"
export const fechaCorta = (f: string) => (f ? f.split("-").reverse().join("/") : "Por confirmar");

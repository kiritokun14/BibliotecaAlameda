// Agenda de espacios con sesión (Figma A-02, 476:28195).
// Las solicitudes vienen del backend (servicios/espacios.ts → Back/espacios.py, T-076).
// HU-16: cualquier cuenta con sesión puede solicitar; no se pide credencial.
import type { EstadoSolicitudEspacio, TipoSolicitudEspacio } from "../../../servicios/espacios";

export type DatosSolicitud = {
    tipo: TipoSolicitudEspacio; fecha: string; horaInicio: string; horaFin: string; personas: string; motivo: string; institucion: string;
};
export type ErroresSolicitud = Partial<Record<keyof DatosSolicitud | "area", string>>;

export function validarSolicitud(d: DatosSolicitud, hoy: string, capacidad?: number | null): ErroresSolicitud {
    const e: ErroresSolicitud = {};
    if (!d.fecha) e.fecha = "Elige la fecha.";
    else if (d.fecha < hoy) e.fecha = "Elige una fecha a partir de hoy.";
    if (!d.horaInicio) e.horaInicio = "Indica la hora de inicio.";
    if (!d.horaFin) e.horaFin = "Indica la hora de término.";
    else if (d.horaInicio && d.horaFin <= d.horaInicio) e.horaFin = "Debe ser después de la hora de inicio.";
    const n = Number(d.personas);
    if (!d.personas.trim() || !Number.isInteger(n) || n < 1) e.personas = "Escribe cuántas personas asistirán.";
    else if (n > 200) e.personas = "Escribe un número menor a 200.";
    else if (capacidad && n > capacidad) e.personas = `El área admite hasta ${capacidad} personas.`;
    if (!d.motivo.trim()) e.motivo = "Describe brevemente la actividad.";
    else if (d.motivo.trim().length > 300) e.motivo = "Usa 300 caracteres o menos.";
    if (d.institucion.trim().length > 150) e.institucion = "Usa 150 caracteres o menos.";
    return e;
}

export const motivosCancelacion = ["Cambio de planes", "Ya no necesito el espacio", "Cambió el número de personas", "Otro motivo"];

// Cómo se nombra cada estado en las pantallas de la persona
export const nombreEstado: Record<EstadoSolicitudEspacio, string> = {
    en_revision: "En revisión",
    requiere_correccion: "Cambio propuesto",
    aprobada: "Aprobada",
    rechazada: "No aprobada",
    cancelada: "Cancelada",
};

// "2026-11-20" → "20/11/2026"
export const fechaCorta = (f: string) => (f ? f.split("-").reverse().join("/") : "Por confirmar");

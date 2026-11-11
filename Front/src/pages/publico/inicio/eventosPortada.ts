// Tarjeta de la portada de Inicio: muestra, una tras otra, las próximas actividades publicadas.
// Los datos salen de la agenda pública real (GET /actividades/publicas), igual que la sección «Actividades».
import type { ActividadPublica } from "../../../servicios/actividades";
import { fechaTexto } from "../eventos/datosAgenda";
import type { TipoActividad } from "./datos";

export type EventoPortada = {
    id: string;
    tipo: TipoActividad;
    titulo: string;
    cuando: string; // «Sáb 14 nov · 11:00 h»
};

// Cada cuánto cambia la tarjeta (milisegundos)
export const INTERVALO_PORTADA = 6000;

// Mismo criterio que la sección «Actividades» de Inicio
export function tipoPortada(tipo: string): TipoActividad {
    if (tipo === "Taller") return "Taller";
    if (["Presentación", "Exposición"].includes(tipo)) return "Agenda cultural";
    return "Actividad";
}

// Solo las actividades con una fecha de hoy en adelante, de la más próxima a la más lejana
export function eventosPortada(actividades: ActividadPublica[], hoy: string): EventoPortada[] {
    return actividades
        .map((a) => {
            const sesion = a.sesiones.find((s) => s.fecha >= hoy);
            const fecha = sesion?.fecha ?? a.fecha;
            const inicio = (sesion?.inicio ?? a.inicio ?? "").slice(0, 5);
            return { a, fecha, inicio };
        })
        .filter(({ fecha }) => Boolean(fecha) && fecha >= hoy)
        .sort((x, y) => x.fecha.localeCompare(y.fecha) || x.inicio.localeCompare(y.inicio))
        .map(({ a, fecha, inicio }) => ({
            id: a.folio,
            tipo: tipoPortada(a.tipo),
            titulo: a.nombre,
            cuando: inicio ? `${fechaTexto(fecha)} · ${inicio} h` : fechaTexto(fecha),
        }));
}

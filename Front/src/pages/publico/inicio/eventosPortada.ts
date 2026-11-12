// Tarjeta de la portada de Inicio: muestra, una tras otra, las próximas actividades publicadas.
// Los datos salen de la agenda pública real (GET /actividades/publicas), igual que la sección «Actividades».
import type { ActividadPublica } from "../../../servicios/actividades";
import { fechaTexto } from "../eventos/datosAgenda";
import type { TipoActividad } from "./datos";
import fotoTaller from "../../../assets/comun/fotos/noticia-3.jpg";
import fotoCultural from "../../../assets/comun/fotos/noticia-1.jpg";
import fotoActividad from "../../../assets/comun/fotos/noticia-2.jpg";

export type EventoPortada = {
    id: string;
    tipo: TipoActividad;
    titulo: string;
    cuando: string; // «Sáb 14 nov · 11:00 h»
    imagen: string;
};

// TODO backend: las actividades todavía no tienen imagen propia (no hay campo en /actividades/publicas).
// Mientras, cada tipo usa una imagen ilustrativa; cuando exista el campo, se usa el de la actividad.
export const IMAGEN_TIPO: Record<TipoActividad, string> = {
    Taller: fotoTaller,
    "Agenda cultural": fotoCultural,
    Actividad: fotoActividad,
};

// Cada cuánto cambia la tarjeta (milisegundos)
export const INTERVALO_PORTADA = 6000;

// Mismo criterio que la sección «Actividades» de Inicio
export function tipoPortada(tipo: string): TipoActividad {
    if (tipo === "Taller") return "Taller";
    if (["Presentación", "Exposición"].includes(tipo)) return "Agenda cultural";
    return "Actividad";
}

const FOTOS = [fotoTaller, fotoActividad, fotoCultural];

// Cada evento usa la foto de su tipo, salvo que sea la misma del evento anterior (o, para el último, la del primero,
// porque la portada vuelve a empezar): entonces toma otra, para que la foto cambie siempre junto con la tarjeta.
export function repartirImagenes(eventos: EventoPortada[]): EventoPortada[] {
    const usadas: string[] = [];
    return eventos.map((evento, i) => {
        const evitar = [usadas[i - 1], i === eventos.length - 1 && i > 1 ? usadas[0] : undefined];
        const opciones = [evento.imagen, ...FOTOS];
        const imagen = opciones.find((f) => !evitar.includes(f)) ?? evento.imagen;
        usadas.push(imagen);
        return { ...evento, imagen };
    });
}

// Solo las actividades con una fecha de hoy en adelante, de la más próxima a la más lejana
export function eventosPortada(actividades: ActividadPublica[], hoy: string): EventoPortada[] {
    return repartirImagenes(actividades
        .map((a) => {
            const sesion = a.sesiones.find((s) => s.fecha >= hoy);
            const fecha = sesion?.fecha ?? a.fecha;
            const inicio = (sesion?.inicio ?? a.inicio ?? "").slice(0, 5);
            return { a, fecha, inicio };
        })
        .filter(({ fecha }) => Boolean(fecha) && fecha >= hoy)
        .sort((x, y) => x.fecha.localeCompare(y.fecha) || x.inicio.localeCompare(y.inicio))
        .map(({ a, fecha, inicio }) => {
            const tipo = tipoPortada(a.tipo);
            return {
                id: a.folio,
                tipo,
                titulo: a.nombre,
                cuando: inicio ? `${fechaTexto(fecha)} · ${inicio} h` : fechaTexto(fecha),
                imagen: IMAGEN_TIPO[tipo],
            };
        }));
}

import { pedirApi } from "../../servicios/api";

// ---------- Tipos ----------

export type Fuente = {
    titulo: string; // nombre del contenido publicado que respalda la respuesta
    ruta?: string; // página del portal donde se puede consultar
    id?: string;
    tipoFuente?: string;
    version?: number;
};

export type ActividadCitada = {
    dia: string; // "14"
    mes: string; // "NOV"
    titulo: string;
    detalle: string; // "10:00 a 12:00 · Sala de talleres"
};

export type RespuestaAsistente =
    // Respuesta con información publicada (breve o extensa), siempre con sus fuentes
    | { tipo: "respuesta"; parrafos: string[]; actividades?: ActividadCitada[]; cierre?: string; fuentes: Fuente[] }
    // La consulta requiere información adicional o atención del personal.
    | { tipo: "insuficiente" | "privada"; contacto?: "/contacto" }
    // La consulta se envió al personal de la biblioteca
    | { tipo: "enviada"; folio: string | null };

export type MensajeHistorial = { autor: "persona" | "asistente"; texto: string };

export async function consultarAsistente(pregunta: string, historial: MensajeHistorial[] = []): Promise<RespuestaAsistente> {
    if (import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("simular") === "error") {
        throw new Error("El asistente no está disponible");
    }
    return pedirApi<RespuestaAsistente>("/asistente/consultas", {
        method: "POST",
        body: JSON.stringify({ pregunta, historial: historial.slice(-6) }),
    });
}

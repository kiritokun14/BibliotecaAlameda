// Asistente de la biblioteca (RAG), versión visitante sin cuenta.
// El frontend NUNCA llama a un modelo ni guarda claves: todo pasa por la API del backend (/api).
// Mientras backend no tenga el RAG, responde con la información que el portal ya publica (temas.ts) y la agenda
// pública real; backend sustituye consultarAsistente() y enviarAlPersonal().
import { cargarAgendaPublica } from "../../servicios/agendaPublica";
import { PRIVADA, elegirTema, normalizar } from "./temas";

export { normalizar };

// ---------- Tipos ----------

export type Fuente = {
    titulo: string; // nombre del contenido publicado que respalda la respuesta
    ruta?: string; // página del portal donde se puede consultar
};

export type ActividadCitada = {
    dia: string; // "14"
    mes: string; // "NOV"
    titulo: string;
    detalle: string; // "10:00 a 12:00 · Sala de talleres"
};

export type RespuestaAsistente =
    // Respuesta con información publicada (breve o extensa), siempre con sus fuentes
    // `tema` dice de qué trata (para completar con datos reales) y `siguientes` son preguntas para seguir
    | { tipo: "respuesta"; parrafos: string[]; actividades?: ActividadCitada[]; cierre?: string; fuentes: Fuente[]; tema?: string; siguientes?: string[] }
    // No hay información suficiente: se ofrece reformular o enviar la consulta al personal
    | { tipo: "insuficiente" }
    // Pide datos personales de otra persona: se rechaza
    | { tipo: "privada" }
    // La consulta se envió al personal de la biblioteca
    | { tipo: "enviada"; folio: string | null };

export type MensajeHistorial = { autor: "persona" | "asistente"; texto: string };

// ---------- Respuesta con lo publicado (mientras backend no exista) ----------

// Decide qué responder con la información publicada en el portal. No inventa: si ningún tema coincide, lo dice.
export function respuestaSimulada(pregunta: string): RespuestaAsistente {
    if (PRIVADA.test(normalizar(pregunta))) return { tipo: "privada" };
    const tema = elegirTema(pregunta);
    return tema ? { ...tema.respuesta(), tema: tema.id } : { tipo: "insuficiente" };
}

// Las próximas 4 sesiones (no canceladas) de la agenda pública real, en los próximos 30 días
const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const fechaTepic = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" });
export async function proximasActividades(hoy = new Date()): Promise<ActividadCitada[]> {
    const hasta = new Date(hoy); hasta.setDate(hasta.getDate() + 30);
    const sesiones = await cargarAgendaPublica(fechaTepic(hoy), fechaTepic(hasta));
    return sesiones.filter((s) => !s.cancelada).slice(0, 4).map((s) => {
        const [, mes, dia] = s.fecha.split("-");
        return { dia: String(Number(dia)), mes: MESES[Number(mes) - 1] ?? "", titulo: s.titulo, detalle: [s.horario, s.lugar].filter(Boolean).join(" · ") };
    });
}

// Completa la respuesta de actividades con la agenda real; si no hay o no responde, lo dice sin inventar
async function conDatosReales(respuesta: RespuestaAsistente): Promise<RespuestaAsistente> {
    if (respuesta.tipo !== "respuesta" || respuesta.tema !== "actividades") return respuesta;
    try {
        const actividades = await proximasActividades();
        if (actividades.length) return { ...respuesta, actividades };
        return { ...respuesta, parrafos: ["Por ahora no hay actividades publicadas para los próximos 30 días."], cierre: "Revisa Eventos y actividades más adelante: ahí se publican en cuanto se confirman." };
    } catch {
        return { ...respuesta, parrafos: ["No pude consultar la agenda en este momento."], cierre: "Puedes verla directamente en Eventos y actividades." };
    }
}

// Para revisar el error sin backend: ?simular=error (solo en desarrollo)
function simulacion(): string | null {
    if (!import.meta.env.DEV) return null;
    return new URLSearchParams(window.location.search).get("simular");
}

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// ---------- Servicio (lo que backend debe sustituir) ----------

// TODO backend: POST /api/asistente/consultas con { pregunta, historial }.
// El backend busca en el contenido PUBLICADO (RAG), llama al modelo y responde un RespuestaAsistente
// con sus fuentes. Si la pregunta pide datos personales de otra persona debe responder { tipo: "privada" };
// si no encuentra información suficiente, { tipo: "insuficiente" }. Un error de red o del modelo → excepción.
// Cuando exista: return pedirApi<RespuestaAsistente>("/asistente/consultas", { method: "POST", body: JSON.stringify({ pregunta, historial }) });
export async function consultarAsistente(pregunta: string, historial: MensajeHistorial[] = []): Promise<RespuestaAsistente> {
    void historial; // el backend lo usará para entender preguntas de seguimiento
    const [respuesta] = await Promise.all([conDatosReales(respuestaSimulada(pregunta)), espera(700)]);
    if (simulacion() === "error") throw new Error("El asistente no está disponible");
    return respuesta;
}

// TODO backend: POST /api/asistente/derivaciones con la conversación. Debe crear la consulta para el
// personal y responder { folio }. Pendiente de definir: cómo se contacta a un visitante sin cuenta
// (por ejemplo, pidiéndole un correo antes de enviarla).
export async function enviarAlPersonal(historial: MensajeHistorial[]): Promise<{ folio: string | null }> {
    void historial;
    await espera(900);
    if (simulacion() === "error") throw new Error("No se pudo enviar la consulta");
    return { folio: null }; // "Folio por asignar"
}

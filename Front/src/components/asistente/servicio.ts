// Asistente de la biblioteca (RAG), versión visitante sin cuenta.
// El frontend NUNCA llama a un modelo ni guarda claves: todo pasa por la API del backend (/api).
// Por ahora las respuestas son simuladas; backend sustituye consultarAsistente() y enviarAlPersonal().

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
    | { tipo: "respuesta"; parrafos: string[]; actividades?: ActividadCitada[]; cierre?: string; fuentes: Fuente[] }
    // No hay información suficiente: se ofrece reformular o enviar la consulta al personal
    | { tipo: "insuficiente" }
    // Pide datos personales de otra persona: se rechaza
    | { tipo: "privada" }
    // La consulta se envió al personal de la biblioteca
    | { tipo: "enviada"; folio: string | null };

export type MensajeHistorial = { autor: "persona" | "asistente"; texto: string };

// ---------- Simulación (solo mientras backend no exista) ----------

export function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const RESPUESTAS = {
    horario: {
        tipo: "respuesta",
        parrafos: ["La biblioteca abre de lunes a viernes de 8:00 a 19:30 h y los sábados de 9:00 a 14:00 h. Los domingos y días festivos permanece cerrada."],
        fuentes: [{ titulo: "Contacto y ubicación", ruta: "/contacto" }],
    },
    credencial: {
        tipo: "respuesta",
        parrafos: ["Puedes solicitarla desde el portal. El personal revisa tus datos y después acudes a Préstamos para el cotejo presencial."],
        fuentes: [{ titulo: "Credencial de la biblioteca", ruta: "/credencial" }],
    },
    actividades: {
        tipo: "respuesta",
        parrafos: ["Estas son las próximas actividades publicadas en el portal (datos de ejemplo):"],
        actividades: [
            { dia: "14", mes: "NOV", titulo: "Taller de escritura creativa", detalle: "10:00 a 12:00 · Sala de talleres" },
            { dia: "14", mes: "NOV", titulo: "Círculo de lectura", detalle: "12:00 a 13:30 · Sala de lectura" },
            { dia: "18", mes: "NOV", titulo: "Visita guiada para grupos", detalle: "11:00 a 12:00 · Entrada principal" },
            { dia: "20", mes: "NOV", titulo: "Tarde de cuentacuentos", detalle: "17:00 a 18:00 · Parque Alameda" },
        ],
        cierre: "Cada actividad tiene su detalle e inscripción en Eventos y actividades.",
        fuentes: [
            { titulo: "Eventos y actividades", ruta: "/eventos" },
            { titulo: "Actividades y talleres", ruta: "/servicios" },
        ],
    },
} satisfies Record<string, RespuestaAsistente>;

// Decide qué respuesta de ejemplo corresponde. Es solo la simulación: el RAG real lo hará backend.
export function respuestaSimulada(pregunta: string): RespuestaAsistente {
    const texto = normalizar(pregunta);
    // Datos personales de otras personas: nunca se responden
    if (/(otra persona|otro usuario|otra usuaria|de alguien|prestados? (a|de) |tiene prestad|datos de )/.test(texto)) {
        return { tipo: "privada" };
    }
    if (/(horario|hora|abren|abre|cierran|cierra)/.test(texto)) return RESPUESTAS.horario;
    if (/(credencial|tramit|tarjeta)/.test(texto)) return RESPUESTAS.credencial;
    if (/(actividad|evento|taller|agenda)/.test(texto)) return RESPUESTAS.actividades;
    return { tipo: "insuficiente" };
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
    await espera(1400);
    if (simulacion() === "error") throw new Error("El asistente no está disponible");
    return respuestaSimulada(pregunta);
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

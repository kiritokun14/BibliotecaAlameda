// Solicitud de un espacio con sesión (Back/espacios.py, T-076). HU-16: cualquier cuenta con sesión puede solicitar.
import type { EstadoSolicitudEspacio, SolicitudEspacioApi, TipoSolicitudEspacio } from "../../../servicios/espacios";
import type { Etapa } from "../credencial/datos";
import type { PasoRuta } from "../credencial/piezas";

export type DatosSolicitud = {
    tipo: TipoSolicitudEspacio; fecha: string; horaInicio: string; horaFin: string; personas: string; motivo: string; institucion: string;
};
export type ErroresSolicitud = Partial<Record<keyof DatosSolicitud | "area", string>>;

// Horario de la biblioteca: los eventos solo pueden ser de lunes a viernes, de 8:00 a 19:30 h (Aldahir, 20 nov 2026).
// TODO backend: validar lo mismo en POST /espacios/solicitudes (PARA_BACKEND.md, punto 7).
export const HORARIO = { abre: "08:00", cierra: "19:30", texto: "Lunes a viernes, de 8:00 a 19:30 h" };
// "2026-11-21" → 6 (sábado). 0 = domingo.
const diaSemana = (fecha: string) => { const [a, m, d] = fecha.split("-").map(Number); return new Date(a, m - 1, d).getDay(); };
export const esDiaHabil = (fecha: string) => { const d = diaSemana(fecha); return d >= 1 && d <= 5; };

export function validarSolicitud(d: DatosSolicitud, hoy: string, capacidad?: number | null): ErroresSolicitud {
    const e: ErroresSolicitud = {};
    if (!d.fecha) e.fecha = "Elige la fecha.";
    else if (d.fecha < hoy) e.fecha = "Elige una fecha a partir de hoy.";
    else if (!esDiaHabil(d.fecha)) e.fecha = "La biblioteca abre de lunes a viernes; elige otro día.";
    if (!d.horaInicio) e.horaInicio = "Indica la hora de inicio.";
    else if (d.horaInicio < HORARIO.abre) e.horaInicio = "La biblioteca abre a las 8:00.";
    else if (d.horaInicio >= HORARIO.cierra) e.horaInicio = "La biblioteca cierra a las 19:30.";
    if (!d.horaFin) e.horaFin = "Indica la hora de término.";
    else if (d.horaInicio && d.horaFin <= d.horaInicio) e.horaFin = "Debe ser después de la hora de inicio.";
    else if (d.horaFin > HORARIO.cierra) e.horaFin = "Debe terminar a más tardar a las 19:30.";
    const n = Number(d.personas);
    if (!d.personas.trim() || !Number.isInteger(n) || n < 1) e.personas = "Escribe cuántas personas asistirán.";
    else if (n > 200) e.personas = "Escribe un número menor a 200.";
    else if (capacidad && n > capacidad) e.personas = `El espacio admite hasta ${capacidad} personas.`;
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

// En proceso = todavía la atiende el personal o espera tu respuesta: entrar a Espacios lleva a su seguimiento
export const estaEnProceso = (s: Pick<SolicitudEspacioApi, "estado">) => s.estado === "en_revision" || s.estado === "requiere_correccion";

// Qué dice el seguimiento en cada estado (chip, título y texto)
export const textosEstado: Record<EstadoSolicitudEspacio, { color: "dorado" | "guinda" | "verde" | "gris"; titulo: string; texto: string }> = {
    en_revision: { color: "dorado", titulo: "Tu solicitud está en revisión", texto: "El personal revisa la agenda de la biblioteca. Te avisaremos en tus notificaciones cuando tenga respuesta." },
    requiere_correccion: { color: "guinda", titulo: "La biblioteca te propone un cambio", texto: "El espacio o el horario que pediste no está libre. Revisa la propuesta y dinos si te funciona." },
    aprobada: { color: "verde", titulo: "Tu espacio quedó apartado", texto: "La biblioteca aprobó tu solicitud. Te esperamos el día de tu actividad." },
    rechazada: { color: "guinda", titulo: "No pudimos aprobar tu solicitud", texto: "Revisa el motivo del personal. Puedes pedir otro espacio u otra fecha cuando quieras." },
    cancelada: { color: "gris", titulo: "Esta solicitud se canceló", texto: "El espacio quedó libre para otras solicitudes. Puedes pedir otro cuando quieras." },
};

// Los cuatro pasos de la solicitud de un espacio (ruta «Cómo avanza tu solicitud») y en cuál va
export const pasosSolicitudEspacio: PasoRuta[] = [
    { titulo: "Solicitud en línea", texto: "Eliges el espacio, la fecha y el horario.", quien: "Tú" },
    { titulo: "Revisión de la agenda", texto: "El personal revisa que el espacio esté libre.", quien: "Biblioteca" },
    { titulo: "Respuesta", texto: "Te aprueba la solicitud o te propone un cambio.", quien: "Biblioteca" },
    { titulo: "Tu actividad", texto: "Llegas el día acordado al espacio apartado.", quien: "Tú" },
];
export function etapasEspacio(estado: EstadoSolicitudEspacio): Etapa[] {
    // Cancelada: solo el primer paso quedó hecho. No aprobada: hubo respuesta, pero no habrá actividad.
    const actual = { en_revision: 1, requiere_correccion: 2, aprobada: 3, rechazada: 3, cancelada: 1 }[estado];
    return pasosSolicitudEspacio.map((p, i) => ({
        titulo: p.titulo, texto: p.texto,
        estado: estado === "cancelada" ? (i === 0 ? "hecho" : "pendiente")
            : estado === "rechazada" ? (i < 3 ? "hecho" : "pendiente")
            : i < actual ? "hecho" : i === actual ? "actual" : "pendiente",
    }));
}

// "2026-11-20" → "20 nov 2026"
const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(f: string) {
    if (!f) return "Por confirmar";
    const [a, m, d] = f.split("-").map(Number);
    return a && m && d ? `${String(d).padStart(2, "0")} ${meses[m - 1]} ${a}` : f;
}

// ---------- La solicitud en proceso de esta persona (bug del 20 nov: al volver a Espacios se quedaba en el paso 1) ----------
// Se recuerda en esta pestaña en cuanto se envía o se abre su seguimiento, para llevar a ella sin esperar al servidor;
// si no hay nada recordado, Espacios pregunta al servidor (GET /espacios/solicitudes) antes de mostrar el mapa.
const CLAVE_EN_PROCESO = "biblioteca-espacio-en-proceso";
export function folioEnProceso(): string | null {
    try { return sessionStorage.getItem(CLAVE_EN_PROCESO); } catch { return null; }
}
export function recordarSolicitud(s: Pick<SolicitudEspacioApi, "folio" | "estado">) {
    try {
        if (estaEnProceso(s)) sessionStorage.setItem(CLAVE_EN_PROCESO, s.folio);
        else if (sessionStorage.getItem(CLAVE_EN_PROCESO) === s.folio) sessionStorage.removeItem(CLAVE_EN_PROCESO);
    } catch { /* sin almacenamiento: se pregunta al servidor */ }
}
export function olvidarSolicitud(folio: string) {
    try { if (sessionStorage.getItem(CLAVE_EN_PROCESO) === folio) sessionStorage.removeItem(CLAVE_EN_PROCESO); } catch { /* nada que olvidar */ }
}

// ---------- Sesión de ejemplo (?simular=sesion): la solicitud vive en memoria mientras la página esté abierta ----------
let simulada: SolicitudEspacioApi | null = null;
export const solicitudSimulada = () => simulada;
export function guardarSimulada(d: DatosSolicitud, espacio: { slug: string; nombre: string }): SolicitudEspacioApi {
    const ahora = new Date().toISOString();
    simulada = {
        folio: "SE-0001", tipo: d.tipo, estado: "en_revision", espacio,
        inicio: `${d.fecha}T${d.horaInicio}:00-07:00`, fin: `${d.fecha}T${d.horaFin}:00-07:00`,
        personas: Number(d.personas), motivo: d.motivo.trim(), institucion: d.institucion.trim() || null, observaciones: null,
        acuerdo: null, propuesta: null, creadaEn: ahora, actualizadoEn: ahora, resueltaEn: null, canceladaEn: null, motivoCancelacion: null,
        historial: [{ accion: "enviar", nota: null, fecha: ahora, porPersonal: false }],
    };
    return simulada;
}
export function cancelarSimulada(motivo: string): SolicitudEspacioApi | null {
    if (simulada) simulada = { ...simulada, estado: "cancelada", canceladaEn: new Date().toISOString(), motivoCancelacion: motivo || null };
    return simulada;
}

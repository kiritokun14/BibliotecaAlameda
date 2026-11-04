// Moderación del foro: publicaciones reportadas, normas y personas silenciadas (datos de ejemplo).
// TODO backend: GET /api/admin/foro/publicaciones, GET /api/admin/foro/normas, GET /api/admin/foro/silencios,
// POST /api/admin/foro/publicaciones/{folio}/decision { tipo, norma, mensaje } y POST /api/admin/foro/silencios/{persona}/restaurar.
import { useSyncExternalStore } from "react";

export type EstadoPublicacion = "reportada" | "pendiente" | "aprobada" | "retirada";
export const NOMBRE_ESTADO_PUBLICACION: Record<EstadoPublicacion, string> = {
    reportada: "Reportada",
    pendiente: "Pendiente",
    aprobada: "Aprobada",
    retirada: "Retirada",
};

export type TipoDecision = "aprobada" | "retirada" | "advertencia" | "silenciada";

export type Decision = { tipo: TipoDecision; norma?: number; mensaje?: string; quien: string; fecha: string };

export type Publicacion = {
    folio: string;
    hilo: string;
    texto: string;
    autor: string;
    fecha: string; // AAAA-MM-DDTHH:MM
    reportes: number;
    motivo: string;
    estado: EstadoPublicacion;
    decisiones: Decision[];
};

export type Norma = { numero: number; nombre: string; descripcion: string; sancion: string };

export type Silencio = { id: string; persona: string; motivo: string; hasta: string; por: string };

export const QUIEN_MODERA = "Personal (ejemplo)";

export const NORMAS: Norma[] = [
    { numero: 1, nombre: "Tema del foro", descripcion: "Publicar sobre libros, lectura y actividades.", sancion: "Retirar" },
    { numero: 2, nombre: "Respeto entre participantes", descripcion: "Sin insultos, acoso ni discriminación.", sancion: "Advertir o silenciar" },
    { numero: 3, nombre: "Sin publicidad", descripcion: "No vender ni promocionar sin autorización.", sancion: "Retirar" },
    { numero: 4, nombre: "Privacidad", descripcion: "No compartir datos personales de otras personas.", sancion: "Retirar y advertir" },
];

export const nombreNorma = (n: number | undefined) => NORMAS.find((x) => x.numero === n)?.nombre ?? "—";

export const DURACIONES = [
    { dias: 1, texto: "1 día" },
    { dias: 3, texto: "3 días" },
    { dias: 7, texto: "7 días" },
    { dias: 30, texto: "30 días" },
];

const HILO_RESENA = "Reseña: Cuentos de la Alameda";
const retiro = (norma: number, fecha: string): Decision => ({ tipo: "retirada", norma, quien: QUIEN_MODERA, fecha });
const aprobo = (fecha: string): Decision => ({ tipo: "aprobada", quien: QUIEN_MODERA, fecha });

const publicacionesIniciales: Publicacion[] = [
    { folio: "FO-0233", hilo: HILO_RESENA, texto: "Este libro me pareció muy aburrido y el autor no sabe escribir (texto de ejemplo con lenguaje ofensivo).", autor: "Persona usuaria A (ejemplo)", fecha: "2026-10-26T18:20", reportes: 3, motivo: "Lenguaje ofensivo", estado: "reportada", decisiones: [] },
    { folio: "FO-0232", hilo: "Intercambio de libros", texto: "Vendo mis libros usados, escríbanme al número que dejo en mi perfil (texto de ejemplo).", autor: "Persona usuaria B (ejemplo)", fecha: "2026-10-26T16:05", reportes: 2, motivo: "Publicidad", estado: "reportada", decisiones: [] },
    { folio: "FO-0231", hilo: "Recomendaciones", texto: "¿Alguien recomienda lecturas de misterio?", autor: "Persona usuaria C (ejemplo)", fecha: "2026-10-26T12:40", reportes: 0, motivo: "Primera publicación", estado: "pendiente", decisiones: [] },
    { folio: "FO-0230", hilo: "Taller de escritura", texto: "Gracias por el taller del sábado.", autor: "Persona usuaria D (ejemplo)", fecha: "2026-10-26T10:15", reportes: 0, motivo: "—", estado: "aprobada", decisiones: [aprobo("2026-10-26")] },
    { folio: "FO-0229", hilo: "Recomendaciones", texto: "Les comparto el teléfono de otra persona para que le pregunten (texto de ejemplo).", autor: "Persona usuaria F (ejemplo)", fecha: "2026-10-25T20:30", reportes: 1, motivo: "Datos personales", estado: "reportada", decisiones: [] },
    { folio: "FO-0228", hilo: "Taller de escritura", texto: "Nadie entiende nada en ese taller (texto de ejemplo con lenguaje ofensivo).", autor: "Persona usuaria G (ejemplo)", fecha: "2026-10-25T17:50", reportes: 2, motivo: "Lenguaje ofensivo", estado: "reportada", decisiones: [] },
    { folio: "FO-0227", hilo: "Partidos de futbol", texto: "¿Vieron el partido de ayer? (texto de ejemplo fuera de tema).", autor: "Persona usuaria I (ejemplo)", fecha: "2026-10-25T14:10", reportes: 1, motivo: "Fuera de tema", estado: "reportada", decisiones: [] },
    { folio: "FO-0226", hilo: "Club de lectura", texto: "Hola, es mi primera vez en el club. ¿Qué libro leen este mes?", autor: "Persona usuaria J (ejemplo)", fecha: "2026-10-25T11:00", reportes: 0, motivo: "Primera publicación", estado: "pendiente", decisiones: [] },
    { folio: "FO-0225", hilo: "Club de lectura", texto: "Me gustaría proponer una lectura de poesía para noviembre.", autor: "Persona usuaria K (ejemplo)", fecha: "2026-10-24T19:25", reportes: 0, motivo: "Primera publicación", estado: "pendiente", decisiones: [] },
    { folio: "FO-0224", hilo: "Intercambio de libros", texto: "Visita mi tienda en línea con descuentos (texto de ejemplo).", autor: "Persona usuaria H (ejemplo)", fecha: "2026-10-24T09:30", reportes: 4, motivo: "Publicidad", estado: "retirada", decisiones: [retiro(3, "2026-10-24")] },
    { folio: "FO-0223", hilo: HILO_RESENA, texto: "Me encantó la reseña, gracias.", autor: "Persona usuaria D (ejemplo)", fecha: "2026-10-26T18:02", reportes: 0, motivo: "—", estado: "aprobada", decisiones: [aprobo("2026-10-26")] },
    { folio: "FO-0222", hilo: HILO_RESENA, texto: "Yo opino distinto, ¡léanlo!", autor: "Persona usuaria E (ejemplo)", fecha: "2026-10-26T19:10", reportes: 0, motivo: "—", estado: "aprobada", decisiones: [aprobo("2026-10-26")] },
    { folio: "FO-0221", hilo: "Recomendaciones", texto: "Comparto la dirección de mi vecino que presta libros (texto de ejemplo).", autor: "Persona usuaria A (ejemplo)", fecha: "2026-10-20T13:00", reportes: 2, motivo: "Datos personales", estado: "retirada", decisiones: [retiro(4, "2026-10-20")] },
];

const silenciosIniciales: Silencio[] = [
    { id: "SI-0012", persona: "Persona usuaria H (ejemplo)", motivo: "Publicidad reiterada", hasta: "2026-11-30", por: QUIEN_MODERA },
];

let publicaciones = publicacionesIniciales;
let silencios = silenciosIniciales;
let estadoForo = { publicaciones, silencios };
const oyentes = new Set<() => void>();
const avisar = () => {
    estadoForo = { publicaciones, silencios };
    oyentes.forEach((o) => o());
};

export function useForo() {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => estadoForo,
    );
}

export function reiniciarForo() {
    publicaciones = publicacionesIniciales;
    silencios = silenciosIniciales;
    avisar();
}

export const obtenerPublicacion = (folio: string | undefined) => publicaciones.find((p) => p.folio === folio);
export const obtenerSilencio = (id: string | undefined) => silencios.find((s) => s.id === id);
export const silencioDe = (persona: string) => silencios.find((s) => s.persona === persona);
export const hiloDe = (p: Publicacion) => publicaciones.filter((x) => x.hilo === p.hilo).sort((a, b) => a.fecha.localeCompare(b.fecha));

// Norma que probablemente se incumplió, según el motivo del reporte
export function normaProbable(p: Publicacion): number | undefined {
    return ({ "Lenguaje ofensivo": 2, Publicidad: 3, "Datos personales": 4, "Fuera de tema": 1 } as Record<string, number>)[p.motivo];
}

// «1 retiro previo · sin silencios»
export function historialDe(persona: string, sinFolio?: string) {
    const retiros = publicaciones.filter((p) => p.autor === persona && p.folio !== sinFolio && p.estado === "retirada").length;
    const s = silencioDe(persona);
    return {
        retiros,
        texto: `${retiros === 0 ? "Sin retiros previos" : retiros === 1 ? "1 retiro previo" : `${retiros} retiros previos`} · ${s ? "silenciada" : "sin silencios"}`,
    };
}

export const hoy = () => new Date().toISOString().slice(0, 10);

// ---------- Filtros ----------
export type FiltroForo = "reportadas" | "pendientes" | "aprobadas" | "retiradas";
const ESTADO_DE_FILTRO: Record<FiltroForo, EstadoPublicacion> = { reportadas: "reportada", pendientes: "pendiente", aprobadas: "aprobada", retiradas: "retirada" };
export const enFiltroForo = (p: Publicacion, f: FiltroForo) => p.estado === ESTADO_DE_FILTRO[f];

export function buscarPublicacion(p: Publicacion, texto: string) {
    const t = texto.trim().toLowerCase();
    return !t || p.texto.toLowerCase().includes(t) || p.autor.toLowerCase().includes(t) || p.folio.toLowerCase().includes(t);
}

// ---------- Acciones ----------
function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// Todas las decisiones pasan por aquí. En desarrollo, ?simular=error-decision las hace fallar.
async function guardar(cambio: () => void) {
    await new Promise((r) => setTimeout(r, 300));
    if (simulacion() === "error-decision") throw new Error("No se pudo guardar la decisión.");
    cambio();
    avisar();
}

function decidir(folio: string, estado: EstadoPublicacion | null, decision: Omit<Decision, "quien" | "fecha">) {
    const p = obtenerPublicacion(folio);
    if (!p) throw new Error("La publicación no existe.");
    publicaciones = publicaciones.map((x) => (x.folio === folio ? { ...x, estado: estado ?? x.estado, decisiones: [...x.decisiones, { ...decision, quien: QUIEN_MODERA, fecha: hoy() }] } : x));
}

export const aprobarPublicacion = (folio: string) => guardar(() => decidir(folio, "aprobada", { tipo: "aprobada" }));

export function validarDecision(norma: number | "", mensaje: string, mensajeObligatorio: boolean) {
    const errores: { norma?: string; mensaje?: string } = {};
    if (!norma) errores.norma = "Elige la norma incumplida.";
    if (mensajeObligatorio && !mensaje.trim()) errores.mensaje = "Escribe el mensaje para la persona.";
    return errores;
}

export const retirarPublicacion = (folio: string, norma: number, mensaje: string) => guardar(() => decidir(folio, "retirada", { tipo: "retirada", norma, mensaje: mensaje.trim() || undefined }));

// La advertencia no cambia el estado de la publicación
export const advertirPersona = (folio: string, norma: number, mensaje: string) => guardar(() => decidir(folio, null, { tipo: "advertencia", norma, mensaje: mensaje.trim() }));

export function fechaHasta(dias: number, desde = new Date()) {
    const d = new Date(desde);
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

export const silenciarPersona = (folio: string, dias: number, motivo: string) =>
    guardar(() => {
        const p = obtenerPublicacion(folio);
        if (!p) throw new Error("La publicación no existe.");
        if (!motivo.trim()) throw new Error("Escribe el motivo.");
        decidir(folio, null, { tipo: "silenciada", mensaje: motivo.trim() });
        const nuevo: Silencio = { id: `SI-${String(13 + silencios.length).padStart(4, "0")}`, persona: p.autor, motivo: motivo.trim(), hasta: fechaHasta(dias), por: QUIEN_MODERA };
        silencios = [nuevo, ...silencios.filter((s) => s.persona !== p.autor)];
    });

export const restaurarParticipacion = (id: string) =>
    guardar(() => {
        if (!obtenerSilencio(id)) throw new Error("La persona ya no está silenciada.");
        silencios = silencios.filter((s) => s.id !== id);
    });

export const ultimaDecision = (p: Publicacion, tipo: TipoDecision) => [...p.decisiones].reverse().find((d) => d.tipo === tipo);

// Para pruebas y lecturas fuera de React
export const leerForo = () => estadoForo;

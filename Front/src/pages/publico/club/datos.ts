// Club Alameda: foro de la Bibliocomunidad (HU-26). Figma A-02: 759:93132 (inicio del foro) y 759:93772 (detalle de un hilo).
// TODO backend: todavía no hay servicio del foro para las personas usuarias. Se espera:
//   GET  /api/foro/temas                       → [{ slug, titulo, descripcion, publicacionInicial, respuestas, ultimaActividad }]
//   GET  /api/foro/temas/{slug}/respuestas     → respuestas aprobadas + las propias en revisión
//   POST /api/foro/temas/{slug}/respuestas     { texto } → { id, estado: "en_revision" | "publicada" }
//   POST /api/foro/respuestas/{id}/reportes    { norma, comentario }
//   GET  /api/foro/mi-estado                   → { silenciadaHasta: string | null }
// Los nombres de los hilos coinciden con los de Moderación del foro (src/pages/admin/participantes/moderacion.ts),
// para que el personal modere las mismas conversaciones.
// Mientras, todo vive solo en esta pestaña (se reinicia al recargar).
import { useSyncExternalStore } from "react";

export type ColorTema = "verde" | "dorado" | "rosa" | "gris";

export interface Tema {
    slug: string;
    numero: string;
    etiqueta: string;
    titulo: string; // nombre del hilo (el mismo que ve el personal en Moderación)
    descripcion: string;
    color: ColorTema;
    inicial: { fecha: string; titulo: string; texto: string };
}

export type EstadoRespuesta = "publicada" | "en-revision";

export interface Respuesta {
    id: string;
    tema: string;
    autor: string;
    fecha: string; // AAAA-MM-DDTHH:MM
    texto: string;
    estado: EstadoRespuesta;
    propia: boolean;
}

export const TEMAS: Tema[] = [
    {
        slug: "cuentos-de-la-alameda", numero: "01", etiqueta: "LECTURAS", color: "verde",
        titulo: "Reseña: Cuentos de la Alameda",
        descripcion: "Un libro, distintas miradas. Comparte lo que te dejó esta lectura.",
        inicial: {
            fecha: "2026-11-02T09:15", titulo: "Reseña: Cuentos de la Alameda (ejemplo)",
            texto: "Me gustó cómo estos relatos recuperan la memoria del barrio. ¿Qué cuento les hizo recordar un lugar especial? (ejemplo)",
        },
    },
    {
        slug: "intercambio-de-libros", numero: "02", etiqueta: "INTERCAMBIO", color: "dorado",
        titulo: "Intercambio de libros",
        descripcion: "Dale otra vida a tus libros: conversa sobre lecturas para intercambiar.",
        inicial: {
            fecha: "2026-10-30T11:00", titulo: "Intercambio de libros (ejemplo)",
            texto: "¿Qué libro ya leíste y te gustaría que alguien más disfrutara? Cuéntanos cuál es y por qué lo recomiendas. (ejemplo)",
        },
    },
    {
        slug: "recomendaciones", numero: "03", etiqueta: "RECOMENDACIONES", color: "rosa",
        titulo: "Recomendaciones",
        descripcion: "Ese libro que no puedes dejar de recomendar tiene un lugar aquí.",
        inicial: {
            fecha: "2026-10-28T10:00", titulo: "Recomendaciones (ejemplo)",
            texto: "Comparte un libro que hayas disfrutado y dinos para quién lo recomendarías. (ejemplo)",
        },
    },
    {
        slug: "taller-de-escritura", numero: "04", etiqueta: "ESCRITURA", color: "gris",
        titulo: "Taller de escritura",
        descripcion: "Ideas, ejercicios y pequeños relatos para animarte a escribir.",
        inicial: {
            fecha: "2026-10-27T17:00", titulo: "Taller de escritura (ejemplo)",
            texto: "Ejercicio de la semana: describe en pocas líneas un lugar de Tepic que te guste. (ejemplo)",
        },
    },
];

export const NORMAS_CLUB = [
    "Habla sobre libros, lectura y actividades.",
    "Sin insultos, acoso ni discriminación.",
    "Sin ventas ni publicidad no autorizada.",
    "No compartas datos personales de otras personas.",
];

export const MAXIMO_RESPUESTA = 1000;
export const MAXIMO_COMENTARIO = 300;

export const temaPorSlug = (slug: string | undefined) => TEMAS.find((t) => t.slug === slug);

const r = (id: string, tema: string, autor: string, fecha: string, texto: string): Respuesta =>
    ({ id, tema, autor, fecha, texto, estado: "publicada", propia: false });

const respuestasIniciales: Respuesta[] = [
    r("r1", "cuentos-de-la-alameda", "Luis (ejemplo)", "2026-11-03T16:20", "El cuento del parque me recordó las tardes de lectura con mi familia. (ejemplo)"),
    r("r2", "cuentos-de-la-alameda", "Elena (ejemplo)", "2026-11-04T10:30", "A mí me gustó el relato de la plaza. Lo recomendaría para la próxima reunión. (ejemplo)"),
    r("r3", "intercambio-de-libros", "Marta (ejemplo)", "2026-11-01T12:40", "Tengo «El principito» en buen estado; me gustaría cambiarlo por una novela de misterio. (ejemplo)"),
    r("r4", "intercambio-de-libros", "Jorge (ejemplo)", "2026-11-03T18:15", "Yo puedo llevar uno de poesía a la próxima reunión del club. (ejemplo)"),
    r("r5", "recomendaciones", "Sofía (ejemplo)", "2026-11-02T09:50", "Recomiendo «Pedro Páramo» para quien quiera empezar con autores mexicanos. (ejemplo)"),
    r("r6", "recomendaciones", "Andrés (ejemplo)", "2026-11-03T16:00", "Para leer en familia, cualquier libro de cuentos ilustrados de la sala infantil. (ejemplo)"),
    r("r7", "taller-de-escritura", "Carmen (ejemplo)", "2026-11-02T12:00", "La Alameda en la mañana: el olor a café y las bancas todavía frías. (ejemplo)"),
];

// ---------- Almacén compartido ----------
type EstadoClub = { respuestas: Respuesta[]; reportadas: string[]; silenciadaHasta: string | null };
const inicial: EstadoClub = { respuestas: respuestasIniciales, reportadas: [], silenciadaHasta: null };
let estado = inicial;
let siguiente = 1;
const oyentes = new Set<() => void>();
function cambiar(nuevo: Partial<EstadoClub>) {
    estado = { ...estado, ...nuevo };
    oyentes.forEach((o) => o());
}
function suscribir(o: () => void) { oyentes.add(o); return () => { oyentes.delete(o); }; }

export function useClub(): EstadoClub {
    return useSyncExternalStore(suscribir, () => estado, () => estado);
}
export const consultarClub = () => estado;
export function reiniciarClub() { siguiente = 1; cambiar(inicial); }

// Solo en desarrollo: ver la pantalla como cuenta silenciada por moderación.
export function verSilenciada(hasta: string | null) { cambiar({ silenciadaHasta: hasta }); }

// Lo que ve cada quien: las publicadas y, además, las propias que siguen en revisión.
export function respuestasDe(tema: string, lista = estado.respuestas): Respuesta[] {
    return lista.filter((x) => x.tema === tema && (x.estado === "publicada" || x.propia))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function resumenTema(tema: Tema, lista = estado.respuestas) {
    const visibles = respuestasDe(tema.slug, lista).filter((x) => x.estado === "publicada");
    const ultima = visibles.length ? visibles[visibles.length - 1].fecha : tema.inicial.fecha;
    return { respuestas: visibles.length, ultimaActividad: ultima };
}

export function validarRespuesta(texto: string): string | null {
    const t = texto.trim();
    if (!t) return "Escribe tu respuesta antes de publicarla.";
    if (t.length > MAXIMO_RESPUESTA) return `Tu respuesta pasa de ${MAXIMO_RESPUESTA.toLocaleString("es-MX")} caracteres.`;
    return null;
}

// La primera respuesta de la persona se revisa antes de mostrarse (Figma); las siguientes se publican de inmediato.
export function publicarRespuesta(tema: string, autor: string, texto: string, ahora = new Date()): Respuesta {
    const yaParticipo = estado.respuestas.some((x) => x.propia && x.estado === "publicada");
    const nueva: Respuesta = {
        id: `propia-${siguiente++}`, tema, autor, fecha: fechaIso(ahora), texto: texto.trim(),
        estado: yaParticipo ? "publicada" : "en-revision", propia: true,
    };
    cambiar({ respuestas: [...estado.respuestas, nueva] });
    return nueva;
}

// Solo en desarrollo: simula que el personal aprobó tus respuestas en revisión.
export function aprobarMisRespuestas() {
    cambiar({ respuestas: estado.respuestas.map((x) => (x.propia ? { ...x, estado: "publicada" as const } : x)) });
}

export function validarReporte(norma: number | "", comentario: string): { norma?: string; comentario?: string } {
    const e: { norma?: string; comentario?: string } = {};
    if (norma === "") e.norma = "Elige qué norma no se cumple.";
    if (comentario.trim().length > MAXIMO_COMENTARIO) e.comentario = `Máximo ${MAXIMO_COMENTARIO} caracteres.`;
    return e;
}

// El reporte llega a Moderación del foro; la respuesta sigue visible hasta que el personal decida.
export function reportarRespuesta(id: string) {
    if (!estado.reportadas.includes(id)) cambiar({ reportadas: [...estado.reportadas, id] });
}

// ---------- Fechas ----------
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaIso(d: Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// «2 nov 2026, 09:15»
export function fechaPublicacion(iso: string) {
    const [f, h] = iso.split("T");
    const [a, m, d] = f.split("-").map(Number);
    return `${d} ${MESES_CORTOS[m - 1]} ${a}, ${h}`;
}

// «hoy, 10:30» · «ayer, 18:15» · «2 nov, 12:00»
export function actividadRelativa(iso: string, hoy = new Date()) {
    const [f, h] = iso.split("T");
    const [a, m, d] = f.split("-").map(Number);
    const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(a, m - 1, d).getTime()) / 86400000);
    if (dias === 0) return `hoy, ${h}`;
    if (dias === 1) return `ayer, ${h}`;
    return `${d} ${MESES_CORTOS[m - 1]}${a !== hoy.getFullYear() ? ` ${a}` : ""}, ${h}`;
}

export const textoRespuestas = (n: number) => (n === 1 ? "1 respuesta" : `${n} respuestas`);
export const inicialDe = (nombre: string) => nombre.trim().charAt(0).toUpperCase() || "?";

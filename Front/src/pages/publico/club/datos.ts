// Tipos, normas y formato visual del Club Alameda. Los datos se consultan en servicios/foro.ts.
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

export const NORMAS_CLUB = [
    "Habla sobre libros, lectura y actividades.",
    "Sin insultos, acoso ni discriminación.",
    "Sin ventas ni publicidad no autorizada.",
    "No compartas datos personales de otras personas.",
];

export const MAXIMO_RESPUESTA = 1000;
export const MAXIMO_COMENTARIO = 300;

export function validarRespuesta(texto: string): string | null {
    const t = texto.trim();
    if (!t) return "Escribe tu respuesta antes de publicarla.";
    if (t.length > MAXIMO_RESPUESTA) return `Tu respuesta pasa de ${MAXIMO_RESPUESTA.toLocaleString("es-MX")} caracteres.`;
    return null;
}

export function validarReporte(norma: number | "", comentario: string): { norma?: string; comentario?: string } {
    const e: { norma?: string; comentario?: string } = {};
    if (norma === "" || !Number.isInteger(norma) || norma < 1 || norma > NORMAS_CLUB.length) e.norma = "Elige qué norma no se cumple.";
    if (comentario.trim().length > MAXIMO_COMENTARIO) e.comentario = `Máximo ${MAXIMO_COMENTARIO} caracteres.`;
    return e;
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
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

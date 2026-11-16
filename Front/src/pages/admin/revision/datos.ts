// Revisión y publicación (HU-12, Figma 560:17409): reglas puras sobre los datos reales del backend.
// Pruebas en tests/revision.test.ts.
import type { ContenidoRevision, EventoContenido } from "../../../servicios/publicacion";
import type { EstadoContenido } from "../contenidoDemo/datos";

export const BASE_REVISION = "/admin/contenidos/revision";

// ---------- Nombres ----------

export const NOMBRE_TIPO: Record<string, string> = { noticia: "Noticia", resena: "Reseña", acerca: "Acerca de", memoria: "Memoria pública" };
export const nombreTipo = (tipo: string) => NOMBRE_TIPO[tipo] ?? tipo;

// «Revisión de la reseña», «Reseña publicada»…
const EN_FRASE: Record<string, string> = { noticia: "la noticia", resena: "la reseña", acerca: "el texto de Acerca de", memoria: "la pieza de Memoria pública" };
export const tituloRevision = (tipo: string) => `Revisión de ${EN_FRASE[tipo] ?? "el contenido"}`;

const PUBLICADO: Record<string, string> = { noticia: "Noticia publicada", resena: "Reseña publicada", acerca: "Texto de Acerca de publicado", memoria: "Pieza de Memoria pública publicada" };
export const tituloPublicado = (tipo: string) => PUBLICADO[tipo] ?? "Contenido publicado";

// Dónde se publicará cada tipo (texto de la ventana de autorizar)
const LUGAR: Record<string, string> = { noticia: "en Noticias", resena: "en Lecturas y reseñas", acerca: "en Acerca de la biblioteca", memoria: "en Memoria pública" };
export function textoAutorizar(tipo: string) {
    const frase = EN_FRASE[tipo] ?? "el contenido";
    const femenino = frase.startsWith("la ");
    return `${frase.charAt(0).toUpperCase()}${frase.slice(1)} se publicará ${LUGAR[tipo] ?? "en el portal"} y quedará registrad${femenino ? "a" : "o"} en la bitácora.`;
}

// «Reseña: Cuentos de la Alameda» (así se nombra en ventanas y resultados)
export const nombreCompleto = (c: { tipo: string; titulo: string }) => (c.tipo === "noticia" ? c.titulo : `${nombreTipo(c.tipo)}: ${c.titulo}`);

// Los estados del backend, con los nombres y colores de las pantallas
export function estadoVisual(estado: string): EstadoContenido {
    if (estado === "en_revision") return "por-autorizar";
    if (estado === "con_observaciones") return "observaciones";
    if (estado === "publicado" || estado === "aprobado") return "publicado";
    if (estado === "rechazado") return "rechazado";
    if (estado === "retirado" || estado === "archivado") return "retirado";
    return "borrador";
}

// Dónde aparece en el portal una vez publicado
export function dondeSeVe(c: { tipo: string; datos: Record<string, unknown> }) {
    const d = c.datos;
    if (c.tipo === "noticia") return d.destacar ? "Noticias · Inicio" : "Noticias";
    if (c.tipo === "resena") return `Lecturas y reseñas · ${String(d.vista || "Por autor")}`;
    if (c.tipo === "acerca") return `Acerca de la biblioteca · ${String(d.seccion || "Sección por confirmar")}`;
    return `Memoria pública · ${String(d.tema || d.periodo || "Tema por confirmar")}`;
}

// ---------- Fechas ----------

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const inicioDia = (f: Date) => new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();

export function diasDesde(iso: string, ahora = new Date()) {
    return Math.max(0, Math.round((inicioDia(ahora) - inicioDia(new Date(iso))) / 86400000));
}

// «12 oct 2026»
export function fechaCorta(iso: string) {
    const f = new Date(iso);
    return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

// «Hoy», «Ayer», «Hace 3 días» (columna Enviado)
export function cuandoRelativo(iso: string, ahora = new Date()) {
    const dias = diasDesde(iso, ahora);
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Ayer";
    return dias < 30 ? `Hace ${dias} días` : fechaCorta(iso);
}

// «Hoy, 10:42», «Ayer, 17:05», «8 oct 2026, 09:30»
export function fechaHora(iso: string, ahora = new Date()) {
    const f = new Date(iso);
    const hora = `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
    const dias = diasDesde(iso, ahora);
    return `${dias === 0 ? "Hoy" : dias === 1 ? "Ayer" : fechaCorta(iso)}, ${hora}`;
}

// ---------- Bandeja ----------

// La lista llega del más antiguo al más reciente (ORDER BY enviadoEn)
export function textoAntiguedad(porAutorizar: { enviadoEn: string | null }[], ahora = new Date()) {
    const fechas = porAutorizar.map((c) => c.enviadoEn).filter((f): f is string => !!f);
    if (fechas.length === 0) return "No hay nada pendiente.";
    const dias = Math.max(...fechas.map((f) => diasDesde(f, ahora)));
    if (dias === 0) return "El más antiguo llegó hoy.";
    return `El más antiguo lleva ${dias} ${dias === 1 ? "día" : "días"}.`;
}

export function publicadosEnElMes(lista: { publicadoEn: string | null }[], ahora = new Date()) {
    return lista.filter((c) => {
        if (!c.publicadoEn) return false;
        const f = new Date(c.publicadoEn);
        return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
    }).length;
}

// ---------- Historial de publicaciones ----------

// La última publicación registrada: quién autorizó, con qué referencia y cuándo
export function ultimaPublicacion(c: { historial: EventoContenido[] }) {
    const eventos = c.historial.filter((e) => e.accion === "publicacion");
    return eventos[eventos.length - 1];
}

export function versionPublicada(c: { historial: EventoContenido[] }) {
    return Math.max(1, c.historial.filter((e) => e.accion === "publicacion").length);
}

export type FiltroHistorial = "todos" | "noticia" | "resena" | "acerca" | "memoria" | "retirado";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

// Del más reciente al más antiguo; «todos» incluye los retirados
export function filtrarHistorial<T extends Pick<ContenidoRevision, "tipo" | "estado" | "titulo" | "folio" | "publicadoEn">>(lista: T[], filtro: FiltroHistorial, texto: string) {
    const buscado = normalizar(texto);
    return lista
        .filter((c) => (filtro === "todos" ? true : filtro === "retirado" ? c.estado === "retirado" : c.tipo === filtro))
        .filter((c) => !buscado || normalizar(`${c.folio} ${c.titulo}`).includes(buscado))
        .sort((a, b) => (b.publicadoEn ?? "").localeCompare(a.publicadoEn ?? ""));
}

// ---------- Historial de decisiones (columna lateral del detalle) ----------

const ACCIONES: Record<string, string> = {
    envio: "Enviado a autorización", observaciones: "Observaciones enviadas", aprobacion: "Autorizado",
    publicacion: "Publicado", rechazo: "Rechazado", retiro: "Retirado del portal",
};

export function eventosDetalle(c: Pick<ContenidoRevision, "historial" | "creadoEn">) {
    const eventos = c.historial.map((e) => ({ titulo: ACCIONES[e.accion] ?? e.accion, fecha: e.fecha, responsable: e.responsable }));
    return [...eventos, { titulo: "Creado", fecha: c.creadoEn, responsable: "" }].sort((a, b) => b.fecha.localeCompare(a.fecha));
}

// ---------- Observaciones (pedir cambios) ----------

export const MAXIMO_OBSERVACIONES = 600;

// Separa el texto en renglones sin número ("1. Algo" → "Algo")
export const renglones = (texto: string) => texto.split(/\n+/).map((l) => l.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
export const numerar = (lineas: string[]) => lineas.map((l, i) => `${i + 1}. ${l}`).join("\n");

// El backend acepta de 1 a 20 observaciones de máximo 500 caracteres cada una
export function errorObservaciones(texto: string) {
    const lineas = renglones(texto);
    if (lineas.length === 0) return "Escribe al menos una observación para el Editor.";
    if (texto.length > MAXIMO_OBSERVACIONES) return `Máximo ${MAXIMO_OBSERVACIONES} caracteres (llevas ${texto.length}).`;
    if (lineas.length > 20) return "Escribe máximo 20 observaciones.";
    if (lineas.some((l) => l.length > 500)) return "Cada observación puede tener máximo 500 caracteres.";
    return "";
}

// Lo que el backend no guarda aparte (fecha límite, motivo del rechazo) se manda en la nota
export function notaObservaciones(limite: string, sinFecha: string) {
    return limite && limite !== sinFecha ? `Fecha límite sugerida: ${limite.toLowerCase()}.` : undefined;
}

export const notaRechazo = (motivo: string, explicacion: string) => `${motivo}. ${explicacion.trim()}`.slice(0, 1000);

// Al revés: «Contenido duplicado. Este tema…» → motivo y explicación (pantalla de rechazado)
export function separarRechazo(nota: string | null | undefined, motivos: string[]) {
    if (!nota) return { motivo: "Sin motivo registrado", explicacion: "" };
    const motivo = motivos.find((m) => nota.startsWith(`${m}.`));
    return motivo ? { motivo, explicacion: nota.slice(motivo.length + 1).trim() } : { motivo: nota, explicacion: "" };
}

export const MOTIVOS_RECHAZO = [
    "Contenido duplicado",
    "No corresponde al portal",
    "Información incorrecta o sin confirmar",
    "Sin permiso de uso de la imagen",
    "Otro motivo",
];

// Atención › Avisos del portal (Figma 578:39911): cierres, cambios de horario o mantenimiento.
// TODO backend: no hay endpoints de avisos. Se espera GET /avisos (lista con estado y vigencia),
// POST /avisos (borrador), PATCH /avisos/:folio (editar), POST /avisos/:folio/publicar y
// POST /avisos/:folio/retirar (con motivo), y que el portal lea los avisos vigentes.
// Mientras tanto son datos de ejemplo guardados en esta pestaña (sessionStorage).
import { useSyncExternalStore } from "react";

export type EstadoAviso = "borrador" | "programado" | "publicado" | "archivado";
export type TipoAviso = "Cierre" | "Horario" | "Mantenimiento" | "Cancelación" | "Informativo";

export const TIPOS_AVISO: TipoAviso[] = ["Cierre", "Horario", "Mantenimiento", "Cancelación", "Informativo"];
export const LUGARES_AVISO = ["Todo el portal", "Inicio", "Eventos", "Servicios"];
export const MAXIMO_MENSAJE = 200;

export type Aviso = {
    folio: string;
    titulo: string;
    tipo: TipoAviso;
    mensaje: string;
    desde: string; // AAAA-MM-DD
    hasta: string;
    donde: string;
    estado: EstadoAviso;
    publico?: string; // quién lo publicó
    motivoRetiro?: string;
};

export const NOMBRE_ESTADO: Record<EstadoAviso, string> = {
    borrador: "Borrador", programado: "Programado", publicado: "Publicado", archivado: "Archivado",
};

export const EJEMPLO: Aviso[] = [
    { folio: "AV-0013", titulo: "Horario especial de fin de año", tipo: "Horario", mensaje: "Del 1 al 31 de diciembre abrimos de 9:00 a 14:00.", desde: "2026-12-01", hasta: "2026-12-31", donde: "Inicio", estado: "programado", publico: "Personal (ejemplo)" },
    { folio: "AV-0012", titulo: "Cierre por mantenimiento el sábado", tipo: "Cierre", mensaje: "La biblioteca permanecerá cerrada el sábado 31 de octubre por mantenimiento.", desde: "2026-10-20", hasta: "2026-10-31", donde: "Todo el portal", estado: "publicado", publico: "Personal (ejemplo)" },
    { folio: "AV-0011", titulo: "Nuevo catálogo en línea", tipo: "Informativo", mensaje: "Ya puedes consultar el catálogo de la biblioteca desde el portal.", desde: "2026-10-15", hasta: "2026-11-15", donde: "Inicio", estado: "publicado", publico: "Personal (ejemplo)" },
    { folio: "AV-0010", titulo: "Taller cancelado por lluvia", tipo: "Cancelación", mensaje: "El taller de dibujo del 12 de octubre se canceló por lluvia.", desde: "2026-10-12", hasta: "2026-10-12", donde: "Eventos", estado: "archivado", publico: "Personal (ejemplo)" },
];

// ---------- Reglas puras (pruebas en tests/avisosAtencion.test.ts) ----------

export type FiltroAviso = "todos" | "publicado" | "programado" | "borrador" | "archivado";

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filtrarAvisos(lista: Aviso[], filtro: FiltroAviso, texto: string) {
    const buscado = normalizar(texto);
    return lista.filter((a) => (filtro === "todos" || a.estado === filtro) && (!buscado || normalizar(`${a.folio} ${a.titulo}`).includes(buscado)));
}

export const contarAvisos = (lista: Aviso[], estado: EstadoAviso) => lista.filter((a) => a.estado === estado).length;

export type ValoresAviso = Pick<Aviso, "titulo" | "tipo" | "mensaje" | "desde" | "hasta" | "donde">;
export type ErroresAviso = Partial<Record<keyof ValoresAviso, string>>;

export function validarAviso(v: ValoresAviso): ErroresAviso {
    const e: ErroresAviso = {};
    if (!v.titulo.trim()) e.titulo = "Escribe el título del aviso.";
    if (!v.tipo) e.tipo = "Elige el tipo de aviso.";
    if (!v.mensaje.trim()) e.mensaje = "Escribe el mensaje que verá la gente.";
    else if (v.mensaje.length > MAXIMO_MENSAJE) e.mensaje = `Máximo ${MAXIMO_MENSAJE} caracteres (llevas ${v.mensaje.length}).`;
    if (!v.desde) e.desde = "Elige desde cuándo se ve.";
    if (!v.hasta) e.hasta = "Elige hasta cuándo se ve.";
    else if (v.desde && v.hasta < v.desde) e.hasta = "La fecha final no puede ser antes de la inicial.";
    return e;
}

// Al publicar: si todavía no empieza queda programado; si ya empezó, publicado
export const estadoAlPublicar = (desde: string, hoy: string): EstadoAviso => (desde > hoy ? "programado" : "publicado");

// Vigencia en texto: «Hasta 31 oct 2026», «1 al 31 dic 2026», «12 oct 2026»
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(fecha: string) {
    if (!fecha) return "Por confirmar";
    const [a, m, d] = fecha.split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${a}`;
}
export function vigencia(a: Pick<Aviso, "desde" | "hasta" | "estado">) {
    if (a.desde === a.hasta) return fechaCorta(a.desde);
    if (a.estado === "programado") {
        const [ad, md, dd] = a.desde.split("-").map(Number);
        const [ah, mh] = a.hasta.split("-").map(Number);
        if (ad === ah && md === mh) return `${dd} al ${fechaCorta(a.hasta)}`;
        return `${fechaCorta(a.desde)} al ${fechaCorta(a.hasta)}`;
    }
    return `Hasta ${fechaCorta(a.hasta)}`;
}

export function siguienteFolio(lista: Aviso[]) {
    const mayor = lista.reduce((m, a) => Math.max(m, Number(a.folio.replace(/\D/g, "")) || 0), 0);
    return `AV-${String(mayor + 1).padStart(4, "0")}`;
}

export const hoyIso = () => new Date().toISOString().slice(0, 10);

// ---------- Almacén de la pestaña ----------

const CLAVE = "biblioteca-panel-avisos";
const escuchas = new Set<() => void>();

function leer(): Aviso[] {
    try {
        const guardados = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
        if (Array.isArray(guardados)) return guardados;
    } catch { /* sin almacenamiento: datos de ejemplo */ }
    return EJEMPLO;
}

let actuales = leer();

function guardar(nuevos: Aviso[]) {
    actuales = nuevos;
    try { sessionStorage.setItem(CLAVE, JSON.stringify(nuevos)); } catch { /* no pasa nada */ }
    escuchas.forEach((avisar) => avisar());
}

export function useAvisos() {
    return useSyncExternalStore((avisar) => { escuchas.add(avisar); return () => { escuchas.delete(avisar); }; }, () => actuales);
}

export const obtenerAviso = (folio?: string) => actuales.find((a) => a.folio === folio);

// Guarda un borrador nuevo o los cambios de uno existente; devuelve el folio
export function guardarBorrador(valores: ValoresAviso, folio?: string) {
    if (folio && obtenerAviso(folio)) {
        guardar(actuales.map((a) => (a.folio === folio ? { ...a, ...valores } : a)));
        return folio;
    }
    const nuevo: Aviso = { ...valores, folio: siguienteFolio(actuales), estado: "borrador" };
    guardar([nuevo, ...actuales]);
    return nuevo.folio;
}

export function publicarAviso(folio: string) {
    guardar(actuales.map((a) => (a.folio === folio ? { ...a, estado: estadoAlPublicar(a.desde, hoyIso()), publico: "Tú (ejemplo)" } : a)));
}

export function retirarAviso(folio: string, motivo: string) {
    guardar(actuales.map((a) => (a.folio === folio ? { ...a, estado: "archivado", motivoRetiro: motivo } : a)));
}

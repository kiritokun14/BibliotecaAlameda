// Cálculos del Calendario y salas: qué pasa cada día y en cada sala
import type { Actividad } from "./datos";
import { isoLocal, type Bloqueo, type DatosBloqueo, type Sala } from "./salas";

export type Evento =
    | { clase: "actividad"; hora: string; titulo: string; sala: string; tipo: string; actividad: Actividad }
    | { clase: "bloqueo"; hora: string; titulo: string; sala: string; tipo: "Bloqueo"; bloqueo: Bloqueo };

// Las archivadas y canceladas ya no ocupan sala
export const ocupa = (a: Actividad) => a.estado !== "archivada" && a.estado !== "cancelada" && !!a.fecha;

const minutos = (h: string) => {
    const [a, b] = h.split(":").map(Number);
    return a * 60 + (b || 0);
};

function seTraslapan(i1: string, f1: string, i2: string, f2: string) {
    return minutos(i1) < minutos(f2) && minutos(i2) < minutos(f1);
}

// Un bloqueo de "todo el día" va de la apertura al cierre
const rango = (b: Pick<Bloqueo, "desde" | "hasta">) => (b.desde ? [b.desde, b.hasta] : ["00:00", "23:59"]);

export function eventosDelDia(fecha: string, actividades: Actividad[], bloqueos: Bloqueo[]): Evento[] {
    const lista: Evento[] = [
        ...actividades
            .filter((a) => ocupa(a) && a.fecha === fecha)
            .map((a) => ({ clase: "actividad" as const, hora: a.inicio, titulo: a.nombre, sala: a.espacio, tipo: a.tipo, actividad: a })),
        ...bloqueos
            .filter((b) => b.fecha === fecha)
            .map((b) => ({ clase: "bloqueo" as const, hora: b.desde, titulo: `${b.sala} · ${b.motivo.replace(/ \(ejemplo\)$/, "").toLowerCase()}`, sala: b.sala, tipo: "Bloqueo" as const, bloqueo: b })),
    ];
    // "Todo el día" va al final, como en Figma
    return lista.sort((x, y) => (x.hora || "99").localeCompare(y.hora || "99"));
}

// Actividad que choca con un bloqueo nuevo (misma sala, fecha y horario)
export function conflictoBloqueo(b: DatosBloqueo, actividades: Actividad[]) {
    const [i, f] = rango(b);
    return actividades.find((a) => ocupa(a) && a.espacio === b.sala && a.fecha === b.fecha && a.inicio && a.fin && seTraslapan(i, f, a.inicio, a.fin));
}

// Qué hay en una sala en un bloque de 2 horas que empieza a "hora"
export function ocupacion(sala: string, fecha: string, hora: string, actividades: Actividad[], bloqueos: Bloqueo[]) {
    const fin = `${String(Number(hora.slice(0, 2)) + 2).padStart(2, "0")}:00`;
    if (bloqueos.some((b) => b.sala === sala && b.fecha === fecha && seTraslapan(...(rango(b) as [string, string]), hora, fin))) return { tipo: "bloqueada" as const, texto: "Bloqueada" };
    const a = actividades.find((x) => ocupa(x) && x.espacio === sala && x.fecha === fecha && x.inicio && x.fin && seTraslapan(x.inicio, x.fin, hora, fin));
    if (a) return { tipo: "actividad" as const, texto: a.tipo, actividad: a };
    return { tipo: "libre" as const, texto: "Libre" };
}

export function estadoSala(s: Sala, fecha: string, bloqueos: Bloqueo[]) {
    if (!s.habilitada) return { texto: "Deshabilitada", tono: "gris" as const };
    const del = bloqueos.filter((b) => b.sala === s.nombre && b.fecha === fecha);
    if (del.some((b) => !b.desde)) return { texto: "Bloqueada", tono: "guinda" as const };
    if (del.length > 0) return { texto: "Con bloqueo", tono: "dorado" as const };
    return { texto: "Disponible", tono: "verde" as const };
}

// ---------- Fechas ----------
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export const desdeISO = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
};

export function sumarDias(iso: string, n: number) {
    const d = desdeISO(iso);
    d.setDate(d.getDate() + n);
    return isoLocal(d);
}

// "Martes 27 de octubre"
export function diaLargo(iso: string) {
    const d = desdeISO(iso);
    return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function nombreMes(anio: number, mes: number) {
    const n = MESES[((mes % 12) + 12) % 12];
    return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${anio}`;
}

// Celdas del mes empezando en lunes; null = hueco antes del día 1 o después del último
export function celdasDelMes(anio: number, mes: number): (string | null)[] {
    const primero = new Date(anio, mes, 1);
    const huecos = (primero.getDay() + 6) % 7;
    const dias = new Date(anio, mes + 1, 0).getDate();
    const celdas: (string | null)[] = Array(huecos).fill(null);
    for (let d = 1; d <= dias; d++) celdas.push(isoLocal(new Date(anio, mes, d)));
    while (celdas.length % 7) celdas.push(null);
    return celdas;
}

// Lunes a viernes de la semana del día dado
export function semanaDe(iso: string) {
    const d = desdeISO(iso);
    const lunes = sumarDias(iso, -((d.getDay() + 6) % 7));
    return [0, 1, 2, 3, 4].map((i) => sumarDias(lunes, i));
}

import { useSyncExternalStore } from "react";

// Progreso y recompensas de participantes, SIMULADOS. Se reinician al recargar.
// TODO backend: GET /participantes/progreso, POST .../:folio/ajustes (con motivo, queda en bitácora),
// POST .../:folio/entregas, GET/POST/PATCH /participantes/metas y /participantes/recompensas.
// Capacidad: registrar_recompensas.

export type Origen = "Asistencia" | "Ajuste manual";
export type Avance = { id: string; fecha: string; actividad: string; puntos: number; origen: Origen; motivo?: string };

export type EstadoMeta = "activa" | "borrador";
export type Meta = {
    id: string;
    nombre: string;
    necesarias: number; // actividades para cumplirla
    plazo: string; // "2 meses"
    puntos: number; // por actividad
    recompensa: string; // id
    estado: EstadoMeta;
    descripcion: string;
};

export type TipoRecompensa = "Insignia" | "Documento";
export type Recompensa = {
    id: string;
    nombre: string;
    tipo: TipoRecompensa;
    existencias: number | null; // null = sin límite (documentos)
    entregadas: number;
};

export type Participante = {
    folio: string; // P-0112
    nombre: string;
    credencial: string;
    desde: string; // YYYY-MM
    meta: string; // id
    avances: Avance[];
    entregada?: { fecha: string; entrego: string };
};

export type Entrega = { id: string; recompensa: string; persona: string; fecha: string; entrego: string; aviso: "enviado" | "sin-contacto"; estado: "entregada" | "pendiente" };

export const PLAZOS = ["1 mes", "2 meses", "3 meses", "6 meses", "1 año"];
export const QUIEN_ENTREGA = "Personal (ejemplo)";

const metasIniciales: Meta[] = [
    { id: "lector-constante", nombre: "Lector constante", necesarias: 5, plazo: "2 meses", puntos: 30, recompensa: "insignia-lector", estado: "activa", descripcion: "Asiste con constancia y gana tu insignia." },
    { id: "explorador", nombre: "Explorador", necesarias: 6, plazo: "3 meses", puntos: 35, recompensa: "insignia-explorador", estado: "activa", descripcion: "Prueba seis actividades distintas." },
    { id: "lector-del-anio", nombre: "Lector del año", necesarias: 20, plazo: "1 año", puntos: 30, recompensa: "constancia", estado: "borrador", descripcion: "Participa durante todo el año." },
];

const recompensasIniciales: Recompensa[] = [
    { id: "insignia-lector", nombre: "Insignia «Lector constante»", tipo: "Insignia", existencias: 12, entregadas: 31 },
    { id: "insignia-explorador", nombre: "Insignia «Explorador»", tipo: "Insignia", existencias: 4, entregadas: 18 },
    { id: "constancia", nombre: "Constancia de participación", tipo: "Documento", existencias: null, entregadas: 44 },
];

const av = (id: string, fecha: string, actividad: string, puntos = 30, origen: Origen = "Asistencia"): Avance => ({ id, fecha, actividad, puntos, origen });

const participantesIniciales: Participante[] = [
    { folio: "P-0112", nombre: "Persona participante A (ejemplo)", credencial: "Credencial por confirmar", desde: "2026-09", meta: "lector-constante", avances: [av("a1", "2026-10-27", "Club de lectura"), av("a2", "2026-10-20", "Taller de dibujo"), av("a3", "2026-10-14", "Visita guiada"), av("a4", "2026-10-02", "Cuentacuentos", 30, "Ajuste manual")] },
    { folio: "P-0111", nombre: "Persona participante B (ejemplo)", credencial: "Credencial por confirmar", desde: "2026-08", meta: "explorador", avances: ["Club de lectura", "Taller de dibujo", "Visita guiada", "Cuentacuentos", "Charla", "Cine en familia"].map((x, i) => av(`b${i}`, `2026-10-${String(25 - i * 3).padStart(2, "0")}`, x, 35)), entregada: { fecha: "2026-10-27", entrego: QUIEN_ENTREGA } },
    { folio: "P-0110", nombre: "Persona participante C (ejemplo)", credencial: "Credencial por confirmar", desde: "2026-10", meta: "lector-constante", avances: [av("c1", "2026-10-27", "Club de lectura"), av("c2", "2026-10-20", "Taller de dibujo")] },
    { folio: "P-0109", nombre: "Persona participante D (ejemplo)", credencial: "Credencial por confirmar", desde: "2026-07", meta: "explorador", avances: ["Club de lectura", "Taller de dibujo", "Visita guiada", "Cuentacuentos"].map((x, i) => av(`d${i}`, `2026-10-${String(26 - i * 4).padStart(2, "0")}`, x, 25)) },
    { folio: "P-0108", nombre: "Persona participante E (ejemplo)", credencial: "Credencial por confirmar", desde: "2026-06", meta: "lector-constante", avances: ["Club de lectura", "Taller de dibujo", "Visita guiada", "Cuentacuentos", "Charla"].map((x, i) => av(`e${i}`, `2026-10-${String(28 - i * 5).padStart(2, "0")}`, x)) },
];

const entregasIniciales: Entrega[] = [
    { id: "EN-0003", recompensa: "insignia-lector", persona: "Persona A (ejemplo)", fecha: "2026-10-27", entrego: QUIEN_ENTREGA, aviso: "enviado", estado: "entregada" },
    { id: "EN-0002", recompensa: "insignia-explorador", persona: "Persona B (ejemplo)", fecha: "2026-10-20", entrego: QUIEN_ENTREGA, aviso: "enviado", estado: "pendiente" },
    { id: "EN-0001", recompensa: "constancia", persona: "Persona C (ejemplo)", fecha: "2026-10-14", entrego: QUIEN_ENTREGA, aviso: "sin-contacto", estado: "entregada" },
];

type Estado = { participantes: Participante[]; metas: Meta[]; recompensas: Recompensa[]; entregas: Entrega[]; ajustesMes: number };
const inicial = (): Estado => ({ participantes: participantesIniciales, metas: metasIniciales, recompensas: recompensasIniciales, entregas: entregasIniciales, ajustesMes: 3 });
let estado: Estado = inicial();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useProgreso(): Estado {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => estado,
    );
}

export function reiniciarProgreso() {
    estado = inicial();
    avisar();
}

export const obtenerParticipante = (folio: string | undefined) => estado.participantes.find((p) => p.folio === folio);
export const obtenerMeta = (id: string | undefined) => estado.metas.find((m) => m.id === id);
export const obtenerRecompensa = (id: string | undefined) => estado.recompensas.find((r) => r.id === id);

// ---------- Cálculos ----------
export function avanceDe(p: Participante) {
    const meta = obtenerMeta(p.meta);
    const hechas = p.avances.length;
    const necesarias = meta?.necesarias ?? 1;
    return { hechas, necesarias, puntos: p.avances.reduce((s, a) => s + a.puntos, 0), cumplida: hechas >= necesarias };
}

export type EstadoRecompensa = "por-entregar" | "entregada" | "sin";
export function estadoRecompensa(p: Participante): EstadoRecompensa {
    if (p.entregada) return "entregada";
    return avanceDe(p).cumplida ? "por-entregar" : "sin";
}
export const NOMBRE_ESTADO_RECOMPENSA: Record<EstadoRecompensa, string> = { "por-entregar": "Por entregar", entregada: "Entregada", sin: "Sin recompensa" };

// "Disponible" · "Pocas" (5 o menos) · "Agotada"
export function disponibilidad(r: Recompensa) {
    if (r.existencias === null) return { texto: "Disponible", tono: "verde" as const };
    if (r.existencias === 0) return { texto: "Agotada", tono: "guinda" as const };
    if (r.existencias <= 5) return { texto: "Pocas", tono: "dorado" as const };
    return { texto: "Disponible", tono: "verde" as const };
}

export function porEntregarDe(recompensa: string) {
    return estado.participantes.filter((p) => estadoRecompensa(p) === "por-entregar" && obtenerMeta(p.meta)?.recompensa === recompensa).length;
}

// ---------- Acciones ----------
// Ajustar progreso: solo para corregir errores; queda con motivo
export function ajustarProgreso(folio: string, cambio: 1 | -1, motivo: string) {
    const p = obtenerParticipante(folio);
    if (!p) throw new Error("No existe la persona.");
    if (!motivo.trim()) throw new Error("Escribe el motivo del ajuste.");
    if (p.entregada) throw new Error("La recompensa ya se entregó; el progreso ya no se ajusta.");
    let avances = p.avances;
    if (cambio === 1) {
        const meta = obtenerMeta(p.meta);
        avances = [{ id: `aj-${Date.now()}`, fecha: new Date().toISOString().slice(0, 10), actividad: "Ajuste manual", puntos: meta?.puntos ?? 30, origen: "Ajuste manual", motivo: motivo.trim() }, ...avances];
    } else {
        if (avances.length === 0) throw new Error("No hay actividades que quitar.");
        avances = avances.slice(1);
    }
    estado = { ...estado, ajustesMes: estado.ajustesMes + 1, participantes: estado.participantes.map((x) => (x.folio === folio ? { ...x, avances } : x)) };
    avisar();
}

function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// Entregar: solo con la meta cumplida y si hay existencias. ?simular=error-entrega lo hace fallar.
export async function entregarRecompensa(folio: string) {
    await new Promise((r) => setTimeout(r, 300));
    if (simulacion() === "error-entrega") throw new Error("No se pudo registrar la entrega.");
    const p = obtenerParticipante(folio);
    if (!p || estadoRecompensa(p) !== "por-entregar") throw new Error("La meta aún no se cumple o ya se entregó.");
    const r = obtenerRecompensa(obtenerMeta(p.meta)?.recompensa);
    if (!r) throw new Error("La meta no tiene recompensa.");
    if (r.existencias === 0) throw new Error("No hay existencias de esta recompensa.");
    const fecha = new Date().toISOString().slice(0, 10);
    const mayor = Math.max(0, ...estado.entregas.map((e) => Number(e.id.replace(/\D/g, ""))));
    estado = {
        ...estado,
        participantes: estado.participantes.map((x) => (x.folio === folio ? { ...x, entregada: { fecha, entrego: QUIEN_ENTREGA } } : x)),
        recompensas: estado.recompensas.map((x) => (x.id === r.id ? { ...x, entregadas: x.entregadas + 1, existencias: x.existencias === null ? null : x.existencias - 1 } : x)),
        entregas: [{ id: `EN-${String(mayor + 1).padStart(4, "0")}`, recompensa: r.id, persona: p.nombre, fecha, entrego: QUIEN_ENTREGA, aviso: "enviado", estado: "entregada" }, ...estado.entregas],
    };
    avisar();
}

export type DatosMeta = Omit<Meta, "id" | "necesarias" | "puntos"> & { necesarias: string; puntos: string };

export function validarMeta(d: DatosMeta) {
    const e: Record<string, string> = {};
    if (!d.nombre.trim()) e.nombre = "Escribe el nombre de la meta.";
    const n = Number(d.necesarias);
    if (!d.necesarias) e.necesarias = "Escribe cuántas actividades se necesitan.";
    else if (!Number.isInteger(n) || n < 1 || n > 100) e.necesarias = "Escribe un número entre 1 y 100.";
    if (!d.plazo) e.plazo = "Elige el plazo.";
    const p = Number(d.puntos);
    if (!d.puntos) e.puntos = "Escribe los puntos por actividad.";
    else if (!Number.isInteger(p) || p < 1) e.puntos = "Escribe un número mayor que 0.";
    if (!d.recompensa) e.recompensa = "Elige la recompensa.";
    return e;
}

const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Los cambios aplican desde hoy; el avance anterior se respeta
export function guardarMeta(d: DatosMeta, id?: string): string {
    if (Object.keys(validarMeta(d)).length) throw new Error("Faltan datos de la meta.");
    const meta: Meta = { ...d, nombre: d.nombre.trim(), necesarias: Number(d.necesarias), puntos: Number(d.puntos), id: id ?? (slug(d.nombre) || `meta-${estado.metas.length + 1}`) };
    if (!id && obtenerMeta(meta.id)) meta.id = `${meta.id}-${estado.metas.length + 1}`;
    estado = { ...estado, metas: id ? estado.metas.map((m) => (m.id === id ? meta : m)) : [...estado.metas, meta] };
    avisar();
    return meta.id;
}

export type DatosRecompensa = { nombre: string; tipo: TipoRecompensa; existencias: string; sinLimite: boolean };

export function validarRecompensa(d: DatosRecompensa) {
    const e: Record<string, string> = {};
    if (!d.nombre.trim()) e.nombre = "Escribe el nombre de la recompensa.";
    if (!d.sinLimite) {
        const n = Number(d.existencias);
        if (d.existencias === "") e.existencias = "Escribe cuántas hay o marca «Sin límite».";
        else if (!Number.isInteger(n) || n < 0) e.existencias = "Escribe un número entero.";
    }
    return e;
}

export function guardarRecompensa(d: DatosRecompensa, id?: string): string {
    if (Object.keys(validarRecompensa(d)).length) throw new Error("Faltan datos de la recompensa.");
    const anterior = id ? obtenerRecompensa(id) : undefined;
    const r: Recompensa = { id: id ?? (slug(d.nombre) || `recompensa-${estado.recompensas.length + 1}`), nombre: d.nombre.trim(), tipo: d.tipo, existencias: d.sinLimite ? null : Number(d.existencias), entregadas: anterior?.entregadas ?? 0 };
    if (!id && obtenerRecompensa(r.id)) r.id = `${r.id}-${estado.recompensas.length + 1}`;
    estado = { ...estado, recompensas: id ? estado.recompensas.map((x) => (x.id === id ? r : x)) : [...estado.recompensas, r] };
    avisar();
    return r.id;
}

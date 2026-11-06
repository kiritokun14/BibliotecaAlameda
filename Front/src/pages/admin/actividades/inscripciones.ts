import { useSyncExternalStore } from "react";
import { actualizarActividad, capacidadDe, obtenerActividad, type Actividad } from "./datos";

// Inscripciones y lista de espera, SIMULADAS. Se reinician al recargar.
// TODO backend: GET /actividades/:folio/inscripciones, POST (inscribir), PATCH (cancelar / ofrecer lugar),
// PATCH /actividades/:folio/cupo. El portal inscribe a las personas con cuenta.

export type EstadoInscripcion = "confirmada" | "asistida" | "espera" | "ofrecido" | "cancelada";

export const NOMBRE_ESTADO_INSCRIPCION: Record<EstadoInscripcion, string> = {
    confirmada: "Confirmada",
    asistida: "Asistida",
    espera: "En espera",
    ofrecido: "Lugar ofrecido",
    cancelada: "Cancelada",
};

export type Inscripcion = {
    id: string; // IN-0108-01
    actividad: string; // AC-0108
    persona: string;
    contacto: string;
    fecha: string; // YYYY-MM-DD
    estado: EstadoInscripcion;
    acompanantes: number;
    via: "Portal (cuenta de usuario)" | "Personal de la biblioteca";
    notas: string;
};

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Genera inscripciones de ejemplo que cuadran con inscritos y espera de cada actividad
function generar(folio: string, inscritos: number, espera: number, canceladas: number, desde: string): Inscripcion[] {
    const base = new Date(`${desde}T12:00:00`);
    const dia = (n: number) => {
        const d = new Date(base);
        d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const lista: Inscripcion[] = [];
    const num = folio.slice(-4);
    for (let i = 0; i < inscritos; i++) {
        lista.push({ id: `IN-${num}-${String(i + 1).padStart(2, "0")}`, actividad: folio, persona: `Persona inscrita ${LETRAS[i % 26]} (ejemplo)`, contacto: i % 4 === 3 ? "Teléfono por confirmar" : "Correo por confirmar", fecha: dia(Math.floor(i / 3)), estado: "confirmada", acompanantes: i % 5 === 0 ? 1 : 0, via: i % 6 === 5 ? "Personal de la biblioteca" : "Portal (cuenta de usuario)", notas: "" });
    }
    for (let i = 0; i < espera; i++) {
        lista.push({ id: `IN-${num}-E${i + 1}`, actividad: folio, persona: `Persona en espera ${LETRAS[i]} (ejemplo)`, contacto: "Correo por confirmar", fecha: dia(5 + Math.floor(i / 2)), estado: "espera", acompanantes: 0, via: "Portal (cuenta de usuario)", notas: "" });
    }
    for (let i = 0; i < canceladas; i++) {
        lista.push({ id: `IN-${num}-C${i + 1}`, actividad: folio, persona: `Persona que canceló ${LETRAS[i]} (ejemplo)`, contacto: "Correo por confirmar", fecha: dia(2), estado: "cancelada", acompanantes: 0, via: "Portal (cuenta de usuario)", notas: "Canceló desde el portal." });
    }
    return lista;
}

const iniciales: Inscripcion[] = [
    ...generar("AC-0108", 18, 2, 2, "2026-10-20"),
    ...generar("AC-0103", 12, 4, 1, "2026-10-18"),
    ...generar("AC-0101", 9, 0, 0, "2026-10-10"),
    ...generar("AC-0104", 12, 0, 0, "2026-10-02"),
    ...generar("AC-0099", 15, 0, 0, "2026-10-06"),
    ...generar("AC-0098", 12, 0, 0, "2026-10-13"),
];

let lista: Inscripcion[] = iniciales;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useInscripciones(): Inscripcion[] {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => lista,
    );
}

export function leerInscripciones() {
    return lista;
}

export function reiniciarInscripciones() {
    lista = iniciales;
    avisar();
}

export const obtenerInscripcion = (id: string | undefined) => lista.find((i) => i.id === id);
export const deActividad = (folio: string, l: Inscripcion[] = lista) => l.filter((i) => i.actividad === folio);
export const ocupanLugar = (e: EstadoInscripcion) => e === "confirmada" || e === "asistida" || e === "ofrecido";

// Mantiene al día los contadores de la actividad (los usan Cambios y el detalle de Propuestas)
function sincronizar(folio: string) {
    const propias = deActividad(folio);
    actualizarActividad(folio, {
        inscritos: propias.filter((i) => i.estado === "confirmada" || i.estado === "asistida").length,
        espera: propias.filter((i) => i.estado === "espera").length,
    });
}

function cambiar(id: string, cambios: Partial<Inscripcion>) {
    lista = lista.map((i) => (i.id === id ? { ...i, ...cambios } : i));
    avisar();
}

export function lugaresLibres(a: Actividad, l: Inscripcion[] = lista) {
    return Number(a.cupo) - deActividad(a.folio, l).filter((i) => ocupanLugar(i.estado)).length;
}

// "Abierta" · "Casi llena" (85 % o más) · "Cupo completo" · "Pasada"
export function estadoCupo(a: Actividad, hoy: string, l: Inscripcion[] = lista) {
    if (a.fecha < hoy) return { texto: "Pasada", tono: "gris" as const, clave: "pasada" as const };
    const ocupados = Number(a.cupo) - lugaresLibres(a, l);
    if (ocupados >= Number(a.cupo)) return { texto: "Cupo completo", tono: "guinda" as const, clave: "completo" as const };
    if (ocupados / Number(a.cupo) >= 0.85) return { texto: "Casi llena", tono: "dorado" as const, clave: "casi" as const };
    return { texto: "Abierta", tono: "verde" as const, clave: "abierta" as const };
}

export type DatosInscripcion = { persona: string; contacto: string; acompanantes: string; notas: string };

export function validarInscripcion(d: DatosInscripcion) {
    const e: Record<string, string> = {};
    if (!d.persona.trim()) e.persona = "Escribe el nombre completo.";
    if (!d.contacto.trim()) e.contacto = "Escribe un teléfono o correo.";
    if (d.acompanantes && !/^\d+$/.test(d.acompanantes)) e.acompanantes = "Escribe un número.";
    return e;
}

// Inscribe si hay lugar; si no, la anota en la lista de espera
export function inscribir(folio: string, d: DatosInscripcion, enEspera = false): Inscripcion {
    const a = obtenerActividad(folio);
    if (!a || !a.inscripcion) throw new Error("La actividad no recibe inscripciones.");
    if (Object.keys(validarInscripcion(d)).length) throw new Error("Faltan datos.");
    const hayLugar = lugaresLibres(a) > 0;
    if (!hayLugar && !enEspera) throw new Error("No hay lugares disponibles.");
    const propias = deActividad(folio);
    const nueva: Inscripcion = {
        id: `IN-${folio.slice(-4)}-P${propias.length + 1}`, actividad: folio, persona: d.persona.trim(), contacto: d.contacto.trim(),
        fecha: new Date().toISOString().slice(0, 10), estado: hayLugar ? "confirmada" : "espera", acompanantes: Number(d.acompanantes || 0),
        via: "Personal de la biblioteca", notas: d.notas.trim(),
    };
    lista = [...lista, nueva];
    avisar();
    sincronizar(folio);
    return nueva;
}

// Al cancelar se libera el lugar (quien sigue en la lista de espera puede recibir la oferta)
export function cancelarInscripcion(id: string) {
    const i = obtenerInscripcion(id);
    if (!i || i.estado === "cancelada") throw new Error("La inscripción ya está cancelada.");
    cambiar(id, { estado: "cancelada" });
    sincronizar(i.actividad);
}

// La persona tiene 24 horas para confirmar el lugar ofrecido
export function ofrecerLugar(id: string) {
    const i = obtenerInscripcion(id);
    if (!i || i.estado !== "espera") throw new Error("Solo se ofrece lugar a quien está en espera.");
    const a = obtenerActividad(i.actividad)!;
    if (lugaresLibres(a) <= 0) throw new Error("No hay lugares libres. Ajusta el cupo primero.");
    cambiar(id, { estado: "ofrecido" });
    sincronizar(i.actividad);
}

function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// TODO backend: PATCH /actividades/:folio/cupo. ?simular=error-cupo hace fallar el guardado.
export function validarCupo(a: Actividad, nuevo: string) {
    const n = Number(nuevo);
    const ocupados = Number(a.cupo) - lugaresLibres(a);
    const maximo = capacidadDe(a.espacio);
    if (!nuevo || !Number.isInteger(n) || n < 1) return "Escribe un número entero mayor que 0.";
    if (n < ocupados) return `Ya hay ${ocupados} lugares ocupados; el cupo no puede ser menor.`;
    if (maximo && n > maximo) return `Máximo ${maximo} por la capacidad de la sala.`;
    return "";
}

export function ajustarCupo(folio: string, nuevo: string) {
    const a = obtenerActividad(folio);
    if (!a) throw new Error("No existe la actividad.");
    const problema = validarCupo(a, nuevo);
    if (problema) throw new Error(problema);
    if (simulacion() === "error-cupo") throw new Error("No se pudo guardar el cupo.");
    actualizarActividad(folio, { cupo: String(Number(nuevo)) });
}

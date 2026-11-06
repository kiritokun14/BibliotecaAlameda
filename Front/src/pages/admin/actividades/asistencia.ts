import { useSyncExternalStore } from "react";
import { obtenerActividad } from "./datos";
import { deActividad, leerInscripciones } from "./inscripciones";

// Listas de asistencia SIMULADAS. Se reinician al recargar.
// TODO backend: GET/PUT /actividades/:folio/asistencia, POST .../cerrar, POST .../correcciones (queda en bitácora).

export type Marca = "presente" | "ausente" | "sin";
export type Extra = { id: string; persona: string; contacto: string };
export type Correccion = { persona: string; de: Marca; a: Marca; motivo: string; fecha: string; quien: string };

export type Lista = {
    actividad: string;
    marcas: Record<string, Marca>; // por id de inscripción o de persona extra
    notas: Record<string, string>;
    extras: Extra[]; // personas sin inscripción (cuentan como presentes)
    cerrada?: { quien: string; fecha: string };
    correcciones: Correccion[];
};

export const NOMBRE_MARCA: Record<Marca, string> = { presente: "Presente", ausente: "Ausente", sin: "Sin marcar" };
export const QUIEN_PASA_LISTA = "Personal de Fomento a la lectura (ejemplo)";

// AC-0099 ya cerrada (13 de 15); AC-0098 a medias
function marcasDe(folio: string, presentes: number, ausentes: number): Record<string, Marca> {
    const m: Record<string, Marca> = {};
    deActividad(folio, leerInscripciones())
        .filter((i) => i.estado === "confirmada" || i.estado === "asistida")
        .forEach((i, n) => {
            m[i.id] = n < presentes ? "presente" : n < presentes + ausentes ? "ausente" : "sin";
        });
    return m;
}

function iniciales(): Lista[] {
    return [
        { actividad: "AC-0099", marcas: marcasDe("AC-0099", 13, 2), notas: {}, extras: [], cerrada: { quien: QUIEN_PASA_LISTA, fecha: "2026-10-20T17:45:00" }, correcciones: [] },
        { actividad: "AC-0098", marcas: marcasDe("AC-0098", 8, 2), notas: { "IN-0098-02": "Llegó tarde" }, extras: [{ id: "EX-0098-1", persona: "Persona sin inscripción (ejemplo)", contacto: "" }], correcciones: [] },
    ];
}

let listas: Lista[] = iniciales();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useAsistencia(): Lista[] {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => listas,
    );
}

export function reiniciarAsistencia() {
    listas = iniciales();
    avisar();
}

export function listaDe(folio: string, l: Lista[] = listas): Lista {
    return l.find((x) => x.actividad === folio) ?? { actividad: folio, marcas: {}, notas: {}, extras: [], correcciones: [] };
}

function guardarLista(nueva: Lista) {
    listas = listas.some((x) => x.actividad === nueva.actividad) ? listas.map((x) => (x.actividad === nueva.actividad ? nueva : x)) : [...listas, nueva];
    avisar();
}

// Quiénes aparecen en la lista: inscritos confirmados y personas agregadas al llegar
export function personasDe(folio: string) {
    const inscritos = deActividad(folio, leerInscripciones())
        .filter((i) => i.estado === "confirmada" || i.estado === "asistida")
        .map((i) => ({ id: i.id, persona: i.persona, extra: false }));
    const extras = listaDe(folio).extras.map((e) => ({ id: e.id, persona: e.persona, extra: true }));
    return [...inscritos, ...extras];
}

export function conteo(folio: string, l: Lista[] = listas) {
    const lista = listaDe(folio, l);
    const personas = personasDe(folio);
    const marca = (id: string, extra: boolean): Marca => (extra ? "presente" : lista.marcas[id] ?? "sin");
    return {
        presentes: personas.filter((p) => marca(p.id, p.extra) === "presente").length,
        ausentes: personas.filter((p) => marca(p.id, p.extra) === "ausente").length,
        sinMarcar: personas.filter((p) => marca(p.id, p.extra) === "sin").length,
        sinInscripcion: lista.extras.length,
        inscritos: personas.length - lista.extras.length,
    };
}

export function marcar(folio: string, id: string, m: Marca) {
    const l = listaDe(folio);
    if (l.cerrada) throw new Error("La lista está cerrada; usa una corrección.");
    guardarLista({ ...l, marcas: { ...l.marcas, [id]: m } });
}

export function anotar(folio: string, id: string, nota: string) {
    const l = listaDe(folio);
    guardarLista({ ...l, notas: { ...l.notas, [id]: nota } });
}

export function lugaresParaExtras(folio: string) {
    const a = obtenerActividad(folio);
    if (!a) return 0;
    return Math.max(0, Number(a.cupo) - personasDe(folio).length);
}

export function agregarSinInscripcion(folio: string, persona: string, contacto: string) {
    const l = listaDe(folio);
    if (l.cerrada) throw new Error("La lista está cerrada.");
    if (!persona.trim()) throw new Error("Escribe el nombre.");
    if (lugaresParaExtras(folio) <= 0) throw new Error("No hay lugares libres.");
    const id = `EX-${folio.slice(-4)}-${l.extras.length + 1}`;
    guardarLista({ ...l, extras: [...l.extras, { id, persona: persona.trim(), contacto: contacto.trim() }] });
}

function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// "Guardar y seguir": las marcas ya están en pantalla; esto las manda al servidor. ?simular=error-asistencia lo hace fallar.
export async function guardarAsistencia(folio: string) {
    await new Promise((r) => setTimeout(r, 300));
    if (simulacion() === "error-asistencia") throw new Error("No se pudo guardar");
    guardarLista(listaDe(folio));
}

// Al cerrar, quien no tenga marca queda como ausente
export function cerrarLista(folio: string) {
    const l = listaDe(folio);
    if (l.cerrada) throw new Error("La lista ya está cerrada.");
    const marcas = { ...l.marcas };
    personasDe(folio).filter((p) => !p.extra).forEach((p) => {
        if (!marcas[p.id] || marcas[p.id] === "sin") marcas[p.id] = "ausente";
    });
    guardarLista({ ...l, marcas, cerrada: { quien: QUIEN_PASA_LISTA, fecha: new Date().toISOString() } });
}

// Corregir una lista cerrada: queda en la bitácora con motivo
export function corregir(folio: string, id: string, nueva: Marca, motivo: string) {
    const l = listaDe(folio);
    if (!l.cerrada) throw new Error("Solo se corrige una lista cerrada.");
    if (!motivo.trim()) throw new Error("Escribe el motivo de la corrección.");
    if (nueva === "sin") throw new Error("Elige presente o ausente.");
    const persona = personasDe(folio).find((p) => p.id === id);
    if (!persona) throw new Error("La persona no está en la lista.");
    const anterior = l.marcas[id] ?? "sin";
    guardarLista({
        ...l,
        marcas: { ...l.marcas, [id]: nueva },
        correcciones: [...l.correcciones, { persona: persona.persona, de: anterior, a: nueva, motivo: motivo.trim(), fecha: new Date().toISOString(), quien: "Tú (ejemplo)" }],
    });
}

// "Lista cerrada" · "Por pasar lista" (ya empezó o ya pasó) · "Aún no empieza"
export function estadoLista(folio: string, ahora = new Date(), l: Lista[] = listas) {
    const a = obtenerActividad(folio);
    if (!a) return { texto: "Sin datos", tono: "gris" as const, clave: "futura" as const };
    if (a.estado === "cancelada") return { texto: "Cancelada", tono: "guinda" as const, clave: "cancelada" as const };
    if (listaDe(folio, l).cerrada) return { texto: "Lista cerrada", tono: "verde" as const, clave: "cerrada" as const };
    const inicio = new Date(`${a.fecha}T${a.inicio || "00:00"}:00`);
    if (ahora >= inicio) return { texto: "Por pasar lista", tono: "dorado" as const, clave: "pendiente" as const };
    return { texto: "Aún no empieza", tono: "gris" as const, clave: "futura" as const };
}

import { useSyncExternalStore } from "react";

// Cotejo de credenciales, SIMULADO: compara lo que la persona capturó en el portal con el sistema de la biblioteca
// antes de vincular su cuenta. Se reinicia al recargar.
// TODO backend: GET /participantes/cotejos, GET .../:folio (consulta al sistema de la biblioteca),
// POST .../:folio/{vincular|correccion|rechazo|aviso-renovacion}. Capacidad: validar_credenciales.

export type EstadoCotejo = "pendiente" | "vinculada" | "correccion" | "rechazada" | "aviso";
export const NOMBRE_ESTADO_COTEJO: Record<EstadoCotejo, string> = {
    pendiente: "Pendiente",
    vinculada: "Vinculada",
    correccion: "Corrección pedida",
    rechazada: "Rechazada",
    aviso: "Aviso de renovación",
};

export type DatosPortal = { nombre: string; credencial: string; nacimiento: string };
export type DatosSistema = DatosPortal & { vigencia: string; vencida: boolean; adeudos: string; vinculadaA?: string };

export type Cotejo = {
    folio: string; // CT-0051
    persona: string;
    registro: string; // YYYY-MM-DD
    portal: DatosPortal;
    sistema: DatosSistema | null; // null = la credencial no existe en el sistema
    estado: EstadoCotejo;
    resolucion?: { quien: string; fecha: string; detalle: string };
};

export const QUIEN_COTEJA = "Personal (ejemplo)";
export const DATOS_A_CORREGIR = ["Nombre", "Número de credencial", "Fecha de nacimiento", "Nombre y fecha de nacimiento", "Todos los datos"];

const sistema = (d: Partial<DatosSistema> = {}): DatosSistema => ({ nombre: "Persona usuaria (ejemplo)", credencial: "Por confirmar", nacimiento: "Por confirmar", vigencia: "Vigente hasta 2027", vencida: false, adeudos: "Sin adeudos", ...d });
const portal = (d: Partial<DatosPortal> = {}): DatosPortal => ({ nombre: "Persona usuaria (ejemplo)", credencial: "Por confirmar", nacimiento: "Por confirmar", ...d });

const iniciales: Cotejo[] = [
    { folio: "CT-0053", persona: "Persona usuaria H (ejemplo)", registro: "2026-10-27", portal: portal({ credencial: "BSA-0099 (ejemplo)" }), sistema: null, estado: "pendiente" },
    { folio: "CT-0052", persona: "Persona usuaria I (ejemplo)", registro: "2026-10-27", portal: portal(), sistema: sistema({ vinculadaA: "otra cuenta del portal (ejemplo)" }), estado: "pendiente" },
    { folio: "CT-0051", persona: "Persona usuaria A (ejemplo)", registro: "2026-10-26", portal: portal(), sistema: sistema(), estado: "pendiente" },
    { folio: "CT-0050", persona: "Persona usuaria B (ejemplo)", registro: "2026-10-26", portal: portal(), sistema: sistema({ nombre: "Persona Usuaria B. (ejemplo)", nacimiento: "Por confirmar (distinta)" }), estado: "pendiente" },
    { folio: "CT-0049", persona: "Persona usuaria C (ejemplo)", registro: "2026-10-25", portal: portal(), sistema: sistema({ vigencia: "Venció en septiembre de 2026", vencida: true }), estado: "pendiente" },
    { folio: "CT-0048", persona: "Persona usuaria D (ejemplo)", registro: "2026-10-25", portal: portal(), sistema: sistema(), estado: "vinculada", resolucion: { quien: QUIEN_COTEJA, fecha: "2026-10-25", detalle: "Todos los datos coinciden." } },
    { folio: "CT-0047", persona: "Persona usuaria E (ejemplo)", registro: "2026-10-24", portal: portal(), sistema: sistema(), estado: "vinculada", resolucion: { quien: QUIEN_COTEJA, fecha: "2026-10-24", detalle: "Todos los datos coinciden." } },
    { folio: "CT-0046", persona: "Persona usuaria F (ejemplo)", registro: "2026-10-24", portal: portal(), sistema: null, estado: "rechazada", resolucion: { quien: QUIEN_COTEJA, fecha: "2026-10-24", detalle: "La credencial no existe en el sistema." } },
    { folio: "CT-0045", persona: "Persona usuaria G (ejemplo)", registro: "2026-10-23", portal: portal(), sistema: sistema(), estado: "vinculada", resolucion: { quien: QUIEN_COTEJA, fecha: "2026-10-23", detalle: "Todos los datos coinciden." } },
];

let lista: Cotejo[] = iniciales;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useCotejos(): Cotejo[] {
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

export function reiniciarCotejos() {
    lista = iniciales;
    avisar();
}

export const obtenerCotejo = (folio: string | undefined) => lista.find((c) => c.folio === folio);

// ---------- Comparación ----------
export type Fila = { dato: string; portal: string; sistema: string; coincide: boolean };

export function comparar(c: Cotejo): Fila[] {
    const s = c.sistema;
    if (!s) return [];
    return [
        { dato: "Nombre", portal: c.portal.nombre, sistema: s.nombre, coincide: c.portal.nombre === s.nombre },
        { dato: "Número de credencial", portal: c.portal.credencial, sistema: s.credencial, coincide: c.portal.credencial === s.credencial },
        { dato: "Fecha de nacimiento", portal: c.portal.nacimiento, sistema: s.nacimiento, coincide: c.portal.nacimiento === s.nacimiento },
        { dato: "Vigencia", portal: "—", sistema: s.vigencia, coincide: !s.vencida },
        { dato: "Adeudos o bloqueos", portal: "—", sistema: s.adeudos, coincide: s.adeudos === "Sin adeudos" },
    ];
}

export type Resultado = "coincide" | "diferencias" | "vencida" | "sin-coincidencia" | "ya-vinculada";

export function resultadoDe(c: Cotejo): { tipo: Resultado; diferencias: number } {
    if (!c.sistema) return { tipo: "sin-coincidencia", diferencias: 0 };
    if (c.sistema.vinculadaA) return { tipo: "ya-vinculada", diferencias: 0 };
    const filas = comparar(c);
    const datos = filas.slice(0, 3).filter((f) => !f.coincide).length;
    if (datos > 0) return { tipo: "diferencias", diferencias: datos };
    if (c.sistema.vencida) return { tipo: "vencida", diferencias: 0 };
    if (!filas[4].coincide) return { tipo: "diferencias", diferencias: 1 };
    return { tipo: "coincide", diferencias: 0 };
}

export function textoResultado(c: Cotejo) {
    const r = resultadoDe(c);
    return {
        coincide: { texto: "Coincide", tono: "verde" as const },
        diferencias: { texto: r.diferencias === 1 ? "1 diferencia" : `${r.diferencias} diferencias`, tono: "guinda" as const },
        vencida: { texto: "Credencial vencida", tono: "dorado" as const },
        "sin-coincidencia": { texto: "Sin coincidencia", tono: "guinda" as const },
        "ya-vinculada": { texto: "Ya vinculada", tono: "dorado" as const },
    }[r.tipo];
}

// ---------- Acciones ----------
function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

// Consultar el sistema de la biblioteca. ?simular=sin-sistema lo hace fallar.
export function sistemaDisponible() {
    return simulacion() !== "sin-sistema";
}

function resolver(folio: string, estado: EstadoCotejo, detalle: string) {
    const c = obtenerCotejo(folio);
    if (!c || c.estado !== "pendiente") throw new Error("Este cotejo ya se resolvió.");
    lista = lista.map((x) => (x.folio === folio ? { ...x, estado, resolucion: { quien: QUIEN_COTEJA, fecha: new Date().toISOString().slice(0, 10), detalle } } : x));
    avisar();
}

// Solo se vincula si todo coincide
export function vincular(folio: string) {
    const c = obtenerCotejo(folio);
    if (!c || resultadoDe(c).tipo !== "coincide") throw new Error("Solo se vincula cuando todos los datos coinciden.");
    resolver(folio, "vinculada", "Todos los datos coinciden.");
}

export function pedirCorreccion(folio: string, datos: string, mensaje: string) {
    if (!datos || !mensaje.trim()) throw new Error("Indica qué corregir y el mensaje.");
    resolver(folio, "correccion", `${datos}: ${mensaje.trim()}`);
}

export function rechazarVinculo(folio: string, motivo: string) {
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    resolver(folio, "rechazada", motivo.trim());
}

export function avisarRenovacion(folio: string) {
    const c = obtenerCotejo(folio);
    if (!c || resultadoDe(c).tipo !== "vencida") throw new Error("Solo aplica a credenciales vencidas.");
    resolver(folio, "aviso", "Se avisó que debe renovar su credencial.");
}

export type FiltroCotejo = "pendientes" | "diferencias" | "vencidas" | "resueltos";
export function enFiltroCotejo(c: Cotejo, f: FiltroCotejo) {
    if (f === "resueltos") return c.estado !== "pendiente";
    if (c.estado !== "pendiente") return false;
    if (f === "diferencias") return ["diferencias", "sin-coincidencia", "ya-vinculada"].includes(resultadoDe(c).tipo);
    if (f === "vencidas") return resultadoDe(c).tipo === "vencida";
    return true;
}

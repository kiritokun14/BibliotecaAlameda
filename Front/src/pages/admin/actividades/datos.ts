import { useSyncExternalStore } from "react";
import { leerSalas, obtenerSala } from "./salas";

// Datos SIMULADOS de Actividades. Viven en memoria y se reinician al recargar.
// TODO backend: GET/POST/PATCH /actividades. Requiere registrar_resoluciones_actividades.

// borrador → en-revision → aprobada → publicada; cualquiera → archivada; publicada → cancelada
export type EstadoActividad = "borrador" | "en-revision" | "aprobada" | "publicada" | "cancelada" | "archivada";

export const NOMBRE_ESTADO_ACTIVIDAD: Record<EstadoActividad, string> = {
    borrador: "Borrador",
    "en-revision": "En revisión",
    aprobada: "Aprobada",
    publicada: "Publicada",
    cancelada: "Cancelada",
    archivada: "Archivada",
};

export const TIPOS_ACTIVIDAD = ["Taller", "Club", "Charla", "Visita", "Cuentacuentos", "Presentación", "Exposición"];
export const PUBLICOS = ["Público en general", "Niñez (6 a 10 años)", "Juventud (11 a 17 años)", "Personas adultas", "Personas mayores", "Escuelas"];

// Las salas viven en salas.ts (se pueden editar). "Toda la biblioteca" es para visitas y exposiciones.
export const TODA_LA_BIBLIOTECA = { nombre: "Toda la biblioteca", capacidad: 40 };

export function espacios() {
    return [...leerSalas().salas.filter((s) => s.habilitada), TODA_LA_BIBLIOTECA];
}

export function capacidadDe(espacio: string) {
    return espacio === TODA_LA_BIBLIOTECA.nombre ? TODA_LA_BIBLIOTECA.capacidad : obtenerSala(espacio)?.capacidad;
}

export type DatosActividad = {
    nombre: string;
    tipo: string;
    descripcion: string;
    fecha: string; // YYYY-MM-DD
    inicio: string; // HH:MM
    fin: string;
    espacio: string;
    cupo: string; // texto del campo; se valida como número
    inscripcion: boolean;
    publico: string;
    responsable: string;
    materiales: string;
};

export type Actividad = DatosActividad & {
    folio: string; // AC-0108
    estado: EstadoActividad;
    actualizado: string; // ISO
    autorizo?: { quien: string; fecha: string };
    publicadaEl?: string; // ISO
    archivo?: { motivo: string; fecha: string };
    inscritos: number;
    espera: number;
};

export const VACIA: DatosActividad = {
    nombre: "", tipo: "Taller", descripcion: "", fecha: "", inicio: "", fin: "", espacio: "", cupo: "",
    inscripcion: true, publico: "Público en general", responsable: "", materiales: "",
};

// ---------- Ejemplos ----------
function ejemplo(folio: string, estado: EstadoActividad, d: Partial<DatosActividad>, extra: Partial<Actividad> = {}): Actividad {
    return {
        ...VACIA, responsable: "Personal de Fomento a la lectura (ejemplo)", ...d,
        folio, estado, actualizado: "2026-10-20T10:00:00", inscritos: 0, espera: 0, ...extra,
    };
}
const coordinacion = { quien: "Coordinación (ejemplo)", fecha: "2026-10-20T10:00:00" };

const iniciales: Actividad[] = [
    ejemplo("AC-0108", "publicada", {
        nombre: "Taller de lectura en voz alta", tipo: "Taller", fecha: "2026-11-12", inicio: "16:00", fin: "17:00", espacio: "Sala infantil", cupo: "20",
        publico: "Niñez (6 a 10 años)", descripcion: "Lectura en voz alta para niñas y niños de 6 a 10 años, con actividades de dibujo.",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-22T12:10:00", inscritos: 18, espera: 2 }),
    ejemplo("AC-0107", "en-revision", {
        nombre: "Club de lectura: cuentos nayaritas", tipo: "Club", fecha: "2026-11-14", inicio: "17:00", fin: "18:30", espacio: "Sala de lectura", cupo: "15",
        publico: "Personas adultas", descripcion: "Club mensual para leer y comentar cuentos de autoras y autores de Nayarit (ejemplo).",
    }),
    ejemplo("AC-0106", "aprobada", {
        nombre: "Charla: historia de Tepic", tipo: "Charla", fecha: "2026-11-19", inicio: "18:00", fin: "19:30", espacio: "Auditorio", cupo: "60",
        descripcion: "Charla abierta sobre la historia de Tepic, con imágenes y testimonios (ejemplo).",
    }, { autorizo: coordinacion }),
    ejemplo("AC-0105", "borrador", {
        nombre: "Visita guiada escolar", tipo: "Visita", fecha: "2026-11-21", inicio: "10:00", fin: "11:30", espacio: "Toda la biblioteca", cupo: "30",
        publico: "Escuelas", descripcion: "Recorrido por las salas para grupos escolares (ejemplo).",
    }),
    ejemplo("AC-0104", "cancelada", {
        nombre: "Cuentacuentos de otoño", tipo: "Taller", fecha: "2026-10-24", inicio: "11:00", fin: "12:00", espacio: "Sala infantil", cupo: "25",
        publico: "Niñez (6 a 10 años)", descripcion: "Cuentos de temporada para la niñez (ejemplo).",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-01T09:00:00", inscritos: 12 }),
    ejemplo("AC-0103", "publicada", {
        nombre: "Taller de encuadernación", tipo: "Taller", fecha: "2026-11-26", inicio: "16:00", fin: "18:00", espacio: "Sala de lectura", cupo: "12",
        publico: "Personas adultas", descripcion: "Aprende a encuadernar una libreta a mano (ejemplo).", materiales: "Traer tijeras y regla.",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-18T10:00:00", inscritos: 12, espera: 4 }),
    ejemplo("AC-0102", "en-revision", {
        nombre: "Presentación de libro: voces de la sierra", tipo: "Presentación", fecha: "2026-11-28", inicio: "18:00", fin: "19:00", espacio: "Auditorio", cupo: "60",
        descripcion: "Presentación con la participación de la autora (ejemplo).", inscripcion: false,
    }),
    ejemplo("AC-0101", "publicada", {
        nombre: "Club de cómputo para personas mayores", tipo: "Club", fecha: "2026-11-05", inicio: "10:00", fin: "11:30", espacio: "Sala de cómputo", cupo: "15",
        publico: "Personas mayores", descripcion: "Uso básico de la computadora y del correo electrónico (ejemplo).",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-10T10:00:00", inscritos: 9 }),
    // Actividades ya realizadas (para Asistencia e Inscripciones "Pasadas")
    ejemplo("AC-0099", "publicada", {
        nombre: "Taller de dibujo", tipo: "Taller", fecha: "2026-10-20", inicio: "16:00", fin: "17:30", espacio: "Sala infantil", cupo: "15",
        publico: "Niñez (6 a 10 años)", descripcion: "Taller de dibujo con cuentos (ejemplo).",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-05T10:00:00", inscritos: 15 }),
    ejemplo("AC-0098", "publicada", {
        nombre: "Club de lectura", tipo: "Club", fecha: "2026-10-27", inicio: "09:00", fin: "10:30", espacio: "Sala de lectura", cupo: "15",
        publico: "Personas adultas", descripcion: "Club de lectura de los martes (ejemplo).",
    }, { autorizo: coordinacion, publicadaEl: "2026-10-12T10:00:00", inscritos: 12 }),
    ejemplo("AC-0100", "borrador", {
        nombre: "Exposición: fotografías del archivo", tipo: "Exposición", fecha: "2026-12-03", inicio: "09:00", fin: "18:00", espacio: "Toda la biblioteca", cupo: "40",
        descripcion: "Selección de fotografías del archivo histórico (ejemplo).", inscripcion: false,
    }),
];

// ---------- Almacén en memoria ----------
let lista: Actividad[] = iniciales;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useActividades(): Actividad[] {
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

export function obtenerActividad(folio: string | undefined) {
    return lista.find((a) => a.folio === folio);
}

export function actualizarActividad(folio: string, cambios: Partial<Actividad>) {
    lista = lista.map((a) => (a.folio === folio ? { ...a, ...cambios, actualizado: new Date().toISOString() } : a));
    avisar();
}

export function reiniciarActividades(nueva: Actividad[] = iniciales) {
    lista = nueva;
    avisar();
}

export function crearActividad(datos: DatosActividad, estado: "borrador" | "en-revision"): string {
    const mayor = Math.max(0, ...lista.map((a) => Number(a.folio.replace(/\D/g, ""))));
    const folio = `AC-${String(mayor + 1).padStart(4, "0")}`;
    lista = [{ ...datos, folio, estado, actualizado: new Date().toISOString(), inscritos: 0, espera: 0 }, ...lista];
    avisar();
    return folio;
}

// ---------- Validación ----------
// Para enviar a revisión o guardar cambios. Guardar borrador solo exige el nombre.
export function validarActividad(d: DatosActividad, soloBorrador = false): Partial<Record<keyof DatosActividad, string>> {
    const e: Partial<Record<keyof DatosActividad, string>> = {};
    if (!d.nombre.trim()) e.nombre = "Escribe el nombre de la actividad.";
    if (soloBorrador) return e;
    if (!d.tipo) e.tipo = "Elige el tipo de actividad.";
    if (!d.descripcion.trim()) e.descripcion = "Agrega una descripción corta.";
    if (!d.fecha) e.fecha = "Elige la fecha.";
    if (!d.inicio) e.inicio = "Elige la hora de inicio.";
    if (!d.fin) e.fin = "Elige la hora de fin.";
    else if (d.inicio && d.fin <= d.inicio) e.fin = "La hora de fin debe ser posterior al inicio.";
    if (!d.espacio) e.espacio = "Elige el espacio.";
    const cupo = Number(d.cupo);
    const maximo = capacidadDe(d.espacio);
    if (!d.cupo.trim()) e.cupo = "Escribe el cupo máximo.";
    else if (!Number.isInteger(cupo) || cupo < 1) e.cupo = "El cupo debe ser un número entero mayor que 0.";
    else if (maximo && cupo > maximo) e.cupo = `Máximo ${maximo} personas en este espacio.`;
    if (!d.responsable.trim()) e.responsable = "Escribe quién es responsable.";
    return e;
}

// ---------- Acciones simuladas ----------
// En desarrollo: ?simular=error-publicar hace fallar la publicación para ver el aviso.
function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// TODO backend: POST /actividades/:folio/publicar. Solo lo aprobado se publica.
export async function publicarActividad(folio: string) {
    await espera(400);
    if (simulacion() === "error-publicar") throw new Error("No se pudo publicar");
    const a = obtenerActividad(folio);
    if (!a || a.estado !== "aprobada") throw new Error("Solo se publica una actividad aprobada.");
    actualizarActividad(folio, { estado: "publicada", publicadaEl: new Date().toISOString() });
}

// TODO backend: POST /actividades/:folio/archivar
export function archivarActividad(folio: string, motivo: string) {
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    const a = obtenerActividad(folio);
    if (!a || a.estado === "publicada") throw new Error("Una actividad publicada se cancela desde Cambios y cancelaciones.");
    actualizarActividad(folio, { estado: "archivada", archivo: { motivo: motivo.trim(), fecha: new Date().toISOString() } });
}

// ---------- Listado y formatos ----------
export type FiltroActividad = "todas" | EstadoActividad;

export function filtrarActividades(actividades: Actividad[], filtro: FiltroActividad, busqueda: string) {
    const texto = busqueda.trim().toLowerCase();
    return actividades
        .filter((a) => (filtro === "todas" ? a.estado !== "archivada" : a.estado === filtro))
        .filter((a) => !texto || a.folio.toLowerCase().includes(texto) || a.nombre.toLowerCase().includes(texto))
        .sort((a, b) => b.folio.localeCompare(a.folio));
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-11-12" → "12 nov 2026"
export function fechaCorta(texto: string) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto || "Por definir";
    const [a, m, d] = texto.slice(0, 10).split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${a}`;
}

export function horario(a: DatosActividad) {
    return `${fechaCorta(a.fecha)} · ${a.inicio || "--:--"} a ${a.fin || "--:--"}`;
}

export function datosDe(a: Actividad): DatosActividad {
    const { nombre, tipo, descripcion, fecha, inicio, fin, espacio, cupo, inscripcion, publico, responsable, materiales } = a;
    return { nombre, tipo, descripcion, fecha, inicio, fin, espacio, cupo, inscripcion, publico, responsable, materiales };
}

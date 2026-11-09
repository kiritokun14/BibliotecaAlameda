import { useSyncExternalStore } from "react";
// T-052 · Agenda pública: listado y filtros de actividades (Figma A-02, 476:11136).
// TODO backend: GET /actividades?categoria=&desde=&hasta= con id, categoría, título, fecha (AAAA-MM-DD),
// horario, lugar, público, cupo completo y si la actividad fue cancelada. Mientras, se usan los ejemplos de Figma.
import foto from "../../../assets/comun/fotos/noticia-3.jpg";
import type { Actividad } from "../inicio/datos";

export type Categoria = "taller" | "club" | "visita" | "evento";
export const nombreCategoria: Record<Categoria, string> = {
    taller: "TALLER", club: "CLUB DE LECTURA", visita: "VISITA GUIADA", evento: "EVENTO",
};

export type FiltroCategoria = "todas" | Categoria;
export const filtrosCategoria: { valor: FiltroCategoria; texto: string }[] = [
    { valor: "todas", texto: "Todas" }, { valor: "taller", texto: "Talleres" }, { valor: "club", texto: "Club de lectura" },
    { valor: "visita", texto: "Visitas guiadas" }, { valor: "evento", texto: "Eventos" },
];

export type ActividadAgenda = {
    id: string; categoria: Categoria; titulo: string; fecha: string; // AAAA-MM-DD
    horario: string; lugar: string; publico: string; cupoCompleto?: boolean; imagen: string;
    resumen?: string; descripcion?: string[];          // texto del encabezado y «Sobre la actividad»
    cupo?: { total: number; ocupados: number };       // TODO backend: cupo real
    cancelada?: boolean;
};

export const agendaEjemplo: ActividadAgenda[] = [
    { id: "agenda-escritura", categoria: "taller", titulo: "Taller de escritura creativa", fecha: "2026-11-14", horario: "10:00 a 12:00", lugar: "Sala de talleres", publico: "Jóvenes y adultos", imagen: foto,
        resumen: "Una mañana para escribir sin prisa, con ejercicios guiados y lectura en voz alta.",
        descripcion: [
            "Un taller para jóvenes y adultos que quieren escribir con regularidad. Cada sesión combina ejercicios breves, escritura libre y lectura en voz alta.",
            "No necesitas experiencia previa. Basta con venir con ganas de escribir; el material se proporciona en la sala.",
        ],
        cupo: { total: 20, ocupados: 12 } },
    { id: "agenda-circulo", categoria: "club", titulo: "Círculo de lectura", fecha: "2026-11-14", horario: "12:00 a 13:30", lugar: "Sala de lectura", publico: "Público general", imagen: foto },
    { id: "agenda-visita", categoria: "visita", titulo: "Visita guiada para grupos", fecha: "2026-11-18", horario: "11:00 a 12:00", lugar: "Entrada principal", publico: "Grupos escolares", imagen: foto },
    { id: "agenda-cuentacuentos", categoria: "evento", titulo: "Tarde de cuentacuentos", fecha: "2026-11-20", horario: "17:00 a 18:00", lugar: "Parque Alameda", publico: "Familias", imagen: foto },
    { id: "agenda-dibujo", categoria: "taller", titulo: "Iniciación al dibujo", fecha: "2026-11-21", horario: "10:00 a 12:00", lugar: "Sala de talleres", publico: "Todo público", cupoCompleto: true, imagen: foto, cupo: { total: 20, ocupados: 20 } },
    { id: "agenda-tertulia", categoria: "club", titulo: "Tertulia mensual", fecha: "2026-11-22", horario: "12:00 a 13:30", lugar: "Sala de lectura", publico: "Público general", imagen: foto },
    // Pasadas (octubre)
    { id: "agenda-poesia", categoria: "taller", titulo: "Taller de poesía", fecha: "2026-10-03", horario: "10:00 a 12:00", lugar: "Sala de talleres", publico: "Jóvenes y adultos", imagen: foto },
    { id: "agenda-libro-regional", categoria: "evento", titulo: "Presentación de libro regional", fecha: "2026-10-08", horario: "18:00 a 19:30", lugar: "Auditorio", publico: "Público general", imagen: foto },
    { id: "agenda-feria", categoria: "evento", titulo: "Feria del libro infantil", fecha: "2026-10-17", horario: "11:00 a 15:00", lugar: "Parque Alameda", publico: "Familias", imagen: foto },
    { id: "agenda-visita-escuelas", categoria: "visita", titulo: "Visita guiada para escuelas", fecha: "2026-10-21", horario: "10:00 a 11:30", lugar: "Entrada principal", publico: "Grupos escolares", imagen: foto },
    { id: "agenda-ajedrez", categoria: "club", titulo: "Club de ajedrez y lectura", fecha: "2026-10-24", horario: "16:00 a 17:30", lugar: "Sala de lectura", publico: "Jóvenes y adultos", imagen: foto },
    { id: "agenda-circulo-oct", categoria: "club", titulo: "Círculo de lectura", fecha: "2026-10-31", horario: "12:00 a 13:30", lugar: "Sala de lectura", publico: "Público general", imagen: foto },
];

// TODO backend: inscripciones de la persona con sesión (ids de actividad). Ejemplo: el taller de escritura.
export const inscritasEjemplo = new Set(["agenda-escritura"]);

// Próximas a partir de hoy, ordenadas por fecha; la primera es la destacada.
export function proximas(lista: ActividadAgenda[], hoy: string, filtro: FiltroCategoria = "todas") {
    return lista
        .filter((a) => a.fecha >= hoy && (filtro === "todas" || a.categoria === filtro))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horario.localeCompare(b.horario));
}

const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// "2026-11-14" → { dia: "14", mes: "NOV" }
export function fechaCaja(fecha: string) {
    const [, mes, dia] = fecha.split("-").map(Number);
    return { dia: String(dia), mes: meses[mes - 1] ?? "" };
}
// "2026-11-14" → "Sáb 14 nov" (mismo formato que usa la página de detalle)
export function fechaTexto(fecha: string) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const semana = diasSemana[new Date(anio, mes - 1, dia).getDay()];
    return `${semana} ${dia} ${(meses[mes - 1] ?? "").toLowerCase()}`;
}

// La página de detalle (/eventos/:id) trabaja con el tipo Actividad de Inicio.
export function comoActividad(a: ActividadAgenda): Actividad {
    const tipo = a.categoria === "taller" ? "Taller" : a.categoria === "evento" ? "Agenda cultural" : "Actividad";
    return { id: a.id, tipo, titulo: a.titulo, fecha: fechaTexto(a.fecha), horario: `${a.horario} h`, publico: a.publico, imagen: a.imagen };
}

// En ejemplos, «hoy» es el 3 de noviembre de 2026 para que siempre haya próximas y pasadas.
// TODO backend: con datos reales usar siempre hoyLocal().
export const HOY_EJEMPLO = "2026-11-03";

// Fecha de hoy en AAAA-MM-DD (hora local).
export function hoyLocal(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- «Todas las actividades»: búsqueda, filtros y agrupado por mes ----------
export const nombreCorto: Record<Categoria, string> = { taller: "Taller", club: "Club de lectura", visita: "Visita guiada", evento: "Evento" };
export type Disponibilidad = "abierta" | "cupo" | "inscrito";
export type Horario = "todo" | "manana" | "tarde";
export type FiltrosAgenda = { texto: string; fecha: string | null; categoria: FiltroCategoria; disponibilidad: Disponibilidad | null; horario: Horario };
export const filtrosVacios: FiltrosAgenda = { texto: "", fecha: null, categoria: "todas", disponibilidad: null, horario: "todo" };

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export type EstadoActividad = "abierta" | "cupo" | "finalizada";
export function estadoActividad(a: ActividadAgenda, hoy: string): EstadoActividad {
    if (a.fecha < hoy) return "finalizada";
    return a.cupoCompleto ? "cupo" : "abierta";
}

export function filtrarTodas(lista: ActividadAgenda[], f: FiltrosAgenda, hoy: string, inscritas: Set<string> = inscritasEjemplo) {
    const texto = sinAcentos(f.texto.trim());
    return lista.filter((a) => {
        if (texto && !sinAcentos(`${a.titulo} ${nombreCorto[a.categoria]} ${a.lugar}`).includes(texto)) return false;
        if (f.fecha && a.fecha !== f.fecha) return false;
        if (f.categoria !== "todas" && a.categoria !== f.categoria) return false;
        if (f.disponibilidad === "inscrito" && !inscritas.has(a.id)) return false;
        if (f.disponibilidad === "abierta" && estadoActividad(a, hoy) !== "abierta") return false;
        if (f.disponibilidad === "cupo" && estadoActividad(a, hoy) !== "cupo") return false;
        const inicio = Number(a.horario.slice(0, 2));
        if (f.horario === "manana" && inicio >= 14) return false;
        if (f.horario === "tarde" && inicio < 14) return false;
        return true;
    });
}

const mesesLargos = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export type GrupoMes = { clave: string; titulo: string; pasado: boolean; actividades: ActividadAgenda[] };
// Meses del más reciente al más antiguo; dentro de cada mes, por fecha. «pasado» = el mes ya terminó o todas sus actividades pasaron.
export function agruparPorMes(lista: ActividadAgenda[], hoy: string): GrupoMes[] {
    const grupos = new Map<string, ActividadAgenda[]>();
    for (const a of [...lista].sort((x, y) => x.fecha.localeCompare(y.fecha) || x.horario.localeCompare(y.horario))) {
        const clave = a.fecha.slice(0, 7);
        grupos.set(clave, [...(grupos.get(clave) ?? []), a]);
    }
    return [...grupos.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([clave, actividades]) => {
        const [anio, mes] = clave.split("-").map(Number);
        return { clave, titulo: `${mesesLargos[mes - 1]} ${anio}`, pasado: actividades.every((a) => a.fecha < hoy), actividades };
    });
}

// ---------- Calendario (Figma A-02, 476:11442) ----------
export type DiaCalendario = { fecha: string; numero: number; delMes: boolean; actividades: ActividadAgenda[] };

const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Semanas de lunes a domingo que cubren el mes (mes de 1 a 12), con los días de los meses vecinos para completar.
export function semanasDelMes(anio: number, mes: number, lista: ActividadAgenda[] = []): DiaCalendario[][] {
    const primero = new Date(anio, mes - 1, 1);
    const inicio = new Date(primero);
    inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // retrocede hasta el lunes
    const fin = new Date(anio, mes, 0); // último día del mes
    fin.setDate(fin.getDate() + ((7 - fin.getDay()) % 7)); // avanza hasta el domingo
    const semanas: DiaCalendario[][] = [];
    for (const dia = new Date(inicio); dia <= fin; dia.setDate(dia.getDate() + 1)) {
        if (dia.getDay() === 1) semanas.push([]);
        const fecha = aTexto(dia);
        semanas[semanas.length - 1].push({
            fecha, numero: dia.getDate(), delMes: dia.getMonth() === mes - 1,
            actividades: lista.filter((a) => a.fecha === fecha).sort((x, y) => x.horario.localeCompare(y.horario)),
        });
    }
    return semanas;
}

export function moverMes(anio: number, mes: number, paso: number) {
    const d = new Date(anio, mes - 1 + paso, 1);
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export const nombreMes = (mes: number) => mesesLargos[mes - 1];

const diasLargos = ["DOMINGO", "LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO"];
// "2026-11-14" → { semana: "SÁBADO", texto: "14 de noviembre" }
export function diaLargo(fecha: string) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return { semana: diasLargos[new Date(anio, mes - 1, dia).getDay()], texto: `${dia} de ${mesesLargos[mes - 1].toLowerCase()}` };
}

// Día que se muestra al abrir el mes: el primero con actividades desde hoy; si no hay, el primero con actividades.
export function diaInicial(semanas: DiaCalendario[][], hoy: string) {
    const dias = semanas.flat().filter((d) => d.delMes && d.actividades.length);
    return (dias.find((d) => d.fecha >= hoy) ?? dias[0])?.fecha ?? null;
}

// ---------- Inscripción con sesión (Figma 476:11794 a 476:12925) ----------
// TODO backend: POST /actividades/{id}/inscripcion y DELETE para cancelar. Mientras, viven en esta pestaña.
const oyentesInscripcion = new Set<() => void>();
const avisar = () => oyentesInscripcion.forEach((o) => o());
// Lista de espera (Figma «Estados del sistema» 585:53816 a 585:54252). TODO backend: POST/DELETE /actividades/{id}/lista-espera
// y aviso cuando se libera un lugar (24 horas para confirmarlo). En ejemplos, al anotarte quedas en el lugar 3.
const enEspera = new Map<string, number>();
export const inscripciones = {
    tiene: (id: string) => inscritasEjemplo.has(id),
    inscribir(id: string) { inscritasEjemplo.add(id); enEspera.delete(id); avisar(); },
    cancelar(id: string) { inscritasEjemplo.delete(id); avisar(); },
    lugarEnEspera: (id: string) => enEspera.get(id) ?? null,
    anotarEnEspera(id: string) { enEspera.set(id, 3); avisar(); },
    salirDeEspera(id: string) { enEspera.delete(id); avisar(); },
    suscribir(o: () => void) { oyentesInscripcion.add(o); return () => { oyentesInscripcion.delete(o); }; },
};

export function obtenerActividad(id: string | undefined) {
    return agendaEjemplo.find((a) => a.id === id) ?? null;
}

export function textoCupo(a: ActividadAgenda, inscrito: boolean) {
    if (inscrito) return "Tu lugar: 1";
    if (!a.cupo) return a.cupoCompleto ? "Completo" : "Por confirmar";
    const libres = a.cupo.total - a.cupo.ocupados;
    if (libres <= 0 || a.cupoCompleto) return `Completo · ${a.cupo.ocupados} de ${a.cupo.total}`;
    return `${libres} ${libres === 1 ? "lugar disponible" : "lugares disponibles"}`;
}

// «Sábado 14 de noviembre»
export function fechaCompleta(fecha: string) {
    const { semana, texto } = diaLargo(fecha);
    return `${semana.charAt(0)}${semana.slice(1).toLowerCase()} ${texto}`;
}

export function useInscripcion(id: string) {
    return useSyncExternalStore(inscripciones.suscribir, () => inscripciones.tiene(id), () => inscripciones.tiene(id));
}

export function useLugarEnEspera(id: string) {
    return useSyncExternalStore(inscripciones.suscribir, () => inscripciones.lugarEnEspera(id), () => inscripciones.lugarEnEspera(id));
}

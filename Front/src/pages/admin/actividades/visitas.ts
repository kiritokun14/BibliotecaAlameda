import { useSyncExternalStore } from "react";

// Visitas de grupos y registro de uso de espacios, SIMULADOS. Se reinician al recargar.
// TODO backend: GET/PATCH /visitas (solicitudes del portal "Agenda de espacios") y GET/POST/PATCH /usos-espacio

export type EstadoVisita = "por-confirmar" | "propuesta" | "confirmada" | "realizada" | "cancelada" | "rechazada";

export const NOMBRE_ESTADO_VISITA: Record<EstadoVisita, string> = {
    "por-confirmar": "Por confirmar",
    propuesta: "Propuesta enviada",
    confirmada: "Confirmada",
    realizada: "Realizada",
    cancelada: "Cancelada",
    rechazada: "Rechazada",
};

export type Visita = {
    folio: string; // VS-0041
    grupo: string;
    descripcion: string; // "Solicitud de visita guiada de un grupo escolar."
    personas: number;
    detallePersonas: string; // "26 estudiantes y 2 docentes"
    fecha: string; // YYYY-MM-DD
    hora: string;
    espacio: string;
    contacto: string;
    comentarios: string;
    recibida: string; // YYYY-MM-DD
    responderAntes: string;
    estado: EstadoVisita;
    confirmacion?: { fecha: string; hora: string; duracion: string; espacio: string; guia: string; mensaje: string };
    propuesta?: { opcion1: string; opcion2: string; motivo: string };
    rechazo?: { motivo: string; fecha: string };
};

export type EstadoUso = "registrado" | "por-registrar";

export type UsoEspacio = {
    id: string; // US-0012
    sala: string;
    fecha: string;
    actividad: string;
    personas: string;
    horas: string;
    incidencias: string;
    estado: EstadoUso;
    registro?: string; // quién registró
};

export const GUIAS = ["Personal de Servicios (ejemplo)", "Personal de Fomento a la lectura (ejemplo)", "Coordinación (ejemplo)"];
export const DURACIONES = ["1 hora", "1 hora 30 min", "2 horas", "3 horas"];

const visitasIniciales: Visita[] = [
    { folio: "VS-0041", grupo: "Primaria Amado Nervo (ejemplo)", descripcion: "Solicitud de visita guiada de un grupo escolar.", personas: 28, detallePersonas: "26 estudiantes y 2 docentes", fecha: "2026-11-05", hora: "10:00", espacio: "Sala de cómputo", contacto: "Docente responsable (ejemplo) · Tel. por confirmar", comentarios: "Primera visita del grupo; piden recorrido y taller breve.", recibida: "2026-10-24", responderAntes: "2026-10-30", estado: "por-confirmar" },
    { folio: "VS-0040", grupo: "Secundaria Técnica 12 (ejemplo)", descripcion: "Solicitud de recorrido por la biblioteca.", personas: 35, detallePersonas: "32 estudiantes y 3 docentes", fecha: "2026-11-04", hora: "09:00", espacio: "Toda la biblioteca", contacto: "Orientación escolar (ejemplo)", comentarios: "Quieren conocer la hemeroteca.", recibida: "2026-10-22", responderAntes: "2026-10-29", estado: "por-confirmar" },
    { folio: "VS-0039", grupo: "Preescolar Jardín Tepic (ejemplo)", descripcion: "Visita con cuentacuentos.", personas: 18, detallePersonas: "15 niñas y niños y 3 educadoras", fecha: "2026-10-29", hora: "10:30", espacio: "Sala infantil", contacto: "Dirección del jardín (ejemplo)", comentarios: "Necesitan sillas pequeñas.", recibida: "2026-10-15", responderAntes: "2026-10-20", estado: "confirmada", confirmacion: { fecha: "2026-10-29", hora: "10:30", duracion: "1 hora", espacio: "Sala infantil", guia: GUIAS[1], mensaje: "Los esperamos 10 minutos antes." } },
    { folio: "VS-0038", grupo: "Grupo de adultos mayores (ejemplo)", descripcion: "Visita y taller de lectura.", personas: 12, detallePersonas: "12 personas mayores", fecha: "2026-10-22", hora: "11:00", espacio: "Sala de lectura", contacto: "Casa de día (ejemplo)", comentarios: "Acceso con elevador.", recibida: "2026-10-08", responderAntes: "2026-10-12", estado: "realizada" },
    { folio: "VS-0037", grupo: "Bachillerato CBTIS (ejemplo)", descripcion: "Visita al auditorio.", personas: 40, detallePersonas: "38 estudiantes y 2 docentes", fecha: "2026-10-20", hora: "12:00", espacio: "Auditorio", contacto: "Docente responsable (ejemplo)", comentarios: "La escuela canceló por un evento interno.", recibida: "2026-10-05", responderAntes: "2026-10-10", estado: "cancelada" },
];

const usosIniciales: UsoEspacio[] = [
    { id: "US-0012", sala: "Sala infantil", fecha: "2026-10-27", actividad: "Taller de lectura", personas: "18", horas: "1.5", incidencias: "", estado: "registrado", registro: "Personal de Servicios (ejemplo)" },
    { id: "US-0011", sala: "Sala de lectura", fecha: "2026-10-27", actividad: "Club de lectura", personas: "12", horas: "2", incidencias: "", estado: "registrado", registro: "Personal de Servicios (ejemplo)" },
    { id: "US-0010", sala: "Auditorio", fecha: "2026-10-26", actividad: "Charla (ejemplo)", personas: "54", horas: "2", incidencias: "", estado: "por-registrar" },
    { id: "US-0009", sala: "Sala de cómputo", fecha: "2026-10-26", actividad: "Visita escolar", personas: "28", horas: "2", incidencias: "Falla del proyector 10 minutos (ejemplo).", estado: "registrado", registro: "Personal de Servicios (ejemplo)" },
];

type Estado = { visitas: Visita[]; usos: UsoEspacio[] };
let estado: Estado = { visitas: visitasIniciales, usos: usosIniciales };
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useVisitas(): Estado {
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

export function reiniciarVisitas() {
    estado = { visitas: visitasIniciales, usos: usosIniciales };
    avisar();
}

export const obtenerVisita = (folio: string | undefined) => estado.visitas.find((v) => v.folio === folio);
export const obtenerUso = (id: string | undefined) => estado.usos.find((u) => u.id === id);

function actualizarVisita(folio: string, cambios: Partial<Visita>) {
    estado = { ...estado, visitas: estado.visitas.map((v) => (v.folio === folio ? { ...v, ...cambios } : v)) };
    avisar();
}

function exigirPendiente(folio: string) {
    const v = obtenerVisita(folio);
    if (!v || (v.estado !== "por-confirmar" && v.estado !== "propuesta")) throw new Error("Solo se responde una solicitud pendiente.");
    return v;
}

// TODO backend: POST /visitas/:folio/confirmar (avisa al contacto)
export function confirmarVisita(folio: string, c: NonNullable<Visita["confirmacion"]>) {
    exigirPendiente(folio);
    if (!c.fecha || !c.hora || !c.espacio || !c.guia) throw new Error("Faltan datos de la visita.");
    actualizarVisita(folio, { estado: "confirmada", confirmacion: c, fecha: c.fecha, hora: c.hora, espacio: c.espacio });
}

// TODO backend: POST /visitas/:folio/propuesta
export function proponerFecha(folio: string, p: NonNullable<Visita["propuesta"]>) {
    exigirPendiente(folio);
    if (!p.opcion1 || !p.motivo.trim()) throw new Error("Falta la opción 1 o el motivo.");
    actualizarVisita(folio, { estado: "propuesta", propuesta: p });
}

// TODO backend: POST /visitas/:folio/rechazo
export function rechazarVisita(folio: string, motivo: string) {
    exigirPendiente(folio);
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    actualizarVisita(folio, { estado: "rechazada", rechazo: { motivo: motivo.trim(), fecha: new Date().toISOString() } });
}

// TODO backend: POST /usos-espacio o PATCH /usos-espacio/:id
export function guardarUso(datos: Omit<UsoEspacio, "id" | "estado">, id?: string): string {
    if (id && obtenerUso(id)) {
        estado = { ...estado, usos: estado.usos.map((u) => (u.id === id ? { ...u, ...datos, estado: "registrado" } : u)) };
        avisar();
        return id;
    }
    const mayor = Math.max(0, ...estado.usos.map((u) => Number(u.id.replace(/\D/g, ""))));
    const nuevo = `US-${String(mayor + 1).padStart(4, "0")}`;
    estado = { ...estado, usos: [{ ...datos, id: nuevo, estado: "registrado" }, ...estado.usos] };
    avisar();
    return nuevo;
}

export function validarUso(d: Pick<UsoEspacio, "sala" | "fecha" | "personas" | "horas">, capacidad?: number) {
    const e: Record<string, string> = {};
    if (!d.sala) e.sala = "Elige la sala.";
    if (!d.fecha) e.fecha = "Elige la fecha.";
    const p = Number(d.personas);
    if (!d.personas) e.personas = "Escribe cuántas personas asistieron.";
    else if (!Number.isInteger(p) || p < 0) e.personas = "Escribe un número entero.";
    else if (capacidad && p > capacidad) e.personas = `La sala admite hasta ${capacidad} personas.`;
    const h = Number(d.horas);
    if (!d.horas) e.horas = "Escribe las horas de uso.";
    else if (!(h > 0 && h <= 12)) e.horas = "Escribe entre 0.5 y 12 horas.";
    return e;
}

// Filtro de la bandeja: "Canceladas" junta canceladas y rechazadas; "Por confirmar" incluye propuestas enviadas
export type FiltroVisita = "todas" | "por-confirmar" | "confirmada" | "realizada" | "cancelada";
export function enFiltro(v: Visita, f: FiltroVisita) {
    if (f === "todas") return true;
    if (f === "por-confirmar") return v.estado === "por-confirmar" || v.estado === "propuesta";
    if (f === "cancelada") return v.estado === "cancelada" || v.estado === "rechazada";
    return v.estado === f;
}

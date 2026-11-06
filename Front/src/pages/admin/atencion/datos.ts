import { useSyncExternalStore } from "react";

// Datos SIMULADOS de Atención. Cuando exista el backend, estas listas
// vendrán de la API y actualizarSolicitud() hará la petición correspondiente.

// pendiente = por cotejar / por revisar
// observaciones = se pidió corrección o se propuso un cambio
export type Estado = "pendiente" | "observaciones" | "aprobada" | "rechazada";

export type Nota = { autor: string; cuando: string; texto: string };

// Lo que se guardó al decidir (o al pedir cambios)
export type Resolucion = {
    fecha: string;
    motivo?: string;
    mensaje?: string;
    condiciones?: string;
    cancelada?: boolean; // espacios: se canceló una solicitud ya aprobada
};

type Solicitud = {
    folio: string;
    persona: string;
    enviada: string; // "AAAA-MM-DD"
    estado: Estado;
    cotejo: boolean[]; // casillas marcadas de la lista de cotejo/revisión
    notas: Nota[];
    responsable: string;
    resolucion?: Resolucion;
};

export type Credencial = Solicitud & {
    tipoCuenta: "Adulta" | "Menor de edad";
    correo: string;
    telefono: string;
};

export type SolicitudEspacio = Solicitud & {
    area: string;
    fecha: string; // "AAAA-MM-DD" o "" si no la dio
    horario: string;
    personas: number;
    motivo: string;
    contacto: string;
};

export type Propuesta = Solicitud & {
    titulo: string;
    tipo: "Evento" | "Club";
    fecha: string;
    horario: string;
    participantes: number;
    publico: string;
    espacio: string;
    material: string;
    contacto: string;
    descripcion: string;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// "2026-10-20" -> "20 oct 2026"
export function formatearFecha(fecha: string) {
    if (!fecha) return "Por confirmar";
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return `${dia} ${MESES[mes - 1]} ${anio}`;
}

const notaEjemplo = (texto: string): Nota[] => [{ autor: "Administrador", cuando: "hoy (ejemplo)", texto }];

function credencial(numero: number, persona: number, enviada: string, estado: Estado, menor = false): Credencial {
    return {
        folio: `CRED-0${numero}`,
        persona: `Persona usuaria ${persona}`,
        enviada,
        estado,
        tipoCuenta: menor ? "Menor de edad" : "Adulta",
        correo: "nombre@ejemplo.mx",
        telefono: "(311) 000 0000 (ejemplo)",
        cotejo: [true, true, false, false],
        notas: notaEjemplo("Confirmar los datos antes de aprobar (ejemplo)."),
        responsable: "Yo (administrador)",
        resolucion: resolucionEjemplo(estado),
    };
}

function resolucionEjemplo(estado: Estado): Resolucion | undefined {
    if (estado === "aprobada") return { fecha: "Hoy (ejemplo)" };
    if (estado === "rechazada") {
        return {
            fecha: "Hoy (ejemplo)",
            motivo: "Datos incompletos (ejemplo)",
            mensaje: "Mensaje de ejemplo con la explicación del rechazo.",
        };
    }
    if (estado === "observaciones") {
        return { fecha: "23 oct 2026", mensaje: "Mensaje de ejemplo para la persona." };
    }
    return undefined;
}

const credenciales: Credencial[] = [
    credencial(406, 16, "2026-10-14", "aprobada"),
    credencial(407, 15, "2026-10-15", "rechazada"),
    credencial(408, 14, "2026-10-16", "aprobada", true),
    credencial(409, 13, "2026-10-17", "aprobada"),
    credencial(410, 12, "2026-10-18", "rechazada"),
    credencial(411, 11, "2026-10-18", "aprobada", true),
    credencial(412, 1, "2026-10-20", "pendiente"),
    credencial(413, 2, "2026-10-20", "pendiente", true),
    credencial(414, 8, "2026-10-20", "pendiente", true),
    credencial(415, 3, "2026-10-21", "pendiente"),
    credencial(416, 10, "2026-10-21", "rechazada"),
    credencial(417, 9, "2026-10-21", "aprobada", true),
    credencial(418, 4, "2026-10-22", "observaciones"),
    credencial(419, 5, "2026-10-22", "pendiente", true),
    credencial(420, 7, "2026-10-23", "aprobada", true),
    credencial(421, 6, "2026-10-23", "observaciones"),
];

function espacio(
    numero: number,
    persona: number,
    area: string,
    fecha: string,
    horario: string,
    personas: number,
    estado: Estado,
): SolicitudEspacio {
    return {
        folio: `VS-2026-0${numero}`,
        persona: `Persona usuaria ${persona}`,
        enviada: "2026-11-05",
        estado,
        area,
        fecha,
        horario,
        personas,
        motivo: "Taller de lectura (ejemplo)",
        contacto: "nombre@ejemplo.mx",
        cotejo: [true, true, false, true],
        notas: notaEjemplo("Confirmar con la agenda antes de aprobar (ejemplo)."),
        responsable: "Yo (administrador)",
        resolucion: resolucionEjemplo(estado),
    };
}

const USOS_MULTIPLES = "Área de usos múltiples (por confirmar)";
const SALA_LECTURA = "Sala de lectura (por confirmar)";
const SALA_INFANTIL = "Sala infantil (por confirmar)";

const espacios: SolicitudEspacio[] = [
    espacio(199, 11, SALA_LECTURA, "2026-10-28", "10:00 a 12:00", 10, "aprobada"),
    espacio(200, 10, USOS_MULTIPLES, "2026-10-30", "16:00 a 18:00", 40, "rechazada"),
    espacio(201, 5, USOS_MULTIPLES, "2026-11-05", "09:00 a 11:00", 30, "observaciones"),
    espacio(202, 9, SALA_INFANTIL, "2026-11-06", "11:00 a 12:00", 12, "aprobada"),
    espacio(203, 4, SALA_INFANTIL, "2026-11-07", "11:00 a 13:00", 20, "observaciones"),
    espacio(204, 8, SALA_LECTURA, "2026-11-09", "12:00 a 14:00", 6, "aprobada"),
    espacio(205, 7, USOS_MULTIPLES, "2026-11-10", "17:00 a 19:00", 25, "aprobada"),
    espacio(206, 6, SALA_LECTURA, "2026-11-11", "10:00 a 11:00", 4, "rechazada"),
    espacio(207, 1, USOS_MULTIPLES, "", "", 15, "pendiente"),
    espacio(208, 2, SALA_LECTURA, "2026-11-12", "10:00 a 12:00", 8, "pendiente"),
    espacio(209, 3, USOS_MULTIPLES, "2026-11-14", "16:00 a 18:00", 25, "pendiente"),
];

type DatosPropuesta = Pick<Propuesta, "titulo" | "tipo" | "fecha" | "participantes">;

function propuesta(numero: number, persona: number, datos: DatosPropuesta, estado: Estado): Propuesta {
    return {
        folio: `PR-${String(numero).padStart(4, "0")}`,
        persona: `Persona usuaria ${persona}`,
        enviada: "2026-10-18",
        estado,
        ...datos,
        horario: datos.fecha ? "17:00 a 19:00" : "",
        publico: "Público en general (ejemplo)",
        espacio: USOS_MULTIPLES,
        material: "Sillas y proyector (ejemplo)",
        contacto: "10 dígitos (ejemplo)",
        descripcion:
            "Encuentro para leer y comentar poesía de autores de la región, con espacio abierto para quienes quieran compartir sus textos. Texto de ejemplo.",
        cotejo: [true, false, false, false],
        notas: notaEjemplo("Confirmar con la agenda antes de aprobar (ejemplo)."),
        responsable: "Yo (administrador)",
        resolucion: resolucionEjemplo(estado),
    };
}

// fecha "" = cada semana / por confirmar
const propuestas: Propuesta[] = [
    propuesta(90, 11, { titulo: "Lectura en voz alta", tipo: "Evento", fecha: "2026-10-25", participantes: 15 }, "aprobada"),
    propuesta(91, 5, { titulo: "Club de ajedrez", tipo: "Club", fecha: "", participantes: 10 }, "observaciones"),
    propuesta(92, 10, { titulo: "Taller de origami", tipo: "Evento", fecha: "2026-11-02", participantes: 18 }, "rechazada"),
    propuesta(93, 9, { titulo: "Club de cine", tipo: "Club", fecha: "", participantes: 20 }, "aprobada"),
    propuesta(94, 4, { titulo: "Cuentacuentos de otoño", tipo: "Evento", fecha: "2026-11-10", participantes: 30 }, "observaciones"),
    propuesta(95, 8, { titulo: "Charla de historia local", tipo: "Evento", fecha: "2026-11-12", participantes: 40 }, "aprobada"),
    propuesta(96, 7, { titulo: "Intercambio de libros", tipo: "Evento", fecha: "2026-11-15", participantes: 25 }, "rechazada"),
    propuesta(97, 6, { titulo: "Club de escritura", tipo: "Club", fecha: "", participantes: 12 }, "pendiente"),
    propuesta(98, 1, { titulo: "Tertulia de poesía regional", tipo: "Evento", fecha: "", participantes: 20 }, "pendiente"),
    propuesta(99, 2, { titulo: "Club de lectura juvenil", tipo: "Club", fecha: "", participantes: 15 }, "pendiente"),
    propuesta(100, 3, { titulo: "Taller de ilustración", tipo: "Evento", fecha: "2026-11-18", participantes: 12 }, "pendiente"),
];

// ---------- Almacén en memoria ----------
// Así lo que apruebas o rechazas en el detalle se ve reflejado en la bandeja.

type Almacen = {
    credenciales: Credencial[];
    espacios: SolicitudEspacio[];
    propuestas: Propuesta[];
};

export type Area = keyof Almacen;

let almacen: Almacen = { credenciales, espacios, propuestas };
const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}

export function useSolicitudes<A extends Area>(area: A): Almacen[A] {
    return useSyncExternalStore(suscribir, () => almacen[area]);
}

export function actualizarSolicitud<A extends Area>(area: A, folio: string, cambios: Partial<Almacen[A][number]>) {
    const lista = almacen[area] as Almacen[A][number][];
    almacen = {
        ...almacen,
        [area]: lista.map((solicitud) => (solicitud.folio === folio ? { ...solicitud, ...cambios } : solicitud)),
    };
    oyentes.forEach((oyente) => oyente());
}

// Proponer una actividad (Figma A-02, 476:29028).
// TODO backend: POST /propuestas { tipo, titulo, descripcion, publico, participantes, fecha, horaInicio, horaFin, espacio,
// material, responsable, telefono } → folio; PATCH /propuestas/{id} para reenviar una corrección. La lista sale de GET /mis-solicitudes.
// Mientras, las propuestas nuevas viven solo en esta pestaña.

export type TipoPropuesta = "evento" | "club";
export type DatosPropuesta = {
    tipo: TipoPropuesta; titulo: string; descripcion: string; publico: string; participantes: string;
    fecha: string; horaInicio: string; horaFin: string; espacio: string; material: string;
    responsable: string; telefono: string; acepta: boolean;
};
export type ErroresPropuesta = Partial<Record<keyof DatosPropuesta, string>>;

// TODO backend: catálogo de públicos que defina la biblioteca.
export const publicos = ["Infancias", "Jóvenes", "Personas adultas", "Familias", "Todo público"];

export function propuestaVacia(responsable = "", telefono = ""): DatosPropuesta {
    return { tipo: "evento", titulo: "", descripcion: "", publico: "", participantes: "", fecha: "", horaInicio: "", horaFin: "",
        espacio: "", material: "", responsable, telefono, acepta: false };
}

export function validarPropuesta(d: DatosPropuesta, hoy: string): ErroresPropuesta {
    const e: ErroresPropuesta = {};
    if (!d.titulo.trim()) e.titulo = "Escribe el nombre de tu evento o club.";
    else if (d.titulo.trim().length > 150) e.titulo = "Usa 150 caracteres o menos.";
    if (!d.descripcion.trim()) e.descripcion = "Describe de qué trata y qué se hará.";
    else if (d.descripcion.trim().length > 1000) e.descripcion = "Usa 1000 caracteres o menos.";
    if (!d.publico) e.publico = "Elige el público.";
    const n = Number(d.participantes);
    if (!d.participantes || !Number.isInteger(n) || n < 1 || n > 500) e.participantes = "Escribe un número entre 1 y 500.";
    if (d.fecha && d.fecha < hoy) e.fecha = "Elige una fecha a partir de hoy.";
    if (d.horaInicio && d.horaFin && d.horaFin <= d.horaInicio) e.horaFin = "Debe ser después de la hora de inicio.";
    if (!d.responsable.trim()) e.responsable = "Escribe el nombre de la persona responsable.";
    if (!/^\d{10}$/.test(d.telefono.trim())) e.telefono = "Escribe un teléfono de 10 dígitos.";
    if (!d.acepta) e.acepta = "Confirma que entiendes que proponer no aprueba ni reserva.";
    return e;
}

export type EstadoPropuesta = "en-revision" | "con-observaciones" | "no-aprobada";
export type Propuesta = { id: string; folio: string | null; titulo: string; estado: EstadoPropuesta; observaciones?: string };

// Ejemplos de Figma («Propuesta con observaciones» y «Propuesta no aprobada»). Los ids coinciden con perfil/solicitudes.ts.
let propuestas: Propuesta[] = [
    { id: "p1", folio: "PR-0112", titulo: "Taller de encuadernación (ejemplo)", estado: "en-revision" },
    { id: "p2", folio: "PR-0098", titulo: "Tertulia de poesía regional", estado: "con-observaciones",
        observaciones: "Indica el cupo máximo y una fecha alternativa (ejemplo). Puedes corregir la propuesta y reenviarla." },
    { id: "p5", folio: "PR-0105", titulo: "Taller de fotografía (ejemplo)", estado: "no-aprobada" },
];

export const obtenerPropuesta = (id: string | undefined) => propuestas.find((p) => p.id === id) ?? null;

export function enviarPropuesta(d: DatosPropuesta): Propuesta {
    const nueva: Propuesta = { id: `pr-${Date.now()}`, folio: null, titulo: d.titulo.trim(), estado: "en-revision" };
    propuestas = [nueva, ...propuestas];
    return nueva;
}

export type Correccion = { cupo: string; fecha: string; comentarios: string };
export function validarCorreccion(c: Correccion, hoy: string) {
    const e: Partial<Record<keyof Correccion, string>> = {};
    const n = Number(c.cupo);
    if (!c.cupo || !Number.isInteger(n) || n < 1 || n > 500) e.cupo = "Escribe el cupo máximo (de 1 a 500).";
    if (c.fecha && c.fecha < hoy) e.fecha = "Elige una fecha a partir de hoy.";
    if (c.comentarios.length > 500) e.comentarios = "Usa 500 caracteres o menos.";
    return e;
}
export function reenviarPropuesta(id: string) {
    propuestas = propuestas.map((p) => (p.id === id ? { ...p, estado: "en-revision", observaciones: undefined } : p));
}

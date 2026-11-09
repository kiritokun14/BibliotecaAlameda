// Datos y validación del formulario de Aldahir; el envío se realiza mediante servicios/propuestasUsuario.ts.
export type TipoPropuesta = "evento" | "club";
export type DatosPropuesta = {
    tipo: TipoPropuesta; titulo: string; descripcion: string; publico: string; participantes: string;
    fecha: string; horaInicio: string; horaFin: string; espacio: string; material: string;
    responsable: string; telefono: string; acepta: boolean; abiertaAlPublico: boolean; sinFinesDeLucro: boolean;
};
export type ErroresPropuesta = Partial<Record<keyof DatosPropuesta, string>>;

// TODO backend: catálogo de públicos que defina la biblioteca.
export const publicos = ["Infancias", "Jóvenes", "Personas adultas", "Familias", "Todo público"];

export function propuestaVacia(responsable = "", telefono = ""): DatosPropuesta {
    return { tipo: "evento", titulo: "", descripcion: "", publico: "", participantes: "", fecha: "", horaInicio: "", horaFin: "",
        espacio: "", material: "", responsable, telefono, acepta: false, abiertaAlPublico: false, sinFinesDeLucro: false };
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
    if (!d.abiertaAlPublico) e.abiertaAlPublico = "Confirma que será abierta al público.";
    if (!d.sinFinesDeLucro) e.sinFinesDeLucro = "Confirma que será sin fines de lucro.";
    if (!!d.horaInicio !== !!d.horaFin) e.horaFin = "Indica tanto la hora de inicio como la de término.";
    return e;
}

// Datos y validación del formulario de Aldahir; el envío se realiza mediante servicios/propuestasUsuario.ts.
import type { SolicitudAtencion } from "../../../servicios/tramites";
import { adaptarPropuesta, leerDescripcionPropuesta } from "../../../servicios/propuestasUsuario";
import type { Etapa } from "../credencial/datos";
import type { PasoRuta } from "../credencial/piezas";
import { esDiaHabil, HORARIO } from "../espacios/datosSesion";

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

// La fecha y el horario son opcionales; si se indican, deben caer en el horario de la biblioteca (lunes a viernes,
// de 8:00 a 19:30 h), igual que las solicitudes de espacio (Aldahir, 20 nov 2026).
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
    else if (d.fecha && !esDiaHabil(d.fecha)) e.fecha = "La biblioteca abre de lunes a viernes; elige otro día.";
    if (d.horaInicio && d.horaInicio < HORARIO.abre) e.horaInicio = "La biblioteca abre a las 8:00.";
    else if (d.horaInicio && d.horaInicio >= HORARIO.cierra) e.horaInicio = "La biblioteca cierra a las 19:30.";
    if (d.horaInicio && d.horaFin && d.horaFin <= d.horaInicio) e.horaFin = "Debe ser después de la hora de inicio.";
    else if (d.horaFin && d.horaFin > HORARIO.cierra) e.horaFin = "Debe terminar a más tardar a las 19:30.";
    if (!d.responsable.trim()) e.responsable = "Escribe el nombre de la persona responsable.";
    if (!/^\d{10}$/.test(d.telefono.trim())) e.telefono = "Escribe un teléfono de 10 dígitos.";
    if (!d.acepta) e.acepta = "Confirma que entiendes que proponer no aprueba ni reserva.";
    if (!d.abiertaAlPublico) e.abiertaAlPublico = "Confirma que será abierta al público.";
    if (!d.sinFinesDeLucro) e.sinFinesDeLucro = "Confirma que será sin fines de lucro.";
    if (!!d.horaInicio !== !!d.horaFin) e.horaFin = "Indica tanto la hora de inicio como la de término.";
    return e;
}

// Para editar: el formulario se llena con lo que se envió. Los datos complementarios viajan como texto en la
// descripción (ver adaptarPropuesta), así que se leen de ahí; lo que diga «Por acordar» queda vacío.
const POR_ACORDAR = /^por acordar/i;
export function propuestaDesdeSolicitud(s: SolicitudAtencion): DatosPropuesta {
    const { texto, dato, material } = leerDescripcionPropuesta(s.descripcion);
    const fecha = dato("Fecha propuesta") || s.diasSolicitados || "";
    const horario = /^(\d{2}:\d{2}) a (\d{2}:\d{2})/.exec(s.horarioSolicitado ?? "");
    const espacio = s.necesidadEspacio ?? "";
    return {
        tipo: /club/i.test(s.tipoPropuesta ?? "") ? "club" : "evento",
        titulo: s.tituloPropuesta ?? "", descripcion: texto.trim(), publico: s.publicoDirigido ?? "",
        participantes: dato("Participantes estimados").replace(/\D/g, ""),
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : "",
        horaInicio: horario?.[1] ?? "", horaFin: horario?.[2] ?? "",
        espacio: POR_ACORDAR.test(espacio) ? "" : espacio,
        material,
        responsable: dato("Persona responsable"), telefono: dato("Teléfono de contacto").replace(/\D/g, ""),
        acepta: true, abiertaAlPublico: true, sinFinesDeLucro: true,
    };
}

// ---------- Trámite de una propuesta (plantilla C «Página de trámite», como Credencial y Espacios) ----------
// Dos pasos (Aldahir, 21 nov): la revisión la hace el personal y no es una pantalla; se ve en la ruta del seguimiento.
export const pasosPropuesta = ["Tu propuesta", "Seguimiento"];
export const rutasPropuesta = (id?: string) => ["/proponer", id ? `/proponer/${id}` : "/mi-perfil/propuestas"];

export type EstadoPropuesta = "borrador" | "en_revision" | "requiere_correccion" | "aprobada" | "rechazada" | "cancelada";
export const textosPropuesta: Record<EstadoPropuesta, { chip: string; color: "dorado" | "guinda" | "verde" | "gris"; titulo: string; texto: string }> = {
    borrador: { chip: "Borrador", color: "gris", titulo: "Tu propuesta está en borrador", texto: "Revisa los datos y envíala para que el personal la revise." },
    en_revision: { chip: "En revisión", color: "dorado", titulo: "Tu propuesta está en revisión", texto: "El personal revisa el espacio, las fechas y el material. Te avisaremos en tus notificaciones." },
    requiere_correccion: { chip: "Requiere cambios", color: "guinda", titulo: "El personal te pide algunos cambios", texto: "Lee sus observaciones, edita tu propuesta y vuelve a enviarla." },
    aprobada: { chip: "Aprobada", color: "verde", titulo: "Tu propuesta fue aprobada", texto: "La biblioteca la programará y la publicará en la agenda; te avisaremos cuando esté lista." },
    rechazada: { chip: "No aprobada", color: "guinda", titulo: "Tu propuesta no fue aprobada", texto: "Lee el motivo del personal. Puedes proponer otra actividad cuando quieras." },
    cancelada: { chip: "Cancelada", color: "gris", titulo: "Cancelaste esta propuesta", texto: "El personal ya no la revisará. Puedes proponer otra actividad cuando quieras." },
};
// Aprobada y con actividad ligada (publicar_propuesta llena «actividadId» al publicarla): ya está en la agenda.
export const propuestaPublicada = (s: SolicitudAtencion) => s.estadoRevision === "aprobada" && !!s.actividadId;
export const textoPublicada = { chip: "En la agenda", color: "verde" as const, titulo: "Tu propuesta ya está en la agenda",
    texto: "La biblioteca la programó y la publicó. Búscala en Actividades para inscribirte o compartirla." };
export const estadoDePropuesta = (s: SolicitudAtencion): EstadoPropuesta => {
    const e = s.estadoRevision ?? "en_revision";
    return (e in textosPropuesta ? e : "en_revision") as EstadoPropuesta;
};

// Editar y cancelar (Aldahir, 21 nov). Hoy la base solo deja corregir en borrador o con cambios pedidos y no tiene
// cancelar: TODO backend (PARA_BACKEND.md, punto 8). Cuando la base permita editar en revisión, pon esto en true.
export const EDITAR_EN_REVISION = false;
export const puedeEditar = (estado: EstadoPropuesta, simulada = false) =>
    estado === "borrador" || estado === "requiere_correccion" || (estado === "en_revision" && (EDITAR_EN_REVISION || simulada));
export const puedeCancelar = (estado: EstadoPropuesta) => estado === "borrador" || estado === "en_revision" || estado === "requiere_correccion";

export const pasosRutaPropuesta: PasoRuta[] = [
    { titulo: "Tu propuesta", texto: "Cuentas la idea, para quién y cuándo.", quien: "Tú" },
    { titulo: "Revisión", texto: "El personal revisa espacio, fechas y material.", quien: "Biblioteca" },
    { titulo: "Decisión", texto: "La aprueba, pide cambios o no la aprueba.", quien: "Biblioteca" },
    { titulo: "En la agenda", texto: "La biblioteca la programa y la publica.", quien: "Biblioteca" },
];
export function etapasPropuesta(estado: EstadoPropuesta, publicada = false): Etapa[] {
    if (publicada) return pasosRutaPropuesta.map((p) => ({ titulo: p.titulo, texto: p.texto, estado: "hecho" }));
    const actual = { borrador: 0, en_revision: 1, requiere_correccion: 2, aprobada: 3, rechazada: 3, cancelada: 1 }[estado];
    return pasosRutaPropuesta.map((p, i) => ({
        titulo: p.titulo, texto: p.texto,
        estado: estado === "cancelada" ? (i === 0 ? "hecho" : "pendiente")
            : estado === "rechazada" ? (i < 3 ? "hecho" : "pendiente")
            : i < actual ? "hecho" : i === actual ? "actual" : "pendiente",
    }));
}

// ---------- Sesión de ejemplo (?simular=sesion): la propuesta vive en memoria mientras la página esté abierta ----------
let simulada: SolicitudAtencion | null = null;
export const propuestaSimulada = () => simulada;
export function guardarPropuestaSimulada(d: DatosPropuesta, anterior?: SolicitudAtencion): SolicitudAtencion {
    const ahora = new Date().toISOString();
    simulada = {
        ...adaptarPropuesta(d), id: anterior?.id ?? "PR-0001", creadaEn: anterior?.creadaEn ?? ahora, actualizadoEn: ahora,
        estadoRevision: "en_revision", observacionesInstitucionales: null, historial: [],
    };
    return simulada;
}
export function cancelarPropuestaSimulada(): SolicitudAtencion | null {
    if (simulada) simulada = { ...simulada, estadoRevision: "cancelada", actualizadoEn: new Date().toISOString() };
    return simulada;
}

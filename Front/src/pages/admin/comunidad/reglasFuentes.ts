// Fuentes del asistente (HU-31): qué se puede hacer con cada fuente según su estado y quién la ve.
// Mismas reglas que Back/asistente_fuentes.py: solo el rol administrador aprueba; una fuente procesada
// o aprobada NO se activa sola; activar exige estar aprobada; una retirada ya no admite acciones.
import type { Fuente } from "../../../servicios/fuentes";

export type AccionFuente = "aprobar" | "devolver" | "activar" | "retirar" | "version";

export function accionesDisponibles(f: Pick<Fuente, "estadoFuente" | "activa">, aprueba: boolean): AccionFuente[] {
    if (f.estadoFuente === "retirada") return [];
    const acciones: AccionFuente[] = [];
    if (aprueba && f.estadoFuente !== "aprobada") acciones.push("aprobar");
    if (aprueba && f.estadoFuente === "aprobada" && !f.activa) acciones.push("devolver");
    if (f.estadoFuente === "aprobada" && !f.activa) acciones.push("activar");
    acciones.push("retirar", "version");
    return acciones;
}

// Textos de las ventanas de confirmación
export const CONFIRMACION: Record<Exclude<AccionFuente, "version">, { titulo: string; texto: string; boton: string }> = {
    aprobar: { titulo: "¿Aprobar la fuente?", texto: "Quedará aprobada, pero no se activa sola: después hay que activarla para que el asistente la use.", boton: "Sí, aprobar" },
    devolver: { titulo: "¿Devolver a revisión?", texto: "La fuente deja de estar aprobada y no podrá activarse hasta aprobarla de nuevo.", boton: "Sí, devolver" },
    activar: { titulo: "¿Activar la fuente?", texto: "El asistente podrá usarla para responder a partir de ahora.", boton: "Sí, activar" },
    retirar: { titulo: "¿Retirar la fuente?", texto: "El asistente dejará de usarla en nuevas respuestas. Se conserva su registro.", boton: "Sí, retirar" },
};

export const ESTADO_FUENTE: Record<string, { texto: string; clase: string }> = {
    borrador: { texto: "Borrador", clase: "borrador" },
    en_revision: { texto: "En revisión", clase: "por_autorizar" },
    aprobada: { texto: "Aprobada", clase: "publicado" },
    retirada: { texto: "Retirada", clase: "con_observaciones" },
};

// Búsqueda por título y tipo sobre la página cargada (el backend no busca por texto)
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const buscarFuentes = <T extends Pick<Fuente, "tituloFuente" | "tipoFuente">>(lista: T[], texto: string) =>
    !texto.trim() ? lista : lista.filter((f) => normalizar(`${f.tituloFuente} ${f.tipoFuente}`).includes(normalizar(texto)));

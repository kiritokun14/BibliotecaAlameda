// Ayudas de Actividades que no son componentes
import type { Tono } from "../contenidos/utiles";
import type { EstadoActividad } from "./datos";
import type { EstadoVisita } from "./visitas";
import type { EstadoCambio } from "./cambios";
import type { EstadoInscripcion } from "./inscripciones";

export const TONO_ACTIVIDAD: Record<EstadoActividad, Tono> = {
    borrador: "gris",
    "en-revision": "dorado",
    aprobada: "azul",
    publicada: "verde",
    cancelada: "guinda",
    archivada: "gris",
};

export const BASE_PROPUESTAS = "/admin/actividades/propuestas";
export const BASE_CALENDARIO = "/admin/actividades/calendario";
export const BASE_VISITAS = "/admin/actividades/visitas";

export const TONO_VISITA: Record<EstadoVisita, Tono> = {
    "por-confirmar": "dorado",
    propuesta: "dorado",
    confirmada: "verde",
    realizada: "gris",
    cancelada: "guinda",
    rechazada: "guinda",
};

export const BASE_CAMBIOS = "/admin/actividades/cambios";
export const TONO_CAMBIO: Record<EstadoCambio, Tono> = { pendiente: "dorado", aplicado: "verde", rechazado: "guinda" };

export const BASE_INSCRIPCIONES = "/admin/actividades/inscripciones";
export const TONO_INSCRIPCION: Record<EstadoInscripcion, Tono> = { confirmada: "verde", asistida: "azul", espera: "dorado", ofrecido: "dorado", cancelada: "guinda" };

export const BASE_ASISTENCIA = "/admin/actividades/asistencia";

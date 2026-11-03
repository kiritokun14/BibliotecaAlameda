// Ayudas de Actividades que no son componentes
import type { Tono } from "../contenidos/utiles";
import type { EstadoActividad } from "./datos";

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

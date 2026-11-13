// Ayudas de Participantes que no son componentes
import type { Tono } from "../contenidoDemo/utiles";
import type { EstadoRecompensa } from "./progreso";
import type { EstadoCotejo } from "./cotejos";
import type { EstadoPublicacion } from "./moderacion";

export const BASE_PROGRESO = "/admin/participantes/progreso";

export const TONO_RECOMPENSA: Record<EstadoRecompensa, Tono> = { "por-entregar": "dorado", entregada: "verde", sin: "gris" };

export const BASE_COTEJO = "/admin/participantes/cotejo";
export const TONO_COTEJO: Record<EstadoCotejo, Tono> = { pendiente: "dorado", vinculada: "verde", correccion: "dorado", rechazada: "guinda", aviso: "dorado" };

export const BASE_FORO = "/admin/participantes/foro/demostracion";
export const TONO_PUBLICACION: Record<EstadoPublicacion, Tono> = { reportada: "guinda", pendiente: "dorado", aprobada: "verde", retirada: "gris" };

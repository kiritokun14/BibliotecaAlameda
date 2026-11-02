import type { TonoChip } from "../componentes";
import type { EstadoContenido } from "./datos";

// Color del chip de cada estado
export const TONO_ESTADO: Record<EstadoContenido, TonoChip> = {
    borrador: "gris",
    "por-autorizar": "dorado",
    observaciones: "guinda",
    publicado: "verde",
    rechazado: "gris",
};

import { formatearFecha, type Propuesta } from "../datos";

// Los clubes sin fecha se reúnen cada semana; los eventos sin fecha están por confirmar
export function fechaPropuesta(propuesta: Propuesta) {
    if (propuesta.fecha) return formatearFecha(propuesta.fecha);
    return propuesta.tipo === "Club" ? "Cada semana (por confirmar)" : "Por confirmar";
}

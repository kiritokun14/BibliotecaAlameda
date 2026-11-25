import { ahoraTepic } from "../../../servicios/vigenciaActividades";
import { sumarDias } from "../actividades/calendario";
import type { Periodo } from "./datos";

const MILISEGUNDOS_DIA = 86_400_000;
export const MAXIMO_CONTEO = 2_147_483_647;
export const MAXIMO_REFERENCIA = 120;

export function fechasParticipacion(periodo: Periodo, ahora = new Date()) {
    const hasta = ahoraTepic(ahora).fecha;
    const desde = periodo === "30dias" ? sumarDias(hasta, -29)
        : periodo === "mes" ? `${hasta.slice(0, 7)}-01` : `${hasta.slice(0, 4)}-01-01`;
    return { desde, hasta };
}

export function errorPeriodo(desde: string, hasta: string) {
    if (!desde || !hasta) return "Elige las dos fechas del periodo.";
    if (desde > hasta) return "La fecha de inicio debe ser anterior o igual a la final.";
    const dias = (Date.parse(hasta) - Date.parse(desde)) / MILISEGUNDOS_DIA + 1;
    return dias > 366 ? "Elige un periodo de hasta 366 días." : "";
}

export function errorConteo(total: string, referencia: string) {
    if (!/^\d+$/.test(total) || Number(total) > MAXIMO_CONTEO) return "Escribe un total entero de cero o más.";
    if (!referencia.trim() || referencia.trim().length > MAXIMO_REFERENCIA) return "Escribe la referencia del registro (hasta 120 caracteres).";
    return "";
}

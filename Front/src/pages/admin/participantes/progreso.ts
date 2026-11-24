// Ayudas de vista para Progreso y recompensas. Los datos reales vienen de servicios/progreso.ts
// (Back/recompensas.py, Supabase/progreso_recompensas.sql). Capacidad: registrar_recompensas.
import type { TonoEstado } from "../piezasPanel";
import type { DatosRecompensa, EstadoEntrega, Nivel, ResumenProgreso } from "../../../servicios/progreso";

export const NOMBRE_ENTREGA: Record<EstadoEntrega, string> = { asignada: "Por entregar", entregada: "Entregada", cancelada: "Cancelada" };
export const TONO_ENTREGA: Record<EstadoEntrega, TonoEstado> = { asignada: "dorado", entregada: "verde", cancelada: "gris" };

export type EstadoCredencialVista = "vigente" | "vencida" | "pendiente" | "sin";
export function estadoCredencial(p: ResumenProgreso): EstadoCredencialVista {
    if (!p.credencial) return "sin";
    if (p.credencial.vigente) return "vigente";
    if (p.credencial.estado === "vencida" || p.credencial.estado === "validada") return "vencida";
    return "pendiente";
}
export const TEXTO_CREDENCIAL: Record<EstadoCredencialVista, string> = {
    vigente: "Credencial vigente", vencida: "Credencial vencida", pendiente: "Credencial en trámite", sin: "Sin credencial",
};

/** Fecha (YYYY-MM-DD) de un día en Tepic como instante ISO: inicio o fin del día. */
export const diaTepic = (dia: string, fin = false) => `${dia}T${fin ? "23:59:59" : "00:00:00"}-07:00`;
/** Día (YYYY-MM-DD) en Tepic de un instante ISO. */
export const diaDe = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" });

export type FormularioRecompensa = { nombre: string; descripcion: string; nivelRequerido: string; existencias: string; inicio: string; fin: string; estado: DatosRecompensa["estado"] };

export function validarRecompensa(d: FormularioRecompensa) {
    const e: Record<string, string> = {};
    if (!d.nombre.trim()) e.nombre = "Escribe el nombre de la recompensa.";
    const n = Number(d.existencias);
    if (d.existencias === "") e.existencias = "Escribe cuántas hay.";
    else if (!Number.isInteger(n) || n < 0 || n > 100000) e.existencias = "Escribe un número entero entre 0 y 100000.";
    if (!d.inicio) e.inicio = "Escribe desde cuándo se puede entregar.";
    if (!d.fin) e.fin = "Escribe hasta cuándo se puede entregar.";
    else if (d.inicio && d.fin < d.inicio) e.fin = "La vigencia termina antes de empezar.";
    return e;
}

export function aDatos(d: FormularioRecompensa): DatosRecompensa {
    return {
        nombre: d.nombre.trim(), descripcion: d.descripcion.trim(), nivelRequerido: Number(d.nivelRequerido) as Nivel,
        existencias: Number(d.existencias), vigenciaInicio: diaTepic(d.inicio), vigenciaFin: diaTepic(d.fin, true), estado: d.estado,
    };
}

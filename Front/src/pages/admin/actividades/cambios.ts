import { useSyncExternalStore } from "react";
import { actualizarActividad, obtenerActividad } from "./datos";

// Cambios y cancelaciones de actividades programadas, SIMULADOS.
// TODO backend: GET/POST /actividades/cambios, POST /actividades/cambios/:folio/{aplicar|rechazar},
// POST /actividades/:folio/cancelar (avisa a las personas inscritas).

export type EstadoCambio = "pendiente" | "aplicado" | "rechazado";
export type TipoCambio = "Cambio de fecha" | "Cambio de sala" | "Cambio de horario" | "Reprogramación" | "Cancelación";
export type Programacion = { fecha: string; hora: string; sala: string };

export const NOMBRE_ESTADO_CAMBIO: Record<EstadoCambio, string> = { pendiente: "Pendiente", aplicado: "Aplicado", rechazado: "Rechazado" };

export type Cambio = {
    folio: string; // CB-0021
    actividad: string; // AC-0107
    nombre: string; // nombre de la actividad
    tipo: TipoCambio;
    inscritos: number;
    solicito: string;
    solicitado: string; // ISO
    antes: Programacion;
    despues?: Programacion; // no aplica en cancelaciones
    motivo: string;
    estado: EstadoCambio;
    aplico?: { quien: string; fecha: string; mensaje: string };
    rechazo?: { motivo: string; fecha: string };
    avisados: number;
};

export const QUIEN_DECIDE = "Coordinación (ejemplo)";

const iniciales: Cambio[] = [
    { folio: "CB-0021", actividad: "AC-0107", nombre: "Club de lectura: cuentos nayaritas", tipo: "Cambio de fecha", inscritos: 12, solicito: "Personal (ejemplo)", solicitado: "2026-10-25T10:00:00", antes: { fecha: "2026-11-14", hora: "17:00", sala: "Sala de lectura" }, despues: { fecha: "2026-11-21", hora: "17:00", sala: "Sala de lectura" }, motivo: "La persona a cargo no puede esa fecha (ejemplo).", estado: "pendiente", avisados: 0 },
    { folio: "CB-0020", actividad: "AC-0108", nombre: "Taller de lectura en voz alta", tipo: "Cambio de sala", inscritos: 18, solicito: "Personal (ejemplo)", solicitado: "2026-10-24T12:00:00", antes: { fecha: "2026-11-12", hora: "16:00", sala: "Sala infantil" }, despues: { fecha: "2026-11-12", hora: "16:00", sala: "Sala de lectura" }, motivo: "La sala infantil tendrá mantenimiento (ejemplo).", estado: "pendiente", avisados: 0 },
    { folio: "CB-0019", actividad: "AC-0104", nombre: "Cuentacuentos de otoño", tipo: "Cancelación", inscritos: 12, solicito: "Coordinación (ejemplo)", solicitado: "2026-10-21T09:00:00", antes: { fecha: "2026-10-24", hora: "11:00", sala: "Sala infantil" }, motivo: "Ponente no disponible (ejemplo).", estado: "aplicado", aplico: { quien: QUIEN_DECIDE, fecha: "2026-10-22T10:00:00", mensaje: "Lamentamos cancelar la actividad." }, avisados: 12 },
    { folio: "CB-0018", actividad: "AC-0106", nombre: "Charla: historia de Tepic", tipo: "Cambio de horario", inscritos: 0, solicito: "Personal (ejemplo)", solicitado: "2026-10-17T09:00:00", antes: { fecha: "2026-11-19", hora: "17:00", sala: "Auditorio" }, despues: { fecha: "2026-11-19", hora: "18:00", sala: "Auditorio" }, motivo: "Ajuste con la persona ponente (ejemplo).", estado: "aplicado", aplico: { quien: QUIEN_DECIDE, fecha: "2026-10-18T10:00:00", mensaje: "" }, avisados: 0 },
    { folio: "CB-0017", actividad: "AC-0105", nombre: "Visita guiada escolar", tipo: "Cambio de fecha", inscritos: 28, solicito: "Personal (ejemplo)", solicitado: "2026-10-12T09:00:00", antes: { fecha: "2026-11-21", hora: "10:00", sala: "Toda la biblioteca" }, despues: { fecha: "2026-11-24", hora: "10:00", sala: "Toda la biblioteca" }, motivo: "La escuela pidió otra fecha (ejemplo).", estado: "rechazado", rechazo: { motivo: "La nueva fecha coincide con un evento institucional.", fecha: "2026-10-13T10:00:00" }, avisados: 0 },
];

let lista: Cambio[] = iniciales;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function useCambios(): Cambio[] {
    return useSyncExternalStore(
        (o) => {
            oyentes.add(o);
            return () => {
                oyentes.delete(o);
            };
        },
        () => lista,
    );
}

export function reiniciarCambios() {
    lista = iniciales;
    avisar();
}

export const obtenerCambio = (folio: string | undefined) => lista.find((c) => c.folio === folio);

function siguienteFolio() {
    const mayor = Math.max(0, ...lista.map((c) => Number(c.folio.replace(/\D/g, ""))));
    return `CB-${String(mayor + 1).padStart(4, "0")}`;
}

function actualizar(folio: string, cambios: Partial<Cambio>) {
    lista = lista.map((c) => (c.folio === folio ? { ...c, ...cambios } : c));
    avisar();
}

// Solo se cancelan o reprograman actividades ya programadas
export const programable = (estado: string) => estado === "publicada" || estado === "aprobada";

// Aplica el cambio a la actividad y avisa a las personas inscritas
export function aplicarCambio(folio: string, mensaje: string) {
    const c = obtenerCambio(folio);
    if (!c || c.estado !== "pendiente") throw new Error("Solo se aplica un cambio pendiente.");
    const a = obtenerActividad(c.actividad);
    if (a) {
        if (c.tipo === "Cancelación") actualizarActividad(a.folio, { estado: "cancelada" });
        else if (c.despues) {
            // conserva la duración original
            const [hi, mi] = a.inicio.split(":").map(Number);
            const [hf, mf] = a.fin.split(":").map(Number);
            const duracion = hf * 60 + mf - (hi * 60 + mi);
            const [hn, mn] = c.despues.hora.split(":").map(Number);
            const fin = hn * 60 + mn + (duracion > 0 ? duracion : 60);
            actualizarActividad(a.folio, { fecha: c.despues.fecha, inicio: c.despues.hora, fin: `${String(Math.floor(fin / 60)).padStart(2, "0")}:${String(fin % 60).padStart(2, "0")}`, espacio: c.despues.sala });
        }
    }
    actualizar(folio, { estado: "aplicado", aplico: { quien: QUIEN_DECIDE, fecha: new Date().toISOString(), mensaje: mensaje.trim() }, avisados: c.inscritos });
}

export function rechazarCambio(folio: string, motivo: string) {
    const c = obtenerCambio(folio);
    if (!c || c.estado !== "pendiente") throw new Error("Solo se rechaza un cambio pendiente.");
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    actualizar(folio, { estado: "rechazado", rechazo: { motivo: motivo.trim(), fecha: new Date().toISOString() } });
}

// Reprogramar: queda como solicitud pendiente de decisión
export function solicitarReprogramacion(actividad: string, despues: Programacion, motivo: string): string {
    const a = obtenerActividad(actividad);
    if (!a || !programable(a.estado)) throw new Error("Elige una actividad programada.");
    if (!despues.fecha || !despues.hora || !despues.sala || !motivo.trim()) throw new Error("Faltan datos.");
    const antes = { fecha: a.fecha, hora: a.inicio, sala: a.espacio };
    const tipo: TipoCambio = antes.fecha !== despues.fecha ? "Cambio de fecha" : antes.sala !== despues.sala ? "Cambio de sala" : antes.hora !== despues.hora ? "Cambio de horario" : "Reprogramación";
    const folio = siguienteFolio();
    lista = [{ folio, actividad, nombre: a.nombre, tipo, inscritos: a.inscritos, solicito: "Personal (tú)", solicitado: new Date().toISOString(), antes, despues, motivo: motivo.trim(), estado: "pendiente", avisados: 0 }, ...lista];
    avisar();
    return folio;
}

// Cancelar: se aplica en el momento y avisa a quienes se inscribieron
export function cancelarActividad(actividad: string, motivo: string, avisarPor: string): string {
    const a = obtenerActividad(actividad);
    if (!a || !programable(a.estado)) throw new Error("Elige una actividad programada.");
    if (!motivo.trim()) throw new Error("Escribe el motivo.");
    const folio = siguienteFolio();
    lista = [{
        folio, actividad, nombre: a.nombre, tipo: "Cancelación", inscritos: a.inscritos, solicito: "Personal (tú)", solicitado: new Date().toISOString(),
        antes: { fecha: a.fecha, hora: a.inicio, sala: a.espacio }, motivo: motivo.trim(), estado: "aplicado",
        aplico: { quien: QUIEN_DECIDE, fecha: new Date().toISOString(), mensaje: `Aviso por ${avisarPor.toLowerCase()}.` }, avisados: a.inscritos,
    }, ...lista];
    actualizarActividad(actividad, { estado: "cancelada" });
    avisar();
    return folio;
}

export type FiltroCambio = "todos" | EstadoCambio;

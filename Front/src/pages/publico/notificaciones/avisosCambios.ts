// Notificaciones (22 nov 2026): reglas puras de la lista única (pruebas en tests/avisosCambios.test.ts).
// Junta en una sola lista todo lo que le llega a la persona:
//   · las notificaciones del centro (datos.ts: credencial, propuestas, espacios, inscripciones y avisos; TODO backend)
//   · GET /notificaciones/actividades?pagina=N   → avisos de sesiones (sin estado de lectura)
//   · GET /cambios-actividad/avisos (HU-17, T-094) → avisos de cambios autorizados, con «leído» y «Marcar como leído»
import type { AvisoCambioActividad } from "../../../servicios/cambiosActividad";
import type { Area, Notificacion } from "./datos";

export type AvisoSesion = { id: string; titulo: string; cuerpoAviso: string; creadoEn: string };
export type TipoAviso = "cambio" | "cancelacion";
export type Origen = "centro" | "sesion" | "cambio";

export type ItemNotificacion = {
    id: string; origen: Origen; area: Area; titulo: string; texto: string;
    fecha: string | null; // ISO de los avisos del servidor; las del centro traen `cuando` («Hace 2 h»)
    cuando: string | null;
    leida: boolean | null; // null: la fuente no lleva estado de lectura
    tipo: TipoAviso | null; // solo los avisos de actividades
    accion?: { texto: string; ruta: string };
};

// «Cancelación» si el aviso lo dice; lo demás es un cambio (fecha, horario o lugar)
export const tipoDe = (titulo: string, texto: string): TipoAviso => (/cancel/i.test(`${titulo} ${texto}`) ? "cancelacion" : "cambio");

const MIS_EVENTOS = { texto: "Ver mis eventos", ruta: "/mi-perfil/eventos" };

// Una sola lista: primero las que faltan por leer; dentro de cada grupo, las del centro (ya vienen de la más nueva a la
// más vieja) y luego los avisos del servidor, del más reciente al más antiguo. Sin repetidos: si un aviso llega por las
// dos rutas del servidor, gana la versión con estado de lectura.
export function unirNotificaciones(centro: Notificacion[], sesiones: AvisoSesion[], cambios: AvisoCambioActividad[]): ItemNotificacion[] {
    const avisos = new Map<string, ItemNotificacion>();
    for (const a of sesiones) avisos.set(a.id, { id: a.id, origen: "sesion", area: "actividades", titulo: a.titulo, texto: a.cuerpoAviso, fecha: a.creadoEn, cuando: null, leida: null, tipo: tipoDe(a.titulo, a.cuerpoAviso), accion: MIS_EVENTOS });
    for (const a of cambios) avisos.set(a.id, { id: a.id, origen: "cambio", area: "actividades", titulo: a.titulo, texto: a.texto, fecha: a.fecha, cuando: null, leida: a.leida, tipo: tipoDe(a.titulo, a.texto), accion: MIS_EVENTOS });
    const delServidor = [...avisos.values()].sort((x, y) => (y.fecha ?? "").localeCompare(x.fecha ?? ""));
    const delCentro: ItemNotificacion[] = centro.map((n) => ({ id: n.id, origen: "centro", area: n.area, titulo: n.titulo, texto: n.texto, fecha: null, cuando: n.cuando, leida: n.leida, tipo: null, accion: n.accion }));
    const todas = [...delCentro, ...delServidor];
    return [...todas.filter((n) => n.leida === false), ...todas.filter((n) => n.leida !== false)];
}

export type FiltroArea = "todas" | Area;
export type FiltroLectura = "todas" | "sin-leer" | "leidas";
export function enFiltros(n: ItemNotificacion, area: FiltroArea, lectura: FiltroLectura) {
    if (area !== "todas" && n.area !== area) return false;
    if (lectura === "sin-leer") return n.leida === false;
    if (lectura === "leidas") return n.leida === true;
    return true;
}

// Se puede marcar como leída: las del centro y los avisos de HU-17 que faltan por leer
export const marcable = (n: ItemNotificacion) => n.leida === false && (n.origen === "centro" || n.origen === "cambio");

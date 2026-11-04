// Notificaciones de la persona con sesión (Figma A-02, 476:13270).
// TODO backend: todavía no hay servicio. Se espera:
//   - GET    /notificaciones               → lista (ver Notificacion), de la más reciente a la más antigua
//   - PATCH  /notificaciones/{id}/leida    y  PATCH /notificaciones/leidas (marcar todas)
//   - DELETE /notificaciones/{id}          y  DELETE /notificaciones/leidas (eliminar las leídas)
// Mientras, viven en esta pestaña con los ejemplos de Figma; la campana, el panel y la página comparten el mismo estado.
import { useSyncExternalStore } from "react";

export type Area = "propuesta" | "espacios" | "credencial" | "actividades" | "avisos";
export type Notificacion = {
    id: string; area: Area; titulo: string; texto: string; cuando: string;
    leida: boolean; accion?: { texto: string; ruta: string };
};

export const nombreArea: Record<Area, string> = {
    propuesta: "PROPUESTA", espacios: "ESPACIOS", credencial: "CREDENCIAL", actividades: "ACTIVIDADES", avisos: "AVISOS",
};

export type Filtro = "todas" | "no-leidas" | "credencial" | "actividades" | "avisos";

export const EJEMPLO: Notificacion[] = [
    { id: "n1", area: "propuesta", titulo: "Tu propuesta fue evaluada: acude a la biblioteca", leida: false,
        texto: "No fue aprobada. Acude personalmente para conocer el motivo y dar seguimiento.", cuando: "Hace 1 día (ejemplo)",
        accion: { texto: "Ver aviso", ruta: "/mi-perfil/propuestas" } },
    { id: "n2", area: "espacios", titulo: "Tu solicitud de espacio fue evaluada: acude a la biblioteca", leida: false,
        texto: "No fue aprobada. Acude personalmente para conocer el motivo y dar seguimiento.", cuando: "Hace 3 días (ejemplo)",
        accion: { texto: "Ver aviso", ruta: "/mi-perfil/espacios" } },
    { id: "n3", area: "credencial", titulo: "Tu solicitud de credencial está en revisión", leida: false,
        texto: "El personal de la biblioteca está revisando tu solicitud.", cuando: "Hace 2 h (ejemplo)",
        accion: { texto: "Ver seguimiento", ruta: "/credencial/seguimiento" } },
    { id: "n4", area: "actividades", titulo: "Tu inscripción quedó registrada", leida: false,
        texto: "Taller de escritura creativa · Sábado 14 de noviembre. El personal confirmará tu lugar.", cuando: "Ayer (ejemplo)",
        accion: { texto: "Ver mi inscripción", ruta: "/mi-perfil/eventos" } },
    { id: "n5", area: "actividades", titulo: "Hay una actividad con inscripción abierta", leida: false,
        texto: "Taller de escritura creativa. Consulta el detalle e inscríbete.", cuando: "Hace 3 días (ejemplo)",
        accion: { texto: "Ver actividad", ruta: "/eventos" } },
    { id: "n6", area: "avisos", titulo: "Aviso institucional", leida: true,
        texto: "Los cambios de horario se publicarán aquí. Contenido de ejemplo.", cuando: "Hace 1 semana (ejemplo)" },
];

// ---------- Funciones puras (se prueban en tests/notificacionesUsuario.test.ts) ----------
export const sinLeer = (lista: Notificacion[]) => lista.filter((n) => !n.leida).length;

export function filtrar(lista: Notificacion[], filtro: Filtro) {
    if (filtro === "todas") return lista;
    if (filtro === "no-leidas") return lista.filter((n) => !n.leida);
    return lista.filter((n) => n.area === filtro);
}

export const marcarLeida = (lista: Notificacion[], id: string) => lista.map((n) => (n.id === id ? { ...n, leida: true } : n));
export const marcarTodas = (lista: Notificacion[]) => lista.map((n) => ({ ...n, leida: true }));
export const quitar = (lista: Notificacion[], id: string) => lista.filter((n) => n.id !== id);
export const quitarLeidas = (lista: Notificacion[]) => lista.filter((n) => !n.leida);

// ---------- Estado compartido de la pestaña ----------
let actual: Notificacion[] = EJEMPLO;
const oyentes = new Set<() => void>();
function cambiar(nueva: Notificacion[]) { actual = nueva; oyentes.forEach((o) => o()); }
function suscribir(oyente: () => void) { oyentes.add(oyente); return () => { oyentes.delete(oyente); }; }

export const notificaciones = {
    marcarLeida: (id: string) => cambiar(marcarLeida(actual, id)),
    marcarTodas: () => cambiar(marcarTodas(actual)),
    quitar: (id: string) => cambiar(quitar(actual, id)),
    quitarLeidas: () => cambiar(quitarLeidas(actual)),
    // Agrega una nueva al principio (por ejemplo, al inscribirte en una actividad).
    agregar: (n: Omit<Notificacion, "id" | "leida">) => cambiar([{ ...n, id: `n-${Date.now()}`, leida: false }, ...actual]),
};

export function useNotificaciones() {
    return useSyncExternalStore(suscribir, () => actual, () => actual);
}

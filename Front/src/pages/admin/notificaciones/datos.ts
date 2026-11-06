// Notificaciones del panel (Figma «Admin · Notificaciones», 632:58443).
// El estado vive aquí (no dentro de un componente) porque lo comparten la campana de la cabecera
// y la página: al marcar una como leída, el contador de la campana baja en el mismo momento.
// Se guarda en esta pestaña (sessionStorage) para que no se pierda al cambiar de página.
// TODO backend: GET de las notificaciones de la cuenta, PATCH para marcarlas como leídas y
// DELETE para eliminar las leídas. Hoy son datos de ejemplo.
import { useSyncExternalStore } from "react";

export type AreaNotificacion = "contenidos" | "actividades" | "atencion" | "participantes";

export type Notificacion = {
    id: string;
    titulo: string;
    cuando: string; // texto listo: "Hace 10 min", "Ayer"
    area: AreaNotificacion;
    leida: boolean;
    ruta: string; // pantalla donde se atiende
};

export const AREAS_NOTIFICACION: { id: AreaNotificacion; nombre: string }[] = [
    { id: "contenidos", nombre: "Contenidos" },
    { id: "actividades", nombre: "Actividades" },
    { id: "atencion", nombre: "Atención" },
    { id: "participantes", nombre: "Participantes" },
];

export const EJEMPLO: Notificacion[] = [
    { id: "PR-0013", titulo: "Nueva propuesta de evento PR-0013", cuando: "Hace 10 min", area: "atencion", leida: false, ruta: "/admin/atencion/propuestas" },
    { id: "CT-0051", titulo: "Credencial por cotejar CT-0051", cuando: "Hace 1 h", area: "atencion", leida: false, ruta: "/admin/atencion/credenciales" },
    { id: "CS-0072", titulo: "Mensaje sin responder CS-0072", cuando: "Hace 1 día", area: "atencion", leida: false, ruta: "/admin/atencion/contactos" },
    { id: "AC-0108", titulo: "Lista de asistencia pendiente AC-0108", cuando: "Hoy 16:00", area: "actividades", leida: true, ruta: "/admin/actividades/asistencia" },
    { id: "CN-0030", titulo: "Contenido por autorizar CN-0030", cuando: "Ayer", area: "contenidos", leida: true, ruta: "/admin/contenidos/revision" },
];

// ---------- Reglas puras (pruebas en tests/notificaciones.test.ts) ----------

export type FiltroNotificacion = "todas" | "sin-leer" | AreaNotificacion;

export function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function filtrarNotificaciones(lista: Notificacion[], filtro: FiltroNotificacion, texto: string) {
    const buscado = normalizar(texto);
    return lista.filter((n) =>
        (filtro === "todas" || (filtro === "sin-leer" ? !n.leida : n.area === filtro)) &&
        (!buscado || normalizar(n.titulo).includes(buscado)));
}

export const sinLeer = (lista: Notificacion[]) => lista.filter((n) => !n.leida).length;
export const marcarLeida = (lista: Notificacion[], id: string) => lista.map((n) => (n.id === id ? { ...n, leida: true } : n));
export const marcarTodasLeidas = (lista: Notificacion[]) => lista.map((n) => ({ ...n, leida: true }));
export const eliminarLeidas = (lista: Notificacion[]) => lista.filter((n) => !n.leida);

// ---------- Almacén compartido ----------

const CLAVE = "biblioteca-panel-notificaciones";
const escuchas = new Set<() => void>();

function leer(): Notificacion[] {
    try {
        const guardadas = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
        if (Array.isArray(guardadas)) return guardadas;
    } catch { /* sin almacenamiento: se usan las de ejemplo */ }
    return EJEMPLO;
}

let actuales = leer();

function guardar(nuevas: Notificacion[]) {
    actuales = nuevas;
    try { sessionStorage.setItem(CLAVE, JSON.stringify(nuevas)); } catch { /* no pasa nada */ }
    escuchas.forEach((avisar) => avisar());
}

function suscribir(avisar: () => void) {
    escuchas.add(avisar);
    return () => { escuchas.delete(avisar); };
}

// Cualquier componente que use este hook se redibuja cuando cambian las notificaciones
export function useNotificaciones() {
    const lista = useSyncExternalStore(suscribir, () => actuales);
    return {
        lista,
        pendientes: sinLeer(lista),
        leer: (id: string) => guardar(marcarLeida(actuales, id)),
        leerTodas: () => guardar(marcarTodasLeidas(actuales)),
        eliminarLeidas: () => guardar(eliminarLeidas(actuales)),
    };
}

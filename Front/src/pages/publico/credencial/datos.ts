import { useEffect, useSyncExternalStore } from "react";
import { consultarMisSolicitudes, type SolicitudCredencialBack } from "../perfil/solicitudes";
import { sesionSimulada } from "../perfil/usarSesion";
import { solicitarCredencial } from "../../../servicios/tramites";
// Credencial · trámite de la persona con sesión iniciada (Figma A-02, 476:9983).
// El estado se lee del backend real con GET /mis-solicitudes (solicitudes_credencial, la más reciente) cuando hay sesión.
// Enviar la solicitud usa el servicio real POST /credenciales/solicitudes (servicios/tramites.ts), así que al recargar
// la página el estado sigue ahí (antes solo cambiaba en la pestaña y al recargar volvía a «Aún no tienes una solicitud»).
// TODO backend: todavía no hay servicio para enviar la corrección:
//   - POST /credenciales/solicitudes/{folio}/correccion → { nombreIdentificacion, numeroIdentificacion }

export type EstadoCredencial = "sin-solicitud" | "en-revision" | "correccion" | "vigente" | "vencida";
export type TipoTramite = "primera-vez" | "renovacion";

export type TramiteCredencial = {
    estado: EstadoCredencial;
    tipo: TipoTramite;
    folio: string | null;      // null = por asignar
    emision: string | null;    // AAAA-MM-DD; null = por confirmar
    vencimiento: string | null;
    motivoCorreccion: string | null;
    solicitadaEl?: string | null; // fecha en que se envió (ISO)
};

export const textoTipo: Record<TipoTramite, string> = {
    "primera-vez": "Obtener credencial",
    renovacion: "Renovar credencial",
};

// Etiquetas del selector «Vista de ejemplo de estados» (solo en desarrollo).
export const estadosDeEjemplo: { estado: EstadoCredencial; texto: string }[] = [
    { estado: "en-revision", texto: "En revisión" },
    { estado: "correccion", texto: "Corrección solicitada" },
    { estado: "vigente", texto: "Credencial disponible" },
    { estado: "vencida", texto: "Vencida" },
];

// TODO backend: horarios reales de Préstamos.
export const horariosCotejo = [
    "Lunes a viernes, de 8:00 a 14:00 h",
    "Lunes a viernes, de 14:00 a 19:30 h",
    "Sábado, de 9:00 a 14:00 h",
];

const vacio: TramiteCredencial = {
    estado: "sin-solicitud", tipo: "primera-vez", folio: null, emision: null, vencimiento: null, motivoCorreccion: null,
};

// Datos de ejemplo para cada estado (los textos con «(ejemplo)» vienen así de Figma).
const ejemplos: Record<EstadoCredencial, TramiteCredencial> = {
    "sin-solicitud": vacio,
    "en-revision": { ...vacio, estado: "en-revision" },
    correccion: {
        ...vacio, estado: "correccion",
        motivoCorreccion: "Los datos de tu solicitud no coinciden con tu identificación (ejemplo).",
    },
    vigente: { ...vacio, estado: "vigente" },
    vencida: { ...vacio, estado: "vencida", vencimiento: "2026-10-02" },
};

let tramite: TramiteCredencial = vacio;
const oyentes = new Set<() => void>();
function establecer(t: TramiteCredencial) { tramite = t; oyentes.forEach((o) => o()); }

export function consultarTramite(): TramiteCredencial { return { ...tramite }; }
export function verEjemplo(estado: EstadoCredencial) { establecer({ ...ejemplos[estado] }); }

// ---------- Estado real desde GET /mis-solicitudes ----------
// Regla (revisar con backend): recibida, en_atencion y cita_programada → en revisión; atendida → vigente (vencida si pasaron 2 años);
// rechazada → corrección solicitada (con las observaciones del personal); cancelada o sin solicitudes → sin solicitud.
export function mapearCredencial(s: SolicitudCredencialBack | undefined, hoy = new Date()): TramiteCredencial {
    if (!s || s.estadoSolicitud === "cancelada") return vacio;
    const tipo: TipoTramite = s.tipoSolicitud === "renovacion" ? "renovacion" : "primera-vez";
    const base = { ...vacio, tipo, folio: s.id ?? null, solicitadaEl: s.creadaEn ?? null };
    if (s.estadoSolicitud === "rechazada") return { ...base, estado: "correccion", motivoCorreccion: s.observaciones ?? "Revisa los datos de tu solicitud." };
    if (s.estadoSolicitud !== "atendida") return { ...base, estado: "en-revision" };
    const emision = (s.fechaCita ?? s.creadaEn).slice(0, 10);
    const [a, m, d] = emision.split("-").map(Number);
    const vence = new Date(a + 2, m - 1, d);
    const vencimiento = `${a + 2}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { ...base, estado: vence < hoy ? "vencida" : "vigente", emision, vencimiento };
}

let sincronizado = false;
export async function sincronizarTramite() {
    if (sesionSimulada || sincronizado) return;
    sincronizado = true;
    try {
        const h = await consultarMisSolicitudes();
        establecer(mapearCredencial(h.solicitudes_credencial?.[0]));
    } catch { sincronizado = false; } // sin sesión o sin servicio: se queda como está y se intenta en la siguiente pantalla
}

function suscribir(o: () => void) { oyentes.add(o); return () => { oyentes.delete(o); }; }
// Estado del trámite para cualquier pantalla (se pide al backend la primera vez que se usa con sesión).
export function useTramite(): TramiteCredencial {
    useEffect(() => { void sincronizarTramite(); }, []);
    return useSyncExternalStore(suscribir, () => tramite, () => tramite);
}

export type SolicitudCredencial = {
    tipo: TipoTramite; horario: string; comentarios: string;
    aceptaCotejo: boolean; aceptaAviso: boolean;
};
export type ErroresSolicitud = Partial<Record<"aceptaCotejo" | "aceptaAviso" | "comentarios", string>>;

export function validarSolicitud(s: SolicitudCredencial): ErroresSolicitud {
    const errores: ErroresSolicitud = {};
    if (!s.aceptaCotejo) errores.aceptaCotejo = "Confirma que acudirás al cotejo presencial.";
    if (!s.aceptaAviso) errores.aceptaAviso = "Acepta el aviso de privacidad para continuar.";
    if (s.comentarios.length > 500) errores.comentarios = "Usa 500 caracteres o menos.";
    return errores;
}

// Envía la solicitud al servidor. Con la sesión de ejemplo (?simular=sesion) solo cambia la vista.
export async function enviarSolicitud(s: SolicitudCredencial): Promise<TramiteCredencial> {
    if (sesionSimulada) { establecer({ ...vacio, estado: "en-revision", tipo: s.tipo }); return consultarTramite(); }
    const observaciones = [s.horario && `Horario preferido para el cotejo: ${s.horario}`, s.comentarios].filter(Boolean).join("\n");
    const creada = await solicitarCredencial(s.tipo === "renovacion" ? "renovacion" : "obtencion", observaciones);
    establecer({ ...vacio, estado: "en-revision", tipo: s.tipo, folio: creada.id, solicitadaEl: creada.creadaEn ?? new Date().toISOString() });
    sincronizado = false; // la próxima pantalla vuelve a leer el estado real
    return consultarTramite();
}

export type Correccion = { nombre: string; numero: string };
export function validarCorreccion(c: Correccion): Partial<Record<keyof Correccion, string>> {
    const errores: Partial<Record<keyof Correccion, string>> = {};
    if (!c.nombre.trim()) errores.nombre = "Escribe tu nombre como aparece en tu identificación.";
    if (c.numero.trim().length < 4) errores.numero = "Escribe el número de tu identificación.";
    return errores;
}
export function enviarCorreccion(): TramiteCredencial {
    establecer({ ...tramite, estado: "en-revision", motivoCorreccion: null });
    return consultarTramite();
}

// "2026-10-02" → "02 de octubre de 2026"
const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return fecha;
    return `${String(dia).padStart(2, "0")} de ${meses[mes - 1]} de ${anio}`;
}

// Paso activo del indicador «Información · Solicitud · Seguimiento» (4 = todos completos).
export function pasoDelEstado(vista: "informacion" | "solicitud" | "seguimiento", estado: EstadoCredencial) {
    if (vista === "informacion") return 1;
    if (vista === "solicitud") return 2;
    return estado === "vigente" || estado === "vencida" ? 4 : 3;
}

// Etapas del trámite (seguimiento y «Mi credencial» del perfil).
export type Etapa = { titulo: string; texto: string; estado: "hecho" | "actual" | "pendiente" };
export const etapasEnRevision: Etapa[] = [
    { titulo: "Solicitud enviada", texto: "Registraste tu solicitud de credencial.", estado: "hecho" },
    { titulo: "Revisión del personal", texto: "La biblioteca revisa tu solicitud y tus datos.", estado: "actual" },
    { titulo: "Cotejo presencial", texto: "Acude a Préstamos para el cotejo presencial.", estado: "pendiente" },
    { titulo: "Credencial validada y vigente", texto: "El personal registra tu credencial y su vigencia (2 años).", estado: "pendiente" },
];
export const etapasCompletas: Etapa[] = [
    { titulo: "Solicitud enviada", texto: "Registramos tu solicitud de credencial.", estado: "hecho" },
    { titulo: "Revisión", texto: "El personal de la biblioteca revisó tu solicitud.", estado: "hecho" },
    { titulo: "Cotejo presencial", texto: "La verificación se hizo en Préstamos.", estado: "hecho" },
    { titulo: "Credencial disponible", texto: "Tu credencial está validada y vigente.", estado: "hecho" },
];

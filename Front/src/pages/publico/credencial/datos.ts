import { useEffect, useSyncExternalStore } from "react";
import { consultarMisSolicitudes, type SolicitudCredencialBack } from "../perfil/solicitudes";
import { sesionSimulada } from "../perfil/usarSesion";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { registrarAlSalir } from "../../../servicios/consultas";
import { useCuentaTramites } from "../../../servicios/useCuentaTramites";
import { cancelarSolicitudCredencial, listarTramites, solicitarCredencial, type CredencialPropia } from "../../../servicios/tramites";
import { ahoraTepic } from "../../../servicios/vigenciaActividades";
// Credencial · trámite de la persona con sesión iniciada (Figma A-02, 476:9983).
// El estado se lee del backend real con GET /mis-solicitudes (solicitudes_credencial, la más reciente) cuando hay sesión.
// Enviar la solicitud usa el servicio real POST /credenciales/solicitudes (servicios/tramites.ts), así que al recargar
// la página el estado sigue ahí (antes solo cambiaba en la pestaña y al recargar volvía a «Aún no tienes una solicitud»).
// TODO backend: todavía no hay servicio para enviar la corrección:
//   - POST /credenciales/solicitudes/{folio}/correccion → { nombreIdentificacion, numeroIdentificacion }

export type EstadoCredencial = "sin-solicitud" | "en-revision" | "correccion" | "atendida" | "validacion-rechazada" | "vigente" | "vencida";
export type TipoTramite = "primera-vez" | "renovacion";

export type TramiteCredencial = {
    estado: EstadoCredencial;
    tipo: TipoTramite;
    folio: string | null;      // null = por asignar
    emision: string | null;    // AAAA-MM-DD; null = por confirmar
    vencimiento: string | null;
    motivoCorreccion: string | null;
    solicitadaEl?: string | null; // fecha en que se envió (ISO)
    credencialVigente?: boolean;
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

// Datos de ejemplo para cada estado (solo con ?simular=sesion).
const ejemplos: Record<EstadoCredencial, TramiteCredencial> = {
    "sin-solicitud": vacio,
    "en-revision": { ...vacio, estado: "en-revision" },
    correccion: {
        ...vacio, estado: "correccion",
        motivoCorreccion: "Los datos de tu solicitud no coinciden con tu identificación.",
    },
    atendida: { ...vacio, estado: "atendida" },
    "validacion-rechazada": { ...vacio, estado: "validacion-rechazada" },
    vigente: { ...vacio, estado: "vigente" },
    vencida: { ...vacio, estado: "vencida", vencimiento: "2026-10-02" },
};

const sinConsultar = { tramite: vacio, listo: false, error: null as string | null };
let seguimiento = { ...sinConsultar, listo: sesionSimulada };
let cuenta: string | null | undefined;
let revision = 0;
let lectura: Promise<void> | undefined;
let folioReciente: string | null = null;
const oyentes = new Set<() => void>();
function establecer(tramite: TramiteCredencial, listo = true, error: string | null = null) {
    seguimiento = { tramite, listo, error };
    oyentes.forEach((o) => o());
}

function invalidarLectura() {
    revision += 1;
    lectura = undefined;
}

function seleccionarCuenta(usuario: string | null) {
    if (cuenta === usuario) return;
    cuenta = usuario;
    folioReciente = null;
    invalidarLectura();
    establecer(vacio, usuario === null);
}
registrarAlSalir(() => { if (!sesionSimulada) seleccionarCuenta(null); });

export function consultarTramite(): TramiteCredencial { return { ...seguimiento.tramite }; }
export function verEjemplo(estado: EstadoCredencial) { establecer({ ...ejemplos[estado] }); folioReciente = null; }

// La vigencia se determina con la credencial emitida; la solicitud solo informa del trámite.
export function mapearCredencial(s: SolicitudCredencialBack | undefined, hoy = new Date(), credencial?: CredencialPropia | null): TramiteCredencial {
    const fecha = ahoraTepic(hoy).fecha;
    const validada = credencial?.estadoValidacion === "validada" && credencial.fechaEmision <= fecha;
    const credencialVigente = validada && credencial.fechaVencimiento >= fecha;
    const activa = s && !["atendida", "cancelada"].includes(s.estadoSolicitud);
    const tipo: TipoTramite = s?.tipoSolicitud === "renovacion" ? "renovacion" : "primera-vez";
    const base = { ...vacio, tipo, folio: s?.id ?? null, solicitadaEl: s?.creadaEn ?? null,
        ...(credencialVigente && { credencialVigente, emision: credencial.fechaEmision, vencimiento: credencial.fechaVencimiento }) };
    if (activa && s.estadoSolicitud === "rechazada") return { ...base, estado: "correccion", motivoCorreccion: s.observaciones ?? "Revisa los datos de tu solicitud." };
    if (activa) return { ...base, estado: "en-revision" };
    if (credencial && (validada || credencial.estadoValidacion === "vencida")) {
        return { ...base, estado: credencialVigente ? "vigente" : "vencida",
            emision: credencial.fechaEmision, vencimiento: credencial.fechaVencimiento };
    }
    if (credencial?.estadoValidacion === "rechazada") return { ...base, estado: "validacion-rechazada" };
    if (s?.estadoSolicitud === "atendida" || credencial?.estadoValidacion === "pendiente") return { ...base, estado: "atendida" };
    return vacio;
}

async function consultarSeguimiento(usuario?: string): Promise<TramiteCredencial> {
    try {
        const r = await listarTramites("credencial", true, 0, "", "", usuario);
        const s = r.solicitudes[0];
        const solicitud: SolicitudCredencialBack | undefined = s && {
            id: s.id, tipoSolicitud: s.tipoSolicitud === "renovacion" ? "renovacion" : "obtencion",
            estadoSolicitud: s.estadoSolicitud as SolicitudCredencialBack["estadoSolicitud"],
            fechaCita: s.fechaCita ?? null, observaciones: s.observaciones ?? null, creadaEn: s.creadaEn,
        };
        return mapearCredencial(solicitud, undefined, r.credencial);
    } catch (error) {
        if (!(error instanceof ErrorServicio) || error.estado !== 404) throw error;
        return mapearCredencial((await consultarMisSolicitudes(usuario)).solicitudes_credencial?.[0]);
    }
}

export async function sincronizarTramite(usuario?: string | null) {
    if (sesionSimulada) return;
    if (usuario !== undefined) seleccionarCuenta(usuario);
    if (usuario === null) return;
    if (lectura) return lectura;
    const turno = revision;
    lectura = consultarSeguimiento(usuario ?? undefined).then((nueva) => {
        if (revision !== turno) return;
        if (nueva.folio === folioReciente) folioReciente = null;
        const recienEnviada = folioReciente && nueva.estado === "sin-solicitud";
        establecer(recienEnviada ? seguimiento.tramite : nueva);
    }).catch((error) => {
        if (revision === turno) establecer(seguimiento.tramite, false, mensajeError(error));
    }).finally(() => { if (revision === turno) lectura = undefined; });
    return lectura;
}

function suscribir(o: () => void) { oyentes.add(o); return () => { oyentes.delete(o); }; }
const leerSeguimiento = () => seguimiento;

export function useSeguimientoTramite() {
    const usuario = useCuentaTramites();
    const actual = useSyncExternalStore(suscribir, leerSeguimiento, leerSeguimiento);
    useEffect(() => { if (usuario !== undefined) void sincronizarTramite(usuario); }, [usuario]);
    return {
        ...(sesionSimulada || usuario === cuenta ? actual : sinConsultar),
        reintentar: () => {
            if (!usuario || sesionSimulada) return;
            establecer(seguimiento.tramite, false);
            void sincronizarTramite(usuario);
        },
    };
}

export function useTramite(): TramiteCredencial {
    return useSeguimientoTramite().tramite;
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
    const turno = revision;
    const observaciones = [s.horario && `Horario preferido para el cotejo: ${s.horario}`, s.comentarios].filter(Boolean).join("\n");
    const creada = await solicitarCredencial(s.tipo === "renovacion" ? "renovacion" : "obtencion", observaciones, cuenta ?? undefined);
    if (revision !== turno) throw new ErrorServicio("La cuenta cambió. Vuelve a consultar tu trámite.", 401);
    invalidarLectura();
    folioReciente = creada.id;
    establecer({ ...vacio, estado: "en-revision", tipo: s.tipo, folio: creada.id, solicitadaEl: creada.creadaEn ?? new Date().toISOString() });
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
    establecer({ ...seguimiento.tramite, estado: "en-revision", motivoCorreccion: null });
    return consultarTramite();
}

// "2026-10-02" → "02 de octubre de 2026"
const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export function fechaLarga(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return fecha;
    return `${String(dia).padStart(2, "0")} de ${meses[mes - 1]} de ${anio}`;
}
// "2026-10-02" → "02 oct 2026" (para las fichas angostas del seguimiento)
export function fechaCorta(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return fecha;
    return `${String(dia).padStart(2, "0")} ${meses[mes - 1].slice(0, 3)} ${anio}`;
}

// Paso del indicador «Información · Solicitud · Seguimiento» (4 = todos completos). Lo decide el estado del trámite,
// no solo la pantalla: con una solicitud en proceso, las tres pantallas marcan 1 y 2 hechos y 3 en curso (19 nov).
// Sin solicitud (o vencida, que empieza una renovación): información = 1 y solicitud = 2.
export function pasoDelEstado(vista: "informacion" | "solicitud" | "seguimiento", estado: EstadoCredencial) {
    if (estado === "en-revision" || estado === "correccion" || estado === "atendida" || estado === "validacion-rechazada") return 3;
    if (estado === "vigente") return 4;
    if (vista === "solicitud") return 2;
    return vista === "seguimiento" ? 3 : 1;
}
// ¿Se puede abrir el formulario? Solo sin solicitud o con la credencial vencida (así no se duplican solicitudes).
export function puedeSolicitar(estado: EstadoCredencial) { return estado === "sin-solicitud" || estado === "vencida"; }

// ---------- Cancelar la solicitud (la persona se equivocó o ya no la quiere) ----------
// Solo mientras está en revisión o con corrección solicitada. Con la sesión de ejemplo solo cambia la vista.
// TODO backend: POST /credenciales/solicitudes/{id}/cancelar (PARA_BACKEND.md); mientras no exista, el servidor responde
// 404/405 y la pantalla pide hacerlo con el personal.
export function puedeCancelar(estado: EstadoCredencial) { return estado === "en-revision" || estado === "correccion"; }
export async function cancelarSolicitud(): Promise<TramiteCredencial> {
    const { tramite } = seguimiento;
    if (!puedeCancelar(tramite.estado)) throw new Error("Esta solicitud ya no se puede cancelar.");
    if (!sesionSimulada) {
        if (!tramite.folio) throw new Error("Tu solicitud todavía no tiene folio; intenta en un momento.");
        const turno = revision;
        await cancelarSolicitudCredencial(tramite.folio, cuenta ?? undefined);
        if (revision !== turno) throw new ErrorServicio("La cuenta cambió. Vuelve a consultar tu trámite.", 401);
        invalidarLectura();
        folioReciente = null;
    }
    establecer({ ...vacio });
    return consultarTramite();
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

// ---------- Estado del trámite en palabras (Mi perfil › Mi credencial y la página pública de Credencial) ----------
// chip y color = estado; accion = lo siguiente que puede hacer la persona; paso = etapa actual (0 a 3; 4 = todas hechas).
export type ColorEstado = "gris" | "dorado" | "guinda" | "verde";
export type DatosEstado = { chip: string; color: ColorEstado; titulo: string; texto: string; accion: { texto: string; ruta: string }; paso: number };
export const estadosCredencial: Record<EstadoCredencial, DatosEstado> = {
    "sin-solicitud": { chip: "Sin solicitud", color: "gris", titulo: "Aún no tienes credencial",
        texto: "Solicítala en línea en pocos minutos. Después acudes a la biblioteca para el cotejo presencial y el personal la valida.",
        accion: { texto: "Solicitar mi credencial", ruta: "/credencial/solicitud" }, paso: 0 },
    "en-revision": { chip: "En revisión", color: "dorado", titulo: "Tu solicitud está en revisión",
        texto: "El personal revisa tus datos. Te avisaremos en tus notificaciones cuando puedas acudir al cotejo presencial.",
        accion: { texto: "Ver seguimiento", ruta: "/credencial/seguimiento" }, paso: 1 },
    atendida: { chip: "Atendida", color: "dorado", titulo: "Tu solicitud fue atendida",
        texto: "Consulta aquí la vigencia cuando el personal valide y registre tu credencial.",
        accion: { texto: "Ver seguimiento", ruta: "/credencial/seguimiento" }, paso: 3 },
    "validacion-rechazada": { chip: "Validación rechazada", color: "guinda", titulo: "Se rechazó la validación de tu credencial",
        texto: "Contacta a la biblioteca para conocer cómo continuar el trámite.",
        accion: { texto: "Contactar a la biblioteca", ruta: "/contacto" }, paso: 3 },
    correccion: { chip: "Corrección solicitada", color: "guinda", titulo: "Corrige un dato de tu solicitud",
        texto: "El personal pidió un ajuste antes de continuar. Revisa la observación y envía la corrección.",
        accion: { texto: "Corregir mi solicitud", ruta: "/credencial/seguimiento" }, paso: 1 },
    vigente: { chip: "Vigente", color: "verde", titulo: "Tu credencial está vigente",
        texto: "Preséntala en la biblioteca para tus trámites. Con ella se activan tu progreso y tus recompensas.",
        accion: { texto: "Ver mi credencial", ruta: "/credencial/seguimiento" }, paso: 4 },
    vencida: { chip: "Vencida", color: "guinda", titulo: "Tu credencial venció",
        texto: "Renuévala en línea; tu cuenta y tu historial de actividades se conservan.",
        accion: { texto: "Solicitar renovación", ruta: "/credencial/solicitud?tipo=renovacion" }, paso: 4 },
};

// Los cuatro pasos del trámite, con quién hace cada uno.
export const pasosCredencial = [
    { titulo: "Solicitud en línea", texto: "Envías tu solicitud desde el portal.", quien: "Tú" },
    { titulo: "Revisión del personal", texto: "La biblioteca revisa tu solicitud y tus datos.", quien: "Biblioteca" },
    { titulo: "Cotejo presencial", texto: "Acudes a Préstamos con una identificación.", quien: "Tú y la biblioteca" },
    { titulo: "Credencial validada", texto: "El personal la registra con vigencia de 2 años.", quien: "Biblioteca" },
];
export function etapasCredencial(paso: number): Etapa[] {
    return pasosCredencial.map((p, i) => ({ titulo: p.titulo, texto: p.texto, estado: i < paso ? "hecho" : i === paso ? "actual" : "pendiente" }));
}

// Datos del trámite (fila de tarjetas de la página de Credencial). TODO backend: costo y tiempos los confirma la biblioteca.
export const datosTramite = { costo: "Gratuito", revision: "3 a 5 días hábiles", vigencia: "2 años", cotejo: "En Préstamos, con identificación" };

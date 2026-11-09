// Perfil · lógica y datos de la persona con sesión iniciada (Actor 2, Figma 476:22959 y 476:26155).
// Lo que ya da el backend viene de servicios/perfil.ts (GET/PATCH /perfil): nombre, apellidos,
// fecha de nacimiento, teléfono y correo. Lo demás está aquí como ejemplo, marcado con TODO backend.
import type { PerfilPropio } from "../../../servicios/perfil";

// ---------- Secciones del menú lateral ----------
export type ClaveSeccion =
    | "resumen" | "datos" | "credencial" | "eventos" | "propuestas"
    | "espacios" | "progreso" | "avisos" | "seguridad";

export const seccionesPerfil: { clave: ClaveSeccion; texto: string; ruta: string }[] = [
    { clave: "resumen", texto: "Resumen", ruta: "/mi-perfil" },
    { clave: "datos", texto: "Mis datos", ruta: "/mi-perfil/datos" },
    { clave: "credencial", texto: "Mi credencial", ruta: "/mi-perfil/credencial" },
    { clave: "eventos", texto: "Mis eventos", ruta: "/mi-perfil/eventos" },
    { clave: "propuestas", texto: "Mis propuestas", ruta: "/mi-perfil/propuestas" },
    { clave: "espacios", texto: "Mis espacios", ruta: "/mi-perfil/espacios" },
    { clave: "progreso", texto: "Progreso y recompensas", ruta: "/mi-perfil/progreso" },
    { clave: "avisos", texto: "Avisos", ruta: "/mi-perfil/avisos" },
    { clave: "seguridad", texto: "Seguridad", ruta: "/mi-perfil/seguridad" },
];

// Las cuentas de persona menor de edad no tienen «Mis propuestas» ni «Mis espacios» (Figma 476:26155).
const soloAdultos: ClaveSeccion[] = ["propuestas", "espacios"];
export function seccionesDe(menor: boolean) {
    return menor ? seccionesPerfil.filter((s) => !soloAdultos.includes(s.clave)) : seccionesPerfil;
}

export function seccionDeRuta(seccion: string | undefined, menor = false): ClaveSeccion | null {
    if (!seccion) return "resumen";
    return seccionesDe(menor).find((s) => s.clave === seccion)?.clave ?? null;
}

// ---------- Datos de la persona ----------
export function nombreCompleto(p: Pick<PerfilPropio, "nombres" | "primerApellido" | "segundoApellido">) {
    return [p.nombres, p.primerApellido, p.segundoApellido].filter((t) => t && t.trim()).join(" ");
}

// "2000-01-31" → "31 / 01 / 2000" (sin pasar por Date para no correr el día por la zona horaria)
export function formatearFecha(fecha: string) {
    const [anio, mes, dia] = fecha.slice(0, 10).split("-");
    return anio && mes && dia ? `${dia} / ${mes} / ${anio}` : fecha;
}

// Menor de edad: aún no cumple 18 años en la fecha de hoy.
export function esMenorDeEdad(fechaNacimiento: string, hoy = new Date()) {
    const [anio, mes, dia] = fechaNacimiento.slice(0, 10).split("-").map(Number);
    if (!anio || !mes || !dia) return false;
    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes || (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
    return edad < 18;
}

export function tipoDeCuenta(fechaNacimiento: string, hoy = new Date()) {
    return esMenorDeEdad(fechaNacimiento, hoy) ? "Cuenta de persona menor de edad" : "Cuenta de persona adulta";
}

// ---------- Validaciones del formulario «Editar mis datos» ----------
export type DatosEditables = { nombres: string; telefono: string };
export type Domicilio = {
    calle: string; numeroExterior: string; numeroInterior: string;
    colonia: string; codigoPostal: string; municipio: string; estado: string;
};
export type ErroresDatos = Partial<Record<keyof DatosEditables | keyof Domicilio | "correo", string>>;

export function validarDatos(datos: DatosEditables, domicilio: Domicilio): ErroresDatos {
    const errores: ErroresDatos = {};
    const nombres = datos.nombres.trim();
    if (!nombres) errores.nombres = "Escribe tu nombre.";
    else if (nombres.length > 150) errores.nombres = "Usa 150 caracteres o menos.";
    if (!/^\d{10}$/.test(datos.telefono.trim())) errores.telefono = "Escribe un teléfono de 10 dígitos.";
    if (!domicilio.calle.trim()) errores.calle = "Escribe la calle.";
    if (!domicilio.numeroExterior.trim()) errores.numeroExterior = "Escribe el número o «sin número».";
    if (!domicilio.colonia.trim()) errores.colonia = "Escribe la colonia o localidad.";
    if (!/^\d{5}$/.test(domicilio.codigoPostal.trim())) errores.codigoPostal = "Escribe un código postal de 5 dígitos.";
    if (!domicilio.municipio.trim()) errores.municipio = "Escribe el municipio.";
    if (!domicilio.estado.trim()) errores.estado = "Escribe el estado.";
    return errores;
}

export function validarCorreo(correo: string, actual: string) {
    const limpio = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) return "Escribe un correo válido.";
    if (limpio === actual.trim().toLowerCase()) return "Escribe un correo distinto al actual.";
    return "";
}

// ---------- Datos de ejemplo (todavía no los da el backend) ----------
// Solo para revisar la pantalla en desarrollo sin cuenta: /mi-perfil?simular=sesion
// (o ?simular=sesion-menor para la cuenta de persona menor de edad).
export function perfilSimulado(menor: boolean): PerfilPropio {
    return {
        id: "simulado", correo: "nombre@ejemplo.mx", nombres: "Ana", primerApellido: "López", segundoApellido: "García",
        fechaNacimiento: menor ? "2014-03-15" : "1994-03-15", telefono: "3110000000", actualizadoA: "2026-11-03T12:00:00Z",
    };
}

// TODO backend: GET /perfil debe incluir el domicilio (calle, número exterior e interior, colonia,
// código postal, municipio y estado) y PATCH /perfil debe aceptarlo. Mientras, se guarda solo en esta pestaña.
let domicilioEjemplo: Domicilio = {
    calle: "Av. Allende", numeroExterior: "110", numeroInterior: "",
    colonia: "Centro", codigoPostal: "63000", municipio: "Tepic", estado: "Nayarit",
};
export function consultarDomicilio(): Domicilio { return { ...domicilioEjemplo }; }
export function guardarDomicilio(domicilio: Domicilio) { domicilioEjemplo = { ...domicilio }; }

// TODO backend: cambio de correo con verificación (enviar enlace al nuevo correo, consultar si hay uno
// pendiente y cancelarlo). Mientras, el pendiente vive solo en esta pestaña.
let correoPendiente: string | null = null;
export function consultarCorreoPendiente() { return correoPendiente; }
export function solicitarCambioCorreo(nuevo: string) { correoPendiente = nuevo.trim().toLowerCase(); }
export function cancelarCambioCorreo() { correoPendiente = null; }

// TODO backend: inscripciones y progreso de la cuenta (la credencial sale de credencial/datos.ts; los avisos, de notificaciones/datos.ts).
export const resumenEjemplo = {
    actividades: { titulo: "Próximas actividades", texto: "2 inscripciones: Taller de escritura creativa y 1 más." },
    asistencias: { titulo: "Asistencias verificadas", texto: "3 de 6 para el siguiente nivel (ejemplo)." },
    progreso: { actuales: 3, meta: 6 },
};

// Tarjeta «Credencial» del resumen y etiqueta del encabezado según el estado del trámite.
type EstadoCred = "sin-solicitud" | "en-revision" | "correccion" | "vigente" | "vencida";
export function resumenCredencial(estado: EstadoCred) {
    return {
        vigente: { titulo: "Credencial vigente", texto: "Validada · 2 años desde la emisión." },
        "en-revision": { titulo: "Credencial en revisión", texto: "El personal está revisando tu solicitud." },
        correccion: { titulo: "Corrección solicitada", texto: "Revisa lo que pidió el personal para continuar." },
        vencida: { titulo: "Credencial vencida", texto: "Solicita la renovación en línea." },
        "sin-solicitud": { titulo: "Sin credencial", texto: "Solicítala desde el portal." },
    }[estado];
}
export function chipCredencial(estado: EstadoCred) {
    return { vigente: "Credencial validada y vigente", "en-revision": "Credencial en revisión", correccion: "Credencial con corrección solicitada",
        vencida: "Credencial vencida", "sin-solicitud": null }[estado];
}

export function porcentajeProgreso(actuales: number, meta: number) {
    if (meta <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((actuales / meta) * 100)));
}

// ---------- Mis eventos ----------
// TODO backend: inscripciones de la persona (GET /mis-inscripciones o similar): actividad, tipo, fecha,
// horario y estado (pendiente, confirmada, asistencia registrada, cancelada).
export type EstadoInscripcion = "confirmada" | "pendiente" | "asistida" | "cancelada";
export type Inscripcion = {
    id: string; titulo: string; detalle: string; estado: EstadoInscripcion;
    fecha?: { dia: string; numero: string; mes: string }; color: "verde" | "dorado" | "guinda";
};
export const inscripcionesEjemplo: Inscripcion[] = [
    { id: "i1", titulo: "Taller de escritura creativa", detalle: "Taller · Sábado 14 de noviembre · 10:00 a 12:00", estado: "confirmada",
        fecha: { dia: "SÁB", numero: "14", mes: "NOV" }, color: "verde" },
    { id: "i2", titulo: "Club de lectura mensual", detalle: "Club de lectura · fecha por confirmar", estado: "pendiente", color: "dorado" },
    { id: "i3", titulo: "Visita guiada a la biblioteca", detalle: "Visita · fecha por confirmar", estado: "asistida", color: "guinda" },
    { id: "i4", titulo: "Presentación de libro", detalle: "Evento · fecha por confirmar", estado: "asistida", color: "guinda" },
    { id: "i5", titulo: "Taller de lectura en voz alta", detalle: "Taller · fecha por confirmar", estado: "asistida", color: "verde" },
];
// Inscribirse o cancelar en la agenda actualiza «Mis eventos» (TODO backend: vendrá de las inscripciones reales).
export function agregarInscripcion(i: Inscripcion) {
    if (!inscripcionesEjemplo.some((x) => x.id === i.id)) inscripcionesEjemplo.unshift(i);
}
export function quitarInscripcion(id: string) {
    const i = inscripcionesEjemplo.findIndex((x) => x.id === id);
    if (i >= 0) inscripcionesEjemplo.splice(i, 1);
}
export type FiltroEventos = "todos" | "proximos" | "asistidos" | "cancelados";
export function filtrarInscripciones(lista: Inscripcion[], filtro: FiltroEventos) {
    if (filtro === "proximos") return lista.filter((i) => i.estado === "confirmada" || i.estado === "pendiente");
    if (filtro === "asistidos") return lista.filter((i) => i.estado === "asistida");
    if (filtro === "cancelados") return lista.filter((i) => i.estado === "cancelada");
    return lista;
}

// ---------- Progreso y recompensas ----------
// TODO backend: asistencias verificadas, niveles y recompensas (los define la biblioteca).
export const nivelesEjemplo = [3, 6, 10];
export function estadoNivel(meta: number, asistencias: number, niveles = nivelesEjemplo): "alcanzado" | "en-progreso" | "pendiente" {
    if (asistencias >= meta) return "alcanzado";
    const siguiente = niveles.find((n) => n > asistencias);
    return siguiente === meta ? "en-progreso" : "pendiente";
}
export function siguienteMeta(asistencias: number, niveles = nivelesEjemplo) {
    return niveles.find((n) => n > asistencias) ?? niveles[niveles.length - 1];
}

// ---------- Preferencias de avisos ----------
// TODO backend: GET/PUT /perfil/avisos con estas claves. «fijo» = siempre activo, no se puede apagar.
export type Preferencia = { clave: string; titulo: string; texto?: string; activo: boolean; fijo?: boolean; proximamente?: boolean };
export const canalesEjemplo: Preferencia[] = [
    { clave: "portal", titulo: "Notificaciones dentro del portal", texto: "Los cambios en tus solicitudes siempre aparecen aquí.", activo: true, fijo: true },
    { clave: "correo", titulo: "Correo electrónico", texto: "Recibirás un correo además del aviso en el portal.", activo: true },
    { clave: "telefono", titulo: "Teléfono", texto: "Solo para llamadas del personal; no se envían SMS ni WhatsApp.", activo: false },
];
export const tiposAvisoEjemplo: Preferencia[] = [
    { clave: "inscripciones", titulo: "Mis inscripciones", activo: true },
    { clave: "cambios", titulo: "Cambios y cancelaciones", activo: true, fijo: true },
    { clave: "credencial", titulo: "Credencial", activo: true },
    { clave: "solicitudes", titulo: "Mis solicitudes", activo: true },
    { clave: "novedades", titulo: "Novedades de la biblioteca", activo: true },
    { clave: "bibliocomunidad", titulo: "Bibliocomunidad", activo: false, proximamente: true },
    { clave: "importantes", titulo: "Avisos importantes", activo: true, fijo: true },
];
let preferenciasGuardadas = { canales: canalesEjemplo, tipos: tiposAvisoEjemplo };
export function consultarPreferencias() { return preferenciasGuardadas; }
export function guardarPreferencias(p: { canales: Preferencia[]; tipos: Preferencia[] }) { preferenciasGuardadas = p; }
export function alternar(lista: Preferencia[], clave: string) {
    return lista.map((p) => (p.clave === clave && !p.fijo && !p.proximamente ? { ...p, activo: !p.activo } : p));
}

// ---------- Seguridad ----------
export function validarCambioContrasena(actual: string, nueva: string) {
    const errores: { actual?: string; nueva?: string } = {};
    if (!actual) errores.actual = "Escribe tu contraseña actual.";
    if (nueva.length < 8 || nueva.length > 128) errores.nueva = "Usa entre 8 y 128 caracteres.";
    else if (nueva === actual) errores.nueva = "Usa una contraseña diferente a la actual.";
    return errores;
}

// ---------- Persona responsable (cuentas de persona menor de edad) ----------
// TODO backend: GET /perfil debe incluir la persona responsable que se registró al crear la cuenta
// (nombre, teléfono y relación) y PATCH /perfil debe aceptarla. Mientras, vive solo en esta pestaña.
export type Responsable = { nombre: string; telefono: string; relacion: string };
let responsableEjemplo: Responsable = { nombre: "Ana López García", telefono: "3111234567", relacion: "Madre" };
export function consultarResponsable(): Responsable { return { ...responsableEjemplo }; }
export function guardarResponsable(r: Responsable) { responsableEjemplo = { ...r }; }

export function validarResponsable(r: Responsable) {
    const errores: Partial<Record<"responsableNombre" | "responsableTelefono" | "responsableRelacion", string>> = {};
    if (!r.nombre.trim()) errores.responsableNombre = "Escribe el nombre de la persona responsable.";
    if (!/^\d{10}$/.test(r.telefono.trim())) errores.responsableTelefono = "Escribe un teléfono de 10 dígitos.";
    if (!r.relacion.trim()) errores.responsableRelacion = "Escribe el parentesco o la relación.";
    return errores;
}

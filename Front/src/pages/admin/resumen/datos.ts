// Datos de ejemplo del Resumen del panel (Figma «Admin · Resumen», 358:3838).
// TODO backend: un endpoint de resumen debe devolver los pendientes de todas las áreas a las que la
// cuenta tiene acceso (folio, asunto, área, responsable, vencimiento y estado), las actividades del día
// y los indicadores. El frontend solo filtra y busca sobre lo que llegue.
import type { AccesoCuenta } from "../../../servicios/auth";
import { capacidadPanel, permisoGlobal } from "../../../servicios/accesoPanel";
import type { NombreIcono } from "./iconos";

export type AreaPendiente = "propuestas" | "visitas" | "inscripciones" | "contactos" | "resenas" | "credenciales" | "administracion";
export type TonoEstado = "dorado" | "verde" | "guinda" | "gris";

export type Pendiente = {
    folio: string;
    asunto: string;
    area: AreaPendiente;
    responsable: string;
    vence: string; // texto ya listo: "Hoy", "Mañana", "En 3 días"
    urgente?: boolean; // vence hoy: se pinta en guinda
    estado: { texto: string; tono: TonoEstado };
    ruta: string; // pantalla donde se atiende
    icono?: NombreIcono; // el de la tarea (si falta, el de su área)
};

export const AREAS: { id: AreaPendiente; nombre: string }[] = [
    { id: "propuestas", nombre: "Propuestas" },
    { id: "visitas", nombre: "Visitas y espacios" },
    { id: "inscripciones", nombre: "Inscripciones" },
    { id: "contactos", nombre: "Contactos" },
    { id: "resenas", nombre: "Reseñas" },
    { id: "administracion", nombre: "Administración" },
];

export const NOMBRE_AREA: Record<AreaPendiente, string> = {
    propuestas: "Propuestas",
    visitas: "Visitas y espacios",
    inscripciones: "Inscripciones",
    contactos: "Contactos",
    resenas: "Lecturas y reseñas",
    credenciales: "Credenciales",
    administracion: "Administración",
};

export const pendientes: Pendiente[] = [
    { folio: "PR-0012", asunto: "Propuesta: club de lectura", area: "propuestas", responsable: "Ana M.", vence: "Hoy", urgente: true, estado: { texto: "En revisión", tono: "dorado" }, ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { folio: "VS-0008", asunto: "Visita escolar (30 personas)", area: "visitas", responsable: "Luis R.", vence: "Mañana", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas", icono: "grupo" },
    { folio: "IN-0045", asunto: "Inscripciones: taller infantil", area: "inscripciones", responsable: "Ana M.", vence: "Hoy", urgente: true, estado: { texto: "5 pendientes", tono: "dorado" }, ruta: "/admin/actividades/inscripciones", icono: "inscripciones" },
    { folio: "CT-0031", asunto: "Sugerencia de horario", area: "contactos", responsable: "Servicios Dig.", vence: "En 3 días", estado: { texto: "Recibido", tono: "verde" }, ruta: "/admin/atencion/contactos", icono: "reloj" },
    { folio: "RV-0003", asunto: "Reseña por autorizar", area: "resenas", responsable: "Sin asignar", vence: "En 5 días", estado: { texto: "Por autorizar", tono: "dorado" }, ruta: "/admin/contenidos/revision", icono: "revision" },
    { folio: "PR-0011", asunto: "Propuesta: taller de dibujo", area: "propuestas", responsable: "Luis R.", vence: "En 2 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { folio: "PR-0010", asunto: "Propuesta: charla de historia", area: "propuestas", responsable: "Sin asignar", vence: "En 4 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { folio: "PR-0009", asunto: "Propuesta: club de ajedrez", area: "propuestas", responsable: "Ana M.", vence: "En 6 días", estado: { texto: "Con observaciones", tono: "guinda" }, ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { folio: "VS-0007", asunto: "Uso de sala para grupo de lectura", area: "visitas", responsable: "Luis R.", vence: "En 2 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas", icono: "espacios" },
    { folio: "VS-0006", asunto: "Visita guiada (12 personas)", area: "visitas", responsable: "Sin asignar", vence: "En 5 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas", icono: "grupo" },
    { folio: "IN-0044", asunto: "Inscripciones: cine debate", area: "inscripciones", responsable: "Ana M.", vence: "Mañana", estado: { texto: "3 pendientes", tono: "dorado" }, ruta: "/admin/actividades/inscripciones", icono: "inscripciones" },
    { folio: "CT-0030", asunto: "Duda sobre la credencial", area: "contactos", responsable: "Servicios Dig.", vence: "Mañana", estado: { texto: "Recibido", tono: "verde" }, ruta: "/admin/atencion/contactos", icono: "credencial" },
    { folio: "CT-0029", asunto: "Consulta de préstamo", area: "contactos", responsable: "Servicios Dig.", vence: "En 4 días", estado: { texto: "En atención", tono: "dorado" }, ruta: "/admin/atencion/contactos", icono: "fuentes" },
    { folio: "RV-0002", asunto: "Reseña: novela regional", area: "resenas", responsable: "Sin asignar", vence: "En 6 días", estado: { texto: "Por autorizar", tono: "dorado" }, ruta: "/admin/contenidos/revision", icono: "revision" },
    // Administración (cuentas, asistente, configuración y estados del sistema)
    { folio: "AD-0021", asunto: "Cuenta del personal por activar: Ana Martínez", area: "administracion", responsable: "Sin asignar", vence: "Hoy", urgente: true, estado: { texto: "Por activar", tono: "dorado" }, ruta: "/admin/administracion/cuentas", icono: "usuario" },
    { folio: "AD-0020", asunto: "Permisos por revisar: Coordinación de actividades", area: "administracion", responsable: "Sin asignar", vence: "Mañana", estado: { texto: "Por revisar", tono: "dorado" }, ruta: "/admin/administracion/cuentas", icono: "cuentas" },
    { folio: "FU-0004", asunto: "Fuente del asistente desactualizada: Reglamento de préstamo", area: "administracion", responsable: "Sin asignar", vence: "En 2 días", estado: { texto: "Desactualizada", tono: "guinda" }, ruta: "/admin/administracion/fuentes", icono: "fuentes" },
    { folio: "CF-0002", asunto: "Horario de diciembre por publicar", area: "administracion", responsable: "Sin asignar", vence: "En 3 días", estado: { texto: "Borrador", tono: "gris" }, ruta: "/admin/administracion/configuracion", icono: "calendario" },
];

// Las 4 tarjetas de «¿Qué necesita tu atención hoy?»
export type Prioridad = {
    titulo: string;
    detalle: string;
    chip: { texto: string; tono: TonoEstado };
    fondo: "rosa" | "dorado" | "verde" | "blanco";
    icono: "archivo" | "lista" | "usuarios" | "correo";
    ruta: string;
};

export const prioridades: Prioridad[] = [
    { titulo: "5 credenciales por cotejar", detalle: "Cotejo presencial en Préstamos · 2 vencen pronto.", chip: { texto: "Vence hoy", tono: "guinda" }, fondo: "rosa", icono: "archivo", ruta: "/admin/atencion/credenciales" },
    { titulo: "4 propuestas por revisar", detalle: "Esperan resolución · folio más antiguo hace 6 días.", chip: { texto: "Hace 6 días", tono: "dorado" }, fondo: "dorado", icono: "lista", ruta: "/admin/atencion/propuestas" },
    { titulo: "12 inscripciones pendientes", detalle: "Por confirmar según cupo · 3 actividades.", chip: { texto: "Cupo por cerrar", tono: "verde" }, fondo: "verde", icono: "usuarios", ruta: "/admin/actividades/inscripciones" },
    { titulo: "7 casos de contacto abiertos", detalle: "Servicios Digitales · 2 recibidos hoy.", chip: { texto: "Sin vencer", tono: "gris" }, fondo: "blanco", icono: "correo", ruta: "/admin/atencion/contactos" },
];

// ---------- Accesos rápidos (21 nov 2026) ----------
// Las tareas más frecuentes del personal, con nombres sencillos. Cada una lleva a una pantalla que ya existe; solo se
// muestran las que la cuenta puede abrir (vistaEnlace). El orden es el de uso diario.
export type IconoAcceso = "credencial" | "propuesta" | "inscripciones" | "asistencia" | "calendario" | "mensajes" | "contenido" | "aviso" | "espacios" | "cuentas" | "foro" | "cotejo"
    | "estadisticas" | "bitacora" | "configuracion" | "estados" | "fuentes" | "recompensa" | "recuperacion" | "evidencias" | "buscarCuenta" | "revision";
export type AccesoRapido = { titulo: string; texto: string; ruta: string; icono: IconoAcceso };
export const ACCESOS_RAPIDOS: AccesoRapido[] = [
    // Atención al público
    { titulo: "Credenciales", texto: "Revisar solicitudes", ruta: "/admin/atencion/credenciales", icono: "credencial" },
    { titulo: "Cotejo", texto: "Validar en Préstamos", ruta: "/admin/participantes/cotejo", icono: "cotejo" },
    { titulo: "Propuestas", texto: "Revisar eventos propuestos", ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { titulo: "Mensajes", texto: "Contactos y sugerencias", ruta: "/admin/atencion/contactos", icono: "mensajes" },
    { titulo: "Recuperar acceso", texto: "Orientar a una persona", ruta: "/admin/atencion/recuperacion", icono: "recuperacion" },
    { titulo: "Altas asistidas", texto: "Registrar a una persona", ruta: "/admin/atencion/altas-asistidas", icono: "cuentas" },
    { titulo: "Consultar cuentas", texto: "Buscar a una persona", ruta: "/admin/atencion/cuentas", icono: "buscarCuenta" },
    // Actividades
    { titulo: "Inscripciones", texto: "Cupos y lugares", ruta: "/admin/actividades/inscripciones", icono: "inscripciones" },
    { titulo: "Pasar lista", texto: "Asistencia de hoy", ruta: "/admin/actividades/asistencia", icono: "asistencia" },
    { titulo: "Calendario", texto: "Actividades y salas", ruta: "/admin/actividades/calendario", icono: "calendario" },
    { titulo: "Espacios", texto: "Solicitudes de salas", ruta: "/admin/atencion/espacios", icono: "espacios" },
    { titulo: "Visitas", texto: "Visitas y uso de espacios", ruta: "/admin/actividades/visitas", icono: "espacios" },
    { titulo: "Evidencias", texto: "Fotos y listas firmadas", ruta: "/admin/actividades/evidencias", icono: "evidencias" },
    // Contenidos y participantes
    { titulo: "Autorizar", texto: "Contenidos en revisión", ruta: "/admin/contenidos/revision", icono: "revision" },
    { titulo: "Mis contenidos", texto: "Borradores y enviados", ruta: "/admin/contenidos/editor", icono: "contenido" },
    { titulo: "Nueva noticia", texto: "Avisos y novedades", ruta: "/admin/contenidos/editor/nuevo/noticia", icono: "aviso" },
    { titulo: "Nueva reseña", texto: "Un libro recomendado", ruta: "/admin/contenidos/editor/nuevo/resena", icono: "fuentes" },
    { titulo: "Avisos", texto: "Enviar un aviso", ruta: "/admin/atencion/avisos", icono: "aviso" },
    { titulo: "Recompensas", texto: "Progreso de lectores", ruta: "/admin/participantes/progreso", icono: "recompensa" },
    { titulo: "Foro", texto: "Moderar el club", ruta: "/admin/participantes/foro", icono: "foro" },
    // Administración
    { titulo: "Cuentas", texto: "Personal y permisos", ruta: "/admin/administracion/cuentas", icono: "cuentas" },
    { titulo: "Estados del sistema", texto: "Mensajes del panel", ruta: "/admin/administracion/estados", icono: "estados" },
    { titulo: "Configuración", texto: "Datos y horarios", ruta: "/admin/administracion/configuracion", icono: "configuracion" },
    { titulo: "Fuentes", texto: "Lo que sabe el asistente", ruta: "/admin/administracion/fuentes", icono: "fuentes" },
    { titulo: "Estadísticas", texto: "Uso del portal", ruta: "/admin/administracion/estadisticas", icono: "estadisticas" },
    { titulo: "Bitácora", texto: "Quién cambió qué", ruta: "/admin/administracion/bitacora", icono: "bitacora" },
];
// Cuatro (un renglón): solo las tareas de todos los días de cada cuenta; lo demás está en el menú (Aldahir, 21 nov 2026)
export const MAXIMO_ACCESOS = 4;
// Los accesos que la cuenta puede abrir, en su orden, hasta el máximo (los demás siguen en el menú)
export function accesosDeLaCuenta(acceso: AccesoCuenta | null | undefined, lista = ACCESOS_RAPIDOS, maximo = MAXIMO_ACCESOS) {
    return lista.filter((a) => vistaEnlace(a.ruta, acceso) === "enlace").slice(0, maximo);
}

// Momento de cada actividad respecto a la hora actual (hora de Tepic): ya pasó, es la que sigue o está más adelante.
// Sin duración en los datos, una actividad «pasó» cuando ya empezó la siguiente o lleva más de 90 min.
export type MomentoActividad = "pasada" | "ahora" | "siguiente" | "despues";
export function momentosDelDia(horas: string[], minutosAhora: number): MomentoActividad[] {
    const min = horas.map((h) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); });
    const siguiente = min.findIndex((m) => m > minutosAhora);
    return min.map((m, i) => {
        if (m > minutosAhora) return i === siguiente ? "siguiente" : "despues";
        const fin = i + 1 < min.length ? Math.min(min[i + 1], m + 90) : m + 90;
        return minutosAhora < fin ? "ahora" : "pasada";
    });
}

// TODO backend: actividades del día (hora, título, lugar, cupo y estado). Varias, con estados distintos, para revisar el diseño.
export type ActividadHoy = { hora: string; titulo: string; detalle: string; chip: { texto: string; tono: TonoEstado }; pasarLista?: boolean };
export const actividadesHoy: ActividadHoy[] = [
    { hora: "09:00", titulo: "Hora del cuento", detalle: "Sala infantil, 22 asistentes", chip: { texto: "Asistencia registrada", tono: "verde" } },
    { hora: "11:00", titulo: "Taller de lectura en voz alta", detalle: "Sala de actividades, lista por pasar", chip: { texto: "Asistencia abierta", tono: "verde" }, pasarLista: true },
    { hora: "12:30", titulo: "Visita escolar guiada (30 personas)", detalle: "Recorrido por la biblioteca", chip: { texto: "En curso", tono: "dorado" } },
    { hora: "16:00", titulo: "Cine debate", detalle: "Sala de lectura, cupo lleno", chip: { texto: "Confirmada", tono: "dorado" } },
    { hora: "17:00", titulo: "Club de ajedrez", detalle: "Sala de usos múltiples, 8 de 16 lugares", chip: { texto: "Por iniciar", tono: "gris" } },
    { hora: "18:00", titulo: "Taller de dibujo", detalle: "Sala de actividades, el ponente canceló", chip: { texto: "Cancelada", tono: "guinda" } },
    { hora: "18:30", titulo: "Presentación del libro Voces de Nayarit: relatos de la costa y la sierra", detalle: "Auditorio, 45 inscritos", chip: { texto: "Confirmada", tono: "dorado" } },
];

export const REGLAS = [
    "El Administrador autoriza y publica el contenido que redacta el Editor.",
    "Proponer no autoriza ni reserva: dirección determina la vía y se registra la resolución.",
    "Confirmar una inscripción no acredita asistencia.",
    "Cada decisión conserva autor, fecha y motivo.",
];

// ---------- Reglas puras (con pruebas en tests/resumen.test.ts) ----------

export function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// ---------- Pendientes por vencimiento (21 nov 2026: una sola lista, agrupada y ordenada) ----------
export type Plazo = "hoy" | "manana" | "semana";
export const PLAZOS: { id: Plazo; nombre: string }[] = [
    { id: "hoy", nombre: "Vencen hoy" },
    { id: "manana", nombre: "Mañana" },
    { id: "semana", nombre: "Esta semana" },
];

// Días que faltan: «Hoy» 0, «Mañana» 1, «En 3 días» 3 (lo que no se entiende va al final)
export function diasParaVencer(p: Pendiente) {
    const vence = normalizar(p.vence);
    if (p.urgente || vence === "hoy") return 0;
    if (vence === "manana") return 1;
    const dias = /en (\d+) dia/.exec(vence);
    return dias ? Number(dias[1]) : 99;
}
export function plazoDe(p: Pendiente): Plazo {
    const dias = diasParaVencer(p);
    return dias === 0 ? "hoy" : dias === 1 ? "manana" : "semana";
}
export const ordenarPorVencimiento = (lista: Pendiente[]) => [...lista].sort((a, b) => diasParaVencer(a) - diasParaVencer(b));

// Solo lo que la cuenta puede atender (si no tiene permiso para la pantalla, no lo ve)
export const pendientesDeLaCuenta = (lista: Pendiente[], acceso: AccesoCuenta | null | undefined) =>
    lista.filter((p) => vistaEnlace(p.ruta, acceso) !== "oculto");

// Filtra por área, por texto en folio o asunto y por plazo
export function filtrarPendientes(lista: Pendiente[], area: AreaPendiente | null, texto: string, plazo: Plazo | null = null) {
    const buscado = normalizar(texto);
    return lista.filter((p) =>
        (!area || p.area === area) &&
        (!plazo || plazoDe(p) === plazo) &&
        (!buscado || normalizar(p.folio).includes(buscado) || normalizar(p.asunto).includes(buscado)));
}

export function contarPorPlazo(lista: Pendiente[]) {
    return Object.fromEntries(PLAZOS.map((x) => [x.id, lista.filter((p) => plazoDe(p) === x.id).length])) as Record<Plazo, number>;
}

// Cuánto espera en cada pantalla (para los accesos rápidos): total y cuántos vencen hoy
export function pendientesPorRuta(lista: Pendiente[]) {
    const cuenta: Record<string, { total: number; hoy: number }> = {};
    for (const p of lista) {
        const c = (cuenta[p.ruta] ??= { total: 0, hoy: 0 });
        c.total += 1;
        if (plazoDe(p) === "hoy") c.hoy += 1;
    }
    return cuenta;
}

// Ícono de cada área (el mismo de su acceso rápido)
export const ICONO_AREA: Record<AreaPendiente, IconoAcceso> = {
    propuestas: "propuesta", visitas: "espacios", inscripciones: "inscripciones", contactos: "mensajes", resenas: "contenido", credenciales: "credencial", administracion: "cuentas",
};

export function contarPorArea(lista: Pendiente[]) {
    return Object.fromEntries(AREAS.map((a) => [a.id, lista.filter((p) => p.area === a.id).length])) as Record<AreaPendiente, number>;
}

// Cómo se muestra un acceso a otra pantalla: enlace si la cuenta tiene el permiso; oculto si no lo tiene;
// «pronto» (mismo aspecto, sin enlace) si esa pantalla todavía no existe.
export type VistaEnlace = "enlace" | "oculto" | "pronto";
export function vistaEnlace(ruta: string, acceso: AccesoCuenta | null | undefined): VistaEnlace {
    const capacidad = capacidadPanel(ruta);
    if (!capacidad) return "pronto";
    return acceso && permisoGlobal(acceso, capacidad) ? "enlace" : "oculto";
}

// «Buenos días / tardes / noches» según la hora local
export function saludo(hora: number) {
    if (hora < 12) return "Buenos días";
    if (hora < 19) return "Buenas tardes";
    return "Buenas noches";
}

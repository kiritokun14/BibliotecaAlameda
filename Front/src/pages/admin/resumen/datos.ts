// Datos de ejemplo del Resumen del panel (Figma «Admin · Resumen», 358:3838).
// TODO backend: un endpoint de resumen debe devolver los pendientes de todas las áreas a las que la
// cuenta tiene acceso (folio, asunto, área, responsable, vencimiento y estado), las actividades del día
// y los indicadores. El frontend solo filtra y busca sobre lo que llegue.
import type { AccesoCuenta } from "../../../servicios/auth";
import { capacidadPanel, permisoGlobal } from "../../../servicios/accesoPanel";

export type AreaPendiente = "propuestas" | "visitas" | "inscripciones" | "contactos" | "resenas" | "credenciales";
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
};

export const AREAS: { id: AreaPendiente; nombre: string }[] = [
    { id: "propuestas", nombre: "Propuestas" },
    { id: "visitas", nombre: "Visitas y espacios" },
    { id: "inscripciones", nombre: "Inscripciones" },
    { id: "contactos", nombre: "Contactos" },
    { id: "resenas", nombre: "Reseñas" },
];

export const NOMBRE_AREA: Record<AreaPendiente, string> = {
    propuestas: "Propuestas",
    visitas: "Visitas y espacios",
    inscripciones: "Inscripciones",
    contactos: "Contactos",
    resenas: "Lecturas y reseñas",
    credenciales: "Credenciales",
};

export const pendientes: Pendiente[] = [
    { folio: "PR-0012", asunto: "Propuesta: club de lectura", area: "propuestas", responsable: "Ana M.", vence: "Hoy", urgente: true, estado: { texto: "En revisión", tono: "dorado" }, ruta: "/admin/atencion/propuestas" },
    { folio: "VS-0008", asunto: "Visita escolar (30 personas)", area: "visitas", responsable: "Luis R.", vence: "Mañana", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas" },
    { folio: "IN-0045", asunto: "Inscripciones: taller infantil", area: "inscripciones", responsable: "Ana M.", vence: "Hoy", urgente: true, estado: { texto: "5 pendientes", tono: "dorado" }, ruta: "/admin/actividades/inscripciones" },
    { folio: "CT-0031", asunto: "Sugerencia de horario", area: "contactos", responsable: "Servicios Dig.", vence: "En 3 días", estado: { texto: "Recibido", tono: "verde" }, ruta: "/admin/atencion/contactos" },
    { folio: "RV-0003", asunto: "Reseña por autorizar", area: "resenas", responsable: "Sin asignar", vence: "En 5 días", estado: { texto: "Por autorizar", tono: "dorado" }, ruta: "/admin/contenidos/revision" },
    { folio: "PR-0011", asunto: "Propuesta: taller de dibujo", area: "propuestas", responsable: "Luis R.", vence: "En 2 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/atencion/propuestas" },
    { folio: "PR-0010", asunto: "Propuesta: charla de historia", area: "propuestas", responsable: "Sin asignar", vence: "En 4 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/atencion/propuestas" },
    { folio: "PR-0009", asunto: "Propuesta: club de ajedrez", area: "propuestas", responsable: "Ana M.", vence: "En 6 días", estado: { texto: "Con observaciones", tono: "guinda" }, ruta: "/admin/atencion/propuestas" },
    { folio: "VS-0007", asunto: "Uso de sala para grupo de lectura", area: "visitas", responsable: "Luis R.", vence: "En 2 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas" },
    { folio: "VS-0006", asunto: "Visita guiada (12 personas)", area: "visitas", responsable: "Sin asignar", vence: "En 5 días", estado: { texto: "Nueva", tono: "dorado" }, ruta: "/admin/actividades/visitas" },
    { folio: "IN-0044", asunto: "Inscripciones: cine debate", area: "inscripciones", responsable: "Ana M.", vence: "Mañana", estado: { texto: "3 pendientes", tono: "dorado" }, ruta: "/admin/actividades/inscripciones" },
    { folio: "CT-0030", asunto: "Duda sobre la credencial", area: "contactos", responsable: "Servicios Dig.", vence: "Mañana", estado: { texto: "Recibido", tono: "verde" }, ruta: "/admin/atencion/contactos" },
    { folio: "CT-0029", asunto: "Consulta de préstamo", area: "contactos", responsable: "Servicios Dig.", vence: "En 4 días", estado: { texto: "En atención", tono: "dorado" }, ruta: "/admin/atencion/contactos" },
    { folio: "RV-0002", asunto: "Reseña: novela regional", area: "resenas", responsable: "Sin asignar", vence: "En 6 días", estado: { texto: "Por autorizar", tono: "dorado" }, ruta: "/admin/contenidos/revision" },
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
export type IconoAcceso = "credencial" | "propuesta" | "inscripciones" | "asistencia" | "calendario" | "mensajes" | "contenido" | "aviso" | "espacios" | "cuentas" | "foro" | "cotejo";
export type AccesoRapido = { titulo: string; texto: string; ruta: string; icono: IconoAcceso };
export const ACCESOS_RAPIDOS: AccesoRapido[] = [
    { titulo: "Credenciales", texto: "Revisar solicitudes", ruta: "/admin/atencion/credenciales", icono: "credencial" },
    { titulo: "Cotejo", texto: "Validar en Préstamos", ruta: "/admin/participantes/cotejo", icono: "cotejo" },
    { titulo: "Propuestas", texto: "Revisar eventos propuestos", ruta: "/admin/atencion/propuestas", icono: "propuesta" },
    { titulo: "Espacios", texto: "Solicitudes de salas", ruta: "/admin/atencion/espacios", icono: "espacios" },
    { titulo: "Inscripciones", texto: "Cupos y lugares", ruta: "/admin/actividades/inscripciones", icono: "inscripciones" },
    { titulo: "Pasar lista", texto: "Asistencia de hoy", ruta: "/admin/actividades/asistencia", icono: "asistencia" },
    { titulo: "Calendario", texto: "Actividades y salas", ruta: "/admin/actividades/calendario", icono: "calendario" },
    { titulo: "Mensajes", texto: "Contactos y sugerencias", ruta: "/admin/atencion/contactos", icono: "mensajes" },
    { titulo: "Publicar", texto: "Noticias y reseñas", ruta: "/admin/contenidos/editor", icono: "contenido" },
    { titulo: "Avisos", texto: "Enviar un aviso", ruta: "/admin/atencion/avisos", icono: "aviso" },
    { titulo: "Foro", texto: "Moderar el club", ruta: "/admin/participantes/foro", icono: "foro" },
    { titulo: "Cuentas", texto: "Personal y permisos", ruta: "/admin/administracion/cuentas", icono: "cuentas" },
];
export const MAXIMO_ACCESOS = 8;
// Los accesos que la cuenta puede abrir, en su orden, hasta el máximo (los demás siguen en el menú)
export function accesosDeLaCuenta(acceso: AccesoCuenta | null | undefined, lista = ACCESOS_RAPIDOS, maximo = MAXIMO_ACCESOS) {
    return lista.filter((a) => vistaEnlace(a.ruta, acceso) === "enlace").slice(0, maximo);
}

export const actividadesHoy = [
    { titulo: "Taller de lectura en voz alta", detalle: "Sala de actividades · lista por pasar", chip: { texto: "Asistencia abierta", tono: "verde" as TonoEstado }, pasarLista: true },
    { titulo: "Cine debate", detalle: "Sala de lectura · cupo lleno", chip: { texto: "Confirmada", tono: "dorado" as TonoEstado }, pasarLista: false },
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

// Filtra por pestaña (área) y por texto en folio o asunto
export function filtrarPendientes(lista: Pendiente[], area: AreaPendiente | null, texto: string) {
    const buscado = normalizar(texto);
    return lista.filter((p) =>
        (!area || p.area === area) &&
        (!buscado || normalizar(p.folio).includes(buscado) || normalizar(p.asunto).includes(buscado)));
}

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

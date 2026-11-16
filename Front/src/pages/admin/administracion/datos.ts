// Administración: Estadísticas, Bitácora de cambios y Configuración del portal (datos de ejemplo).
// TODO backend: no hay endpoints para estos módulos. Se espera:
//  - GET /estadisticas?seccion=portal|actividades|contenidos&desde=&hasta= (indicadores, serie semanal y tabla);
//  - GET /bitacora?modulo=&tipo=&desde=&hasta=&texto= (movimientos de todo el panel, solo lectura) y su exportación;
//  - GET/PUT /configuracion (datos de la biblioteca, horarios, días especiales, reglas de actividades y mantenimiento).
import { useSyncExternalStore } from "react";

// ---------- Estadísticas (Figma 580:49970) ----------

export type SeccionEstadistica = "portal" | "actividades" | "contenidos";
export type Periodo = "30dias" | "mes" | "anio";

export type Indicador = { titulo: string; valor: string; detalle: string };
export type Estadisticas = { indicadores: Indicador[]; serie: { etiqueta: string; valor: number }[]; tituloSerie: string; tabla: { nombre: string; valor: number }[]; tituloTabla: string };

const FACTOR: Record<Periodo, number> = { "30dias": 1, mes: 0.8, anio: 11 };

export function estadisticas(seccion: SeccionEstadistica, periodo: Periodo): Estadisticas {
    const f = FACTOR[periodo];
    const n = (v: number) => Math.round(v * f);
    const miles = (v: number) => n(v).toLocaleString("es-MX");
    if (seccion === "actividades") return {
        indicadores: [
            { titulo: "Actividades realizadas", valor: miles(18), detalle: "En el periodo (ejemplo)" },
            { titulo: "Personas inscritas", valor: miles(412), detalle: "Con y sin cuenta" },
            { titulo: "Asistencia promedio", valor: "84%", detalle: "De las inscritas" },
            { titulo: "Canceladas", valor: miles(2), detalle: "Con aviso" },
        ],
        tituloSerie: "Asistentes por semana", serie: [["Sem 1", 92], ["Sem 2", 110], ["Sem 3", 76], ["Sem 4", 134], ["Sem 5", 58]].map(([e, v]) => ({ etiqueta: String(e), valor: n(Number(v)) })),
        tituloTabla: "Actividades con más asistentes", tabla: [["Club de lectura", 64], ["Taller de lectura en voz alta", 52], ["Charla: historia de Tepic", 48], ["Club de cómputo", 31]].map(([a, v]) => ({ nombre: String(a), valor: n(Number(v)) })),
    };
    if (seccion === "contenidos") return {
        indicadores: [
            { titulo: "Publicados", valor: miles(9), detalle: "Noticias, reseñas y textos" },
            { titulo: "Lecturas de contenidos", valor: miles(2380), detalle: "Visitas a noticias y reseñas" },
            { titulo: "Por autorizar", valor: "3", detalle: "Hoy (ejemplo)" },
            { titulo: "Tiempo de revisión", valor: "1.4 días", detalle: "Promedio" },
        ],
        tituloSerie: "Lecturas por semana", serie: [["Sem 1", 420], ["Sem 2", 510], ["Sem 3", 630], ["Sem 4", 480], ["Sem 5", 340]].map(([e, v]) => ({ etiqueta: String(e), valor: n(Number(v)) })),
        tituloTabla: "Contenidos más leídos", tabla: [["Horario especial de fin de año", 610], ["Reseña: Cuentos de la Alameda", 480], ["Nuevo catálogo en línea", 350], ["Historia de la biblioteca", 210]].map(([a, v]) => ({ nombre: String(a), valor: n(Number(v)) })),
    };
    return {
        indicadores: [
            { titulo: "Visitas", valor: miles(4820), detalle: "+8% vs. periodo anterior (ejemplo)" },
            { titulo: "Personas distintas", valor: miles(1310), detalle: "Con y sin cuenta" },
            { titulo: "Cuentas activas", valor: miles(214), detalle: "Total" },
            { titulo: "Tiempo promedio", valor: "3:20", detalle: "Minutos" },
        ],
        tituloSerie: "Visitas por semana", serie: [["Sem 1", 980], ["Sem 2", 1120], ["Sem 3", 1240], ["Sem 4", 1010], ["Sem 5", 470]].map(([e, v]) => ({ etiqueta: String(e), valor: n(Number(v)) })),
        tituloTabla: "Páginas más visitadas", tabla: [["Inicio", 1820], ["Eventos", 1105], ["Lecturas y reseñas", 760], ["Noticias", 540]].map(([a, v]) => ({ nombre: String(a), valor: n(Number(v)) })),
    };
}

export const porcentaje = (valor: number, total: number) => (total > 0 ? `${Math.round((valor / total) * 100)}%` : "0%");

// ---------- Bitácora de cambios (Figma 580:53590) ----------

export type ModuloBitacora = "Contenidos" | "Actividades" | "Participantes" | "Atención" | "Administración";
export type Movimiento = { folio: string; fecha: string; persona: string; modulo: ModuloBitacora; accion: string; tipo: "Normal" | "Sensible"; detalle: string };

export const MODULOS: ModuloBitacora[] = ["Contenidos", "Actividades", "Participantes", "Atención", "Administración"];

export const MOVIMIENTOS: Movimiento[] = [
    { folio: "BT-1482", fecha: "2026-10-28T09:30", persona: "Administrador (ejemplo)", modulo: "Administración", accion: "Descargó evidencia EV-0061", tipo: "Sensible", detalle: "Descarga de una lista firmada del Club de lectura." },
    { folio: "BT-1481", fecha: "2026-10-28T09:12", persona: "Personal (ejemplo)", modulo: "Actividades", accion: "Cerró lista de asistencia AC-0108", tipo: "Normal", detalle: "18 presentes de 20 inscritos." },
    { folio: "BT-1480", fecha: "2026-10-27T18:40", persona: "Administrador (ejemplo)", modulo: "Administración", accion: "Cambió permisos del rol «Editor»", tipo: "Sensible", detalle: "Se agregó «Revisar y publicar contenidos»." },
    { folio: "BT-1479", fecha: "2026-10-27T16:05", persona: "Personal (ejemplo)", modulo: "Contenidos", accion: "Publicó reseña CN-0030", tipo: "Normal", detalle: "Autorización: oficio por confirmar." },
    { folio: "BT-1478", fecha: "2026-10-27T11:20", persona: "Personal (ejemplo)", modulo: "Atención", accion: "Aprobó credencial CRED-0410", tipo: "Normal", detalle: "Cotejo completo." },
    { folio: "BT-1477", fecha: "2026-10-26T13:02", persona: "Personal (ejemplo)", modulo: "Participantes", accion: "Retiró publicación FO-0230", tipo: "Normal", detalle: "Norma 2: respeto entre participantes." },
    { folio: "BT-1476", fecha: "2026-10-25T10:44", persona: "Administrador (ejemplo)", modulo: "Atención", accion: "Consultó datos sensibles de C-0214", tipo: "Sensible", detalle: "Motivo: la persona pidió ayuda en mostrador." },
];

export type FiltrosBitacora = { modulo: ModuloBitacora | "todos"; texto: string; tipo: "todos" | "Normal" | "Sensible"; desde: string; hasta: string };

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function filtrarBitacora(lista: Movimiento[], f: FiltrosBitacora) {
    const buscado = normalizar(f.texto);
    return lista.filter((m) =>
        (f.modulo === "todos" || m.modulo === f.modulo) &&
        (f.tipo === "todos" || m.tipo === f.tipo) &&
        (!f.desde || m.fecha.slice(0, 10) >= f.desde) &&
        (!f.hasta || m.fecha.slice(0, 10) <= f.hasta) &&
        (!buscado || normalizar(`${m.folio} ${m.persona} ${m.accion}`).includes(buscado)));
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaHora(iso: string) {
    const [fecha, hora = ""] = iso.split("T");
    const [a, m, d] = fecha.split("-").map(Number);
    return `${d} ${MESES[m - 1]} ${a}${hora ? ` · ${hora.slice(0, 5)}` : ""}`;
}

// ---------- Configuración del portal (Figma 580:56315) ----------

export type Horario = { dia: string; abre: string; cierra: string; abierto: boolean };
export type DiaEspecial = { fecha: string; motivo: string };
export type Configuracion = {
    nombre: string; ciudad: string; correo: string; telefono: string; direccion: string; bienvenida: string;
    horarios: Horario[]; especiales: DiaEspecial[];
    cupoMaximo: number; diasAnticipacion: number; recordatorioHoras: number;
    mantenimiento: boolean; mensajeMantenimiento: string;
};

export const CONFIGURACION_INICIAL: Configuracion = {
    nombre: "Biblioteca Solón Argüello", ciudad: "Tepic, Nayarit", correo: "", telefono: "", direccion: "",
    bienvenida: "Bienvenida a tu biblioteca. Aquí encuentras lecturas, eventos y servicios.",
    horarios: [
        { dia: "Lunes", abre: "09:00", cierra: "20:00", abierto: true }, { dia: "Martes", abre: "09:00", cierra: "20:00", abierto: true },
        { dia: "Miércoles", abre: "09:00", cierra: "20:00", abierto: true }, { dia: "Jueves", abre: "09:00", cierra: "20:00", abierto: true },
        { dia: "Viernes", abre: "09:00", cierra: "20:00", abierto: true }, { dia: "Sábado", abre: "10:00", cierra: "14:00", abierto: true },
        { dia: "Domingo", abre: "", cierra: "", abierto: false },
    ],
    especiales: [{ fecha: "2026-12-25", motivo: "Navidad" }],
    cupoMaximo: 40, diasAnticipacion: 7, recordatorioHoras: 24,
    mantenimiento: false, mensajeMantenimiento: "Estamos haciendo mejoras. Volvemos pronto.",
};

export type ErroresConfiguracion = Partial<Record<"nombre" | "ciudad" | "correo" | "horarios" | "cupoMaximo" | "diasAnticipacion" | "recordatorioHoras" | "mensajeMantenimiento", string>>;

export function validarConfiguracion(c: Configuracion): ErroresConfiguracion {
    const e: ErroresConfiguracion = {};
    if (!c.nombre.trim()) e.nombre = "Escribe el nombre de la biblioteca.";
    if (!c.ciudad.trim()) e.ciudad = "Escribe la ciudad.";
    if (!c.correo.trim()) e.correo = "Escribe el correo de contacto.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.correo.trim())) e.correo = "Revisa el correo.";
    if (c.horarios.some((h) => h.abierto && (!h.abre || !h.cierra || h.cierra <= h.abre))) e.horarios = "Revisa los horarios: la hora de cierre debe ser después de la de apertura.";
    if (!(c.cupoMaximo >= 1 && c.cupoMaximo <= 500)) e.cupoMaximo = "El cupo debe estar entre 1 y 500.";
    if (!(c.diasAnticipacion >= 0 && c.diasAnticipacion <= 60)) e.diasAnticipacion = "Entre 0 y 60 días.";
    if (!(c.recordatorioHoras >= 0 && c.recordatorioHoras <= 168)) e.recordatorioHoras = "Entre 0 y 168 horas.";
    if (c.mantenimiento && !c.mensajeMantenimiento.trim()) e.mensajeMantenimiento = "Escribe el mensaje que verá la gente.";
    return e;
}

export const hayCambios = (a: Configuracion, b: Configuracion) => JSON.stringify(a) !== JSON.stringify(b);

const CLAVE = "biblioteca-panel-configuracion";
const escuchas = new Set<() => void>();
function leer(): Configuracion {
    try {
        const guardada = JSON.parse(sessionStorage.getItem(CLAVE) ?? "null");
        if (guardada && typeof guardada === "object") return { ...CONFIGURACION_INICIAL, ...guardada };
    } catch { /* sin almacenamiento */ }
    return CONFIGURACION_INICIAL;
}
let actual = leer();

export function useConfiguracion() {
    return useSyncExternalStore((avisar) => { escuchas.add(avisar); return () => { escuchas.delete(avisar); }; }, () => actual);
}
export function guardarConfiguracion(c: Configuracion) {
    actual = c;
    try { sessionStorage.setItem(CLAVE, JSON.stringify(c)); } catch { /* no pasa nada */ }
    escuchas.forEach((avisar) => avisar());
}

import { useSyncExternalStore } from "react";
import { ESQUEMAS, tituloDe, type TipoContenido, type Valores } from "./esquemas";

// Datos SIMULADOS de Contenidos (HU-12). Viven en memoria y se reinician al recargar.
// TODO backend: GET/POST/PATCH /contenidos. El Editor solo prepara (preparar_contenidos);
// autorizar y publicar lo hace quien tiene publicar_contenidos.

// borrador → por-autorizar → (observaciones → por-autorizar) → publicado | rechazado
export type EstadoContenido = "borrador" | "por-autorizar" | "observaciones" | "publicado" | "rechazado";

export const NOMBRE_ESTADO: Record<EstadoContenido, string> = {
    borrador: "Borrador",
    "por-autorizar": "Por autorizar",
    observaciones: "Con observaciones",
    publicado: "Publicado",
    rechazado: "Rechazado",
};

export type Observaciones = { fecha: string; puntos: string[] };

export type Contenido = {
    folio: string; // CN-0031
    tipo: TipoContenido;
    estado: EstadoContenido;
    actualizado: string; // ISO
    valores: Valores;
    observaciones?: Observaciones;
    notaEnvio?: string; // nota opcional para el Administrador
};

// Solo se pueden editar los borradores y los que tienen observaciones
export function esEditable(estado: EstadoContenido) {
    return estado === "borrador" || estado === "observaciones";
}

// Datos fijos que llena el portal (no los escribe el Editor)
function valoresIniciales(tipo: TipoContenido): Valores {
    const base: Valores = {};
    if (tipo === "noticia") Object.assign(base, { categoria: "Avisos", fecha: "", destacar: false, verMas: true });
    if (tipo === "resena") Object.assign(base, { vista: "Por autor", enMemoria: false, firma: "Equipo de la biblioteca · Área por confirmar" });
    if (tipo === "acerca") Object.assign(base, { seccion: "Historia", enlaceInicio: true, ultimaVersion: "12 de septiembre de 2026" });
    if (tipo === "memoria") Object.assign(base, { sePublica: "Memoria pública", permiso: false, registradaPor: "Equipo de la biblioteca · Área por confirmar" });
    return base;
}

// ---------- Ejemplos (fechas relativas a hoy para que "Hoy, Ayer, Hace 2 días" tengan sentido) ----------
const hace = (dias: number, hora = "10:20") => {
    const f = new Date();
    f.setDate(f.getDate() - dias);
    const [h, m] = hora.split(":").map(Number);
    f.setHours(h, m, 0, 0);
    return f.toISOString();
};

function ejemplo(folio: string, tipo: TipoContenido, estado: EstadoContenido, actualizado: string, valores: Valores, extra: Partial<Contenido> = {}): Contenido {
    return { folio, tipo, estado, actualizado, valores: { ...valoresIniciales(tipo), ...valores }, ...extra };
}

const iniciales: Contenido[] = [
    ejemplo("CN-0031", "noticia", "borrador", hace(0), {
        titulo: "Horario especial por el puente",
        resumen: "La biblioteca abrirá en horario reducido durante el puente de noviembre (ejemplo).",
        texto: "",
        alt: "Fachada de la biblioteca (ejemplo)",
        fecha: "2026-10-24",
        destacar: true,
    }),
    ejemplo("CN-0030", "resena", "por-autorizar", hace(1), {
        libro: "Cuentos de la Alameda", autoria: "Autora o autor (ejemplo)", genero: "Cuento", anio: "2019",
        resumen: "Cuentos breves que recorren los rincones del parque (ejemplo).",
        texto: "Una colección de cuentos breves ambientados en la Alameda de Tepic (texto de ejemplo por validar).",
        tema: "Cuentos y leyendas",
    }),
    ejemplo("CN-0029", "noticia", "observaciones", hace(2), {
        titulo: "Nueva sala de estudio disponible",
        resumen: "Abre una nueva sala con 24 lugares (ejemplo).",
        texto: "La sala abrirá el 3 y el 10 de noviembre… (texto de ejemplo).",
        imagen: "sala-estudio.jpg",
        alt: "",
        fecha: "2026-10-20",
    }, {
        observaciones: {
            fecha: "2026-10-22",
            puntos: [
                "Confirmar la fecha de apertura de la sala; el texto dice dos fechas distintas.",
                "Agregar texto alternativo a la imagen principal.",
                "Quitar el nombre de la persona que aparece en el segundo párrafo.",
            ],
        },
    }),
    ejemplo("CN-0027", "acerca", "por-autorizar", hace(3), {
        titulo: "Historia de la biblioteca",
        texto: "La Biblioteca Pública Central Estatal Solón Argüello es el espacio de lectura y encuentro de Nayarit… (texto de ejemplo por validar con la biblioteca).",
        linea: "Año de fundación · por confirmar",
    }),
    ejemplo("CN-0024", "noticia", "publicado", "2026-10-12T12:00:00", {
        titulo: "Gracias por donar libros",
        resumen: "Recibimos más de 300 libros donados por la comunidad (ejemplo).",
        texto: "Gracias a todas las personas que donaron libros durante octubre (texto de ejemplo).",
        fecha: "2026-10-12",
        categoria: "Novedades",
    }),
    ejemplo("CN-0022", "resena", "publicado", "2026-10-08T12:00:00", {
        libro: "Mitos del Nayar", autoria: "Autoría de ejemplo", genero: "Cuento",
        resumen: "Relatos tradicionales de la región (ejemplo).",
        texto: "Una recopilación de mitos y leyendas de la región (texto de ejemplo).",
    }),
    ejemplo("CN-0020", "noticia", "borrador", "2026-10-05T09:00:00", {
        titulo: "Convocatoria: club de lectura juvenil",
        resumen: "Abrimos inscripciones para el club de lectura juvenil (ejemplo).",
        texto: "",
        categoria: "Convocatorias",
    }),
    ejemplo("CN-0018", "memoria", "borrador", "2026-10-02T09:00:00", {
        titulo: "Calle Lerdo, Tepic (ejemplo)", fuente: "Archivo de la biblioteca (ejemplo)",
        tipoPieza: "Fotografía", periodo: "Década de 1950 (ejemplo)",
        resumen: "Vista de la calle principal a mitad del siglo XX (ejemplo).",
        periodoTema: "Vida cotidiana",
    }),
    ejemplo("CN-0015", "noticia", "publicado", "2026-09-28T12:00:00", {
        titulo: "Nuevo horario de la hemeroteca",
        resumen: "La hemeroteca amplía su horario por las tardes (ejemplo).",
        texto: "A partir de octubre, la hemeroteca abrirá hasta las 19:00 (texto de ejemplo).",
        fecha: "2026-09-28",
    }),
];

// ---------- Almacén en memoria ----------
let lista: Contenido[] = iniciales;
const oyentes = new Set<() => void>();

function avisar() {
    oyentes.forEach((o) => o());
}

function suscribir(oyente: () => void) {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}

export function useContenidos(): Contenido[] {
    return useSyncExternalStore(suscribir, () => lista);
}

export function obtenerContenido(folio: string | undefined): Contenido | undefined {
    return lista.find((c) => c.folio === folio);
}

export function crearContenido(tipo: TipoContenido): string {
    const mayor = Math.max(0, ...lista.map((c) => Number(c.folio.replace(/\D/g, ""))));
    const folio = `CN-${String(mayor + 1).padStart(4, "0")}`;
    lista = [{ folio, tipo, estado: "borrador", actualizado: new Date().toISOString(), valores: valoresIniciales(tipo) }, ...lista];
    avisar();
    return folio;
}

export function actualizarContenido(folio: string, cambios: Partial<Contenido>) {
    lista = lista.map((c) => (c.folio === folio ? { ...c, ...cambios, actualizado: new Date().toISOString() } : c));
    avisar();
}

// Para las pruebas
export function reiniciarContenidos(nueva: Contenido[] = iniciales) {
    lista = nueva;
    avisar();
}

// ---------- Simulación del servidor ----------
// En desarrollo: ?simular=error-guardar hace fallar el guardado para ver el aviso.
function simulacion(): string | null {
    if (!import.meta.env.DEV || typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("simular");
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// TODO backend: PATCH /contenidos/:folio (solo el autor, solo si es editable)
export async function guardarBorrador(folio: string, valores: Valores): Promise<void> {
    await espera(400);
    if (simulacion() === "error-guardar") throw new Error("No se pudo guardar");
    actualizarContenido(folio, { valores });
}

// TODO backend: POST /contenidos/:folio/enviar → queda "por-autorizar" y avisa a quien publica
export async function enviarAAutorizacion(folio: string, valores: Valores, nota: string): Promise<void> {
    await espera(400);
    if (simulacion() === "error-guardar") throw new Error("No se pudo enviar");
    actualizarContenido(folio, { valores, estado: "por-autorizar", notaEnvio: nota.trim() || undefined });
}

// ---------- Listado ----------
export type FiltroEstado = "todos" | "borrador" | "por-autorizar" | "observaciones" | "publicado";

export function filtrarContenidos(contenidos: Contenido[], filtro: FiltroEstado, busqueda: string): Contenido[] {
    const texto = busqueda.trim().toLowerCase();
    return [...contenidos]
        .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
        .filter((c) => filtro === "todos" || c.estado === filtro)
        .filter((c) => !texto || c.folio.toLowerCase().includes(texto) || tituloDe(c.tipo, c.valores).toLowerCase().includes(texto));
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "Hoy, 10:20" · "Ayer" · "Hace 3 días" · "12 oct 2026"
export function cuandoSeActualizo(iso: string, ahora = new Date()): string {
    const f = new Date(iso);
    const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dias = Math.round((dia(ahora) - dia(f)) / 86400000);
    const dos = (n: number) => String(n).padStart(2, "0");
    if (dias === 0) return `Hoy, ${dos(f.getHours())}:${dos(f.getMinutes())}`;
    if (dias === 1) return "Ayer";
    if (dias > 1 && dias < 7) return `Hace ${dias} días`;
    return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

// "2026-10-24" → "24 de octubre de 2026"
export function fechaLarga(texto: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
    const [a, m, d] = texto.split("-").map(Number);
    return `${d} de ${MESES_LARGOS[m - 1]} de ${a}`;
}

export function nombreTipo(tipo: TipoContenido) {
    return tipo === "resena" ? "Reseña" : tipo === "acerca" ? "Acerca de" : ESQUEMAS[tipo].nombre;
}

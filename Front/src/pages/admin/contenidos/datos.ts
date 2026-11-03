import { useSyncExternalStore } from "react";
import { ESQUEMAS, tituloDe, type TipoContenido, type Valores } from "./esquemas";

// Datos SIMULADOS de Contenidos (HU-12). Viven en memoria y se reinician al recargar.
// TODO backend: GET/POST/PATCH /contenidos. El Editor solo prepara (preparar_contenidos);
// autorizar y publicar lo hace quien tiene publicar_contenidos.

// borrador → por-autorizar → (observaciones → por-autorizar) → publicado | rechazado; publicado → retirado
export type EstadoContenido = "borrador" | "por-autorizar" | "observaciones" | "publicado" | "rechazado" | "retirado";

export const NOMBRE_ESTADO: Record<EstadoContenido, string> = {
    borrador: "Borrador",
    "por-autorizar": "Por autorizar",
    observaciones: "Con observaciones",
    publicado: "Publicado",
    rechazado: "Rechazado",
    retirado: "Retirado",
};

export type Observaciones = { fecha: string; puntos: string[]; limite?: string; quien?: string };

export type Contenido = {
    folio: string; // CN-0031
    tipo: TipoContenido;
    estado: EstadoContenido;
    actualizado: string; // ISO
    valores: Valores;
    observaciones?: Observaciones;
    notaEnvio?: string; // nota opcional para el Administrador
    autor?: string; // quién redactó; sin autor = la persona de la sesión (CA-12.1)
    creado?: string; // ISO
    enviado?: string; // ISO, cuándo se envió a autorización
    publicacion?: Publicacion;
    rechazo?: Decision;
    retiro?: Decision;
    notaInterna?: string;
};

export type Decision = { fecha: string; quien: string; motivo: string; explicacion?: string };
export type Publicacion = { fecha: string; autorizo: string; referencia: string; version: number; programada?: boolean };

export const YO = "Tú (Editor)";
export const OTRO_EDITOR = "Persona del equipo (ejemplo)";
export function autorDe(c: Contenido) {
    return c.autor ?? YO;
}

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

// Publicado de ejemplo (autorizado con oficio por confirmar)
const pub = (fecha: string, version = 1): Partial<Contenido> => ({
    publicacion: { fecha, autorizo: "Administrador (ejemplo)", referencia: "Oficio por confirmar (ejemplo)", version },
});
const deOtro = { autor: OTRO_EDITOR };

const iniciales: Contenido[] = [
    ejemplo("CN-0031", "noticia", "borrador", hace(0), {
        titulo: "Horario especial por el puente",
        resumen: "La biblioteca abrirá en horario reducido durante el puente de noviembre (ejemplo).",
        texto: "",
        alt: "Fachada de la biblioteca (ejemplo)",
        fecha: "2026-10-24",
        destacar: true,
    }, { creado: hace(2, "09:10") }),
    ejemplo("CN-0030", "resena", "por-autorizar", hace(1), {
        libro: "Cuentos de la Alameda", autoria: "Por confirmar", genero: "Cuento", anio: "2019",
        resumen: "Cuentos breves que recorren los rincones del parque y de la ciudad. Una lectura amable para empezar la tarde… (texto de reseña de ejemplo por validar con la biblioteca).",
        texto: "Cuentos breves que recorren los rincones del parque y de la ciudad. Una lectura amable para empezar la tarde… (texto de reseña de ejemplo por validar con la biblioteca).",
        tema: "Cuentos y leyendas",
    }, { creado: hace(3, "12:00"), enviado: hace(0, "10:42") }),
    ejemplo("CN-0029", "noticia", "observaciones", hace(2), {
        titulo: "Nueva sala de estudio disponible",
        resumen: "Abre una nueva sala con 24 lugares (ejemplo).",
        texto: "La sala abrirá el 3 y el 10 de noviembre… (texto de ejemplo).",
        imagen: "sala-estudio.jpg",
        alt: "",
        fecha: "2026-10-20",
    }, {
        creado: hace(5),
        enviado: hace(4),
        observaciones: {
            fecha: "2026-10-22",
            puntos: [
                "Confirmar la fecha de apertura de la sala; el texto dice dos fechas distintas.",
                "Agregar texto alternativo a la imagen principal.",
                "Quitar el nombre de la persona que aparece en el segundo párrafo.",
            ],
        },
    }),
    ejemplo("CN-0028", "acerca", "por-autorizar", hace(3, "11:30"), {
        seccion: "Misión y visión",
        titulo: "Misión y visión",
        texto: "Acercar la lectura, la información y la cultura a todas las personas de Nayarit… (texto de ejemplo por validar con la biblioteca).",
    }, { ...deOtro, creado: hace(6), enviado: hace(3, "11:30") }),
    ejemplo("CN-0027", "acerca", "por-autorizar", hace(3), {
        titulo: "Historia de la biblioteca",
        texto: "La Biblioteca Pública Central Estatal Solón Argüello es el espacio de lectura y encuentro de Nayarit… (texto de ejemplo por validar con la biblioteca).",
        linea: "Año de fundación · por confirmar",
    }, { creado: hace(6), enviado: hace(3) }),
    ejemplo("CN-0026", "memoria", "por-autorizar", hace(0, "09:05"), {
        titulo: "Calle Lerdo, Tepic (ejemplo)", fuente: "Archivo de la biblioteca (ejemplo)",
        tipoPieza: "Fotografía", periodo: "Década de 1950 (ejemplo)",
        resumen: "Vista de la calle principal a mitad del siglo XX, con comercios y transeúntes (ejemplo).",
        texto: "Vista de la calle principal a mitad del siglo XX, con comercios y transeúntes (ejemplo).",
        periodoTema: "Vida cotidiana",
        imagen: "calle-lerdo.jpg",
        permiso: true,
    }, { ...deOtro, creado: hace(2), enviado: hace(0, "09:05") }),
    ejemplo("CN-0024", "noticia", "publicado", "2026-10-12T12:00:00", {
        titulo: "Gracias por donar libros",
        resumen: "Recibimos más de 300 libros donados por la comunidad (ejemplo).",
        texto: "Gracias a todas las personas que donaron libros durante octubre (texto de ejemplo).",
        fecha: "2026-10-12",
        categoria: "Novedades",
    }, pub("2026-10-12T12:00:00", 2)),
    ejemplo("CN-0022", "resena", "publicado", "2026-10-08T12:00:00", {
        libro: "Mitos del Nayar", autoria: "Autoría de ejemplo", genero: "Cuento",
        resumen: "Relatos tradicionales de la región (ejemplo).",
        texto: "Una recopilación de mitos y leyendas de la región (texto de ejemplo).",
    }, pub("2026-10-08T12:00:00")),
    ejemplo("CN-0020", "noticia", "borrador", "2026-10-05T09:00:00", {
        titulo: "Convocatoria: club de lectura juvenil",
        resumen: "Abrimos inscripciones para el club de lectura juvenil (ejemplo).",
        texto: "",
        categoria: "Convocatorias",
    }),
    ejemplo("CN-0019", "noticia", "publicado", "2026-10-02T12:00:00", {
        titulo: "Visita guiada de octubre",
        resumen: "Recorrido por las salas y el acervo histórico (ejemplo).",
        texto: "Te invitamos a la visita guiada de octubre (texto de ejemplo).",
        fecha: "2026-10-02",
        categoria: "Actividades",
    }, { ...deOtro, ...pub("2026-10-02T12:00:00") }),
    ejemplo("CN-0018", "memoria", "borrador", "2026-10-02T09:00:00", {
        titulo: "Plaza principal de Tepic (ejemplo)", fuente: "Archivo de la biblioteca (ejemplo)",
        tipoPieza: "Fotografía", periodo: "Década de 1940 (ejemplo)",
        resumen: "La plaza principal con el kiosco a mitad del siglo XX (ejemplo).",
        periodoTema: "Vida cotidiana",
    }),
    ejemplo("CN-0017", "resena", "publicado", "2026-09-28T13:00:00", {
        libro: "Poemas para el camino", autoria: "Autoría de ejemplo", genero: "Poesía",
        resumen: "Poemas breves para leer en voz alta (ejemplo).",
        texto: "Una selección de poemas breves (texto de ejemplo).",
    }, { ...deOtro, ...pub("2026-09-28T13:00:00") }),
    ejemplo("CN-0015", "noticia", "publicado", "2026-09-28T12:00:00", {
        titulo: "Nuevo horario de la hemeroteca",
        resumen: "La hemeroteca amplía su horario por las tardes (ejemplo).",
        texto: "A partir de octubre, la hemeroteca abrirá hasta las 19:00 (texto de ejemplo).",
        fecha: "2026-09-28",
    }, pub("2026-09-28T12:00:00")),
    ejemplo("CN-0012", "acerca", "publicado", "2026-09-12T12:00:00", {
        seccion: "Misión y visión",
        titulo: "Misión y visión",
        texto: "Acercar la lectura y la cultura a todas las personas (texto de ejemplo).",
    }, { ...deOtro, ...pub("2026-09-12T12:00:00", 3) }),
    ejemplo("CN-0010", "resena", "publicado", "2026-09-05T12:00:00", {
        libro: "Leyendas de Tepic", autoria: "Autoría de ejemplo", genero: "Historia regional",
        resumen: "Leyendas de la ciudad contadas por sus vecinos (ejemplo).",
        texto: "Una recopilación de leyendas de Tepic (texto de ejemplo).",
    }, { ...deOtro, ...pub("2026-09-05T12:00:00") }),
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
    const ahora = new Date().toISOString();
    lista = [{ folio, tipo, estado: "borrador", actualizado: ahora, creado: ahora, valores: valoresIniciales(tipo) }, ...lista];
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
    actualizarContenido(folio, { valores, estado: "por-autorizar", notaEnvio: nota.trim() || undefined, enviado: new Date().toISOString() });
}

// ---------- Revisión y publicación (quien tiene publicar_contenidos) ----------
// TODO backend: POST /contenidos/:folio/{observaciones|rechazo|publicacion|retiro}. Cada decisión
// queda en la bitácora con quién la tomó y cuándo (CA-12.1).

// Quién decide en esta simulación. TODO backend: la persona de la sesión.
export const QUIEN_REVISA = "Administrador del portal";

function exigirPorAutorizar(folio: string): Contenido {
    const c = obtenerContenido(folio);
    if (!c || c.estado !== "por-autorizar") throw new Error("Solo se decide sobre contenidos por autorizar.");
    return c;
}

export function pedirCambios(folio: string, texto: string, limite?: string) {
    exigirPorAutorizar(folio);
    const puntos = texto.split(/\n+/).map((p) => p.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean);
    if (puntos.length === 0) throw new Error("Escribe al menos una observación.");
    actualizarContenido(folio, { estado: "observaciones", observaciones: { fecha: new Date().toISOString().slice(0, 10), puntos, limite, quien: QUIEN_REVISA } });
}

export function rechazarContenido(folio: string, motivo: string, explicacion: string) {
    exigirPorAutorizar(folio);
    if (!motivo.trim() || !explicacion.trim()) throw new Error("El motivo y la explicación son obligatorios.");
    actualizarContenido(folio, { estado: "rechazado", rechazo: { fecha: new Date().toISOString(), quien: QUIEN_REVISA, motivo, explicacion: explicacion.trim() } });
}

// CA-12.2: sin autorización no se publica. Exige estar "por autorizar" y una referencia institucional.
// programada: "2026-11-10" → TODO backend: publicar ese día; aquí se registra con esa fecha
export function autorizarYPublicar(folio: string, referencia: string, nota = "", programada?: string) {
    const c = exigirPorAutorizar(folio);
    if (!referencia.trim()) throw new Error("Falta la referencia de la autorización institucional.");
    const version = (c.publicacion?.version ?? 0) + 1;
    actualizarContenido(folio, {
        estado: "publicado",
        retiro: undefined,
        notaInterna: nota.trim() || c.notaInterna,
        publicacion: {
            fecha: programada ? new Date(`${programada}T09:00:00`).toISOString() : new Date().toISOString(),
            autorizo: QUIEN_REVISA,
            referencia: referencia.trim(),
            version,
            programada: !!programada,
        },
    });
}

export function retirarContenido(folio: string, motivo: string) {
    const c = obtenerContenido(folio);
    if (!c || c.estado !== "publicado") throw new Error("Solo se retira lo publicado.");
    if (!motivo.trim()) throw new Error("Escribe el motivo del retiro.");
    actualizarContenido(folio, { estado: "retirado", retiro: { fecha: new Date().toISOString(), quien: QUIEN_REVISA, motivo: motivo.trim() } });
}

// La bandeja de revisión no ve borradores (son privados del Editor) y va del más antiguo al más reciente
export type FiltroRevision = "todos" | "por-autorizar" | "observaciones" | "publicado" | "rechazado";
export function filtrarRevision(contenidos: Contenido[], filtro: FiltroRevision, busqueda: string): Contenido[] {
    const texto = busqueda.trim().toLowerCase();
    return contenidos
        .filter((c) => c.estado !== "borrador")
        .sort((a, b) => a.actualizado.localeCompare(b.actualizado))
        .filter((c) => filtro === "todos" || c.estado === filtro)
        .filter((c) => !texto || c.folio.toLowerCase().includes(texto) || tituloDe(c.tipo, c.valores).toLowerCase().includes(texto));
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

// ---------- Ayudas para las bandejas ----------

// El Editor solo ve lo que él redactó
export function soloMios(contenidos: Contenido[]) {
    return contenidos.filter((c) => !c.autor);
}

// "12 oct 2026"
export function fechaCorta(iso: string) {
    const f = new Date(iso);
    return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

// "Hoy, 10:42" / "Ayer, 17:05" / "Hace 3 días"
export function cuandoConHora(iso: string, ahora = new Date()) {
    const texto = cuandoSeActualizo(iso, ahora);
    const f = new Date(iso);
    const hora = `${String(f.getHours()).padStart(2, "0")}:${String(f.getMinutes()).padStart(2, "0")}`;
    return texto === "Ayer" ? `Ayer, ${hora}` : texto;
}

export function diasDesde(iso: string, ahora = new Date()) {
    const dia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.max(0, Math.round((dia(ahora) - dia(new Date(iso))) / 86400000));
}

export function publicadosEsteMes(contenidos: Contenido[], ahora = new Date()) {
    return contenidos.filter((c) => {
        if (c.estado !== "publicado" || !c.publicacion) return false;
        const f = new Date(c.publicacion.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }).length;
}

// Historial de publicaciones: lo publicado y lo retirado, del más reciente al más antiguo
export type FiltroHistorial = "todos" | "noticia" | "resena" | "acerca" | "memoria" | "retirado";
export function filtrarHistorial(contenidos: Contenido[], filtro: FiltroHistorial, busqueda: string): Contenido[] {
    const texto = busqueda.trim().toLowerCase();
    return contenidos
        .filter((c) => (c.estado === "publicado" || c.estado === "retirado") && c.publicacion)
        .sort((a, b) => b.publicacion!.fecha.localeCompare(a.publicacion!.fecha))
        .filter((c) => (filtro === "todos" ? true : filtro === "retirado" ? c.estado === "retirado" : c.tipo === filtro && c.estado === "publicado"))
        .filter((c) => !texto || c.folio.toLowerCase().includes(texto) || tituloDe(c.tipo, c.valores).toLowerCase().includes(texto));
}

// Lo que pasó con un contenido, del más reciente al más antiguo (tarjeta "Historial")
export type Evento = { titulo: string; fecha: string };
export function eventosDe(c: Contenido): Evento[] {
    const eventos: Evento[] = [];
    if (c.retiro) eventos.push({ titulo: "Retirado del portal", fecha: c.retiro.fecha });
    if (c.publicacion) eventos.push({ titulo: `Publicado (versión ${c.publicacion.version})`, fecha: c.publicacion.fecha });
    if (c.rechazo) eventos.push({ titulo: "Rechazado", fecha: c.rechazo.fecha });
    if (c.observaciones) eventos.push({ titulo: "Observaciones enviadas", fecha: `${c.observaciones.fecha}T12:00:00` });
    if (c.enviado) eventos.push({ titulo: "Enviado a autorización", fecha: c.enviado });
    if (c.estado === "borrador") eventos.push({ titulo: "Guardado como borrador", fecha: c.actualizado });
    else if (c.creado && c.enviado) {
        // simulado: entre que se creó y que se envió
        const medio = (new Date(c.creado).getTime() + new Date(c.enviado).getTime()) / 2;
        eventos.push({ titulo: "Guardado como borrador", fecha: new Date(medio).toISOString() });
    }
    if (c.creado) eventos.push({ titulo: "Creado", fecha: c.creado });
    return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

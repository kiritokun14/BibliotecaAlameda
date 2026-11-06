import { listarPublicados, obtenerPublicado, type ContenidoPublico } from "../../../servicios/publicacion";
// Noticias de la biblioteca (vista de visitante, sin sesión).
// La consulta pública usa exclusivamente publicaciones autorizadas del backend.
// Las constantes de ejemplo se conservan para las pruebas de reglas puras.
import foto1 from "../../../assets/comun/fotos/noticia-1.jpg";
import foto2 from "../../../assets/comun/fotos/noticia-2.jpg";
import foto3 from "../../../assets/comun/fotos/noticia-3.jpg";
import foto4 from "../../../assets/comun/fotos/foto-biblioteca.jpg";
import foto5 from "../../../assets/comun/fotos/cuenta-foto.jpg";

// ---------- Tipos ----------

export type Categoria = "institucional" | "avisos" | "actividades" | "comunidad";
export type EstadoPublicacion = "publicada" | "borrador" | "retirada";
export type Orden = "recientes" | "antiguas";

export type BloqueArticulo =
    | { tipo: "parrafo"; texto: string }
    | { tipo: "subtitulo"; texto: string }
    | { tipo: "datos"; cuando: string; horario: string; donde: string };

export type Noticia = {
    id: string; // se usa en /noticias/:id
    estado: EstadoPublicacion;
    categoria: Categoria;
    fecha: string; // AAAA-MM-DD
    minutosLectura: number;
    titulo: string;
    resaltado?: string; // parte del título que va en dorado en el detalle
    resumen: string;
    textoAlternativo?: string;
    imagen: string; // TODO backend: dirección de la imagen
    destacada?: boolean;
    introduccion: string;
    bloques: BloqueArticulo[];
    reacciones: { meGusta: number; meSirvio: number; compartir: number };
};

export const CATEGORIAS: { id: Categoria; nombre: string; singular: string }[] = [
    { id: "institucional", nombre: "Institucional", singular: "Institucional" },
    { id: "avisos", nombre: "Avisos", singular: "Aviso" },
    { id: "actividades", nombre: "Actividades", singular: "Actividades" },
    { id: "comunidad", nombre: "Comunidad", singular: "Comunidad" },
];

export function nombreCategoria(categoria: Categoria, forma: "nombre" | "singular" = "nombre") {
    return CATEGORIAS.find((c) => c.id === categoria)?.[forma] ?? categoria;
}

export function esCategoria(valor: string | null): valor is Categoria {
    return CATEGORIAS.some((c) => c.id === valor);
}

// ---------- Datos de ejemplo ----------

const reaccionesEjemplo = { meGusta: 24, meSirvio: 12, compartir: 8 };

export const noticias: Noticia[] = [
    {
        id: "circulo-de-lectura-sabados",
        estado: "publicada",
        categoria: "actividades",
        fecha: "2026-11-12",
        minutosLectura: 3,
        titulo: "Vuelve el círculo de lectura de los sábados",
        resaltado: "círculo de lectura",
        resumen: "Un espacio para compartir lecturas y conversar, abierto a toda la comunidad.",
        imagen: foto2,
        destacada: true,
        introduccion: "A partir del sábado 14 de noviembre, el círculo de lectura se reúne cada semana en la sala de lectura de la biblioteca.",
        bloques: [
            { tipo: "parrafo", texto: "No necesitas experiencia previa: basta con traer un libro que quieras compartir o venir a escuchar. La sesión dura una hora y media." },
            { tipo: "parrafo", texto: "Cada sesión empieza con la lectura en voz alta de un fragmento breve. Después, quien quiera comparte lo que le llamó la atención y la conversación sigue de ahí, sin un guion y sin prisa." },
            { tipo: "subtitulo", texto: "Cómo participar" },
            { tipo: "parrafo", texto: "Basta con llegar unos minutos antes y registrarse en la entrada de la sala. Los libros del mes están disponibles en préstamo y también puedes traer el tuyo." },
            { tipo: "datos", cuando: "Sábados desde el 14 de nov.", horario: "12:00 a 13:30", donde: "Sala de lectura" },
            { tipo: "parrafo", texto: "La participación es gratuita y está abierta a todas las personas, sin importar su experiencia previa como lectores." },
        ],
        reacciones: reaccionesEjemplo,
    },
    {
        id: "horario-puente-noviembre",
        estado: "publicada",
        categoria: "avisos",
        fecha: "2026-11-05",
        minutosLectura: 1,
        titulo: "Horario especial por el puente de noviembre",
        resaltado: "puente de noviembre",
        resumen: "Consulta los días y horarios de atención durante el puente de noviembre.",
        imagen: foto1,
        introduccion: "El lunes 16 de noviembre la biblioteca permanecerá cerrada por el día festivo.",
        bloques: [
            { tipo: "parrafo", texto: "El sábado 14 abriremos en horario normal, de 9:00 a 14:00. A partir del martes 17 volvemos al horario de siempre." },
        ],
        reacciones: { meGusta: 9, meSirvio: 31, compartir: 5 },
    },
    {
        id: "gracias-por-donar-libros",
        estado: "publicada",
        categoria: "comunidad",
        fecha: "2026-11-02",
        minutosLectura: 2,
        titulo: "Gracias por donar libros a la biblioteca",
        resaltado: "donar libros",
        resumen: "Más de 200 ejemplares donados por familias y escuelas ya están en catálogo.",
        imagen: foto3,
        introduccion: "Durante octubre recibimos más de 200 libros donados por familias, escuelas y lectores de la ciudad.",
        bloques: [
            { tipo: "parrafo", texto: "Cada ejemplar se revisó, se registró en el catálogo y ya está disponible para consulta en sala." },
            { tipo: "subtitulo", texto: "Cómo donar" },
            { tipo: "parrafo", texto: "Si quieres donar, acércate al módulo de atención con los libros en buen estado. El personal te dirá cuáles se pueden recibir." },
        ],
        reacciones: { meGusta: 40, meSirvio: 6, compartir: 12 },
    },
    {
        id: "nueva-sala-de-estudio",
        estado: "publicada",
        categoria: "institucional",
        fecha: "2026-10-28",
        minutosLectura: 2,
        titulo: "Nueva sala de estudio disponible",
        resaltado: "sala de estudio",
        resumen: "Un espacio silencioso con mesas amplias, contactos y conexión a internet.",
        imagen: foto4,
        introduccion: "La biblioteca abrió una sala de estudio en el primer piso, pensada para estudiar en silencio.",
        bloques: [
            { tipo: "parrafo", texto: "Tiene mesas amplias, contactos en cada lugar y conexión a internet. Se usa por orden de llegada, sin reservación." },
        ],
        reacciones: { meGusta: 33, meSirvio: 18, compartir: 7 },
    },
    {
        id: "taller-encuadernacion-jovenes",
        estado: "publicada",
        categoria: "actividades",
        fecha: "2026-10-15",
        minutosLectura: 2,
        titulo: "Taller de encuadernación para jóvenes",
        resaltado: "encuadernación",
        resumen: "Aprende a encuadernar tu propio cuaderno con materiales reciclados. Cupo limitado.",
        imagen: foto2,
        introduccion: "Un taller práctico para jóvenes de 12 a 17 años que quieran hacer su propio cuaderno.",
        bloques: [
            { tipo: "parrafo", texto: "Usaremos cartón, papel reciclado e hilo. Al terminar, cada participante se lleva su cuaderno." },
            { tipo: "datos", cuando: "Sábado 24 de octubre", horario: "10:00 a 12:00", donde: "Sala de talleres" },
        ],
        reacciones: { meGusta: 15, meSirvio: 4, compartir: 3 },
    },
    {
        id: "actualizacion-del-acervo",
        estado: "publicada",
        categoria: "institucional",
        fecha: "2026-10-12",
        minutosLectura: 2,
        titulo: "Jornada de actualización del acervo",
        resaltado: "acervo",
        resumen: "Ingresaron cientos de títulos nuevos de literatura, ciencia y consulta general.",
        imagen: foto4,
        introduccion: "Este mes ingresaron cientos de títulos nuevos al acervo de la biblioteca.",
        bloques: [
            { tipo: "parrafo", texto: "Hay novedades de literatura, ciencia, historia regional y obras de consulta general. Puedes buscarlas en el catálogo." },
        ],
        reacciones: { meGusta: 21, meSirvio: 10, compartir: 4 },
    },
    {
        id: "cuentacuentos-sala-infantil",
        estado: "publicada",
        categoria: "actividades",
        fecha: "2026-10-08",
        minutosLectura: 1,
        titulo: "Cuentacuentos en la sala infantil",
        resaltado: "Cuentacuentos",
        resumen: "Historias en voz alta para niñas y niños, con actividades de dibujo al terminar.",
        imagen: foto3,
        introduccion: "Cada miércoles por la tarde, la sala infantil se llena de historias contadas en voz alta.",
        bloques: [
            { tipo: "parrafo", texto: "Al terminar, las niñas y los niños dibujan lo que más les gustó del cuento." },
            { tipo: "datos", cuando: "Miércoles", horario: "17:00 a 18:00", donde: "Sala infantil" },
        ],
        reacciones: { meGusta: 28, meSirvio: 5, compartir: 9 },
    },
    {
        id: "nuevo-horario-sabados",
        estado: "publicada",
        categoria: "avisos",
        fecha: "2026-10-03",
        minutosLectura: 1,
        titulo: "Nuevo horario de sábados",
        resaltado: "sábados",
        resumen: "Desde noviembre abrimos más tiempo para atenderte mejor.",
        imagen: foto5,
        introduccion: "Los sábados la biblioteca abrirá de 9:00 a 14:00.",
        bloques: [
            { tipo: "parrafo", texto: "El cambio busca dar más tiempo a quienes solo pueden visitarnos el fin de semana. De lunes a viernes el horario sigue igual." },
        ],
        reacciones: reaccionesEjemplo,
    },
    {
        id: "mantenimiento-hemeroteca",
        estado: "publicada",
        categoria: "avisos",
        fecha: "2026-10-01",
        minutosLectura: 1,
        titulo: "Mantenimiento de la hemeroteca",
        resaltado: "hemeroteca",
        resumen: "La hemeroteca cerrará por mantenimiento; el resto de las salas seguirá abierto.",
        imagen: foto5,
        introduccion: "Del 5 al 9 de octubre la hemeroteca estará cerrada por trabajos de mantenimiento.",
        bloques: [
            { tipo: "parrafo", texto: "El resto de las salas seguirá abierto en su horario habitual." },
        ],
        reacciones: { meGusta: 3, meSirvio: 14, compartir: 2 },
    },
    {
        id: "reconocimiento-lectores-del-anio",
        estado: "publicada",
        categoria: "comunidad",
        fecha: "2026-09-30",
        minutosLectura: 2,
        titulo: "Reconocimiento a lectores del año",
        resaltado: "lectores del año",
        resumen: "Celebramos a las personas que más leyeron y compartieron libros con la comunidad.",
        imagen: foto1,
        introduccion: "La biblioteca reconoció a las personas que más leyeron y compartieron libros este año.",
        bloques: [
            { tipo: "parrafo", texto: "La ceremonia se hizo en el patio de la biblioteca, con lecturas de los propios participantes." },
        ],
        reacciones: { meGusta: 52, meSirvio: 3, compartir: 16 },
    },
    {
        id: "visita-guiada-escuelas",
        estado: "publicada",
        categoria: "actividades",
        fecha: "2026-09-18",
        minutosLectura: 1,
        titulo: "Visita guiada para escuelas de la zona",
        resaltado: "Visita guiada",
        resumen: "Grupos escolares pueden agendar un recorrido por las colecciones y los servicios.",
        imagen: foto4,
        introduccion: "Las escuelas de la zona pueden agendar un recorrido guiado por la biblioteca.",
        bloques: [
            { tipo: "parrafo", texto: "El recorrido dura una hora e incluye las colecciones, la sala infantil y los servicios. Para agendarlo, escríbenos desde Contacto." },
        ],
        reacciones: { meGusta: 11, meSirvio: 9, compartir: 6 },
    },
    {
        id: "un-anio-de-circulo-de-lectura",
        estado: "publicada",
        categoria: "comunidad",
        fecha: "2026-09-12",
        minutosLectura: 6,
        titulo: "Un año de círculo de lectura: lo que aprendimos juntos",
        resaltado: "lo que aprendimos juntos",
        resumen: "Un recorrido por los libros, las voces y los acuerdos que dieron forma al grupo.",
        imagen: foto2,
        introduccion: "Lo que comenzó con ocho personas en una mesa hoy reúne cada sábado a más de treinta lectores.",
        bloques: [
            { tipo: "parrafo", texto: "Durante doce meses el círculo leyó novela, poesía e historia regional. Cada sesión empezó con una pregunta sencilla y casi siempre terminó con otra." },
            { tipo: "subtitulo", texto: "Cómo se eligen los libros" },
            { tipo: "parrafo", texto: "Cada mes los participantes proponen títulos y votan. Se procura alternar autores locales, clásicos y lecturas breves para que todas las personas encuentren algo a su medida." },
            { tipo: "parrafo", texto: "La biblioteca presta los ejemplares necesarios y, cuando hace falta, se comparten copias entre quienes ya terminaron." },
            { tipo: "subtitulo", texto: "Un espacio para conversar" },
            { tipo: "parrafo", texto: "Las sesiones duran hora y media. Primero se lee un fragmento en voz alta y después se abre la conversación, sin prisa y sin juicios." },
            { tipo: "parrafo", texto: "Quienes no han leído el libro también pueden venir a escuchar. Muchos se animaron así a empezar." },
            { tipo: "subtitulo", texto: "Lo que sigue" },
            { tipo: "parrafo", texto: "Para el próximo año se sumarán sesiones familiares y una tertulia mensual con invitados de la comunidad. Las fechas se anunciarán en esta sección." },
        ],
        reacciones: reaccionesEjemplo,
    },
    {
        // Ejemplo de BORRADOR: no aparece en ninguna lista ni se abre en /noticias/programa-de-verano
        id: "programa-de-verano",
        estado: "borrador",
        categoria: "actividades",
        fecha: "2026-11-20",
        minutosLectura: 1,
        titulo: "Programa de verano",
        resumen: "Borrador interno, todavía sin autorizar.",
        imagen: foto3,
        introduccion: "Borrador.",
        bloques: [],
        reacciones: { meGusta: 0, meSirvio: 0, compartir: 0 },
    },
];

// ---------- Reglas (funciones puras, con pruebas en tests/noticias.test.ts) ----------

export function soloPublicadas(lista: Noticia[]): Noticia[] {
    return lista.filter((noticia) => noticia.estado === "publicada");
}

export function buscarPublicada(lista: Noticia[], id: string | undefined): Noticia | null {
    return soloPublicadas(lista).find((noticia) => noticia.id === id) ?? null;
}

// "Círculo" y "circulo" deben coincidir al buscar
export function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type Filtros = {
    texto?: string;
    categoria?: Categoria | null;
    fecha?: string | null; // AAAA-MM-DD
    orden?: Orden;
};

export function filtrarNoticias(lista: Noticia[], { texto = "", categoria = null, fecha = null, orden = "recientes" }: Filtros) {
    const buscado = normalizar(texto);
    const resultado = soloPublicadas(lista).filter((noticia) => {
        if (categoria && noticia.categoria !== categoria) return false;
        if (fecha && noticia.fecha !== fecha) return false;
        if (!buscado) return true;
        const contenido = [noticia.titulo, noticia.resumen, noticia.introduccion, ...noticia.bloques.map((b) => ("texto" in b ? b.texto : ""))].join(" ");
        return normalizar(contenido).includes(buscado);
    });
    // Las fechas AAAA-MM-DD se pueden comparar como texto
    return resultado.sort((a, b) => (orden === "recientes" ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)));
}

export function paginar<T>(lista: T[], pagina: number, porPagina: number) {
    const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const actual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
    return {
        elementos: lista.slice((actual - 1) * porPagina, actual * porPagina),
        pagina: actual,
        totalPaginas,
    };
}

// Botones de la paginación: 1 2 3 … 8 (con «…» cuando hay muchas páginas)
export function paginasVisibles(actual: number, total: number): (number | "…")[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas = new Set([1, total, actual - 1, actual, actual + 1].filter((p) => p >= 1 && p <= total));
    const ordenadas = [...paginas].sort((a, b) => a - b);
    const resultado: (number | "…")[] = [];
    ordenadas.forEach((p, i) => {
        if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push("…");
        resultado.push(p);
    });
    return resultado;
}

// Otras noticias para el pie del detalle: las más recientes, sin repetir la actual
export function otrasNoticias(lista: Noticia[], idActual: string, cantidad = 3) {
    return filtrarNoticias(lista, {}).filter((noticia) => noticia.id !== idActual).slice(0, cantidad);
}

// ---------- Fechas ----------

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// "2026-11-05" → "5 de noviembre de 2026" (sin Date para que no cambie por la zona horaria)
export function fechaLarga(fecha: string) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return `${dia} de ${MESES[mes - 1]} de ${anio}`;
}

// "2026-11-05" → "05/11/2026"
export function fechaCorta(fecha: string) {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

export function esFechaValida(valor: string | null): valor is string {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [anio, mes, dia] = valor.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}


// Proyección del contrato público. No se reemplazan errores por ejemplos.
export function noticiaPublicada(c: ContenidoPublico): Noticia {
    const categoria = String(c.datos.categoria ?? '').toLowerCase();
    return { id: c.folio, estado: 'publicada', categoria: esCategoria(categoria) ? categoria : 'institucional',
        fecha: esFechaValida(String(c.datos.fecha ?? '')) ? String(c.datos.fecha) : c.publicadoEn.slice(0,10), minutosLectura: Math.max(1, Math.ceil(c.cuerpo.split(/\s+/).length / 200)),
        titulo: c.titulo, resumen: c.resumen, imagen: c.imagenUrl ?? '', textoAlternativo: String(c.datos.textoAlternativo ?? ''), introduccion: c.resumen,
        bloques: [{ tipo: 'parrafo', texto: c.cuerpo }], reacciones: { meGusta: 0, meSirvio: 0, compartir: 0 } };
}
export async function obtenerNoticias(): Promise<Noticia[]> { return (await listarPublicados('noticia')).map(noticiaPublicada); }
export async function obtenerNoticia(id: string | undefined): Promise<Noticia | null> {
    if (!id) return null;
    const c = await obtenerPublicado(id, 'noticia'); return c ? noticiaPublicada(c) : null;
}

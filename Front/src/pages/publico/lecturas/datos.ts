// Lecturas, reseñas y memoria pública (vista de visitante, basada en el Actor 2 de Figma).
// Todo es de solo lectura: el visitante consulta, filtra y abre el detalle.
// TODO backend: GET /resenas y GET /memoria (solo contenido PUBLICADO y no privado);
// los filtros de la URL usan los mismos nombres que la API: q, genero, orden, tema, anio.
import fotoSala from "../../../assets/comun/fotos/foto-biblioteca.jpg";
import fotoTaller from "../../../assets/comun/fotos/noticia-3.jpg";
import fotoPasillo from "../../../assets/comun/fotos/noticia-2.jpg";
import fotoJardin from "../../../assets/comun/fotos/noticia-1.jpg";

// ---------- Tipos ----------
export type Genero = "novela" | "cuento" | "historia-regional" | "poesia" | "infantil" | "ciencia";

export const GENEROS: Record<Genero, string> = {
    novela: "Novela",
    cuento: "Cuento",
    "historia-regional": "Historia regional",
    poesia: "Poesía",
    infantil: "Infantil",
    ciencia: "Ciencia",
};

// Colores de la portada ilustrada (cuando no hay foto de la portada real)
export type ColorPortada = "verde" | "guinda" | "dorado" | "verde-claro" | "rojo" | "verde-oscuro";

// "publicado" se ve; "revision" o "retirado" no (se muestra «Recurso no disponible»)
export type Estado = "publicado" | "revision" | "retirado";

export type Bloque = { tipo: "parrafo" | "subtitulo"; texto: string };

export type Resena = {
    id: string; // se usa en /lecturas/:id
    imagen?: string;
    libro: string;
    autoria: string;
    genero: Genero;
    anio: number; // año de publicación del libro
    color: ColorPortada;
    recomendada?: boolean; // en "Por tema" se marca como RECOMENDADA
    titulo: string; // título de la reseña: "Un pueblo hecho de voces"
    resaltado?: string; // parte del título en dorado
    publicada: string; // AAAA-MM-DD
    entrada: string; // frase destacada con la línea dorada
    cuerpo: Bloque[];
    estado: Estado;
    privado?: boolean; // material con acceso restringido
};

export type Memoria = {
    id: string; // se usa en /lecturas/memoria/:id
    titulo: string;
    resaltado?: string;
    anio: number;
    imagen: string;
    temas: Genero[];
    entrada: string;
    cuerpo: string[];
    estado: Estado;
    privado?: boolean;
};

// ---------- Datos de ejemplo (como en Figma) ----------
export const resenas: Resena[] = [
    {
        id: "pedro-paramo", libro: "Pedro Páramo", autoria: "Juan Rulfo", genero: "novela", anio: 1955, color: "verde",
        titulo: "Un pueblo hecho de voces", resaltado: "voces", publicada: "2026-10-12", estado: "publicado",
        entrada: "Un hombre llega a Comala en busca de su padre y encuentra un pueblo habitado por voces. Una novela breve, intensa y para leer despacio.",
        cuerpo: [
            { tipo: "parrafo", texto: "Juan Preciado cumple la promesa que le hizo a su madre y viaja a Comala. Lo que encuentra no es un pueblo, sino una conversación de ausentes que se cruzan en el tiempo." },
            { tipo: "subtitulo", texto: "Una lectura que se mira de reojo" },
            { tipo: "parrafo", texto: "La estructura fragmentada puede desconcertar al principio. Conviene leerla sin prisa, dejando que cada voz construya poco a poco el retrato de Pedro Páramo." },
            { tipo: "parrafo", texto: "Es una obra breve, pero cada página pide atención. Una buena puerta de entrada a la narrativa mexicana del siglo XX." },
        ],
    },
    {
        id: "aura", libro: "Aura", autoria: "Carlos Fuentes", genero: "novela", anio: 1962, color: "guinda", recomendada: true,
        titulo: "Una casa donde el tiempo se detiene", resaltado: "el tiempo", publicada: "2026-10-10", estado: "publicado",
        entrada: "Una novela corta y misteriosa, contada en segunda persona, que se lee de una sentada.",
        cuerpo: [
            { tipo: "parrafo", texto: "Felipe Montero acepta un trabajo en una vieja casa del centro de la Ciudad de México. Ahí conoce a Aura y a su tía, y nada vuelve a ser lo que parece." },
            { tipo: "parrafo", texto: "Recomendada para quien busca una primera lectura de Carlos Fuentes: breve, atmosférica y con un final que invita a volver al principio." },
        ],
    },
    {
        id: "rayuela", libro: "Rayuela", autoria: "Julio Cortázar", genero: "novela", anio: 1963, color: "dorado",
        titulo: "Un libro que se lee saltando", resaltado: "saltando", publicada: "2026-10-08", estado: "publicado",
        entrada: "Una novela que propone varios caminos de lectura y deja que tú elijas el tuyo.",
        cuerpo: [
            { tipo: "parrafo", texto: "Entre París y Buenos Aires, Horacio Oliveira busca algo que no sabe nombrar. El libro puede leerse en orden o siguiendo el tablero de capítulos que propone el autor." },
            { tipo: "parrafo", texto: "Pide paciencia, pero recompensa con escenas memorables y un juego constante con el lector." },
        ],
    },
    {
        id: "tepic-en-el-tiempo", libro: "Tepic en el tiempo", autoria: "Autoría local", genero: "historia-regional", anio: 2019, color: "verde-claro",
        titulo: "La ciudad contada por sus calles", resaltado: "sus calles", publicada: "2026-10-05", estado: "publicado",
        entrada: "Un recorrido por la historia de Tepic a través de sus barrios, plazas y edificios.",
        cuerpo: [
            { tipo: "parrafo", texto: "Una lectura para conocer cómo cambió la ciudad y qué historias guardan los lugares que recorremos todos los días." },
            { tipo: "parrafo", texto: "Ideal para estudiantes y para quien quiera mirar Tepic con otros ojos. Datos de ejemplo." },
        ],
    },
    {
        id: "el-llano-en-llamas", libro: "El llano en llamas", autoria: "Juan Rulfo", genero: "cuento", anio: 1953, color: "rojo",
        titulo: "Cuentos de tierra seca", resaltado: "tierra seca", publicada: "2026-10-03", estado: "publicado",
        entrada: "Diecisiete cuentos breves sobre el campo mexicano, escritos con pocas palabras y mucha fuerza.",
        cuerpo: [
            { tipo: "parrafo", texto: "Cada cuento puede leerse por separado, lo que lo hace perfecto para lecturas cortas. «No oyes ladrar los perros» es un buen comienzo." },
            { tipo: "parrafo", texto: "Una lectura que acompaña muy bien a Pedro Páramo." },
        ],
    },
    {
        id: "piedra-de-sol", libro: "Piedra de sol", autoria: "Octavio Paz", genero: "poesia", anio: 1957, color: "verde-oscuro",
        titulo: "Un poema que vuelve a empezar", resaltado: "vuelve a empezar", publicada: "2026-10-01", estado: "publicado",
        entrada: "Un largo poema circular: termina con los mismos versos con los que empieza.",
        cuerpo: [
            { tipo: "parrafo", texto: "Inspirado en el calendario mexica, el poema recorre el amor, la historia y el tiempo en 584 versos." },
            { tipo: "parrafo", texto: "Se disfruta más leído en voz alta. Recomendado para quien quiere acercarse a la poesía de Octavio Paz." },
        ],
    },
    // Estos dos NO se listan: sirven para probar los estados por dirección directa
    {
        id: "resena-en-revision", libro: "Libro en revisión", autoria: "Autoría de ejemplo", genero: "novela", anio: 2020, color: "verde",
        titulo: "Reseña en revisión", publicada: "2026-10-15", estado: "revision", entrada: "", cuerpo: [],
    },
    {
        id: "fondo-reservado", libro: "Manuscritos del fondo reservado", autoria: "Archivo de la biblioteca", genero: "historia-regional", anio: 1900, color: "guinda",
        titulo: "Manuscritos del fondo reservado", publicada: "2026-09-20", estado: "publicado", privado: true, entrada: "", cuerpo: [],
    },
];

export const memorias: Memoria[] = [
    {
        id: "inauguracion-sala-infantil", titulo: "Inauguración de la sala infantil", resaltado: "sala infantil", anio: 2025,
        imagen: fotoSala, temas: ["infantil"], estado: "publicado",
        entrada: "Con la apertura de la sala infantil, la biblioteca sumó un espacio pensado para las primeras lecturas, con libros, cojines y mesas a la altura de niñas y niños.",
        cuerpo: ["La fotografía forma parte del archivo de memoria pública de la biblioteca y se comparte con autorización de las personas participantes."],
    },
    {
        id: "taller-de-encuadernacion", titulo: "Taller de encuadernación", resaltado: "encuadernación", anio: 2024,
        imagen: fotoTaller, temas: ["historia-regional"], estado: "publicado",
        entrada: "Durante un mes, personas de todas las edades aprendieron a coser y forrar sus propias libretas.",
        cuerpo: ["Registro autorizado para difusión. Datos de ejemplo."],
    },
    {
        id: "visita-escolar-al-archivo", titulo: "Visita escolar al archivo", resaltado: "al archivo", anio: 2024,
        imagen: fotoPasillo, temas: ["historia-regional", "infantil"], estado: "publicado",
        entrada: "Estudiantes de primaria conocieron el archivo histórico y los periódicos antiguos de la hemeroteca.",
        cuerpo: ["Registro autorizado para difusión. Datos de ejemplo."],
    },
    {
        id: "feria-del-libro-2023", titulo: "Feria del libro 2023", resaltado: "2023", anio: 2023,
        imagen: fotoJardin, temas: ["novela", "poesia"], estado: "publicado",
        entrada: "La Alameda se llenó de libros, presentaciones y lecturas en voz alta durante la feria del libro.",
        cuerpo: ["Registro autorizado para difusión. Datos de ejemplo."],
    },
    {
        id: "club-de-lectura", titulo: "Club de lectura", resaltado: "lectura", anio: 2023,
        imagen: fotoSala, temas: ["novela"], estado: "publicado",
        entrada: "Cada mes, el club de lectura se reúne para comentar una novela elegida entre todas y todos.",
        cuerpo: ["Registro autorizado para difusión. Datos de ejemplo."],
    },
];

// ---------- Reglas ----------

// Lo que el visitante puede ver en las listas: publicado y no privado
export function visibles<T extends { estado: Estado; privado?: boolean }>(lista: T[]): T[] {
    return lista.filter((x) => x.estado === "publicado" && !x.privado);
}

// Qué pasa al abrir una dirección directa
export type Apertura<T> = { tipo: "ok"; item: T } | { tipo: "privado" } | { tipo: "no-disponible" };

export function abrir<T extends { id: string; estado: Estado; privado?: boolean }>(lista: T[], id: string | undefined): Apertura<T> {
    const item = lista.find((x) => x.id === id);
    if (!item || item.estado !== "publicado") return { tipo: "no-disponible" };
    if (item.privado) return { tipo: "privado" };
    return { tipo: "ok", item };
}

// ---------- Filtros "Por autor" ----------
export type Orden = "recientes" | "antiguas" | "titulo";

export const ORDENES: Record<Orden, string> = {
    recientes: "Más recientes",
    antiguas: "Más antiguas",
    titulo: "Título (A-Z)",
};

export type FiltrosResenas = { q: string; genero: Genero | ""; orden: Orden };

export const FILTROS_VACIOS: FiltrosResenas = { q: "", genero: "", orden: "recientes" };

const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Búsqueda de Por tema y Memoria pública: el texto aparece en alguno de los campos, sin importar acentos ni mayúsculas
export function coincideBusqueda(busqueda: string, ...campos: (string | undefined)[]): boolean {
    const q = sinAcentos(busqueda.trim());
    return !q || campos.some((c) => c && sinAcentos(c).includes(q));
}

export function filtrarResenas(lista: Resena[], filtros: FiltrosResenas): Resena[] {
    const texto = sinAcentos(filtros.q.trim());
    const resultado = visibles(lista).filter((r) => {
        if (filtros.genero && r.genero !== filtros.genero) return false;
        if (!texto) return true;
        return sinAcentos(`${r.libro} ${r.autoria} ${r.titulo} ${GENEROS[r.genero]}`).includes(texto);
    });
    if (filtros.orden === "titulo") return resultado.sort((a, b) => a.libro.localeCompare(b.libro, "es"));
    const signo = filtros.orden === "antiguas" ? 1 : -1;
    return resultado.sort((a, b) => signo * a.publicada.localeCompare(b.publicada));
}

export function filtrosDesdeParametros(p: URLSearchParams): FiltrosResenas {
    const genero = p.get("genero") ?? "";
    const orden = p.get("orden") ?? "";
    return {
        q: p.get("q") ?? "",
        genero: (genero in GENEROS ? genero : "") as Genero | "",
        orden: (orden in ORDENES ? orden : "recientes") as Orden,
    };
}

// Solo guarda en la URL lo que no es el valor por defecto
export function parametrosDesdeFiltros(f: FiltrosResenas): URLSearchParams {
    const p = new URLSearchParams();
    if (f.q.trim()) p.set("q", f.q.trim());
    if (f.genero) p.set("genero", f.genero);
    if (f.orden !== "recientes") p.set("orden", f.orden);
    return p;
}

// ---------- "Por tema" ----------
export type ItemTema = { tipo: "resena"; item: Resena } | { tipo: "memoria"; item: Memoria };

export function porTema(tema: Genero | "", listaResenas = resenas, listaMemorias = memorias): ItemTema[] {
    const r: ItemTema[] = visibles(listaResenas)
        .filter((x) => !tema || x.genero === tema)
        .map((item) => ({ tipo: "resena", item }));
    const m: ItemTema[] = visibles(listaMemorias)
        .filter((x) => !tema || x.temas.includes(tema))
        .map((item) => ({ tipo: "memoria", item }));
    // Alterna reseña y memoria, como en el diseño
    const mezcla: ItemTema[] = [];
    for (let i = 0; i < Math.max(r.length, m.length); i++) {
        if (r[i]) mezcla.push(r[i]);
        if (m[i]) mezcla.push(m[i]);
    }
    return mezcla;
}

// ---------- Memoria pública ----------
export function aniosDeMemoria(lista = memorias): number[] {
    return [...new Set(visibles(lista).map((m) => m.anio))].sort((a, b) => b - a);
}

export function memoriaPorAnio(anio: number | null, lista = memorias): Memoria[] {
    return visibles(lista)
        .filter((m) => anio === null || m.anio === anio)
        .sort((a, b) => b.anio - a.anio);
}

// "2026-10-12" → "12 de octubre de 2026"; "oct 2026"
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fechaLarga(texto: string) {
    const [a, m, d] = texto.split("-").map(Number);
    return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function mesAnio(texto: string) {
    const [a, m] = texto.split("-").map(Number);
    return `${MESES[m - 1].slice(0, 3)} ${a}`;
}

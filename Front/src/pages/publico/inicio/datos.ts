// Contenido de ejemplo de la página de Inicio (así viene en el diseño).
// Cuando el backend esté listo, estos arreglos vendrán del servidor.
import actividad1 from "../../../assets/comun/fotos/noticia-3.jpg";
import actividad2 from "../../../assets/comun/fotos/noticia-2.jpg";
import actividad3 from "../../../assets/comun/fotos/foto-biblioteca.jpg";
import { fechaLarga, filtrarNoticias, noticias as todasLasNoticias, type Categoria } from "../noticias/datos";

// ---------- Lecturas ----------
// Lo que el backend debe mandar por cada libro de "Para leer esta semana".
// Si un libro trae "portadaUrl" se muestra la foto real de la portada;
// si no, se dibuja una portada ilustrada según "estilo".
export type EstiloPortada = "narrativa" | "historia" | "poesia" | "consulta" | "ensayo";

export type Libro = {
    id: string; // TODO backend: identificador del libro o reseña (se usa en /lecturas/:id)
    titulo: string;
    autoria: string;
    genero: string;
    estilo: EstiloPortada;
    portadaUrl?: string; // TODO backend: dirección de la imagen de la portada

    // La disponibilidad real se consulta en Koha; aquí solo se marca lo que no sale de la sala
    soloEnSala?: boolean;
};

export const libros: Libro[] = [
    { id: "lectura-1", titulo: "Cuentos de la Alameda", autoria: "Autoría de ejemplo", genero: "NARRATIVA", estilo: "narrativa" },
    { id: "lectura-2", titulo: "Historia breve de Nayarit", autoria: "Autoría de ejemplo", genero: "HISTORIA REGIONAL", estilo: "historia" },
    { id: "lectura-3", titulo: "Poemas para el camino", autoria: "Autoría de ejemplo", genero: "POESÍA", estilo: "poesia" },
    { id: "lectura-4", titulo: "Guía de la hemeroteca", autoria: "Autoría de ejemplo", genero: "CONSULTA", estilo: "consulta", soloEnSala: true },
    { id: "lectura-5", titulo: "Memorias de un lector", autoria: "Autoría de ejemplo", genero: "ENSAYO", estilo: "ensayo" },
    { id: "lectura-6", titulo: "Mitos del Nayar", autoria: "Autoría de ejemplo", genero: "NARRATIVA", estilo: "narrativa" },
    { id: "lectura-7", titulo: "Versos de la Alameda", autoria: "Autoría de ejemplo", genero: "POESÍA", estilo: "poesia" },
    { id: "lectura-8", titulo: "Cartas a un lector", autoria: "Autoría de ejemplo", genero: "ENSAYO", estilo: "ensayo" },
];

// ---------- Actividades ----------
export type TipoActividad = "Taller" | "Actividad" | "Agenda cultural";

export type Actividad = {
    id: string; // TODO backend: identificador de la actividad (se usa en /eventos/:id)
    tipo: TipoActividad;
    titulo: string;
    fecha: string;
    horario: string;
    publico: string;
    imagen: string;
};

export const actividades: Actividad[] = [
    { id: "actividad-1", tipo: "Taller", titulo: "Taller de escritura creativa", fecha: "Sáb 8 nov", horario: "10:00 a 12:00 h", publico: "Jóvenes y adultos", imagen: actividad1 },
    { id: "actividad-2", tipo: "Actividad", titulo: "Noche de cuentos en la Alameda", fecha: "Vie 14 nov", horario: "18:00 a 19:30 h", publico: "Familias", imagen: actividad2 },
    { id: "actividad-3", tipo: "Agenda cultural", titulo: "Presentación de libro y charla con autores", fecha: "Sáb 22 nov", horario: "17:00 a 19:00 h", publico: "Público general", imagen: actividad3 },
    { id: "actividad-4", tipo: "Taller", titulo: "Taller de dibujo y acuarela", fecha: "Sáb 15 nov", horario: "10:00 a 12:00 h", publico: "Todo público", imagen: actividad2 },
    { id: "actividad-5", tipo: "Actividad", titulo: "Cine club en la biblioteca", fecha: "Vie 21 nov", horario: "18:00 a 20:00 h", publico: "Jóvenes y adultos", imagen: actividad3 },
    { id: "actividad-6", tipo: "Agenda cultural", titulo: "Lectura en voz alta para niños", fecha: "Sáb 29 nov", horario: "11:00 a 12:00 h", publico: "Infancias", imagen: actividad1 },
];

// ---------- Noticias ----------
// El carrusel muestra las 4 noticias más recientes de la página de Noticias (misma fuente),
// así "Leer noticia completa" abre esa misma noticia en /noticias/:id.
export type CategoriaNoticia = "Institucional" | "Aviso" | "Actividades" | "Comunidad";

export type Noticia = {
    id: string; // /noticias/:id
    categoria: CategoriaNoticia;
    fecha: string;
    titulo: string;
    resumen: string;
    enlace: string;
    imagen: string;
};

const CATEGORIA_INICIO: Record<Categoria, CategoriaNoticia> = {
    institucional: "Institucional",
    avisos: "Aviso",
    actividades: "Actividades",
    comunidad: "Comunidad",
};

export const noticias: Noticia[] = filtrarNoticias(todasLasNoticias, {}).slice(0, 4).map((noticia) => ({
    id: noticia.id,
    categoria: CATEGORIA_INICIO[noticia.categoria],
    fecha: fechaLarga(noticia.fecha),
    titulo: noticia.titulo,
    resumen: noticia.resumen,
    enlace: noticia.categoria === "avisos" ? "Leer aviso completo" : "Leer noticia completa",
    imagen: noticia.imagen,
}));

// ---------- Aviso del portal ----------
// Franja dorada arriba de la portada (Figma 584:48667). null = no hay aviso.
// TODO backend: el aviso vigente lo publica el personal; debe traer un id para recordar si ya se cerró.
export type AvisoPortal = { id: string; texto: string };

export function avisoPortal(): AvisoPortal | null {
    // Para verlo sin backend: /?simular=aviso (solo en desarrollo)
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("simular") === "aviso") {
        return { id: "ejemplo-mantenimiento", texto: "Cierre por mantenimiento el sábado 31 de octubre. Reabrimos el lunes." };
    }
    return null;
}

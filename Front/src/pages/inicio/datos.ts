// Contenido de ejemplo de la página de Inicio (así viene en el diseño).
// Cuando el backend esté listo, estos arreglos vendrán del servidor.
import actividad1 from "../../assets/inicio/actividad-1.jpg";
import actividad2 from "../../assets/inicio/actividad-2.jpg";
import actividad3 from "../../assets/inicio/actividad-3.jpg";
import noticia1 from "../../assets/inicio/noticia-1.jpg";
import noticia2 from "../../assets/inicio/noticia-2.jpg";
import noticia3 from "../../assets/inicio/noticia-3.jpg";
import noticia4 from "../../assets/inicio/noticia-4.jpg";

// ---------- Lecturas ----------
// "estilo" decide el dibujo de la portada (ver PortadaLibro en Lecturas.tsx)
export type EstiloPortada = "narrativa" | "historia" | "poesia" | "consulta" | "ensayo";
export type EstadoLibro = "disponible" | "prestamo" | "sala";

export type Libro = {
    titulo: string;
    autoria: string;
    genero: string;
    estilo: EstiloPortada;
    estado: EstadoLibro;
};

export const libros: Libro[] = [
    { titulo: "Cuentos de la Alameda", autoria: "Autoría de ejemplo", genero: "NARRATIVA", estilo: "narrativa", estado: "disponible" },
    { titulo: "Historia breve de Nayarit", autoria: "Autoría de ejemplo", genero: "HISTORIA REGIONAL", estilo: "historia", estado: "disponible" },
    { titulo: "Poemas para el camino", autoria: "Autoría de ejemplo", genero: "POESÍA", estilo: "poesia", estado: "prestamo" },
    { titulo: "Guía de la hemeroteca", autoria: "Autoría de ejemplo", genero: "CONSULTA", estilo: "consulta", estado: "sala" },
    { titulo: "Memorias de un lector", autoria: "Autoría de ejemplo", genero: "ENSAYO", estilo: "ensayo", estado: "disponible" },
    { titulo: "Mitos del Nayar", autoria: "Autoría de ejemplo", genero: "NARRATIVA", estilo: "narrativa", estado: "disponible" },
    { titulo: "Versos de la Alameda", autoria: "Autoría de ejemplo", genero: "POESÍA", estilo: "poesia", estado: "prestamo" },
    { titulo: "Cartas a un lector", autoria: "Autoría de ejemplo", genero: "ENSAYO", estilo: "ensayo", estado: "disponible" },
];

// ---------- Actividades ----------
export type TipoActividad = "Taller" | "Actividad" | "Agenda cultural";

export type Actividad = {
    tipo: TipoActividad;
    titulo: string;
    fecha: string;
    horario: string;
    publico: string;
    imagen: string;
};

export const actividades: Actividad[] = [
    { tipo: "Taller", titulo: "Taller de escritura creativa", fecha: "Sáb 8 nov", horario: "10:00 a 12:00 h", publico: "Jóvenes y adultos", imagen: actividad1 },
    { tipo: "Actividad", titulo: "Noche de cuentos en la Alameda", fecha: "Vie 14 nov", horario: "18:00 a 19:30 h", publico: "Familias", imagen: actividad2 },
    { tipo: "Agenda cultural", titulo: "Presentación de libro y charla con autores", fecha: "Sáb 22 nov", horario: "17:00 a 19:00 h", publico: "Público general", imagen: actividad3 },
    { tipo: "Taller", titulo: "Taller de dibujo y acuarela", fecha: "Sáb 15 nov", horario: "10:00 a 12:00 h", publico: "Todo público", imagen: actividad2 },
    { tipo: "Actividad", titulo: "Cine club en la biblioteca", fecha: "Vie 21 nov", horario: "18:00 a 20:00 h", publico: "Jóvenes y adultos", imagen: actividad3 },
    { tipo: "Agenda cultural", titulo: "Lectura en voz alta para niños", fecha: "Sáb 29 nov", horario: "11:00 a 12:00 h", publico: "Infancias", imagen: actividad1 },
];

// ---------- Noticias ----------
export type CategoriaNoticia = "Institucional" | "Aviso" | "Actividades" | "Comunidad";

export type Noticia = {
    categoria: CategoriaNoticia;
    fecha: string;
    titulo: string;
    resumen: string;
    enlace: string;
    imagen: string;
};

export const noticias: Noticia[] = [
    {
        categoria: "Institucional",
        fecha: "Nov 2026",
        titulo: "La biblioteca amplía su programa de lectura en voz alta",
        resumen: "Cada semana habrá sesiones para niñas, niños y familias en la sala infantil, con libros seleccionados por el personal bibliotecario.",
        enlace: "Leer noticia completa",
        imagen: noticia1,
    },
    {
        categoria: "Aviso",
        fecha: "Nov 2026",
        titulo: "Horario especial de la hemeroteca regional en noviembre",
        resumen: "Durante noviembre la hemeroteca ajustará su atención por trabajos de conservación del acervo. Consulta los días y horarios disponibles.",
        enlace: "Leer aviso completo",
        imagen: noticia2,
    },
    {
        categoria: "Actividades",
        fecha: "Nov 2026",
        titulo: "Abre la convocatoria al taller de escritura creativa",
        resumen: "Jóvenes y adultos podrán inscribirse a sesiones semanales de escritura guiada. Los cupos son limitados y el registro se hace con tu credencial.",
        enlace: "Ver convocatoria",
        imagen: noticia3,
    },
    {
        categoria: "Comunidad",
        fecha: "Nov 2026",
        titulo: "Lectores comparten sus recomendaciones del mes",
        resumen: "Usuarios de la biblioteca eligieron los títulos que más disfrutaron. Conoce sus reseñas y súmate con la tuya.",
        enlace: "Leer más reseñas",
        imagen: noticia4,
    },
];

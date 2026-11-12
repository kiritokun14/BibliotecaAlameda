// Contenido de "Acerca de la biblioteca" (así viene en el diseño de Figma).
// TODO backend (HU-01): cuando exista la gestión de contenidos, estos textos
// vendrán del servidor y solo se mostrará la versión publicada (nunca un borrador).
import etapa1 from "../../../assets/acerca/etapa-1.webp";
import etapa4 from "../../../assets/acerca/etapa-4.webp";
import etapa5 from "../../../assets/acerca/etapa-5.webp";
import etapa8 from "../../../assets/acerca/etapa-8.jpg";
import etapa11 from "../../../assets/acerca/etapa-11.webp";
import obraGrito from "../../../assets/acerca/obra-grito.webp";
import obraSimbolos from "../../../assets/acerca/obra-simbolos.webp";
import obraCosas from "../../../assets/acerca/obra-cosas.webp";
import obraTepic from "../../../assets/acerca/obra-tepic.webp";
import fotoSalaInfantil from "../../../assets/acerca/foto-sala-infantil.webp";
import fotoTaller from "../../../assets/acerca/foto-taller.webp";
import fotoSalaEstudio from "../../../assets/acerca/foto-sala-estudio.webp";
import fotoPresentaciones from "../../../assets/acerca/foto-presentaciones.webp";
import iconoPersonas from "../../../assets/acerca/valor-personas.svg";
import iconoLibro from "../../../assets/acerca/valor-libro.svg";
import iconoEstrella from "../../../assets/acerca/valor-estrella.svg";
import iconoPin from "../../../assets/acerca/rol-pin.svg";
import iconoCalendario from "../../../assets/acerca/rol-calendario.svg";

// ---------- Pestañas ----------
export type SeccionAcerca = "historia" | "mision-vision" | "solon-arguello" | "rol";

// ---------- Historia ----------
export const datosHistoria = [
    { titulo: "Biblioteca pública central del estado", texto: "Un lugar abierto a toda la comunidad de Tepic y de Nayarit." },
    { titulo: "Acervo general, regional y hemeroteca", texto: "Libros, prensa y revistas de Nayarit para consulta." },
    { titulo: "Entrada libre", texto: "Servicios abiertos al público general." },
];

export type Etapa = {
    titulo: string;
    resumen: string;
    fecha: string;
    detalle: string;
    // Sin imagen → se muestra el recuadro "Imagen ilustrativa · por confirmar".
    // (En Figma las fotos de las etapas 3, 6, 7, 9 y 10 están dañadas.)
    imagen?: string;
    imagenPorConfirmar?: boolean; // hay foto, pero la biblioteca debe confirmarla
};

export const etapas: Etapa[] = [
    {
        titulo: "Primera biblioteca pública de Tepic",
        resumen: "Se inaugura como «General Manuel González». Manuel Calderón es su primer bibliotecario y reúne 660 volúmenes.",
        fecha: "16 sep 1878",
        detalle: "El 16 de septiembre de 1878 fue inaugurada la primera biblioteca pública de Tepic y se nombró «General Manuel González». A Manuel Calderón se le considera el primer bibliotecario. Contaba con 660 volúmenes y funcionaba en el Palacio Municipal de Tepic (calle México y Lerdo), edificio que fue demolido.",
        imagen: etapa1,
    },
    {
        titulo: "Biblioteca «Francisco I. Madero»",
        resumen: "En 1919 el gobernador José Santos Godínez la reubica en un espacio más accesible del mismo edificio; se reinaugura en 1925 y en 1930 reporta 1,991 volúmenes.",
        fecha: "1919–1930",
        detalle: "En 1919 el gobernador José Santos Godínez la reubica en un espacio más accesible del mismo edificio y se le da el nombre de Biblioteca Pública «Francisco I. Madero». Se remoza y reinaugura el 16 de septiembre de 1925. La encargada, Isabel Corona, reporta 1,991 volúmenes en 1930.",
        imagen: etapa1,
    },
    {
        titulo: "Años de abandono",
        resumen: "Con la ampliación de la Avenida México se demuele el Palacio Municipal. La biblioteca decae hasta 1963, cuando recupera su sentido.",
        fecha: "1949–1963",
        detalle: "Con la ampliación de la Avenida México fue demolido el Palacio Municipal de Tepic, en 1949. La biblioteca «Francisco I. Madero» decae y se convierte en un almacén de libros viejos. Será hasta 1963 que se recupera su sentido.",
    },
    {
        titulo: "Biblioteca «Amado Nervo»",
        resumen: "Con el gobernador Rogelio Flores Curiel, el acervo pasa a esta biblioteca, anexa al Museo Regional de Nayarit, inaugurada un 28 de agosto.",
        fecha: "1976–1981",
        detalle: "Durante la gubernatura del coronel Rogelio Flores Curiel (1976-1981), el acervo de la biblioteca «Francisco I. Madero» se traslada a lo que será la Biblioteca Pública «Amado Nervo», inaugurada un 28 de agosto en el marco de los festejos en honor del poeta. Estaba anexa al Museo Regional de Nayarit, en la calle Zapata esquina Allende, colonia Centro, Tepic.",
        imagen: etapa4,
    },
    {
        titulo: "La Alameda, escenario cultural",
        resumen: "Se remodela el parque, se construye una biblioteca infantil y el Polifórum «José López Portillo», que después albergará la Biblioteca Central Estatal.",
        fecha: "1976–1981",
        detalle: "En el mismo periodo del coronel Rogelio Flores Curiel (1976-1981) se remodela el parque de la Alameda. En él se construye una biblioteca infantil y el Polifórum «José López Portillo», que años después albergaría la Biblioteca Central Estatal «Everardo Peña Navarro».",
        imagen: etapa5,
    },
    {
        titulo: "Red Nacional de Bibliotecas",
        resumen: "Se consolida por decreto presidencial. La Ley General de Bibliotecas de 1988 fue sustituida por la publicada en el DOF el 1 de junio de 2021.",
        fecha: "8 ene 1983",
        detalle: "La Red Nacional de Bibliotecas se consolida mediante decreto presidencial el 8 de enero de 1983 y se reafirma con la Ley General de Bibliotecas del 21 de enero de 1988, hoy sustituida por la publicada en el DOF el 1 de junio de 2021. En 1989 se crea CONACULTA, a quien corresponde organizar las bibliotecas del país. En Nayarit, el gobernador Celso Humberto Delgado Ramírez (1987-1993) crea el Instituto Cultural y Artístico de Nayarit, ICANAY.",
    },
    {
        titulo: "Biblioteca Central Estatal «Everardo Peña Navarro»",
        resumen: "El gobernador Emilio González Parra la inaugura y arranca en Nayarit el programa de la Red Nacional de Bibliotecas.",
        fecha: "24 jul 1985",
        detalle: "El 24 de julio de 1985, el gobernador constitucional don Emilio González Parra inauguró la Biblioteca Central Estatal «Everardo Peña Navarro». Con este acto inicia oficialmente el funcionamiento del programa de la Red Nacional de Bibliotecas en el estado de Nayarit.",
    },
    {
        titulo: "Nueva sede, ludoteca y bebeteca",
        resumen: "En 1993 se reubica e inaugura con el gobernador Rigoberto Ochoa Zaragoza; en 2011 se remodela y abre la ludoteca y la bebeteca.",
        fecha: "1993–2011",
        detalle: "La Biblioteca Pública Central Estatal «Everardo Peña Navarro» fue reubicada e inaugurada en 1993 por el gobernador constitucional C. Rigoberto Ochoa Zaragoza. En 2011 se remodeló y se abrieron la ludoteca y la bebeteca. El arte y la cultura se conjugan con la naturaleza y brindan serenidad a los espacios bibliotecarios.",
        imagen: etapa8,
        imagenPorConfirmar: true,
    },
    {
        titulo: "Años difíciles",
        resumen: "Entre junio y septiembre de 2018 ocurren 8 robos y comienzan cuatro traslados de acervo y personal.",
        fecha: "2018–2022",
        detalle: "Entre junio y septiembre de 2018 sucedieron 8 robos en la biblioteca. Fue el primero de cuatro traslados de acervo y personal, que se extendieron de 2019 a 2022.",
    },
    {
        titulo: "Biblioteca «José Solón Argüello»",
        resumen: "Tras la reconstrucción impulsada por el gobierno de Antonio Echevarría García, se inaugura la biblioteca actual.",
        fecha: "23 jun 2021",
        detalle: "La reconstrucción de la Biblioteca Pública Central (2020-2021) fue realizada por el gobierno de Antonio Echevarría García. La Biblioteca Pública «José Solón Argüello» se inauguró el 23 de junio de 2021.",
    },
    {
        titulo: "Cierre y reapertura",
        resumen: "El 8 de julio de 2022 colapsa el ventanal del Aula de Braille y se suspenden las funciones. Tras dos años de reparaciones, reabre a principios de 2024.",
        fecha: "2022–2024",
        detalle: "El 8 de julio de 2022 colapsa el ventanal del Aula de Braille y, por seguridad del personal y de los usuarios, la biblioteca debe suspender sus funciones para gestionar las obras de reparación. Después de 2 años, se rehabilitan los daños y se abre al público a principios de 2024.",
        imagen: etapa11,
    },
    {
        titulo: "La biblioteca actualmente",
        resumen: "Reabierta en 2024, hoy es un centro de lectura, servicios y actividades culturales para toda la comunidad. (ejemplo · por confirmar)",
        fecha: "2024–actualidad",
        detalle: "Hoy la Biblioteca Pública Central «José Solón Argüello» ofrece préstamo de libros, salas de lectura, ludoteca, bebeteca y Aula de Braille, además de talleres y actividades culturales para todas las edades. (Texto de ejemplo · por confirmar con la biblioteca)",
        imagen: etapa11, // en Figma usa la misma foto que la etapa 11
    },
];

// ---------- Misión y visión ----------
export const valores = [
    { titulo: "Acceso para todas las personas", texto: "Servicios abiertos, sin distinciones.", icono: iconoPersonas },
    { titulo: "Cuidado del acervo", texto: "Conservar y compartir el patrimonio escrito.", icono: iconoLibro },
    { titulo: "Servicio a la comunidad", texto: "Atención amable, clara y oportuna.", icono: iconoEstrella },
];

export const fotosEnAccion = [
    { pie: "Taller", imagen: fotoTaller },
    { pie: "Lectura infantil", imagen: fotoSalaInfantil },
    { pie: "Presentaciones", imagen: fotoPresentaciones },
];

// ---------- Solón Argüello ----------
export const ficha = [
    { dato: "Nacimiento", valor: "León, Nicaragua · 11 de julio de 1879" },
    { dato: "Ocupación", valor: "Poeta, maestro, periodista y político" },
    { dato: "Vínculo con la biblioteca", valor: "Da nombre a la biblioteca; vivió y fue maestro en Tepic" },
    { dato: "Fallecimiento", valor: "Vía México–Querétaro · 28 de agosto de 1913" },
];

// Filas que solo aparecen con "Ver más"
export const fichaCompleta = [
    ...ficha,
    { dato: "Padres", valor: "Narciso Argüello Barreto e Inesilia Escobar Coronel" },
    { dato: "Obras principales", valor: "El grito de las islas · El libro de los símbolos e islas frágiles · Cosas crueles" },
];

// Biografía completa ("Ver más"). Las partes en "resaltado" van en negritas verdes.
export type Fragmento = string | { resaltado: string };

export const biografiaCompleta: { titulo: string; texto: Fragmento[] }[] = [
    {
        titulo: "Infancia y llegada a México",
        texto: [
            "Hijo de ", { resaltado: "Narciso Argüello Barreto" },
            " e Inesilia Escobar Coronel, creció en una familia distinguida de León, Nicaragua, y estudió la carrera docente. Llegó a México en 1902 y trabajó en redacciones de revistas y periódicos de la capital; fue uno de los fundadores de la ",
            { resaltado: "Sociedad Literaria Manuel Gutiérrez Nájera" }, ".",
        ],
    },
    {
        titulo: "Maestro en Tepic y Nayarit",
        texto: [
            "Hacia 1904 obtuvo una plaza en Ensenada y poco después se estableció en el Territorio de Tepic como maestro de enseñanza elemental y superior y de taquigrafía; dirigió por un tiempo la ",
            { resaltado: "Escuela Superior de Niños" },
            ". Su enfrentamiento con el jefe del Territorio, Mariano Ruiz Montañés, lo llevó al destierro en ",
            { resaltado: "1908" },
            ". Fue juez de primera instancia en Santiago Ixcuintla y juez de paz en La Yesca.",
        ],
    },
    {
        titulo: "Letras y periodismo",
        texto: [
            "Publicó ", { resaltado: "El grito de las islas" }, " (1905), ",
            { resaltado: "El libro de los símbolos e islas frágiles" }, " (1909) y ",
            { resaltado: "Cosas crueles" },
            " (1913). En 1907 fundó con Pedro Aguirre de la Barreda la revista ",
            { resaltado: "Tepic literario" },
            ", colaboró en el suplemento literario de El Correo de Mazatlán y en 1912 cofundó el bisemanario La época.",
        ],
    },
    {
        titulo: "Maderismo y Revolución",
        texto: [
            "Apoyó el movimiento maderista desde 1909, conoció a Madero en 1912, se naturalizó mexicano y fue su ",
            { resaltado: "secretario privado" },
            " y jefe de publicaciones del Museo Nacional. Tras el golpe de Huerta denunció el asesinato de Madero desde La Habana y Nueva York, se entrevistó con Venustiano Carranza y organizó una guerrilla en ",
            { resaltado: "La Yesca, Nayarit" }, ".",
        ],
    },
    {
        titulo: "Muerte y memoria",
        texto: [
            "Regresó a la Ciudad de México en 1913 para combatir a Huerta; delatado y capturado, fue fusilado el ",
            { resaltado: "28 de agosto de 1913" },
            " junto a la vía México–Querétaro, cerca de la estación Lechería. Hoy su nombre lo lleva esta biblioteca de Tepic.",
        ],
    },
];

export const trayectoria = [
    { titulo: "Formación y llegada a México", texto: "Estudió la carrera docente en León, Nicaragua, y llegó a México en 1902 para trabajar en la prensa de la capital.", fecha: "1879–1902" },
    { titulo: "Maestro en Tepic y Nayarit", texto: "Enseñó y dirigió la Escuela Superior de Niños en Tepic; desterrado en 1908, fue juez en Santiago Ixcuintla y La Yesca.", fecha: "1904–1910" },
    { titulo: "Poeta y periodista", texto: "Publicó sus libros de poesía, fundó Tepic literario (1907) y La época (1912) y fue redactor en jefe de Nueva Era.", fecha: "1905–1912" },
    { titulo: "Maderismo y sacrificio", texto: "Secretario privado de Madero; tras su asesinato combatió a Huerta y fue fusilado en 1913. Su nombre sigue vivo en esta biblioteca.", fecha: "1912–1913" },
];

export const obras = [
    { titulo: "El grito de las islas", tipo: "Poesía · 1905", portada: obraGrito },
    { titulo: "El libro de los símbolos e islas frágiles", tipo: "Poesía y prosa · 1909", portada: obraSimbolos },
    { titulo: "Cosas crueles", tipo: "Prosa · 1913", portada: obraCosas },
    { titulo: "Tepic literario", tipo: "Revista fundada en 1907", portada: obraTepic },
];

// ---------- Rol de la biblioteca ----------
export const perspectivas = [
    {
        titulo: "Social",
        texto: "Un lugar abierto a todas las personas, sin importar edad ni condición.",
        puntos: ["Acceso libre y gratuito", "Atención a grupos diversos", "Apoyo para trámites y consultas"],
        icono: iconoPersonas,
        foto: fotoSalaInfantil,
    },
    {
        titulo: "Comunitaria",
        texto: "Un punto de encuentro para vecinas, vecinos, escuelas y colectivos.",
        puntos: ["Espacios para reunirse", "Clubes de lectura", "Actividades para familias"],
        icono: iconoPin,
        foto: fotoTaller,
    },
    {
        titulo: "Académica",
        texto: "Recursos para estudiar, investigar y aprender durante toda la vida.",
        puntos: ["Consulta de acervo y hemeroteca", "Catálogo en línea", "Apoyo a la investigación"],
        icono: iconoLibro,
        foto: fotoSalaEstudio,
    },
    {
        titulo: "Cultural",
        texto: "Programas que acercan la literatura, el arte y la memoria regional.",
        puntos: ["Talleres y presentaciones", "Agenda cultural", "Fondo regional de Nayarit"],
        icono: iconoCalendario,
        foto: fotoPresentaciones,
    },
];

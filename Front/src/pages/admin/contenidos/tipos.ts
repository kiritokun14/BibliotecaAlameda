// Tipos de contenido que puede redactar el Editor
export type TipoContenido = "noticia" | "resena" | "acerca" | "memoria";

// ruta: formulario de redacción
export const TIPOS_CONTENIDO: { valor: TipoContenido; letra: string; nombre: string; descripcion: string; ruta?: string }[] = [
    {
        valor: "noticia",
        letra: "N",
        nombre: "Noticia",
        ruta: "/admin/contenidos/editor/nuevo/noticia",
        descripcion: "Avisos, convocatorias y novedades de la biblioteca. Aparece en Noticias y en Inicio.",
    },
    {
        valor: "resena",
        letra: "R",
        nombre: "Reseña bibliográfica",
        ruta: "/admin/contenidos/editor/nuevo/resena",
        descripcion: "Reseña de un libro escrita por el equipo. Aparece en Lecturas y reseñas.",
    },
    {
        valor: "acerca",
        letra: "A",
        nombre: "Acerca de la biblioteca",
        ruta: "/admin/contenidos/editor/acerca",
        descripcion: "Historia, misión y visión, biografía de Solón Argüello o rol de la biblioteca.",
    },
    {
        valor: "memoria",
        letra: "M",
        nombre: "Memoria pública",
        ruta: "/admin/contenidos/editor/nuevo/memoria",
        descripcion: "Fotografías y piezas del archivo de memoria de la biblioteca. Aparece en Memoria pública.",
    },
];

// Secciones de «Acerca de la biblioteca». Cada una se autoriza por separado.
export const SECCIONES_ACERCA = [
    { valor: "historia", nombre: "Historia", titulo: "Historia de la biblioteca", lineaTiempo: true },
    { valor: "mision", nombre: "Misión y visión", titulo: "Misión y visión", lineaTiempo: false },
    { valor: "solon", nombre: "Solón Argüello", titulo: "Solón Argüello", lineaTiempo: false },
    { valor: "rol", nombre: "Rol de la biblioteca", titulo: "Rol de la biblioteca", lineaTiempo: false },
] as const;

export type SeccionAcerca = (typeof SECCIONES_ACERCA)[number]["valor"];

// Qué campos tiene cada tipo de contenido (Noticia, Reseña, Acerca de, Memoria pública).
// El formulario del Editor, la validación y la vista previa se arman a partir de aquí.

export type TipoContenido = "noticia" | "resena" | "acerca" | "memoria";

export type TipoCampo =
    | "texto"
    | "area" // resumen (corto)
    | "area-grande" // texto completo
    | "select"
    | "fecha"
    | "archivo" // imagen: por ahora solo se guarda el nombre (TODO backend: subir)
    | "interruptor"
    | "fijo" // solo lectura
    | "chips"; // opciones como pastillas (sección de Acerca de)

export type Campo = {
    nombre: string;
    etiqueta: string;
    tipo: TipoCampo;
    obligatorio?: boolean;
    max?: number; // caracteres
    ayuda?: string;
    placeholder?: string;
    opciones?: string[];
    ancho?: "mitad" | "tercio";
    descripcion?: string; // texto bajo el interruptor
    error?: string; // mensaje cuando falta
};

export type Grupo = {
    titulo: string;
    subtitulo?: string;
    icono: "lapiz" | "archivo" | "lista";
    campos: Campo[];
};

export type Esquema = {
    nombre: string; // "Noticia"
    enFrase: string; // "la noticia" (para "El Administrador revisará la noticia…")
    genero: "a" | "o"; // "publicarla" / "publicarlo"
    etiqueta: string; // "NOTICIA" (para "CONTENIDOS · EDITOR · NOTICIA CN-0031")
    letra: string; // la letra grande de la tarjeta "¿Qué quieres redactar?"
    tituloNuevo: string; // "Redactar noticia"
    descripcion: string; // bajo el título del editor
    descripcionTipo: string; // en "¿Qué quieres redactar?"
    grupos: Grupo[];
    publicacion: { titulo: string; campos: Campo[] };
    campoTitulo: string; // de qué campo sale el título del listado
    prefijoTitulo?: string; // "Reseña: Cuentos de la Alameda"
    campoEtiqueta?: string; // qué campo va como pastilla en la vista previa
    campoTexto: string; // el texto largo (vista previa)
    campoResumen?: string;
    campoImagen?: string;
};

const SIN_IMAGEN = "Arrastra una imagen o elige un archivo";

export const ESQUEMAS: Record<TipoContenido, Esquema> = {
    noticia: {
        nombre: "Noticia",
        enFrase: "la noticia",
        genero: "a",
        etiqueta: "NOTICIA",
        letra: "N",
        tituloNuevo: "Redactar noticia",
        descripcion: "Los campos con * son obligatorios. Se guarda como borrador.",
        descripcionTipo: "Avisos, convocatorias y novedades de la biblioteca. Aparece en Noticias y en Inicio.",
        grupos: [
            {
                titulo: "Contenido de la noticia",
                subtitulo: "Lo que leerá la persona en el portal.",
                icono: "lapiz",
                campos: [
                    { nombre: "titulo", etiqueta: "Título", tipo: "texto", obligatorio: true, max: 90, ayuda: "Máximo 90 caracteres.", placeholder: "Escribe el título", error: "Escribe un título para la noticia." },
                    { nombre: "resumen", etiqueta: "Resumen", tipo: "area", obligatorio: true, max: 160, ayuda: "Se muestra en el listado y en Inicio. Máximo 160 caracteres." },
                    { nombre: "texto", etiqueta: "Texto completo", tipo: "area-grande", obligatorio: true, placeholder: "Escribe aquí la noticia…", error: "El texto completo es obligatorio." },
                    { nombre: "imagen", etiqueta: "Imagen principal", tipo: "archivo", placeholder: SIN_IMAGEN, ayuda: "JPG o PNG · máximo 5 MB" },
                    { nombre: "alt", etiqueta: "Texto alternativo de la imagen", tipo: "texto", placeholder: "Describe la imagen", ayuda: "Describe la imagen para personas que usan lector de pantalla." },
                ],
            },
        ],
        publicacion: {
            titulo: "Datos de publicación",
            campos: [
                { nombre: "categoria", etiqueta: "Categoría", tipo: "select", obligatorio: true, opciones: ["Avisos", "Convocatorias", "Novedades", "Actividades"] },
                { nombre: "fecha", etiqueta: "Fecha de la noticia", tipo: "fecha", obligatorio: true },
                { nombre: "destacar", etiqueta: "Destacar en Inicio", tipo: "interruptor", descripcion: "Aparece en el bloque de Noticias." },
                { nombre: "verMas", etiqueta: "Mostrar en «Ver más noticias»", tipo: "interruptor" },
            ],
        },
        campoTitulo: "titulo",
        campoEtiqueta: "categoria",
        campoTexto: "texto",
        campoResumen: "resumen",
        campoImagen: "imagen",
    },
    resena: {
        nombre: "Reseña bibliográfica",
        enFrase: "la reseña",
        genero: "a",
        etiqueta: "RESEÑA",
        letra: "R",
        tituloNuevo: "Redactar reseña bibliográfica",
        descripcion: "La reseña la firma el equipo de la biblioteca. Los datos del libro son de ejemplo.",
        descripcionTipo: "Reseña de un libro escrita por el equipo. Aparece en Lecturas y reseñas.",
        grupos: [
            {
                titulo: "Datos del libro",
                icono: "archivo",
                campos: [
                    { nombre: "libro", etiqueta: "Título del libro", tipo: "texto", obligatorio: true, ancho: "mitad", error: "Escribe el título del libro." },
                    { nombre: "autoria", etiqueta: "Autoría", tipo: "texto", obligatorio: true, ancho: "mitad" },
                    { nombre: "genero", etiqueta: "Género", tipo: "select", ancho: "tercio", opciones: ["Novela", "Cuento", "Poesía", "Historia regional", "Infantil", "Ciencia"] },
                    { nombre: "anio", etiqueta: "Año de edición", tipo: "texto", ancho: "tercio" },
                    { nombre: "clasificacion", etiqueta: "Clasificación en acervo", tipo: "texto", ancho: "tercio", placeholder: "Por confirmar" },
                ],
            },
            {
                titulo: "Texto de la reseña",
                subtitulo: "Lo escribe el equipo; no es una opinión de personas usuarias.",
                icono: "lapiz",
                campos: [
                    { nombre: "resumen", etiqueta: "Resumen para el listado", tipo: "area", obligatorio: true, max: 160, ayuda: "Máximo 160 caracteres." },
                    { nombre: "texto", etiqueta: "Reseña completa", tipo: "area-grande", obligatorio: true, placeholder: "Escribe aquí la reseña…", error: "La reseña completa es obligatoria." },
                    { nombre: "imagen", etiqueta: "Portada del libro", tipo: "archivo", placeholder: SIN_IMAGEN, ayuda: "JPG o PNG · proporción vertical recomendada" },
                ],
            },
        ],
        publicacion: {
            titulo: "Datos de publicación",
            campos: [
                { nombre: "vista", etiqueta: "Vista donde aparece", tipo: "select", obligatorio: true, opciones: ["Por autor", "Por tema"] },
                { nombre: "tema", etiqueta: "Tema", tipo: "select", opciones: ["Novela", "Cuentos y leyendas", "Poesía", "Historia regional", "Infantil", "Ciencia"] },
                { nombre: "enMemoria", etiqueta: "Incluir en Memoria pública", tipo: "interruptor", descripcion: "Solo si el libro es de memoria regional." },
                { nombre: "firma", etiqueta: "Reseña firmada por", tipo: "fijo" },
            ],
        },
        campoTitulo: "libro",
        prefijoTitulo: "Reseña: ",
        campoEtiqueta: "genero",
        campoTexto: "texto",
        campoResumen: "resumen",
        campoImagen: "imagen",
    },
    acerca: {
        nombre: "Acerca de la biblioteca",
        enFrase: "el texto de «Acerca de»",
        genero: "o",
        etiqueta: "ACERCA DE",
        letra: "A",
        tituloNuevo: "Editar «Acerca de la biblioteca»",
        descripcion: "Elige la sección que vas a modificar. Cada sección se autoriza por separado.",
        descripcionTipo: "Historia, misión y visión, biografía de Solón Argüello o rol de la biblioteca.",
        grupos: [
            {
                titulo: "Sección",
                icono: "lista",
                campos: [
                    { nombre: "seccion", etiqueta: "Sección que vas a modificar", tipo: "chips", obligatorio: true, opciones: ["Historia", "Misión y visión", "Solón Argüello", "Rol de la biblioteca"] },
                ],
            },
            {
                titulo: "Texto de la sección",
                icono: "lapiz",
                campos: [
                    { nombre: "titulo", etiqueta: "Título de la sección", tipo: "texto", obligatorio: true, error: "Escribe el título de la sección." },
                    { nombre: "texto", etiqueta: "Texto", tipo: "area-grande", obligatorio: true },
                    { nombre: "linea", etiqueta: "Datos que se muestran en la línea del tiempo", tipo: "texto", ayuda: "Si no están confirmados, se muestran como «por confirmar»." },
                ],
            },
        ],
        publicacion: {
            titulo: "Publicación",
            campos: [
                { nombre: "enlaceInicio", etiqueta: "Mostrar enlace «Acerca de» en Inicio", tipo: "interruptor" },
                { nombre: "ultimaVersion", etiqueta: "Última versión publicada", tipo: "fijo" },
            ],
        },
        campoTitulo: "titulo",
        campoEtiqueta: "seccion",
        campoTexto: "texto",
    },
    memoria: {
        nombre: "Memoria pública",
        enFrase: "la pieza de Memoria pública",
        genero: "a",
        etiqueta: "MEMORIA PÚBLICA",
        letra: "M",
        tituloNuevo: "Redactar pieza de Memoria pública",
        descripcion: "Fotografías y piezas del archivo de memoria de la biblioteca. Los datos son de ejemplo.",
        descripcionTipo: "Fotografías y piezas del archivo de memoria de la biblioteca. Aparece en Memoria pública.",
        grupos: [
            {
                titulo: "Datos de la pieza",
                icono: "archivo",
                campos: [
                    { nombre: "titulo", etiqueta: "Título de la pieza", tipo: "texto", obligatorio: true, ancho: "mitad", error: "Escribe el título de la pieza." },
                    { nombre: "fuente", etiqueta: "Autoría o fuente", tipo: "texto", obligatorio: true, ancho: "mitad" },
                    { nombre: "tipoPieza", etiqueta: "Tipo de pieza", tipo: "select", ancho: "tercio", opciones: ["Fotografía", "Documento", "Objeto", "Grabación"] },
                    { nombre: "periodo", etiqueta: "Año o periodo", tipo: "texto", ancho: "tercio" },
                    { nombre: "registro", etiqueta: "Registro en archivo", tipo: "texto", ancho: "tercio", placeholder: "Por confirmar" },
                ],
            },
            {
                titulo: "Descripción de la pieza",
                subtitulo: "La escribe el equipo. Indica qué se ve, dónde y cuándo.",
                icono: "lapiz",
                campos: [
                    { nombre: "resumen", etiqueta: "Resumen para el listado", tipo: "area", obligatorio: true, max: 160, ayuda: "Máximo 160 caracteres." },
                    { nombre: "texto", etiqueta: "Texto de contexto", tipo: "area-grande", obligatorio: true, placeholder: "Escribe aquí el contexto histórico…", error: "El texto de contexto es obligatorio." },
                    { nombre: "imagen", etiqueta: "Fotografía o imagen", tipo: "archivo", placeholder: SIN_IMAGEN, ayuda: "JPG o PNG · mínimo 1600 px por el lado largo" },
                ],
            },
        ],
        publicacion: {
            titulo: "Datos de publicación",
            campos: [
                { nombre: "sePublica", etiqueta: "Se publica en", tipo: "select", obligatorio: true, opciones: ["Memoria pública"] },
                { nombre: "periodoTema", etiqueta: "Periodo o tema", tipo: "select", opciones: ["Vida cotidiana", "Arquitectura", "Eventos", "Personajes"] },
                { nombre: "permiso", etiqueta: "Permiso de uso de la imagen", tipo: "interruptor", descripcion: "Confirma que la biblioteca puede publicarla." },
                { nombre: "registradaPor", etiqueta: "Pieza registrada por", tipo: "fijo" },
            ],
        },
        campoTitulo: "titulo",
        campoEtiqueta: "tipoPieza",
        campoTexto: "texto",
        campoResumen: "resumen",
        campoImagen: "imagen",
    },
};

export const TIPOS = Object.keys(ESQUEMAS) as TipoContenido[];

export function todosLosCampos(esquema: Esquema): Campo[] {
    return [...esquema.grupos.flatMap((g) => g.campos), ...esquema.publicacion.campos];
}

export type Valores = Record<string, string | boolean>;

// Errores por campo para poder ENVIAR a autorización (guardar borrador no exige nada)
export function validar(tipo: TipoContenido, valores: Valores): Record<string, string> {
    const errores: Record<string, string> = {};
    for (const campo of todosLosCampos(ESQUEMAS[tipo])) {
        const valor = valores[campo.nombre];
        const texto = typeof valor === "string" ? valor.trim() : "";
        if (campo.obligatorio && !texto) errores[campo.nombre] = campo.error ?? "Este campo es obligatorio.";
        else if (campo.max && texto.length > campo.max) errores[campo.nombre] = `Máximo ${campo.max} caracteres (llevas ${texto.length}).`;
    }
    // Una imagen publicada necesita texto alternativo (accesibilidad)
    if (tipo === "noticia" && valores.imagen && !String(valores.alt ?? "").trim()) errores.alt = "Falta el texto alternativo.";
    // En Memoria pública no se envía una imagen sin permiso de uso
    if (tipo === "memoria" && valores.imagen && valores.permiso !== true) errores.permiso = "Confirma el permiso de uso de la imagen.";
    return errores;
}

// "Horario especial por el puente" / "Reseña: Cuentos de la Alameda"
export function tituloDe(tipo: TipoContenido, valores: Valores): string {
    const esquema = ESQUEMAS[tipo];
    const base = String(valores[esquema.campoTitulo] ?? "").trim();
    if (!base) return "Sin título";
    return `${esquema.prefijoTitulo ?? ""}${base}`;
}

// Imagen: solo JPG o PNG de hasta 5 MB
export function revisarImagen(archivo: { name: string; size: number; type: string }): string | null {
    if (!["image/jpeg", "image/png"].includes(archivo.type)) return "Solo se aceptan imágenes JPG o PNG.";
    if (archivo.size > 5 * 1024 * 1024) return "La imagen pesa más de 5 MB.";
    return null;
}

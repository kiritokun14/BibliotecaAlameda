// Servicios y programas de la biblioteca (HU-01).
// TODO backend: estos datos vendrán de la gestión de contenidos. El portal público
// solo debe mostrar lo PUBLICADO; un borrador o un contenido retirado nunca se expone,
// ni en la lista ni abriendo su dirección directa (CA-01.2).

export type TipoContenido = "servicio" | "programa";
export type EstadoPublicacion = "publicado" | "borrador" | "retirado";
export type IconoServicio = "libro" | "persona" | "calendario" | "reloj" | "pin" | "personas";

export type Servicio = {
    id: string; // se usa en /servicios/:id
    tipo: TipoContenido;
    estado: EstadoPublicacion;
    titulo: string;
    descripcion: string;
    icono: IconoServicio;
    destacado?: boolean; // tarjeta verde (como "Credencial de usuario" en Figma)
    proximamente?: boolean; // tarjeta dorada con la etiqueta "Próximamente"
    accion?: { texto: string; ruta: string }; // a dónde lleva la tarjeta
    detalle?: DetallePrograma; // solo los que tienen página propia
};

export type DetallePrograma = {
    nombre: { normal: string; resaltado: string }; // "Club" + "Alameda" (en dorado)
    subtitulo: string;
    etiqueta: string;
    requisitos: string[];
    actividades: string[];
    aviso: { titulo: string; texto: string };
};

export const servicios: Servicio[] = [
    {
        id: "consulta-en-sala",
        tipo: "servicio",
        estado: "publicado",
        titulo: "Consulta en sala",
        descripcion: "Acervo disponible para consulta dentro de la biblioteca.",
        icono: "libro",
    },
    {
        id: "credencial",
        tipo: "servicio",
        estado: "publicado",
        titulo: "Credencial de usuario",
        descripcion: "Solicítala en línea y recógela en la biblioteca con tu identificación.",
        icono: "persona",
        destacado: true,
        accion: { texto: "Ver detalles", ruta: "/credencial" },
    },
    {
        id: "agenda-de-espacios",
        tipo: "servicio",
        estado: "publicado",
        titulo: "Agenda de espacios",
        descripcion: "Solicita un espacio para actividades de tu grupo. Sujeto a disponibilidad.",
        icono: "calendario",
        accion: { texto: "Ver detalles", ruta: "/espacios" },
    },
    {
        // Ejemplo de BORRADOR: no debe aparecer en la lista ni abrirse en /servicios/prestamo-a-domicilio
        id: "prestamo-a-domicilio",
        tipo: "servicio",
        estado: "borrador",
        titulo: "Préstamo a domicilio",
        descripcion: "Borrador interno, todavía sin autorizar.",
        icono: "libro",
    },
    {
        id: "actividades-y-talleres",
        tipo: "programa",
        estado: "publicado",
        titulo: "Actividades y talleres",
        descripcion: "Consulta el calendario y regístrate en las actividades abiertas.",
        icono: "reloj",
        accion: { texto: "Ver actividades", ruta: "/eventos" },
    },
    {
        id: "visitas-grupales",
        tipo: "programa",
        estado: "publicado",
        titulo: "Visitas grupales",
        descripcion: "Escuelas y grupos pueden solicitar una visita guiada.",
        icono: "pin",
        // TODO: no hay pantalla de solicitud de visita en Figma; por ahora va a Contacto
        accion: { texto: "Solicitar visita", ruta: "/contacto" },
    },
    {
        id: "bibliocomunidad",
        tipo: "programa",
        estado: "publicado",
        titulo: "Bibliocomunidad",
        descripcion: "Club Alameda: comunidad de lectores con foro y actividades propias.",
        icono: "personas",
        proximamente: true,
        accion: { texto: "Conocer el programa", ruta: "/servicios/bibliocomunidad" },
        detalle: {
            nombre: { normal: "Club", resaltado: "Alameda" },
            subtitulo: "Una comunidad de lectores con foro y actividades propias.",
            etiqueta: "Bibliocomunidad · Próximamente",
            requisitos: [
                "Tener una cuenta en el portal",
                "Credencial de la biblioteca vigente",
                "Aceptar el reglamento del club",
            ],
            actividades: ["Círculo de lectura", "Tertulia mensual", "Intercambio de libros"],
            aviso: {
                titulo: "En desarrollo",
                texto: "Estamos preparando el Club Alameda. Pronto podrás conocer cómo participar.",
            },
        },
    },
];

// ---------- Reglas de publicación (CA-01.2) ----------

// Lo único que puede ver el público
export function soloPublicados(lista: Servicio[]): Servicio[] {
    return lista.filter((servicio) => servicio.estado === "publicado");
}

// Busca un contenido por su dirección; si no existe o no está publicado, no se entrega
export function buscarPublicado(lista: Servicio[], id: string | undefined): Servicio | null {
    return soloPublicados(lista).find((servicio) => servicio.id === id) ?? null;
}

// ---------- Servicio (lo que backend debe sustituir) ----------

// Para revisar los estados sin backend: /servicios?simular=error o ?simular=cargando
// (solo funciona en desarrollo; en producción se ignora)
function simulacion(): string | null {
    if (!import.meta.env.DEV) return null;
    return new URLSearchParams(window.location.search).get("simular");
}

const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// TODO backend: GET de servicios publicados. Debe responder solo contenido publicado.
export async function obtenerServicios(): Promise<Servicio[]> {
    const modo = simulacion();
    await espera(modo === "cargando" ? 60000 : 250);
    if (modo === "error") throw new Error("No se pudieron cargar los servicios");
    return soloPublicados(servicios);
}

// TODO backend: GET de un servicio por id. Si no está publicado debe responder 404.
export async function obtenerServicio(id: string | undefined): Promise<Servicio | null> {
    const modo = simulacion();
    await espera(modo === "cargando" ? 60000 : 250);
    if (modo === "error") throw new Error("No se pudo cargar el servicio");
    return buscarPublicado(servicios, id);
}

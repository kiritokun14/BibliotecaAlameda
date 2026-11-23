// Asistente de la biblioteca: lo que sabe responder mientras el backend no tenga el RAG (POST /api/asistente/consultas).
// Mejorado el 22 nov 2026: cada tema sale de información que el portal YA publica (datos de Contacto, horario de
// horarioBiblioteca.ts y la agenda pública real); no se inventan datos. Cada respuesta lleva sus fuentes (páginas del
// portal) y preguntas para seguir. La pregunta se compara por palabras clave con puntaje: gana el tema con más aciertos
// y, si empatan, el que va primero: los temas generales (actividades) van después de los concretos, así «inscribirme a
// un taller» es inscripción y «proponer una actividad» es proponer.
import type { RespuestaAsistente } from "./servicio";
import { datosBiblioteca } from "../../pages/publico/contacto/datos";
import { estadoBiblioteca } from "../../pages/publico/inicio/horarioBiblioteca";

export type Tema = {
    id: string;
    claves: RegExp[]; // cada clave que aparece suma un punto
    respuesta: () => Extract<RespuestaAsistente, { tipo: "respuesta" }>;
};

export function normalizar(texto: string) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Datos personales de otras personas: nunca se responden (va antes que cualquier tema)
export const PRIVADA = /(otra persona|otro usuario|otra usuaria|de alguien|prestados? (a|de) |tiene prestad|datos de |correo de (otro|otra|un|una) |telefono de (otro|otra|un|una) )/;

const { direccion, horario, telefono, correo } = datosBiblioteca;

export const TEMAS: Tema[] = [
    {
        id: "horario",
        claves: [/horario/, /\bhoras?\b/, /abre(n)?\b/, /cierra(n)?\b/, /abierta?/, /cerrad[oa]/, /sabado/, /domingo/, /fin de semana/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: [`La biblioteca abre ${horario.replace("Lunes", "de lunes").replace(" · Sábados", " y los sábados")}. Los domingos permanece cerrada.`,
                `${estadoBiblioteca().texto}.`],
            fuentes: [{ titulo: "Contacto y ubicación", ruta: "/contacto" }],
            siguientes: ["¿Dónde está la biblioteca?", "¿Qué actividades hay?"],
        }),
    },
    {
        id: "ubicacion",
        claves: [/donde/, /ubicacion/, /direccion/, /\bllego\b|llegar/, /telefono/, /correo/, /contacto/, /mapa/, /alameda/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: [`Estamos en ${direccion}.`,
                [telefono && `Teléfono: ${telefono}.`, correo && `Correo: ${correo}.`].filter(Boolean).join(" ") || "El teléfono y el correo están en la página de Contacto."],
            fuentes: [{ titulo: "Contacto y ubicación", ruta: "/contacto" }],
            siguientes: ["¿Cuál es el horario?", "¿Cómo envío una sugerencia?"],
        }),
    },
    {
        id: "credencial",
        claves: [/credencial/, /tramit/, /tarjeta/, /cotejo/, /\bine\b|identificacion/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["La credencial se solicita desde el portal con tu cuenta. El personal revisa tus datos y te cita a Préstamos para el cotejo presencial con tu identificación.",
                "Puedes ver en qué va tu trámite en Mi perfil › Mi credencial."],
            fuentes: [{ titulo: "Credencial de la biblioteca", ruta: "/credencial" }],
            siguientes: ["¿Cómo creo mi cuenta?", "¿Qué actividades hay?"],
        }),
    },
    {
        id: "inscripcion",
        claves: [/inscrib|inscripcion/, /apartar (un )?lugar|mi lugar/, /cupo/, /cancelar mi (lugar|inscripcion)/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Abre la actividad en Eventos y actividades y usa «Inscribirme» con tu sesión iniciada. El personal confirma tu lugar según el cupo.",
                "Tus inscripciones, y la opción de cancelar tu lugar, están en Mi perfil › Mis eventos."],
            fuentes: [{ titulo: "Eventos y actividades", ruta: "/eventos" }, { titulo: "Mis eventos", ruta: "/mi-perfil/eventos" }],
            siguientes: ["¿Qué actividades hay?", "¿Cómo creo mi cuenta?"],
        }),
    },
    {
        id: "espacios",
        claves: [/espacio/, /\bsala\b|salas/, /auditorio/, /reservar|reserva/, /prestamo de (sala|espacio)/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Puedes solicitar una sala o un módulo para tu actividad desde Espacios. Solicitar no es reservar: el personal revisa la fecha y te responde.",
                "El estado de tus solicitudes está en Mi perfil › Mis espacios."],
            fuentes: [{ titulo: "Espacios de la biblioteca", ruta: "/espacios" }],
            siguientes: ["¿Puedo proponer una actividad?", "¿Cuál es el horario?"],
        }),
    },
    {
        id: "proponer",
        claves: [/propon|propuesta/, /organizar/, /dar un taller|impartir/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Sí. Con tu cuenta puedes proponer un taller, un club o una charla desde «Proponer una actividad». El personal la revisa y te avisa en tus notificaciones.",
                "Proponer no aprueba ni reserva: sigue cada propuesta en Mi perfil › Mis propuestas."],
            fuentes: [{ titulo: "Proponer una actividad", ruta: "/proponer" }],
            siguientes: ["¿Cómo solicito un espacio?", "¿Qué actividades hay?"],
        }),
    },
    {
        id: "actividades",
        claves: [/actividad/, /evento/, /taller/, /agenda/, /club(es)? de lectura/, /cuentacuentos|cuenta cuentos/, /visita guiada/, /que hay\b/],
        // La lista real de actividades la agrega servicio.ts con la agenda pública (proximasActividades)
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Estas son las próximas actividades publicadas en el portal:"],
            cierre: "Cada actividad tiene su detalle e inscripción en Eventos y actividades.",
            fuentes: [{ titulo: "Eventos y actividades", ruta: "/eventos" }],
            siguientes: ["¿Cómo me inscribo a una actividad?", "¿Puedo proponer una actividad?"],
        }),
    },
    {
        id: "catalogo",
        claves: [/libro/, /catalogo/, /prestamo/, /prestar|presten|llevar(me)? (un|a casa)/, /buscar (un )?titulo|autor/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Puedes buscar libros por título o autor en el Catálogo del portal.",
                "Cómo funciona cada servicio, como el préstamo, está descrito en Servicios."],
            fuentes: [{ titulo: "Catálogo", ruta: "/catalogo" }, { titulo: "Servicios de la biblioteca", ruta: "/servicios" }],
            siguientes: ["¿Cómo tramito mi credencial?", "¿Cuál es el horario?"],
        }),
    },
    {
        id: "cuenta",
        claves: [/cuenta/, /registr/, /contrasena|password/, /iniciar sesion|entrar/, /olvide/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Crea tu cuenta en «Crear cuenta» con tu correo; te llegará un enlace para confirmarlo.",
                "Si olvidaste tu contraseña, usa «¿Olvidaste tu contraseña?» al iniciar sesión. Si ya no tienes acceso a tu correo, el personal puede ayudarte en la biblioteca."],
            fuentes: [{ titulo: "Crear cuenta", ruta: "/crear-cuenta" }, { titulo: "Recuperar el acceso", ruta: "/recuperar" }],
            siguientes: ["¿Cómo tramito mi credencial?", "¿Dónde está la biblioteca?"],
        }),
    },
    {
        id: "noticias",
        claves: [/noticia/, /novedad/, /aviso/, /que hay de nuevo/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Las novedades de la biblioteca se publican en Noticias. Con tu cuenta, los avisos que te tocan llegan a la campana de notificaciones."],
            fuentes: [{ titulo: "Noticias", ruta: "/noticias" }],
            siguientes: ["¿Qué actividades hay?", "¿Cuál es el horario?"],
        }),
    },
    {
        id: "sugerencia",
        claves: [/sugerencia/, /queja/, /comentario/, /escribir(les)?|mensaje/],
        respuesta: () => ({
            tipo: "respuesta",
            parrafos: ["Escríbenos desde Contacto y sugerencias: recibirás un folio para dar seguimiento a tu mensaje. Con tu sesión iniciada lo verás en Mi perfil › Mis mensajes."],
            fuentes: [{ titulo: "Contacto y sugerencias", ruta: "/contacto" }],
            siguientes: ["¿Dónde está la biblioteca?", "¿Cuál es el horario?"],
        }),
    },
];

// Tema con más aciertos (al empatar, el primero de la lista); null si ninguna clave aparece
export function elegirTema(pregunta: string): Tema | null {
    const texto = normalizar(pregunta);
    let mejor: Tema | null = null;
    let puntos = 0;
    for (const tema of TEMAS) {
        const aciertos = tema.claves.filter((c) => c.test(texto)).length;
        if (aciertos > puntos) { mejor = tema; puntos = aciertos; }
    }
    return mejor;
}

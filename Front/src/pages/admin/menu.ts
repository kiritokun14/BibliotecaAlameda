// Menú lateral del panel (Figma «Panel · Barra lateral», A-05).
// Cada subítem tiene la ruta que tendrá su pantalla. Se muestra como enlace solo cuando esa ruta
// ya tiene su permiso en capacidadPanel() (servicios/accesoPanel.ts); mientras no exista, aparece
// con la etiqueta «Pronto». Al crear una pantalla nueva: agrega su ruta en App.tsx y su capacidad
// en accesoPanel.ts, y el menú la activa solo.
import iconoLista from "../../assets/admin/menu-list.svg";
import iconoListaActivo from "../../assets/admin/menu-list-activo.svg";
import iconoArchivo from "../../assets/admin/menu-file.svg";
import iconoCalendario from "../../assets/admin/menu-calendar.svg";
import iconoUsuarios from "../../assets/admin/menu-users.svg";
import iconoCorreo from "../../assets/admin/menu-mail.svg";
import iconoAjustes from "../../assets/admin/menu-sliders.svg";

export type SubitemMenu = {
    texto: string;
    ruta: string;
    capacidad?: string; // solo si la ruta no está en capacidadPanel (por ejemplo, fuera de /admin)
};

export type SeccionMenu = {
    id: string;
    texto: string;
    icono: string;
    prefijo: string; // la sección se abre sola cuando la ruta actual empieza así
    subitems: SubitemMenu[];
};

// Resumen es un enlace directo (sin submenú); en Figma su ícono cambia a oscuro cuando está activo
export const RESUMEN = { texto: "Resumen", ruta: "/admin/resumen", icono: iconoLista, iconoActivo: iconoListaActivo };

export const SECCIONES_MENU: SeccionMenu[] = [
    {
        id: "contenidos",
        texto: "Contenidos",
        icono: iconoArchivo,
        prefijo: "/admin/contenidos",
        subitems: [
            { texto: "Editor de contenidos", ruta: "/admin/contenidos/editor" },
            { texto: "Revisión y publicación", ruta: "/admin/contenidos/revision" },
            { texto: "Historial de publicaciones", ruta: "/admin/contenidos/revision/historial" },
            { texto: "Acerca de la biblioteca", ruta: "/admin/contenidos/editor/acerca" },
        ],
    },
    {
        id: "actividades",
        texto: "Actividades",
        icono: iconoCalendario,
        prefijo: "/admin/actividades",
        subitems: [
            { texto: "Propuestas de actividades", ruta: "/admin/actividades/propuestas" },
            { texto: "Calendario y salas", ruta: "/admin/actividades/calendario" },
            { texto: "Visitas y uso de espacios", ruta: "/admin/actividades/visitas" },
            { texto: "Cambios y cancelaciones", ruta: "/admin/actividades/cambios" },
            { texto: "Inscripciones y cupos", ruta: "/admin/actividades/inscripciones" },
            { texto: "Asistencia", ruta: "/admin/actividades/asistencia" },
            { texto: "Resumen de asistencia", ruta: "/admin/actividades/asistencia/resumen" },
            { texto: "Evidencias privadas", ruta: "/admin/actividades/evidencias" },
        ],
    },
    {
        id: "participantes",
        texto: "Participantes",
        icono: iconoUsuarios,
        prefijo: "/admin/participantes",
        subitems: [
            { texto: "Progreso y recompensas", ruta: "/admin/participantes/progreso" },
            { texto: "Cotejo de credenciales", ruta: "/admin/participantes/cotejo" },
            { texto: "Moderación del foro", ruta: "/admin/participantes/foro" },
        ],
    },
    {
        id: "atencion",
        texto: "Atención",
        icono: iconoCorreo,
        prefijo: "/admin/atencion",
        subitems: [
            { texto: "Solicitudes de credencial", ruta: "/admin/atencion/credenciales" },
            { texto: "Solicitudes de espacios", ruta: "/admin/atencion/espacios" },
            { texto: "Propuestas de eventos", ruta: "/admin/atencion/propuestas" },
            { texto: "Contactos y sugerencias", ruta: "/admin/atencion/contactos" },
            { texto: "Bibliocomunidad", ruta: "/admin/atencion/bibliocomunidad" },
            { texto: "Altas asistidas", ruta: "/personal/alta-asistida", capacidad: "alta_asistida" },
            { texto: "Recuperación asistida", ruta: "/admin/atencion/recuperacion" },
            { texto: "Consulta de cuentas", ruta: "/admin/atencion/cuentas" },
            { texto: "Avisos", ruta: "/admin/atencion/avisos" },
        ],
    },
    {
        id: "administracion",
        texto: "Administración",
        icono: iconoAjustes,
        prefijo: "/admin/administracion",
        subitems: [
            { texto: "Cuentas y permisos", ruta: "/admin/administracion/cuentas" },
            { texto: "Fuentes del asistente", ruta: "/admin/administracion/fuentes" },
            { texto: "Estadísticas", ruta: "/admin/administracion/estadisticas" },
            { texto: "Bitácora de cambios", ruta: "/admin/administracion/bitacora" },
            { texto: "Configuración del portal", ruta: "/admin/administracion/configuracion" },
            { texto: "Estados del sistema", ruta: "/admin/administracion/estados" },
        ],
    },
];

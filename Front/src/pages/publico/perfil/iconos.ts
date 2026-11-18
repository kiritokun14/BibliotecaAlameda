// Ícono de cada sección del perfil: lo usan el menú, la insignia del encabezado y los estados vacíos.
import type { ClaveSeccion } from "./datos";
import iconoLista from "../../../assets/perfil/menu-lista.svg";
import iconoUsuario from "../../../assets/perfil/menu-usuario.svg";
import iconoArchivo from "../../../assets/perfil/menu-archivo.svg";
import iconoCalendario from "../../../assets/perfil/menu-calendario.svg";
import iconoPin from "../../../assets/perfil/menu-pin.svg";
import iconoEstrella from "../../../assets/perfil/menu-estrella.svg";
import iconoCampana from "../../../assets/perfil/menu-campana.svg";
import iconoCorreo from "../../../assets/perfil/menu-correo.svg";
import iconoCandado from "../../../assets/perfil/menu-candado.svg";

export const iconosSeccion: Record<ClaveSeccion, string> = {
    resumen: iconoLista, datos: iconoUsuario, credencial: iconoArchivo, eventos: iconoCalendario,
    propuestas: iconoArchivo, espacios: iconoPin, progreso: iconoEstrella, mensajes: iconoCorreo, avisos: iconoCampana, seguridad: iconoCandado,
};

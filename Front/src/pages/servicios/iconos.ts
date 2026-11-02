import type { IconoServicio } from "./datos";
import iconoLibro from "../../assets/servicios/servicio-libro.svg";
import iconoPersona from "../../assets/servicios/servicio-persona.svg";
import iconoCalendario from "../../assets/servicios/servicio-calendario.svg";
import iconoReloj from "../../assets/servicios/programa-reloj.svg";
import iconoPin from "../../assets/servicios/programa-pin.svg";
import iconoPersonas from "../../assets/servicios/programa-personas.svg";

// Ícono de cada tarjeta según el campo "icono" de datos.ts
export const iconos: Record<IconoServicio, string> = {
    libro: iconoLibro,
    persona: iconoPersona,
    calendario: iconoCalendario,
    reloj: iconoReloj,
    pin: iconoPin,
    personas: iconoPersonas,
};

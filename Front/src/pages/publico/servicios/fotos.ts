// Foto real de la biblioteca de cada servicio o programa (fotos de Aldahir, 21 nov 2026), por su id de datos.ts.
// TODO backend: cuando la gestión de contenidos permita subir una imagen por servicio, se usa esa y esta queda de respaldo.
import consultaEnSala from "../../../assets/servicios/fotos/consulta-en-sala.webp";
import credencial from "../../../assets/servicios/fotos/credencial.webp";
import agendaDeEspacios from "../../../assets/servicios/fotos/agenda-de-espacios.webp";
import actividadesYTalleres from "../../../assets/servicios/fotos/actividades-y-talleres.webp";
import visitasGrupales from "../../../assets/servicios/fotos/visitas-grupales.webp";
import bibliocomunidad from "../../../assets/servicios/fotos/bibliocomunidad.webp";

export const fotos: Record<string, string> = {
    "consulta-en-sala": consultaEnSala,
    credencial,
    "agenda-de-espacios": agendaDeEspacios,
    "actividades-y-talleres": actividadesYTalleres,
    "visitas-grupales": visitasGrupales,
    bibliocomunidad,
};

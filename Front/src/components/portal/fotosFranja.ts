// Foto real de la biblioteca detrás de la franja verde de título de cada sección (Aldahir, 21 nov 2026).
// Fotos tomadas en la biblioteca; van bajo el velo verde para que el texto se siga leyendo (Detalles.css, «FOTOS EN LAS FRANJAS»).
import acerca from "../../assets/comun/fotos/franjas/franja-acerca.webp";
import servicios from "../../assets/comun/fotos/franjas/franja-servicios.webp";
import noticias from "../../assets/comun/fotos/franjas/franja-noticias.webp";
import eventos from "../../assets/comun/fotos/franjas/franja-eventos.webp";
import lecturas from "../../assets/comun/fotos/franjas/franja-lecturas.webp";
import credencial from "../../assets/comun/fotos/franjas/franja-credencial.webp";
import espacios from "../../assets/comun/fotos/franjas/franja-espacios.webp";
import proponer from "../../assets/comun/fotos/franjas/franja-proponer.webp";
import contacto from "../../assets/comun/fotos/franjas/franja-contacto.webp";
import catalogo from "../../assets/comun/fotos/franjas/franja-catalogo.webp";
import club from "../../assets/comun/fotos/franjas/franja-club.webp";
import perfil from "../../assets/comun/fotos/franjas/franja-perfil.webp";
import general from "../../assets/comun/fotos/franjas/franja-general.webp";

const porSeccion: Record<string, string> = {
    acerca, servicios, noticias, eventos, lecturas, credencial, espacios, contacto, catalogo,
    proponer, "proponer-evento": proponer, "club-alameda": club,
    "mi-perfil": perfil, "mis-tramites": perfil, notificaciones: perfil,
};

// La sección es el primer tramo de la ruta («/eventos/todas» → eventos); lo demás usa la vista general de la sala.
export function fotoFranja(ruta: string): string {
    return porSeccion[ruta.split("/")[1] ?? ""] ?? general;
}

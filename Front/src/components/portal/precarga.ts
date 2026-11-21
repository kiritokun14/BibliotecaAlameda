// Precarga de las páginas del menú: al pasar el mouse o llegar con el teclado a un enlace se descarga
// el código de esa página y se piden sus datos. Al hacer clic, casi todo ya está listo.
// Cada consulta se hace una sola vez a la vez (las repetidas se juntan en servicios/consultas.ts).
import { precargarPublicados } from "../../servicios/publicacion";
import { precargarAgendaPublica } from "../../servicios/agendaPublica";
import { fechaHoyTepic } from "../../servicios/propuestasUsuario";

const sinError = (promesa: Promise<unknown>) => { promesa.catch(() => undefined); };

const PRECARGAS: Record<string, () => void> = {
    "/acerca": () => { sinError(import("../../pages/publico/acerca/Acerca.tsx")); precargarPublicados("acerca"); },
    "/noticias": () => { sinError(import("../../pages/publico/noticias/Noticias.tsx")); precargarPublicados("noticia"); },
    "/eventos": () => { sinError(import("../../pages/publico/eventos/Agenda.tsx")); precargarAgendaPublica(fechaHoyTepic()); },
    "/lecturas": () => { sinError(import("../../pages/publico/lecturas/Lecturas.tsx")); precargarPublicados(); },
    "/credencial": () => sinError(import("../../pages/publico/credencial/Credencial.tsx")),
    "/espacios": () => sinError(import("../../pages/publico/espacios/Espacios.tsx")),
    "/contacto": () => sinError(import("../../pages/publico/contacto/Contacto.tsx")),
};

// Los datos se vuelven a pedir como mucho cada 20 s por ruta, aunque se pase el mouse muchas veces
const ultima = new Map<string, number>();
export function precargarRuta(ruta: string) {
    const precarga = PRECARGAS[ruta];
    if (!precarga) return;
    const ahora = Date.now();
    if (ahora - (ultima.get(ruta) ?? 0) < 20000) return;
    ultima.set(ruta, ahora);
    precarga();
}

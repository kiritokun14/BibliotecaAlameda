import { useState } from "react";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import AvisoPortal from "./AvisoPortal";
import Portada from "./Portada";
import Accesos from "./Accesos";
import Lecturas from "./Lecturas";
import Cifras from "./Cifras";
import Actividades from "./Actividades";
import { consultarAgenda } from "../../../servicios/actividades";
import { precargarPublicados } from "../../../servicios/publicacion";
import Noticias from "./Noticias";
import LlamadoCuenta from "./LlamadoCuenta";
import Contacto from "./Contacto";

// Al abrir Inicio, sus consultas (actividades, noticias y reseñas) salen de inmediato, antes de dibujar,
// en paralelo. Cuando las secciones las piden, reciben la misma consulta en curso (no se repite).
if (typeof window !== "undefined" && window.location.pathname === "/") {
    // Misma consulta que Actividades.tsx (y la tarjeta de la portada): hoy en Tepic, 6 actividades
    consultarAgenda({ desde: new Date().toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" }), limite: 6 }).catch(() => undefined);
    precargarPublicados("noticia");
    precargarPublicados();
}

// Página de inicio: cada sección vive en su propio archivo de esta carpeta
function Inicio() {
    // null = todavía no se sabe (no se muestra nada para que no "parpadee" a quien ya inició sesión);
    // false = visitante → se muestra "Crea tu cuenta"; true = con sesión → se oculta.
    const [sesionActiva, setSesionActiva] = useState<boolean | null>(null);
    return (
        <PaginaPublica alCambiarSesion={setSesionActiva}>
            <AvisoPortal />
            <Portada sesion={sesionActiva === true} />
            <Accesos sesion={sesionActiva === true} />
            <Lecturas />
            <Cifras />
            <Actividades />
            <Noticias />
            {sesionActiva === false && <LlamadoCuenta />}
            <Contacto />
        </PaginaPublica>
    );
}

export default Inicio;

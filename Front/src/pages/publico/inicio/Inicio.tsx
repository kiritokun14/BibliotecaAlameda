import { useState } from "react";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import AvisoPortal from "./AvisoPortal";
import Portada from "./Portada";
import Accesos from "./Accesos";
import Lecturas from "./Lecturas";
import Cifras from "./Cifras";
import Actividades from "./Actividades";
import Noticias from "./Noticias";
import LlamadoCuenta from "./LlamadoCuenta";
import Contacto from "./Contacto";

// Página de inicio: cada sección vive en su propio archivo de esta carpeta
function Inicio() {
    // null = todavía no se sabe (no se muestra nada para que no "parpadee" a quien ya inició sesión);
    // false = visitante → se muestra "Crea tu cuenta"; true = con sesión → se oculta.
    const [sesionActiva, setSesionActiva] = useState<boolean | null>(null);
    return (
        <PaginaPublica alCambiarSesion={setSesionActiva}>
            <AvisoPortal />
            <Portada />
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

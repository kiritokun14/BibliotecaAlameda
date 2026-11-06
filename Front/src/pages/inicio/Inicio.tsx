import { useState } from "react";
import "./Inicio.css";
import "../Acceso.css"; // estilos de la franja y el pie
import { FranjaInstitucional, PieInstitucional } from "../../components/Institucional";
import Navegacion from "../../components/Navegacion";
import BotonAsistente from "../../components/BotonAsistente";
import Portada from "./Portada";
import Accesos from "./Accesos";
import Lecturas from "./Lecturas";
import Cifras from "./Cifras";
import Actividades from "./Actividades";
import Noticias from "./Noticias";
import LlamadoCuenta from "./LlamadoCuenta";
import Acerca from "./Acerca";
import Contacto from "./Contacto";

// Página de inicio: cada sección vive en su propio archivo de esta carpeta
function Inicio() {
    const [sesionActiva, setSesionActiva] = useState<boolean | null>(null);
    return (
        <div className="pagina-inicio">
            <FranjaInstitucional />
            <Navegacion alCambiarSesion={setSesionActiva} />
            <main>
                <Portada />
                <Accesos />
                <Lecturas />
                <Cifras />
                <Actividades />
                <Noticias />
                {sesionActiva === false && <LlamadoCuenta />}
                <Acerca />
                <Contacto />
            </main>
            <PieInstitucional />
            <BotonAsistente />
        </div>
    );
}

export default Inicio;

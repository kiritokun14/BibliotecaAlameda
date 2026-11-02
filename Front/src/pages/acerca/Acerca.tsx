import type { ReactNode } from "react";
import { Navigate, NavLink, useParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../components/PaginaPublica";
import "./Acerca.css";
import type { SeccionAcerca } from "./datos";
import Historia from "./Historia";
import MisionVision from "./MisionVision";
import SolonArguello from "./SolonArguello";
import RolBiblioteca from "./RolBiblioteca";
import iconoReloj from "../../assets/acerca/pestana-reloj.svg";
import iconoEstrella from "../../assets/acerca/pestana-estrella.svg";
import iconoPersona from "../../assets/acerca/pestana-persona.svg";
import iconoPersonas from "../../assets/acerca/pestana-personas.svg";

// Cada pestaña es una dirección propia (/acerca/historia, /acerca/rol...),
// así se puede compartir el enlace y el botón "atrás" del navegador funciona.
const secciones: Record<SeccionAcerca, {
    pestana: string;
    icono: string;
    etiqueta: string;
    titulo: ReactNode;
    texto: string;
    Contenido: () => ReactNode;
}> = {
    historia: {
        pestana: "Historia",
        icono: iconoReloj,
        etiqueta: "Acerca de · Historia",
        titulo: <>Nuestra <span>historia</span></>,
        texto: "Cómo nació y cómo ha crecido la biblioteca de Tepic.",
        Contenido: Historia,
    },
    "mision-vision": {
        pestana: "Misión y visión",
        icono: iconoEstrella,
        etiqueta: "Acerca de · Misión y visión",
        titulo: <>Misión y <span>visión</span></>,
        texto: "Para qué existimos y hacia dónde queremos ir.",
        Contenido: MisionVision,
    },
    "solon-arguello": {
        pestana: "Solón Argüello",
        icono: iconoPersona,
        etiqueta: "Acerca de · Solón Argüello",
        titulo: <>Solón <span>Argüello</span></>,
        texto: "Semblanza, trayectoria y obras de quien da nombre a la biblioteca.",
        Contenido: SolonArguello,
    },
    rol: {
        pestana: "Rol de la biblioteca",
        icono: iconoPersonas,
        etiqueta: "Acerca de · Rol de la biblioteca",
        titulo: <>Lo que hace la <span>biblioteca</span></>,
        texto: "Nuestro papel social, comunitario, académico y cultural.",
        Contenido: RolBiblioteca,
    },
};

function esSeccion(valor: string | undefined): valor is SeccionAcerca {
    return valor !== undefined && valor in secciones;
}

// T-051 / HU-01: información institucional, pública y sin registro
function Acerca() {
    const { seccion } = useParams();
    // /acerca o una pestaña que no existe → Historia
    if (!esSeccion(seccion)) return <Navigate to="/acerca/historia" replace />;

    const actual = secciones[seccion];
    const Contenido = actual.Contenido;

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta={actual.etiqueta} titulo={actual.titulo} texto={actual.texto} />

            <div className="acerca">
                <nav className="pestanas-acerca" aria-label="Secciones de Acerca de">
                    {(Object.keys(secciones) as SeccionAcerca[]).map((clave) => (
                        <NavLink key={clave} to={`/acerca/${clave}`} className="pestana-acerca">
                            <img src={secciones[clave].icono} alt="" />
                            {secciones[clave].pestana}
                        </NavLink>
                    ))}
                </nav>

                <Contenido />
            </div>
        </PaginaPublica>
    );
}

export default Acerca;

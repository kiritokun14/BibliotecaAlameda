import type { ReactNode } from "react";
import "../pages/inicio/Inicio.css"; // fuentes, colores y botones del portal
import "./PaginaPublica.css";
import { EncabezadoPortal, PiePortal } from "./Portal";
import Navegacion from "./Navegacion";
import BotonAsistente from "./BotonAsistente";
import circulo1 from "../assets/inicio/portada-circulo-1.svg";
import circulo2 from "../assets/inicio/portada-circulo-2.svg";

// Estructura que comparten las páginas públicas: franja, menú, contenido, pie y asistente.
// No pide sesión: cualquier visitante puede verlas (CA-01.1).
// alCambiarSesion es opcional: Inicio lo usa para ocultar "Crea tu cuenta" si ya hay sesión.
type PaginaPublicaProps = {
    children: ReactNode;
    alCambiarSesion?: (activa: boolean | null) => void;
};

export default function PaginaPublica({ children, alCambiarSesion }: PaginaPublicaProps) {
    return (
        <div className="pagina-inicio pagina-publica">
            <a className="saltar-contenido" href="#contenido">Saltar al contenido</a>
            <EncabezadoPortal />
            <Navegacion alCambiarSesion={alCambiarSesion} />
            <main id="contenido" tabIndex={-1}>{children}</main>
            <PiePortal />
            <BotonAsistente />
        </div>
    );
}

type EncabezadoPublicoProps = {
    etiqueta: string;
    titulo: ReactNode; // ReactNode permite pintar una parte en dorado con <span>
    texto: string;
};

// Franja verde con el título de cada página
export function EncabezadoPublico({ etiqueta, titulo, texto }: EncabezadoPublicoProps) {
    return (
        <section className="encabezado-publico">
            <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
            <img className="encabezado-publico__circulo encabezado-publico__circulo--2" src={circulo2} alt="" />
            <span className="etiqueta-inicio">
                <span className="punto-dorado" />
                {etiqueta}
            </span>
            <h1>{titulo}</h1>
            <p>{texto}</p>
        </section>
    );
}

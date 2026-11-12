import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import "../../pages/publico/inicio/Inicio.css"; // fuentes, colores y botones del portal
import "./PaginaPublica.css";
import "./Uniforme.css"; // tarjetas simétricas y movimiento común de todo el portal
import { EncabezadoPortal, PiePortal } from "./Portal";
import Navegacion from "./Navegacion";
import BotonAsistente from "./BotonAsistente";
import circulo1 from "../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../assets/comun/iconos/encabezado-circulo-2.svg";

// Estructura que comparten las páginas públicas: franja, menú, contenido, pie y asistente.
// No pide sesión: cualquier visitante puede verlas (CA-01.1).
// alCambiarSesion es opcional: Inicio lo usa para ocultar "Crea tu cuenta" si ya hay sesión.
type PaginaPublicaProps = {
    children: ReactNode;
    alCambiarSesion?: (activa: boolean | null) => void;
};

// Dirección anterior (fuera del componente: cada página monta su propio PaginaPublica)
let direccionAnterior: string | null = null;
const seccionDe = (ruta: string) => ruta.split("/")[1] ?? "";

// Posición al cambiar de dirección:
// - Otra página del portal (por ejemplo, de Noticias a Eventos): se empieza arriba.
// - Otra sección de la misma página (Mi perfil › Mis datos, Acerca de › Historia, Credencial › Seguimiento…):
//   se queda donde empieza el contenido, justo debajo del encabezado verde. Solo se mueve si la persona
//   estaba más abajo; si ya veía esa parte, no se mueve.
function ubicarAlCambiar(pathname: string) {
    const anterior = direccionAnterior;
    direccionAnterior = pathname;
    if (anterior === null || anterior === pathname) return;
    if (seccionDe(anterior) !== seccionDe(pathname)) { window.scrollTo(0, 0); return; }
    const encabezado = document.querySelector("main#contenido > *");
    const barra = document.querySelector(".navegacion")?.getBoundingClientRect().height ?? 0;
    if (!encabezado) return;
    const inicioContenido = encabezado.getBoundingClientRect().bottom + window.scrollY - barra;
    if (window.scrollY > inicioContenido) window.scrollTo(0, Math.max(0, inicioContenido));
}

export default function PaginaPublica({ children, alCambiarSesion }: PaginaPublicaProps) {
    const { pathname } = useLocation();
    useEffect(() => { ubicarAlCambiar(pathname); }, [pathname]);
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

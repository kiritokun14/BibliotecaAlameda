import { usePublicados } from "../../../servicios/usarPublicados.ts";
import { EsqueletoArticulo } from "../../../components/portal/Esqueleto";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Link, Navigate, NavLink, useParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import EstadoPagina from "../../../components/portal/EstadoPagina";
import { simulacion } from "../../../servicios/simulacion";
import "../perfil/Perfil.css";
import "./Acerca.css";
import { EtiquetaPerfil, TarjetaPerfil } from "../perfil/piezas";
import iconoAccesos from "../../../assets/inicio/etiqueta-accesos.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import type { SeccionAcerca } from "./datos";
import Historia from "./Historia";
import MisionVision from "./MisionVision";
import SolonArguello from "./SolonArguello";
import RolBiblioteca from "./RolBiblioteca";
import iconoReloj from "../../../assets/acerca/pestana-reloj.svg";
import iconoEstrella from "../../../assets/acerca/pestana-estrella.svg";
import iconoPersona from "../../../assets/comun/iconos/persona-verde.svg";
import iconoPersonas from "../../../assets/acerca/pestana-personas.svg";

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

const claveDe = (s: SeccionAcerca) => (s === "mision-vision" ? "mision" : s === "solon-arguello" ? "solon" : s);

function esSeccion(valor: string | undefined): valor is SeccionAcerca {
    return valor !== undefined && valor in secciones;
}

// T-051 / HU-01: información institucional, pública y sin registro
function Acerca() {
    const { seccion } = useParams();
    const { datos, error } = usePublicados("acerca");
    // En teléfono el menú es un renglón de pastillas que se desliza de lado: la sección actual queda a la vista (centrada)
    const menu = useRef<HTMLUListElement>(null);
    useEffect(() => {
        const lista = menu.current;
        const activa = lista?.querySelector<HTMLElement>(".perfil-menu__opcion--activa");
        if (!lista || !activa || lista.scrollWidth <= lista.clientWidth) return;
        const r = activa.getBoundingClientRect(), l = lista.getBoundingClientRect();
        lista.scrollLeft += r.left - l.left - (l.width - r.width) / 2;
    }, [seccion]);
    // /acerca o una pestaña que no existe → Historia
    if (!esSeccion(seccion)) return <Navigate to="/acerca/historia" replace />;

    const actual = secciones[seccion];
    const claveBD = claveDe(seccion);
    const publicado = datos?.find(c => c.datos.seccion === claveBD);
    // TODO backend: cuando el contenido venga del servidor, este estado se muestra si la carga falla.
    // Mientras tanto se puede ver con ?simular=error (solo en desarrollo).
    const fallo = !!error || simulacion() === "error";

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta={actual.etiqueta} titulo={actual.titulo} texto={actual.texto} icono={actual.icono} />

            {fallo ? (
                <EstadoPagina
                    nivel="h2"
                    etiqueta="ERROR AL CARGAR"
                    titulo="No pudimos cargar esta página"
                    texto="Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, escríbenos desde el Buzón de sugerencias."
                    principal={{ texto: "Intentar de nuevo", ruta: `/acerca/${seccion}` }}
                    secundario={{ texto: "Ir al Buzón de sugerencias", ruta: "/contacto?tipo=sugerencia" }}
                />
            ) : (
                // Plantilla A del catálogo (AGENTS.md §7): menú lateral de secciones + sección con encabezado e insignia
                <div className="perfil-cuerpo acerca-cuerpo">
                    <nav className="perfil-menu acerca-menu" aria-label="Secciones de Acerca de">
                        <EtiquetaPerfil icono={iconoAccesos}>Secciones</EtiquetaPerfil>
                        <ul ref={menu}>
                            {(Object.keys(secciones) as SeccionAcerca[]).map((clave) => (
                                <li key={clave}>
                                    <NavLink to={`/acerca/${clave}`}
                                        className={`perfil-menu__opcion${clave === seccion ? " perfil-menu__opcion--activa" : ""}`}
                                        aria-current={clave === seccion ? "page" : undefined}>
                                        <img src={secciones[clave].icono} alt="" /><span className="perfil-menu__texto">{secciones[clave].pestana}</span>
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                        {/* Contacto al pie del menú (antes era un botón en el encabezado de la sección) */}
                        <div className="acerca-menu__contacto">
                            <strong>¿Tienes dudas?</strong>
                            <span>Escríbenos y la biblioteca te responde.</span>
                            <Link to="/contacto" className="perfil-boton perfil-boton--chico">Contáctanos</Link>
                        </div>
                    </nav>

                    <div className="perfil-seccion" key={seccion} style={{ "--icono-seccion": `url("${actual.icono}")` } as CSSProperties}>
                        {!datos ? <EsqueletoArticulo texto="Cargando información institucional…" />
                            // Mientras la biblioteca no publique el texto de una sección, se muestra el contenido del diseño de Figma
                            : !publicado ? <actual.Contenido />
                            : (
                                <TarjetaPerfil color="verde" icono={tarjetaLista} titulo={publicado.titulo}>
                                    <div className="acerca-texto">{publicado.cuerpo}</div>
                                    {typeof publicado.datos.lineaTiempo === "string" && (
                                        <div className="perfil-nota"><p><strong>Línea del tiempo</strong><span className="acerca-texto">{publicado.datos.lineaTiempo}</span></p></div>
                                    )}
                                </TarjetaPerfil>
                            )}
                    </div>
                </div>
            )}
        </PaginaPublica>
    );
}

export default Acerca;

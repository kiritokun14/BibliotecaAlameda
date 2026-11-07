import "./PanelSolon.css";
import { useContext, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ContextoPanel, capacidadPanel, nombresRoles, permisoGlobal, type IdentidadPanel } from "../../servicios/accesoPanel";
import { PiePortal } from "../../components/portal/Portal";
import "./Panel.css";
import { RESUMEN, SECCIONES_MENU, type SeccionMenu, type SubitemMenu } from "./menu";
import { useNotificaciones } from "./notificaciones/datos";
import logoMexico from "../../assets/comun/logos/logo-gobierno-mexico.png";
import logoNayarit from "../../assets/comun/logos/logo-nayarit-blanco.png";
import iconoLibro from "../../assets/admin/menu-book.svg";
import iconoExpandir from "../../assets/admin/menu-expandir.svg";
import iconoContraer from "../../assets/admin/menu-contraer.svg";
import iconoExterno from "../../assets/admin/icono-external.svg";
import iconoCampana from "../../assets/admin/icono-bell.svg";
import iconoUsuario from "../../assets/admin/icono-user.svg";

// Armazón de todas las pantallas del panel (Figma «Panel de administración · cuenta con acceso total», A-05):
// franja de gobierno, menú lateral, cabecera blanca, contenido y el pie institucional del portal.
// Uso: <PanelLayout titulo="Atención">…</PanelLayout>. El menú se arma con menu.ts.

// ---------- Franja guinda de gobierno ----------
function FranjaGobierno() {
    return (
        <div className="panel-gobierno">
            <div className="panel-gobierno__logos">
                <img src={logoMexico} alt="Gobierno de México" className="panel-gobierno__logo panel-gobierno__logo--mexico" />
                <span className="panel-gobierno__separador" />
                <img src={logoNayarit} alt="Gobierno de Nayarit" className="panel-gobierno__logo panel-gobierno__logo--nayarit" />
                <span className="panel-gobierno__separador" />
                {/* Logo de la biblioteca en blanco (se pinta con máscara, igual que en el portal) */}
                <span className="panel-gobierno__logo-biblioteca" role="img" aria-label="Biblioteca Solón Argüello" />
            </div>
            <p className="panel-gobierno__textos">
                Biblioteca Pública Central Estatal Solón Argüello
                <span className="panel-gobierno__separador panel-gobierno__separador--texto" />
                <strong>Panel de administración</strong>
            </p>
        </div>
    );
}

// ---------- Menú lateral ----------

// Un subítem es enlace si su ruta ya existe (tiene capacidad) y la cuenta tiene ese permiso;
// si la ruta todavía no existe se muestra con «Pronto»; si existe pero no hay permiso, no se muestra.
function estadoSubitem(subitem: SubitemMenu, identidad: IdentidadPanel | null): "enlace" | "pronto" | "oculto" {
    const capacidad = subitem.capacidad ?? capacidadPanel(subitem.ruta);
    if (!capacidad) return "pronto";
    return identidad && permisoGlobal(identidad.acceso, capacidad) ? "enlace" : "oculto";
}

// Título de la tarjeta de rol: «acceso total» para quien tiene todo; si no, sus roles
function textoRol(identidad: IdentidadPanel | null) {
    return { titulo: "PERMISOS DE LA CUENTA", texto: identidad ? nombresRoles(identidad.acceso) : "Personal de la biblioteca" };
}

function BarraLateral() {
    const identidad = useContext(ContextoPanel);
    const { pathname } = useLocation();
    const seccionActual = SECCIONES_MENU.find((s) => pathname.startsWith(s.prefijo))?.id;
    // Abierta: la sección de la página actual; las demás se abren y cierran al presionarlas
    const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(seccionActual ? [seccionActual] : []));
    const rol = textoRol(identidad);
    const enResumen = pathname.startsWith(RESUMEN.ruta);

    function alternar(id: string) {
        setAbiertas((previas) => {
            const nuevas = new Set(previas);
            if (nuevas.has(id)) nuevas.delete(id);
            else nuevas.add(id);
            return nuevas;
        });
    }

    return (
        <nav className="panel-lateral" aria-label="Menú del panel">
            <div className="panel-marca">
                <span className="panel-marca__sello"><img src={iconoLibro} alt="" /></span>
                <div>
                    <p className="panel-marca__nombre">Biblioteca Solón Argüello</p>
                    <p className="panel-marca__subtitulo">PANEL DEL PERSONAL</p>
                </div>
            </div>

            <div className="panel-rol">
                <p className="panel-rol__titulo">{rol.titulo}</p>
                <p className="panel-rol__texto">{rol.texto}</p>
            </div>

            <span className="panel-lateral__espacio" />

            <NavLink to={RESUMEN.ruta} className="panel-menu__item panel-menu__item--enlace">
                <img src={enResumen ? RESUMEN.iconoActivo : RESUMEN.icono} alt="" />
                <span>{RESUMEN.texto}</span>
            </NavLink>

            {SECCIONES_MENU.map((seccion) => (
                <SeccionLateral
                    key={seccion.id}
                    seccion={seccion}
                    identidad={identidad}
                    abierta={abiertas.has(seccion.id)}
                    actual={seccion.id === seccionActual}
                    alAlternar={() => alternar(seccion.id)}
                />
            ))}
        </nav>
    );
}

function SeccionLateral({
    seccion,
    identidad,
    abierta,
    actual,
    alAlternar,
}: {
    seccion: SeccionMenu;
    identidad: IdentidadPanel | null;
    abierta: boolean;
    actual: boolean;
    alAlternar: () => void;
}) {
    const { pathname } = useLocation();
    const rutaActiva = seccion.subitems
        .filter(({ ruta }) => pathname === ruta || pathname.startsWith(`${ruta}/`))
        .sort((a, b) => b.ruta.length - a.ruta.length)[0]?.ruta;
    const visibles = seccion.subitems
        .map((subitem) => ({ subitem, estado: estadoSubitem(subitem, identidad) }))
        .filter(({ estado }) => estado !== "oculto");
    if (visibles.length === 0) return null;
    const idLista = `submenu-${seccion.id}`;

    return (
        <>
            <button
                type="button"
                className={`panel-menu__item${abierta ? " panel-menu__item--abierto" : ""}${actual ? " panel-menu__item--actual" : ""}`}
                aria-expanded={abierta}
                aria-controls={idLista}
                onClick={alAlternar}
            >
                <img src={seccion.icono} alt="" />
                <span>{seccion.texto}</span>
                <img src={abierta ? iconoContraer : iconoExpandir} alt="" />
            </button>
            {abierta && (
                <ul className="panel-submenu" id={idLista}>
                    {visibles.map(({ subitem, estado }) => (
                        <li key={subitem.ruta}>
                            {estado === "enlace" ? (
                                <Link to={subitem.ruta}
                                    className={`panel-submenu__item${rutaActiva === subitem.ruta ? " active" : ""}`}
                                    aria-current={rutaActiva === subitem.ruta ? "page" : undefined}>{subitem.texto}</Link>
                            ) : (
                                <span className="panel-submenu__item panel-submenu__item--pronto">
                                    {subitem.texto}
                                    <span className="etiqueta-pronto">Pronto</span>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

// ---------- Cabecera blanca ----------
function Cabecera({ titulo }: { titulo: string }) {
    const identidad = useContext(ContextoPanel);
    const { pendientes } = useNotificaciones();
    return (
        <header className="panel-cabecera">
            <h1 className="panel-cabecera__titulo">{titulo}</h1>
            <a href="/" target="_blank" rel="noopener noreferrer" className="boton-panel boton-panel--contorno-verde boton-panel--cabecera">
                Ver portal público
                <img src={iconoExterno} alt="" />
                <span className="solo-lectores">(se abre en una pestaña nueva)</span>
            </a>
            <Link to="/admin/notificaciones" className="panel-campana" aria-label={pendientes > 0 ? `Notificaciones: ${pendientes} sin leer` : "Notificaciones"}>
                <img src={iconoCampana} alt="" />
                {pendientes > 0 && <span className="panel-campana__insignia" aria-hidden="true">{pendientes > 9 ? "9+" : pendientes}</span>}
            </Link>
            <span className="panel-cuenta">
                <span className="panel-cuenta__avatar"><img src={iconoUsuario} alt="" /></span>
                <span>
                    <span className="panel-cuenta__nombre">{identidad?.correo ?? "Personal de la biblioteca"}</span>
                    <span className="panel-cuenta__rol">{identidad ? nombresRoles(identidad.acceso) : "Personal de la biblioteca"}</span>
                </span>
            </span>
        </header>
    );
}

type PanelLayoutProps = {
    titulo: string; // el de la cabecera blanca, p. ej. "Atención"
    children: ReactNode;
    tema?: string;
};

function PanelLayout({ titulo, children, tema }: PanelLayoutProps) {
    const { pathname } = useLocation();
    return (
        <div className={`panel${tema ? ` panel--${tema}` : ""}`}>
            <FranjaGobierno />
            <div className="panel-cuerpo">
                <BarraLateral />
                <div className="panel-principal">
                    <Cabecera titulo={titulo} />
                    <div className="panel-desplazamiento" key={pathname}>
                        <main className="panel-contenido">
                            {!pathname.startsWith("/admin/contenidos/editor") && !pathname.startsWith("/admin/contenidos/revision") && !pathname.startsWith("/admin/atencion/contactos") && !pathname.startsWith("/admin/atencion/bibliocomunidad") && !pathname.startsWith("/admin/administracion/fuentes") && <p role="status" className="panel-nota">Demostración: estas acciones usan datos de ejemplo y no se guardan en la base de datos.</p>}
                            {children}
                            <p className="panel-nota">Biblioteca Solón Argüello · Panel del personal</p>
                        </main>
                        <PiePortal />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PanelLayout;

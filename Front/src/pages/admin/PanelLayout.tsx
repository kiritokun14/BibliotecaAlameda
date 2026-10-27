import { useContext, type ReactNode } from "react";
import { ContextoPanel, capacidadPanel, permisoGlobal, nombresRoles } from "../../servicios/accesoPanel";
import { Link, NavLink } from "react-router";
import "./Panel.css";
import logoGobierno from "../../assets/admin/logo-gobierno.png";
import iconoLibro from "../../assets/admin/menu-book.svg";
import iconoLista from "../../assets/admin/menu-list.svg";
import iconoArchivo from "../../assets/admin/menu-file.svg";
import iconoCalendario from "../../assets/admin/menu-calendar.svg";
import iconoUsuarios from "../../assets/admin/menu-users.svg";
import iconoCorreo from "../../assets/admin/menu-mail.svg";
import iconoAjustes from "../../assets/admin/menu-sliders.svg";
import iconoExpandir from "../../assets/admin/menu-expandir.svg";
import iconoContraer from "../../assets/admin/menu-contraer.svg";
import iconoExterno from "../../assets/admin/icono-external.svg";
import iconoCampana from "../../assets/admin/icono-bell.svg";
import iconoUsuario from "../../assets/admin/icono-user.svg";

// Secciones del menú que todavía no tienen pantalla (por eso no son enlaces)
const SECCIONES_PENDIENTES = [
    { texto: "Contenidos", icono: iconoArchivo },
    { texto: "Actividades", icono: iconoCalendario },
    { texto: "Participantes", icono: iconoUsuarios },
];

const SUBMENU_ATENCION = [
    { texto: "Solicitudes de credencial", ruta: "/admin/atencion/credenciales" },
    { texto: "Solicitudes de espacios", ruta: "/admin/atencion/espacios" },
    { texto: "Propuestas de eventos", ruta: "/admin/atencion/propuestas" },
    { texto: "Contactos y sugerencias" },
    { texto: "Bibliocomunidad", pronto: true },
    { texto: "Altas asistidas", ruta: "/personal/alta-asistida" },
    { texto: "Recuperación asistida" },
    { texto: "Consulta de cuentas" },
    { texto: "Avisos" },
];

function BarraLateral() {
    const identidad = useContext(ContextoPanel);
    return (
        <nav className="panel-lateral" aria-label="Menú del panel">
            <div className="panel-marca">
                <span className="panel-marca__sello">
                    <img src={iconoLibro} alt="" />
                </span>
                <div>
                    <p className="panel-marca__nombre">Biblioteca Solón Argüello</p>
                    <p className="panel-marca__subtitulo">PANEL DEL PERSONAL</p>
                </div>
            </div>

            <div className="panel-rol">
                <p className="panel-rol__titulo">PERMISOS DE LA CUENTA</p>
                <p className="panel-rol__texto">{identidad ? nombresRoles(identidad.acceso) : "Personal de la biblioteca"}</p>
            </div>

            <span className="panel-lateral__espacio" />

            <span className="panel-menu__item">
                <img src={iconoLista} alt="" />
                <span>Resumen</span>
            </span>
            {SECCIONES_PENDIENTES.map((seccion) => (
                <span key={seccion.texto} className="panel-menu__item">
                    <img src={seccion.icono} alt="" />
                    <span>{seccion.texto}</span>
                    <img src={iconoExpandir} alt="" />
                </span>
            ))}

            <span className="panel-menu__item panel-menu__item--abierto">
                <img src={iconoCorreo} alt="" />
                <span>Atención</span>
                <img src={iconoContraer} alt="" />
            </span>
            <ul className="panel-submenu">
                {SUBMENU_ATENCION.filter(subitem => {
                    if (!subitem.ruta) return true;
                    const capacidad = subitem.ruta === "/personal/alta-asistida" ? "alta_asistida" : capacidadPanel(subitem.ruta);
                    return !!identidad && !!capacidad && permisoGlobal(identidad.acceso, capacidad);
                }).map((subitem) =>
                    subitem.ruta ? (
                        <li key={subitem.texto}>
                            <NavLink to={subitem.ruta} className="panel-submenu__item">
                                {subitem.texto}
                            </NavLink>
                        </li>
                    ) : (
                        <li key={subitem.texto}>
                            <span className="panel-submenu__item">
                                {subitem.texto}
                                {subitem.pronto && <span className="etiqueta-pronto">Pronto</span>}
                            </span>
                        </li>
                    ),
                )}
            </ul>

            <span className="panel-menu__item">
                <img src={iconoAjustes} alt="" />
                <span>Administración</span>
                <img src={iconoExpandir} alt="" />
            </span>
        </nav>
    );
}

function Cabecera({ titulo }: { titulo: string }) {
    const identidad = useContext(ContextoPanel);
    return (
        <header className="panel-cabecera">
            <p className="panel-cabecera__titulo">{titulo}</p>
            <Link to="/" className="boton-panel boton-panel--contorno-verde">
                Ver portal público
                <img src={iconoExterno} alt="" />
            </Link>
            {/* TODO: panel de notificaciones del personal */}
            <button type="button" className="panel-campana" disabled aria-label="Notificaciones pendientes de implementar">
                <img src={iconoCampana} alt="" />

            </button>
            <span className="panel-cuenta">
                <span className="panel-cuenta__avatar">
                    <img src={iconoUsuario} alt="" />
                </span>
                <span>
                    <span className="panel-cuenta__nombre">{identidad?.correo ?? "Personal de la biblioteca"}</span>
                    <span className="panel-cuenta__rol">{identidad ? nombresRoles(identidad.acceso) : "Personal de la biblioteca"}</span>
                </span>
            </span>
        </header>
    );
}

function PieGobierno() {
    return (
        <footer className="panel-pie">
            <img src={logoGobierno} alt="Gobierno de México" className="panel-logo" />
            <div className="panel-pie__columna">
                <p className="panel-pie__titulo">Enlaces</p>
                <p>Marco jurídico</p>
                <p>Transparencia para el pueblo</p>
                <p>Portal de datos abiertos</p>
                <p>Plataforma Nacional de Transparencia</p>
            </div>
            <div className="panel-pie__columna">
                <p className="panel-pie__titulo">Información</p>
                <p>Declaración de accesibilidad</p>
                <p>Términos y condiciones</p>
                <p>Alerta</p>
            </div>
            <div className="panel-pie__columna">
                <p className="panel-pie__titulo">Biblioteca</p>
                <p>Biblioteca Solón Argüello</p>
                <p>Biblioteca Pública Central Estatal · Tepic, Nayarit</p>
                <p>Panel de administración del portal</p>
            </div>
        </footer>
    );
}

type PanelLayoutProps = {
    titulo: string; // el de la cabecera blanca, p. ej. "Atención"
    children: ReactNode;
};

function PanelLayout({ titulo, children }: PanelLayoutProps) {
    return (
        <div className="panel">
            <div className="panel-gobierno">
                <img src={logoGobierno} alt="Gobierno de México" className="panel-logo" />
                <p className="panel-gobierno__textos">
                    Biblioteca Solón Argüello
                    <span className="panel-gobierno__separador" />
                    <strong>Panel de administración</strong>
                </p>
            </div>

            <div className="panel-cuerpo">
                <BarraLateral />
                <div className="panel-principal">
                    <Cabecera titulo={titulo} />
                    <main className="panel-contenido">
                        <p role="status" className="panel-nota">Vista de demostración: los datos son de ejemplo. Las decisiones no se guardan en la base y se reinician al recargar.</p>
                        {children}
                        <p className="panel-nota">
                            Biblioteca Solón Argüello · Panel del personal · Datos de ejemplo · Logotipo provisional
                        </p>
                    </main>
                </div>
            </div>

            <PieGobierno />
        </div>
    );
}

export default PanelLayout;

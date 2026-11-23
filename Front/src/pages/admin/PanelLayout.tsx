import { precargarPanel } from "./precargaPanel";
import { AvisosSistema, LimiteErrorPanel } from "./EstadosPanel";
import "./PanelSolon.css";
import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { ContextoPanel, capacidadPanel, permisoGlobal, type IdentidadPanel } from "../../servicios/accesoPanel";
import "./Panel.css";
import "./PanelNormalizado.css";
import "./PanelNavegacion.css";
import "./PanelPiezas.css";
import "./PanelPaleta.css";
import CabeceraPanel from "./CabeceraPanel";
import { EstadoConexion, FechaHora, RolSesion } from "./MarcoPanel";
import { RESUMEN, SECCIONES_MENU, type SeccionMenu, type SubitemMenu } from "./menu";
import logoMexico from "../../assets/comun/logos/logo-gobierno-mexico.webp";
import logoNayarit from "../../assets/comun/logos/logo-nayarit-blanco.png";
import iconoLibro from "../../assets/admin/menu-book.svg";
import iconoExpandir from "../../assets/admin/menu-expandir.svg";

// Armazón de todas las pantallas del panel (Figma «Panel de administración · cuenta con acceso total», A-05):
// franja de gobierno, menú lateral plegable, cabecera blanca, contenido y el pie de administración.
// Uso: <PanelLayout titulo="Atención">…</PanelLayout>. El menú se arma con menu.ts.
// 21 nov 2026 (propuesta del Resumen): el menú se pliega y despliega (se recuerda en el navegador); en tableta y teléfono
// es un panel que se abre con «Menú» desde la cabecera; el pie del portal se cambió por un pie solo de administración.

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
            <div className="panel-gobierno__textos">
                <FechaHora />
                <strong className="panel-gobierno__pastilla">Panel de administración</strong>
            </div>
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

// El menú plegado se recuerda en este navegador (solo es una preferencia de vista)
const CLAVE_PLEGADO = "panel-menu-plegado";
function leerPlegado() {
    try { return localStorage.getItem(CLAVE_PLEGADO) === "si"; } catch { return false; }
}

// Cada página monta su propio PanelLayout: el desplazamiento del menú se guarda aquí para que, al elegir
// una opción de abajo, el menú se quede donde estaba y no regrese hasta arriba (Aldahir, 22 nov 2026)
let desplazamientoMenu = 0;

function BarraLateral({ plegado, alPlegar, abiertoMovil, alCerrarMovil }: {
    plegado: boolean; alPlegar: () => void; abiertoMovil: boolean; alCerrarMovil: () => void;
}) {
    const identidad = useContext(ContextoPanel);
    const { pathname } = useLocation();
    const seccionActual = SECCIONES_MENU.find((s) => pathname.startsWith(s.prefijo))?.id;
    // Abierta: la sección de la página actual; las demás se abren y cierran al presionarlas
    const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(seccionActual ? [seccionActual] : []));
    const enResumen = pathname.startsWith(RESUMEN.ruta);
    const menu = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const nav = menu.current;
        if (!nav) return;
        const restaurar = () => { if (desplazamientoMenu && nav.scrollTop < desplazamientoMenu) nav.scrollTop = desplazamientoMenu; };
        restaurar();
        // La sección abierta anima su alto al montar: se restaura otra vez al terminar
        const espera = window.setTimeout(() => {
            restaurar();
            // Si se llegó de otra parte y la opción elegida no se ve, se acerca sin saltar hasta arriba
            nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
        }, 400);
        return () => window.clearTimeout(espera);
    }, []);

    function alternar(id: string) {
        // Con el menú plegado, una sección se abre desplegando el menú (así se ven sus opciones)
        if (plegado) { alPlegar(); setAbiertas((previas) => new Set(previas).add(id)); return; }
        setAbiertas((previas) => {
            const nuevas = new Set(previas);
            if (nuevas.has(id)) nuevas.delete(id);
            else nuevas.add(id);
            return nuevas;
        });
    }

    return (
        <nav id="menu-panel" ref={menu} onScroll={(e) => { desplazamientoMenu = e.currentTarget.scrollTop; }} className={`panel-lateral${plegado ? " panel-lateral--plegado" : ""}${abiertoMovil ? " panel-lateral--abierto" : ""}`} aria-label="Menú del panel">
            {/* Marca: el logo de la biblioteca en blanco, su nombre completo y el área (plegado, solo el sello) */}
            <div className="panel-marca">
                <span className="panel-marca__sello"><img src={iconoLibro} alt="" /></span>
                <span className="panel-marca__logo" role="img" aria-label="Biblioteca Solón Argüello" />
                <div className="panel-marca__textos">
                    <p className="panel-marca__nombre">Biblioteca Pública Central Estatal</p>
                    <p className="panel-marca__subtitulo">Panel del personal</p>
                </div>
                {/* En tableta y teléfono el menú es un panel: se cierra con este botón o con Esc */}
                <button type="button" className="panel-lateral__cerrar" onClick={alCerrarMovil}>Cerrar menú</button>
            </div>

            <p className="panel-lateral__titulo">Menú</p>

            <NavLink to={RESUMEN.ruta} className="panel-menu__item panel-menu__item--enlace" title={plegado ? RESUMEN.texto : undefined}
                aria-label={plegado ? RESUMEN.texto : undefined}
                onMouseEnter={() => precargarPanel(RESUMEN.ruta)} onFocus={() => precargarPanel(RESUMEN.ruta)}>
                <img src={enResumen ? RESUMEN.iconoActivo : RESUMEN.icono} alt="" />
                <span className="panel-menu__texto">{RESUMEN.texto}</span>
            </NavLink>

            {SECCIONES_MENU.map((seccion) => (
                <SeccionLateral
                    key={seccion.id}
                    seccion={seccion}
                    identidad={identidad}
                    abierta={!plegado && abiertas.has(seccion.id)}
                    actual={seccion.id === seccionActual}
                    plegado={plegado}
                    alAlternar={() => alternar(seccion.id)}
                />
            ))}

            {/* Plegar / desplegar: al pie de la barra, con texto y la flecha que indica hacia dónde va */}
            <div className="panel-lateral__pie">
                <button type="button" className="panel-plegar" onClick={alPlegar} aria-expanded={!plegado} aria-controls="menu-panel"
                    title={plegado ? "Desplegar menú" : "Plegar menú"}>
                    <span className="panel-plegar__icono" aria-hidden="true" />
                    <span className="panel-plegar__texto">{plegado ? "Desplegar menú" : "Plegar menú"}</span>
                </button>
            </div>
        </nav>
    );
}

function SeccionLateral({
    seccion,
    identidad,
    abierta,
    actual,
    plegado,
    alAlternar,
}: {
    seccion: SeccionMenu;
    identidad: IdentidadPanel | null;
    abierta: boolean;
    actual: boolean;
    plegado: boolean;
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
        <div className={`panel-grupo${abierta ? " panel-grupo--abierto" : ""}`}>
            <button
                type="button"
                className={`panel-menu__item${abierta ? " panel-menu__item--abierto" : ""}${actual ? " panel-menu__item--actual" : ""}`}
                aria-expanded={abierta}
                aria-controls={idLista}
                aria-label={plegado ? `${seccion.texto}${actual ? " (sección actual)" : ""}` : undefined}
                title={plegado ? seccion.texto : undefined}
                onClick={alAlternar}
            >
                <img src={seccion.icono} alt="" />
                <span className="panel-menu__texto">{seccion.texto}</span>
                <img className="panel-menu__flecha" src={iconoExpandir} alt="" />
            </button>
            {/* Siempre montada: se despliega y se recoge animando su alto; cerrada, inert la saca del teclado y de los lectores */}
            <div className="panel-submenu-marco" inert={!abierta}>
                <ul className="panel-submenu" id={idLista}>
                    {visibles.map(({ subitem, estado }) => (
                        <li key={subitem.ruta}>
                            {estado === "enlace" ? (
                                <Link to={subitem.ruta} onMouseEnter={() => precargarPanel(subitem.ruta)} onFocus={() => precargarPanel(subitem.ruta)}
                                    className={`panel-submenu__item${rutaActiva === subitem.ruta ? " active" : ""}`}
                                    aria-current={rutaActiva === subitem.ruta ? "page" : undefined}><span className="panel-submenu__texto">{subitem.texto}</span></Link>
                            ) : (
                                <span className="panel-submenu__item panel-submenu__item--pronto">
                                    {subitem.texto}
                                    <span className="etiqueta-pronto">Pronto</span>
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ---------- Pie de administración: barra de estado ----------
// Como en una herramienta de trabajo: a la izquierda la conexión y el rol de la sesión; al centro los enlaces del
// panel; a la derecha a quién pedir ayuda y el aviso de uso. Los logos ya están en la franja de arriba.
function PiePanel() {
    const identidad = useContext(ContextoPanel);
    const puedeEstados = !!identidad && permisoGlobal(identidad.acceso, capacidadPanel("/admin/administracion/estados") ?? "");
    const anio = new Date().getFullYear();
    return (
        <footer className="panel-pie-admin">
            <div className="panel-pie-admin__estado">
                <EstadoConexion />
                <span className="panel-pie-admin__separador" aria-hidden="true" />
                <RolSesion />
            </div>
            <nav className="panel-pie-admin__enlaces" aria-label="Enlaces del panel">
                <Link to="/admin/resumen">Resumen</Link>
                <Link to="/admin/notificaciones">Notificaciones</Link>
                <Link to="/admin/perfil">Mi cuenta</Link>
                {puedeEstados && <Link to="/admin/administracion/estados">Estados del sistema</Link>}
                <Link to="/">Ver el portal</Link>
            </nav>
            <div className="panel-pie-admin__ayuda">
                <p>Soporte: <a href="mailto:bp0165@dgb.gob.mx">bp0165@dgb.gob.mx</a></p>
                <p className="panel-pie-admin__legal">© {anio} Biblioteca Solón Argüello · Uso exclusivo del personal</p>
            </div>
        </footer>
    );
}

type PanelLayoutProps = {
    titulo: string; // el de la cabecera blanca, p. ej. "Atención"
    children: ReactNode;
    tema?: string; // uno o varios, separados por espacio: «paleta» (paleta institucional: Resumen y Administración), «contenidos»…
    sinDemo?: boolean; // ya sin efecto: la franja «Datos de ejemplo» se quitó del panel
};

function PanelLayout({ titulo, children, tema }: PanelLayoutProps) {
    const { pathname } = useLocation();
    const [plegado, setPlegado] = useState(leerPlegado);
    // El menú de tableta y teléfono queda abierto solo en la página donde se abrió: al navegar se cierra solo
    const [menuAbiertoEn, setMenuAbiertoEn] = useState<string | null>(null);
    const menuMovil = menuAbiertoEn === pathname;
    const setMenuMovil = (abierto: boolean) => setMenuAbiertoEn(abierto ? pathname : null);

    function alternarPlegado() {
        setPlegado((p) => {
            try { localStorage.setItem(CLAVE_PLEGADO, p ? "no" : "si"); } catch { /* sin almacenamiento: no se recuerda */ }
            return !p;
        });
    }

    // La última pantalla del panel se recuerda en la pestaña: el portal la usa para «Volver al panel»
    useEffect(() => {
        try { sessionStorage.setItem("panel-ultima-ruta", pathname); } catch { /* sin almacenamiento: vuelve al Resumen */ }
    }, [pathname]);

    // Con el menú abierto, Esc lo cierra y el foco va a «Cerrar menú»
    useEffect(() => {
        if (!menuMovil) return;
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuAbiertoEn(null); };
        document.addEventListener("keydown", alTeclear);
        document.querySelector<HTMLElement>("#menu-panel .panel-lateral__cerrar")?.focus();
        return () => document.removeEventListener("keydown", alTeclear);
    }, [menuMovil]);

    return (
        <div className={`panel${tema ? tema.split(" ").map((t) => ` panel--${t}`).join("") : ""}${plegado ? " panel--menu-plegado" : ""}`}>
            <a className="panel-saltar" href="#contenido-panel">Saltar al contenido</a>
            <FranjaGobierno />
            <div className="panel-cuerpo">
                <BarraLateral plegado={plegado} alPlegar={alternarPlegado} abiertoMovil={menuMovil} alCerrarMovil={() => setMenuMovil(false)} />
                {menuMovil && <div className="panel-velo-menu" onClick={() => setMenuMovil(false)} aria-hidden="true" />}
                <div className="panel-principal">
                    <CabeceraPanel titulo={titulo} menuAbierto={menuMovil} alAbrirMenu={() => setMenuMovil(true)} />
                    {/* Solo el contenido se desplaza; la cabecera y el pie quedan fijos */}
                    <div className="panel-desplazamiento" key={pathname}>
                        <main className="panel-contenido" id="contenido-panel" tabIndex={-1}>
                            <AvisosSistema />
                            <LimiteErrorPanel key={pathname}>{children}</LimiteErrorPanel>
                        </main>
                    </div>
                </div>
            </div>
            {/* Marco del panel: franja arriba y pie abajo, a todo lo ancho; en medio, el menú y el contenido */}
            <PiePanel />
        </div>
    );
}

export default PanelLayout;

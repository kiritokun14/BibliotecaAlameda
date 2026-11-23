import { tienePanel } from "../../servicios/accesoPanel";
import { useEffect, useRef, useState } from "react";
import { tieneCapacidad } from "../../servicios/altaAsistida";
import { cerrarSesion, consultarMiAcceso } from "../../servicios/auth";
import { salirConAnimacion } from "../sesion/transicion";
import { obtenerSupabase, mensajeError } from "../../servicios/api";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { Icono, type NombreIcono } from "../../pages/admin/resumen/iconos";
import MenuCuenta from "../../pages/publico/perfil/MenuCuenta";
import { precargarRuta } from "./precarga";
import "./Navegacion.css";
import "./Portal.css"; // logo de la biblioteca (.logo-solon)

// El ícono solo se ve en el menú lateral de tableta y teléfono (en escritorio los enlaces van solo con texto)
const enlaces: { texto: string; ruta: string; icono: NombreIcono }[] = [
    { texto: "Inicio", ruta: "/", icono: "portal" },
    { texto: "Acerca de", ruta: "/acerca", icono: "info" },
    { texto: "Noticias", ruta: "/noticias", icono: "contenido" },
    { texto: "Eventos", ruta: "/eventos", icono: "calendario" },
    { texto: "Lecturas y reseñas", ruta: "/lecturas", icono: "fuentes" },
    { texto: "Credencial", ruta: "/credencial", icono: "credencial" },
    { texto: "Espacios", ruta: "/espacios", icono: "espacios" },
    { texto: "Contacto", ruta: "/contacto", icono: "mensajes" },
];

// Barra blanca de arriba: logo, enlaces y botones de cuenta
function Navegacion({ alCambiarSesion }: { alCambiarSesion?: (activa: boolean | null) => void }) {
    const [correo, setCorreo] = useState("");
    const [altaAsistida, setAltaAsistida] = useState(false);
    const [panel, setPanel] = useState(false);
    // Quien llegó desde el panel (misma pestaña, «Ver el portal») ve «Volver al panel» de inmediato, sin esperar a que se
    // confirmen sus permisos, y vuelve a la última pantalla que tenía abierta (PanelLayout la guarda en la pestaña).
    const [ultimaPanel] = useState(() => { try { return sessionStorage.getItem("panel-ultima-ruta"); } catch { return null; } });
    const [error, setError] = useState("");
    const [cerrando, setCerrando] = useState(false);
    // Menú lateral de tableta y teléfono: queda abierto solo en la página donde se abrió (al navegar se cierra solo)
    const { pathname } = useLocation();
    const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
    const menuAbierto = abiertoEn === pathname;
    const setMenuAbierto = (abierto: boolean) => setAbiertoEn(abierto ? pathname : null);
    const botonMenu = useRef<HTMLButtonElement>(null);
    const cerrarMenu = useRef<HTMLButtonElement>(null);
    // Con el menú abierto: Esc lo cierra, la página de atrás no se desplaza y el foco va a «Cerrar»
    useEffect(() => {
        if (!menuAbierto) return;
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbiertoEn(null); botonMenu.current?.focus(); } };
        document.addEventListener("keydown", alTeclear);
        const antes = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.body.classList.add("menu-portal-abierto"); // el botón del asistente se oculta mientras tanto
        cerrarMenu.current?.focus();
        return () => { document.removeEventListener("keydown", alTeclear); document.body.style.overflow = antes; document.body.classList.remove("menu-portal-abierto"); };
    }, [menuAbierto]);
    useEffect(() => {
        let activo = true;
        let cancelar: (() => void) | undefined;
        let generacion = 0;
        obtenerSupabase().then(supabase => {
            if (!activo) return;
            const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => {
                const actual = ++generacion;
                // Evita reentrar al cliente Auth mientras emite el evento.
                setTimeout(() => {
                    if (!activo || actual !== generacion) return;
                    if (!sesion) { setPanel(false); setAltaAsistida(false); setCorreo(""); alCambiarSesion?.(false); return; }
                    consultarMiAcceso().then((acceso) => {
                        if (activo && actual === generacion) {
                            setPanel(tienePanel(acceso));
                            setAltaAsistida(tieneCapacidad(acceso, "alta_asistida"));
                            setCorreo(sesion.user.email ?? "Cuenta activa");
                            alCambiarSesion?.(true);
                        }
                    }).catch(() => {
                        if (activo && actual === generacion) { setPanel(false); setAltaAsistida(false); setCorreo(""); alCambiarSesion?.(null); }
                    });
                }, 0);
            });
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => {
            // Sin backend no se puede tener sesión: se trata como visitante
            // (la consulta pública sigue disponible y se muestra "Crea tu cuenta").
            if (activo) alCambiarSesion?.(false);
        });
        return () => { activo = false; cancelar?.(); };
    }, [alCambiarSesion]);
    const navegar = useNavigate();
    // Al cerrar sesión se regresa al Inicio del portal (desde cualquier página)
    async function salir() {
        setCerrando(true); setError("");
        try {
            // Con la animación de salida (components/salida): «Cerrando tu sesión…» → «Hasta pronto» → Inicio
            await salirConAnimacion({ tema: "portal", cerrar: cerrarSesion, ir: () => { setPanel(false); setAltaAsistida(false); setCorreo(""); alCambiarSesion?.(false); navegar("/", { replace: true }); } });
        }
        catch (error) { setError(mensajeError(error)); }
        finally { setCerrando(false); }
    }
    return (
        <nav className="navegacion" aria-label="Principal">
            {/* El logo de la biblioteca va en la franja guinda, junto a los de México y Nayarit */}
            {/* Tableta y teléfono: botón de hamburguesa (tres rayas) que abre el menú lateral */}
            <button ref={botonMenu} className={`navegacion__menu${menuAbierto ? " navegacion__menu--abierto" : ""}`} type="button"
                aria-expanded={menuAbierto} aria-controls="navegacion-movil" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} onClick={() => setMenuAbierto(!menuAbierto)}>
                <span className="navegacion__rayas" aria-hidden="true"><span /><span /><span /></span>
            </button>
            {menuAbierto && <div className="navegacion__velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" />}
            <div id="navegacion-movil" className={`navegacion__desplegable${menuAbierto ? " navegacion__desplegable--abierto" : ""}`}
                onClick={(evento) => { if ((evento.target as HTMLElement).closest("a")) setMenuAbierto(false); }}>
                <div className="navegacion__lateral-cabeza">
                    <span className="navegacion__lateral-titulo">Menú</span>
                    <button ref={cerrarMenu} type="button" className="navegacion__cerrar" aria-label="Cerrar menú" onClick={() => { setMenuAbierto(false); botonMenu.current?.focus(); }}>
                        <span className="navegacion__rayas navegacion__rayas--x" aria-hidden="true"><span /><span /><span /></span>
                    </button>
                </div>
                <ul className="navegacion__enlaces">
                    {enlaces.map((enlace) => (
                        <li key={enlace.ruta}>
                            {/* NavLink agrega la clase "active" cuando estás en esa página */}
                            <NavLink to={enlace.ruta} end={enlace.ruta === "/"} className="navegacion__enlace"
                                onMouseEnter={() => precargarRuta(enlace.ruta)} onFocus={() => precargarRuta(enlace.ruta)}>
                                <span className="navegacion__icono" aria-hidden="true"><Icono nombre={enlace.icono} /></span>
                                {enlace.texto}
                            </NavLink>
                        </li>
                    ))}
                </ul>
                {/* Pie del menú lateral: lo que en escritorio va a la derecha de la barra */}
                <div className="navegacion__lateral-pie">
                    {correo ? <>
                        {(panel || ultimaPanel) && <Link to={ultimaPanel ?? "/admin"} className="navegacion__boton navegacion__boton--panel">Volver al panel</Link>}
                        {altaAsistida && <Link to="/admin/atencion/altas-asistidas" className="navegacion__boton">Alta asistida</Link>}
                    </> : <>
                        <Link to="/iniciar-sesion" className="navegacion__boton">Ingresar</Link>
                        <Link to="/crear-cuenta" className="navegacion__boton navegacion__boton--relleno">Crear cuenta</Link>
                    </>}
                </div>
            </div>
                <div className="navegacion__cuenta">
                    {correo ? <>
                        {(panel || ultimaPanel) && <Link to={ultimaPanel ?? "/admin"} className="navegacion__boton navegacion__boton--panel navegacion__solo-escritorio">Volver al panel</Link>}
                        {altaAsistida && <Link to="/admin/atencion/altas-asistidas" className="navegacion__boton navegacion__solo-escritorio">Alta asistida</Link>}
                        {/* Campana, «Mi perfil» y menú de cuenta con sesión (T4 · Actor 2, Figma 476:20760) */}
                        <MenuCuenta correo={correo} cerrando={cerrando} alCerrarSesion={salir} />
                    </> : <>
                        <Link to="/iniciar-sesion" className="navegacion__boton navegacion__solo-escritorio">Ingresar</Link>
                        <Link to="/crear-cuenta" className="navegacion__boton navegacion__boton--relleno navegacion__solo-escritorio">Crear cuenta</Link>
                        {/* Tableta y teléfono: pastilla «Ingresar» con el ícono de la persona en un círculo dorado; «Crear cuenta» va en el menú lateral */}
                        <Link to="/iniciar-sesion" className="navegacion__icono-boton"><span className="navegacion__icono-circulo" aria-hidden="true"><Icono nombre="usuario" /></span>Ingresar</Link>
                    </>}
                    {error && <span role="alert">{error}</span>}
                </div>
        </nav>
    );
}

export default Navegacion;

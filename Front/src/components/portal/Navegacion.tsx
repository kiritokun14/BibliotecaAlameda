import { tienePanel } from "../../servicios/accesoPanel";
import { useEffect, useState } from "react";
import { tieneCapacidad } from "../../servicios/altaAsistida";
import { cerrarSesion, consultarMiAcceso } from "../../servicios/auth";
import { obtenerSupabase, mensajeError } from "../../servicios/api";
import { Link, NavLink } from "react-router";
import MenuCuenta from "../../pages/publico/perfil/MenuCuenta";
import { precargarRuta } from "./precarga";
import "./Navegacion.css";
import "./Portal.css"; // logo de la biblioteca (.logo-solon)

const enlaces = [
    { texto: "Inicio", ruta: "/" },
    { texto: "Acerca de", ruta: "/acerca" },
    { texto: "Noticias", ruta: "/noticias" },
    { texto: "Eventos", ruta: "/eventos" },
    { texto: "Lecturas y reseñas", ruta: "/lecturas" },
    { texto: "Credencial", ruta: "/credencial" },
    { texto: "Espacios", ruta: "/espacios" },
    { texto: "Contacto", ruta: "/contacto" },
];

// Barra blanca de arriba: logo, enlaces y botones de cuenta
function Navegacion({ alCambiarSesion }: { alCambiarSesion?: (activa: boolean | null) => void }) {
    const [correo, setCorreo] = useState("");
    const [altaAsistida, setAltaAsistida] = useState(false);
    const [panel, setPanel] = useState(false);
    const [error, setError] = useState("");
    const [cerrando, setCerrando] = useState(false);
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
    async function salir() {
        setCerrando(true); setError("");
        try { await cerrarSesion(); setPanel(false); setAltaAsistida(false); setCorreo(""); alCambiarSesion?.(false); }
        catch (error) { setError(mensajeError(error)); }
        finally { setCerrando(false); }
    }
    return (
        <nav className="navegacion" aria-label="Principal">
            <Link to="/" className="navegacion__marca" aria-label="Biblioteca Solón Argüello, ir al inicio">
                <span className="logo-solon logo-solon--verde" />
            </Link>

            <div className="navegacion__desplegable">
                <ul className="navegacion__enlaces">
                    {enlaces.map((enlace) => (
                        <li key={enlace.ruta}>
                            {/* NavLink agrega la clase "active" cuando estás en esa página */}
                            <NavLink to={enlace.ruta} end={enlace.ruta === "/"} className="navegacion__enlace"
                                onMouseEnter={() => precargarRuta(enlace.ruta)} onFocus={() => precargarRuta(enlace.ruta)}>
                                {enlace.texto}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="navegacion__cuenta">
                    {correo ? <>
                        {panel && <Link to="/admin" className="navegacion__boton">Panel del personal</Link>}
                        {altaAsistida && <Link to="/personal/alta-asistida" className="navegacion__boton">Alta asistida</Link>}
                        {/* Campana, «Mi perfil» y menú de cuenta con sesión (T4 · Actor 2, Figma 476:20760) */}
                        <MenuCuenta correo={correo} cerrando={cerrando} alCerrarSesion={salir} />
                    </> : <>
                        <Link to="/iniciar-sesion" className="navegacion__boton">Ingresar</Link>
                        <Link to="/crear-cuenta" className="navegacion__boton navegacion__boton--relleno">Crear cuenta</Link>
                    </>}
                    {error && <span role="alert">{error}</span>}
                </div>
            </div>
        </nav>
    );
}

export default Navegacion;

import { useEffect, useState } from "react";
import { cerrarSesion, consultarMiAcceso } from "../servicios/auth";
import { obtenerSupabase, mensajeError } from "../servicios/api";
import { Link, NavLink } from "react-router";
import "./Navegacion.css";
import iconoBiblioteca from "../assets/icono-biblioteca.svg";

const enlaces = [
    { texto: "Inicio", ruta: "/" },
    { texto: "Noticias", ruta: "/noticias" },
    { texto: "Eventos", ruta: "/eventos" },
    { texto: "Lecturas", ruta: "/lecturas" },
    { texto: "Credencial", ruta: "/credencial" },
    { texto: "Espacios", ruta: "/espacios" },
    { texto: "Contacto", ruta: "/contacto" },
];

// Barra blanca de arriba: logo, enlaces y botones de cuenta
function Navegacion({ alCambiarSesion }: { alCambiarSesion?: (activa: boolean | null) => void }) {
    const [correo, setCorreo] = useState("");
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
                    if (!sesion) { setCorreo(""); alCambiarSesion?.(false); return; }
                    consultarMiAcceso().then(() => {
                        if (activo && actual === generacion) {
                            setCorreo(sesion.user.email ?? "Cuenta activa");
                            alCambiarSesion?.(true);
                        }
                    }).catch(() => {
                        if (activo && actual === generacion) { setCorreo(""); alCambiarSesion?.(null); }
                    });
                }, 0);
            });
            cancelar = () => data.subscription.unsubscribe();
        }).catch(() => { /* La consulta pública sigue disponible sin backend. */ });
        return () => { activo = false; cancelar?.(); };
    }, [alCambiarSesion]);
    async function salir() {
        setCerrando(true); setError("");
        try { await cerrarSesion(); setCorreo(""); alCambiarSesion?.(false); }
        catch (error) { setError(mensajeError(error)); }
        finally { setCerrando(false); }
    }
    return (
        <nav className="navegacion">
            <Link to="/" className="navegacion__marca">
                <span className="navegacion__sello">
                    <img src={iconoBiblioteca} alt="" />
                </span>
                <span className="navegacion__nombre">
                    <strong>Solón Argüello</strong>
                    <small>Biblioteca Pública Central Estatal</small>
                </span>
            </Link>

            <ul className="navegacion__enlaces">
                {enlaces.map((enlace) => (
                    <li key={enlace.ruta}>
                        {/* NavLink agrega la clase "active" cuando estás en esa página */}
                        <NavLink to={enlace.ruta} end className="navegacion__enlace">
                            {enlace.texto}
                        </NavLink>
                    </li>
                ))}
            </ul>

            <div className="navegacion__cuenta">
                {correo ? <>
                    <span className="navegacion__enlace">Sesión activa</span>
                    <button type="button" className="navegacion__boton" onClick={salir} disabled={cerrando}>
                        {cerrando ? 'Cerrando…' : 'Cerrar sesión'}
                    </button>
                </> : <>
                    <Link to="/iniciar-sesion" className="navegacion__boton">Ingresar</Link>
                    <Link to="/crear-cuenta" className="navegacion__boton navegacion__boton--relleno">Crear cuenta</Link>
                </>}
                {error && <span role="alert">{error}</span>}
            </div>
        </nav>
    );
}

export default Navegacion;

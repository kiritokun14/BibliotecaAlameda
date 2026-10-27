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
function Navegacion() {
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
                <Link to="/iniciar-sesion" className="navegacion__boton">
                    Ingresar
                </Link>
                <Link to="/crear-cuenta" className="navegacion__boton navegacion__boton--relleno">
                    Crear cuenta
                </Link>
            </div>
        </nav>
    );
}

export default Navegacion;

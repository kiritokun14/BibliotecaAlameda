import { Link } from "react-router";
import candado from "../../../assets/comun/iconos/candado.svg";
import "./PedirSesion.css";

// Tarjeta única de «Inicia sesión» para las páginas que solo existen con cuenta (perfil, trámites, notificaciones,
// proponer…). Antes cada página tenía su propio bloque y algunos chocaban con otros estilos.
export default function PedirSesion({ titulo, texto, nivel = "h1" }: { titulo: string; texto: string; nivel?: "h1" | "h2" }) {
    const Titulo = nivel;
    return (
        <section className="pedir-sesion" aria-labelledby="pedir-sesion-titulo">
            <div className="pedir-sesion__tarjeta">
                <span className="pedir-sesion__icono" aria-hidden="true"><img src={candado} alt="" /></span>
                <p className="pedir-sesion__etiqueta"><span aria-hidden="true" />Necesitas tu cuenta</p>
                <Titulo id="pedir-sesion-titulo">{titulo}</Titulo>
                <p className="pedir-sesion__texto">{texto}</p>
                <div className="pedir-sesion__botones">
                    <Link to="/iniciar-sesion" className="pedir-sesion__boton">Iniciar sesión</Link>
                    <Link to="/crear-cuenta" className="pedir-sesion__boton pedir-sesion__boton--contorno">Crear una cuenta</Link>
                </div>
            </div>
        </section>
    );
}

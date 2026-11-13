import { Link } from "react-router";
import AccesoLayout from "../../components/acceso/AccesoLayout";
import Aviso from "../../components/acceso/Aviso";
import iconoFlechaDer from "../../assets/comun/iconos/flecha-derecha.svg";

// Se muestra cuando intentan crear una cuenta con un correo que ya existe
function CorreoRegistrado() {
    return (
        <AccesoLayout
            titulo={<>Crea tu <span>cuenta</span></>}
            texto="Regístrate para usar los servicios de la biblioteca."
            beneficios={["Completa tus datos", "Confirma tu correo", "Inicia sesión y continúa"]}
        >
            <div className="tarjeta">
                <div className="tarjeta__encabezado">
                    <h2>Ese correo ya tiene una cuenta</h2>
                    <p>Para proteger tu información no creamos una cuenta duplicada.</p>
                </div>

                <Aviso tipo="info" titulo="¿Qué quieres hacer?">
                    Si ya eres usuario, inicia sesión. Si no recuerdas tu contraseña, puedes crear una nueva.
                </Aviso>

                <Link to="/iniciar-sesion" className="boton-principal">
                    Iniciar sesión
                    <img src={iconoFlechaDer} alt="" />
                </Link>
                <Link to="/recuperar" className="boton-secundario">
                    Recuperar contraseña
                </Link>
                <Link to="/crear-cuenta" className="enlace enlace--suelto">
                    Usar otro correo
                </Link>
            </div>
        </AccesoLayout>
    );
}

export default CorreoRegistrado;

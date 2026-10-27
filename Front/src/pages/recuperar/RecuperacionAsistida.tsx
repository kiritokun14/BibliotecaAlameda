import { Link } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import Aviso from "../../components/Aviso";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

// Para quien ya no puede abrir el correo de su cuenta
function RecuperacionAsistida() {
    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>¿No tienes acceso a tu <span>correo</span>?</>}
            texto="El personal puede ayudarte a recuperar tu cuenta."
        >
            <div className="tarjeta">
                <div className="tarjeta__encabezado">
                    <h2>Recuperación asistida</h2>
                    <p>El personal puede ayudarte a recuperar tu cuenta.</p>
                </div>

                <Aviso tipo="info" titulo="Recuperación asistida">
                    Si ya no puedes abrir el correo de tu cuenta, acude a la biblioteca con una identificación
                    oficial.
                </Aviso>

                <p className="tarjeta__parrafo">
                    El personal de Servicios Digitales verificará tu identidad y te ayudará a actualizar tu
                    correo. Nunca te pediremos tu contraseña.
                </p>

                {/* TODO: la página de Contacto todavía no existe */}
                <Link to="/contacto" className="boton-principal">
                    Ir a Contacto
                    <img src={iconoFlechaDer} alt="" />
                </Link>

                <Link to="/iniciar-sesion" className="enlace enlace--suelto">
                    ← Volver a iniciar sesión
                </Link>

                <p className="tarjeta__ayuda">
                    Si prefieres, también puedes solicitar apoyo desde la página de contacto y te responderemos por
                    el medio que indiques.
                </p>
            </div>
        </AccesoLayout>
    );
}

export default RecuperacionAsistida;

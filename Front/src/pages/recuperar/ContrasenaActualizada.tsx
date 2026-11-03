import { Link } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import Aviso from "../../components/Aviso";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

// Paso 4: confirmación final
function ContrasenaActualizada() {
    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>Contraseña <span>actualizada</span></>}
            texto="Todo listo para volver a entrar."
        >
            <div className="tarjeta">
                <Aviso tipo="exito" titulo="Contraseña actualizada">
                    Ya puedes iniciar sesión con tu nueva contraseña.
                </Aviso>

                <div className="tarjeta__encabezado">
                    <h2>Todo listo</h2>
                    <p>Inicia sesión para continuar con tu solicitud.</p>
                </div>

                <Link to="/iniciar-sesion" className="boton-principal">
                    Iniciar sesión
                    <img src={iconoFlechaDer} alt="" />
                </Link>
            </div>
        </AccesoLayout>
    );
}

export default ContrasenaActualizada;

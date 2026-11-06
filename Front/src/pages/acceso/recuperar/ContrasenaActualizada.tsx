import { Link } from "react-router";
import AccesoLayout from "../../../components/acceso/AccesoLayout";
import Aviso from "../../../components/acceso/Aviso";
import iconoFlechaDer from "../../../assets/comun/iconos/flecha-derecha.svg";

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

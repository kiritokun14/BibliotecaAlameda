import { Link } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import Aviso from "../components/Aviso";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";
import iconoFlechaIzqVerde from "../assets/login/icono-flecha-izq-verde.svg";

function CuentaDeshabilitada() {
    return (
        <AccesoLayout
            titulo={<>Inicia <span>sesión</span></>}
            texto="Entra para consultar tu credencial, tus actividades y tus solicitudes."
            beneficios={["Solicitar tu credencial", "Inscribirte a actividades", "Solicitar espacios"]}
        >
            <div className="tarjeta">
                <div className="tarjeta__encabezado">
                    <h2>Tu cuenta está deshabilitada</h2>
                    <p>
                        No puedes iniciar sesión por ahora. El personal de Servicios Digitales puede explicarte el
                        motivo y ayudarte a reactivarla.
                    </p>
                </div>

                <Aviso tipo="info" titulo="Pide apoyo">
                    Acude a la biblioteca o escribe desde la página de contacto.
                </Aviso>

                {/* TODO: estas páginas todavía no existen */}
                <Link to="/contacto" className="boton-principal">
                    Ir a Contacto
                    <img src={iconoFlechaDer} alt="" />
                </Link>
                <Link to="/credencial" className="boton-secundario">
                    Volver a Credencial
                    <img src={iconoFlechaIzqVerde} alt="" />
                </Link>
            </div>
        </AccesoLayout>
    );
}

export default CuentaDeshabilitada;

import { Link } from "react-router";
import AccesoLayout from "../../components/acceso/AccesoLayout";
import Aviso from "../../components/acceso/Aviso";

function CuentaDeshabilitada() {
    return (
        <AccesoLayout
            titulo="Tu cuenta está deshabilitada"
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
                </Link>
                <Link to="/credencial" className="boton-secundario">
                    Volver a Credencial
                </Link>
            </div>
        </AccesoLayout>
    );
}

export default CuentaDeshabilitada;

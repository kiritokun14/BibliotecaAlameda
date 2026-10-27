import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import "./Acceso.css";
import { FranjaInstitucional, PieInstitucional } from "../components/Institucional";
import iconoCheckGrande from "../assets/login/icono-check-grande.svg";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";

const SEGUNDOS_PARA_REDIRIGIR = 3;

function SesionIniciada() {
    const navigate = useNavigate();

    // "Te llevamos de vuelta al inicio": después de unos segundos se va solo
    useEffect(() => {
        const temporizador = setTimeout(() => navigate("/"), SEGUNDOS_PARA_REDIRIGIR * 1000);
        return () => clearTimeout(temporizador); // si sale antes, cancelamos
    }, [navigate]);

    return (
        <div className="pagina-acceso">
            <FranjaInstitucional />

            <main className="confirmacion">
                <div className="confirmacion__anillo">
                    <div className="confirmacion__icono">
                        <img src={iconoCheckGrande} alt="" />
                    </div>
                </div>

                <div className="confirmacion__textos">
                    <p className="confirmacion__etiqueta">SESIÓN INICIADA</p>
                    <h1>Te damos la bienvenida</h1>
                    <p>Te llevamos de vuelta al inicio de la biblioteca.</p>
                </div>

                <Link to="/" className="boton-principal boton-principal--compacto">
                    Continuar al inicio
                    <img src={iconoFlechaDer} alt="" />
                </Link>
            </main>

            <PieInstitucional />
        </div>
    );
}

export default SesionIniciada;

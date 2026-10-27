import { consultarMiAcceso } from "../servicios/auth";
import { CAPACIDAD_ALTA_ASISTIDA, tieneCapacidad } from "../servicios/altaAsistida";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./Acceso.css";
import { FranjaInstitucional, PieInstitucional } from "../components/Institucional";
import iconoCheckGrande from "../assets/login/icono-check-grande.svg";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";

const SEGUNDOS_PARA_REDIRIGIR = 3;

function SesionIniciada() {
    const navigate = useNavigate();
    const [verificada, setVerificada] = useState(false);
    // El personal con alta asistida (T-033) entra directo a su pantalla de trabajo.
    const [destino, setDestino] = useState("/");

    // "Te llevamos de vuelta al inicio": después de unos segundos se va solo
    useEffect(() => {
        let activo = true;
        let temporizador: ReturnType<typeof setTimeout>;
        consultarMiAcceso().then((acceso) => {
            if (activo) {
                const siguiente = tieneCapacidad(acceso, CAPACIDAD_ALTA_ASISTIDA) ? "/personal/alta-asistida" : "/";
                setDestino(siguiente);
                setVerificada(true);
                temporizador = setTimeout(() => navigate(siguiente), SEGUNDOS_PARA_REDIRIGIR * 1000);
            }
        }).catch(() => { if (activo) navigate('/iniciar-sesion?motivo=sesion-caducada', { replace: true }); });
        return () => { activo = false; clearTimeout(temporizador); };
    }, [navigate]);

    if (!verificada) return <main className="confirmacion" role="status">Comprobando tu sesión…</main>;

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
                    <p>{destino === "/" ? "Te llevamos de vuelta al inicio de la biblioteca." : "Te llevamos al alta asistida de cuentas."}</p>
                </div>

                <Link to={destino} className="boton-principal boton-principal--compacto">
                    {destino === "/" ? "Continuar al inicio" : "Ir al alta asistida"}
                    <img src={iconoFlechaDer} alt="" />
                </Link>
            </main>

            <PieInstitucional />
        </div>
    );
}

export default SesionIniciada;

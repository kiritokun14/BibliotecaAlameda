import { consultarMiAcceso } from "../../servicios/auth";
import { tienePanel } from "../../servicios/accesoPanel";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import "./Acceso.css";
import { FranjaInstitucional, PieInstitucional } from "../../components/acceso/Institucional";
import iconoCheckGrande from "../../assets/login/icono-check-grande.svg";
import iconoFlechaDer from "../../assets/comun/iconos/flecha-derecha.svg";

const SEGUNDOS_PARA_REDIRIGIR = 3;

function SesionIniciada() {
    const navigate = useNavigate();
    const [verificada, setVerificada] = useState(false);
    // El personal con permisos de administración va al panel; las demás cuentas, al inicio
    const [destino, setDestino] = useState<"/" | "/admin">("/");

    // Después de unos segundos se va solo al destino
    useEffect(() => {
        let activo = true;
        let temporizador: ReturnType<typeof setTimeout>;
        consultarMiAcceso().then((acceso) => {
            if (activo) {
                const ruta = tienePanel(acceso) ? "/admin" : "/";
                setDestino(ruta);
                setVerificada(true);
                temporizador = setTimeout(() => navigate(ruta), SEGUNDOS_PARA_REDIRIGIR * 1000);
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
                    <p>{destino === "/admin" ? "Te llevamos al panel de administración." : "Te llevamos de vuelta al inicio de la biblioteca."}</p>
                </div>

                <Link to={destino} className="boton-principal boton-principal--compacto">
                    {destino === "/admin" ? "Ir al panel" : "Continuar al inicio"}
                    <img src={iconoFlechaDer} alt="" />
                </Link>
            </main>

            <PieInstitucional />
        </div>
    );
}

export default SesionIniciada;

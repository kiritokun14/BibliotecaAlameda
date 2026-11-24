import { consultarMiAcceso } from "../../servicios/auth";
import { tienePanel } from "../../servicios/accesoPanel";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import PantallaEstado, { IconoPalomita } from "../../components/portal/PantallaEstado";

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

    if (!verificada) return <PantallaEstado cargando etiqueta="UN MOMENTO" titulo="Comprobando tu sesión" texto="Estamos revisando los permisos de tu cuenta para llevarte al lugar correcto." />;

    return (
        <PantallaEstado icono={<IconoPalomita />} etiqueta="SESIÓN INICIADA" titulo="Te damos la bienvenida"
            texto={destino === "/admin" ? "En unos segundos te llevamos al panel de administración." : "En unos segundos te llevamos al inicio de la biblioteca."}
            segundos={SEGUNDOS_PARA_REDIRIGIR}>
            <Link to={destino}>
                {destino === "/admin" ? "Ir al panel ahora" : "Continuar al inicio"}
            </Link>
        </PantallaEstado>
    );
}

export default SesionIniciada;

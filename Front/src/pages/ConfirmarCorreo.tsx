import Aviso from "../components/Aviso";
import { mensajeError } from "../servicios/api";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import { reenviarConfirmacion } from "../servicios/auth";
import iconoCorreo from "../assets/login/icono-correo.svg";
import iconoReenviar from "../assets/login/icono-reenviar.svg";

function ConfirmarCorreo() {
    // Crear cuenta nos manda el correo al navegar aquí (ver navigate() en CrearCuenta)
    const location = useLocation();
    const correo: string = location.state?.correo ?? "tu correo";
    const [reenviado, setReenviado] = useState<boolean>(location.state?.reenviado ?? false);
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    async function reenviar() {
        setEnviando(true);
        setError("");
        try { await reenviarConfirmacion(correo); setReenviado(true); }
        catch (error) { setError(mensajeError(error)); }
        finally { setEnviando(false); }
    }

    return (
        <AccesoLayout
            etiqueta="CASI LISTO"
            titulo={<>Confirma tu <span>correo</span></>}
            texto="Tu cuenta se activa al confirmar el correo. El teléfono es solo un dato de contacto."
        >
            <div className="tarjeta">
                <div className="icono-circulo">
                    <img src={iconoCorreo} alt="" />
                </div>

                {error && <Aviso tipo="error" titulo="No se pudo reenviar">{error}</Aviso>}
                <div className="tarjeta__encabezado">
                    <h2>{reenviado ? "Correo reenviado" : "Confirma tu correo"}</h2>
                    <p>
                        Si el registro procede, recibirás un mensaje en {correo}. Abre el enlace para activar tu cuenta. Puede tardar
                        unos minutos; revisa también la carpeta de spam.
                    </p>
                </div>

                <button type="button" className="boton-secundario" onClick={reenviar} disabled={enviando || correo === "tu correo"}>
                    {enviando ? "Reenviando…" : "Reenviar correo"}
                    <img src={iconoReenviar} alt="" />
                </button>

                <div className="enlaces">
                    <Link to="/crear-cuenta" className="enlace">
                        Cambiar correo
                    </Link>
                    <Link to="/iniciar-sesion" className="enlace">
                        Ir a iniciar sesión
                    </Link>
                </div>
            </div>
        </AccesoLayout>
    );
}

export default ConfirmarCorreo;

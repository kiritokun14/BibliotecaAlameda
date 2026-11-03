import { mensajeError } from "../servicios/api";
import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import Aviso from "../components/Aviso";
import { Campo } from "../components/Campo";
import { reenviarConfirmacion } from "../servicios/auth";
import { esCorreoValido, MENSAJE_CORREO } from "../servicios/validaciones";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";

// Se muestra cuando abren un enlace de verificación que ya venció o ya se usó
function ConfirmarEnlaceVencido() {
    const [correo, setCorreo] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);
    const navigate = useNavigate();

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!esCorreoValido(correo)) {
            setError(MENSAJE_CORREO);
            return;
        }
        setError("");
        setEnviando(true);
        try {
            await reenviarConfirmacion(correo);
            navigate("/confirma-tu-correo", { state: { correo, reenviado: true } });
        } catch (error) { setError(mensajeError(error)); }
        finally { setEnviando(false); }
    }

    return (
        <AccesoLayout
            etiqueta="CASI LISTO"
            titulo={<>No pudimos verificar tu <span>correo</span></>}
            texto="El enlace ya no es válido."
        >
            <form className="tarjeta" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Solicita uno nuevo</h2>
                    <p>Por seguridad, los enlaces duran un tiempo limitado y se usan una sola vez.</p>
                </div>

                <Aviso tipo="error" titulo="El enlace de verificación venció o ya se usó">
                    Reenvía el enlace para activar tu cuenta.
                </Aviso>

                <Campo id="correo" etiqueta="Correo electrónico" type="email" placeholder="nombre@ejemplo.mx"
                    ayuda="Te enviaremos un nuevo enlace." error={error}
                    value={correo} onChange={(e) => setCorreo(e.target.value)} required />

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Enviando…" : "Reenviar enlace de verificación"}
                    <img src={iconoFlechaDer} alt="" />
                </button>

                <Link to="/iniciar-sesion" className="enlace enlace--suelto">
                    ← Volver a iniciar sesión
                </Link>
            </form>
        </AccesoLayout>
    );
}

export default ConfirmarEnlaceVencido;

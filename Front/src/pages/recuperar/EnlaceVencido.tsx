import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import Aviso from "../../components/Aviso";
import { Campo } from "../../components/Campo";
import { enviarEnlaceRecuperacion } from "../../servicios/auth";
import { esCorreoValido, MENSAJE_CORREO } from "../../servicios/validaciones";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

// Se muestra cuando abren un enlace de recuperación que ya venció o ya se usó
function EnlaceVencido() {
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
        await enviarEnlaceRecuperacion(correo);
        setEnviando(false);
        navigate("/recuperar/revisa-tu-correo", { state: { correo } });
    }

    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>Solicita un <span>nuevo</span> enlace</>}
            texto="Por seguridad, los enlaces duran un tiempo limitado y se usan una sola vez."
        >
            <form className="tarjeta" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Recuperar acceso</h2>
                    <p>Crea una nueva contraseña.</p>
                </div>

                <Aviso tipo="error" titulo="Este enlace ya no es válido">
                    Venció o ya se utilizó. Solicita uno nuevo para restablecer tu contraseña.
                </Aviso>

                <Campo id="correo" etiqueta="Correo electrónico" type="email" placeholder="nombre@ejemplo.mx"
                    ayuda="Te enviaremos un nuevo enlace." error={error}
                    value={correo} onChange={(e) => setCorreo(e.target.value)} required />

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Enviando…" : "Enviar nuevo enlace"}
                    <img src={iconoFlechaDer} alt="" />
                </button>

                <Link to="/iniciar-sesion" className="enlace enlace--suelto">
                    ← Volver a iniciar sesión
                </Link>
            </form>
        </AccesoLayout>
    );
}

export default EnlaceVencido;

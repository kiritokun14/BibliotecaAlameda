import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import { Campo } from "../../components/Campo";
import { enviarEnlaceRecuperacion } from "../../servicios/auth";
import { esCorreoValido, MENSAJE_CORREO } from "../../servicios/validaciones";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

// Paso 1: escribir el correo para recibir el enlace
function SolicitarEnlace() {
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
            titulo={<>¿Olvidaste tu <span>contraseña</span>?</>}
            texto="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva contraseña."
        >
            <form className="tarjeta" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Recupera tu acceso</h2>
                    <p>Usa el correo con el que creaste tu cuenta.</p>
                </div>

                <Campo id="correo" etiqueta="Correo electrónico" type="email" placeholder="nombre@ejemplo.mx"
                    ayuda="Te enviaremos el enlace a este correo." error={error}
                    value={correo} onChange={(e) => setCorreo(e.target.value)} required />

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Enviando…" : "Enviar enlace"}
                    <img src={iconoFlechaDer} alt="" />
                </button>

                <Link to="/iniciar-sesion" className="enlace enlace--suelto">
                    ← Volver a iniciar sesión
                </Link>

                <div className="asistida">
                    <p>
                        ¿No tienes acceso a ese correo? Servicios Digitales puede ayudarte con una recuperación
                        asistida en la biblioteca.
                    </p>
                    <Link to="/recuperar/asistida" className="enlace enlace--suelto">
                        Ver recuperación asistida
                    </Link>
                </div>
            </form>
        </AccesoLayout>
    );
}

export default SolicitarEnlace;

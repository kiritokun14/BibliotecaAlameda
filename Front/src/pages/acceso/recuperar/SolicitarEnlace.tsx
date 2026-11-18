import { mensajeError } from "../../../servicios/api";
import { useState, type SubmitEvent } from "react";
import { Link, useNavigate } from "react-router";
import AccesoLayout from "../../../components/acceso/AccesoLayout";
import iconoUsuarios from "../../../assets/login/icono-usuarios.svg";
import { Campo } from "../../../components/acceso/Campo";
import { enviarEnlaceRecuperacion } from "../../../servicios/auth";
import { esCorreoValido, MENSAJE_CORREO } from "../../../servicios/validaciones";

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
        try {
            await enviarEnlaceRecuperacion(correo);
            navigate("/recuperar/revisa-tu-correo", { state: { correo } });
        } catch (error) { setError(mensajeError(error)); }
        finally { setEnviando(false); }
    }

    return (
        <AccesoLayout
            titulo={<>¿Olvidaste tu <span>contraseña</span>?</>}
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
                </button>

                <Link to="/iniciar-sesion" className="enlace-volver">
                    Volver a iniciar sesión
                </Link>

                <div className="asistida">
                    <div className="asistida__cabecera">
                        <span className="asistida__icono" aria-hidden="true"><img src={iconoUsuarios} alt="" /></span>
                        <div>
                            <strong>¿No tienes acceso a ese correo?</strong>
                            <p>Te ayudamos en persona a recuperar tu cuenta.</p>
                        </div>
                    </div>
                    <ol className="asistida__pasos">
                        <li>Acude a la biblioteca con una identificación oficial.</li>
                        <li>Servicios Digitales verifica que eres tú.</li>
                        <li>Te ayudan a actualizar tu correo. Nunca te piden tu contraseña.</li>
                    </ol>
                    <Link to="/recuperar/asistida" className="boton-secundario asistida__boton">Ver recuperación asistida</Link>
                </div>
            </form>
        </AccesoLayout>
    );
}

export default SolicitarEnlace;

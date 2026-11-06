import Aviso from "../../components/Aviso";
import { mensajeError } from "../../servicios/api";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import { enviarEnlaceRecuperacion } from "../../servicios/auth";
import iconoCorreo from "../../assets/login/icono-correo.svg";
import iconoReenviar from "../../assets/login/icono-reenviar.svg";

// Paso 2: avisar que mandamos el enlace (y permitir reenviarlo)
function RevisaTuCorreo() {
    const location = useLocation();
    const correo: string = location.state?.correo ?? "tu correo";
    const [reenviado, setReenviado] = useState(false);
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    async function reenviar() {
        setEnviando(true);
        setError("");
        try { await enviarEnlaceRecuperacion(correo); setReenviado(true); }
        catch (error) { setError(mensajeError(error)); }
        finally { setEnviando(false); }
    }

    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>Revisa tu <span>correo</span></>}
            texto="Te enviamos un enlace para crear una nueva contraseña."
        >
            <div className="tarjeta">
                <div className="icono-circulo"><img src={iconoCorreo} alt="" /></div>

                {error && <Aviso tipo="error" titulo="No se pudo reenviar">{error}</Aviso>}
                <div className="tarjeta__encabezado">
                    {reenviado ? (
                        <>
                            <h2>Enlace reenviado</h2>
                            <p>
                                Enviamos otro enlace a {correo}. Si la cuenta existe, recibirás el mensaje. Puede tardar unos
                                minutos; revisa también la carpeta de spam.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2>Revisa tu correo</h2>
                            <p>
                                Si existe una cuenta con {correo}, recibirás un enlace para crear una nueva
                                contraseña. Puede tardar unos minutos; revisa también la carpeta de spam.
                            </p>
                        </>
                    )}
                </div>

                <button type="button" className="boton-secundario" onClick={reenviar} disabled={enviando || correo === "tu correo"}>
                    {enviando ? "Reenviando…" : "Reenviar enlace"}
                    <img src={iconoReenviar} alt="" />
                </button>

                <Link to="/iniciar-sesion" className="enlace enlace--suelto">
                    ← Volver a iniciar sesión
                </Link>

                <p className="tarjeta__ayuda">
                    Si no recibes el correo, pide apoyo al personal de la biblioteca. No podemos garantizar la
                    entrega del mensaje.
                </p>
            </div>
        </AccesoLayout>
    );
}

export default RevisaTuCorreo;

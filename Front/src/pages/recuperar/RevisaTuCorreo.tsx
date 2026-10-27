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
    const [enviando, setEnviando] = useState(false);

    async function reenviar() {
        setEnviando(true);
        await enviarEnlaceRecuperacion(correo);
        setEnviando(false);
        setReenviado(true);
    }

    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>Revisa tu <span>correo</span></>}
            texto="Te enviamos un enlace para crear una nueva contraseña."
        >
            <div className="tarjeta">
                {/* SIMULACIÓN: el sobre hace de "abrir el enlace del correo" (así viene en el diseño) */}
                <Link to="/recuperar/nueva-contrasena" className="icono-circulo" title="Abrir enlace del correo (simulación)">
                    <img src={iconoCorreo} alt="Abrir enlace del correo" />
                </Link>

                <div className="tarjeta__encabezado">
                    {reenviado ? (
                        <>
                            <h2>Enlace reenviado</h2>
                            <p>
                                Enviamos otro enlace a {correo}. El anterior deja de funcionar. Puede tardar unos
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

                <button type="button" className="boton-secundario" onClick={reenviar} disabled={enviando}>
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

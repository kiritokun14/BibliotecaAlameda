import { useState } from "react";
import { Link } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import { reenviarAutorizacionTutor } from "../servicios/auth";
import iconoUsuarios from "../assets/login/icono-usuarios.svg";
import iconoFlechaDerVerde from "../assets/login/icono-flecha-der-verde.svg";
import iconoCorreo from "../assets/login/icono-correo.svg";
import iconoReenviar from "../assets/login/icono-reenviar.svg";

// Vistas de Crear cuenta para menores de 18 años.
// Viven dentro de CrearCuenta (no son rutas aparte) para no perder lo que ya escribió.

// Paso 1: se detectó por la fecha de nacimiento que es menor
export function VistaMenor({
    onContinuar,
    onCambiarFecha,
}: {
    onContinuar: () => void;
    onCambiarFecha: () => void;
}) {
    return (
        <AccesoLayout
            etiqueta="MENOR DE 18 AÑOS"
            titulo="Necesitamos a tu madre, padre o tutor"
            texto="Si eres menor de 18 años, tu registro lo autoriza una persona adulta responsable."
        >
            <div className="tarjeta">
                <div className="icono-circulo">
                    <img src={iconoUsuarios} alt="" />
                </div>

                <div className="tarjeta__encabezado">
                    <h2>Eres menor de 18 años</h2>
                    <p>
                        Para crear tu cuenta necesitamos los datos de tu madre, padre o tutor. Le enviaremos un
                        correo para que autorice tu registro. El procedimiento exacto está por confirmar con la
                        biblioteca.
                    </p>
                </div>

                <button type="button" className="boton-secundario" onClick={onContinuar}>
                    Continuar con datos del tutor
                    <img src={iconoFlechaDerVerde} alt="" />
                </button>

                <div className="enlaces">
                    <button type="button" className="enlace enlace--boton" onClick={onCambiarFecha}>
                        Cambiar fecha de nacimiento
                    </button>
                    <Link to="/iniciar-sesion" className="enlace">
                        Ir a iniciar sesión
                    </Link>
                </div>
            </div>
        </AccesoLayout>
    );
}

// Paso 3: ya se envió el correo al tutor; falta que autorice
export function VistaSolicitudEnviada({ onCorregirTutor }: { onCorregirTutor: () => void }) {
    const [enviando, setEnviando] = useState(false);

    async function reenviar() {
        setEnviando(true);
        await reenviarAutorizacionTutor();
        setEnviando(false);
    }

    return (
        <AccesoLayout
            etiqueta="SOLICITUD ENVIADA"
            titulo="Falta la autorización de tu tutor"
            texto="Tu cuenta se activa cuando tu madre, padre o tutor autorice el registro desde su correo."
        >
            <div className="tarjeta">
                <div className="icono-circulo">
                    <img src={iconoCorreo} alt="" />
                </div>

                <div className="tarjeta__encabezado">
                    <h2>Solicitud enviada</h2>
                    <p>
                        Enviamos un correo a tu madre, padre o tutor con el enlace para autorizar tu registro. Aún
                        no puedes iniciar sesión. Puede tardar unos minutos; revisa también la carpeta de correo
                        no deseado.
                    </p>
                </div>

                <button type="button" className="boton-secundario" onClick={reenviar} disabled={enviando}>
                    {enviando ? "Reenviando…" : "Reenviar correo al tutor"}
                    <img src={iconoReenviar} alt="" />
                </button>

                <div className="enlaces">
                    <button type="button" className="enlace enlace--boton" onClick={onCorregirTutor}>
                        Corregir datos del tutor
                    </button>
                    <Link to="/iniciar-sesion" className="enlace">
                        Ir a iniciar sesión
                    </Link>
                </div>
            </div>
        </AccesoLayout>
    );
}

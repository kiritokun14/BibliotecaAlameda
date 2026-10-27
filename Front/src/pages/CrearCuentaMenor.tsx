import { Link } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import iconoUsuarios from "../assets/login/icono-usuarios.svg";
import iconoFlechaDerVerde from "../assets/login/icono-flecha-der-verde.svg";

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
            texto="Si eres menor de 18 años, necesitamos los datos de contacto de una persona adulta responsable."
        >
            <div className="tarjeta">
                <div className="icono-circulo">
                    <img src={iconoUsuarios} alt="" />
                </div>

                <div className="tarjeta__encabezado">
                    <h2>Eres menor de 18 años</h2>
                    <p>
                        Para crear tu cuenta necesitamos los datos de contacto y domicilio de tu madre, padre o tutor.
                        La confirmación se envía a tu propio correo. No se crea una cuenta ni acceso para el responsable.
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

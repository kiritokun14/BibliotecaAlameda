import { Link } from "react-router";
import AccesoLayout from "../../components/acceso/AccesoLayout";
import iconoUsuarios from "../../assets/login/icono-usuarios.svg";

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
            titulo="Necesitamos a tu madre, padre o tutor"
        >
            <div className="tarjeta">
                <div className="tarjeta__encabezado">
                    <span className="acceso__insignia" aria-hidden="true"><img src={iconoUsuarios} alt="" /></span>
                    <h2>Eres menor de 18 años</h2>
                    <p>Para crear tu cuenta necesitamos los datos de una persona adulta responsable de ti.</p>
                </div>

                <div className="menor-pedimos">
                    <strong>Te vamos a pedir de tu madre, padre o tutor</strong>
                    <ul>
                        <li>Nombre, apellidos y relación contigo</li>
                        <li>Teléfono y correo de contacto</li>
                        <li>Domicilio, si no vive contigo</li>
                    </ul>
                </div>

                <div className="menor-nota">
                    <p>La confirmación llega <b>a tu propio correo</b>.</p>
                    <p>Tu responsable <b>no recibe una cuenta</b> ni acceso a la tuya; solo es un contacto.</p>
                </div>

                <div className="menor-acciones">
                    <button type="button" className="boton-principal" onClick={onContinuar}>
                        Continuar con datos del tutor
                    </button>
                    <button type="button" className="boton-secundario" onClick={onCambiarFecha}>
                        Cambiar fecha de nacimiento
                    </button>
                    <p className="menor-acciones__ayuda">¿Te equivocaste de fecha? Puedes corregirla sin perder lo que escribiste.</p>
                </div>

                <div className="tarjeta__pie">
                    <p>
                        ¿Ya tienes cuenta?{" "}
                        <Link to="/iniciar-sesion" className="enlace">Iniciar sesión</Link>
                    </p>
                </div>
            </div>
        </AccesoLayout>
    );
}

import { useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import AccesoLayout from "../components/AccesoLayout";
import Aviso from "../components/Aviso";
import { Campo, CampoContrasena } from "../components/Campo";
import { iniciarSesion } from "../servicios/auth";
import { esCorreoValido, MENSAJE_CORREO } from "../servicios/validaciones";
import iconoFlechaDer from "../assets/login/icono-flecha-der.svg";
import iconoCargando from "../assets/login/icono-cargando.svg";
import { mensajeError } from "../servicios/api";

const beneficios = [
    "Solicitar tu credencial",
    "Inscribirte a actividades",
    "Solicitar espacios",
];

type Errores = { correo?: string; contrasena?: string };

function Login() {
    // Estado: lo que el usuario va escribiendo
    const [correo, setCorreo] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [recordarme, setRecordarme] = useState(false);

    // Estado: qué salió mal (si algo salió mal)
    const [errores, setErrores] = useState<Errores>({});
    const [errorServicio, setErrorServicio] = useState("");
    const [errorAcceso, setErrorAcceso] = useState(false);
    const [enviando, setEnviando] = useState(false);

    const navigate = useNavigate();
    // /iniciar-sesion?motivo=sesion-caducada muestra el aviso amarillo
    const [parametros] = useSearchParams();
    const sesionCaducada = parametros.get("motivo") === "sesion-caducada";

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault(); // evita que la página se recargue

        // 1. Revisar los datos antes de mandarlos
        const nuevosErrores: Errores = {};
        if (!esCorreoValido(correo)) nuevosErrores.correo = MENSAJE_CORREO;
        if (contrasena.length < 8) nuevosErrores.contrasena = "La contraseña necesita al menos 8 caracteres.";
        setErrores(nuevosErrores);
        setErrorAcceso(false);
        if (Object.keys(nuevosErrores).length > 0) return;

        // 2. Preguntar al servidor
        setEnviando(true);
        setErrorServicio("");
        try {
            const resultado = await iniciarSesion(correo, contrasena, recordarme);
            if (resultado === "credenciales-incorrectas") setErrorAcceso(true);
            if (resultado === "cuenta-deshabilitada") navigate("/cuenta-deshabilitada");
            if (resultado === "correo-pendiente") navigate("/confirma-tu-correo", { state: { correo } });
            if (resultado === "ok") navigate("/sesion-iniciada", { replace: true });
        } catch (error) { setErrorServicio(mensajeError(error)); }
        finally { setEnviando(false); }
    }

    const hayErroresDeCampos = Object.keys(errores).length > 0;

    return (
        <AccesoLayout
            titulo={<>Inicia <span>sesión</span></>}
            texto="Entra para consultar tu credencial, tus actividades y tus solicitudes."
            beneficios={beneficios}
        >
            <form className="tarjeta" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Iniciar sesión</h2>
                    <p>Usa el correo con el que te registraste.</p>
                </div>

                {errorServicio && <Aviso tipo="error" titulo="No pudimos conectar">{errorServicio}</Aviso>}
                {parametros.get("confirmado") === "si" && <Aviso tipo="exito" titulo="Correo confirmado">Ya puedes iniciar sesión con tu cuenta.</Aviso>}
                {hayErroresDeCampos && (
                    <Aviso tipo="error" titulo="No pudimos iniciar sesión">
                        Revisa los datos marcados e inténtalo de nuevo. Lo que escribiste se conserva.
                    </Aviso>
                )}
                {errorAcceso && (
                    <Aviso tipo="error" titulo="El correo o la contraseña no coinciden">
                        Revisa que estén bien escritos. Tus datos siguen aquí: puedes corregirlos o recuperar tu
                        contraseña.
                    </Aviso>
                )}
                {sesionCaducada && !hayErroresDeCampos && !errorAcceso && (
                    <Aviso tipo="advertencia" titulo="Tu sesión caducó">
                        Por seguridad cerramos la sesión tras un tiempo sin actividad. Inicia sesión para continuar
                        donde te quedaste.
                    </Aviso>
                )}

                <div className="campos">
                    <Campo
                        id="correo"
                        etiqueta="Correo electrónico"
                        type="email"
                        placeholder="nombre@ejemplo.mx"
                        ayuda="El correo con el que te registraste."
                        error={errores.correo}
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                    />
                    <CampoContrasena
                        id="contrasena"
                        etiqueta="Contraseña"
                        placeholder="Mínimo 8 caracteres"
                        error={errores.contrasena}
                        value={contrasena}
                        onChange={(e) => setContrasena(e.target.value)}
                    />
                </div>

                <div className="opciones">
                    <label className="casilla">
                        <input
                            type="checkbox"
                            checked={recordarme}
                            onChange={(e) => setRecordarme(e.target.checked)}
                        />
                        Recordarme en este equipo
                    </label>
                    <Link to="/recuperar" className="enlace">
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
                    <img src={enviando ? iconoCargando : iconoFlechaDer} className={enviando ? "girando" : undefined} alt="" />
                </button>
                {enviando && (
                    <p className="nota-enviando" role="status">
                        Estamos verificando tus datos. No cierres esta ventana.
                    </p>
                )}

                <div className="tarjeta__pie">
                    <p>
                        ¿Aún no tienes cuenta?{" "}
                        <Link to="/crear-cuenta" className="enlace">
                            Crear cuenta
                        </Link>
                    </p>
                    <p className="tarjeta__ayuda">
                        ¿Necesitas ayuda para entrar? Pide apoyo al personal en la biblioteca.
                    </p>
                </div>
            </form>
        </AccesoLayout>
    );
}

export default Login;

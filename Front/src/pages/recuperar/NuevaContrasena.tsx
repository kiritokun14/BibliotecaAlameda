import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import { CampoContrasena } from "../../components/Campo";
import { guardarNuevaContrasena } from "../../servicios/auth";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

type Errores = { contrasena?: string; confirmar?: string };

// Paso 3: el usuario abrió el enlace del correo y elige su nueva contraseña
function NuevaContrasena() {
    const [contrasena, setContrasena] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [errores, setErrores] = useState<Errores>({});
    const [enviando, setEnviando] = useState(false);
    const navigate = useNavigate();

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const nuevosErrores: Errores = {};
        if (contrasena.length < 8) nuevosErrores.contrasena = "Al menos 8 caracteres.";
        if (confirmar !== contrasena) nuevosErrores.confirmar = "Debe ser igual a la nueva contraseña.";
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        setEnviando(true);
        await guardarNuevaContrasena(contrasena);
        setEnviando(false);
        navigate("/recuperar/listo");
    }

    return (
        <AccesoLayout
            etiqueta="RECUPERAR ACCESO"
            titulo={<>Crea una <span>nueva</span> contraseña</>}
            texto="Elige una contraseña que no hayas usado antes."
        >
            <form className="tarjeta" onSubmit={enviar} noValidate>
                <div className="tarjeta__encabezado">
                    <h2>Nueva contraseña</h2>
                    <p>Elige una contraseña que no hayas usado antes.</p>
                </div>

                <div className="campos">
                    <CampoContrasena id="contrasena" etiqueta="Nueva contraseña" placeholder="Mínimo 8 caracteres"
                        ayuda="Al menos 8 caracteres." error={errores.contrasena}
                        value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
                    <CampoContrasena id="confirmar" etiqueta="Confirmar contraseña" placeholder="Repite tu contraseña"
                        ayuda="Debe ser igual a la nueva contraseña." error={errores.confirmar}
                        value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                </div>

                <button type="submit" className="boton-principal" disabled={enviando}>
                    {enviando ? "Guardando…" : "Guardar contraseña"}
                    <img src={iconoFlechaDer} alt="" />
                </button>
            </form>
        </AccesoLayout>
    );
}

export default NuevaContrasena;

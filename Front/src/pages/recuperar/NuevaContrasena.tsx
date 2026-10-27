import Aviso from "../../components/Aviso";
import { mensajeError, ErrorServicio } from "../../servicios/api";
import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import { CampoContrasena } from "../../components/Campo";
import { guardarNuevaContrasena, puedeRestablecerContrasena } from "../../servicios/auth";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";

type Errores = { contrasena?: string; confirmar?: string };

// Paso 3: el usuario abrió el enlace del correo y elige su nueva contraseña
function NuevaContrasena() {
    const [contrasena, setContrasena] = useState("");
    const [confirmar, setConfirmar] = useState("");
    const [errores, setErrores] = useState<Errores>({});
    const [enviando, setEnviando] = useState(false);
    const navigate = useNavigate();
    const [errorServicio, setErrorServicio] = useState("");
    const [valido, setValido] = useState(false);
    useEffect(() => {
        let activo = true;
        puedeRestablecerContrasena().then(ok => {
            if (!activo) return;
            if (ok) setValido(true); else navigate('/recuperar/enlace-vencido', { replace: true });
        }).catch(error => { if (activo) setErrorServicio(mensajeError(error)); });
        return () => { activo = false; };
    }, [navigate]);

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const nuevosErrores: Errores = {};
        if (contrasena.length < 8) nuevosErrores.contrasena = "Al menos 8 caracteres.";
        if (confirmar !== contrasena) nuevosErrores.confirmar = "Debe ser igual a la nueva contraseña.";
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) return;

        setEnviando(true);
        setErrorServicio("");
        try { await guardarNuevaContrasena(contrasena); navigate("/recuperar/listo", { replace: true }); }
        catch (error) {
            if (error instanceof ErrorServicio && error.estado === 401) navigate('/recuperar/enlace-vencido', { replace: true });
            else setErrorServicio(mensajeError(error));
        } finally { setEnviando(false); }
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

                {errorServicio && <Aviso tipo="error" titulo="No se pudo guardar">{errorServicio}</Aviso>}
                <div className="campos">
                    <CampoContrasena id="contrasena" etiqueta="Nueva contraseña" placeholder="Mínimo 8 caracteres"
                        ayuda="Al menos 8 caracteres." error={errores.contrasena}
                        value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
                    <CampoContrasena id="confirmar" etiqueta="Confirmar contraseña" placeholder="Repite tu contraseña"
                        ayuda="Debe ser igual a la nueva contraseña." error={errores.confirmar}
                        value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                </div>

                <button type="submit" className="boton-principal" disabled={enviando || !valido}>
                    {enviando ? "Guardando…" : "Guardar contraseña"}
                    <img src={iconoFlechaDer} alt="" />
                </button>
            </form>
        </AccesoLayout>
    );
}

export default NuevaContrasena;

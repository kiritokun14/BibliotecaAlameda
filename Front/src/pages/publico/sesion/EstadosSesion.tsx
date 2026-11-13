import { useNavigate } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import EstadoPagina from "../../../components/portal/EstadoPagina";
import Inicio from "../inicio/Inicio";
import { ModalAgenda } from "../eventos/DetalleActividad";
import "../eventos/Agenda.css";
import candado from "../../../assets/perfil/menu-candado.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// Estados del sistema que solo existen con sesión (Figma A-02, 585:51342).
// TODO backend: el portal debe mandar aquí cuando /administracion/mi-acceso responda cuenta suspendida
// o cuando Supabase avise que la sesión expiró (evento TOKEN_REFRESHED fallido o SIGNED_OUT sin que la persona saliera).

// «Cuenta suspendida» (585:52326) → /cuenta-suspendida
export function CuentaSuspendida() {
    return (
        <PaginaPublica>
            <EstadoPagina etiqueta="CUENTA SUSPENDIDA" titulo="Tu cuenta está suspendida"
                texto="Por ahora no puedes usar los servicios con sesión. Si crees que es un error, escríbenos y lo revisamos."
                principal={{ texto: "Escríbenos", ruta: "/contacto" }} secundario={{ texto: "Ir al inicio", ruta: "/" }} />
        </PaginaPublica>
    );
}

// «Sesión caducada» (585:53313): aviso sobre el Inicio → /sesion-caducada
export function SesionCaducada() {
    const navegar = useNavigate();
    return (
        <>
            <Inicio />
            <ModalAgenda titulo="Tu sesión caducó" icono={candado} alCerrar={() => navegar("/", { replace: true })}>
                <p className="modal-agenda__texto">Por seguridad cerramos la sesión después de un rato sin actividad. Inicia sesión de nuevo para continuar.</p>
                <div className="modal-agenda__acciones">
                    <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => navegar("/iniciar-sesion")}>
                        Iniciar sesión <img src={flechaBlanca} alt="" />
                    </button>
                </div>
            </ModalAgenda>
        </>
    );
}

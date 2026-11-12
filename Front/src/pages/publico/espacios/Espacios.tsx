import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import {
    AvisoCuenta,
    LlamadoVisitante,
    PasosVisitante,
    SeccionVisitante,
} from "../../../components/portal/Visitante";
import "./Espacios.css";
import { useSesion } from "../perfil/usarSesion";
import AgendaEspacios from "./AgendaEspacios";
import { separarAreas, type Area } from "./datos";
import iconoPin from "../../../assets/espacios/pin-verde.svg";
import iconoCandado from "../../../assets/comun/iconos/candado-dorado.svg";

// Agenda de espacios · vista de visitante SIN cuenta: áreas y cómo se solicita.
// Enviar o gestionar una solicitud se hace después, con sesión (HU-16: no se pide credencial).
function Espacios() {
    const sesion = useSesion();
    // Con sesión se muestra la agenda para solicitar (Figma A-02, 476:28196).
    if (sesion) return <AgendaEspacios />;
    const { solicitables, noSolicitables } = separarAreas();

    return (
        <PaginaPublica>
            {/* Encabezado centrado, igual que las demás páginas del menú */}
            <EncabezadoPublico
                etiqueta="Espacios"
                titulo={<>Agenda de <span>espacios</span></>}
                texto="Conoce las áreas de la biblioteca y cómo solicitar un espacio."
            />

            <SeccionVisitante fondo="crema">
                <AvisoCuenta
                    titulo="Inicia sesión o crea una cuenta para solicitar un espacio"
                    texto="Puedes consultar las áreas y el proceso sin cuenta. Para enviar o gestionar una solicitud solo necesitas iniciar sesión con tu cuenta."
                    sinCuenta={["Ver las áreas de la biblioteca", "Conocer cómo se solicita un espacio"]}
                    conCuenta={["Enviar una solicitud de espacio", "Gestionar o cancelar tu solicitud"]}
                />
            </SeccionVisitante>

            <SeccionVisitante fondo="verde" sobretitulo="EL PROCESO" titulo="Cómo se solicita un espacio">
                <PasosVisitante
                    pasos={[
                        { titulo: "Inicia sesión", texto: "Entra con tu cuenta; no necesitas credencial." },
                        { titulo: "Elige un área", texto: "Selecciona un área en el plano de la biblioteca." },
                        { titulo: "Fecha y horario", texto: "Indica fecha, horario y número de personas." },
                        { titulo: "Envía tu solicitud", texto: "La biblioteca la revisa y confirma; enviarla no reserva el espacio." },
                    ]}
                />
            </SeccionVisitante>

            <SeccionVisitante
                fondo="blanco"
                sobretitulo="ÁREAS"
                titulo="Áreas de la biblioteca"
                texto="Plano esquemático ilustrativo · áreas por confirmar con la biblioteca."
            >
                <GrupoAreas titulo="SE PUEDEN SOLICITAR" areas={solicitables} />
                <GrupoAreas titulo="NO SE SOLICITAN" areas={noSolicitables} />
            </SeccionVisitante>

            <LlamadoVisitante
                titulo="¿Necesitas un espacio?"
                texto="Inicia sesión o crea una cuenta para enviar tu solicitud. Enviarla no reserva el espacio: la biblioteca la revisa y confirma."
            />
        </PaginaPublica>
    );
}

function GrupoAreas({ titulo, areas }: { titulo: string; areas: Area[] }) {
    if (areas.length === 0) return null;
    const no = !areas[0].solicitable;
    return (
        <div className={no ? "areas-grupo areas-grupo--no" : "areas-grupo"}>
            <p className="areas-grupo__titulo">{titulo}</p>
            <ul className="areas-lista">
                {areas.map((area) => (
                    <li key={area.id} className={no ? "area-espacio area-espacio--no" : "area-espacio"}>
                        <span className="area-espacio__icono"><img src={no ? iconoCandado : iconoPin} alt="" /></span>
                        <span>
                            {area.nombre}
                            {area.nota && <small>{area.nota}</small>}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Espacios;

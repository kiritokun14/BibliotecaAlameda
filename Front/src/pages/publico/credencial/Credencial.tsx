import PaginaPublica from "../../../components/portal/PaginaPublica";
import {
    AvisoCuenta,
    EncabezadoVisitante,
    LlamadoVisitante,
    PasosVisitante,
    SeccionVisitante,
} from "../../../components/portal/Visitante";
import { useSesion } from "../perfil/usarSesion";
import { PasosTramite, TarjetaMiTramite } from "./piezas";
import "./Credencial.css";
import "./CredencialSesion.css";
import iconoCheck from "../../../assets/comun/iconos/check-verde.svg";
import iconoInfo from "../../../assets/comun/iconos/lecturas-info.svg";
import iconoCosto from "../../../assets/comun/iconos/accesos-credencial.svg";
import iconoReloj from "../../../assets/comun/iconos/cifras-reloj.svg";

// Credencial · información del trámite.
// Sin cuenta: aviso para iniciar sesión y llamado a crear cuenta.
// Con sesión (Figma A-02, 476:9984): pasos del trámite y tarjeta «Mi trámite» para solicitarla.
// TODO backend: costo y tiempos los confirma la biblioteca (por ahora son de ejemplo).
function Credencial() {
    const sesion = useSesion(); // undefined mientras se sabe si hay sesión
    return (
        <PaginaPublica>
            <EncabezadoVisitante
                regreso={{ texto: "Servicios y programas", ruta: "/servicios" }}
                etiqueta="CREDENCIAL"
                titulo={<><span>Credencial</span> de la biblioteca</>}
                texto="Conoce en qué consiste, qué necesitas y cómo funciona el trámite. Tú decides si lo inicias."
            />

            {sesion ? <>
                <PasosTramite actual={1} />
                <SeccionVisitante fondo="crema">
                    <TarjetaMiTramite />
                </SeccionVisitante>
            </> : sesion === null && (
                <SeccionVisitante fondo="crema">
                    <AvisoCuenta
                        titulo="Inicia sesión o crea una cuenta para solicitar tu credencial"
                        texto="Puedes conocer todo el trámite sin cuenta. Solicitarla, dar seguimiento a tu solicitud y renovarla se hace con una cuenta."
                        sinCuenta={[
                            "Conocer para qué sirve la credencial",
                            "Revisar cómo funciona el trámite",
                            "Ver qué necesitas antes de empezar",
                        ]}
                        conCuenta={["Solicitar tu credencial", "Ver el seguimiento de tu solicitud", "Renovar tu credencial"]}
                    />
                </SeccionVisitante>
            )}

            <SeccionVisitante fondo="verde" sobretitulo="QUÉ ES" titulo="¿Qué es y para qué sirve?">
                <div className="credencial-que-es">
                    <div className="credencial-que-es__texto">
                        <p>
                            Es tu credencial de persona usuaria de la biblioteca. Una vez validada por el personal y
                            mientras esté vigente, te permite solicitar espacios y llevar el seguimiento de tu
                            participación en actividades.
                        </p>
                        <p className="credencial-nota">
                            <img src={iconoInfo} alt="" />
                            Participar en actividades y consultar el portal no exige la credencial.
                        </p>
                    </div>
                    <ul className="credencial-usos">
                        <li><img src={iconoCheck} alt="" />Solicitar espacios de la biblioteca desde el portal.</li>
                        <li><img src={iconoCheck} alt="" />Registrar tu progreso de participación y, cuando existan, recompensas.</li>
                        <li><img src={iconoCheck} alt="" />Conservar tu cuenta e historial aunque la credencial venza.</li>
                    </ul>
                </div>
            </SeccionVisitante>

            <SeccionVisitante fondo="blanco" sobretitulo="EL TRÁMITE" titulo="¿Cómo funciona el trámite?">
                <PasosVisitante
                    pasos={[
                        { titulo: "Solicitas desde el portal", texto: "Confirmas tus datos y envías la solicitud.", quien: "Tú" },
                        { titulo: "La biblioteca revisa", texto: "El personal revisa tu solicitud y tus datos.", quien: "Biblioteca" },
                        { titulo: "Cotejo presencial", texto: "Acudes a la biblioteca para que verifiquen tu solicitud en persona.", quien: "Tú y la biblioteca" },
                        { titulo: "Credencial validada", texto: "El personal registra tu credencial y su vigencia de 2 años. Verás el resultado en el seguimiento.", quien: "Biblioteca" },
                    ]}
                />
            </SeccionVisitante>

            <SeccionVisitante fondo="crema" sobretitulo="ANTES DE EMPEZAR" titulo="Lo que necesitas y lo que debes saber">
                <div className="credencial-antes">
                    <div className="credencial-antes__tarjeta">
                        <p className="credencial-antes__titulo">NECESITAS</p>
                        <ul>
                            <li><img src={iconoCheck} alt="" />Tener una cuenta en el portal.</li>
                            <li><img src={iconoCheck} alt="" />Tu solicitud queda en tu cuenta y puedes seguir su avance desde el portal.</li>
                        </ul>
                    </div>
                    <div className="credencial-antes__tarjeta credencial-antes__tarjeta--dorada">
                        <p className="credencial-antes__titulo">DATOS DEL TRÁMITE</p>
                        <ul>
                            <li><img src={iconoCosto} alt="" />Costo del trámite: gratuito.</li>
                            <li><img src={iconoReloj} alt="" />Tiempo estimado de revisión: aproximadamente de 3 a 5 días hábiles (estimado).</li>
                        </ul>
                    </div>
                </div>
            </SeccionVisitante>

            {sesion === null && <LlamadoVisitante
                titulo="¿Quieres tramitar tu credencial?"
                texto="Inicia sesión o crea una cuenta para solicitarla. Podrás seguir su avance en la sección Seguimiento."
            />}
        </PaginaPublica>
    );
}

export default Credencial;

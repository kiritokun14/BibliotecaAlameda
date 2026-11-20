import { Link, Navigate, useLocation } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { PreguntasFrecuentes, TarjetaDatos, type DatoFila, type PreguntaFrecuente } from "../contacto/piezas";
import { TarjetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { nombreCompleto } from "../perfil/datos";
import { sesionSimulada, usePerfil, useSesion } from "../perfil/usarSesion";
import { EstadoCredencial, PasosTramite, RutaCredencial, SelectorEstados } from "./piezas";
import { datosTramite, estadosCredencial, etapasCredencial, pasoDelEstado, puedeSolicitar, useTramite, verEjemplo, type DatosEstado } from "./datos";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "./CredencialSesion.css";
import iconoCosto from "../../../assets/comun/iconos/accesos-credencial.svg";
import iconoReloj from "../../../assets/contacto/dato-reloj.svg";
import iconoPin from "../../../assets/contacto/dato-pin.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";

// Credencial · información y estado del trámite (plantilla C, como Contacto; Aldahir, 19 nov 2026).
// Franja compacta con ícono → fila de datos del trámite → dos columnas del mismo alto:
//   izquierda: el trámite por estados (sin cuenta, sin solicitud, en revisión, corrección, vigente o vencida) y los cuatro pasos;
//   derecha: preguntas frecuentes y una tarjeta verde (con sesión, tus solicitudes; sin sesión, contacto).
const datosFila: DatoFila[] = [
    { id: "costo", titulo: "Costo", valor: datosTramite.costo, icono: iconoCosto },
    { id: "revision", titulo: "Revisión", valor: datosTramite.revision, icono: iconoReloj },
    { id: "vigencia", titulo: "Vigencia", valor: datosTramite.vigencia, icono: iconosSeccion.eventos },
    { id: "cotejo", titulo: "Cotejo presencial", valor: datosTramite.cotejo, icono: iconoPin },
];

const preguntas: PreguntaFrecuente[] = [
    { pregunta: "¿Para qué sirve la credencial?", respuesta: "Te permite solicitar espacios de la biblioteca desde el portal y registrar tu progreso de participación.",
        enlace: { texto: "Ver la agenda de espacios", ruta: "/espacios" } },
    { pregunta: "¿La necesito para ir a las actividades?", respuesta: "No. Participar en actividades y consultar el portal no exige la credencial.",
        enlace: { texto: "Ver eventos y actividades", ruta: "/eventos" } },
    { pregunta: "¿Qué llevo al cotejo presencial?", respuesta: "Una identificación y tus datos de contacto al día en tu perfil. El cotejo se hace en Préstamos.",
        enlace: { texto: "Revisar mis datos", ruta: "/mi-perfil/datos" } },
    { pregunta: "¿Qué pasa cuando vence?", respuesta: "Dura 2 años. La renuevas en línea y tu cuenta y tu historial se conservan.",
        enlace: { texto: "Renovar mi credencial", ruta: "/credencial/solicitud?tipo=renovacion" } },
];

const sinCuenta: DatosEstado = {
    chip: "Sin sesión", color: "gris", titulo: "Inicia sesión para solicitarla",
    texto: "Puedes conocer todo el trámite sin cuenta. Para solicitar tu credencial y seguir su avance, entra con tu cuenta.",
    accion: { texto: "Iniciar sesión", ruta: "/iniciar-sesion" }, paso: 0,
};
const revisando: DatosEstado = {
    chip: "Revisando", color: "gris", titulo: "Revisando tu cuenta…", texto: "En un momento verás el estado de tu trámite.",
    accion: { texto: "", ruta: "" }, paso: 0,
};

function Credencial() {
    const sesion = useSesion(); // undefined mientras se sabe si hay sesión
    const carga = usePerfil(sesion);
    const tramite = useTramite();
    const titular = carga && "perfil" in carga ? nombreCompleto(carga.perfil) : "Tu nombre";
    const datos = sesion === null ? sinCuenta : sesion === undefined ? revisando : estadosCredencial[tramite.estado];
    const etapas = sesion ? etapasCredencial(datos.paso) : null;
    // Al cancelar desde el seguimiento se vuelve aquí con el aviso (solo si de verdad ya no hay solicitud)
    const cancelada = (useLocation().state as { cancelada?: boolean } | null)?.cancelada === true && tramite.estado === "sin-solicitud";

    // Con una solicitud en proceso (o la credencial vigente) el trámite ya va en el paso 3: entrar a Credencial lleva
    // directo al seguimiento, sin una pantalla intermedia con «Ver seguimiento» (Aldahir, 19 nov). Vencida se queda aquí:
    // empieza una renovación (paso 1).
    if (sesion && pasoDelEstado("informacion", tramite.estado) >= 3) return <Navigate to="/credencial/seguimiento" replace />;

    return (
        <PaginaPublica>
            <EncabezadoPublico
                icono={iconosSeccion.credencial}
                etiqueta="Credencial"
                titulo={<>Tu credencial de la <span>biblioteca</span></>}
                texto="Qué es, qué necesitas y cómo se tramita, con el estado de tu solicitud."
            />

            <section className="contacto-seccion contacto-seccion--crema cred-pagina">
                <div className="contacto-pila">
                    <PasosTramite actual={sesion ? pasoDelEstado("informacion", tramite.estado) : 1} pagina={1}
                        solicitar={!!sesion && puedeSolicitar(tramite.estado)} />
                    {sesionSimulada && <SelectorEstados actual={tramite.estado} alElegir={verEjemplo} />}
                    <TarjetaDatos datos={datosFila} titulo="Datos del trámite" />
                    <div className="contacto-columnas contacto-columnas--nuevo">
                        <div className="cred-principal">
                            <EstadoCredencial datos={datos} titular={titular} tramite={sesion ? tramite : undefined} nivel={2}>
                                {cancelada && (
                                    <p className="perfil-nota cred-aviso" role="status">
                                        <img src={notaInfo} alt="" />
                                        <span><strong>Cancelaste tu solicitud.</strong> Si la necesitas, puedes solicitarla de nuevo cuando quieras.</span>
                                    </p>
                                )}
                                <div className="perfil-acciones">
                                    {sesion === null ? <>
                                        <Link to="/iniciar-sesion" className="perfil-boton">Iniciar sesión</Link>
                                        <Link to="/crear-cuenta" className="perfil-boton perfil-boton--contorno">Crear cuenta</Link>
                                    </> : sesion && tramite.estado === "sin-solicitud" ? <>
                                        <Link to="/credencial/solicitud" className="perfil-boton">Solicitar credencial</Link>
                                        <Link to="/credencial/solicitud?tipo=renovacion" className="perfil-boton perfil-boton--contorno">Renovar credencial</Link>
                                    </> : sesion && (
                                        <Link to="/credencial/solicitud?tipo=renovacion" className="perfil-boton">Solicitar renovación</Link>
                                    )}
                                </div>
                            </EstadoCredencial>

                            <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo funciona el trámite"
                                texto={etapas ? undefined : "Cuatro pasos: tú lo solicitas en línea y lo terminas en la biblioteca."}>
                                <RutaCredencial etapas={etapas} />
                            </TarjetaPerfil>
                        </div>

                        <div className="contacto-lateral">
                            <PreguntasFrecuentes preguntas={preguntas} />
                            <section className="contacto-seguimiento" aria-labelledby="titulo-mis-solicitudes">
                                <span className="contacto-seguimiento__insignia" aria-hidden="true" />
                                <h2 id="titulo-mis-solicitudes">{sesion ? "Tus solicitudes" : "¿Tienes otra duda?"}</h2>
                                <p>{sesion
                                    ? "Consulta todas tus solicitudes de credencial y en qué va cada una."
                                    : "Escríbenos o llama al 311 212 8989, de lunes a viernes de 8:00 a 19:30 h."}</p>
                                <Link to={sesion ? "/mis-tramites/credencial" : "/contacto"} className="perfil-boton perfil-boton--guardar">
                                    {sesion ? "Ver mis solicitudes" : "Escríbenos"}
                                </Link>
                            </section>
                        </div>
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

export default Credencial;

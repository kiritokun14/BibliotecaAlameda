import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import type { PerfilPropio } from "../../../servicios/perfil";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { sesionSimulada, useSesion, usePerfil } from "../perfil/usarSesion";
import { consultarDomicilio, formatearFecha, nombreCompleto } from "../perfil/datos";
import { Dato, TarjetaPerfil } from "../perfil/piezas";
import { Campo } from "../perfil/secciones";
import { iconosSeccion } from "../perfil/iconos";
import { AyudaTramite, EstadoCredencial, PasosTramite, RutaCredencial, SelectorEstados } from "./piezas";
import {
    cancelarSolicitud, enviarCorreccion, enviarSolicitud, estadosCredencial, etapasCredencial, fechaCorta, horariosCotejo, pasoDelEstado,
    puedeCancelar, puedeSolicitar,
    useTramite, useTramiteListo, validarCorreccion, validarSolicitud, verEjemplo, type ErroresSolicitud, type TipoTramite, type TramiteCredencial,
} from "./datos";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "./CredencialSesion.css";
import iconoTelefono from "../../../assets/inicio/contacto-telefono.svg";
import checkLista from "../../../assets/credencial/lista-check.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaUsuario from "../../../assets/perfil/tarjeta-usuario.svg";
import tarjetaCandado from "../../../assets/perfil/tarjeta-candado.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";
import { EsqueletoDetalle } from "../../../components/portal/Esqueleto";
import PedirSesion from "../sesion/PedirSesion";

// Credencial con sesión (plantilla C, como la página de información; Aldahir, 19 nov 2026):
//   /credencial/solicitud   → formulario (tipo, datos de la cuenta en fichas, cotejo) | qué pasa al enviar + ayuda;
//   /credencial/seguimiento → el trámite por estados y sus cuatro pasos (o la corrección) | qué llevar al cotejo + ayuda.
// Al enviar, la solicitud lleva directo al seguimiento, ya «En revisión», con el aviso de su folio (19 nov; antes había
// una pantalla aparte de «Solicitud enviada»: /credencial/enviada ahora redirige al seguimiento). Mientras está en revisión
// o con corrección, la persona puede cancelarla.
type Vista = "solicitud" | "enviada" | "seguimiento";
const ic = { persona: iconosSeccion.datos, fecha: iconosSeccion.eventos, correo: iconosSeccion.mensajes, lugar: iconosSeccion.espacios, telefono: iconoTelefono };

export default function Tramite({ vista }: { vista: Vista }) {
    const usuario = useSesion();
    const carga = usePerfil(usuario);
    const tramite = useTramite();
    const listo = useTramiteListo();
    // Al llegar desde otra pantalla del trámite (tras enviar), la página entra sin esperas: no parpadea.
    const sigue = (useLocation().state as { enviada?: boolean } | null)?.enviada === true;

    if (usuario === null) {
        return (
            <PaginaPublica>
                <PedirSesion titulo="Inicia sesión para continuar con tu credencial" texto="Solicitarla, dar seguimiento a tu solicitud y renovarla se hace con tu cuenta." />
            </PaginaPublica>
        );
    }
    if (!carga || "error" in carga || (!listo && vista !== "solicitud")) {
        return (
            <PaginaPublica>
                <div className="cred-estado">
                    {carga && "error" in carga ? <>
                        <h1>No se pudieron cargar tus datos</h1>
                        <p role="alert">{carga.error}</p>
                        <Link className="perfil-boton" to={carga.ingresar ? "/iniciar-sesion" : "/credencial"}>
                            {carga.ingresar ? "Iniciar sesión" : "Volver a información"}
                        </Link>
                    </> : <EsqueletoDetalle texto="Cargando tu solicitud…" />}
                </div>
            </PaginaPublica>
        );
    }
    const perfil = carga.perfil;

    // Sin solicitud no hay nada que seguir: se vuelve a la información (solo la sesión de ejemplo muestra estados).
    if (vista !== "solicitud" && tramite.estado === "sin-solicitud" && !sesionSimulada) {
        return <Navigate to="/credencial" replace />;
    }

    if (vista === "enviada") return <Navigate to="/credencial/seguimiento" replace state={{ enviada: true }} />;
    // Con una solicitud en proceso o la credencial vigente no se abre otro formulario: se va a su seguimiento
    if (vista === "solicitud" && !puedeSolicitar(tramite.estado)) return <Navigate to="/credencial/seguimiento" replace />;

    const estado = tramite.estado === "sin-solicitud" && vista !== "solicitud" ? "en-revision" : tramite.estado;
    const encabezado = textosEncabezado(vista, estado);

    const contenido = vista === "solicitud"
        ? <Solicitud perfil={perfil} />
        : <Seguimiento tramite={{ ...tramite, estado }} titular={nombreCompleto(perfil)} />;

    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.credencial} etiqueta="Credencial" titulo={encabezado.titulo} texto={encabezado.texto} />
            <section className={`contacto-seccion contacto-seccion--crema cred-pagina cred-pagina--tramite${sigue ? " cred-pagina--sigue" : ""}`}>
                <div className="contacto-pila">
                    <PasosTramite actual={pasoDelEstado(vista === "solicitud" ? "solicitud" : "seguimiento", estado)}
                        pagina={vista === "solicitud" ? 2 : 3} solicitar={puedeSolicitar(tramite.estado)} />
                    {vista === "seguimiento" && sesionSimulada && <SelectorEstados actual={estado} alElegir={verEjemplo} />}
                    {contenido}
                </div>
            </section>
        </PaginaPublica>
    );
}

function textosEncabezado(vista: Vista, estado: TramiteCredencial["estado"]): { titulo: ReactNode; texto: string } {
    if (vista === "solicitud") return { titulo: <>Solicitar <span>credencial</span></>,
        texto: "Confirma tus datos y envía tu solicitud; el personal la revisará y podrás seguir su avance." };
    if (estado === "vigente" || estado === "vencida") return { titulo: <>Mi <span>credencial</span></>, texto: "Tu credencial y sus fechas." };
    return { titulo: <>Seguimiento de tu <span>credencial</span></>, texto: "En qué etapa va tu trámite; los cambios del personal se reflejan aquí." };
}

// Columna derecha de las tres vistas: una tarjeta propia de la vista y la tarjeta verde de ayuda que toma el alto restante
// compacta: en la solicitud (columna izquierda más baja), la ayuda va sin insignia ni texto para caber a 1366 × 768.
function Lateral({ children, compacta = false }: { children: ReactNode; compacta?: boolean }) {
    return (
        <div className="contacto-lateral">
            {children}
            <AyudaTramite compacta={compacta} />
        </div>
    );
}

// ---------- Solicitud ----------
function Solicitud({ perfil }: { perfil: PerfilPropio }) {
    const navegar = useNavigate();
    const [parametros] = useSearchParams();
    const [tipo, setTipo] = useState<TipoTramite>(parametros.get("tipo") === "renovacion" ? "renovacion" : "primera-vez");
    const [horario, setHorario] = useState("");
    const [comentarios, setComentarios] = useState("");
    const [aceptaCotejo, setAceptaCotejo] = useState(false);
    const [aceptaAviso, setAceptaAviso] = useState(false);
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const [enviando, setEnviando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState("");
    const bloqueo = useRef(false);
    const domicilio = sesionSimulada ? consultarDomicilio() : perfil.domicilio;
    const direccion = domicilio ? [
        [domicilio.calle, domicilio.numeroExterior, domicilio.numeroInterior && `Int. ${domicilio.numeroInterior}`].filter(Boolean).join(" "),
        domicilio.colonia,
        domicilio.codigoPostal && `C. P. ${domicilio.codigoPostal}`,
        domicilio.municipio,
        domicilio.estado,
    ].filter(Boolean).join(", ") : "";

    function enviar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const datos = { tipo, horario, comentarios: comentarios.trim(), aceptaCotejo, aceptaAviso };
        const encontrados = validarSolicitud(datos);
        setErrores(encontrados);
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`cred-${primero}`)?.focus(); return; }
        bloqueo.current = true; setEnviando(true); setErrorEnvio("");
        // Se registra en el servidor; si falla, lo escrito se conserva para reintentar
        enviarSolicitud(datos)
            .then(() => navegar("/credencial/seguimiento", { state: { enviada: true } }))
            .catch((error) => { setErrorEnvio(mensajeError(error)); bloqueo.current = false; setEnviando(false); });
    }

    const opciones: { valor: TipoTramite; titulo: string; texto: string }[] = [
        { valor: "primera-vez", titulo: "Obtener por primera vez", texto: "No tengo una credencial de la biblioteca." },
        { valor: "renovacion", titulo: "Renovar", texto: "Mi credencial venció o está por vencer." },
    ];

    return (
        <div className="contacto-columnas contacto-columnas--nuevo">
            <form className="formulario-contacto cred-formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-solicitud" aria-busy={enviando}>
                <h2 id="titulo-solicitud" className="formulario-contacto__titulo">Tu solicitud</h2>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-grupo__titulo">Tipo de trámite</legend>
                    <div className="perfil-opciones cred-opciones-tipo">
                        {opciones.map((o) => (
                            <label key={o.valor} className={`perfil-opcion${tipo === o.valor ? " perfil-opcion--activa" : ""}`}>
                                <input type="radio" name="tipo" value={o.valor} checked={tipo === o.valor} onChange={() => setTipo(o.valor)} />
                                <strong>{o.titulo}</strong>
                                <span>{o.texto}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <section className="cred-grupo" aria-labelledby="titulo-tus-datos">
                    <h3 id="titulo-tus-datos" className="cred-grupo__titulo">Tus datos</h3>
                    <dl className="perfil-datos">
                        <Dato etiqueta="Nombre completo" valor={nombreCompleto(perfil)} icono={ic.persona} ancho={2} />
                        <Dato etiqueta="Fecha de nacimiento" valor={formatearFecha(perfil.fechaNacimiento)} icono={ic.fecha} />
                        <Dato etiqueta="Teléfono" valor={perfil.telefono} icono={ic.telefono} />
                        <Dato etiqueta="Correo electrónico" valor={perfil.correo} icono={ic.correo} ancho={2} />
                        <Dato etiqueta="Domicilio" icono={ic.lugar} ancho={2} valor={direccion || "Domicilio no disponible"} />
                    </dl>
                    <div className="perfil-nota">
                        <img src={notaInfo} alt="" />
                        <p>Estos datos vienen de tu cuenta. Puedes actualizar tu nombre y teléfono en <Link to="/mi-perfil/datos/editar">Mis datos</Link>. Si tu domicilio es incorrecto, consulta al personal de la biblioteca.</p>
                    </div>
                </section>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-grupo__titulo">Cotejo presencial</legend>
                    <div className="perfil-fila">
                        <div className="perfil-campo">
                            <label htmlFor="cred-horario">Horario para acudir a Préstamos<span>(opcional)</span></label>
                            <select id="cred-horario" value={horario} onChange={(e) => setHorario(e.target.value)}>
                                <option value="">Selecciona una opción</option>
                                {horariosCotejo.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <Campo id="cred-comentarios" etiqueta="Comentarios para el personal" obligatorio={false} valor={comentarios}
                            alCambiar={setComentarios} maximo={500} marcador="Si necesitas apoyo o tienes una duda" error={errores.comentarios} />
                    </div>
                    <label className="cred-casilla">
                        <input id="cred-aceptaCotejo" type="checkbox" checked={aceptaCotejo} onChange={(e) => setAceptaCotejo(e.target.checked)}
                            aria-invalid={errores.aceptaCotejo && !aceptaCotejo ? true : undefined}
                            aria-describedby={errores.aceptaCotejo && !aceptaCotejo ? "cred-aceptaCotejo-error" : undefined} />
                        Entiendo que debo acudir a Préstamos para el cotejo presencial; enviar la solicitud no valida mi credencial.
                    </label>
                    {errores.aceptaCotejo && !aceptaCotejo && <p id="cred-aceptaCotejo-error" className="cred-error-campo">{errores.aceptaCotejo}</p>}
                    <label className="cred-casilla">
                        <input id="cred-aceptaAviso" type="checkbox" checked={aceptaAviso} onChange={(e) => setAceptaAviso(e.target.checked)}
                            aria-invalid={errores.aceptaAviso && !aceptaAviso ? true : undefined}
                            aria-describedby={errores.aceptaAviso && !aceptaAviso ? "cred-aceptaAviso-error" : undefined} />
                        Acepto el aviso de privacidad.
                    </label>
                    {errores.aceptaAviso && !aceptaAviso && <p id="cred-aceptaAviso-error" className="cred-error-campo">{errores.aceptaAviso}</p>}
                </fieldset>

                {errorEnvio && <p className="cred-error-campo" role="alert">No pudimos enviar tu solicitud: {errorEnvio}</p>}
                <div className="perfil-acciones">
                    <button type="submit" className="perfil-boton" disabled={enviando}>{enviando ? "Enviando…" : "Enviar solicitud"}</button>
                    <Link to="/credencial" className="perfil-boton perfil-boton--contorno">Volver a información</Link>
                </div>
                <p className="solo-lectores" role="status">{enviando ? "Enviando, espera un momento." : ""}</p>
            </form>

            <Lateral compacta>
                <TarjetaPerfil color="verde" icono={tarjetaLista} titulo="Qué pasa al enviar">
                    <ol className="cred-mini-pasos">
                        <li><span>1</span><div><strong>Se registra tu solicitud</strong>Recibes un folio para identificarla.</div></li>
                        <li><span>2</span><div><strong>El personal la revisa</strong>Un responsable de Préstamos la ve en su panel.</div></li>
                        <li><span>3</span><div><strong>Sigues su avance</strong>El estado cambia en el seguimiento.</div></li>
                    </ol>
                    <div className="perfil-nota perfil-nota--dorada">
                        <img src={notaInfoDorada} alt="" />
                        <p>Si eres menor de 18 años, el personal también usará los datos de tu madre, padre o tutor.</p>
                    </div>
                </TarjetaPerfil>
            </Lateral>
        </div>
    );
}

// ---------- Seguimiento (en revisión, corrección, vigente o vencida) ----------
function folioCorto(folio: string | null) {
    return folio ? folio.slice(0, 8).toUpperCase() : "Por asignar";
}

function Seguimiento({ tramite, titular }: { tramite: TramiteCredencial; titular: string }) {
    const datos = estadosCredencial[tramite.estado];
    const emitida = tramite.estado === "vigente" || tramite.estado === "vencida";
    const recienEnviada = (useLocation().state as { enviada?: boolean } | null)?.enviada === true && tramite.estado === "en-revision";
    return (
        <div className="contacto-columnas contacto-columnas--nuevo">
            <div className="cred-principal">
                <EstadoCredencial datos={datos} titular={titular} tramite={tramite} nivel={2}>
                    {!emitida && (
                        <dl className="perfil-datos perfil-datos--tres">
                            <Dato etiqueta="Folio" valor={folioCorto(tramite.folio)} />
                            <Dato etiqueta="Trámite" valor={tramite.tipo === "renovacion" ? "Renovación" : "Primera vez"} />
                            <Dato etiqueta="Enviada" valor={tramite.solicitadaEl ? fechaCorta(tramite.solicitadaEl) : "Por confirmar"} />
                        </dl>
                    )}
                    {recienEnviada && (
                        <p className="perfil-nota cred-aviso" role="status">
                            <img src={notaInfo} alt="" />
                            <span><strong>Tu solicitud quedó registrada.</strong> Ya está en proceso; aquí verás cada cambio.</span>
                        </p>
                    )}
                    {tramite.estado === "vencida" && (
                        <div className="perfil-acciones">
                            <Link to="/credencial/solicitud?tipo=renovacion" className="perfil-boton">Solicitar renovación</Link>
                        </div>
                    )}
                    {puedeCancelar(tramite.estado) && <CancelarSolicitud folio={folioCorto(tramite.folio)} />}
                </EstadoCredencial>
                {tramite.estado === "correccion" ? <Correccion /> : (
                    <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo avanza tu trámite"
                        texto={emitida ? "Terminaste los cuatro pasos." : "Te avisaremos en tus notificaciones cuando debas acudir al cotejo."}>
                        <RutaCredencial etapas={etapasCredencial(datos.paso)} />
                    </TarjetaPerfil>
                )}
            </div>

            <Lateral>
                <TarjetaPerfil color="dorada" icono={tarjetaUsuario} titulo={emitida ? "Con tu credencial puedes" : "Para el cotejo lleva"}>
                    <ul className="cred-lista">
                        {(emitida
                            ? ["Solicitar espacios de la biblioteca desde el portal.", "Registrar tu progreso de participación.", "Conservar tu cuenta e historial aunque venza."]
                            : ["Una identificación oficial.", "Tus datos de contacto al día en tu perfil."]
                        ).map((t) => <li key={t}><img src={checkLista} alt="" />{t}</li>)}
                    </ul>
                </TarjetaPerfil>
            </Lateral>
        </div>
    );
}

// ---------- Cancelar la solicitud ----------
// Primero un botón guinda; al pulsarlo, la confirmación en una nota rosa (se puede arrepentir). Al cancelar, vuelve a
// la información con el aviso de que se canceló. Si el servidor aún no permite cancelar, se explica cómo hacerlo con el personal.
function CancelarSolicitud({ folio }: { folio: string }) {
    const navegar = useNavigate();
    const [confirmando, setConfirmando] = useState(false);
    const [cerrando, setCerrando] = useState(false); // «No, conservarla»: la nota se recoge (0.3 s) antes de volver al botón
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState("");
    function cancelar() {
        setCancelando(true); setError("");
        cancelarSolicitud()
            .then(() => navegar("/credencial", { state: { cancelada: true } }))
            .catch((e) => {
                setCancelando(false);
                const codigo = e instanceof ErrorServicio ? e.estado : 0;
                setError(codigo === 405 || codigo === 422 // la base aún no tiene la operación (falta cancelacion_credencial_propia.sql)
                    ? "Por ahora no se puede cancelar en línea. Llama al 311 212 8989 o pide al personal de Préstamos que la cancele."
                    : codigo === 409 ? "Tu solicitud ya cambió de estado y no se puede cancelar. Recarga la página para ver cómo va."
                    : mensajeError(e));
            });
    }
    if (!confirmando) {
        return (
            <div key="boton" className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={() => setConfirmando(true)}>
                    Cancelar solicitud
                </button>
            </div>
        );
    }
    return (
        <div key="confirmacion" className={`perfil-nota perfil-nota--guinda cred-cancelar${cerrando ? " cred-cancelar--cerrando" : ""}`} role="group" aria-labelledby="titulo-cancelar">
            <p><strong id="titulo-cancelar">{folio === "Por asignar" ? "¿Cancelar tu solicitud?" : `¿Cancelar tu solicitud ${folio}?`}</strong>
                El personal ya no la revisará. Si después la necesitas, puedes solicitarla de nuevo.</p>
            {error && <p className="cred-error-campo" role="alert">{error}</p>}
            <div className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={cancelar} disabled={cancelando}>
                    {cancelando ? "Cancelando…" : "Sí, cancelar"}
                </button>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno"
                    onClick={() => { setCerrando(true); window.setTimeout(() => { setConfirmando(false); setCerrando(false); setError(""); }, 300); }}
                    disabled={cancelando}>No, conservarla</button>
            </div>
        </div>
    );
}

// ---------- Corrección solicitada ----------
// TODO backend: POST /credenciales/solicitudes/{folio}/correccion (ver datos.ts); por ahora solo regresa el trámite a revisión.
function Correccion() {
    const [nombre, setNombre] = useState("");
    const [numero, setNumero] = useState("");
    const [errores, setErrores] = useState<{ nombre?: string; numero?: string }>({});
    function enviar(e: FormEvent) {
        e.preventDefault();
        const encontrados = validarCorreccion({ nombre, numero });
        setErrores(encontrados);
        if (encontrados.nombre || encontrados.numero) {
            document.getElementById(encontrados.nombre ? "cor-nombre" : "cor-numero")?.focus();
            return;
        }
        enviarCorreccion(); // el trámite vuelve a «En revisión»
    }
    return (
        <form className="perfil-tarjeta perfil-tarjeta--rosa cred-correccion" onSubmit={enviar} noValidate aria-labelledby="titulo-correccion">
            <div className="perfil-tarjeta__cabecera">
                <span className="perfil-tarjeta__icono"><img src={tarjetaCandado} alt="" /></span>
                <div>
                    <h3 id="titulo-correccion">Corregir solicitud</h3>
                    <p>Escribe tus datos como aparecen en tu identificación. Tu solicitud no se pierde.</p>
                </div>
            </div>
            <div className="perfil-fila">
                <Campo id="cor-nombre" etiqueta="Nombre como aparece en tu identificación" valor={nombre} alCambiar={setNombre}
                    marcador="Ana López García" maximo={200} error={errores.nombre} icono={ic.persona} />
                <Campo id="cor-numero" etiqueta="Número de identificación" valor={numero} alCambiar={setNumero}
                    marcador="INE ****1234" maximo={40} error={errores.numero} icono={iconosSeccion.credencial} />
            </div>
            <div className="perfil-acciones">
                <button type="submit" className="perfil-boton">Enviar corrección</button>
            </div>
        </form>
    );
}

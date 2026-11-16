import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoVisitante, SeccionVisitante } from "../../../components/portal/Visitante";
import type { PerfilPropio } from "../../../servicios/perfil";
import { useSesion, usePerfil } from "../perfil/usarSesion";
import { consultarDomicilio, formatearFecha, nombreCompleto } from "../perfil/datos";
import { Chip, DatoCred, EtapasTramite, Nota, PasosTramite, SelectorEstados, TarjetaCredencial } from "./piezas";
import {
    enviarCorreccion, useTramite, etapasEnRevision, enviarSolicitud, fechaLarga, horariosCotejo, pasoDelEstado, textoTipo,
    validarCorreccion, validarSolicitud, verEjemplo, type ErroresSolicitud, type TipoTramite, type TramiteCredencial,
} from "./datos";
import "./Credencial.css";
import "./CredencialSesion.css";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import flechaVerde from "../../../assets/inicio/lecturas-flecha-verde.svg";
import radioMarcado from "../../../assets/credencial/radio.svg";
import infoVerde from "../../../assets/credencial/info-verde.svg";
import infoSeguimiento from "../../../assets/credencial/seg-info.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import usuarioDorado from "../../../assets/credencial/usuario-dorado.svg";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";
import checkLista from "../../../assets/credencial/lista-check.svg";
import alertaGuinda from "../../../assets/credencial/alerta-guinda.svg";
import alertaDorada from "../../../assets/credencial/alerta-dorada.svg";

// Credencial con sesión iniciada (Figma A-02, 476:9983): solicitud, solicitud enviada y seguimiento.
type Vista = "solicitud" | "enviada" | "seguimiento";

export default function Tramite({ vista }: { vista: Vista }) {
    const usuario = useSesion();
    const carga = usePerfil(usuario);
    const tramite = useTramite();

    if (usuario === null) {
        return (
            <PaginaPublica>
                <div className="cred-estado">
                    <h1>Inicia sesión para continuar con tu credencial</h1>
                    <p>Solicitarla, dar seguimiento a tu solicitud y renovarla se hace con tu cuenta.</p>
                    <Link className="boton-visitante" to="/iniciar-sesion">Iniciar sesión <img src={flechaBlanca} alt="" /></Link>
                </div>
            </PaginaPublica>
        );
    }
    if (!carga || "error" in carga) {
        return (
            <PaginaPublica>
                <div className="cred-estado">
                    {carga ? <>
                        <h1>No se pudieron cargar tus datos</h1>
                        <p role="alert">{carga.error}</p>
                        <Link className="boton-visitante" to={carga.ingresar ? "/iniciar-sesion" : "/credencial"}>
                            {carga.ingresar ? "Iniciar sesión" : "Volver a información"}
                        </Link>
                    </> : <p role="status">Cargando…</p>}
                </div>
            </PaginaPublica>
        );
    }
    const perfil = carga.perfil;

    // Sin solicitud no hay nada que seguir: se vuelve a la información.
    if (vista !== "solicitud" && tramite.estado === "sin-solicitud") {
        if (!import.meta.env.DEV) return <Navigate to="/credencial" replace />;
    }

    const elegirEjemplo = (e: TramiteCredencial["estado"]) => verEjemplo(e);
    const estado = tramite.estado === "sin-solicitud" && vista !== "solicitud" ? "en-revision" : tramite.estado;
    const encabezado = textosEncabezado(vista, estado);

    let contenido: ReactNode;
    if (vista === "solicitud") contenido = <Solicitud perfil={perfil} />;
    else if (vista === "enviada") contenido = <Enviada tramite={tramite} />;
    else if (estado === "correccion") contenido = <Correccion tramite={tramite} />;
    else if (estado === "vigente" || estado === "vencida") contenido = <MiCredencial tramite={{ ...tramite, estado }} titular={nombreCompleto(perfil)} />;
    else contenido = <Seguimiento tramite={tramite} titular={nombreCompleto(perfil)} />;

    return (
        <PaginaPublica>
            <EncabezadoVisitante regreso={{ texto: "Volver a información", ruta: "/credencial" }} etiqueta="CREDENCIAL"
                titulo={encabezado.titulo} texto={encabezado.texto} />
            <PasosTramite actual={pasoDelEstado(vista === "solicitud" ? "solicitud" : "seguimiento", estado)} />
            {vista === "seguimiento" && <SelectorEstados actual={estado} alElegir={elegirEjemplo} />}
            <SeccionVisitante fondo="crema">{contenido}</SeccionVisitante>
        </PaginaPublica>
    );
}

function textosEncabezado(vista: Vista, estado: TramiteCredencial["estado"]): { titulo: ReactNode; texto: string } {
    if (vista === "solicitud") return { titulo: <>Solicitar <span>credencial</span></>,
        texto: "Confirma tus datos y envía tu solicitud. El personal de la biblioteca la recibirá y podrás seguir su avance." };
    if (vista === "enviada") return { titulo: <>Solicitud <span>enviada</span></>,
        texto: "Registramos tu solicitud de credencial. El personal de la biblioteca la revisará y podrás seguir su avance." };
    if (estado === "correccion") return { titulo: <>Mi <span>credencial</span></>, texto: "Estado de tu solicitud de credencial." };
    if (estado === "vigente") return { titulo: <>Mi <span>credencial</span></>, texto: "Tu credencial está validada y vigente." };
    if (estado === "vencida") return { titulo: <>Mi <span>credencial</span></>, texto: "Tu credencial dura 2 años." };
    return { titulo: <>Seguimiento de tu <span>credencial</span></>,
        texto: "Consulta en qué etapa va tu trámite. El personal revisa tu solicitud y actualiza su estado; los cambios se reflejan aquí." };
}

// ---------- Solicitud ----------
function CampoLectura({ id, etiqueta, valor }: { id: string; etiqueta: string; valor: string }) {
    return (
        <div className="cred-campo">
            <label htmlFor={id}>{etiqueta}<span>(obligatorio)</span></label>
            <input id={id} value={valor} readOnly />
        </div>
    );
}

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
    const bloqueo = useRef(false);
    const domicilio = consultarDomicilio(); // TODO backend: ver perfil/datos.ts

    function enviar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const datos = { tipo, horario, comentarios: comentarios.trim(), aceptaCotejo, aceptaAviso };
        const encontrados = validarSolicitud(datos);
        setErrores(encontrados);
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`cred-${primero}`)?.focus(); return; }
        bloqueo.current = true; setEnviando(true);
        enviarSolicitud(datos); // el estado compartido avisa a las demás pantallas
        navegar("/credencial/enviada");
    }

    const opciones: { valor: TipoTramite; titulo: string; texto: string }[] = [
        { valor: "primera-vez", titulo: "Obtener por primera vez", texto: "No tengo una credencial de la biblioteca." },
        { valor: "renovacion", titulo: "Renovar", texto: "Mi credencial venció o está por vencer." },
    ];

    return (
        <div className="cred-columnas">
            <form className="cred-tarjeta cred-formulario" onSubmit={enviar} noValidate>
                <fieldset className="cred-grupo">
                    <legend className="cred-subtitulo"><span>1</span>Tipo de trámite</legend>
                    <div className="cred-opciones">
                        {opciones.map((o) => (
                            <label key={o.valor} className={`cred-opcion${tipo === o.valor ? " cred-opcion--elegida" : ""}`}>
                                <input type="radio" name="tipo" value={o.valor} checked={tipo === o.valor} onChange={() => setTipo(o.valor)} />
                                <span className="cred-opcion__radio" aria-hidden="true">{tipo === o.valor && <img src={radioMarcado} alt="" />}</span>
                                <span className="cred-opcion__textos"><strong>{o.titulo}</strong>{o.texto}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="cred-grupo">
                    <legend className="cred-subtitulo"><span>2</span>Confirma tus datos</legend>
                    <Nota color="verde" icono={infoVerde}>
                        Estos datos vienen de tu cuenta. Si algo está mal, corrígelo en tu <Link to="/mi-perfil/datos/editar">perfil</Link> antes de enviar.
                    </Nota>
                    <div className="cred-fila">
                        <CampoLectura id="cred-nombres" etiqueta="Nombre(s)" valor={perfil.nombres} />
                        <CampoLectura id="cred-apellidos" etiqueta="Apellidos" valor={[perfil.primerApellido, perfil.segundoApellido].filter(Boolean).join(" ")} />
                    </div>
                    <div className="cred-fila">
                        <CampoLectura id="cred-fecha" etiqueta="Fecha de nacimiento" valor={formatearFecha(perfil.fechaNacimiento)} />
                        <CampoLectura id="cred-telefono" etiqueta="Teléfono" valor={perfil.telefono} />
                    </div>
                    <CampoLectura id="cred-correo" etiqueta="Correo electrónico" valor={perfil.correo} />
                    <div className="cred-fila">
                        <CampoLectura id="cred-calle" etiqueta="Calle" valor={[domicilio.calle, domicilio.numeroExterior].filter(Boolean).join(" ")} />
                        <CampoLectura id="cred-colonia" etiqueta="Colonia o localidad" valor={domicilio.colonia} />
                    </div>
                    <div className="cred-fila cred-fila--corta">
                        <CampoLectura id="cred-cp" etiqueta="Código postal" valor={domicilio.codigoPostal} />
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={enviando}>
                    <legend className="cred-subtitulo"><span>3</span>Cotejo presencial</legend>
                    <div className="cred-campo">
                        <label htmlFor="cred-horario">Horario preferido para acudir a Préstamos (opcional)</label>
                        <select id="cred-horario" value={horario} onChange={(e) => setHorario(e.target.value)}>
                            <option value="">Selecciona una opción</option>
                            {horariosCotejo.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                    <div className="cred-campo">
                        <label htmlFor="cred-comentarios">Comentarios para el personal (opcional)</label>
                        <input id="cred-comentarios" value={comentarios} maxLength={500} placeholder="Escribe si necesitas apoyo o tienes alguna duda"
                            onChange={(e) => setComentarios(e.target.value)} aria-invalid={errores.comentarios ? true : undefined} />
                        {errores.comentarios && <p className="cred-error-campo">{errores.comentarios}</p>}
                    </div>
                    <label className="cred-casilla">
                        <input id="cred-aceptaCotejo" type="checkbox" checked={aceptaCotejo} onChange={(e) => setAceptaCotejo(e.target.checked)}
                            aria-invalid={errores.aceptaCotejo && !aceptaCotejo ? true : undefined} />
                        Entiendo que debo acudir a Préstamos para el cotejo presencial; enviar la solicitud no valida mi credencial.
                    </label>
                    {errores.aceptaCotejo && !aceptaCotejo && <p className="cred-error-campo">{errores.aceptaCotejo}</p>}
                    <label className="cred-casilla">
                        <input id="cred-aceptaAviso" type="checkbox" checked={aceptaAviso} onChange={(e) => setAceptaAviso(e.target.checked)}
                            aria-invalid={errores.aceptaAviso && !aceptaAviso ? true : undefined} />
                        Acepto el aviso de privacidad (texto por confirmar).
                    </label>
                    {errores.aceptaAviso && !aceptaAviso && <p className="cred-error-campo">{errores.aceptaAviso}</p>}
                </fieldset>

                <div className="cred-acciones">
                    <button type="submit" className="boton-visitante" disabled={enviando}>
                        {enviando ? "Enviando…" : "Enviar solicitud"} <img src={flechaBlanca} alt="" />
                    </button>
                    <Link to="/credencial" className="boton-visitante cred-boton-contorno">Volver a información</Link>
                </div>
            </form>

            <aside className="cred-lateral">
                <div className="cred-tarjeta cred-tarjeta--verde">
                    <p className="cred-sobretitulo cred-sobretitulo--verde">QUÉ PASA AL ENVIAR</p>
                    <ol className="cred-mini-pasos">
                        <li><span>1</span><div><strong>Se registra tu solicitud</strong>Recibirás un folio para identificarla.</div></li>
                        <li><span>2</span><div><strong>El personal la ve en su panel</strong>Un responsable de Préstamos la revisa.</div></li>
                        <li><span>3</span><div><strong>Tú sigues el avance</strong>El estado cambia en la sección Seguimiento.</div></li>
                    </ol>
                    <Nota color="dorada" icono={usuarioDorado}>
                        Si eres menor de 18 años, el personal también usará los datos de tu madre, padre o tutor registrados en tu cuenta.
                    </Nota>
                </div>
                <div className="cred-tarjeta cred-ayuda">
                    <h3>¿Necesitas ayuda?</h3>
                    <p>Pide apoyo al personal de Servicios Digitales en la biblioteca. Teléfono y horario por confirmar.</p>
                </div>
            </aside>
        </div>
    );
}

// ---------- Solicitud enviada ----------
function Enviada({ tramite }: { tramite: TramiteCredencial }) {
    return (
        <div className="cred-tarjeta cred-confirmacion">
            <div className="cred-tramite__encabezado">
                <span className="cred-tramite__icono cred-tramite__icono--verde"><img src={checkEnviada} alt="" /></span>
                <div className="cred-tramite__textos">
                    <Chip color="verde">Solicitud enviada</Chip>
                    <h2>Tu solicitud quedó registrada</h2>
                    <p>El personal de Préstamos la verá en su panel. Cuando termine la revisión, te pediremos acudir a la biblioteca.</p>
                </div>
            </div>
            <dl className="cred-datos cred-datos--fila">
                <DatoCred etiqueta="FOLIO" valor={tramite.folio ?? "Por asignar"} />
                <DatoCred etiqueta="TIPO DE TRÁMITE" valor={textoTipo[tramite.tipo]} />
                <DatoCred etiqueta="ESTADO" valor="En revisión (ejemplo)" />
            </dl>
            <Nota color="dorada" icono={infoDorado}>Acude a Préstamos para el cotejo presencial. Enviar la solicitud no valida tu credencial.</Nota>
            <div className="cred-acciones">
                <Link to="/credencial/seguimiento" className="boton-visitante">Ver seguimiento <img src={flechaBlanca} alt="" /></Link>
                <Link to="/" className="boton-visitante cred-boton-contorno">Volver al inicio</Link>
            </div>
        </div>
    );
}

// ---------- Seguimiento · en revisión ----------
function Seguimiento({ tramite, titular }: { tramite: TramiteCredencial; titular: string }) {
    return (
        <div className="cred-columnas">
            <div className="cred-tarjeta cred-seguimiento">
                <p className="cred-sobretitulo">ESTADO DE TU SOLICITUD</p>
                <div className="cred-seguimiento__estado">
                    <Chip color="dorado">En revisión</Chip>
                    <span>Ejemplo de estado · Folio: {tramite.folio ?? "por asignar"}</span>
                </div>
                <EtapasTramite etapas={etapasEnRevision} />
                <Nota color="verde" icono={infoSeguimiento}>
                    ¿Qué sigue? La biblioteca está revisando tu solicitud. Cuando termine, te pediremos acudir a Préstamos para el cotejo presencial.
                </Nota>
                <div className="cred-acciones">
                    <Link to="/credencial" className="boton-visitante cred-boton-contorno">Ver requisitos</Link>
                    <Link to="/contacto" className="boton-visitante cred-boton-contorno">Contactar a la biblioteca <img src={flechaVerde} alt="" /></Link>
                </div>
            </div>
            <aside className="cred-lateral">
                <div className="cred-tarjeta cred-tarjeta--verde">
                    <p className="cred-sobretitulo cred-sobretitulo--verde">RESUMEN DE LA SOLICITUD</p>
                    <dl className="cred-datos">
                        <DatoCred etiqueta="TIPO DE TRÁMITE" valor={textoTipo[tramite.tipo]} />
                        <DatoCred etiqueta="SOLICITANTE" valor={titular} />
                        <DatoCred etiqueta="FOLIO" valor={tramite.folio ?? "Por asignar"} />
                        <DatoCred etiqueta="REVISA" valor="Personal de Préstamos · por asignar" />
                        <DatoCred etiqueta="VIGENCIA" valor="Se registra al validar (2 años desde la emisión)" />
                    </dl>
                </div>
                <div className="cred-tarjeta">
                    <p className="cred-sobretitulo">REQUISITOS DEL TRÁMITE</p>
                    <ul className="cred-lista">
                        <li><img src={checkLista} alt="" />Datos de contacto actualizados en tu perfil</li>
                        <li><img src={checkLista} alt="" />Cotejo presencial en la biblioteca</li>
                    </ul>
                </div>
            </aside>
        </div>
    );
}

// ---------- Corrección solicitada ----------
function Correccion({ tramite }: { tramite: TramiteCredencial }) {
    const navegar = useNavigate();
    const [nombre, setNombre] = useState("");
    const [numero, setNumero] = useState("");
    const [errores, setErrores] = useState<{ nombre?: string; numero?: string }>({});
    const [enviada, setEnviada] = useState(false);
    function enviar(e: FormEvent) {
        e.preventDefault();
        const encontrados = validarCorreccion({ nombre, numero });
        setErrores(encontrados);
        if (encontrados.nombre || encontrados.numero) {
            document.getElementById(encontrados.nombre ? "cor-nombre" : "cor-numero")?.focus();
            return;
        }
        setEnviada(true);
        enviarCorreccion();
    }
    if (enviada) return null; // al enviar, el trámite vuelve a «En revisión»
    return (
        <div className="cred-columnas">
            <form className="cred-tarjeta cred-correccion" onSubmit={enviar} noValidate>
                <Chip color="dorado">Cotejo pendiente</Chip>
                <Nota color="guinda" icono={alertaGuinda} rol="alert">
                    El personal pidió una corrección. {tramite.motivoCorreccion} Corrígelos para continuar. No se pierde tu solicitud.
                </Nota>
                <h2>Corregir solicitud</h2>
                <div className="cred-campo">
                    <label htmlFor="cor-nombre">Nombre como aparece en tu identificación<span>(obligatorio)</span></label>
                    <input id="cor-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ejemplo: Ana López"
                        maxLength={200} required aria-invalid={errores.nombre ? true : undefined} aria-describedby={errores.nombre ? "cor-nombre-error" : undefined} />
                    {errores.nombre && <p id="cor-nombre-error" className="cred-error-campo">{errores.nombre}</p>}
                </div>
                <div className="cred-campo">
                    <label htmlFor="cor-numero">Número de identificación<span>(obligatorio)</span></label>
                    <input id="cor-numero" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ejemplo: INE ****1234"
                        maxLength={40} required aria-invalid={errores.numero ? true : undefined} aria-describedby={errores.numero ? "cor-numero-error" : undefined} />
                    {errores.numero && <p id="cor-numero-error" className="cred-error-campo">{errores.numero}</p>}
                </div>
                <div className="cred-acciones">
                    <button type="submit" className="boton-visitante">Enviar corrección <img src={flechaBlanca} alt="" /></button>
                    <button type="button" className="boton-visitante cred-boton-contorno" onClick={() => navegar("/credencial")}>Cancelar</button>
                </div>
            </form>
            <aside className="cred-lateral">
                <div className="cred-tarjeta cred-tarjeta--verde">
                    <p className="cred-sobretitulo cred-sobretitulo--verde">QUÉ SIGUE</p>
                    <p className="cred-texto">Al enviar la corrección, el personal de Préstamos la revisará y hará el cotejo cuando acudas a la biblioteca.</p>
                </div>
            </aside>
        </div>
    );
}

// ---------- Credencial vigente o vencida ----------
function MiCredencial({ tramite, titular }: { tramite: TramiteCredencial; titular: string }) {
    const vencida = tramite.estado === "vencida";
    return (
        <div className="cred-columnas cred-columnas--mitad">
            <TarjetaCredencial titular={titular} vencida={vencida} emision={tramite.emision} />
            <div className="cred-lateral">
                {vencida ? (
                    <div className="cred-tarjeta cred-vencida">
                        <Chip color="guinda">Vencida</Chip>
                        <h2>Tu credencial venció</h2>
                        <p>
                            Venció el {tramite.vencimiento ? fechaLarga(tramite.vencimiento) : "—"} (ejemplo). Puedes solicitar la renovación en línea
                            y acudir a que el personal la coteje.
                        </p>
                        <Nota color="dorada" icono={alertaDorada}>Mientras no renueves, algunos servicios en sala pueden no estar disponibles.</Nota>
                        <div className="cred-acciones">
                            <Link to="/credencial/solicitud?tipo=renovacion" className="boton-visitante">Solicitar renovación <img src={flechaBlanca} alt="" /></Link>
                        </div>
                    </div>
                ) : <>
                    <div className="cred-tarjeta">
                        <p className="cred-sobretitulo">ESTADO DE TU CREDENCIAL</p>
                        <Chip color="verde">Vigente</Chip>
                        <dl className="cred-datos">
                            <DatoCred etiqueta="VIGENCIA" valor="2 años desde la emisión" />
                            <DatoCred etiqueta="FECHA DE EMISIÓN" valor={tramite.emision ? fechaLarga(tramite.emision) : "Por confirmar"} />
                        </dl>
                    </div>
                    <div className="cred-tarjeta cred-tarjeta--verde">
                        <p className="cred-sobretitulo cred-sobretitulo--verde">CON TU CREDENCIAL PUEDES</p>
                        <ul className="cred-lista">
                            <li><img src={checkLista} alt="" />Solicitar espacios de la biblioteca desde el portal.</li>
                            <li><img src={checkLista} alt="" />Registrar tu progreso de participación y, cuando existan, recompensas.</li>
                            <li><img src={checkLista} alt="" />Conservar tu cuenta e historial aunque la credencial venza.</li>
                        </ul>
                    </div>
                    <div className="cred-acciones">
                        <Link to="/credencial/seguimiento" className="boton-visitante cred-boton-contorno">Ver seguimiento de mi solicitud</Link>
                    </div>
                </>}
            </div>
        </div>
    );
}

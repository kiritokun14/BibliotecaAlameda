// Atención › Altas asistidas (HU-09 / T-033). Conectada al backend (servicios/altaAsistida.ts).
// Diseño: el del Editor de contenidos, dentro del panel. Misma ruta y mismo flujo de antes:
// formulario, resultado arriba y solicitudes pendientes abajo con sus decisiones.
import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode, type SubmitEvent } from "react";
import { Link } from "react-router";
import AccesoLayout from "../../components/acceso/AccesoLayout";
import Aviso from "../../components/acceso/Aviso";
import PanelLayout from "../admin/PanelLayout";
import { Migas } from "../admin/componentes";
import { IconoAviso, IconoLapiz, IconoLista, IconoReloj } from "../admin/contenidos/piezas";
import "../admin/contenidos/Contenidos.css";
import "../admin/atencion/Atencion.css";
import "./AltaAsistida.css";
import { mensajeError, ErrorServicio, obtenerSupabase } from "../../servicios/api";
import { cerrarSesion, consultarMiAcceso } from "../../servicios/auth";
import { ContextoPanel, type IdentidadPanel } from "../../servicios/accesoPanel";
import {
    cancelarSolicitud, listarSolicitudes, prepararAlta, puedeHacerAltaAsistida, reintentarInvitacion,
    resolverDuplicado, type DatosAltaAsistida, type ResultadoAlta, type SolicitudAbierta,
} from "../../servicios/altaAsistida";
import { calcularEdad, esCorreoValido, tieneDigitos, MENSAJE_CORREO, MENSAJE_OBLIGATORIO } from "../../servicios/validaciones";
import iconoFlechaDer from "../../assets/comun/iconos/flecha-derecha.svg";

const pasos = [
    "Captura los datos con la persona",
    "Se revisan posibles duplicados",
    "La persona confirma su correo y elige su contraseña",
];

// Mismos campos que Crear cuenta, sin contraseña: el titular la elige desde la invitación (HU-09).
const datosIniciales = {
    nombre: "", primerApellido: "", segundoApellido: "", fechaNacimiento: "", telefono: "",
    calle: "", numeroExterior: "", numeroInterior: "", colonia: "", codigoPostal: "", municipio: "", estado: "Nayarit",
    tutorNombre: "", tutorApellidos: "", tutorTelefono: "", tutorCorreo: "", tutorRelacion: "",
    tutorCalle: "", tutorNumeroExterior: "", tutorNumeroInterior: "", tutorColonia: "",
    tutorCodigoPostal: "", tutorMunicipio: "", tutorEstado: "Nayarit",
    correo: "", motivo: "",
};

type Datos = typeof datosIniciales;
type Errores = Partial<Record<keyof Datos | "privacidad", string>>;

const obligatorios: (keyof Datos)[] = [
    "nombre", "primerApellido", "fechaNacimiento", "telefono", "calle", "numeroExterior",
    "colonia", "codigoPostal", "municipio", "estado", "correo", "motivo",
];
const obligatoriosTutor: (keyof Datos)[] = ["tutorNombre", "tutorApellidos", "tutorTelefono", "tutorCorreo", "tutorRelacion"];
const domicilioTutor: (keyof Datos)[] = ["tutorCalle", "tutorNumeroExterior", "tutorColonia", "tutorCodigoPostal", "tutorMunicipio", "tutorEstado"];

function validar(datos: Datos, aceptaPrivacidad: boolean, conTutor: boolean, mismoDomicilio: boolean): Errores {
    const errores: Errores = {};
    const requeridos = [...obligatorios, ...(conTutor ? obligatoriosTutor : []), ...(conTutor && !mismoDomicilio ? domicilioTutor : [])];
    for (const campo of requeridos) {
        if (datos[campo].trim() === "") errores[campo] = MENSAJE_OBLIGATORIO;
    }
    if (datos.fechaNacimiento && (!Number.isFinite(calcularEdad(datos.fechaNacimiento)) || calcularEdad(datos.fechaNacimiento) < 0))
        errores.fechaNacimiento = "Revisa la fecha de nacimiento.";
    if (datos.telefono && !tieneDigitos(datos.telefono, 10)) errores.telefono = "El teléfono debe tener 10 dígitos.";
    if (datos.codigoPostal && !tieneDigitos(datos.codigoPostal, 5)) errores.codigoPostal = "El código postal debe tener 5 dígitos.";
    if (datos.correo && !esCorreoValido(datos.correo)) errores.correo = MENSAJE_CORREO;
    if (datos.motivo.length > 500) errores.motivo = "Máximo 500 caracteres.";
    if (conTutor) {
        if (datos.tutorTelefono && !tieneDigitos(datos.tutorTelefono, 10)) errores.tutorTelefono = "El teléfono debe tener 10 dígitos.";
        if (datos.tutorCorreo && !esCorreoValido(datos.tutorCorreo)) errores.tutorCorreo = MENSAJE_CORREO;
        if (!mismoDomicilio && datos.tutorCodigoPostal && !tieneDigitos(datos.tutorCodigoPostal, 5))
            errores.tutorCodigoPostal = "El código postal debe tener 5 dígitos.";
    }
    if (!aceptaPrivacidad) errores.privacidad = "Confirma que la persona leyó y aceptó el aviso de privacidad.";
    return errores;
}

function armarSolicitud(datos: Datos, conTutor: boolean, mismoDomicilio: boolean): DatosAltaAsistida {
    const domicilio = {
        calle: datos.calle.trim(), numeroExterior: datos.numeroExterior.trim(),
        ...(datos.numeroInterior.trim() ? { numeroInterior: datos.numeroInterior.trim() } : {}),
        coloniaLocalidad: datos.colonia.trim(), codigoPostal: datos.codigoPostal.trim(),
        municipio: datos.municipio.trim(), estadoProvincia: datos.estado.trim(),
    };
    return {
        nombres: datos.nombre.trim(), primerApellido: datos.primerApellido.trim(),
        ...(datos.segundoApellido.trim() ? { segundoApellido: datos.segundoApellido.trim() } : {}),
        fechaNacimiento: datos.fechaNacimiento, telefono: datos.telefono.trim(), domicilio,
        correo: datos.correo.trim(), aceptaAviso: true, motivo: datos.motivo.trim(),
        ...(conTutor ? { tutor: {
            nombres: datos.tutorNombre.trim(), apellidos: datos.tutorApellidos.trim(),
            telefono: datos.tutorTelefono.trim(), correo: datos.tutorCorreo.trim(),
            relacion: datos.tutorRelacion === "Madre" ? "madre" : datos.tutorRelacion === "Padre" ? "padre" : "tutor",
            domicilio: mismoDomicilio ? { ...domicilio } : {
                calle: datos.tutorCalle.trim(), numeroExterior: datos.tutorNumeroExterior.trim(),
                ...(datos.tutorNumeroInterior.trim() ? { numeroInterior: datos.tutorNumeroInterior.trim() } : {}),
                coloniaLocalidad: datos.tutorColonia.trim(), codigoPostal: datos.tutorCodigoPostal.trim(),
                municipio: datos.tutorMunicipio.trim(), estadoProvincia: datos.tutorEstado.trim(),
            },
        } } : {}),
    } as DatosAltaAsistida;
}


type Acceso = "comprobando" | "sin-sesion" | "sin-permiso" | "error-servicio" | "permitido";

// ---------- Campos con el diseño del Editor ----------

type CampoProps = {
    id: keyof Datos;
    etiqueta: string;
    datos: Datos;
    errores: Errores;
    alCambiar: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    obligatorio?: boolean;
    ayuda?: string;
    type?: string;
    placeholder?: string;
    maxLength?: number;
    inputMode?: "numeric" | "text";
    opciones?: string[]; // si viene, es una lista desplegable
};

function CampoAlta({ id, etiqueta, datos, errores, alCambiar, obligatorio, ayuda, opciones, type = "text", ...props }: CampoProps) {
    const error = errores[id];
    const nota = error || ayuda ? `${id}-nota` : undefined;
    return (
        <div className="contenidos-campo">
            <label htmlFor={id}>
                {etiqueta}
                {obligatorio && <span className="contenidos-campo__obligatorio" aria-label="obligatorio"> *</span>}
            </label>
            {opciones ? (
                <select id={id} name={id} value={datos[id]} onChange={alCambiar} aria-invalid={!!error} aria-describedby={nota}>
                    <option value="">Elige una opción</option>
                    {opciones.map((o) => <option key={o}>{o}</option>)}
                </select>
            ) : (
                <input id={id} name={id} type={type} value={datos[id]} onChange={alCambiar} className={error ? "contenidos-campo--error" : undefined}
                    aria-invalid={!!error} aria-describedby={nota} {...props} />
            )}
            {error ? <p id={nota} className="contenidos-campo__error" role="alert">{error}</p>
                : ayuda && <p id={nota} className="contenidos-campo__ayuda">{ayuda}</p>}
        </div>
    );
}

function Panel({ id, icono, titulo, subtitulo, clase = "", children }: { id: string; icono: ReactNode; titulo: string; subtitulo?: string; clase?: string; children: ReactNode }) {
    return (
        <section className={`contenidos-panel ${clase}`} aria-labelledby={id}>
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono">{icono}</span>
                <div className="at-cabecera__textos">
                    <h2 id={id}>{titulo}</h2>
                    {subtitulo && <p>{subtitulo}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

// Aviso con el aspecto del Editor (mensajes de error, advertencia o información)
function AvisoPanel({ tono, titulo, children }: { tono: "error" | "advertencia" | "info" | "exito"; titulo: string; children: ReactNode }) {
    return (
        <div className={`alta-aviso alta-aviso--${tono}`} role={tono === "error" ? "alert" : "status"}>
            <strong>{titulo}</strong>
            <p>{children}</p>
        </div>
    );
}

function AltaAsistida() {
    const [acceso, setAcceso] = useState<Acceso>("comprobando");
    const [identidad, setIdentidad] = useState<IdentidadPanel | null>(null);
    const [datos, setDatos] = useState(datosIniciales);
    const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
    const [mismoDomicilio, setMismoDomicilio] = useState(false);
    const [errores, setErrores] = useState<Errores>({});
    const [errorServidor, setErrorServidor] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoAlta | null>(null);
    const [solicitudes, setSolicitudes] = useState<SolicitudAbierta[]>([]);

    const conTutor = datos.fechaNacimiento !== "" && calcularEdad(datos.fechaNacimiento) < 18;

    const cargarSolicitudes = useCallback(async () => {
        try { setSolicitudes(await listarSolicitudes()); }
        catch (error) { setErrorServidor(mensajeError(error)); }
    }, []);

    useEffect(() => {
        let activo = true;
        puedeHacerAltaAsistida()
            .then(async permitido => {
                if (!activo) return;
                if (permitido) {
                    // El panel (menú lateral y cabecera) necesita saber quién entró
                    const [cuenta, sesion] = await Promise.all([consultarMiAcceso(), (await obtenerSupabase()).auth.getSession()]);
                    if (!activo) return;
                    setIdentidad({ acceso: cuenta, correo: sesion.data.session?.user.email ?? "Cuenta del personal" });
                }
                setAcceso(permitido ? "permitido" : "sin-permiso");
                if (permitido) setSolicitudes(await listarSolicitudes());
            })
            .catch(error => {
                if (!activo) return;
                if (error instanceof ErrorServicio && (error.estado === 401 || error.estado === 403))
                    setAcceso(error.estado === 401 ? "sin-sesion" : "sin-permiso");
                else { setAcceso("error-servicio"); setErrorServidor(mensajeError(error)); }
            });
        return () => { activo = false; };
    }, []);

    function cambiar(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        setDatos({ ...datos, [e.target.name]: e.target.value });
    }

    function nuevaAlta() {
        setDatos(datosIniciales);
        setAceptaPrivacidad(false);
        setMismoDomicilio(false);
        setErrores({});
        setErrorServidor("");
        setResultado(null);
        window.scrollTo({ top: 0 });
    }

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const nuevosErrores = validar(datos, aceptaPrivacidad, conTutor, mismoDomicilio);
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) {
            document.getElementById("alta-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        setEnviando(true);
        setErrorServidor("");
        try {
            setResultado(await prepararAlta(armarSolicitud(datos, conTutor, mismoDomicilio)));
            window.scrollTo({ top: 0, behavior: "smooth" });
            await cargarSolicitudes();
        } catch (error) { setErrorServidor(mensajeError(error)); document.getElementById("alta-avisos")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
        finally { setEnviando(false); }
    }

    if (acceso === "comprobando") return <main className="confirmacion" role="status">Comprobando tu sesión…</main>;

    // Sin sesión o sin permiso: los mismos avisos de antes (no se muestra el panel)
    if (acceso !== "permitido") {
        return (
            <AccesoLayout etiqueta="PERSONAL DE LA BIBLIOTECA" titulo={<>Alta <span>asistida</span></>}
                texto="Registro de cuentas con apoyo del personal de Servicios Digitales.">
                <div className="tarjeta">
                    {acceso === "error-servicio" ? (
                        <Aviso tipo="error" titulo="No se pudo comprobar el acceso">{errorServidor}</Aviso>
                    ) : acceso === "sin-sesion" ? (
                        <Aviso tipo="info" titulo="Inicia sesión para continuar">
                            Entra con una cuenta del personal que tenga el permiso de alta asistida.
                        </Aviso>
                    ) : (
                        <Aviso tipo="error" titulo="Tu cuenta no tiene este permiso">
                            Solo el personal autorizado de Servicios Digitales puede registrar cuentas de otras personas.
                        </Aviso>
                    )}
                    <Link to={acceso === "error-servicio" ? "/" : "/iniciar-sesion"} className="boton-principal" onClick={() => { if (acceso !== "error-servicio") void cerrarSesion().catch(() => undefined); }}>
                        {acceso === "error-servicio" ? "Volver al inicio" : acceso === "sin-sesion" ? "Iniciar sesión" : "Entrar con otra cuenta"}
                        <img src={iconoFlechaDer} alt="" />
                    </Link>
                </div>
            </AccesoLayout>
        );
    }

    const enRevision = solicitudes.filter((s) => s.estado === "en_revision").length;
    const props = { datos, errores, alCambiar: cambiar };

    return (
        <ContextoPanel.Provider value={identidad}>
            <PanelLayout titulo="Atención" tema="contenidos">
                <Migas pasos={[["Altas asistidas"]]} />

                <div className="contenidos-encabezado">
                    <div>
                        <p className="contenidos-etiqueta">Atención · Altas asistidas</p>
                        <h1>Altas asistidas</h1>
                        <p className="contenidos-encabezado__texto">Registra la cuenta de una persona que pide apoyo en la biblioteca. Nunca escribas ni conozcas su contraseña.</p>
                    </div>
                </div>

                <section className="contenidos-resumen" aria-labelledby="alta-resumen-titulo">
                    <h2 id="alta-resumen-titulo">Accesos rápidos</h2>
                    <div className="contenidos-resumen__tarjetas">
                        <article className="contenidos-resumen__tarjeta contenidos-resumen__tarjeta--gris">
                            <div className="contenidos-resumen__fila"><span className="contenidos-resumen__icono"><IconoReloj /></span></div>
                            <p className="contenidos-resumen__cifra">{solicitudes.length - enRevision}</p>
                            <p className="contenidos-resumen__titulo">Invitación pendiente</p>
                            <p className="contenidos-resumen__texto">Falta que la persona confirme su correo.</p>
                        </article>
                        <article className="contenidos-resumen__tarjeta contenidos-resumen__tarjeta--guinda">
                            <div className="contenidos-resumen__fila"><span className="contenidos-resumen__icono"><IconoAviso /></span></div>
                            <p className="contenidos-resumen__cifra">{enRevision}</p>
                            <p className="contenidos-resumen__titulo">Posible duplicado</p>
                            <p className="contenidos-resumen__texto">Esperan la decisión del personal.</p>
                        </article>
                        <article className="contenidos-resumen__tarjeta contenidos-resumen__tarjeta--azul">
                            <div className="contenidos-resumen__fila"><span className="contenidos-resumen__icono"><IconoLista /></span></div>
                            <p className="contenidos-resumen__cifra">{solicitudes.length}</p>
                            <p className="contenidos-resumen__titulo">Solicitudes abiertas</p>
                            <p className="contenidos-resumen__texto">Se listan abajo para atenderlas.</p>
                        </article>
                    </div>
                </section>

                {resultado ? (
                    <ResultadoAltaAviso resultado={resultado} onNueva={nuevaAlta} errorServidor={errorServidor}
                        onReintentar={async () => {
                            try { setResultado(await reintentarInvitacion(resultado.id)); await cargarSolicitudes(); }
                            catch (error) { setErrorServidor(mensajeError(error)); }
                        }} />
                ) : (
                    <form className="contenidos-formulario" onSubmit={enviar} noValidate>
                        <div className="at-columna">
                            <div id="alta-avisos" className="at-columna">
                                {errorServidor && <AvisoPanel tono="error" titulo="No se pudo registrar la solicitud">{errorServidor}</AvisoPanel>}
                                {Object.keys(errores).length > 0 && <AvisoPanel tono="error" titulo="Revisa los datos marcados">Corrígelos y vuelve a enviar. Lo escrito se conserva.</AvisoPanel>}
                                {conTutor && <AvisoPanel tono="info" titulo="La persona es menor de 18 años">Captura el contacto de su madre, padre o tutor. No se crea una cuenta para esa persona.</AvisoPanel>}
                            </div>

                            <Panel id="alta-personales" icono={<IconoLapiz />} titulo="Datos personales" subtitulo="Captúralos junto con la persona.">
                                <div className="alta-fila">
                                    <CampoAlta id="nombre" etiqueta="Nombre(s)" obligatorio {...props} />
                                    <CampoAlta id="primerApellido" etiqueta="Primer apellido" obligatorio {...props} />
                                </div>
                                <div className="alta-fila">
                                    <CampoAlta id="segundoApellido" etiqueta="Segundo apellido" placeholder="Si lo tiene" {...props} />
                                    <CampoAlta id="fechaNacimiento" etiqueta="Fecha de nacimiento" type="date" obligatorio ayuda="También sirve para detectar cuentas repetidas." {...props} />
                                </div>
                                <CampoAlta id="telefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10} obligatorio ayuda="Dato de contacto; no sustituye al correo." {...props} />
                            </Panel>

                            <Panel id="alta-domicilio" icono={<IconoLista />} titulo="Domicilio">
                                <div className="alta-fila">
                                    <CampoAlta id="calle" etiqueta="Calle" obligatorio {...props} />
                                    <CampoAlta id="numeroExterior" etiqueta="Número exterior" placeholder="Número o «sin número»" obligatorio {...props} />
                                </div>
                                <div className="alta-fila">
                                    <CampoAlta id="numeroInterior" etiqueta="Número interior" placeholder="Si existe" {...props} />
                                    <CampoAlta id="colonia" etiqueta="Colonia o localidad" obligatorio {...props} />
                                </div>
                                <div className="alta-fila">
                                    <CampoAlta id="codigoPostal" etiqueta="Código postal" placeholder="5 dígitos" inputMode="numeric" maxLength={5} obligatorio {...props} />
                                    <CampoAlta id="municipio" etiqueta="Municipio" obligatorio {...props} />
                                </div>
                                <CampoAlta id="estado" etiqueta="Estado" obligatorio {...props} />
                            </Panel>

                            {conTutor && (
                                <Panel id="alta-tutor" icono={<IconoAviso />} titulo="Datos de la madre, padre o tutor" subtitulo="Solo es un contacto; no recibe acceso a la cuenta.">
                                    <div className="alta-fila">
                                        <CampoAlta id="tutorNombre" etiqueta="Nombre(s)" obligatorio {...props} />
                                        <CampoAlta id="tutorApellidos" etiqueta="Apellidos" obligatorio {...props} />
                                    </div>
                                    <div className="alta-fila">
                                        <CampoAlta id="tutorTelefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10} obligatorio {...props} />
                                        <CampoAlta id="tutorCorreo" etiqueta="Correo electrónico" type="email" obligatorio ayuda="Solo es un contacto; no recibe acceso a la cuenta." {...props} />
                                    </div>
                                    <CampoAlta id="tutorRelacion" etiqueta="Relación con la persona menor" opciones={["Madre", "Padre", "Tutor o tutora"]} obligatorio {...props} />
                                    <label className="alta-casilla">
                                        <input type="checkbox" checked={mismoDomicilio} onChange={e => setMismoDomicilio(e.target.checked)} />
                                        El responsable vive en el mismo domicilio que la persona menor.
                                    </label>
                                    {!mismoDomicilio && (
                                        <>
                                            <div className="alta-fila">
                                                <CampoAlta id="tutorCalle" etiqueta="Calle" obligatorio {...props} />
                                                <CampoAlta id="tutorNumeroExterior" etiqueta="Número exterior" obligatorio {...props} />
                                            </div>
                                            <div className="alta-fila">
                                                <CampoAlta id="tutorNumeroInterior" etiqueta="Número interior" {...props} />
                                                <CampoAlta id="tutorColonia" etiqueta="Colonia o localidad" obligatorio {...props} />
                                            </div>
                                            <div className="alta-fila">
                                                <CampoAlta id="tutorCodigoPostal" etiqueta="Código postal" obligatorio {...props} />
                                                <CampoAlta id="tutorMunicipio" etiqueta="Municipio" obligatorio {...props} />
                                            </div>
                                            <CampoAlta id="tutorEstado" etiqueta="Estado" obligatorio {...props} />
                                        </>
                                    )}
                                </Panel>
                            )}

                            <Panel id="alta-correo" icono={<IconoLapiz />} titulo="Correo de la cuenta" subtitulo="Ahí llega la invitación para confirmar y elegir la contraseña.">
                                <CampoAlta id="correo" etiqueta="Correo electrónico de la persona" type="email" placeholder="nombre@ejemplo.mx" obligatorio
                                    ayuda="Debe ser un correo al que la persona tenga acceso: ahí llega la invitación." {...props} />
                                <CampoAlta id="motivo" etiqueta="Motivo del alta asistida" placeholder="Ej. La persona pidió apoyo en el módulo de Servicios Digitales" maxLength={500} obligatorio {...props} />
                                <div>
                                    <label className="alta-casilla">
                                        <input type="checkbox" checked={aceptaPrivacidad} onChange={e => setAceptaPrivacidad(e.target.checked)}
                                            aria-describedby={errores.privacidad ? "privacidad-nota" : undefined} />
                                        La persona leyó y aceptó el aviso de privacidad (texto por confirmar)
                                    </label>
                                    {errores.privacidad && <p id="privacidad-nota" className="contenidos-campo__error" role="alert">{errores.privacidad}</p>}
                                </div>
                            </Panel>
                        </div>

                        <aside className="contenidos-formulario__lateral">
                            <Panel id="alta-pasos" icono={<IconoReloj />} titulo="Cómo funciona" clase="contenidos-panel--estado">
                                <ol className="alta-pasos">
                                    {pasos.map((paso, i) => <li key={paso}><span className="contenidos-como__numero">{i + 1}</span>{paso}</li>)}
                                </ol>
                                <button type="submit" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" disabled={enviando}>
                                    {enviando ? "Registrando…" : "Registrar y enviar invitación"}
                                </button>
                                <p className="contenidos-nota">Nunca escribas ni conozcas la contraseña de la persona.</p>
                            </Panel>
                        </aside>
                    </form>
                )}

                <SolicitudesAbiertas solicitudes={solicitudes} onCambio={cargarSolicitudes} />
            </PanelLayout>
        </ContextoPanel.Provider>
    );
}

function ResultadoAltaAviso({ resultado, onNueva, onReintentar, errorServidor }: {
    resultado: ResultadoAlta; onNueva: () => void; onReintentar: () => Promise<void>; errorServidor: string;
}) {
    const [reintentando, setReintentando] = useState(false);
    const enviada = resultado.estado === "lista" && resultado.invitacionEnviada;
    const sinCorreo = resultado.estado === "lista" && !resultado.invitacionEnviada;
    const revision = resultado.estado === "en_revision";
    return (
        <>
            <section className={`contenidos-enviado${enviada ? "" : revision ? " at-aviso--espera" : " at-aviso--error"}`} role="status">
                <span className="contenidos-enviado__palomita">{enviada ? "✓" : "!"}</span>
                <div className="contenidos-enviado__textos">
                    <p className="contenidos-enviado__titulo">
                        {enviada ? "Invitación enviada" : sinCorreo ? "La solicitud quedó registrada, pero el correo no salió" : revision ? "Posible cuenta repetida: quedó en revisión" : "Solicitud registrada"}
                    </p>
                    <p className="contenidos-enviado__detalle">
                        {enviada && `Enviamos un correo a ${resultado.correo}. La persona debe abrirlo, confirmar su correo y elegir su contraseña.`}
                        {sinCorreo && "Puede ser el límite de envíos del proyecto. Intenta reenviarla en unos minutos."}
                        {revision && "Encontramos una cuenta con la misma fecha de nacimiento y el mismo teléfono o nombre. Revísala abajo antes de invitar."}
                    </p>
                </div>
            </section>
            {errorServidor && <AvisoPanel tono="error" titulo="No se pudo completar">{errorServidor}</AvisoPanel>}
            <div className="contenidos-previa__acciones">
                {sinCorreo && (
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={reintentando}
                        onClick={async () => { setReintentando(true); await onReintentar(); setReintentando(false); }}>
                        {reintentando ? "Reenviando…" : "Reenviar invitación"}
                    </button>
                )}
                <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={onNueva}>Registrar a otra persona</button>
            </div>
        </>
    );
}

function SolicitudesAbiertas({ solicitudes, onCambio }: { solicitudes: SolicitudAbierta[]; onCambio: () => Promise<void> }) {
    return (
        <section className="contenidos-lista" aria-labelledby="alta-pendientes-titulo">
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono"><IconoLista /></span>
                <div>
                    <h2 id="alta-pendientes-titulo">Solicitudes pendientes</h2>
                    <p>Las que tienen un posible duplicado no se invitan hasta que alguien del personal decida.</p>
                </div>
            </div>
            {solicitudes.length === 0 ? (
                <div className="contenidos-vacio">
                    <span>
                        <span className="contenidos-vacio__icono"><IconoLista /></span>
                        <strong>No hay solicitudes pendientes</strong>
                        <span>Cuando registres un alta, aparecerá aquí hasta que la persona active su cuenta.</span>
                    </span>
                </div>
            ) : solicitudes.map(solicitud => <Pendiente key={solicitud.id} solicitud={solicitud} onCambio={onCambio} />)}
        </section>
    );
}

function Pendiente({ solicitud, onCambio }: { solicitud: SolicitudAbierta; onCambio: () => Promise<void> }) {
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const nombre = [solicitud.nombres, solicitud.primerApellido, solicitud.segundoApellido].filter(Boolean).join(" ");

    async function ejecutar(accion: () => Promise<ResultadoAlta>, pideMotivo = true) {
        if (pideMotivo && !motivo.trim()) { setError("Escribe el motivo de la decisión."); return; }
        setOcupado(true); setError(""); setAviso("");
        try {
            const resultado = await accion();
            if (resultado.estado === "lista" && !resultado.invitacionEnviada) setAviso("Se aprobó, pero el correo no salió. Reintenta en unos minutos.");
            await onCambio();
        } catch (e) { setError(mensajeError(e)); }
        finally { setOcupado(false); }
    }

    return (
        <article className="alta-pendiente">
            <div className="alta-pendiente__encabezado">
                <div>
                    <p className="alta-pendiente__nombre">{nombre}</p>
                    <p className="alta-pendiente__dato">{solicitud.correo} · Tel. {solicitud.telefono} · Nac. {solicitud.fechaNacimiento}</p>
                </div>
                <span className={`contenidos-estado contenidos-estado--${solicitud.estado === "en_revision" ? "con_observaciones" : "por_autorizar"}`}>
                    {solicitud.estado === "en_revision" ? "En revisión" : "Invitación pendiente"}
                </span>
            </div>

            {solicitud.candidatos.length > 0 && (
                <div className="at-nota">
                    <p className="at-nota__autor">Cuentas parecidas</p>
                    {solicitud.candidatos.map(c => (
                        <p key={c.id} className="alta-pendiente__dato">
                            {[c.nombres, c.primerApellido, c.segundoApellido].filter(Boolean).join(" ")} · {c.correo} · Tel. {c.telefono} · Nac. {c.fechaNacimiento}
                        </p>
                    ))}
                </div>
            )}

            {error && <AvisoPanel tono="error" titulo="No se pudo completar">{error}</AvisoPanel>}
            {aviso && <AvisoPanel tono="advertencia" titulo="Correo pendiente">{aviso}</AvisoPanel>}

            <div className="contenidos-campo">
                <label htmlFor={`motivo-${solicitud.id}`}>Motivo de la decisión <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                <input id={`motivo-${solicitud.id}`} type="text" value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Se verificó con identificación" />
            </div>
            <div className="alta-pendiente__acciones">
                {solicitud.estado === "en_revision" ? (
                    <>
                        <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" disabled={ocupado}
                            onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "persona_distinta", motivo.trim()))}>
                            Es otra persona: invitar
                        </button>
                        <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" disabled={ocupado}
                            onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "misma_persona", motivo.trim()))}>
                            Es la misma persona: no crear
                        </button>
                    </>
                ) : (
                    <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" disabled={ocupado}
                        onClick={() => ejecutar(() => reintentarInvitacion(solicitud.id), false)}>
                        Reenviar invitación
                    </button>
                )}
                <button type="button" className="contenidos-boton contenidos-boton--chico at-boton--guinda" disabled={ocupado}
                    onClick={() => ejecutar(() => cancelarSolicitud(solicitud.id, motivo.trim()))}>
                    Cancelar solicitud
                </button>
            </div>
        </article>
    );
}

export default AltaAsistida;

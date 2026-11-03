import { useCallback, useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";
import { Link } from "react-router";
import AccesoLayout from "../../components/AccesoLayout";
import Aviso from "../../components/Aviso";
import { Campo, CampoSelect } from "../../components/Campo";
import { mensajeError, ErrorServicio } from "../../servicios/api";
import { cerrarSesion } from "../../servicios/auth";
import {
    cancelarSolicitud, listarSolicitudes, prepararAlta, puedeHacerAltaAsistida, reintentarInvitacion,
    resolverDuplicado, type DatosAltaAsistida, type ResultadoAlta, type SolicitudAbierta,
} from "../../servicios/altaAsistida";
import { calcularEdad, esCorreoValido, tieneDigitos, MENSAJE_CORREO, MENSAJE_OBLIGATORIO } from "../../servicios/validaciones";
import iconoFlechaDer from "../../assets/login/icono-flecha-der.svg";
import iconoCargando from "../../assets/login/icono-cargando.svg";
import iconoErrorCampo from "../../assets/login/icono-error-campo.svg";
import "./AltaAsistida.css";

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

function AltaAsistida() {
    const [acceso, setAcceso] = useState<Acceso>("comprobando");
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
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }
        setEnviando(true);
        setErrorServidor("");
        try {
            setResultado(await prepararAlta(armarSolicitud(datos, conTutor, mismoDomicilio)));
            window.scrollTo({ top: 0, behavior: "smooth" });
            await cargarSolicitudes();
        } catch (error) { setErrorServidor(mensajeError(error)); window.scrollTo({ top: 0, behavior: "smooth" }); }
        finally { setEnviando(false); }
    }

    if (acceso === "comprobando") return <main className="confirmacion" role="status">Comprobando tu sesión…</main>;

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

    return (
        <AccesoLayout etiqueta="PERSONAL DE LA BIBLIOTECA" titulo={<>Alta <span>asistida</span></>}
            texto="Registra la cuenta de una persona que pide apoyo en la biblioteca. Nunca escribas ni conozcas su contraseña."
            beneficios={pasos}>
            <div className="alta-asistida">
                {resultado ? <ResultadoAltaAviso resultado={resultado} onNueva={nuevaAlta}
                    onReintentar={async () => {
                        try { setResultado(await reintentarInvitacion(resultado.id)); await cargarSolicitudes(); }
                        catch (error) { setErrorServidor(mensajeError(error)); }
                    }} errorServidor={errorServidor} /> : (
                <form className="tarjeta tarjeta--ancha" onSubmit={enviar} noValidate>
                    <div className="tarjeta__encabezado">
                        <h2>Alta asistida de cuenta</h2>
                        <p>Captura los datos junto con la persona. Ella recibirá un correo para confirmar y elegir su contraseña.</p>
                    </div>

                    {errorServidor && <Aviso tipo="error" titulo="No se pudo registrar la solicitud">{errorServidor}</Aviso>}
                    {Object.keys(errores).length > 0 && (
                        <Aviso tipo="error" titulo="Revisa los datos marcados">Corrígelos y vuelve a enviar. Lo escrito se conserva.</Aviso>
                    )}
                    {conTutor && (
                        <Aviso tipo="info" titulo="La persona es menor de 18 años">
                            Captura el contacto de su madre, padre o tutor. No se crea una cuenta para esa persona.
                        </Aviso>
                    )}

                    <p className="seccion">DATOS PERSONALES</p>
                    <div className="fila">
                        <Campo id="nombre" etiqueta="Nombre(s)" value={datos.nombre} onChange={cambiar} error={errores.nombre} required />
                        <Campo id="primerApellido" etiqueta="Primer apellido" value={datos.primerApellido} onChange={cambiar} error={errores.primerApellido} required />
                    </div>
                    <div className="fila">
                        <Campo id="segundoApellido" etiqueta="Segundo apellido" placeholder="Si lo tiene" value={datos.segundoApellido} onChange={cambiar} />
                        <Campo id="fechaNacimiento" etiqueta="Fecha de nacimiento" type="date"
                            ayuda="También sirve para detectar cuentas repetidas."
                            value={datos.fechaNacimiento} onChange={cambiar} error={errores.fechaNacimiento} required />
                    </div>
                    <Campo id="telefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10}
                        ayuda="Dato de contacto; no sustituye al correo." value={datos.telefono} onChange={cambiar} error={errores.telefono} required />

                    <p className="seccion">DOMICILIO</p>
                    <div className="fila">
                        <Campo id="calle" etiqueta="Calle" value={datos.calle} onChange={cambiar} error={errores.calle} required />
                        <Campo id="numeroExterior" etiqueta="Número exterior" placeholder="Número o «sin número»"
                            value={datos.numeroExterior} onChange={cambiar} error={errores.numeroExterior} required />
                    </div>
                    <div className="fila">
                        <Campo id="numeroInterior" etiqueta="Número interior" placeholder="Si existe" value={datos.numeroInterior} onChange={cambiar} />
                        <Campo id="colonia" etiqueta="Colonia o localidad" value={datos.colonia} onChange={cambiar} error={errores.colonia} required />
                    </div>
                    <div className="fila">
                        <Campo id="codigoPostal" etiqueta="Código postal" placeholder="5 dígitos" inputMode="numeric" maxLength={5}
                            value={datos.codigoPostal} onChange={cambiar} error={errores.codigoPostal} required />
                        <Campo id="municipio" etiqueta="Municipio" value={datos.municipio} onChange={cambiar} error={errores.municipio} required />
                    </div>
                    <Campo id="estado" etiqueta="Estado" value={datos.estado} onChange={cambiar} error={errores.estado} required />

                    {conTutor && (
                        <>
                            <p className="seccion">DATOS DE LA MADRE, PADRE O TUTOR</p>
                            <div className="fila">
                                <Campo id="tutorNombre" etiqueta="Nombre(s)" value={datos.tutorNombre} onChange={cambiar} error={errores.tutorNombre} required />
                                <Campo id="tutorApellidos" etiqueta="Apellidos" value={datos.tutorApellidos} onChange={cambiar} error={errores.tutorApellidos} required />
                            </div>
                            <div className="fila">
                                <Campo id="tutorTelefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10}
                                    value={datos.tutorTelefono} onChange={cambiar} error={errores.tutorTelefono} required />
                                <Campo id="tutorCorreo" etiqueta="Correo electrónico" type="email"
                                    ayuda="Solo es un contacto; no recibe acceso a la cuenta."
                                    value={datos.tutorCorreo} onChange={cambiar} error={errores.tutorCorreo} required />
                            </div>
                            <CampoSelect id="tutorRelacion" etiqueta="Relación con la persona menor" opciones={["Madre", "Padre", "Tutor o tutora"]}
                                value={datos.tutorRelacion} onChange={cambiar} error={errores.tutorRelacion} required />
                            <label className="casilla">
                                <input type="checkbox" checked={mismoDomicilio} onChange={e => setMismoDomicilio(e.target.checked)} />
                                El responsable vive en el mismo domicilio que la persona menor.
                            </label>
                            {!mismoDomicilio && <div className="campos">
                                <Campo id="tutorCalle" etiqueta="Calle" value={datos.tutorCalle} onChange={cambiar} error={errores.tutorCalle} required />
                                <Campo id="tutorNumeroExterior" etiqueta="Número exterior" value={datos.tutorNumeroExterior} onChange={cambiar} error={errores.tutorNumeroExterior} required />
                                <Campo id="tutorNumeroInterior" etiqueta="Número interior" value={datos.tutorNumeroInterior} onChange={cambiar} />
                                <Campo id="tutorColonia" etiqueta="Colonia o localidad" value={datos.tutorColonia} onChange={cambiar} error={errores.tutorColonia} required />
                                <Campo id="tutorCodigoPostal" etiqueta="Código postal" value={datos.tutorCodigoPostal} onChange={cambiar} error={errores.tutorCodigoPostal} required />
                                <Campo id="tutorMunicipio" etiqueta="Municipio" value={datos.tutorMunicipio} onChange={cambiar} error={errores.tutorMunicipio} required />
                                <Campo id="tutorEstado" etiqueta="Estado" value={datos.tutorEstado} onChange={cambiar} error={errores.tutorEstado} required />
                            </div>}
                        </>
                    )}

                    <p className="seccion">CORREO DE LA CUENTA</p>
                    <Campo id="correo" etiqueta="Correo electrónico de la persona" type="email" placeholder="nombre@ejemplo.mx"
                        ayuda="Debe ser un correo al que la persona tenga acceso: ahí llega la invitación."
                        value={datos.correo} onChange={cambiar} error={errores.correo} required />
                    <Campo id="motivo" etiqueta="Motivo del alta asistida" placeholder="Ej. La persona pidió apoyo en el módulo de Servicios Digitales"
                        maxLength={500} value={datos.motivo} onChange={cambiar} error={errores.motivo} required />

                    <div className="casilla-con-error">
                        <label className="casilla">
                            <input type="checkbox" checked={aceptaPrivacidad} onChange={e => setAceptaPrivacidad(e.target.checked)} />
                            La persona leyó y aceptó el aviso de privacidad (texto por confirmar)
                        </label>
                        {errores.privacidad && (
                            <p className="campo__error"><img src={iconoErrorCampo} alt="" />{errores.privacidad}</p>
                        )}
                    </div>

                    <button type="submit" className="boton-principal" disabled={enviando}>
                        {enviando ? "Registrando…" : "Registrar y enviar invitación"}
                        <img src={enviando ? iconoCargando : iconoFlechaDer} className={enviando ? "girando" : undefined} alt="" />
                    </button>
                </form>
                )}

                <SolicitudesAbiertas solicitudes={solicitudes} onCambio={cargarSolicitudes} />
            </div>
        </AccesoLayout>
    );
}

function ResultadoAltaAviso({ resultado, onNueva, onReintentar, errorServidor }: {
    resultado: ResultadoAlta; onNueva: () => void; onReintentar: () => Promise<void>; errorServidor: string;
}) {
    const [reintentando, setReintentando] = useState(false);
    return (
        <div className="tarjeta tarjeta--ancha">
            {resultado.estado === "lista" && resultado.invitacionEnviada && (
                <Aviso tipo="exito" titulo="Invitación enviada">
                    Enviamos un correo a {resultado.correo}. La persona debe abrirlo, confirmar su correo y elegir su contraseña.
                </Aviso>
            )}
            {resultado.estado === "lista" && !resultado.invitacionEnviada && (
                <Aviso tipo="advertencia" titulo="La solicitud quedó registrada, pero el correo no salió">
                    Puede ser el límite de envíos del proyecto. Intenta reenviarla en unos minutos.
                </Aviso>
            )}
            {resultado.estado === "en_revision" && (
                <Aviso tipo="info" titulo="Posible cuenta repetida: quedó en revisión">
                    Encontramos una cuenta con la misma fecha de nacimiento y el mismo teléfono o nombre. Revísala abajo antes de invitar.
                </Aviso>
            )}
            {errorServidor && <Aviso tipo="error" titulo="No se pudo completar">{errorServidor}</Aviso>}
            {resultado.estado === "lista" && !resultado.invitacionEnviada && (
                <button type="button" className="boton-secundario" disabled={reintentando}
                    onClick={async () => { setReintentando(true); await onReintentar(); setReintentando(false); }}>
                    {reintentando ? "Reenviando…" : "Reenviar invitación"}
                </button>
            )}
            <button type="button" className="boton-principal" onClick={onNueva}>
                Registrar a otra persona
                <img src={iconoFlechaDer} alt="" />
            </button>
        </div>
    );
}

function SolicitudesAbiertas({ solicitudes, onCambio }: { solicitudes: SolicitudAbierta[]; onCambio: () => Promise<void> }) {
    if (solicitudes.length === 0) return null;
    return (
        <section className="tarjeta tarjeta--ancha">
            <div className="tarjeta__encabezado">
                <h2>Solicitudes pendientes</h2>
                <p>Las que tienen un posible duplicado no se invitan hasta que alguien del personal decida.</p>
            </div>
            {solicitudes.map(solicitud => <Pendiente key={solicitud.id} solicitud={solicitud} onCambio={onCambio} />)}
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
        <article className="pendiente">
            <div className="pendiente__encabezado">
                <div>
                    <p className="pendiente__nombre">{nombre}</p>
                    <p className="pendiente__dato">{solicitud.correo} · Tel. {solicitud.telefono} · Nac. {solicitud.fechaNacimiento}</p>
                </div>
                <span className={`pendiente__estado pendiente__estado--${solicitud.estado}`}>
                    {solicitud.estado === "en_revision" ? "En revisión" : "Invitación pendiente"}
                </span>
            </div>

            {solicitud.candidatos.length > 0 && (
                <div className="pendiente__candidatos">
                    <p className="pendiente__subtitulo">Cuentas parecidas</p>
                    {solicitud.candidatos.map(c => (
                        <p key={c.id} className="pendiente__dato">
                            {[c.nombres, c.primerApellido, c.segundoApellido].filter(Boolean).join(" ")} · {c.correo} · Tel. {c.telefono} · Nac. {c.fechaNacimiento}
                        </p>
                    ))}
                </div>
            )}

            {error && <Aviso tipo="error" titulo="No se pudo completar">{error}</Aviso>}
            {aviso && <Aviso tipo="advertencia" titulo="Correo pendiente">{aviso}</Aviso>}

            <Campo id={`motivo-${solicitud.id}`} etiqueta="Motivo de la decisión" value={motivo} maxLength={500}
                onChange={e => setMotivo(e.target.value)} placeholder="Ej. Se verificó con identificación" required />
            <div className="pendiente__acciones">
                {solicitud.estado === "en_revision" ? (
                    <>
                        <button type="button" className="boton-secundario" disabled={ocupado}
                            onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "persona_distinta", motivo.trim()))}>
                            Es otra persona: invitar
                        </button>
                        <button type="button" className="boton-secundario" disabled={ocupado}
                            onClick={() => ejecutar(() => resolverDuplicado(solicitud.id, "misma_persona", motivo.trim()))}>
                            Es la misma persona: no crear
                        </button>
                    </>
                ) : (
                    <button type="button" className="boton-secundario" disabled={ocupado}
                        onClick={() => ejecutar(() => reintentarInvitacion(solicitud.id), false)}>
                        Reenviar invitación
                    </button>
                )}
                <button type="button" className="boton-secundario pendiente__cancelar" disabled={ocupado}
                    onClick={() => ejecutar(() => cancelarSolicitud(solicitud.id, motivo.trim()))}>
                    Cancelar solicitud
                </button>
            </div>
        </article>
    );
}

export default AltaAsistida;

// Atención › Altas asistidas (HU-09 / T-033). Conectada al backend (servicios/altaAsistida.ts).
// 22 nov 2026: rehecha con las piezas del panel (piezasPanel.tsx + PanelPiezas.css) y la paleta, como el Resumen:
// encabezado con cifras que llevan a las solicitudes; «Registrar a una persona» es un formulario en columnas libres
// (datos | «Antes de registrar» con avance y «Cómo funciona»); «Solicitudes abiertas» es lista | detalle con la decisión.
// Si el servidor responde 503 (ALTA_ASISTIDA_HABILITADA=false en Back/.env) se avisa sin romper la pantalla.
import { useCallback, useContext, useEffect, useId, useState, type ChangeEvent, type SubmitEvent } from "react";
import { Navigate } from "react-router";
import PanelLayout from "../admin/PanelLayout";
import { Migas } from "../admin/componentes";
import { Aviso, Cabecera, Chip, Cifra, Dato, Datos, Encabezado, Icono, Segmentado, Tarjeta } from "../admin/piezasPanel";
import { Paso } from "../admin/atencion/comun/Paso";
import { mensajeError, ErrorServicio } from "../../servicios/api";
import { ContextoPanel } from "../../servicios/accesoPanel";
import { esCorreoValido, tieneDigitos } from "../../servicios/validaciones";
import { listarSolicitudes, prepararAlta, reintentarInvitacion, type ResultadoAlta, type SolicitudAbierta } from "../../servicios/altaAsistida";
import {
    RUTA, armarSolicitud, datosIniciales, edadDe, lleno, servicioConError, validar,
    domicilioTutor, obligatoriosTutor, type DatosFormulario, type Errores, type FiltroSolicitud, type Servicio, type Vista,
} from "./datosAlta";
import SolicitudesAlta from "./SolicitudesAlta";
import "./AltaAsistida.css";

// ---------- Campos con las piezas del panel ----------

type CampoProps = {
    id: keyof DatosFormulario;
    etiqueta: string;
    datos: DatosFormulario;
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

function Campo({ id, etiqueta, datos, errores, alCambiar, obligatorio, ayuda, opciones, type = "text", ...props }: CampoProps) {
    const error = errores[id];
    const nota = error || ayuda ? `alta-${id}-nota` : undefined;
    return (
        <div className={`pz-campo pz-campo--lleno${error ? " pz-campo--error" : ""}`}>
            <label htmlFor={`alta-${id}`} className="alta-etiqueta">
                {etiqueta}{obligatorio && <span className="alta-obligatorio" aria-label="obligatorio"> *</span>}
            </label>
            {opciones ? (
                <select id={`alta-${id}`} name={id} value={datos[id]} onChange={alCambiar} aria-invalid={!!error} aria-describedby={nota}>
                    <option value="">Elige una opción</option>
                    {opciones.map((o) => <option key={o}>{o}</option>)}
                </select>
            ) : (
                <input id={`alta-${id}`} name={id} type={type} value={datos[id]} onChange={alCambiar} aria-invalid={!!error} aria-describedby={nota} {...props} />
            )}
            {error ? <p id={nota} className="pz-campo__error alta-nota" role="alert">{error}</p>
                : ayuda && <small id={nota} className="pz-campo__ayuda">{ayuda}</small>}
        </div>
    );
}

function Casilla({ marcada, alCambiar, titulo, texto, descrita }: { marcada: boolean; alCambiar: (v: boolean) => void; titulo: string; texto?: string; descrita?: string }) {
    return (
        <label className={`pz-casilla${marcada ? " pz-casilla--elegida" : ""}`}>
            <input type="checkbox" checked={marcada} onChange={(e) => alCambiar(e.target.checked)} aria-describedby={descrita} />
            <span><strong>{titulo}</strong>{texto && <small>{texto}</small>}</span>
        </label>
    );
}


// ---------- Pantalla ----------

function AltaAsistida() {
    const id = useId();
    // La sesión y el permiso los comprueba AccesoPanel (como en todo el panel): el menú y la barra no desaparecen al entrar
    const identidad = useContext(ContextoPanel);
    const [vista, setVista] = useState<Vista>("nueva");
    const [filtro, setFiltro] = useState<FiltroSolicitud>("todas");
    const [datos, setDatos] = useState(datosIniciales);
    const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
    const [mismoDomicilio, setMismoDomicilio] = useState(false);
    const [errores, setErrores] = useState<Errores>({});
    const [errorServidor, setErrorServidor] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoAlta | null>(null);
    const [solicitudes, setSolicitudes] = useState<SolicitudAbierta[]>([]);
    const [servicio, setServicio] = useState<Servicio>({ estado: "cargando" });

    const edad = edadDe(datos.fechaNacimiento);
    const conTutor = edad !== null && edad < 18;

    const cargarSolicitudes = useCallback(async () => {
        try {
            setSolicitudes(await listarSolicitudes());
            setServicio({ estado: "listo" });
        } catch (error) {
            setServicio(servicioConError(error));
        }
    }, []);

    useEffect(() => {
        if (!identidad) return;
        let vigente = true;
        listarSolicitudes()
            .then((lista) => { if (vigente) { setSolicitudes(lista); setServicio({ estado: "listo" }); } })
            .catch((error) => {
                if (vigente) setServicio(servicioConError(error));
            });
        return () => { vigente = false; };
    }, [identidad]);

    function cambiar(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setDatos((d) => ({ ...d, [name]: value }));
        if (errores[name as keyof DatosFormulario]) setErrores((x) => ({ ...x, [name]: undefined }));
    }

    function nuevaAlta() {
        setDatos(datosIniciales);
        setAceptaPrivacidad(false);
        setMismoDomicilio(false);
        setErrores({});
        setErrorServidor("");
        setResultado(null);
        setVista("nueva");
    }

    function verSolicitudes(nuevo: FiltroSolicitud) {
        setFiltro(nuevo);
        setVista("solicitudes");
    }

    async function enviar(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        const nuevosErrores = Object.fromEntries(Object.entries(validar(datos, aceptaPrivacidad, conTutor, mismoDomicilio)).filter(([, v]) => v)) as Errores;
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) {
            document.getElementById(`alta-${Object.keys(nuevosErrores)[0]}`)?.focus();
            return;
        }
        setEnviando(true);
        setErrorServidor("");
        try {
            setResultado(await prepararAlta(armarSolicitud(datos, conTutor, mismoDomicilio)));
            await cargarSolicitudes();
        } catch (error) {
            if (error instanceof ErrorServicio && error.estado === 503) setServicio({ estado: "apagado", mensaje: mensajeError(error) });
            setErrorServidor(mensajeError(error));
        } finally { setEnviando(false); }
    }

    // Fuera de AccesoPanel (la dirección vieja): a la de Atención
    if (!identidad) return <Navigate to={RUTA} replace />;

    const enRevision = solicitudes.filter((s) => s.estado === "en_revision").length;
    const pendientes = solicitudes.length - enRevision;
    const sinDatos = servicio.estado !== "listo";
    const props = { datos, errores, alCambiar: cambiar };

    // Lo que falta para registrar (tarjeta «Antes de registrar»)
    const requisitos: { texto: string; listo: boolean }[] = [
        { texto: "Nombre", listo: lleno(datos.nombre) && lleno(datos.primerApellido) },
        { texto: "Nacimiento", listo: lleno(datos.fechaNacimiento) },
        { texto: "Teléfono", listo: tieneDigitos(datos.telefono, 10) },
        { texto: "Domicilio", listo: (["calle", "numeroExterior", "colonia", "codigoPostal", "municipio", "estado"] as const).every((c) => lleno(datos[c])) },
        ...(conTutor ? [{ texto: "Tutor", listo: obligatoriosTutor.every((c) => lleno(datos[c])) && (mismoDomicilio || domicilioTutor.every((c) => lleno(datos[c]))) }] : []),
        { texto: "Correo", listo: esCorreoValido(datos.correo) },
        { texto: "Motivo", listo: lleno(datos.motivo) },
        { texto: "Privacidad", listo: aceptaPrivacidad },
    ];
    const listos = requisitos.filter((r) => r.listo).length;
    const completo = listos === requisitos.length;

    return (
            <PanelLayout titulo="Atención" tema="contenidos paleta">
                <Migas pasos={[["Altas asistidas"]]} />
                <div className="pz-pagina">
                    <Encabezado titulo="Altas asistidas" texto="Registra la cuenta de una persona que pide apoyo en la biblioteca. Nunca escribas ni conozcas su contraseña.">
                        <Cifra icono="reloj" valor={sinDatos ? "—" : pendientes} texto="esperan a la persona" activa={vista === "solicitudes" && filtro === "lista"}
                            alPresionar={() => verSolicitudes(filtro === "lista" && vista === "solicitudes" ? "todas" : "lista")} />
                        <Cifra icono="alerta" tono="vino" valor={sinDatos ? "—" : enRevision} texto="posibles duplicados" activa={vista === "solicitudes" && filtro === "en_revision"}
                            alPresionar={() => verSolicitudes(filtro === "en_revision" && vista === "solicitudes" ? "todas" : "en_revision")} />
                    </Encabezado>

                    {servicio.estado === "apagado" && (
                        <Aviso tono="espera" titulo="El servidor todavía no tiene habilitada el alta asistida."
                            texto="Puedes revisar el formulario, pero lo que captures no se guardará." />
                    )}
                    {servicio.estado === "error" && (
                        <Aviso tono="error" titulo="No se pudieron cargar las solicitudes abiertas." texto={servicio.mensaje}>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => void cargarSolicitudes()}>Reintentar</button>
                        </Aviso>
                    )}

                    <div className="alta-vistas">
                        <Segmentado<Vista> etiqueta="Qué quieres hacer" valor={vista} alCambiar={setVista}
                            opciones={[
                                { valor: "nueva", texto: "Registrar a una persona" },
                                { valor: "solicitudes", texto: "Solicitudes abiertas", cantidad: sinDatos ? undefined : solicitudes.length, urgente: enRevision > 0 },
                            ]} />
                    </div>

                    {vista === "solicitudes" ? (
                        <SolicitudesAlta solicitudes={solicitudes} servicio={servicio} filtro={filtro} alFiltrar={setFiltro} alCambiar={cargarSolicitudes} alRegistrar={nuevaAlta} />
                    ) : resultado ? (
                        <Resultado resultado={resultado} errorServidor={errorServidor} alNueva={nuevaAlta} alVerSolicitudes={() => verSolicitudes(resultado.estado === "en_revision" ? "en_revision" : "todas")}
                            alReintentar={async () => {
                                try { setResultado(await reintentarInvitacion(resultado.id)); setErrorServidor(""); await cargarSolicitudes(); }
                                catch (error) { setErrorServidor(mensajeError(error)); }
                            }} />
                    ) : (
                        <form className="pz-columnas pz-columnas--libre" onSubmit={enviar} noValidate aria-label="Registrar a una persona">
                            <fieldset className="pz-principal alta-formulario" disabled={enviando}>
                                {conTutor && <Aviso tono="espera" titulo="La persona es menor de 18 años." texto="Captura el contacto de su madre, padre o tutor. Esa persona no recibe acceso a la cuenta." />}

                                <Tarjeta icono="usuario" id={`${id}-personales`} titulo="1. Datos personales" texto="Captúralos junto con la persona, como aparecen en su identificación">
                                    <div className="pz-campos-fila pz-campos-fila--tres">
                                        <Campo id="nombre" etiqueta="Nombre(s)" obligatorio {...props} />
                                        <Campo id="primerApellido" etiqueta="Primer apellido" obligatorio {...props} />
                                        <Campo id="segundoApellido" etiqueta="Segundo apellido" placeholder="Si lo tiene" {...props} />
                                    </div>
                                    <div className="pz-campos-fila">
                                        <Campo id="fechaNacimiento" etiqueta="Fecha de nacimiento" type="date" obligatorio ayuda="También sirve para detectar cuentas repetidas." {...props} />
                                        <Campo id="telefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10} obligatorio ayuda="Dato de contacto; no sustituye al correo." {...props} />
                                    </div>
                                </Tarjeta>

                                <Tarjeta icono="espacios" id={`${id}-domicilio`} titulo="2. Domicilio" texto="Donde vive la persona">
                                    <div className="pz-campos-fila pz-campos-fila--tres">
                                        <Campo id="calle" etiqueta="Calle" obligatorio {...props} />
                                        <Campo id="numeroExterior" etiqueta="Número exterior" placeholder="Número o «sin número»" obligatorio {...props} />
                                        <Campo id="numeroInterior" etiqueta="Número interior" placeholder="Si existe" {...props} />
                                    </div>
                                    <div className="pz-campos-fila">
                                        <Campo id="colonia" etiqueta="Colonia o localidad" obligatorio {...props} />
                                        <Campo id="codigoPostal" etiqueta="Código postal" placeholder="5 dígitos" inputMode="numeric" maxLength={5} obligatorio {...props} />
                                    </div>
                                    <div className="pz-campos-fila">
                                        <Campo id="municipio" etiqueta="Municipio" obligatorio {...props} />
                                        <Campo id="estado" etiqueta="Estado" obligatorio {...props} />
                                    </div>
                                </Tarjeta>

                                {conTutor && (
                                    <Tarjeta icono="grupo" id={`${id}-tutor`} titulo="3. Madre, padre o tutor" texto="Solo es un contacto; no recibe acceso a la cuenta">
                                        <div className="pz-campos-fila pz-campos-fila--tres">
                                            <Campo id="tutorNombre" etiqueta="Nombre(s)" obligatorio {...props} />
                                            <Campo id="tutorApellidos" etiqueta="Apellidos" obligatorio {...props} />
                                            <Campo id="tutorRelacion" etiqueta="Relación con la persona" opciones={["Madre", "Padre", "Tutor o tutora"]} obligatorio {...props} />
                                        </div>
                                        <div className="pz-campos-fila">
                                            <Campo id="tutorTelefono" etiqueta="Teléfono" type="tel" placeholder="10 dígitos" inputMode="numeric" maxLength={10} obligatorio {...props} />
                                            <Campo id="tutorCorreo" etiqueta="Correo electrónico" type="email" obligatorio {...props} />
                                        </div>
                                        <Casilla marcada={mismoDomicilio} alCambiar={setMismoDomicilio} titulo="Vive en el mismo domicilio que la persona menor" texto="Si no, captura su domicilio." />
                                        {!mismoDomicilio && (
                                            <>
                                                <div className="pz-campos-fila pz-campos-fila--tres">
                                                    <Campo id="tutorCalle" etiqueta="Calle" obligatorio {...props} />
                                                    <Campo id="tutorNumeroExterior" etiqueta="Número exterior" obligatorio {...props} />
                                                    <Campo id="tutorNumeroInterior" etiqueta="Número interior" {...props} />
                                                </div>
                                                <div className="pz-campos-fila pz-campos-fila--tres">
                                                    <Campo id="tutorColonia" etiqueta="Colonia o localidad" obligatorio {...props} />
                                                    <Campo id="tutorCodigoPostal" etiqueta="Código postal" inputMode="numeric" maxLength={5} obligatorio {...props} />
                                                    <Campo id="tutorMunicipio" etiqueta="Municipio" obligatorio {...props} />
                                                </div>
                                                <Campo id="tutorEstado" etiqueta="Estado" obligatorio {...props} />
                                            </>
                                        )}
                                    </Tarjeta>
                                )}

                                <Tarjeta icono="mensajes" id={`${id}-correo`} titulo={`${conTutor ? 4 : 3}. Correo de la cuenta`} texto="Ahí llega la invitación para confirmar el correo y elegir la contraseña">
                                    <div className="pz-campos-fila">
                                        <Campo id="correo" etiqueta="Correo electrónico de la persona" type="email" placeholder="nombre@ejemplo.mx" obligatorio
                                            ayuda="Debe ser un correo que la persona pueda abrir." {...props} />
                                        <Campo id="motivo" etiqueta="Motivo del alta asistida" placeholder="Ej. Pidió apoyo en el módulo de Servicios Digitales" maxLength={500} obligatorio {...props} />
                                    </div>
                                    <Casilla marcada={aceptaPrivacidad} alCambiar={(v) => { setAceptaPrivacidad(v); setErrores((x) => ({ ...x, privacidad: undefined })); }}
                                        titulo="La persona leyó y aceptó el aviso de privacidad" texto="Muéstraselo antes de registrar sus datos (texto por confirmar)."
                                        descrita={errores.privacidad ? "alta-privacidad-nota" : undefined} />
                                    {errores.privacidad && <p id="alta-privacidad-nota" className="pz-campo__error alta-nota" role="alert">{errores.privacidad}</p>}
                                </Tarjeta>
                            </fieldset>

                            <aside className="pz-lateral" aria-label="Registrar">
                                <section className={`pz-tarjeta pz-guardar pz-envio${completo ? " pz-envio--listo" : ""}`} aria-labelledby={`${id}-enviar`}>
                                    <Cabecera icono={completo ? "check" : "lista"} id={`${id}-enviar`} titulo={completo ? "Lista para registrar" : "Antes de registrar"}
                                        texto={completo ? "Se revisan duplicados y se envía la invitación" : "Completa los datos con la persona"} />
                                    <div className="pz-identidad pz-tono-rol--usuario alta-previa" aria-label="Así quedará la cuenta">
                                        <span className="pz-rol-avatar pz-identidad__avatar" aria-hidden="true">{(datos.nombre.trim()[0] ?? "?").toUpperCase()}{(datos.primerApellido.trim()[0] ?? "").toUpperCase()}</span>
                                        <div className="pz-identidad__textos">
                                            <p className="pz-identidad__nombre">{[datos.nombre, datos.primerApellido, datos.segundoApellido].map((x) => x.trim()).filter(Boolean).join(" ") || "Nombre de la persona"}</p>
                                            <p className="pz-identidad__correo">{datos.correo.trim() || "Correo de la cuenta"}</p>
                                            {edad !== null && <span><Chip tono={conTutor ? "dorado" : "verde"}>{conTutor ? `Menor de edad, ${edad} años` : `Persona adulta, ${edad} años`}</Chip></span>}
                                        </div>
                                    </div>
                                    <div className="pz-envio__avance">
                                        <p><strong>{listos} de {requisitos.length}</strong> datos listos</p>
                                        <span className="pz-envio__barra" aria-hidden="true"><span style={{ width: `${(listos / requisitos.length) * 100}%` }} /></span>
                                    </div>
                                    <ul className="pz-envio__lista" aria-label="Datos para registrar">
                                        {requisitos.map((r) => (
                                            <li key={r.texto} className={r.listo ? "pz-envio__dato--listo" : undefined}>
                                                <span className="pz-envio__marca" aria-hidden="true">{r.listo && <Icono nombre="check" />}</span>
                                                {r.texto}<span className="solo-lectores">{r.listo ? ", listo" : ", falta"}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {Object.keys(errores).some((k) => errores[k as keyof Errores]) && <Aviso tono="error" titulo="Revisa los datos marcados." texto="Lo escrito se conserva." />}
                                    {errorServidor && <Aviso tono="error" titulo="No se pudo registrar." texto={errorServidor} />}
                                    <div className="pz-acciones">
                                        <button type="submit" className="pz-boton" disabled={enviando}>{enviando ? "Registrando…" : "Registrar y enviar invitación"}</button>
                                    </div>
                                    <p className="pz-acciones__nota">Nunca escribas ni conozcas la contraseña de la persona.</p>
                                </section>

                                <Tarjeta icono="info" id={`${id}-como`} titulo="Cómo funciona" texto="Lo que pasa después de registrar">
                                    <ol className="pz-linea">
                                        <Paso tono="verde" icono="usuario" titulo="Captura con la persona" texto="Sus datos, su correo y el motivo del alta." actual />
                                        <Paso tono="dorado" icono="buscarCuenta" titulo="Se revisan duplicados" texto="Si se parece a otra cuenta, queda en revisión hasta que el personal decida." />
                                        <Paso tono="gris" icono="mensajes" titulo="La persona activa su cuenta" texto="Confirma su correo y elige su contraseña desde la invitación." />
                                    </ol>
                                </Tarjeta>
                            </aside>
                        </form>
                    )}
                </div>
            </PanelLayout>
    );
}

// ---------- Resultado del registro ----------

function Resultado({ resultado, errorServidor, alNueva, alReintentar, alVerSolicitudes }: {
    resultado: ResultadoAlta; errorServidor: string; alNueva: () => void; alReintentar: () => Promise<void>; alVerSolicitudes: () => void;
}) {
    const id = useId();
    const [reintentando, setReintentando] = useState(false);
    const enviada = resultado.estado === "lista" && resultado.invitacionEnviada;
    const sinCorreo = resultado.estado === "lista" && !resultado.invitacionEnviada;
    const revision = resultado.estado === "en_revision";
    const titulo = enviada ? "Invitación enviada" : sinCorreo ? "Registrada, pero el correo no salió" : revision ? "Quedó en revisión" : "Solicitud registrada";
    return (
        <div className="pz-columnas pz-columnas--libre">
            <Tarjeta icono={enviada ? "check" : revision ? "alerta" : "mensajes"} id={`${id}-resultado`} titulo={titulo} texto={resultado.correo}
                accion={<Chip tono={enviada ? "verde" : revision ? "guinda" : "dorado"}>{enviada ? "Invitada" : revision ? "Posible duplicado" : "Correo pendiente"}</Chip>}>
                {enviada && (
                    <div className="pz-envio-ok" role="status">
                        <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                        <p><strong>Enviamos la invitación a {resultado.correo}.</strong> La persona debe abrirla, confirmar su correo y elegir su contraseña.</p>
                    </div>
                )}
                {sinCorreo && <Aviso tono="espera" titulo="La solicitud quedó registrada, pero el correo no salió." texto="Puede ser el límite de envíos del proyecto. Reenvíala en unos minutos." />}
                {revision && <Aviso tono="espera" titulo="Encontramos una cuenta parecida." texto="Tiene la misma fecha de nacimiento y el mismo teléfono o nombre. Revísala antes de invitar." />}
                {errorServidor && <Aviso tono="error" titulo="No se pudo completar." texto={errorServidor} />}
                <Datos>
                    <Dato icono="mensajes" etiqueta="Correo">{resultado.correo}</Dato>
                    <Dato icono="lista" etiqueta="Cuentas parecidas">{resultado.candidatos.length || "Ninguna"}</Dato>
                </Datos>
                <div className="pz-acciones pz-acciones--fila">
                    {sinCorreo && (
                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={reintentando}
                            onClick={async () => { setReintentando(true); await alReintentar(); setReintentando(false); }}>
                            {reintentando ? "Reenviando…" : "Reenviar invitación"}
                        </button>
                    )}
                    {revision && <button type="button" className="pz-boton pz-boton--chico" onClick={alVerSolicitudes}>Revisar el posible duplicado</button>}
                    <button type="button" className={`pz-boton pz-boton--chico${revision ? " pz-boton--contorno" : ""}`} onClick={alNueva}>Registrar a otra persona</button>
                </div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Qué sigue">
                <Tarjeta icono="revision" id={`${id}-sigue`} titulo="¿Qué sigue?" texto="Así avanza la solicitud">
                    <ol className="pz-linea">
                        <Paso tono="verde" icono="check" titulo="Datos registrados" texto="La solicitud quedó guardada con el motivo." />
                        <Paso tono={revision ? "dorado" : "verde"} icono={revision ? "alerta" : "check"} titulo={revision ? "Decidir si es otra persona" : "Sin duplicados"}
                            texto={revision ? "En Solicitudes abiertas: invitar o no crear la cuenta." : "No se parece a otra cuenta."} actual={revision} />
                        <Paso tono={enviada ? "dorado" : "gris"} icono="mensajes" titulo="La persona activa su cuenta" texto="Confirma su correo y elige su contraseña." actual={enviada} />
                    </ol>
                </Tarjeta>
            </aside>
        </div>
    );
}

export default AltaAsistida;

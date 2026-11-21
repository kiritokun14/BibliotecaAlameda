import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { EsqueletoDetalle } from "../../../components/portal/Esqueleto";
import { mensajeError } from "../../../servicios/api";
import {
    cancelarMiSolicitud, diaLocal, horarioLocal, obtenerMiSolicitud, responderPropuesta, type SolicitudEspacioApi,
} from "../../../servicios/espacios";
import { TarjetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { sesionSimulada, useSesion } from "../perfil/usarSesion";
import { Chip, PasosTramite, RutaCredencial } from "../credencial/piezas";
import PedirSesion from "../sesion/PedirSesion";
import { pasosEspacio, rutasEspacio, zonaPorSlug } from "./datos";
import {
    cancelarSimulada, estaEnProceso, etapasEspacio, fechaCorta, motivosCancelacion, nombreEstado, pasosSolicitudEspacio, solicitudSimulada, textosEstado,
} from "./datosSesion";
import { DetalleEspacio } from "./piezas";
import { fotosDe } from "./fotos";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "../credencial/CredencialSesion.css";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";

// Espacios · paso 3: seguimiento de una solicitud (/espacios/solicitud/:folio), con la plantilla C de Credencial
// (Aldahir, 20 nov 2026). Franja compacta → pasos (1 y 2 hechos, 3 en curso) → dos columnas del mismo alto:
//   izquierda: el estado (foto del espacio, chip, qué pasa, folio, fecha y horario, y lo que se puede hacer:
//   cancelar, responder un cambio propuesto o pedir otro espacio) y «Cómo avanza tu solicitud» en cuatro pasos;
//   derecha: el detalle del espacio con su foto.
// Al enviar se llega aquí con el aviso de que quedó registrada. Mientras esté en proceso, entrar a Espacios trae aquí.

// /espacios/enviada (de antes): ya no hay pantalla aparte; con folio va a su seguimiento
export function SolicitudEnviada() {
    const [parametros] = useSearchParams();
    const folio = parametros.get("folio");
    return <Navigate to={folio ? `/espacios/solicitud/${encodeURIComponent(folio)}` : "/espacios"} replace state={{ enviada: true }} />;
}

type Carga = { solicitud: SolicitudEspacioApi } | { error: string } | null;

export function GestionarSolicitud() {
    const { id: folio = "" } = useParams();
    const sesion = useSesion();
    const enviada = (useLocation().state as { enviada?: boolean } | null)?.enviada === true;
    const [carga, setCarga] = useState<Carga>(null);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        if (!sesion) return;
        let vigente = true;
        const pedir = sesionSimulada
            ? Promise.resolve(solicitudSimulada()).then((s) => { if (!s || s.folio !== folio) throw new Error("No encontramos esta solicitud. Revisa tus solicitudes en Mi perfil."); return s; })
            : obtenerMiSolicitud(folio);
        pedir.then((solicitud) => { if (vigente) setCarga({ solicitud }); })
            .catch((e) => { if (vigente) setCarga({ error: e instanceof Error && sesionSimulada ? e.message : mensajeError(e) }); });
        return () => { vigente = false; };
    }, [folio, intento, sesion]);

    if (sesion === null) {
        return (
            <PaginaPublica>
                <PedirSesion titulo="Inicia sesión para ver tu solicitud" texto="El seguimiento de tus solicitudes de espacio está en tu cuenta." />
            </PaginaPublica>
        );
    }
    const s = carga && "solicitud" in carga ? carga.solicitud : null;
    const vigente = s ? (s.acuerdo ?? { espacio: s.espacio, inicio: s.inicio, fin: s.fin, condiciones: null }) : null;
    const zona = vigente?.espacio ? zonaPorSlug(vigente.espacio.slug) : undefined;

    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.espacios} etiqueta="Espacios" titulo={<>Seguimiento de tu <span>solicitud</span></>}
                texto="En qué va tu solicitud de espacio; los cambios del personal se reflejan aquí." />
            <section className="contacto-seccion contacto-seccion--crema cred-pagina esp-pagina">
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosEspacio} rutas={rutasEspacio(zona ? vigente?.espacio?.slug : undefined)}
                        actual={s?.estado === "aprobada" ? 4 : 3} pagina={3} />
                    {!s ? (
                        <section className="esp-mapa esp-seguimiento__carga">
                            {!carga ? <EsqueletoDetalle texto="Cargando tu solicitud…" /> : (
                                <div className="perfil-vacio perfil-vacio--eventos">
                                    <h2>No pudimos abrir tu solicitud</h2>
                                    <p role="alert">{"error" in carga ? carga.error : ""}</p>
                                    <div className="perfil-acciones perfil-acciones--centro">
                                        <button type="button" className="perfil-boton" onClick={() => { setCarga(null); setIntento((x) => x + 1); }}>Reintentar</button>
                                        <Link to="/mi-perfil/espacios" className="perfil-boton perfil-boton--contorno">Ir a Mis espacios</Link>
                                    </div>
                                </div>
                            )}
                        </section>
                    ) : (
                        <div className="contacto-columnas contacto-columnas--nuevo">
                            <div className="cred-principal">
                                <Estado solicitud={s} enviada={enviada} alCambiar={(solicitud) => setCarga({ solicitud })} />
                                <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo avanza tu solicitud"
                                    texto={s.estado === "aprobada" ? "Solo falta tu actividad." : "Te avisaremos en tus notificaciones de cada cambio."}>
                                    <RutaCredencial pasos={pasosSolicitudEspacio} etapas={etapasEspacio(s.estado)} />
                                </TarjetaPerfil>
                            </div>
                            <div className="contacto-lateral">
                                {zona ? (
                                    <section className="esp-tarjeta" aria-label={`Tu espacio: ${zona.nombre}`}>
                                        <DetalleEspacio key={zona.id} zona={zona} />
                                    </section>
                                ) : (
                                    <TarjetaPerfil color="verde" icono={tarjetaLista} titulo="Visita guiada">
                                        <p className="esp-seguimiento__texto">El personal te dirá qué espacio usarán al confirmar la visita.</p>
                                    </TarjetaPerfil>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// ---------- El estado de la solicitud (como el trámite por estados de Credencial) ----------
function Estado({ solicitud: s, enviada, alCambiar }: { solicitud: SolicitudEspacioApi; enviada: boolean; alCambiar: (s: SolicitudEspacioApi) => void }) {
    const datos = textosEstado[s.estado];
    const vigente = s.acuerdo ?? { espacio: s.espacio, inicio: s.inicio, fin: s.fin, condiciones: null };
    const foto = vigente.espacio ? fotosDe(vigente.espacio.slug)[0] : undefined;
    const texto = s.estado === "rechazada" && s.observaciones ? s.observaciones
        : s.estado === "cancelada" && s.historial.at(-1)?.porPersonal ? `La biblioteca canceló esta solicitud.${s.observaciones ? ` ${s.observaciones}` : ""}`
        : datos.texto;
    return (
        <section className="esp-estado" aria-labelledby="titulo-estado-espacio">
            <div className="esp-estado__visual">
                {foto ? <img src={foto.mini} alt="" /> : <span className="esp-estado__sin-foto"><img src={iconosSeccion.espacios} alt="" /></span>}
                <p><strong>{vigente.espacio?.nombre ?? "Visita guiada"}</strong>{s.tipo === "visita" ? "Visita guiada" : "Actividad o evento"}</p>
            </div>
            <div className="esp-estado__textos">
                <Chip color={datos.color}>{nombreEstado[s.estado]}</Chip>
                <h2 id="titulo-estado-espacio">{datos.titulo}</h2>
                <p>{texto}</p>
                <dl className="perfil-datos perfil-datos--tres">
                    <div className="perfil-dato"><dt>Folio</dt><dd>{s.folio}</dd></div>
                    <div className="perfil-dato"><dt>Fecha</dt><dd>{fechaCorta(diaLocal(vigente.inicio))}</dd></div>
                    <div className="perfil-dato"><dt>Horario</dt><dd>{horarioLocal(vigente.inicio, vigente.fin) || "Por confirmar"}</dd></div>
                </dl>
                {enviada && s.estado === "en_revision" && (
                    <p className="perfil-nota cred-aviso" role="status">
                        <img src={notaInfo} alt="" />
                        <span><strong>Tu solicitud quedó registrada.</strong> Ya está en proceso; aquí verás cada cambio.</span>
                    </p>
                )}
                {s.estado === "aprobada" && (
                    <div className="perfil-nota perfil-nota--dorada">
                        <img src={notaInfoDorada} alt="" />
                        <p>{vigente.condiciones ? `Condiciones de uso: ${vigente.condiciones} ` : ""}Si necesitas cambiarla o cancelarla, llama al 311 212 8989.</p>
                    </div>
                )}
                {s.estado === "requiere_correccion" && s.propuesta && <Propuesta solicitud={s} alCambiar={alCambiar} />}
                {estaEnProceso(s) && <Cancelar folio={s.folio} alCambiar={alCambiar} />}
                {(s.estado === "cancelada" || s.estado === "rechazada") && (
                    <div className="perfil-acciones">
                        <Link to="/espacios?nueva=1" className="perfil-boton">Pedir otro espacio</Link>
                        <Link to="/mi-perfil/espacios" className="perfil-boton perfil-boton--contorno">Mis espacios</Link>
                    </div>
                )}
            </div>
        </section>
    );
}

// ---------- La biblioteca propone otro espacio u horario: aceptar o decir que no funciona ----------
function Propuesta({ solicitud: s, alCambiar }: { solicitud: SolicitudEspacioApi; alCambiar: (s: SolicitudEspacioApi) => void }) {
    const p = s.propuesta!;
    const [rechazando, setRechazando] = useState(false);
    const [comentarios, setComentarios] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    function responder(acepta: boolean) {
        setGuardando(true); setError("");
        responderPropuesta(s.folio, acepta, acepta ? "" : comentarios)
            .then(alCambiar)
            .catch((e) => { setError(mensajeError(e)); setGuardando(false); });
    }
    return (
        <div className="perfil-nota perfil-nota--dorada esp-propuesta">
            <p><strong>Te proponen</strong>{p.espacio?.nombre ?? "El mismo espacio"}, {fechaCorta(diaLocal(p.inicio))}, de {horarioLocal(p.inicio, p.fin)} h.{p.mensaje ? ` ${p.mensaje}` : ""}</p>
            {rechazando && (
                <div className="perfil-campo">
                    <label htmlFor="esp-respuesta">Qué te funcionaría mejor<span>(opcional)</span></label>
                    <input id="esp-respuesta" maxLength={300} value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder="Ej. Me funciona mejor por la tarde" />
                </div>
            )}
            {error && <p className="cred-error-campo" role="alert">{error}</p>}
            <div className="perfil-acciones">
                {rechazando ? <>
                    <button type="button" className="perfil-boton perfil-boton--chico" disabled={guardando} onClick={() => responder(false)}>{guardando ? "Enviando…" : "Enviar respuesta"}</button>
                    <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={guardando} onClick={() => setRechazando(false)}>Volver</button>
                </> : <>
                    <button type="button" className="perfil-boton perfil-boton--chico" disabled={guardando} onClick={() => responder(true)}>{guardando ? "Enviando…" : "Aceptar el cambio"}</button>
                    <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={guardando} onClick={() => setRechazando(true)}>No me funciona</button>
                </>}
            </div>
        </div>
    );
}

// ---------- Cancelar en el lugar (como en Credencial): el botón guinda se vuelve una nota rosa que anima su alto ----------
function Cancelar({ folio, alCambiar }: { folio: string; alCambiar: (s: SolicitudEspacioApi) => void }) {
    const [confirmando, setConfirmando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState("");
    const bloqueo = useRef(false);
    function cancelar() {
        if (bloqueo.current) return;
        bloqueo.current = true; setCancelando(true); setError("");
        const pedir = sesionSimulada ? Promise.resolve(cancelarSimulada(motivo)!) : cancelarMiSolicitud(folio, motivo, "");
        pedir.then(alCambiar).catch((e) => { setError(mensajeError(e)); setCancelando(false); bloqueo.current = false; });
    }
    if (!confirmando) {
        return (
            <div key="boton" className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={() => setConfirmando(true)}>Cancelar solicitud</button>
            </div>
        );
    }
    return (
        <div key="confirmacion" className={`perfil-nota perfil-nota--guinda cred-cancelar${cerrando ? " cred-cancelar--cerrando" : ""}`} role="group" aria-labelledby="titulo-cancelar-espacio">
            <p><strong id="titulo-cancelar-espacio">¿Cancelar tu solicitud {folio}?</strong>El espacio quedará libre para otras solicitudes.</p>
            <div className="perfil-campo">
                <label htmlFor="esp-motivo-cancelar">Motivo<span>(opcional)</span></label>
                <select id="esp-motivo-cancelar" value={motivo} onChange={(e) => setMotivo(e.target.value)} disabled={cancelando}>
                    <option value="">Selecciona un motivo</option>
                    {motivosCancelacion.map((m) => <option key={m}>{m}</option>)}
                </select>
            </div>
            {error && <p className="cred-error-campo" role="alert">{error}</p>}
            <div className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={cancelar} disabled={cancelando}>{cancelando ? "Cancelando…" : "Sí, cancelar"}</button>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={cancelando}
                    onClick={() => { setCerrando(true); window.setTimeout(() => { setConfirmando(false); setCerrando(false); setError(""); }, 300); }}>No, conservarla</button>
            </div>
        </div>
    );
}

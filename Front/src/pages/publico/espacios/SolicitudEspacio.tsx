import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import "../../../components/portal/Visitante.css";
import { Chip, DatoCred, EtapasTramite, Nota } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import { ModalAgenda } from "../eventos/DetalleActividad";
import { NoAprobada } from "../proponer/Proponer";
import "../eventos/Agenda.css";
import { mensajeError } from "../../../servicios/api";
import {
    cancelarMiSolicitud, diaLocal, horarioLocal, obtenerMiSolicitud, responderPropuesta, type SolicitudEspacioApi,
} from "../../../servicios/espacios";
import { fechaCorta, motivosCancelacion, nombreEstado } from "./datosSesion";
import "./EspaciosSesion.css";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";
import checkPaso from "../../../assets/credencial/paso-check.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import alerta from "../../../assets/credencial/alerta-guinda.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import relojBlanco from "../../../assets/comun/iconos/reloj-blanco.svg";
import archivoBlanco from "../../../assets/perfil/chip-archivo.svg";

const regreso = { texto: "Volver a Agenda de espacios", ruta: "/espacios" };
const regresoPerfil = { texto: "Volver a Mis espacios", ruta: "/mi-perfil/espacios" };

// «Solicitud enviada» (Figma A-02, 476:28602). El folio llega en ?folio= desde la agenda.
export function SolicitudEnviada() {
    const [parametros] = useSearchParams();
    const folio = parametros.get("folio");
    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regreso} etiqueta="AGENDA DE ESPACIOS" titulo="Solicitud enviada" texto="Esto es una solicitud, no una reserva." />
            <div className="espacios-cuerpo">
                <section className="cred-tarjeta espacios-enviada">
                    <span className="espacios-enviada__icono"><img src={checkEnviada} alt="" /></span>
                    <h2>Recibimos tu solicitud</h2>
                    <Chip color="dorado">{folio ? `Folio ${folio}` : "Folio por asignar"}</Chip>
                    <Nota color="dorada" icono={infoDorado}>Esto NO es una reserva. El personal revisará la disponibilidad y te responderá en tus notificaciones.</Nota>
                    <ol className="cred-pasos espacios-pasos espacios-pasos--centro">
                        <li className="cred-paso cred-paso--hecho"><span className="cred-paso__numero"><img src={checkPaso} alt="Completado:" /></span>Recibido</li>
                        <li className="cred-paso cred-paso--actual" aria-current="step"><span className="cred-paso__numero">2</span>En atención</li>
                        <li className="cred-paso cred-paso--pendiente"><span className="cred-paso__numero">3</span>Cerrado</li>
                    </ol>
                    <p>Puedes consultarla en Mis espacios. Si cambias de planes, cancélala desde ahí.</p>
                    <div className="cred-acciones">
                        <Link to={folio ? `/espacios/solicitud/${encodeURIComponent(folio)}` : "/mi-perfil/espacios"} className="boton-visitante">Ver mi solicitud <img src={flechaBlanca} alt="" /></Link>
                        <Link to="/espacios" className="boton-visitante cred-boton-contorno">Volver a la agenda</Link>
                    </div>
                </section>
            </div>
        </PaginaPublica>
    );
}

type Carga = { solicitud: SolicitudEspacioApi } | { error: string } | null;
type Modal = "cancelar" | "rechazar-propuesta" | null;

// «Mi solicitud de espacio» (Figma A-02, 476:28713) y modal «¿Cancelar tu solicitud de espacio?» (476:28858).
// La ruta es /espacios/solicitud/:id con el folio (SE-0001).
export function GestionarSolicitud() {
    const { id: folio = "" } = useParams();
    const [carga, setCarga] = useState<Carga>(null);
    const [intento, setIntento] = useState(0);
    const [modal, setModal] = useState<Modal>(null);
    const [motivo, setMotivo] = useState("");
    const [comentarios, setComentarios] = useState("");
    const [errorAccion, setErrorAccion] = useState("");
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        let vigente = true;
        obtenerMiSolicitud(folio)
            .then((solicitud) => { if (vigente) setCarga({ solicitud }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [folio, intento]);

    async function ejecutar(accion: () => Promise<SolicitudEspacioApi>) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setGuardando(true);
        setErrorAccion("");
        try {
            const solicitud = await accion();
            setCarga({ solicitud });
            setModal(null);
            setMotivo("");
            setComentarios("");
        } catch (e) {
            setErrorAccion(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }

    if (!carga || "error" in carga) {
        return (
            <PaginaPublica>
                <EncabezadoNoticias regreso={regresoPerfil} etiqueta="AGENDA DE ESPACIOS › MIS SOLICITUDES" titulo="Mi solicitud de espacio" texto={`Folio ${folio}`} />
                <div className="espacios-cuerpo">
                    <section className="cred-tarjeta">
                        {!carga ? <p className="cred-texto" role="status">Cargando tu solicitud…</p> : (
                            <>
                                <p className="cred-texto" role="alert">{carga.error}</p>
                                <div className="cred-acciones">
                                    <button type="button" className="boton-visitante cred-boton-contorno" onClick={() => { setCarga(null); setIntento((x) => x + 1); }}>Reintentar</button>
                                    <Link to="/mi-perfil/espacios" className="boton-visitante">Ir a Mis espacios</Link>
                                </div>
                            </>
                        )}
                    </section>
                </div>
            </PaginaPublica>
        );
    }

    const s = carga.solicitud;
    if (s.estado === "rechazada") {
        return <NoAprobada etiqueta="MIS ESPACIOS" titulo={s.espacio?.nombre ?? "Solicitud de visita"} folio={s.folio} tipo="espacio" regreso={regresoPerfil} />;
    }
    // Lo vigente: lo acordado con el personal o, si no hay, lo que pidió la persona
    const vigente = s.acuerdo ?? { espacio: s.espacio, inicio: s.inicio, fin: s.fin, condiciones: null };
    const puedeCancelar = s.estado === "en_revision" || s.estado === "requiere_correccion";
    const colorChip = s.estado === "aprobada" ? "verde" : s.estado === "cancelada" ? "gris" : s.estado === "requiere_correccion" ? "guinda" : "dorado";
    const respuesta = s.estado === "aprobada" ? "hecho" : s.estado === "requiere_correccion" ? "actual" : "pendiente";

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regresoPerfil} etiqueta="AGENDA DE ESPACIOS › MIS SOLICITUDES" titulo="Mi solicitud de espacio"
                texto="Consulta el estado de tu solicitud. Mientras esté en revisión puedes cancelarla; el personal revisa la disponibilidad y te responde." />
            <div className="espacios-cuerpo">
                {s.estado === "requiere_correccion" && s.propuesta && (
                    <section className="cred-tarjeta" aria-labelledby="titulo-propuesta">
                        <div className="espacios-plano__cabecera">
                            <span className="espacios-icono-dorado"><img src={relojBlanco} alt="" /></span>
                            <h2 id="titulo-propuesta">La biblioteca te propone un cambio</h2>
                        </div>
                        {s.propuesta.mensaje && <p className="cred-texto">{s.propuesta.mensaje}</p>}
                        <dl className="cred-datos">
                            <DatoCred etiqueta="ÁREA PROPUESTA" valor={s.propuesta.espacio?.nombre ?? "Por confirmar"} />
                            <DatoCred etiqueta="FECHA PROPUESTA" valor={fechaCorta(diaLocal(s.propuesta.inicio))} />
                            <DatoCred etiqueta="HORARIO PROPUESTO" valor={horarioLocal(s.propuesta.inicio, s.propuesta.fin)} />
                        </dl>
                        <p className="cred-texto">Si aceptas, tu solicitud vuelve a revisión con estos datos para que el personal la apruebe.</p>
                        {errorAccion && !modal && <p className="cred-error-campo espacios-error" role="alert">{errorAccion}</p>}
                        <div className="cred-acciones">
                            <button type="button" className="boton-visitante" disabled={guardando} onClick={() => ejecutar(() => responderPropuesta(s.folio, true, ""))}>
                                Aceptar el cambio
                            </button>
                            <button type="button" className="boton-visitante cred-boton-contorno" disabled={guardando} onClick={() => { setErrorAccion(""); setModal("rechazar-propuesta"); }}>
                                No me funciona
                            </button>
                        </div>
                    </section>
                )}
                <div className="espacios-columnas espacios-columnas--gestion">
                    <section className="cred-tarjeta" aria-labelledby="titulo-estado">
                        <div className="espacios-plano__cabecera">
                            <span className="espacios-icono-dorado"><img src={relojBlanco} alt="" /></span>
                            <h2 id="titulo-estado">Estado de tu solicitud</h2>
                        </div>
                        <Chip color={colorChip}>{nombreEstado[s.estado]}</Chip>
                        <EtapasTramite etapas={[
                            { titulo: "Solicitud enviada", texto: `Por ti · ${fechaCorta(diaLocal(s.creadaEn))}`, estado: "hecho" },
                            { titulo: "En revisión por el personal", texto: "Se verifica disponibilidad del área", estado: s.estado === "en_revision" ? "actual" : s.estado === "cancelada" ? "pendiente" : "hecho" },
                            { titulo: "Respuesta del personal", texto: s.estado === "requiere_correccion" ? "Te propuso un cambio: responde arriba" : "Aprobación o rechazo, con motivo", estado: respuesta },
                        ]} />
                        {s.estado === "cancelada" && (
                            <p className="cred-texto" role="status">
                                {s.historial.at(-1)?.porPersonal ? `La biblioteca canceló esta solicitud.${s.observaciones ? " " + s.observaciones : ""}` : "Esta solicitud se canceló. El área quedó libre para otras solicitudes."}
                            </p>
                        )}
                        {s.estado === "aprobada" && (
                            <p className="cred-texto" role="status">
                                Tu solicitud fue aprobada.{vigente.condiciones ? ` Condiciones de uso: ${vigente.condiciones}` : ""} Si necesitas cambiarla o cancelarla, contacta a la biblioteca.
                            </p>
                        )}
                        {errorAccion && !modal && s.estado !== "requiere_correccion" && <p className="cred-error-campo espacios-error" role="alert">{errorAccion}</p>}
                        {(puedeCancelar || s.estado === "aprobada") && (
                            <div className="cred-acciones">
                                <Link to="/contacto" className="boton-visitante cred-boton-contorno">Solicitar un cambio</Link>
                                {puedeCancelar && (
                                    <button type="button" className="boton-visitante espacios-boton-guinda" onClick={() => { setErrorAccion(""); setModal("cancelar"); }}>Cancelar solicitud</button>
                                )}
                            </div>
                        )}
                    </section>
                    <aside className="cred-tarjeta" aria-labelledby="titulo-datos">
                        <div className="espacios-plano__cabecera">
                            <span className="espacios-icono-verde"><img src={archivoBlanco} alt="" /></span>
                            <h2 id="titulo-datos">Datos de la solicitud</h2>
                        </div>
                        <dl className="cred-datos">
                            <DatoCred etiqueta="TIPO" valor={s.tipo === "visita" ? "Visita guiada" : "Uso de un área"} />
                            <DatoCred etiqueta="ÁREA" valor={vigente.espacio?.nombre ?? "Por confirmar"} />
                            <DatoCred etiqueta="FECHA" valor={fechaCorta(diaLocal(vigente.inicio))} />
                            <DatoCred etiqueta="HORARIO" valor={horarioLocal(vigente.inicio, vigente.fin) || "Por confirmar"} />
                            <DatoCred etiqueta="PERSONAS" valor={String(s.personas)} />
                            <DatoCred etiqueta="MOTIVO" valor={s.motivo} />
                            {s.institucion && <DatoCred etiqueta="INSTITUCIÓN" valor={s.institucion} />}
                            <DatoCred etiqueta="FOLIO" valor={s.folio} />
                        </dl>
                        <Nota color="dorada" icono={infoDorado}>
                            Una solicitud no reserva el espacio hasta que el personal la aprueba.
                        </Nota>
                    </aside>
                </div>
            </div>
            {modal === "cancelar" && (
                <ModalAgenda titulo="¿Cancelar tu solicitud de espacio?" icono={alerta} iconoGuinda alCerrar={() => setModal(null)}>
                    <p className="modal-agenda__texto">Se avisará al personal y el área quedará libre para otras solicitudes. Esta acción no se puede deshacer.</p>
                    <div className="cred-campo espacios-modal-campo">
                        <label htmlFor="cancelar-motivo">Motivo de la cancelación (opcional)</label>
                        <select id="cancelar-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                            <option value="">Selecciona un motivo</option>
                            {motivosCancelacion.map((m) => <option key={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="cred-campo espacios-modal-campo">
                        <label htmlFor="cancelar-comentarios">Comentarios (opcional)</label>
                        <input id="cancelar-comentarios" placeholder="Escribe un comentario" maxLength={300} value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
                    </div>
                    {errorAccion && <p className="cred-error-campo espacios-error" role="alert">{errorAccion}</p>}
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => setModal(null)}>Mantener solicitud</button>
                        <button type="button" className="agenda-boton agenda-boton--guinda" disabled={guardando}
                            onClick={() => ejecutar(() => cancelarMiSolicitud(s.folio, motivo, comentarios))}>
                            {guardando ? "Cancelando…" : "Sí, cancelar solicitud"}
                        </button>
                    </div>
                </ModalAgenda>
            )}
            {modal === "rechazar-propuesta" && (
                <ModalAgenda titulo="¿No te funciona el cambio?" icono={alerta} iconoGuinda alCerrar={() => setModal(null)}>
                    <p className="modal-agenda__texto">Tu solicitud vuelve a revisión con los datos que pediste. Cuéntale al personal qué te funcionaría mejor.</p>
                    <div className="cred-campo espacios-modal-campo">
                        <label htmlFor="respuesta-comentarios">Comentarios (opcional)</label>
                        <input id="respuesta-comentarios" placeholder="Ej. Me funciona mejor por la tarde" maxLength={300} value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
                    </div>
                    {errorAccion && <p className="cred-error-campo espacios-error" role="alert">{errorAccion}</p>}
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => setModal(null)}>Volver</button>
                        <button type="button" className="agenda-boton agenda-boton--guinda" disabled={guardando}
                            onClick={() => ejecutar(() => responderPropuesta(s.folio, false, comentarios))}>
                            {guardando ? "Enviando…" : "Enviar respuesta"}
                        </button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

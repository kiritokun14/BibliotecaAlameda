import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { Chip, DatoCred, EtapasTramite, Nota } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import { ModalAgenda } from "../eventos/DetalleActividad";
import { NoAprobada } from "../proponer/Proponer";
import "../eventos/Agenda.css";
import { cancelarSolicitudEspacio, fechaCorta, motivosCancelacion, nombreArea, obtenerSolicitud } from "./datosSesion";
import "./EspaciosSesion.css";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";
import checkPaso from "../../../assets/credencial/paso-check.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import alerta from "../../../assets/credencial/alerta-guinda.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import relojBlanco from "../../../assets/comun/iconos/reloj-blanco.svg";
import archivoBlanco from "../../../assets/perfil/chip-archivo.svg";

const regreso = { texto: "Volver a Agenda de espacios", ruta: "/espacios" };

// «Solicitud enviada» (Figma A-02, 476:28602).
export function SolicitudEnviada() {
    const [parametros] = useSearchParams();
    const solicitud = obtenerSolicitud(parametros.get("id") ?? undefined);
    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regreso} etiqueta="AGENDA DE ESPACIOS" titulo="Solicitud enviada" texto="Esto es una solicitud, no una reserva." />
            <div className="espacios-cuerpo">
                <section className="cred-tarjeta espacios-enviada">
                    <span className="espacios-enviada__icono"><img src={checkEnviada} alt="" /></span>
                    <h2>Recibimos tu solicitud</h2>
                    <Chip color="dorado">{solicitud?.folio ? `Folio ${solicitud.folio}` : "Folio por asignar"}</Chip>
                    <Nota color="dorada" icono={infoDorado}>Esto NO es una reserva. El personal revisará la disponibilidad y te confirmará por correo y notificaciones.</Nota>
                    <ol className="cred-pasos espacios-pasos espacios-pasos--centro">
                        <li className="cred-paso cred-paso--hecho"><span className="cred-paso__numero"><img src={checkPaso} alt="Completado:" /></span>Recibido</li>
                        <li className="cred-paso cred-paso--actual" aria-current="step"><span className="cred-paso__numero">2</span>En atención</li>
                        <li className="cred-paso cred-paso--pendiente"><span className="cred-paso__numero">3</span>Cerrado</li>
                    </ol>
                    <p>Puedes consultarla en Mis solicitudes. Si cambias de planes, avisa al personal desde ahí.</p>
                    <div className="cred-acciones">
                        <Link to={solicitud ? `/espacios/solicitud/${solicitud.id}` : "/mi-perfil/espacios"} className="boton-visitante">Ver mis solicitudes <img src={flechaBlanca} alt="" /></Link>
                        <Link to="/espacios" className="boton-visitante cred-boton-contorno">Volver a la agenda</Link>
                    </div>
                </section>
            </div>
        </PaginaPublica>
    );
}

// «Mi solicitud de espacio» (Figma A-02, 476:28713) y modal «¿Cancelar tu solicitud de espacio?» (476:28858).
export function GestionarSolicitud() {
    const { id } = useParams();
    const [version, setVersion] = useState(0);
    const solicitud = obtenerSolicitud(id);
    const [modal, setModal] = useState(false);
    const [motivo, setMotivo] = useState("");
    const [comentarios, setComentarios] = useState("");
    const cerrar = () => setModal(false);
    if (!solicitud) return <Navigate to="/mi-perfil/espacios" replace />;
    if (solicitud.estado === "no-aprobada") {
        return <NoAprobada etiqueta="MIS ESPACIOS" titulo={solicitud.titulo ?? nombreArea(solicitud.areaId)} folio={solicitud.folio ?? "por asignar"}
            tipo="espacio" regreso={{ texto: "Volver a Mis espacios", ruta: "/mi-perfil/espacios" }} />;
    }
    const cancelada = solicitud.estado === "cancelada";
    const horario = solicitud.horaInicio ? `${solicitud.horaInicio} a ${solicitud.horaFin}` : "Por confirmar";

    return (
        <PaginaPublica key={version}>
            <EncabezadoNoticias regreso={regreso} etiqueta="AGENDA DE ESPACIOS › MIS SOLICITUDES" titulo="Mi solicitud de espacio"
                texto="Consulta el estado de tu solicitud. Los cambios y cancelaciones se solicitan; el personal los revisa y los aplica." />
            <div className="espacios-cuerpo">
                <div className="espacios-columnas espacios-columnas--gestion">
                    <section className="cred-tarjeta" aria-labelledby="titulo-estado">
                        <div className="espacios-plano__cabecera">
                            <span className="espacios-icono-dorado"><img src={relojBlanco} alt="" /></span>
                            <h2 id="titulo-estado">Estado de tu solicitud</h2>
                        </div>
                        <Chip color={cancelada ? "gris" : "dorado"}>{cancelada ? "Cancelada" : "En revisión"}</Chip>
                        <EtapasTramite etapas={[
                            { titulo: "Solicitud enviada", texto: `Por ti · ${solicitud.fecha ? fechaCorta(solicitud.fecha) : "fecha por confirmar"}`, estado: "hecho" },
                            { titulo: "En revisión por el personal", texto: "Se verifica disponibilidad del área", estado: cancelada ? "pendiente" : "actual" },
                            { titulo: "Respuesta del personal", texto: "Aprobación o rechazo, con motivo", estado: "pendiente" },
                        ]} />
                        {cancelada ? (
                            <p className="cred-texto" role="status">Cancelaste esta solicitud. El área quedó libre para otras solicitudes.</p>
                        ) : (
                            <div className="cred-acciones">
                                <Link to="/contacto" className="boton-visitante cred-boton-contorno">Solicitar un cambio</Link>
                                <button type="button" className="boton-visitante espacios-boton-guinda" onClick={() => setModal(true)}>Cancelar solicitud</button>
                            </div>
                        )}
                    </section>
                    <aside className="cred-tarjeta" aria-labelledby="titulo-datos">
                        <div className="espacios-plano__cabecera">
                            <span className="espacios-icono-verde"><img src={archivoBlanco} alt="" /></span>
                            <h2 id="titulo-datos">Datos de la solicitud</h2>
                        </div>
                        <dl className="cred-datos">
                            <DatoCred etiqueta="ÁREA" valor={`${nombreArea(solicitud.areaId)} (por confirmar)`} />
                            <DatoCred etiqueta="FECHA" valor={fechaCorta(solicitud.fecha)} />
                            <DatoCred etiqueta="HORARIO" valor={horario} />
                            <DatoCred etiqueta="PERSONAS" valor={String(solicitud.personas)} />
                            <DatoCred etiqueta="MOTIVO" valor={solicitud.motivo} />
                            <DatoCred etiqueta="FOLIO" valor={solicitud.folio ?? "Por asignar"} />
                        </dl>
                        <Nota color="dorada" icono={infoDorado}>
                            Una solicitud no reserva el espacio hasta que el personal la aprueba. Puedes cancelarla o pedir un cambio mientras esté en revisión.
                        </Nota>
                    </aside>
                </div>
            </div>
            {modal && (
                <ModalAgenda titulo="¿Cancelar tu solicitud de espacio?" icono={alerta} iconoGuinda alCerrar={cerrar}>
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
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={cerrar}>Mantener solicitud</button>
                        <button type="button" className="agenda-boton agenda-boton--guinda"
                            onClick={() => { cancelarSolicitudEspacio(solicitud.id); setModal(false); setVersion((v) => v + 1); }}>
                            Sí, cancelar solicitud
                        </button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

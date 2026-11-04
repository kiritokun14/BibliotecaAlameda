import { useCallback, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { useSesion } from "../perfil/usarSesion";
import { quitarInscripcion } from "../perfil/datos";
import { fechaCompleta, inscripciones, obtenerActividad, useInscripcion } from "./datosAgenda";
import { ModalAgenda } from "./DetalleActividad";
import "../credencial/CredencialSesion.css";
import "./Agenda.css";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import alerta from "../../../assets/credencial/alerta-guinda.svg";

// T-052 · Mi inscripción (Figma A-02, 476:12366), modal «¿Cancelar tu inscripción?» (476:12479)
// y «Ya no puedes cancelar desde el portal» (476:12603). En desarrollo se cambia con «Vista de ejemplo de estados».
export default function MiInscripcion() {
    const { id } = useParams();
    const actividad = obtenerActividad(id);
    const sesion = useSesion();
    const navegar = useNavigate();
    const inscrito = useInscripcion(id ?? "");
    const [iniciada, setIniciada] = useState(false); // TODO backend: según la hora de inicio de la actividad
    const [modal, setModal] = useState(false);
    const cerrar = useCallback(() => setModal(false), []);

    if (!actividad) return <Navigate to="/eventos" replace />;
    if (sesion === null) return <Navigate to="/iniciar-sesion" replace />;
    if (sesion && !inscrito) return <Navigate to={`/eventos/${actividad.id}`} replace />;

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={{ texto: "Volver a Eventos y actividades", ruta: "/eventos" }} etiqueta="MIS ACTIVIDADES"
                titulo={iniciada ? <>Ya no puedes cancelar <span>desde el portal</span></> : <>Mis <span>actividades</span></>}
                texto={iniciada ? "La actividad ya comenzó." : "Estás inscrito en esta actividad."} />
            <div className="agenda-cuerpo">
                {import.meta.env.DEV && (
                    <section className="cred-ejemplos" aria-label="Vista de ejemplo de estados">
                        <p>VISTA DE EJEMPLO DE ESTADOS</p>
                        <div>
                            {[false, true].map((v) => (
                                <button key={String(v)} type="button" aria-pressed={iniciada === v} onClick={() => setIniciada(v)}
                                    className={`cred-ejemplo${iniciada === v ? " cred-ejemplo--activo" : ""}`}>{v ? "Actividad iniciada" : "Antes del inicio"}</button>
                            ))}
                        </div>
                    </section>
                )}
                <div className="mi-inscripcion">
                    <article className="mi-inscripcion__tarjeta">
                        <img className="detalle-actividad__foto" src={actividad.imagen} alt="" />
                        {!iniciada && <p className="mi-inscripcion__chip"><span className="calendario-agenda__punto" />Inscrito</p>}
                        <h2>{actividad.titulo}</h2>
                        {iniciada ? (
                            <p className="detalle-actividad__texto">
                                La actividad ya inició o está por iniciar. Si no pudiste asistir, puedes avisar al personal desde <Link to="/contacto">Contacto</Link>.
                            </p>
                        ) : <>
                            <dl className="mi-inscripcion__datos">
                                <div><dt>FECHA</dt><dd>{fechaCompleta(actividad.fecha)}</dd></div>
                                <div><dt>HORARIO</dt><dd>{actividad.horario}</dd></div>
                                <div><dt>LUGAR</dt><dd>{actividad.lugar}</dd></div>
                                <div><dt>LUGARES CONFIRMADOS</dt><dd>1</dd></div>
                            </dl>
                            <div className="modal-agenda__acciones">
                                <button type="button" className="agenda-boton agenda-boton--guinda" onClick={() => setModal(true)}>Cancelar mi inscripción</button>
                                <Link to={`/eventos/${actividad.id}`} className="agenda-boton agenda-boton--verde">Ver actividad <img src={flechaBlanca} alt="" /></Link>
                            </div>
                        </>}
                    </article>
                    {!iniciada && (
                        <aside className="mi-inscripcion__lateral">
                            <p className="agenda-sobretitulo">SI NO PUEDES ASISTIR</p>
                            <p>Cancela para liberar tu lugar. No hay lista de espera automática.</p>
                        </aside>
                    )}
                </div>
            </div>
            {modal && (
                <ModalAgenda titulo="¿Cancelar tu inscripción?" icono={alerta} iconoGuinda alCerrar={cerrar}>
                    <p className="modal-agenda__texto">
                        Dejarás de tener lugar en «{actividad.titulo}». Podrás inscribirte de nuevo si todavía hay cupo.
                    </p>
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde"
                            onClick={() => { inscripciones.cancelar(actividad.id); quitarInscripcion(actividad.id); navegar(`/eventos/${actividad.id}`); }}>
                            Sí, cancelar mi inscripción
                        </button>
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={cerrar}>Mantener inscripción <img src={flechaBlanca} alt="" /></button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

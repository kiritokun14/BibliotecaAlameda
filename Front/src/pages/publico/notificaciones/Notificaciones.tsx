import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { SeccionVisitante } from "../../../components/portal/Visitante";
import { AvisosActividad } from "./AvisosActividad";
import { useSesion } from "../perfil/usarSesion";
import { filtrar, nombreArea, notificaciones, sinLeer, useNotificaciones, type Area, type Filtro } from "./datos";
import "../../../components/portal/Visitante.css";
import "./Notificaciones.css";
import iconoArchivo from "../../../assets/admin/resumen/file-verde.svg";
import iconoCalendario from "../../../assets/perfil/fila-calendario.svg";
import iconoInfo from "../../../assets/notificaciones/tipo-info.svg";
import puntoSinLeer from "../../../assets/notificaciones/punto-sin-leer.svg";
import quitarX from "../../../assets/notificaciones/quitar-x.svg";
import modalX from "../../../assets/notificaciones/modal-x.svg";
import vacioCampana from "../../../assets/notificaciones/vacio-campana.svg";
import PedirSesion from "../sesion/PedirSesion";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";

// Notificaciones de la persona con sesión (Figma A-02, 476:13270): lista, vacío y confirmar eliminar leídas.
const iconoArea: Record<Area, string> = {
    propuesta: iconoArchivo, espacios: iconoArchivo, credencial: iconoArchivo, actividades: iconoCalendario, avisos: iconoInfo,
};

export default function Notificaciones() {
    const sesion = useSesion();
    const navegar = useNavigate();
    const lista = useNotificaciones();
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [confirmar, setConfirmar] = useState(false);
    const [aviso, setAviso] = useState("");
    const pendientes = sinLeer(lista);
    const visibles = filtrar(lista, filtro);
    const hayLeidas = lista.some((n) => n.leida);
    const filtros: { valor: Filtro; texto: string }[] = [
        { valor: "todas", texto: "Todas" }, { valor: "no-leidas", texto: `No leídas (${pendientes})` },
        { valor: "credencial", texto: "Credencial" }, { valor: "actividades", texto: "Actividades" }, { valor: "avisos", texto: "Avisos" },
    ];
    const cerrarModal = useCallback(() => setConfirmar(false), []);

    if (sesion === null) {
        return (
            <PaginaPublica>
                <PedirSesion titulo="Inicia sesión para ver tus notificaciones" texto="Aquí verás los cambios en tus solicitudes, tus inscripciones y los avisos de la biblioteca." />
            </PaginaPublica>
        );
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Notificaciones" titulo={<>Tus <span>notificaciones</span></>}
                texto="Aquí ves los cambios en tus solicitudes, las actividades nuevas y los avisos de la biblioteca." />

            <SeccionVisitante fondo="crema">
                <div className="notif-columnas">
                    <div className="notif-lista">
                        {sesion && sesion !== "simulado" ? <AvisosActividad key={sesion} /> : sesion === "simulado" ? <>
                        <div className="notif-filtros" role="group" aria-label="Filtrar notificaciones">
                            {filtros.map((f) => (
                                <button key={f.valor} type="button" className={`notif-filtro${filtro === f.valor ? " notif-filtro--activo" : ""}`}
                                    aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>{f.texto}</button>
                            ))}
                        </div>

                        {lista.length > 0 && (
                            <div className="notif-acciones">
                                <button type="button" className="notif-accion" disabled={!pendientes}
                                    onClick={() => { notificaciones.marcarTodas(); setAviso("Marcaste todas como leídas."); }}>
                                    Marcar todas como leídas
                                </button>
                                <button type="button" className="notif-accion notif-accion--guinda" disabled={!hayLeidas} onClick={() => setConfirmar(true)}>
                                    Eliminar las leídas
                                </button>
                            </div>
                        )}
                        <p className="notif-anuncio" role="status">{aviso}</p>

                        {visibles.length ? (
                            <ul className="notif-tarjetas">
                                {visibles.map((n) => (
                                    <li key={n.id} className={`notif-tarjeta${n.area === "avisos" ? " notif-tarjeta--aviso" : ""}${n.leida ? " notif-tarjeta--leida" : ""}`}>
                                        <span className="notif-tarjeta__icono"><img src={iconoArea[n.area]} alt="" /></span>
                                        <div className="notif-tarjeta__textos">
                                            <p className="notif-tarjeta__area">
                                                {nombreArea[n.area]}{!n.leida && <img src={puntoSinLeer} alt="Sin leer" />}
                                            </p>
                                            <h2>{n.titulo}</h2>
                                            <p>{n.texto}</p>
                                            <small>{n.cuando}</small>
                                            {n.accion && (
                                                <button type="button" className="notif-tarjeta__ver"
                                                    onClick={() => { notificaciones.marcarLeida(n.id); navegar(n.accion!.ruta); }}>
                                                    {n.accion.texto}
                                                </button>
                                            )}
                                        </div>
                                        <button type="button" className="notif-tarjeta__quitar" aria-label={`Eliminar notificación: ${n.titulo}`}
                                            onClick={() => { notificaciones.quitar(n.id); setAviso("Notificación eliminada."); }}>
                                            <img src={quitarX} alt="" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="notif-vacio">
                                <span><img src={vacioCampana} alt="" /></span>
                                <h2>{lista.length ? "No hay notificaciones en este filtro" : "Aún no tienes notificaciones"}</h2>
                                <p>Cuando haya cambios en tus solicitudes o avisos de la biblioteca, aparecerán aquí.</p>
                            </div>
                        )}
                    </> : <p role="status">Verificando tu sesión…</p>}
                    </div>

                    <aside className="notif-lateral">
                        <div className="notif-como">
                            <EtiquetaPerfil icono={iconosSeccion.avisos}>Cómo te avisamos</EtiquetaPerfil>
                            <p>Aquí aparecen los cambios y cancelaciones de las sesiones en las que tienes una inscripción.</p>
                            <Link to="/mi-perfil/avisos" className="boton-visitante notif-boton-contorno">
                                Configurar mis avisos
                            </Link>
                            {lista.length > 0 && <p className="notif-como__nota">Eliminar una notificación solo la quita de esta lista. No cancela tu solicitud ni tu inscripción.</p>}
                        </div>
                        {sesion === "simulado" && <p className="notif-ejemplo">Ejemplos de contenido para revisar el diseño.</p>}
                    </aside>
                </div>
            </SeccionVisitante>

            {confirmar && <ModalEliminarLeidas alCancelar={cerrarModal}
                alConfirmar={() => { notificaciones.quitarLeidas(); setConfirmar(false); setAviso("Se eliminaron las notificaciones leídas."); }} />}
        </PaginaPublica>
    );
}

function ModalEliminarLeidas({ alCancelar, alConfirmar }: { alCancelar: () => void; alConfirmar: () => void }) {
    const primero = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        primero.current?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCancelar(); };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, [alCancelar]);
    return (
        <div className="notif-velo" onClick={(e) => { if (e.target === e.currentTarget) alCancelar(); }}>
            <div className="notif-modal" role="dialog" aria-modal="true" aria-labelledby="notif-modal-titulo" aria-describedby="notif-modal-texto">
                <span className="notif-modal__icono"><img src={modalX} alt="" /></span>
                <h2 id="notif-modal-titulo">¿Eliminar las notificaciones leídas?</h2>
                <p id="notif-modal-texto">Se quitarán de tu lista las notificaciones que ya leíste. Tus solicitudes y tus inscripciones no cambian.</p>
                <div className="notif-modal__acciones">
                    <button ref={primero} type="button" className="boton-visitante notif-boton-contorno" onClick={alCancelar}>Cancelar</button>
                    <button type="button" className="boton-visitante notif-boton-guinda" onClick={alConfirmar}>Sí, eliminar</button>
                </div>
            </div>
        </div>
    );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { AvisosActividad } from "./AvisosActividad";
import { useSesion } from "../perfil/usarSesion";
import AvisosCambiosActividad from "./AvisosCambiosActividad";
import { filtrar, nombreArea, notificaciones, sinLeer, useNotificaciones, type Area, type Filtro } from "./datos";
import { Chip } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import "../perfil/Perfil.css";
import "./Notificaciones.css";
import quitarX from "../../../assets/notificaciones/quitar-x.svg";
import modalX from "../../../assets/notificaciones/modal-x.svg";
import PedirSesion from "../sesion/PedirSesion";
import { EtiquetaPerfil } from "../perfil/piezas";
import iconoAccesos from "../../../assets/inicio/etiqueta-accesos.svg";
import { iconosSeccion } from "../perfil/iconos";

// Notificaciones de la persona con sesión (Figma A-02, 476:13270), armadas con el catálogo de piezas del perfil:
// panel de lista con filtros segmentados, tarjetas de lista (dorado = sin leer, gris = leída), vacío con insignia
// y tarjeta lateral «Cómo te avisamos».
const iconoArea: Record<Area, string> = {
    propuesta: iconosSeccion.propuestas, espacios: iconosSeccion.espacios, credencial: iconosSeccion.credencial,
    actividades: iconosSeccion.eventos, avisos: iconosSeccion.avisos,
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
        { valor: "todas", texto: "Todas" }, { valor: "no-leidas", texto: "No leídas" },
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
            <EncabezadoPublico etiqueta="Notificaciones" titulo={<>Tus <span>notificaciones</span></>} icono={iconosSeccion.avisos}
                texto="Aquí ves los cambios en tus solicitudes, las actividades nuevas y los avisos de la biblioteca." />

            <div className="notif-cuerpo" style={{ "--icono-seccion": `url("${iconosSeccion.avisos}")` } as CSSProperties}>
                <div className="notif-principal">
                    {sesion && sesion !== "simulado" ? <><AvisosActividad key={sesion} /><AvisosCambiosActividad key={`cambios:${sesion}`} usuario={sesion} /></> : sesion === "simulado" ? (
                        <section className="perfil-panel" aria-label="Tus notificaciones">
                            <div className="notif-barra">
                                <div className="perfil-filtros" role="group" aria-label="Filtrar notificaciones">
                                    {filtros.map((f) => (
                                        <button key={f.valor} type="button" aria-pressed={filtro === f.valor}
                                            className={`perfil-filtro${filtro === f.valor ? " perfil-filtro--activo" : ""}`} onClick={() => setFiltro(f.valor)}>
                                            {f.texto}<span className="perfil-filtro__cuenta">{filtrar(lista, f.valor).length}</span>
                                        </button>
                                    ))}
                                </div>
                                {lista.length > 0 && (
                                    <div className="notif-barra__acciones">
                                        <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" disabled={!pendientes}
                                            onClick={() => { notificaciones.marcarTodas(); setAviso("Marcaste todas como leídas."); }}>
                                            Marcar todas como leídas
                                        </button>
                                        <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno notif-boton-quitar" disabled={!hayLeidas}
                                            onClick={() => setConfirmar(true)}>
                                            Eliminar las leídas
                                        </button>
                                    </div>
                                )}
                            </div>
                            <p className="notif-anuncio" role="status">{aviso}</p>

                            {visibles.length ? (
                                <ul className="perfil-solicitudes">
                                    {visibles.map((n) => (
                                        <li key={n.id} className={`perfil-solicitud perfil-solicitud--${n.leida ? "gris" : "dorado"} notif-item`}>
                                            <span className="perfil-lista__icono"><img src={iconoArea[n.area]} alt="" /></span>
                                            <div className="perfil-solicitud__textos">
                                                <strong>{n.titulo}</strong>
                                                <span>{n.texto}</span>
                                                <small className="notif-item__meta">{nombreArea[n.area]} · {n.cuando}</small>
                                            </div>
                                            {!n.leida && <Chip color="dorado">Sin leer</Chip>}
                                            {n.accion && (
                                                <button type="button" className={`perfil-boton perfil-boton--chico${n.leida ? " perfil-boton--contorno" : ""}`}
                                                    onClick={() => { notificaciones.marcarLeida(n.id); navegar(n.accion!.ruta); }}>
                                                    {n.accion.texto}
                                                </button>
                                            )}
                                            <button type="button" className="notif-item__quitar" aria-label={`Eliminar notificación: ${n.titulo}`}
                                                onClick={() => { notificaciones.quitar(n.id); setAviso("Notificación eliminada."); }}>
                                                <img src={quitarX} alt="" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                            {visibles.length > 0 && (
                                <p className="notif-pie">Eliminar una notificación solo la quita de esta lista; tu solicitud o tu inscripción siguen igual.{sesion === "simulado" && " Ejemplos de contenido para revisar el diseño."}</p>
                            )}
                            {!visibles.length && (
                                <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
                                    <span className="perfil-vacio__insignia" aria-hidden="true" />
                                    <p><strong>{lista.length ? "No hay notificaciones en este filtro" : "Estás al día"}</strong>
                                        {lista.length ? "Prueba con otro filtro." : "Cuando haya cambios en tus solicitudes o avisos de la biblioteca, aparecerán aquí."}</p>
                                </div>
                            )}
                        </section>
                    ) : <p role="status">Verificando tu sesión…</p>}
                </div>

                <aside className="notif-lateral">
                    {/* Resumen: cuántas faltan por leer y de qué áreas (solo cuando hay lista local) */}
                    {sesion === "simulado" && lista.length > 0 && (
                        <section className="notif-resumen" aria-labelledby="notif-resumen-titulo">
                            <EtiquetaPerfil id="notif-resumen-titulo" icono={iconosSeccion.resumen}>Resumen</EtiquetaPerfil>
                            <p className="notif-resumen__cifra"><strong>{pendientes}</strong>sin leer de {lista.length}</p>
                            <div className="notif-resumen__barra" role="progressbar" aria-valuemin={0} aria-valuemax={lista.length}
                                aria-valuenow={lista.length - pendientes} aria-label="Notificaciones leídas">
                                <span style={{ width: `${Math.round(((lista.length - pendientes) / lista.length) * 100)}%` }} />
                            </div>
                            <ul className="notif-resumen__areas">
                                {(["credencial", "actividades", "propuesta", "espacios", "avisos"] as Area[]).map((a) => {
                                    const total = lista.filter((n) => n.area === a).length;
                                    return total ? <li key={a}><span className={`notif-resumen__punto notif-resumen__punto--${a}`} />{nombreArea[a]}<strong>{total}</strong></li> : null;
                                })}
                            </ul>
                        </section>
                    )}

                    {/* Cómo te avisamos: centrada, con insignia grande */}
                    <section className="notif-como-tarjeta" aria-labelledby="notif-como-titulo">
                        <span className="notif-como-tarjeta__insignia" aria-hidden="true" />
                        <h2 id="notif-como-titulo">Cómo te avisamos</h2>
                        <p>Aquí aparecen los cambios de tus solicitudes y de las sesiones en las que tienes una inscripción. Elige qué avisos recibir y por dónde.</p>
                        <Link to="/mi-perfil/avisos" className="perfil-boton perfil-boton--guardar">Configurar mis avisos</Link>
                    </section>

                    {/* Atajos a los trámites de los que llegan avisos */}
                    <nav className="notif-atajos" aria-labelledby="notif-atajos-titulo">
                        <EtiquetaPerfil id="notif-atajos-titulo" icono={iconoAccesos}>Tus trámites</EtiquetaPerfil>
                        <ul>
                            {[
                                { texto: "Mis eventos", ruta: "/mi-perfil/eventos", icono: iconosSeccion.eventos },
                                { texto: "Mi credencial", ruta: "/mi-perfil/credencial", icono: iconosSeccion.credencial },
                                { texto: "Mis propuestas", ruta: "/mi-perfil/propuestas", icono: iconosSeccion.propuestas },
                                { texto: "Mis espacios", ruta: "/mi-perfil/espacios", icono: iconosSeccion.espacios },
                            ].map((a) => (
                                <li key={a.ruta}>
                                    <Link to={a.ruta} className="perfil-rapido"><span className="perfil-rapido__icono"><img src={a.icono} alt="" /></span>{a.texto}</Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                </aside>
            </div>

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

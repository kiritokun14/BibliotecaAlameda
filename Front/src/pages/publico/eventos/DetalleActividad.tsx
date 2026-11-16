import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { useSesion, usePerfil } from "../perfil/usarSesion";
import { agregarInscripcion, nombreCompleto } from "../perfil/datos";
import { notificaciones } from "../notificaciones/datos";
import { simulacion } from "../../../servicios/simulacion";
import {
    HOY_EJEMPLO, estadoActividad, fechaCaja, fechaCompleta, inscripciones, textoCupo, useInscripcion, useLugarEnEspera, type ActividadAgenda,
} from "./datosAgenda";
import "./Agenda.css";
import iconoCalendario from "../../../assets/eventos/detalle-calendario.svg";
import iconoReloj from "../../../assets/eventos/detalle-reloj.svg";
import iconoPin from "../../../assets/eventos/destacada-pin.svg";
import iconoCupo from "../../../assets/eventos/detalle-cupo.svg";
import circuloGrande from "../../../assets/comun/iconos/circulo-grande.svg";
import circuloChico from "../../../assets/comun/iconos/circulo-chico.svg";
import flechaOscura from "../../../assets/comun/iconos/flecha-oscura.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import volverOscura from "../../../assets/comun/iconos/volver-oscura.svg";
import modalCalendario from "../../../assets/perfil/fila-calendario-verde.svg";
import infoVerde from "../../../assets/credencial/info-verde.svg";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";

// T-052 · Detalle de una actividad de la agenda (Figma A-02, 476:11794 y siguientes).
// Con sesión: inscribirse (modal de confirmación → enviada), «Ya estás inscrito», cupo completo y actividad cancelada.
// En desarrollo: ?simular=cancelada muestra el aviso de actividad cancelada.

export default function DetalleActividad({ actividad: a }: { actividad: ActividadAgenda }) {
    const sesion = useSesion();
    const carga = usePerfil(sesion);
    const inscrito = useInscripcion(a.id);
    const espera = useLugarEnEspera(a.id);
    const [modal, setModal] = useState<"confirmar" | "enviada" | "espera" | null>(null);
    // TODO backend: el aviso de lugar liberado. En desarrollo se prueba con el selector «Vista de ejemplo» del panel.
    const [ejemploLibre, setEjemploLibre] = useState(false);
    const lugarLibre = espera !== null && ejemploLibre;
    const estado = estadoActividad(a, HOY_EJEMPLO);
    const cancelada = a.cancelada || simulacion() === "cancelada";
    const titular = carga && "perfil" in carga ? nombreCompleto(carga.perfil) : "Tus datos de cuenta";

    if (cancelada) {
        return (
            <PaginaPublica>
                <EncabezadoNoticias regreso={{ texto: "Volver a Eventos y actividades", ruta: "/eventos" }} etiqueta="Eventos y actividades"
                    titulo={<>Participa en <span>lo que viene</span></>} texto="Talleres, clubes y visitas guiadas." />
                <div className="agenda-cuerpo">
                    <div className="agenda-vacio agenda-vacio--cancelada" role="status">
                        <p className="agenda-sobretitulo">ACTIVIDAD CANCELADA</p>
                        <h3>Esta actividad fue cancelada</h3>
                        <p>Por causas de fuerza mayor no se realizará. Si estabas inscrito, te avisaremos por tus notificaciones.</p>
                        <Link to="/eventos" className="agenda-boton agenda-boton--verde">Ver otras actividades <img src={flechaBlanca} alt="" /></Link>
                    </div>
                </div>
            </PaginaPublica>
        );
    }

    const chip = inscrito ? "Ya estás inscrito" : lugarLibre ? "Lugar disponible" : espera !== null ? "En lista de espera"
        : estado === "cupo" ? "Cupo completo" : estado === "finalizada" ? "Finalizada" : "Inscripción abierta";
    const chipPanel = !inscrito && (lugarLibre || espera !== null || estado === "cupo") ? chip : null;
    const cupo = inscrito ? textoCupo(a, true) : lugarLibre ? "Tienes un lugar · confirma antes del 15 nov, 12:00"
        : espera !== null ? `Lugar ${espera} en la lista de espera` : estado === "cupo" && sesion ? `${textoCupo(a, false)} · puedes anotarte en lista de espera` : textoCupo(a, false);
    const [primera, ...restoTitulo] = a.titulo.split(" ");
    const titulo = restoTitulo.length > 1
        ? <>{primera} {restoTitulo[0]} <span>{restoTitulo.slice(1).join(" ")}</span></>
        : <>{primera} <span>{restoTitulo.join(" ")}</span></>;

    let accion: ReactNode;
    if (inscrito) {
        accion = <>
            <p className="detalle-actividad__inscrito"><span className="calendario-agenda__punto" /> Inscrito</p>
            <Link to={`/eventos/${a.id}/mi-inscripcion`} className="agenda-boton agenda-boton--dorado agenda-boton--ancho">Ver mi inscripción <img src={flechaOscura} alt="" /></Link>
            <p className="detalle-actividad__nota">Estás inscrito en esta actividad. Si no puedes asistir, cancela para liberar tu lugar. No hay lista de espera.</p>
        </>;
    } else if (lugarLibre) {
        accion = <button type="button" className="agenda-boton agenda-boton--dorado agenda-boton--ancho" onClick={() => { inscribirEn(a); setModal("enviada"); }}>Confirmar mi lugar <img src={flechaOscura} alt="" /></button>;
    } else if (espera !== null) {
        accion = <button type="button" className="agenda-boton agenda-boton--dorado agenda-boton--ancho" onClick={() => inscripciones.salirDeEspera(a.id)}>Salir de la lista de espera <img src={flechaOscura} alt="" /></button>;
    } else if (estado === "cupo" && sesion) {
        accion = <button type="button" className="agenda-boton agenda-boton--dorado agenda-boton--ancho" onClick={() => setModal("espera")}>Anotarme en lista de espera <img src={flechaOscura} alt="" /></button>;
    } else if (estado === "abierta") {
        accion = <>
            {sesion
                ? <button type="button" className="agenda-boton agenda-boton--dorado agenda-boton--ancho" onClick={() => setModal("confirmar")}>Inscribirme <img src={flechaOscura} alt="" /></button>
                : <Link to="/iniciar-sesion" className="agenda-boton agenda-boton--dorado agenda-boton--ancho">Inscribirme <img src={flechaOscura} alt="" /></Link>}
            <p className="detalle-actividad__nota">
                {sesion ? "Tu inscripción la confirma el personal, según el cupo. Puedes cancelarla antes del inicio." : "Inicia sesión para inscribirte. Tu inscripción la confirma el personal, según el cupo."}
            </p>
        </>;
    }

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={{ texto: "Volver a Eventos y actividades", ruta: "/eventos" }} etiqueta={chip} titulo={titulo}
                texto={a.resumen ?? `${a.publico}. Consulta los datos y aparta tu lugar.`} />
            <div className="agenda-cuerpo">
                <div className="detalle-actividad">
                    <div className="detalle-actividad__contenido">
                        <img className="detalle-actividad__foto" src={a.imagen} alt="" />
                        {a.descripcion && <>
                            <p className="agenda-sobretitulo agenda-sobretitulo--verde">SOBRE LA ACTIVIDAD</p>
                            {a.descripcion.map((p) => <p key={p} className="detalle-actividad__texto">{p}</p>)}
                        </>}
                    </div>
                    <aside className="detalle-actividad__info">
                        <img className="detalle-actividad__circulo detalle-actividad__circulo--1" src={circuloGrande} alt="" />
                        <img className="detalle-actividad__circulo detalle-actividad__circulo--2" src={circuloChico} alt="" />
                        {chipPanel && <span className="detalle-actividad__chip">{chipPanel}</span>}
                        <dl>
                            <Dato icono={iconoCalendario} etiqueta="FECHA" valor={fechaCompleta(a.fecha)} />
                            <Dato icono={iconoReloj} etiqueta="HORARIO" valor={a.horario} />
                            <Dato icono={iconoPin} etiqueta="LUGAR" valor={a.lugar} />
                            <Dato icono={iconoCupo} etiqueta="CUPO" valor={cupo} />
                        </dl>
                        {accion}
                        {import.meta.env.DEV && espera !== null && (
                            <button type="button" className="detalle-actividad__ejemplo" onClick={() => setEjemploLibre((x) => !x)}>
                                Vista de ejemplo: {ejemploLibre ? "volver a «En lista de espera»" : "se liberó un lugar"}
                            </button>
                        )}
                    </aside>
                </div>
            </div>
            <section className="detalle-actividad__otra">
                <div>
                    <h2>¿Buscas otra actividad?</h2>
                    <p>Hay más talleres, clubes y visitas.</p>
                </div>
                <div className="detalle-actividad__otra-botones">
                    <Link to="/eventos" className="agenda-boton agenda-boton--negro">Volver a Eventos y actividades <img src={volverOscura} alt="" /></Link>
                    <Link to="/eventos/todas" className="agenda-boton agenda-boton--verde">Ver todas las actividades <img src={flechaBlanca} alt="" /></Link>
                </div>
            </section>

            {modal === "confirmar" && (
                <ModalAgenda titulo="Confirma tu inscripción" icono={modalCalendario} alCerrar={() => setModal(null)}>
                    <dl className="modal-agenda__datos">
                        <div><dt>Actividad</dt><dd>{a.titulo}</dd></div>
                        <div><dt>Fecha</dt><dd>{fechaCompleta(a.fecha)}</dd></div>
                        <div><dt>Horario</dt><dd>{a.horario}</dd></div>
                        <div><dt>Lugar</dt><dd>{a.lugar}</dd></div>
                        <div><dt>Participante</dt><dd>{titular} (tus datos de cuenta)</dd></div>
                    </dl>
                    <p className="modal-agenda__nota"><img src={infoVerde} alt="" />No necesitas escribir tus datos otra vez. El personal confirma tu inscripción según el cupo; puedes cancelarla antes del inicio.</p>
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => { inscribirEn(a); setModal("enviada"); }}>
                            Confirmar inscripción <img src={flechaBlanca} alt="" />
                        </button>
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => setModal(null)}>Volver a la actividad</button>
                    </div>
                </ModalAgenda>
            )}
            {modal === "espera" && (
                <ModalAgenda titulo="¿Anotarte en la lista de espera?" icono={modalCalendario} alCerrar={() => setModal(null)}>
                    <p className="modal-agenda__texto">Si se libera un lugar, te avisamos y tendrás 24 horas para confirmarlo. No pierdes nada si no puedes asistir.</p>
                    <div className="modal-agenda__acciones">
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => setModal(null)}>Cancelar</button>
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => { inscripciones.anotarEnEspera(a.id); setModal(null); }}>Anotarme <img src={flechaBlanca} alt="" /></button>
                    </div>
                </ModalAgenda>
            )}
            {modal === "enviada" && (
                <ModalAgenda titulo="Quedaste inscrito en la actividad" sobretitulo="Inscripción enviada" icono={checkEnviada} alCerrar={() => setModal(null)}>
                    <p className="modal-agenda__texto">
                        {a.titulo} · {fechaCompleta(a.fecha)}, {a.horario} · {a.lugar}. El personal confirmará tu lugar según el cupo.
                    </p>
                    <div className="modal-agenda__acciones">
                        <Link to={`/eventos/${a.id}/mi-inscripcion`} className="agenda-boton agenda-boton--verde">Ver mi inscripción <img src={flechaBlanca} alt="" /></Link>
                        <button type="button" className="agenda-boton agenda-boton--contorno-verde" onClick={() => setModal(null)}>Cerrar</button>
                    </div>
                </ModalAgenda>
            )}
        </PaginaPublica>
    );
}

function Dato({ icono, etiqueta, valor }: { icono: string; etiqueta: string; valor: string }) {
    return (
        <div className="detalle-actividad__dato">
            <span><img src={icono} alt="" /></span>
            <dt>{etiqueta}</dt>
            <dd>{valor}</dd>
        </div>
    );
}

// Ventana modal de la agenda (Escape o clic fuera la cierran; el foco va al primer botón).
export function ModalAgenda({ titulo, sobretitulo, icono, iconoGuinda = false, alCerrar, children }: {
    titulo: string; sobretitulo?: string; icono: string; iconoGuinda?: boolean; alCerrar: () => void; children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    // Se guarda la última función para no volver a enfocar al cambiar de valor (por ejemplo, al escribir en un campo).
    const cerrar = useRef(alCerrar);
    useEffect(() => { cerrar.current = alCerrar; });
    useEffect(() => {
        ref.current?.querySelector<HTMLElement>("button, a, select, input")?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar.current(); };
        document.addEventListener("keydown", tecla);
        return () => document.removeEventListener("keydown", tecla);
    }, []);
    return (
        <div className="modal-agenda__velo" onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
            <div ref={ref} className="modal-agenda" role="dialog" aria-modal="true" aria-labelledby="modal-agenda-titulo">
                <span className={`modal-agenda__icono${iconoGuinda ? " modal-agenda__icono--guinda" : ""}`}><img src={icono} alt="" /></span>
                {sobretitulo && <p className="agenda-sobretitulo agenda-sobretitulo--verde">{sobretitulo}</p>}
                <h2 id="modal-agenda-titulo">{titulo}</h2>
                {children}
            </div>
        </div>
    );
}

// Inscribirse: queda en la agenda, en «Mis eventos» del perfil y como notificación (Figma: «Tu inscripción quedó registrada»).
function inscribirEn(a: ActividadAgenda) {
    inscripciones.inscribir(a.id);
    const { dia, mes } = fechaCaja(a.fecha);
    agregarInscripcion({
        id: a.id, titulo: a.titulo, detalle: `${a.categoria === "taller" ? "Taller" : "Actividad"} · ${fechaCompleta(a.fecha)} · ${a.horario}`,
        estado: "pendiente", fecha: { dia: fechaCompleta(a.fecha).slice(0, 3).toUpperCase(), numero: dia, mes }, color: "verde",
    });
    notificaciones.agregar({
        area: "actividades", titulo: "Tu inscripción quedó registrada", cuando: "Ahora",
        texto: `${a.titulo} · ${fechaCompleta(a.fecha)}. El personal confirmará tu lugar.`,
        accion: { texto: "Ver mi inscripción", ruta: `/eventos/${a.id}/mi-inscripcion` },
    });
}

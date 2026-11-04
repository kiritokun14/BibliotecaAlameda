import { useState } from "react";
import { Link } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { useSesion } from "../perfil/usarSesion";
import { HOY_EJEMPLO, agendaEjemplo, fechaCaja, filtrosCategoria, hoyLocal, nombreCategoria, proximas, type ActividadAgenda, type FiltroCategoria } from "./datosAgenda";
import "./Agenda.css";
import circuloGrande from "../../../assets/comun/iconos/circulo-grande.svg";
import circuloChico from "../../../assets/comun/iconos/circulo-chico.svg";
import flechaOscura from "../../../assets/comun/iconos/flecha-oscura.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import estrella from "../../../assets/eventos/proponer-estrella.svg";
import puntoDestacada from "../../../assets/eventos/destacada-punto.svg";
import relojDestacada from "../../../assets/eventos/destacada-reloj.svg";
import pinDestacada from "../../../assets/eventos/destacada-pin.svg";
import puntoItem from "../../../assets/eventos/item-punto.svg";
import relojItem from "../../../assets/eventos/item-reloj.svg";
import pinItem from "../../../assets/eventos/item-pin.svg";

// T-052 · Agenda pública: «Participa en lo que viene» (Figma A-02, 476:11136).
// La ven visitantes y personas con sesión; con sesión aparece además «¿Tienes una idea para la biblioteca?».
// TODO backend: ver datosAgenda.ts.

export default function Agenda() {
    const sesion = useSesion();
    const [filtro, setFiltro] = useState<FiltroCategoria>("todas");
    const hoy = hoyLocal() < HOY_EJEMPLO ? hoyLocal() : HOY_EJEMPLO; // TODO backend: usar siempre hoyLocal()
    const lista = proximas(agendaEjemplo, hoy, filtro);
    const [destacada, ...resto] = lista;

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Eventos y actividades" titulo={<>Participa en <span>lo que viene</span></>}
                texto="Talleres, clubes y visitas guiadas. Elige una actividad y consulta sus detalles." />

            <div className="agenda-cuerpo">
                {sesion && <TarjetaProponer />}

                <section className="agenda-listado" aria-labelledby="titulo-proximas">
                    <div className="agenda-listado__fila">
                        <div className="agenda-listado__encabezado">
                            <span className="agenda-etiqueta">Agenda de la biblioteca</span>
                            <h2 id="titulo-proximas">Próximas <span>actividades</span></h2>
                            <p>Talleres, clubes y visitas guiadas que se vienen, para que elijas la tuya.</p>
                        </div>
                        <Link to="/eventos/todas" className="agenda-boton agenda-boton--verde">Ver todas las actividades <img src={flechaBlanca} alt="" /></Link>
                    </div>
                    <div className="agenda-herramientas">
                    <div className="agenda-categorias" role="group" aria-label="Filtrar por tipo de actividad">
                        {filtrosCategoria.map((f) => (
                            <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}
                                className={`agenda-categoria${filtro === f.valor ? " agenda-categoria--activa" : ""}`}>
                                {f.texto}
                            </button>
                        ))}
                    </div>
                    <SelectorVistaAgenda actual="lista" />
                    </div>

                    {destacada ? <>
                        <Destacada actividad={destacada} />
                        {resto.length > 0 && (
                            <div className="agenda-mas">
                                <h3>Más actividades</h3>
                                <p>Reserva tu lugar con tiempo: algunas tienen cupo limitado.</p>
                                <ul>{resto.slice(0, 4).map((a) => <li key={a.id}><Fila actividad={a} /></li>)}</ul>
                            </div>
                        )}
                    </> : (
                        <div className="agenda-vacio" role="status">
                            <h3>No hay actividades de este tipo por ahora</h3>
                            <p>Prueba con otra categoría o vuelve pronto: la agenda se actualiza cada mes.</p>
                            <button type="button" className="agenda-boton agenda-boton--verde" onClick={() => setFiltro("todas")}>Ver todas</button>
                        </div>
                    )}
                </section>
            </div>
        </PaginaPublica>
    );
}

function Destacada({ actividad: a }: { actividad: ActividadAgenda }) {
    const { dia, mes } = fechaCaja(a.fecha);
    return (
        <Link to={`/eventos/${a.id}`} className="agenda-destacada">
            <img className="agenda-destacada__circulo agenda-destacada__circulo--1" src={circuloGrande} alt="" />
            <img className="agenda-destacada__circulo agenda-destacada__circulo--2" src={circuloChico} alt="" />
            <div className="agenda-destacada__imagen">
                <img src={a.imagen} alt="" />
                <span className="agenda-destacada__fecha"><strong>{dia}</strong>{mes}</span>
            </div>
            <div className="agenda-destacada__textos">
                <p className="agenda-destacada__etiqueta">
                    <span><img src={puntoDestacada} alt="" />{nombreCategoria[a.categoria]}</span>
                    <span className="agenda-destacada__proxima">PRÓXIMA ACTIVIDAD</span>
                </p>
                <h3>{a.titulo}</h3>
                <dl className="agenda-destacada__datos">
                    <div><span><img src={relojDestacada} alt="" /></span><dt>HORARIO</dt><dd>{a.horario}</dd></div>
                    <div><span><img src={pinDestacada} alt="" /></span><dt>LUGAR</dt><dd>{a.lugar}</dd></div>
                </dl>
                <span className="agenda-boton agenda-boton--dorado">Ver detalles <img src={flechaOscura} alt="" /></span>
            </div>
        </Link>
    );
}

export function Fila({ actividad: a }: { actividad: ActividadAgenda }) {
    const { dia, mes } = fechaCaja(a.fecha);
    return (
        <Link to={`/eventos/${a.id}`} className="agenda-fila">
            <span className="agenda-fila__fecha"><strong>{dia}</strong>{mes}</span>
            <div className="agenda-fila__textos">
                <p className="agenda-fila__categoria">
                    <img src={puntoItem} alt="" />{nombreCategoria[a.categoria]}
                    {a.cupoCompleto && <span className="agenda-fila__cupo">Cupo completo</span>}
                </p>
                <h4>{a.titulo}</h4>
                <p className="agenda-fila__datos">
                    <span><img src={relojItem} alt="" />{a.horario}</span>
                    <span><img src={pinItem} alt="" />{a.lugar}</span>
                </p>
            </div>
            <span className="agenda-boton agenda-boton--verde agenda-boton--chico">Ver detalle <img src={flechaBlanca} alt="" /></span>
        </Link>
    );
}

export function TarjetaProponer() {
    return (
        <section className="agenda-proponer">
            <span className="agenda-proponer__icono"><img src={estrella} alt="" /></span>
            <div className="agenda-proponer__textos">
                <p className="agenda-sobretitulo">PROPÓN</p>
                <h2>¿Tienes una idea para la biblioteca?</h2>
                <p>Propón un evento o un club. El personal la revisa y te responde en tus notificaciones.</p>
            </div>
            <div className="agenda-proponer__acciones">
                <Link to="/proponer" className="agenda-boton agenda-boton--dorado">Proponer un evento o club <img src={flechaOscura} alt="" /></Link>
                <Link to="/mi-perfil/propuestas" className="agenda-boton agenda-boton--negro">Mis propuestas</Link>
            </div>
        </section>
    );
}

// «Lista | Calendario» (Figma 476:11209)
export function SelectorVistaAgenda({ actual }: { actual: "lista" | "calendario" }) {
    return (
        <nav className="agenda-selector" aria-label="Forma de ver la agenda">
            <Link to="/eventos" className={`agenda-selector__opcion${actual === "lista" ? " agenda-selector__opcion--activa" : ""}`}
                aria-current={actual === "lista" ? "page" : undefined}>Lista</Link>
            <Link to="/eventos/calendario" className={`agenda-selector__opcion${actual === "calendario" ? " agenda-selector__opcion--activa" : ""}`}
                aria-current={actual === "calendario" ? "page" : undefined}>Calendario</Link>
        </nav>
    );
}

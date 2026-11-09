import { useState } from "react";
import { Link } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { useSesion } from "../perfil/usarSesion";
import { SelectorVistaAgenda, TarjetaProponer } from "./Agenda";
import {
     diaInicial, diaLargo, moverMes, nombreCategoria, nombreMes, semanasDelMes, type Categoria,
} from "./datosAgenda";
import "./Agenda.css";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import mesAnterior from "../../../assets/noticias/mes-anterior.svg";
import mesSiguiente from "../../../assets/noticias/mes-siguiente.svg";
import listaVerde from "../../../assets/noticias/vista-lista-verde.svg";
import pinClaro from "../../../assets/eventos/destacada-pin.svg";
import flechaDorada from "../../../assets/servicios/flecha-dorada.svg";

// T-052 · Calendario de actividades (Figma A-02, 476:11442): mes, días con actividades y panel del día elegido.
// TODO backend: ver datosAgenda.ts (las actividades del mes deberían pedirse al cambiar de mes).
const diasSemana = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export default function CalendarioActividades() {
    const sesion = useSesion();
    const hoy = fechaHoyTepic();
    const [inicial] = useState(() => { const [a, m] = hoy.split("-").map(Number); return { anio: a, mes: m }; });
    const [mes, setMes] = useState(inicial);
    const desde = `${mes.anio}-${String(mes.mes).padStart(2, "0")}-01`;
    const hasta = `${mes.anio}-${String(mes.mes).padStart(2, "0")}-${new Date(mes.anio, mes.mes, 0).getDate()}`;
    const { actividades, cargando, error, reintentar } = useAgendaPublica(desde, hasta);
    const semanas = semanasDelMes(mes.anio, mes.mes, actividades);
    const [elegido, setElegido] = useState<string | null>(null);
    const dia = semanas.flat().find((d) => d.fecha === (elegido ?? diaInicial(semanas, hoy)) && d.delMes) ?? null;

    function cambiarMes(paso: number) {
        const nuevo = moverMes(mes.anio, mes.mes, paso);
        setMes(nuevo);
        setElegido(null);
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Eventos y actividades" titulo={<>Calendario de <span>{nombreMes(mes.mes).toLowerCase()}</span></>}
                texto="Toca un día para ver sus actividades." />
            <div className="agenda-cuerpo">
                {sesion && <TarjetaProponer />}

                {cargando && <p role="status">Cargando calendario…</p>}
                {error && <p role="alert">{error} <button onClick={reintentar}>Reintentar</button></p>}
                <section className="calendario-agenda" aria-labelledby="titulo-mes">
                    <div className="calendario-agenda__barra">
                        <div className="calendario-agenda__mes">
                            <button type="button" className="calendario-agenda__flecha" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
                                <img src={mesAnterior} alt="" />
                            </button>
                            <button type="button" className="calendario-agenda__flecha" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
                                <img src={mesSiguiente} alt="" />
                            </button>
                            <h2 id="titulo-mes" aria-live="polite">{nombreMes(mes.mes)} {mes.anio}</h2>
                        </div>
                        <div className="calendario-agenda__controles">
                            {sesion && (
                                <Link to="/mi-perfil/eventos" className="agenda-boton agenda-boton--contorno-verde">
                                    Mis actividades <img src={listaVerde} alt="" />
                                </Link>
                            )}
                            <SelectorVistaAgenda actual="calendario" />
                        </div>
                    </div>

                    <div className="calendario-agenda__columnas">
                        <table className="calendario-agenda__tabla">
                            <caption className="solo-lectores">Actividades de {nombreMes(mes.mes).toLowerCase()} {mes.anio}</caption>
                            <thead><tr>{diasSemana.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
                            <tbody>
                                {semanas.map((semana) => (
                                    <tr key={semana[0].fecha}>
                                        {semana.map((d) => {
                                            const con = d.delMes && d.actividades.length > 0;
                                            const activo = d.fecha === (elegido ?? diaInicial(semanas, hoy)) && d.delMes;
                                            const clase = `calendario-agenda__dia${d.delMes ? "" : " calendario-agenda__dia--fuera"}${con ? " calendario-agenda__dia--con" : ""}${activo ? " calendario-agenda__dia--activo" : ""}`;
                                            return (
                                                <td key={d.fecha}>
                                                    {con ? (
                                                        <button type="button" className={clase} aria-pressed={activo} onClick={() => setElegido(d.fecha)}
                                                            aria-label={`${d.numero} de ${nombreMes(mes.mes).toLowerCase()}, ${d.actividades.length} ${d.actividades.length === 1 ? "actividad" : "actividades"}`}>
                                                            <span className="calendario-agenda__numero">{d.numero}</span>
                                                            <span className="calendario-agenda__puntos" aria-hidden="true">
                                                                {d.actividades.slice(0, 3).map((a) => <span key={a.sesionId ?? a.id} className={`calendario-agenda__punto calendario-agenda__punto--${a.categoria}`} />)}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span className={clase}><span className="calendario-agenda__numero">{d.numero}</span></span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <aside className="calendario-agenda__panel" aria-live="polite">
                            {dia ? <>
                                <p className="calendario-agenda__semana">{diaLargo(dia.fecha).semana}</p>
                                <h3>{diaLargo(dia.fecha).texto}</h3>
                                <p className="calendario-agenda__cuenta">{dia.actividades.length} {dia.actividades.length === 1 ? "actividad" : "actividades"}</p>
                                <ul>
                                    {dia.actividades.map((a) => (
                                        <li key={a.sesionId ?? a.id}>
                                            <p className="calendario-agenda__categoria">
                                                <span className={`calendario-agenda__punto calendario-agenda__punto--${a.categoria as Categoria}`} />
                                                {nombreCategoria[a.categoria]} <strong>{a.horario.slice(0, 5)}</strong>
                                            </p>
                                            <h4>{a.titulo}</h4>
                                            <p className="calendario-agenda__lugar"><img src={pinClaro} alt="" />{a.lugar}</p>
                                            <Link to={`/eventos/${a.id}`} className="calendario-agenda__ver">Ver detalle <img src={flechaDorada} alt="" /></Link>
                                        </li>
                                    ))}
                                </ul>
                            </> : (
                                <>
                                    <h3>Sin actividades este mes</h3>
                                    <p className="calendario-agenda__cuenta">Cambia de mes para ver otras fechas.</p>
                                </>
                            )}
                            {sesion && <Link to="/proponer" className="calendario-agenda__proponer">+ Proponer un evento</Link>}
                        </aside>
                    </div>
                </section>
            </div>
        </PaginaPublica>
    );
}

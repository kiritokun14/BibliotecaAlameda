import { useState } from "react";
import { Link } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import { EncabezadoNoticias } from "../noticias/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { useSesion } from "../perfil/usarSesion";
import { diaInicial, diaLargo, moverMes, nombreCorto, nombreMes, semanasDelMes, type Categoria, type FiltroCategoria } from "./datosAgenda";
import { Vacio } from "./Agenda";
import { BarraEventos, TarjetaParticipa } from "./piezas";
import "../noticias/Noticias.css";
import "../perfil/Perfil.css";
import "./Agenda.css";

// Eventos · calendario (/eventos/calendario), con la misma página que la agenda (Aldahir, 20 nov 2026).
// Franja compacta → la barra de la agenda (tipos de actividad | «Ver como: Lista · Calendario»; el tipo también filtra
// el mes) → «Mes anterior · mes · Mes siguiente» → el mes en tarjeta blanca | el día elegido en tarjeta verde con sus
// actividades (si son varias, su lista se desplaza por dentro) → «Participa» en franja a todo lo ancho. Sin contadores.
const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// «LUNES» → «Lunes» (sin mayúsculas sostenidas)
const sinMayusculas = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

export default function CalendarioActividades() {
    const sesion = useSesion();
    const hoy = fechaHoyTepic();
    const [inicial] = useState(() => { const [a, m] = hoy.split("-").map(Number); return { anio: a, mes: m }; });
    const [mes, setMes] = useState(inicial);
    const [filtro, setFiltro] = useState<FiltroCategoria>("todas");
    const desde = `${mes.anio}-${String(mes.mes).padStart(2, "0")}-01`;
    const hasta = `${mes.anio}-${String(mes.mes).padStart(2, "0")}-${new Date(mes.anio, mes.mes, 0).getDate()}`;
    const { actividades, cargando, error, reintentar } = useAgendaPublica(desde, hasta);
    const visibles = actividades.filter((a) => filtro === "todas" || a.categoria === filtro);
    const semanas = semanasDelMes(mes.anio, mes.mes, visibles);
    const [elegido, setElegido] = useState<string | null>(null);
    const fechaElegida = elegido ?? diaInicial(semanas, hoy);
    const dia = semanas.flat().find((d) => d.fecha === fechaElegida && d.delMes && d.actividades.length > 0) ?? null;

    function cambiarMes(paso: number) { setMes(moverMes(mes.anio, mes.mes, paso)); setElegido(null); }
    function cambiarTipo(f: FiltroCategoria) { setFiltro(f); setElegido(null); }

    return (
        <PaginaPublica>
            <EncabezadoNoticias etiqueta="Eventos" icono={iconosSeccion.eventos} compacto
                titulo={<>Calendario de <span>{nombreMes(mes.mes).toLowerCase()}</span></>} texto="Toca un día marcado para ver sus actividades." />

            <section className="noticias-seccion noticias-pagina eventos-pagina">
                <div className="noticias-contenedor">
                    <BarraEventos filtro={filtro} alElegir={cambiarTipo} vista="calendario" />

                    {error ? <Vacio titulo="No pudimos cargar el calendario" texto={error} accion="Reintentar" alAccionar={reintentar} error /> : (
                        <div className="evento-calendario">
                            <section className="evento-calendario__mes-tarjeta" aria-labelledby="titulo-mes">
                                <div className="evento-calendario__mes">
                                    <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => cambiarMes(-1)}>Mes anterior</button>
                                    <h2 id="titulo-mes" aria-live="polite">{nombreMes(mes.mes)} {mes.anio}</h2>
                                    <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => cambiarMes(1)}>Mes siguiente</button>
                                </div>
                                {cargando ? <EsqueletoLista texto="Cargando calendario…" /> : (
                                    <table className="calendario-agenda__tabla">
                                        <caption className="solo-lectores">Actividades de {nombreMes(mes.mes).toLowerCase()} {mes.anio}</caption>
                                        <thead><tr>{diasSemana.map((d) => <th key={d} scope="col">{d}</th>)}</tr></thead>
                                        <tbody>
                                            {semanas.map((semana) => (
                                                <tr key={semana[0].fecha}>
                                                    {semana.map((d) => {
                                                        const con = d.delMes && d.actividades.length > 0;
                                                        const activo = con && d.fecha === fechaElegida;
                                                        const clase = `calendario-agenda__dia${d.delMes ? "" : " calendario-agenda__dia--fuera"}${con ? " calendario-agenda__dia--con" : ""}${activo ? " calendario-agenda__dia--activo" : ""}${d.fecha === hoy ? " calendario-agenda__dia--hoy" : ""}`;
                                                        return (
                                                            <td key={d.fecha}>
                                                                {con ? (
                                                                    <button type="button" className={clase} aria-pressed={activo} onClick={() => setElegido(d.fecha)}
                                                                        aria-label={`${d.numero} de ${nombreMes(mes.mes).toLowerCase()}, con actividades`}>
                                                                        <span className="calendario-agenda__numero">{d.numero}</span>
                                                                        <span className="calendario-agenda__puntos" aria-hidden="true">
                                                                            {d.actividades.slice(0, 3).map((a) => <span key={a.sesionId ?? a.id} className={`calendario-agenda__punto calendario-agenda__punto--${a.categoria}`} />)}
                                                                        </span>
                                                                    </button>
                                                                ) : <span className={clase}><span className="calendario-agenda__numero">{d.numero}</span></span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>

                            <div className="evento-calendario__lateral">
                                <aside className="evento-calendario__dia" aria-live="polite" key={dia?.fecha ?? "sin-dia"}>
                                    {dia ? <>
                                        <p className="evento-calendario__semana">{sinMayusculas(diaLargo(dia.fecha).semana)}</p>
                                        <h3>{diaLargo(dia.fecha).texto}</h3>
                                        <ul>
                                            {dia.actividades.map((a) => (
                                                <li key={a.sesionId ?? a.id}>
                                                    <p className="evento-calendario__tipo">
                                                        <span className={`calendario-agenda__punto calendario-agenda__punto--${a.categoria as Categoria}`} />
                                                        {nombreCorto[a.categoria]} · {a.horario} h
                                                    </p>
                                                    <h4>{a.titulo}</h4>
                                                    <p className="evento-calendario__lugar">{a.lugar}</p>
                                                    <Link to={`/eventos/${a.id}`} className="perfil-boton perfil-boton--chico evento-calendario__ver">Ver detalle</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </> : <>
                                        <p className="evento-calendario__semana">{nombreMes(mes.mes)}</p>
                                        <h3>{filtro === "todas" ? "Sin actividades este mes" : "Sin actividades de este tipo"}</h3>
                                        <p className="evento-calendario__lugar">{filtro === "todas" ? "Cambia de mes para ver otras fechas." : "Elige otro tipo o cambia de mes."}</p>
                                    </>}
                                </aside>
                            </div>
                        </div>
                    )}
                    <TarjetaParticipa sesion={!!sesion} horizontal />
                </div>
            </section>
        </PaginaPublica>
    );
}

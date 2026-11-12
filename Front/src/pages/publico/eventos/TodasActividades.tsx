import { useCallback, useMemo, useState } from "react";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import { Link } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { useSesion } from "../perfil/usarSesion";
import { Fila, TarjetaActividad, TarjetaProponer } from "./Agenda";
import {
    agruparPorMes, filtrarTodas, filtrosCategoria, filtrosVacios,
    type Disponibilidad, type FiltrosAgenda, type Horario,
} from "./datosAgenda";
import "./Agenda.css";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import cuadriculaBlanca from "../../../assets/noticias/vista-cuadricula-blanca.svg";
import cuadriculaVerde from "../../../assets/noticias/vista-cuadricula-verde.svg";
import listaBlanca from "../../../assets/noticias/vista-lista-blanca.svg";
import listaVerde from "../../../assets/noticias/vista-lista-verde.svg";
import iconoVistaCalendario from "../../../assets/eventos/vista-calendario.svg";

// T-052 · «Todas las actividades» (Figma A-02, 476:11303 tarjetas, 534:16014 lista, 535:16031 filtros, 535:16547 fecha).
// La búsqueda y los filtros se aplican sobre las sesiones publicadas del servidor.
type Vista = "tarjetas" | "lista";

const OPCIONES_DISPONIBILIDAD = [{ valor: "", texto: "Todas" }, { valor: "abierta", texto: "Solo con inscripción abierta" }];
const OPCIONES_HORARIO = [{ valor: "todo", texto: "Todo el día" }, { valor: "manana", texto: "Mañana" }, { valor: "tarde", texto: "Tarde" }];

export default function TodasActividades() {
    const sesion = useSesion();
    const [filtros, setFiltros] = useState<FiltrosAgenda>(filtrosVacios);
    const [vista, setVista] = useState<Vista>("tarjetas");
    const hoy = fechaHoyTepic();
    const { actividades, cargando, error, reintentar } = useAgendaPublica();

    const resultados = useMemo(() => filtrarTodas(actividades, filtros, hoy, new Set()), [actividades, filtros, hoy]);
    const grupos = agruparPorMes(resultados, hoy);
    const buscar = useCallback((texto: string) => setFiltros((f) => ({ ...f, texto })), []);

    function limpiarTodo() { setFiltros(filtrosVacios); }

    const meses = grupos.map((g) => g.titulo.split(" ")[0].toLowerCase());
    const resumen = resultados.length
        ? `Mostrando ${resultados.length} ${resultados.length === 1 ? "sesión" : "sesiones"}${meses.length ? ` de ${meses.join(" y ")}` : ""}`
        : "No encontramos actividades con esos filtros";

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={{ texto: "Volver a Eventos y actividades", ruta: "/eventos" }} etiqueta="Eventos y actividades"
                titulo={<>Todas las <span>actividades</span></>} texto="Próximas y pasadas, ordenadas por fecha." />

            <div className="agenda-cuerpo">
                {error && <p role="alert">{error} <button onClick={reintentar}>Reintentar</button></p>}
                {sesion && <TarjetaProponer />}

                <BarraFiltros
                    etiquetaBusqueda="Buscar actividades"
                    marcador="Busca un tema, taller o club…"
                    texto={filtros.texto}
                    alBuscar={buscar}
                    grupos={[
                        { etiqueta: "Tipo de actividad", opciones: filtrosCategoria, activa: filtros.categoria,
                            alElegir: (valor) => setFiltros((f) => ({ ...f, categoria: valor as FiltrosAgenda["categoria"] })) },
                        { etiqueta: "Horario", opciones: OPCIONES_HORARIO, activa: filtros.horario,
                            alElegir: (valor) => setFiltros((f) => ({ ...f, horario: valor as Horario })) },
                        { etiqueta: "Inscripción", opciones: OPCIONES_DISPONIBILIDAD, activa: filtros.disponibilidad ?? "",
                            alElegir: (valor) => setFiltros((f) => ({ ...f, disponibilidad: (valor || null) as Disponibilidad | null })) },
                    ]}
                    fecha={{ etiqueta: "Día", valor: filtros.fecha, alCambiar: (fecha) => setFiltros((f) => ({ ...f, fecha })) }}
                    alLimpiar={limpiarTodo}
                />

                <div className="agenda-resumen">
                    <p aria-live="polite">{resumen}</p>
                    <div className="selector-vista" role="group" aria-label="Forma de ver las actividades">
                        {(["tarjetas", "lista"] as const).map((v) => {
                            const activa = vista === v;
                            const icono = v === "tarjetas" ? (activa ? cuadriculaBlanca : cuadriculaVerde) : (activa ? listaBlanca : listaVerde);
                            return (
                                <button key={v} type="button" aria-pressed={activa} onClick={() => setVista(v)}
                                    className={`selector-vista__opcion${activa ? " selector-vista__opcion--activa" : ""}`}>
                                    <img src={icono} alt="" />{v === "tarjetas" ? "Tarjetas" : "Lista"}
                                </button>
                            );
                        })}
                        <Link to="/eventos/calendario" className="selector-vista__opcion">
                            <img src={iconoVistaCalendario} alt="" />Calendario
                        </Link>
                    </div>
                </div>

                {cargando ? <EsqueletoTarjetas cantidad={6} texto="Cargando actividades…" /> : grupos.length ? grupos.map((g) => (
                    <section key={g.clave} className="agenda-grupo" aria-labelledby={`mes-${g.clave}`}>
                        <div className="agenda-grupo__encabezado">
                            <h2 id={`mes-${g.clave}`}>{g.titulo}</h2>
                            <span className="agenda-grupo__chip">{g.pasado ? "Pasadas" : "Próximas"} · {g.actividades.length}</span>
                        </div>
                        {vista === "tarjetas"
                            ? <ul className="agenda-tarjetas">{g.actividades.map((a) => <li key={a.sesionId ?? a.id}><TarjetaActividad actividad={a} hoy={hoy} /></li>)}</ul>
                            : <ul className="agenda-filas">{g.actividades.map((a) => <li key={a.sesionId ?? a.id}><Fila actividad={a} /></li>)}</ul>}
                    </section>
                )) : (
                    <div className="agenda-vacio" role="status">
                        <h3>No encontramos actividades</h3>
                        <p>Prueba con otra palabra, otra fecha o quita algunos filtros.</p>
                        <button type="button" className="agenda-boton agenda-boton--verde" onClick={limpiarTodo}>Limpiar búsqueda y filtros</button>
                    </div>
                )}
                <p className="agenda-volver"><Link to="/eventos">Volver a Eventos y actividades</Link></p>
            </div>
        </PaginaPublica>
    );
}

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import { EncabezadoNoticias } from "../noticias/piezas";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import { useSesion } from "../perfil/usarSesion";
import {
    agruparPorMes, filtrarTodas, filtrosCategoria, filtrosVacios,
    type Disponibilidad, type FiltrosAgenda, type Horario,
} from "./datosAgenda";
import { Vacio } from "./Agenda";
import { ProponerEvento, TarjetaEvento } from "./piezas";
import "../noticias/Noticias.css";
import "../perfil/Perfil.css";
import "./Agenda.css";
import cuadriculaBlanca from "../../../assets/noticias/vista-cuadricula-blanca.svg";
import cuadriculaVerde from "../../../assets/noticias/vista-cuadricula-verde.svg";
import listaBlanca from "../../../assets/noticias/vista-lista-blanca.svg";
import listaVerde from "../../../assets/noticias/vista-lista-verde.svg";

// Eventos · todas las actividades (/eventos/todas), como «Todas las noticias» (Aldahir, 20 nov 2026).
// Franja compacta → panel de «Filtros» (búsqueda, tipo, horario, inscripción y día) → «Actividades» con la vista
// Cuadrícula | Lista y el enlace al calendario → un grupo por mes con su etiqueta (sin contadores) y sus tarjetas.
type Vista = "cuadricula" | "lista";
const OPCIONES_DISPONIBILIDAD = [{ valor: "", texto: "Todas" }, { valor: "abierta", texto: "Solo con inscripción abierta" }];
const OPCIONES_HORARIO = [{ valor: "todo", texto: "Todo el día" }, { valor: "manana", texto: "Mañana" }, { valor: "tarde", texto: "Tarde" }];

export default function TodasActividades() {
    const sesion = useSesion();
    const [filtros, setFiltros] = useState<FiltrosAgenda>(filtrosVacios);
    const [vista, setVista] = useState<Vista>("cuadricula");
    const hoy = fechaHoyTepic();
    const { actividades, cargando, error, reintentar } = useAgendaPublica();

    const resultados = useMemo(() => filtrarTodas(actividades, filtros, hoy, new Set()), [actividades, filtros, hoy]);
    const grupos = agruparPorMes(resultados, hoy);
    const buscar = useCallback((texto: string) => setFiltros((f) => ({ ...f, texto })), []);
    const limpiarTodo = () => setFiltros(filtrosVacios);

    return (
        <PaginaPublica>
            <EncabezadoNoticias etiqueta="Eventos" icono={iconosSeccion.eventos} compacto
                titulo={<>Todas las <span>actividades</span></>} texto="Próximas y pasadas, ordenadas por fecha. Busca por tema, tipo, horario o día." />

            <section className="noticias-seccion noticias-seccion--archivo noticias-pagina eventos-pagina">
                <div className="noticias-contenedor">
                    {sesion && <ProponerEvento />}

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

                    <div className="noticias-titulo noticias-titulo--archivo">
                        <EtiquetaPerfil icono={iconosSeccion.eventos}>Actividades</EtiquetaPerfil>
                        <div className="noticias-titulo__resumen">
                            <p aria-live="polite" className="solo-lectores">{resultados.length} {resultados.length === 1 ? "sesión" : "sesiones"}</p>
                            <div className="selector-vista" role="group" aria-label="Forma de ver las actividades">
                                {(["cuadricula", "lista"] as const).map((v) => {
                                    const activa = vista === v;
                                    const icono = v === "cuadricula" ? (activa ? cuadriculaBlanca : cuadriculaVerde) : (activa ? listaBlanca : listaVerde);
                                    return (
                                        <button key={v} type="button" aria-pressed={activa} onClick={() => setVista(v)}
                                            className={`selector-vista__opcion${activa ? " selector-vista__opcion--activa" : ""}`}>
                                            <img src={icono} alt="" />{v === "cuadricula" ? "Cuadrícula" : "Lista"}
                                        </button>
                                    );
                                })}
                                <Link to="/eventos/calendario" className="selector-vista__opcion">Calendario</Link>
                            </div>
                        </div>
                    </div>

                    {cargando ? <EsqueletoTarjetas cantidad={6} texto="Cargando actividades…" />
                        : error ? <Vacio titulo="No pudimos cargar las actividades" texto={error} accion="Reintentar" alAccionar={reintentar} error />
                        : grupos.length === 0 ? <Vacio titulo="No encontramos actividades" texto="Prueba con otra palabra, otra fecha o quita algunos filtros." accion="Limpiar búsqueda y filtros" alAccionar={limpiarTodo} />
                        : grupos.map((g) => (
                            <section key={g.clave} className="evento-grupo" aria-labelledby={`mes-${g.clave}`}>
                                <div className="evento-grupo__encabezado">
                                    <h2 id={`mes-${g.clave}`}>{g.titulo}</h2>
                                    <span>{g.pasado ? "Ya pasaron" : "Próximas"}</span>
                                </div>
                                <ul className={`noticias-archivo noticias-archivo--${vista}`}>
                                    {g.actividades.map((a) => <li key={a.sesionId ?? a.id}><TarjetaEvento actividad={a} hoy={hoy} vista={vista} /></li>)}
                                </ul>
                            </section>
                        ))}
                </div>
            </section>
        </PaginaPublica>
    );
}

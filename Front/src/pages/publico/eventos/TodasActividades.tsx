import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { CalendarioFecha, ChipCategoria, EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { useSesion } from "../perfil/usarSesion";
import { Fila, TarjetaProponer } from "./Agenda";
import {
     agruparPorMes, estadoActividad, fechaCaja, filtrarTodas, filtrosCategoria, filtrosVacios, nombreCorto,
    type ActividadAgenda, type Disponibilidad, type FiltrosAgenda, type Horario,
} from "./datosAgenda";
import "./Agenda.css";
import { useAgendaPublica } from "../../../servicios/usarAgendaPublica";
import { fechaHoyTepic } from "../../../servicios/propuestasUsuario";
import iconoBuscar from "../../../assets/noticias/buscar.svg";
import iconoBuscarBlanco from "../../../assets/noticias/buscar-blanco.svg";
import iconoCalendario from "../../../assets/noticias/calendario.svg";
import iconoFiltros from "../../../assets/noticias/filtros.svg";
import chevronArriba from "../../../assets/noticias/chevron-arriba.svg";
import chevronAbajo from "../../../assets/noticias/chevron-abajo.svg";
import cuadriculaBlanca from "../../../assets/noticias/vista-cuadricula-blanca.svg";
import cuadriculaVerde from "../../../assets/noticias/vista-cuadricula-verde.svg";
import listaBlanca from "../../../assets/noticias/vista-lista-blanca.svg";
import listaVerde from "../../../assets/noticias/vista-lista-verde.svg";
import flechaVerde from "../../../assets/noticias/flecha-verde.svg";
import relojTarjeta from "../../../assets/eventos/tarjeta-reloj.svg";
import pinTarjeta from "../../../assets/eventos/tarjeta-pin.svg";
import iconoVistaCalendario from "../../../assets/eventos/vista-calendario.svg";

// T-052 · «Todas las actividades» (Figma A-02, 476:11303 tarjetas, 534:16014 lista, 535:16031 filtros, 535:16547 fecha).
// La búsqueda y los filtros se aplican sobre las sesiones publicadas del servidor.
type Vista = "tarjetas" | "lista";

export default function TodasActividades() {
    const sesion = useSesion();
    const [texto, setTexto] = useState("");
    const [filtros, setFiltros] = useState<FiltrosAgenda>(filtrosVacios);
    const [borrador, setBorrador] = useState(filtrosVacios);
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [calendarioAbierto, setCalendarioAbierto] = useState(false);
    const [vista, setVista] = useState<Vista>("tarjetas");
    const hoy = fechaHoyTepic();
    const { actividades, cargando, error, reintentar } = useAgendaPublica();

    const resultados = useMemo(() => filtrarTodas(actividades, filtros, hoy, new Set()), [actividades, filtros, hoy]);
    const grupos = agruparPorMes(resultados, hoy);
    const fechasConActividades = useMemo(() => new Set(actividades.map((a) => a.fecha)), [actividades]);
    const cerrarCalendario = useCallback(() => setCalendarioAbierto(false), []);

    function buscar(e: FormEvent) { e.preventDefault(); setFiltros((f) => ({ ...f, texto })); }
    function abrirPanel() { setBorrador(filtros); setPanelAbierto((x) => !x); setCalendarioAbierto(false); }
    function aplicarPanel() {
        setFiltros((f) => ({ ...f, categoria: borrador.categoria, disponibilidad: borrador.disponibilidad, horario: borrador.horario }));
        setPanelAbierto(false);
    }
    function limpiarTodo() { setTexto(""); setFiltros(filtrosVacios); setBorrador(filtrosVacios); }

    const cantidadFiltros = [filtros.categoria !== "todas", filtros.disponibilidad, filtros.horario !== "todo", filtros.fecha].filter(Boolean).length;
    const meses = grupos.map((g) => g.titulo.split(" ")[0].toLowerCase());
    const resumen = resultados.length
        ? `Mostrando ${resultados.length} ${resultados.length === 1 ? "sesión" : "sesiones"}${meses.length ? ` de ${meses.join(" y ")}` : ""}`
        : "No encontramos actividades con esos filtros";

    const disponibilidades: { valor: Disponibilidad; texto: string }[] = [
        { valor: "abierta", texto: "Inscripción habilitada" },
    ];
    const horarios: { valor: Horario; texto: string }[] = [
        { valor: "todo", texto: "Todo el día" }, { valor: "manana", texto: "Mañana" }, { valor: "tarde", texto: "Tarde" },
    ];

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={{ texto: "Volver a Eventos y actividades", ruta: "/eventos" }} etiqueta="Eventos y actividades"
                titulo={<>Todas las <span>actividades</span></>} texto="Próximas y pasadas, ordenadas por fecha." />

            <div className="agenda-cuerpo">
                {cargando && <p role="status">Cargando actividades…</p>}
                {error && <p role="alert">{error} <button onClick={reintentar}>Reintentar</button></p>}
                {sesion && <TarjetaProponer />}

                <form className="buscador-noticias" role="search" onSubmit={buscar}>
                    <div className="buscador-noticias__fila">
                        <label className="buscador-noticias__campo buscador-noticias__campo--texto">
                            <span className="buscador-noticias__etiqueta">Buscar actividades</span>
                            <span className="buscador-noticias__entrada">
                                <img src={iconoBuscar} alt="" />
                                <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un tema, taller o club…" maxLength={100} />
                            </span>
                        </label>
                        <div className="buscador-noticias__campo buscador-noticias__campo--fecha">
                            <span className="buscador-noticias__etiqueta" id="etiqueta-fecha-agenda">Fecha exacta</span>
                            <button type="button" aria-labelledby="etiqueta-fecha-agenda valor-fecha-agenda" aria-expanded={calendarioAbierto}
                                aria-controls="calendario-agenda" data-abre-calendario
                                className={`buscador-noticias__entrada buscador-noticias__entrada--boton${filtros.fecha ? " buscador-noticias__entrada--llena" : ""}`}
                                onClick={() => { setCalendarioAbierto((x) => !x); setPanelAbierto(false); }}>
                                <img src={iconoCalendario} alt="" />
                                <span id="valor-fecha-agenda">{filtros.fecha ? filtros.fecha.split("-").reverse().join("/") : "dd/mm/aaaa"}</span>
                            </button>
                            {calendarioAbierto && (
                                <CalendarioFecha id="calendario-agenda" inicial={filtros.fecha} fechasConNoticias={fechasConActividades}
                                    alCerrar={cerrarCalendario} alAplicar={(fecha) => { setFiltros((f) => ({ ...f, fecha })); setCalendarioAbierto(false); }} />
                            )}
                        </div>
                        <button type="button" className={`boton-filtros-noticias${panelAbierto ? " boton-filtros-noticias--abierto" : ""}`}
                            aria-expanded={panelAbierto} aria-controls="panel-filtros-agenda" onClick={abrirPanel}>
                            <img src={iconoFiltros} alt="" />
                            Filtros
                            {cantidadFiltros > 0 && <span className="boton-filtros-noticias__contador" aria-label={`${cantidadFiltros} aplicados`}>{cantidadFiltros}</span>}
                            <img src={panelAbierto ? chevronArriba : chevronAbajo} alt="" />
                        </button>
                        <button type="submit" className="boton-noticias boton-noticias--verde boton-noticias--alto">Buscar <img src={iconoBuscarBlanco} alt="" /></button>
                    </div>

                    {panelAbierto && (
                        <div className="panel-filtros-noticias" id="panel-filtros-agenda">
                            <div className="panel-filtros-noticias__grupo" role="group" aria-labelledby="grupo-categoria-agenda">
                                <p id="grupo-categoria-agenda" className="buscador-noticias__etiqueta">Categoría</p>
                                <div className="filtro-categorias">
                                    {filtrosCategoria.map((c) => (
                                        <ChipCategoria key={c.valor} activa={borrador.categoria === c.valor} alPresionar={() => setBorrador({ ...borrador, categoria: c.valor })}>{c.texto}</ChipCategoria>
                                    ))}
                                </div>
                            </div>
                            <div className="panel-filtros-noticias__grupo" role="group" aria-labelledby="grupo-disponibilidad-agenda">
                                <p id="grupo-disponibilidad-agenda" className="buscador-noticias__etiqueta">Disponibilidad</p>
                                <div className="filtro-categorias">
                                    {disponibilidades.map((d) => (
                                        <ChipCategoria key={d.valor} activa={borrador.disponibilidad === d.valor}
                                            alPresionar={() => setBorrador({ ...borrador, disponibilidad: borrador.disponibilidad === d.valor ? null : d.valor })}>{d.texto}</ChipCategoria>
                                    ))}
                                </div>
                            </div>
                            <div className="panel-filtros-noticias__grupo" role="group" aria-labelledby="grupo-horario-agenda">
                                <p id="grupo-horario-agenda" className="buscador-noticias__etiqueta">Horario</p>
                                <div className="filtro-categorias">
                                    {horarios.map((h) => (
                                        <ChipCategoria key={h.valor} activa={borrador.horario === h.valor} alPresionar={() => setBorrador({ ...borrador, horario: h.valor })}>{h.texto}</ChipCategoria>
                                    ))}
                                </div>
                            </div>
                            <div className="panel-filtros-noticias__pie">
                                <button type="button" className="enlace-noticias enlace-noticias--subrayado" onClick={() => setBorrador(filtrosVacios)}>Limpiar filtros</button>
                                <button type="button" className="boton-noticias boton-noticias--verde boton-noticias--chico" onClick={aplicarPanel}>Aplicar filtros</button>
                            </div>
                        </div>
                    )}
                </form>

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

                {grupos.length ? grupos.map((g) => (
                    <section key={g.clave} className="agenda-grupo" aria-labelledby={`mes-${g.clave}`}>
                        <div className="agenda-grupo__encabezado">
                            <h2 id={`mes-${g.clave}`}>{g.titulo}</h2>
                            <span className="agenda-grupo__chip">{g.pasado ? "Pasadas" : "Próximas"} · {g.actividades.length}</span>
                        </div>
                        {vista === "tarjetas"
                            ? <ul className="agenda-tarjetas">{g.actividades.map((a) => <li key={a.sesionId ?? a.id}><Tarjeta actividad={a} hoy={hoy} /></li>)}</ul>
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

const textoEstado = { abierta: "Inscripción abierta", cupo: "Cupo completo", finalizada: "Finalizada" };

function Tarjeta({ actividad: a, hoy }: { actividad: ActividadAgenda; hoy: string }) {
    const { dia, mes } = fechaCaja(a.fecha);
    const estado = estadoActividad(a, hoy);
    return (
        <Link to={`/eventos/${a.id}`} className="agenda-tarjeta">
            <div className="agenda-tarjeta__imagen">
                <img src={a.imagen} alt="" />
                <span className="agenda-tarjeta__fecha"><strong>{dia}</strong>{mes}</span>
                <span className="agenda-tarjeta__referencia">Imagen ilustrativa</span>
            </div>
            <div className="agenda-tarjeta__contenido">
                <p className="agenda-tarjeta__meta">
                    <span className={`agenda-pastilla agenda-pastilla--${a.categoria}`}>{nombreCorto[a.categoria]}</span>
                    <span className={`agenda-pastilla agenda-pastilla--${estado}`}>{a.cancelada ? 'Cancelada' : estado === 'finalizada' ? textoEstado[estado] : a.inscripcionAbierta === false ? 'Consulta al personal' : textoEstado[estado]}</span>
                </p>
                <h3>{a.titulo}</h3>
                <p className="agenda-tarjeta__datos">
                    <span><img src={relojTarjeta} alt="" />{a.horario}</span>
                    <span><img src={pinTarjeta} alt="" />{a.lugar}</span>
                </p>
                <span className="agenda-tarjeta__enlace">{estado === "finalizada" ? "Ver resumen" : "Ver detalle"} <img src={flechaVerde} alt="" /></span>
            </div>
        </Link>
    );
}

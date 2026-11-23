// Actividades › Asistencia: actividades por periodo (Figma 570:24906, sin actividades hoy 570:28074, sin resultados 570:28284),
// pasar lista (570:25383), lista cerrada (570:26467) y resumen del mes (570:27596).
// Rehecho con las piezas del panel (22 nov 2026); los datos siguen siendo de ejemplo (asistencia.ts).
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Ventana } from "../Ventana";
import { Aviso, Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Segmentado, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { fechaCorta, obtenerActividad, useActividades, type Actividad } from "./datos";
import { useInscripciones } from "./inscripciones";
import { hoyISO } from "./salas";
import { semanaDe, diaLargo } from "./calendario";
import {
    agregarSinInscripcion, anotar, cerrarLista, conteo, corregir, estadoLista, guardarAsistencia, listaDe, lugaresParaExtras, marcar, NOMBRE_MARCA, personasDe, useAsistencia, type Marca,
} from "./asistencia";
import { BASE_ASISTENCIA } from "./utiles";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";
import modalLista from "../../../assets/admin/modal-list.svg";

const TONO_MARCA: Record<Marca, TonoEstado> = { presente: "verde", ausente: "guinda", sin: "gris" };
type Periodo = "hoy" | "semana" | "anteriores";
const porcentaje = (p: number, t: number) => (t ? Math.round((p / t) * 100) : 0);
const RESUMEN = `${BASE_ASISTENCIA}/resumen`;
const partes = (iso: string) => { const [d, m] = fechaCorta(iso).split(" "); return [d, (m ?? "").replace(".", "")]; };
const tonoPct = (p: number) => (p >= 70 ? "verde" : p >= 40 ? "dorado" : "guinda");

function Asistencia() {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const periodo = (["hoy", "semana", "anteriores"].includes(params.get("ver") ?? "") ? params.get("ver") : "hoy") as Periodo;
    const hoy = hoyISO();
    const semana = semanaDe(hoy);
    const conLista = actividades.filter((a) => a.inscripcion && (a.estado === "publicada" || a.estado === "cancelada"));
    const enPeriodo = (a: Actividad, p: Periodo) => (p === "hoy" ? a.fecha === hoy : p === "semana" ? a.fecha >= semana[0] && a.fecha <= `${semana[4]}~` : a.fecha < hoy);
    const texto = busqueda.trim().toLowerCase();
    const estado = (a: Actividad) => estadoLista(a.folio, new Date(), listas);
    const filas = conLista.filter((a) => enPeriodo(a, periodo) && (!texto || a.nombre.toLowerCase().includes(texto)) && (!estadoFiltro || estado(a).clave === estadoFiltro))
        .sort((a, b) => (periodo === "anteriores" ? b.fecha.localeCompare(a.fecha) : (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)));
    const deHoy = conLista.filter((a) => a.fecha === hoy);
    const porPasar = conLista.filter((a) => estado(a).clave === "pendiente");
    const cerradas = conLista.filter((a) => estado(a).clave === "cerrada");
    const promedio = porcentaje(cerradas.reduce((s, a) => s + conteo(a.folio, listas).presentes, 0), cerradas.reduce((s, a) => s + conteo(a.folio, listas).inscritos + conteo(a.folio, listas).sinInscripcion, 0));
    const elegir = (p: Periodo) => setParams(p === "hoy" ? {} : { ver: p });
    const limpiar = () => { setBusqueda(""); setEstadoFiltro(""); elegir("hoy"); };
    const titulos: Record<Periodo, string> = { hoy: "Actividades de hoy", semana: "Actividades de esta semana", anteriores: "Actividades anteriores" };
    const ultimas = cerradas.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 4);
    const proximas = conLista.filter((a) => a.fecha >= hoy && a.estado !== "cancelada").sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)).slice(0, 3);

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Asistencia" texto="Pasa lista a las personas inscritas el día de la actividad y cierra la lista al terminar.">
                    <Cifra icono="hoy" valor={deHoy.length} texto={deHoy.length === 1 ? "actividad hoy" : "actividades hoy"} activa={periodo === "hoy"} alPresionar={() => elegir("hoy")} />
                    <Cifra icono="reloj" tono="vino" valor={porPasar.length} texto="por pasar lista" activa={estadoFiltro === "pendiente"} alPresionar={() => { setEstadoFiltro(estadoFiltro === "pendiente" ? "" : "pendiente"); if (periodo !== "anteriores") elegir("anteriores"); }} />
                    <Cifra icono="estadisticas" valor={`${promedio}%`} texto="asistencia promedio" alPresionar={() => navigate(RESUMEN)} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="asistencia" id="asistencia-lista" titulo={titulos[periodo]} texto="Abre una actividad para marcar quién asistió" className="pz-pendientes">
                        <div className="pz-herramientas">
                            <Segmentado<Periodo> etiqueta="Periodo" valor={periodo} alCambiar={elegir} opciones={[
                                { valor: "hoy", texto: "Hoy", cantidad: deHoy.length },
                                { valor: "semana", texto: "Esta semana", cantidad: conLista.filter((a) => enPeriodo(a, "semana")).length },
                                { valor: "anteriores", texto: "Anteriores", cantidad: conLista.filter((a) => enPeriodo(a, "anteriores")).length },
                            ]} />
                            <Buscador etiqueta="Buscar actividad" placeholder="Nombre de la actividad" valor={busqueda} alCambiar={setBusqueda}>
                                <FiltrosAvanzados activos={estadoFiltro ? 1 : 0} alQuitar={() => setEstadoFiltro("")} grupos={[{ titulo: "Estado de la lista", valor: estadoFiltro, alCambiar: setEstadoFiltro, opciones: [
                                    { valor: "", texto: "Todas" }, { valor: "pendiente", texto: "Por pasar lista", cantidad: porPasar.length }, { valor: "cerrada", texto: "Lista cerrada", cantidad: cerradas.length },
                                    { valor: "futura", texto: "Aún no empieza" }, { valor: "cancelada", texto: "Cancelada" }] }]} />
                            </Buscador>
                        </div>
                        {filas.length === 0 ? (
                            texto || estadoFiltro
                                ? <Vacio icono="buscarCuenta" titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay actividades con este estado"} texto="Prueba con otra palabra, otro estado o cambia el periodo."
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                                : <Vacio icono="asistencia" titulo={periodo === "hoy" ? "No hay actividades hoy" : "No hay actividades en este periodo"} texto="Revisa las anteriores para pasar o corregir listas."
                                    accion={periodo !== "anteriores" ? <button type="button" className="pz-boton pz-boton--chico" onClick={() => elegir("anteriores")}>Ver anteriores</button> : undefined} />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label={titulos[periodo]}>
                                <ul className="pz-filas">
                                    {filas.map((a) => {
                                        const e = estado(a);
                                        const [d, m] = partes(a.fecha);
                                        const c = conteo(a.folio, listas);
                                        return (
                                            <li key={a.folio}>
                                                <article className={`pz-fila${e.clave === "pendiente" ? " pz-fila--espera" : ""}`}>
                                                    <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                    <div className="pz-fila__textos">
                                                        <h4 className="pz-fila__titulo">{a.nombre}</h4>
                                                        <p className="pz-fila__detalle"><span className="pz-fila__folio">{a.folio}</span><span>{a.inicio} h</span><span>{a.espacio}</span>
                                                            <span>{e.clave === "cerrada" ? `${c.presentes} de ${c.inscritos + c.sinInscripcion} asistieron` : `${a.inscritos} inscritos`}</span></p>
                                                    </div>
                                                    <Chip tono={e.tono as TonoEstado}>{e.texto}</Chip>
                                                    {e.clave === "cancelada" ? <span className="pz-acciones__nota">Sin lista</span>
                                                        : <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className={`pz-boton pz-boton--chico${e.clave === "pendiente" ? "" : " pz-boton--contorno"}`}>{e.clave === "cerrada" ? "Ver lista" : e.clave === "pendiente" ? "Pasar lista" : "Ver inscritos"}<span className="solo-lectores"> {a.nombre}</span></Link>}
                                                </article>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className="pz-tarjeta__pie"><p aria-live="polite">{filas.length} {filas.length === 1 ? "actividad" : "actividades"}</p></div>
                    </Tarjeta>
                    <aside className="pz-lateral" aria-label="Próximas y últimas listas">
                        <Tarjeta icono="hoy" id="asistencia-proximas" titulo="Próximas listas" texto={proximas.length ? "Las siguientes actividades con inscripción" : "Nada programado"}>
                            {proximas.length ? (
                                <ul className="pz-actividades">
                                    {proximas.map((a) => {
                                        const [d, m] = partes(a.fecha);
                                        return (
                                            <li key={a.folio}>
                                                <span className="pz-actividades__hora"><strong>{d}</strong><span>{m}</span></span>
                                                <div className="pz-actividades__textos">
                                                    <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="pz-actividades__titulo pz-enlace-fila">{a.nombre}</Link>
                                                    <p className="pz-actividades__detalle">{a.inicio} h, {a.espacio}. {a.inscritos} inscritos</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <p className="pz-acciones__nota">Cuando se programe una actividad con inscripción, su lista aparecerá aquí.</p>}
                        </Tarjeta>
                        <Tarjeta icono="estadisticas" id="asistencia-ultimas" titulo="Últimas listas cerradas" texto={`${cerradas.length} ${cerradas.length === 1 ? "lista cerrada" : "listas cerradas"} en total`} className="pz-tarjeta--actividades">
                            {ultimas.length ? (
                                <ol className="pz-ranking">
                                    {ultimas.map((a) => {
                                        const c = conteo(a.folio, listas);
                                        const p = porcentaje(c.presentes, c.inscritos + c.sinInscripcion);
                                        return (
                                            <li key={a.folio}>
                                                <span className="pz-ranking__lugar" aria-hidden="true"><Icono nombre="asistencia" /></span>
                                                <div className="pz-ranking__textos">
                                                    <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="pz-ranking__nombre pz-enlace-fila">{a.nombre}</Link>
                                                    <span className={`pz-ranking__barra as-barra--${tonoPct(p)}`} aria-hidden="true"><span style={{ width: `${p}%` }} /></span>
                                                </div>
                                                <p className="pz-ranking__valor"><strong>{p}%</strong><span>{fechaCorta(a.fecha)}</span></p>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : <Vacio icono="asistencia" titulo="Aún no hay listas cerradas" texto="Al cerrar una lista verás aquí su asistencia." />}
                            <Link to={RESUMEN} className="pz-boton pz-boton--contorno pz-boton--chico cal-ver-dia">Resumen del mes</Link>
                        </Tarjeta>
                        <Plegable titulo="Cómo se pasa lista">
                            <ul>
                                <li>El día de la actividad abre su lista y marca a cada persona como presente o ausente.</li>
                                <li>Puedes guardar y seguir después; al terminar, cierra la lista.</li>
                                <li>Ya cerrada, un cambio es una corrección con motivo y queda en la bitácora.</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// Pasar lista (570:25383), error al guardar (570:25860), confirmar cierre (570:26348), agregar sin inscripción (570:27478);
// si la lista ya está cerrada: detalle (570:26909) y corregir (570:27370)
export function PasarLista() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useActividades();
    useInscripciones();
    const listas = useAsistencia();
    const [ventana, setVentana] = useState<null | "cerrar" | "agregar" | { id: string; persona: string }>(null);
    const [error, setError] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [nombre, setNombre] = useState("");
    const [contacto, setContacto] = useState("");
    const [nueva, setNueva] = useState<Marca>("presente");
    const [motivo, setMotivo] = useState("");
    const [errorCampo, setErrorCampo] = useState("");
    const [verMarca, setVerMarca] = useState<"todas" | Marca>("todas");
    const [buscarPersona, setBuscarPersona] = useState("");
    const a = obtenerActividad(folio);
    if (!a || !a.inscripcion) return <Navigate to={BASE_ASISTENCIA} replace />;
    const lista = listaDe(a.folio, listas);
    const cerrada = !!lista.cerrada;
    const personas = personasDe(a.folio);
    const c = conteo(a.folio, listas);
    const marcaDe = (id: string, extra: boolean): Marca => (extra ? "presente" : lista.marcas[id] ?? "sin");
    const libres = lugaresParaExtras(a.folio);
    const total = c.presentes + c.ausentes + c.sinMarcar;
    const avance = porcentaje(c.presentes + c.ausentes, total);
    const asistencia = porcentaje(c.presentes, c.inscritos + c.sinInscripcion);
    const textoPersona = buscarPersona.trim().toLowerCase();
    const visibles = personas.filter((p) => (verMarca === "todas" || marcaDe(p.id, p.extra) === verMarca) && (!textoPersona || p.persona.toLowerCase().includes(textoPersona)));

    async function guardar() {
        setGuardado(false);
        try { await guardarAsistencia(a!.folio); setError(false); setGuardado(true); }
        catch { setError(true); }
    }
    function abrirCorreccion(id: string, persona: string) {
        setNueva(marcaDe(id, false) === "presente" ? "ausente" : "presente");
        setMotivo(""); setErrorCampo(""); setVentana({ id, persona });
    }
    function marcarTodos(m: Marca) {
        personas.filter((p) => !p.extra && marcaDe(p.id, false) === "sin").forEach((p) => marcar(a!.folio, p.id, m));
        setGuardado(false);
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia", BASE_ASISTENCIA], [cerrada ? "Lista cerrada" : "Pasar lista"]]} />
            <div className="pz-pagina">
                <Encabezado titulo={a.nombre} texto={`${diaLargo(a.fecha)}, ${a.inicio} h, ${a.espacio}. ${c.inscritos} inscritos.`}>
                    <Cifra icono="check" valor={c.presentes} texto="presentes" />
                    <Cifra icono="alerta" tono="vino" valor={c.ausentes} texto="ausentes" />
                    <Cifra icono="reloj" valor={c.sinMarcar} texto="sin marcar" />
                </Encabezado>
                {error && <Aviso tono="error" titulo="No se pudo guardar la asistencia." texto="Revisa tu conexión. Tus marcas siguen en pantalla; inténtalo de nuevo." />}
                {guardado && <Aviso titulo="Asistencia guardada." texto="Puedes seguir marcando o cerrar la lista cuando termines." />}

                <div className="pz-columnas">
                    <Tarjeta icono="grupo" id="pasar-lista" titulo={cerrada ? "Registro de asistencia" : "Personas inscritas"} className="pz-pendientes"
                        texto={cerrada ? "Para cambiar una marca, usa «Corregir»: queda en la bitácora" : "Marca a cada persona; puedes guardar y seguir después"}
                        accion={!cerrada && c.sinMarcar > 0 ? <div className="pz-acciones pz-acciones--fila">
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => marcarTodos("presente")}>Pendientes a presentes</button>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => marcarTodos("ausente")}>Pendientes a ausentes</button>
                        </div> : undefined}>
                        {personas.length > 0 && <div className="pz-herramientas">
                            <Segmentado<"todas" | Marca> etiqueta="Ver por marca" valor={verMarca} alCambiar={setVerMarca} opciones={[
                                { valor: "todas", texto: "Todas", cantidad: personas.length },
                                ...(cerrada ? [] : [{ valor: "sin" as Marca, texto: "Sin marcar", cantidad: c.sinMarcar, urgente: true }]),
                                { valor: "presente", texto: "Presentes", cantidad: c.presentes },
                                { valor: "ausente", texto: "Ausentes", cantidad: c.ausentes },
                            ]} />
                            <Buscador etiqueta="Buscar persona" placeholder="Nombre de la persona" valor={buscarPersona} alCambiar={setBuscarPersona} />
                        </div>}
                        {personas.length === 0 ? <Vacio icono="grupo" titulo="No hay personas inscritas" texto="Puedes agregar a quien llegó sin inscripción." />
                            : visibles.length === 0 ? <Vacio icono="buscarCuenta" titulo="Nadie con ese filtro" texto="Prueba con otra marca u otro nombre."
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setVerMarca("todas"); setBuscarPersona(""); }}>Ver a todas</button>} /> : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de asistencia">
                                <ul className="pz-filas">
                                    {visibles.map((p) => {
                                        const m = marcaDe(p.id, p.extra);
                                        const n = personas.indexOf(p);
                                        return (
                                            <li key={p.id}>
                                                <article className={`pz-fila as-fila as-fila--${m}`}>
                                                    <span className="as-numero" aria-hidden="true">{String(n + 1).padStart(2, "0")}</span>
                                                    <div className="pz-fila__textos">
                                                        <h4 className="pz-fila__titulo">{p.persona}</h4>
                                                        {p.extra ? <p className="pz-fila__detalle"><span>Llegó sin inscripción</span></p>
                                                            : !cerrada && <input className="as-nota" placeholder="Nota (opcional)" aria-label={`Nota de ${p.persona}`} value={lista.notas[p.id] ?? ""} onChange={(e) => anotar(a.folio, p.id, e.target.value)} />}
                                                    </div>
                                                    {cerrada || p.extra ? <Chip tono={TONO_MARCA[m]}>{NOMBRE_MARCA[m]}</Chip> : (
                                                        <div className="pz-segmentado as-marcar" role="group" aria-label={`Asistencia de ${p.persona}`}>
                                                            {(["presente", "ausente"] as const).map((op) => (
                                                                <button key={op} type="button" aria-pressed={m === op} className={`pz-opcion as-marcar__${op}${m === op ? " pz-opcion--activa" : ""}`}
                                                                    onClick={() => { marcar(a.folio, p.id, op); setGuardado(false); }}>{NOMBRE_MARCA[op]}</button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {cerrada && !p.extra ? <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => abrirCorreccion(p.id, p.persona)}>Corregir<span className="solo-lectores"> {p.persona}</span></button> : <span aria-hidden="true" />}
                                                </article>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <div className="pz-tarjeta__pie"><p aria-live="polite">{visibles.length} de {personas.length} {personas.length === 1 ? "persona" : "personas"}</p></div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Avance de la lista">
                        <Tarjeta icono="asistencia" id="as-avance" titulo={cerrada ? "Lista cerrada" : "Avance de la lista"} className="pz-tarjeta--actividades"
                            texto={cerrada ? `Cerró ${lista.cerrada!.quien} el ${fechaCorta(lista.cerrada!.fecha)}` : `${avance}% marcada`}
                            accion={<Chip tono={cerrada ? "verde" : "dorado"}>{cerrada ? "Cerrada" : "Abierta"}</Chip>}>
                            <div className={`ins-medidor ins-medidor--${cerrada ? tonoPct(asistencia) : avance === 100 ? "verde" : "dorado"}`} style={{ ["--p" as string]: `${cerrada ? asistencia : avance}%` }} role="img"
                                aria-label={cerrada ? `${asistencia}% de asistencia` : `${avance}% de la lista marcada`}>
                                <span className="ins-medidor__centro"><strong>{cerrada ? asistencia : avance}%</strong><small>{cerrada ? "asistencia" : "marcada"}</small></span>
                            </div>
                            {c.sinInscripcion > 0 && <p className="pz-acciones__nota">{c.sinInscripcion} {c.sinInscripcion === 1 ? "persona llegó" : "personas llegaron"} sin inscripción.</p>}
                            {cerrada ? (
                                lista.correcciones.length > 0 && <ol className="pz-linea">
                                    {lista.correcciones.map((x) => (
                                        <li key={x.fecha + x.persona} className="pz-linea__paso pz-linea__paso--dorado">
                                            <span className="pz-linea__icono" aria-hidden="true"><Icono nombre="revision" /></span>
                                            <div className="pz-linea__textos">
                                                <p className="pz-linea__titulo">{x.persona}: de {NOMBRE_MARCA[x.de].toLowerCase()} a {NOMBRE_MARCA[x.a].toLowerCase()}</p>
                                                <p className="pz-linea__detalle">{x.quien}</p>
                                                <p className="pz-linea__nota">{x.motivo}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <div className="pz-acciones">
                                    <button type="button" className="pz-boton" onClick={() => setVentana("cerrar")}>Cerrar lista</button>
                                    <button type="button" className="pz-boton pz-boton--contorno" onClick={() => void guardar()}>Guardar y seguir</button>
                                    <button type="button" className="pz-boton pz-boton--contorno" onClick={() => { setNombre(""); setContacto(""); setErrorCampo(""); setVentana("agregar"); }}>Agregar persona sin inscripción</button>
                                </div>
                            )}
                            <Link to={BASE_ASISTENCIA} className="pz-enlace">Volver a Asistencia</Link>
                        </Tarjeta>
                    </aside>
                </div>
            </div>

            {ventana === "cerrar" && (
                <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Cerrar la lista de asistencia?"
                    texto={c.sinMarcar ? `Quedan ${c.sinMarcar} sin marcar: se registrarán como ausentes. Después, los cambios requieren una corrección con motivo.` : "Después de cerrarla, los cambios requieren una corrección con motivo."}
                    textoConfirmar="Cerrar lista" textoCancelar="Seguir editando"
                    alConfirmar={() => { cerrarLista(a.folio); navigate(`${BASE_ASISTENCIA}/${a.folio}/cerrada`); }}
                    alCerrar={() => setVentana(null)} />
            )}
            {ventana === "agregar" && (
                <Ventana tono="verde" icono={modalLista} titulo="Agregar persona sin inscripción"
                    texto={libres > 0 ? `Para quien llegó y hay lugar (${libres} de ${a.cupo} libres). Se cuenta como asistente.` : "No quedan lugares en esta actividad."}
                    textoConfirmar="Agregar y marcar presente" ocupada={libres <= 0} error={errorCampo}
                    alConfirmar={() => { if (!nombre.trim()) return setErrorCampo("Escribe el nombre completo."); agregarSinInscripcion(a.folio, nombre, contacto); setVentana(null); }}
                    alCerrar={() => setVentana(null)}>
                    <label className="pz-campo pz-campo--lleno"><span>Nombre completo <span className="contenidos-campo__obligatorio">*</span></span>
                        <input value={nombre} aria-invalid={!!errorCampo} onChange={(e) => { setNombre(e.target.value); setErrorCampo(""); }} /></label>
                    <label className="pz-campo pz-campo--lleno"><span>Contacto (opcional)</span>
                        <input value={contacto} onChange={(e) => setContacto(e.target.value)} /></label>
                </Ventana>
            )}
            {ventana && typeof ventana === "object" && (
                <Ventana tono="dorado" icono={modalInfo} titulo={`Corregir asistencia de ${ventana.persona}`}
                    texto={`Ahora: ${NOMBRE_MARCA[marcaDe(ventana.id, false)]}. El cambio queda en la bitácora con tu nombre, la fecha y el motivo.`}
                    textoConfirmar="Guardar corrección" error={errorCampo}
                    alConfirmar={() => { if (!motivo.trim()) return setErrorCampo("Escribe el motivo de la corrección."); corregir(a.folio, ventana.id, nueva, motivo); setVentana(null); }}
                    alCerrar={() => setVentana(null)}>
                    <Segmentado<Marca> etiqueta="Nueva asistencia" valor={nueva} alCambiar={setNueva} opciones={[{ valor: "presente", texto: NOMBRE_MARCA.presente }, { valor: "ausente", texto: NOMBRE_MARCA.ausente }]} />
                    <label className="pz-campo pz-campo--lleno"><span>Motivo de la corrección <span className="contenidos-campo__obligatorio">*</span></span>
                        <textarea rows={3} placeholder="Ej.: sí asistió, se marcó por error." value={motivo} aria-invalid={!!errorCampo} onChange={(e) => { setMotivo(e.target.value); setErrorCampo(""); }} /></label>
                </Ventana>
            )}
        </PanelLayout>
    );
}

export function ListaCerrada() {
    const { folio } = useParams();
    useActividades();
    const listas = useAsistencia();
    const a = obtenerActividad(folio);
    if (!a || !listaDe(a.folio, listas).cerrada) return <Navigate to={a ? `${BASE_ASISTENCIA}/${a.folio}` : BASE_ASISTENCIA} replace />;
    const c = conteo(a.folio, listas);
    const p = porcentaje(c.presentes, c.inscritos + c.sinInscripcion);
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia", BASE_ASISTENCIA], ["Lista cerrada"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Lista cerrada" texto="La asistencia quedó registrada.">
                    <Link to={BASE_ASISTENCIA} className="pz-boton">Volver a Asistencia</Link>
                </Encabezado>
                <Tarjeta icono="check" id="lista-cerrada" titulo={a.nombre} texto={`${diaLargo(a.fecha)}, ${a.inicio} h`} accion={<Chip tono="verde">Lista cerrada</Chip>}>
                    <div className="pz-envio-ok" role="status">
                        <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                        <p><strong>{c.presentes} presentes y {c.ausentes} ausentes.</strong> {p}% de asistencia.</p>
                    </div>
                    <div className="pz-acciones pz-acciones--fila">
                        <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver la lista</Link>
                        <Link to={RESUMEN} className="pz-boton pz-boton--contorno pz-boton--chico">Resumen del mes</Link>
                    </div>
                </Tarjeta>
            </div>
        </PanelLayout>
    );
}

export function ResumenAsistencia() {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    const hoy = hoyISO();
    const [anio, m] = hoy.slice(0, 7).split("-").map(Number);
    const pasadas = actividades.filter((a) => a.inscripcion && (a.estado === "publicada" || a.estado === "cancelada") && a.fecha <= hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const cerradas = pasadas.filter((a) => listaDe(a.folio, listas).cerrada);
    const asistentes = cerradas.reduce((s, a) => s + conteo(a.folio, listas).presentes, 0);
    const total = cerradas.reduce((s, a) => { const c = conteo(a.folio, listas); return s + c.inscritos + c.sinInscripcion; }, 0);
    const pendientes = pasadas.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "pendiente").length;
    const nombreMes = new Date(anio, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia", BASE_ASISTENCIA], ["Resumen del mes"]]} />
            <div className="pz-pagina">
                <Encabezado titulo={`Resumen de ${nombreMes}`} texto="Cómo ha ido la asistencia en las actividades ya realizadas. Las listas sin cerrar no cuentan en el promedio.">
                    <Cifra icono="estadisticas" valor={`${porcentaje(asistentes, total)}%`} texto="asistencia promedio" />
                    <Cifra icono="grupo" valor={asistentes} texto="asistentes" />
                    <Cifra icono="reloj" tono="vino" valor={pendientes} texto={pendientes === 1 ? "lista sin cerrar" : "listas sin cerrar"} />
                </Encabezado>
                <Tarjeta icono="asistencia" id="resumen-por-actividad" titulo="Por actividad" texto="De la más reciente a la más antigua" accion={<Link to={BASE_ASISTENCIA} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a Asistencia</Link>}>
                    {pasadas.length === 0 ? <Vacio icono="asistencia" titulo="Todavía no hay actividades realizadas" texto="Cuando se cierre una lista, aparecerá aquí." /> : (
                        <ul className="pz-filas">
                            {pasadas.map((a) => {
                                const e = estadoLista(a.folio, new Date(), listas);
                                const c = conteo(a.folio, listas);
                                const cerrada = !!listaDe(a.folio, listas).cerrada;
                                const p = porcentaje(c.presentes, c.inscritos + c.sinInscripcion);
                                const [d, mes] = partes(a.fecha);
                                return (
                                    <li key={a.folio}>
                                        <article className="pz-fila as-resumen">
                                            <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{mes}</span></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo"><Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="pz-enlace-fila">{a.nombre}</Link></h4>
                                                <p className="pz-fila__detalle"><span className="pz-fila__folio">{a.folio}</span><span>{a.inscritos} inscritos</span>{cerrada && <span>{c.presentes} presentes</span>}</p>
                                            </div>
                                            {cerrada ? <span className="ins-cupo"><span className="ins-cupo__texto"><strong>{p}%</strong><small>asistencia</small></span>
                                                <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${tonoPct(p)}`} style={{ width: `${p}%` }} /></span></span>
                                                : <span className="pz-acciones__nota">Sin cerrar</span>}
                                            <Chip tono={e.tono as TonoEstado}>{e.clave === "cerrada" ? "Cerrada" : e.texto}</Chip>
                                        </article>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Tarjeta>
            </div>
        </PanelLayout>
    );
}

export default Asistencia;

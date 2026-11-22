// Actividades › Asistencia: actividades por periodo (Figma 570:24906, sin actividades hoy 570:28074, sin resultados 570:28284),
// pasar lista (570:25383), lista cerrada (570:26467) y resumen del mes (570:27596).
// Diseño común del panel (docs/guia-diseno.md); los datos siguen siendo de ejemplo (asistencia.ts).
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { AvisoResultado, Chip, EncabezadoPagina, EstadoVacio, Migas } from "../componentes";
import { Ventana } from "../Ventana";
import { IconoAviso, IconoBandera, IconoInfo, IconoLista, IconoReloj } from "../contenidos/piezas";
import { paginar } from "../contenidoDemo/utiles";
import { fechaCorta, obtenerActividad, useActividades, type Actividad } from "./datos";
import { useInscripciones } from "./inscripciones";
import { hoyISO } from "./salas";
import { semanaDe, diaLargo } from "./calendario";
import {
    agregarSinInscripcion, anotar, cerrarLista, conteo, corregir, estadoLista, guardarAsistencia, listaDe, lugaresParaExtras, marcar, NOMBRE_MARCA, personasDe, useAsistencia, type Marca,
} from "./asistencia";
import { BASE_ASISTENCIA } from "./utiles";
import { AccesosRapidos, CeldaDoble, ControlesLista, CuerpoLista, FILAS_POR_PAGINA, PieLista, SeccionLista, TablaLista } from "./PiezasLista";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";
import modalLista from "../../../assets/admin/modal-list.svg";

const TONO_MARCA = { presente: "verde", ausente: "guinda", sin: "gris" } as const;
type Periodo = "hoy" | "semana" | "anteriores";
const porcentaje = (p: number, t: number) => (t ? Math.round((p / t) * 100) : 0);
const RESUMEN = `${BASE_ASISTENCIA}/resumen`;

function Asistencia() {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const [pagina, setPagina] = useState(0);
    const periodo = (["hoy", "semana", "anteriores"].includes(params.get("ver") ?? "") ? params.get("ver") : "hoy") as Periodo;
    const hoy = hoyISO();
    const semana = semanaDe(hoy);
    const conLista = actividades.filter((a) => a.inscripcion && (a.estado === "publicada" || a.estado === "cancelada"));
    const enPeriodo = (a: Actividad, p: Periodo) => (p === "hoy" ? a.fecha === hoy : p === "semana" ? a.fecha >= semana[0] && a.fecha <= `${semana[4]}~` : a.fecha < hoy);
    const texto = busqueda.trim().toLowerCase();
    const filas = conLista.filter((a) => enPeriodo(a, periodo) && (!texto || a.nombre.toLowerCase().includes(texto)) && (!estadoFiltro || estadoLista(a.folio, new Date(), listas).clave === estadoFiltro)).sort((a, b) => (periodo === "anteriores" ? b.fecha.localeCompare(a.fecha) : (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)));
    const deHoy = conLista.filter((a) => a.fecha === hoy);
    const porPasar = conLista.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "pendiente");
    const cerradas = conLista.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "cerrada");
    const promedio = porcentaje(cerradas.reduce((s, a) => s + conteo(a.folio, listas).presentes, 0), cerradas.reduce((s, a) => s + conteo(a.folio, listas).inscritos + conteo(a.folio, listas).sinInscripcion, 0));
    const elegir = (p: Periodo) => { setPagina(0); setParams(p === "hoy" ? {} : { ver: p }); };
    const { paginas, actual, visibles } = paginar(filas, pagina, FILAS_POR_PAGINA);
    const limpiar = () => { setBusqueda(""); setEstadoFiltro(""); elegir("hoy"); };
    const titulos: Record<Periodo, string> = { hoy: "Actividades de hoy", semana: "Actividades de esta semana", anteriores: "Actividades anteriores" };

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia"]]} />
            <EncabezadoPagina etiqueta="Actividades · Asistencia" titulo="Asistencia"
                texto="Pasa lista a las personas inscritas el día de la actividad y cierra la lista al terminar."
                accion={<Link className="contenidos-boton contenidos-boton--contorno" to={RESUMEN}>Resumen del mes</Link>} />
            <AccesosRapidos accesos={[
                { clave: "hoy", icono: <IconoBandera />, cifra: deHoy.length, titulo: deHoy.length === 1 ? "Actividad hoy" : "Actividades hoy", texto: diaLargo(hoy), enlace: "Ver hoy", tono: "azul", activo: periodo === "hoy", alPresionar: () => elegir("hoy") },
                { clave: "pendientes", icono: <IconoReloj />, cifra: porPasar.length, titulo: "Por pasar lista", texto: "Ya empezaron o terminaron.", enlace: "Ver anteriores", tono: "guinda", activo: periodo === "anteriores", alPresionar: () => elegir("anteriores") },
                { clave: "promedio", icono: <IconoLista />, cifra: `${promedio}%`, titulo: "Asistencia promedio", texto: `${cerradas.length} ${cerradas.length === 1 ? "lista cerrada" : "listas cerradas"}`, enlace: "Ver resumen", tono: "gris", alPresionar: () => navigate(RESUMEN) },
            ]} />

            <ControlesLista
                etiqueta="Filtros de asistencia"
                chips={{ etiqueta: "Periodo", activa: periodo, alElegir: elegir, opciones: [
                    { valor: "hoy" as Periodo, texto: `Hoy (${deHoy.length})` },
                    { valor: "semana" as Periodo, texto: `Esta semana (${conLista.filter((a) => enPeriodo(a, "semana")).length})` },
                    { valor: "anteriores" as Periodo, texto: `Anteriores (${conLista.filter((a) => enPeriodo(a, "anteriores")).length})` },
                ] }}
                busqueda={{ etiqueta: "Buscar actividad", marcador: "Nombre de la actividad…", texto: busqueda, alBuscar: (v) => { setBusqueda(v); setPagina(0); } }}
                grupos={[{ etiqueta: "Estado de la lista", opciones: [{ valor: "", texto: "Todas" }, { valor: "pendiente", texto: "Por pasar lista" }, { valor: "cerrada", texto: "Lista cerrada" }, { valor: "futura", texto: "Aún no empieza" }, { valor: "cancelada", texto: "Cancelada" }], activa: estadoFiltro, alElegir: (v) => { setEstadoFiltro(v); setPagina(0); } }]}
                alLimpiar={limpiar}
            />

            <SeccionLista
                id="asistencia-lista"
                icono={<IconoLista />}
                titulo={titulos[periodo]}
                texto="Abre una actividad para marcar quién asistió."
            >
                <CuerpoLista>
                {filas.length === 0 ? (
                    texto || estadoFiltro ? (
                        <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay actividades con este estado"} texto="Prueba con otra palabra, otro estado o cambia el periodo." accion={{ texto: "Quitar filtros", alPresionar: limpiar }} />
                    ) : (
                        <EstadoVacio icono={vacioCheck} titulo={periodo === "hoy" ? "No hay actividades hoy" : "No hay actividades en este periodo"} texto="Revisa las anteriores para pasar o corregir listas."
                            accion={periodo !== "anteriores" ? { texto: "Ver anteriores", alPresionar: () => elegir("anteriores") } : undefined} />
                    )
                ) : (
                    <TablaLista
                        clase="ac-tabla--asistencia"
                        etiqueta={titulos[periodo]}
                        filas={visibles}
                        clave={(a) => a.folio}
                        columnas={[
                            { titulo: "Folio", folio: true, celda: (a) => a.folio },
                            { titulo: "Actividad", celda: (a) => <CeldaDoble arriba={a.nombre} abajo={a.espacio} /> },
                            { titulo: periodo === "hoy" ? "Hora" : "Fecha", celda: (a) => (periodo === "hoy" ? a.inicio : <CeldaDoble arriba={fechaCorta(a.fecha)} abajo={a.inicio} />) },
                            { titulo: "Inscritos", celda: (a) => a.inscritos },
                            { titulo: "Lista", celda: (a) => { const e = estadoLista(a.folio, new Date(), listas); return <Chip tono={e.tono}>{e.texto}</Chip>; } },
                            {
                                titulo: "Acción",
                                celda: (a) => {
                                    const e = estadoLista(a.folio, new Date(), listas).clave;
                                    if (e === "cancelada") return <span className="ac-sin-accion">—</span>;
                                    return <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="contenidos-tabla__accion">{e === "cerrada" ? "Ver lista" : e === "pendiente" ? "Pasar lista" : "Ver inscritos"}<span className="tr-oculto"> {a.nombre}</span></Link>;
                                },
                            },
                        ]}
                    />
                )}
                </CuerpoLista>
                {filas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${filas.length} actividades`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
            </SeccionLista>
        </PanelLayout>
    );
}

const POR_PAGINA = 10; // pasar lista: más personas por página para no cambiar tanto de hoja

// Pasar lista (570:25383), error al guardar (570:25860), confirmar cierre (570:26348), agregar sin inscripción (570:27478);
// si la lista ya está cerrada: detalle (570:26909) y corregir (570:27370)
export function PasarLista() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useActividades();
    useInscripciones();
    const listas = useAsistencia();
    const [pagina, setPagina] = useState(0);
    const [ventana, setVentana] = useState<null | "cerrar" | "agregar" | { id: string; persona: string }>(null);
    const [error, setError] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [nombre, setNombre] = useState("");
    const [contacto, setContacto] = useState("");
    const [nueva, setNueva] = useState<Marca>("presente");
    const [motivo, setMotivo] = useState("");
    const [errorCampo, setErrorCampo] = useState("");
    const a = obtenerActividad(folio);
    if (!a || !a.inscripcion) return <Navigate to={BASE_ASISTENCIA} replace />;
    const lista = listaDe(a.folio, listas);
    const cerrada = !!lista.cerrada;
    const personas = personasDe(a.folio);
    const c = conteo(a.folio, listas);
    const { paginas, actual, visibles } = paginar(personas, pagina, POR_PAGINA);
    const marcaDe = (id: string, extra: boolean): Marca => (extra ? "presente" : lista.marcas[id] ?? "sin");
    const libres = lugaresParaExtras(a.folio);
    const total = c.presentes + c.ausentes + c.sinMarcar;
    const avance = porcentaje(c.presentes + c.ausentes, total);

    async function guardar() {
        setGuardado(false);
        try {
            await guardarAsistencia(a!.folio);
            setError(false);
            setGuardado(true);
        } catch {
            setError(true);
        }
    }

    function abrirCorreccion(id: string, persona: string) {
        setNueva(marcaDe(id, false) === "presente" ? "ausente" : "presente");
        setMotivo("");
        setErrorCampo("");
        setVentana({ id, persona });
    }

    function marcarTodos(m: Marca) {
        personas.filter((p) => !p.extra && marcaDe(p.id, false) === "sin").forEach((p) => marcar(a!.folio, p.id, m));
        setGuardado(false);
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia", BASE_ASISTENCIA], [cerrada ? "Lista cerrada" : "Pasar lista"]]} />
            <EncabezadoPagina
                volver={{ texto: "Volver a Asistencia", ruta: BASE_ASISTENCIA }}
                etiqueta={`Actividad ${a.folio} · ${cerrada ? "Lista cerrada" : "Pasar lista"}`}
                titulo={a.nombre}
                texto={`${fechaCorta(a.fecha)} · ${a.inicio} · ${a.espacio} · ${c.inscritos} inscritos.`}
                accion={<Chip tono={cerrada ? "verde" : "dorado"}>{cerrada ? "Lista cerrada" : "Lista abierta"}</Chip>}
            />

            {error && <AvisoResultado tono="error" titulo="No se pudo guardar la asistencia" texto="Revisa tu conexión. Tus marcas siguen en pantalla; inténtalo de nuevo." chip="Sin guardar" />}
            {guardado && <AvisoResultado tono="exito" titulo="Asistencia guardada" texto="Puedes seguir marcando o cerrar la lista cuando termines." chip="Guardada" />}

            <section className="ac-cupo-sesion" aria-label="Conteo de la lista">
                <div className="ac-cupo-sesion__cifras">
                    <div><span>Presentes</span><strong>{c.presentes}</strong></div>
                    <div><span>Ausentes</span><strong>{c.ausentes}</strong></div>
                    <div><span>Sin marcar</span><strong className={c.sinMarcar && !cerrada ? "ac-cupo-sesion__pendiente" : undefined}>{c.sinMarcar}</strong></div>
                    <div><span>Sin inscripción</span><strong>{c.sinInscripcion}</strong></div>
                </div>
                <div className="ac-cupo">
                    <span className="ac-cupo__barra"><span className={`ac-cupo__relleno ac-cupo__relleno--${avance === 100 ? "verde" : "dorado"}`} style={{ width: `${avance}%` }} /></span>
                    <span>{cerrada ? `Cerró ${lista.cerrada!.quien} el ${fechaCorta(lista.cerrada!.fecha)} · ${porcentaje(c.presentes, c.inscritos + c.sinInscripcion)}% de asistencia` : `${avance}% de la lista marcada`}</span>
                </div>
            </section>

            <SeccionLista
                id="pasar-lista"
                icono={<IconoLista />}
                titulo={cerrada ? "Registro de asistencia" : "Personas inscritas"}
                texto={cerrada ? "Para cambiar una marca, usa «Corregir»: queda en la bitácora." : "Marca a cada persona. Puedes guardar y seguir después."}
                extra={!cerrada && c.sinMarcar > 0 ? <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => marcarTodos("presente")}>Marcar pendientes como presentes</button> : undefined}
            >
                {personas.length === 0 ? (
                    <EstadoVacio icono={vacioCheck} titulo="No hay personas inscritas" texto="Puedes agregar a quien llegó sin inscripción." />
                ) : (
                    <ul className="ac-inscritos">
                        {visibles.map((p) => {
                            const m = marcaDe(p.id, p.extra);
                            const numero = String(personas.findIndex((x) => x.id === p.id) + 1).padStart(2, "0");
                            return (
                                <li key={p.id} className="ac-inscrito">
                                    <div className="ac-inscrito__fila ac-inscrito__fila--lista">
                                        <span className="ac-numero" aria-hidden="true">{numero}</span>
                                        <span className="ac-inscrito__textos"><strong>{p.persona}</strong>{p.extra && <small>Llegó sin inscripción</small>}</span>
                                        {!cerrada && !p.extra && (
                                            <input className="tr-entrada ac-nota" placeholder="Nota (opcional)" aria-label={`Nota de ${p.persona}`} value={lista.notas[p.id] ?? ""} onChange={(e) => anotar(a.folio, p.id, e.target.value)} />
                                        )}
                                        {cerrada || p.extra ? (
                                            <Chip tono={TONO_MARCA[m]}>{NOMBRE_MARCA[m]}</Chip>
                                        ) : (
                                            <span className="contenidos-filtros ac-marcar" role="group" aria-label={`Asistencia de ${p.persona}`}>
                                                {(["presente", "ausente"] as const).map((op) => (
                                                    <button key={op} type="button" aria-pressed={m === op} className={`contenidos-filtro ac-marcar__${op}${m === op ? " contenidos-filtro--activo" : ""}`}
                                                        onClick={() => { marcar(a.folio, p.id, op); setGuardado(false); }}>{NOMBRE_MARCA[op]}</button>
                                                ))}
                                            </span>
                                        )}
                                        {cerrada && !p.extra && <button type="button" className="contenidos-tabla__accion ac-boton-texto" onClick={() => abrirCorreccion(p.id, p.persona)}>Corregir<span className="tr-oculto"> {p.persona}</span></button>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {personas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${personas.length} personas`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
                {cerrada && lista.correcciones.length > 0 && (
                    <div className="tr-datos__bloque">
                        <p className="at-subtitulo">Correcciones registradas</p>
                        <ol className="tr-eventos">
                            {lista.correcciones.map((x) => <li key={x.fecha + x.persona} className="tr-eventos--hecho"><strong>{x.persona}: {NOMBRE_MARCA[x.de]} → {NOMBRE_MARCA[x.a]}</strong><small>{x.motivo} · {x.quien}</small></li>)}
                        </ol>
                    </div>
                )}
            </SeccionLista>

            {!cerrada && (
                <div className="ac-barra-acciones">
                    <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => { setNombre(""); setContacto(""); setErrorCampo(""); setVentana("agregar"); }}>Agregar persona sin inscripción</button>
                    <span className="ac-barra-acciones__derecha">
                        <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => void guardar()}>Guardar y seguir</button>
                        <button type="button" className="contenidos-boton contenidos-boton--oscuro" onClick={() => setVentana("cerrar")}>Cerrar lista</button>
                    </span>
                </div>
            )}

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
                    <div className="contenidos-campo"><label htmlFor="as-nombre">Nombre completo <span className="contenidos-campo__obligatorio">*</span></label>
                        <input id="as-nombre" className="tr-entrada" value={nombre} aria-invalid={!!errorCampo} onChange={(e) => { setNombre(e.target.value); setErrorCampo(""); }} /></div>
                    <div className="contenidos-campo"><label htmlFor="as-contacto">Contacto (opcional)</label>
                        <input id="as-contacto" className="tr-entrada" value={contacto} onChange={(e) => setContacto(e.target.value)} /></div>
                </Ventana>
            )}
            {ventana && typeof ventana === "object" && (
                <Ventana tono="dorado" icono={modalInfo} titulo={`Corregir asistencia de ${ventana.persona}`}
                    texto={`Ahora: ${NOMBRE_MARCA[marcaDe(ventana.id, false)]}. El cambio queda en la bitácora con tu nombre, la fecha y el motivo.`}
                    textoConfirmar="Guardar corrección" error={errorCampo}
                    alConfirmar={() => { if (!motivo.trim()) return setErrorCampo("Escribe el motivo de la corrección."); corregir(a.folio, ventana.id, nueva, motivo); setVentana(null); }}
                    alCerrar={() => setVentana(null)}>
                    <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Nueva asistencia">
                        {(["presente", "ausente"] as const).map((op) => (
                            <label key={op} className={`contenidos-filtro${nueva === op ? " contenidos-filtro--activo" : ""}`}>
                                <input type="radio" name="as-nueva" className="tr-oculto" checked={nueva === op} onChange={() => setNueva(op)} />{NOMBRE_MARCA[op]}
                            </label>
                        ))}
                    </div>
                    <div className="contenidos-campo"><label htmlFor="as-motivo">Motivo de la corrección <span className="contenidos-campo__obligatorio">*</span></label>
                        <textarea id="as-motivo" rows={3} placeholder="Ej.: sí asistió, se marcó por error." value={motivo} aria-invalid={!!errorCampo} onChange={(e) => { setMotivo(e.target.value); setErrorCampo(""); }} /></div>
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
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Asistencia", BASE_ASISTENCIA], ["Lista cerrada"]]} />
            <EncabezadoPagina etiqueta={`Actividad ${a.folio} · Asistencia`} titulo="Lista cerrada" texto="La asistencia quedó registrada." />
            <AvisoResultado tono="exito" titulo={a.nombre} texto={`${c.presentes} presentes · ${c.ausentes} ausentes · ${porcentaje(c.presentes, c.inscritos + c.sinInscripcion)}% de asistencia`} chip="Lista cerrada" />
            <div className="tr-acciones">
                <Link to={BASE_ASISTENCIA} className="contenidos-boton contenidos-boton--oscuro">Volver a Asistencia</Link>
                <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="contenidos-boton contenidos-boton--contorno">Ver la lista</Link>
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
            <EncabezadoPagina volver={{ texto: "Volver a Asistencia", ruta: BASE_ASISTENCIA }} etiqueta="Actividades · Asistencia"
                titulo={`Resumen de ${nombreMes}`} texto="Cómo ha ido la asistencia en las actividades ya realizadas." />
            <AccesosRapidos titulo="Cifras del mes" accesos={[
                { clave: "promedio", icono: <IconoBandera />, cifra: `${porcentaje(asistentes, total)}%`, titulo: "Asistencia promedio", texto: "De las personas inscritas.", tono: "azul" },
                { clave: "asistentes", icono: <IconoLista />, cifra: asistentes, titulo: "Asistentes", texto: `En ${cerradas.length} ${cerradas.length === 1 ? "lista cerrada" : "listas cerradas"}.`, tono: "gris" },
                { clave: "pendientes", icono: <IconoAviso />, cifra: pendientes, titulo: pendientes === 1 ? "Lista sin cerrar" : "Listas sin cerrar", texto: "Ya pasó la actividad.", tono: "guinda" },
            ]} />
            <SeccionLista id="resumen-por-actividad" icono={<IconoInfo />} titulo="Por actividad" texto="Las listas sin cerrar no cuentan en el promedio.">
                {pasadas.length === 0 ? (
                    <EstadoVacio icono={vacioCheck} titulo="Todavía no hay actividades realizadas" texto="Cuando se cierre una lista, aparecerá aquí." />
                ) : (
                    <TablaLista
                        clase="ac-tabla--resumen"
                        etiqueta="Asistencia por actividad"
                        filas={pasadas}
                        clave={(a) => a.folio}
                        columnas={[
                            { titulo: "Folio", folio: true, celda: (a) => <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="contenidos-tabla__accion">{a.folio}</Link> },
                            { titulo: "Actividad", celda: (a) => <CeldaDoble arriba={a.nombre} abajo={fechaCorta(a.fecha)} /> },
                            { titulo: "Inscritos", celda: (a) => a.inscritos },
                            { titulo: "Presentes", celda: (a) => (listaDe(a.folio, listas).cerrada ? conteo(a.folio, listas).presentes : "—") },
                            {
                                titulo: "Asistencia",
                                celda: (a) => {
                                    if (!listaDe(a.folio, listas).cerrada) return "—";
                                    const c = conteo(a.folio, listas);
                                    const p = porcentaje(c.presentes, c.inscritos + c.sinInscripcion);
                                    return <span className="ac-cupo ac-cupo--celda"><span className="ac-cupo__barra"><span className={`ac-cupo__relleno ac-cupo__relleno--${p >= 70 ? "verde" : p >= 40 ? "dorado" : "guinda"}`} style={{ width: `${p}%` }} /></span>{p}%</span>;
                                },
                            },
                            { titulo: "Lista", celda: (a) => { const e = estadoLista(a.folio, new Date(), listas); return <Chip tono={e.tono}>{e.clave === "cerrada" ? "Cerrada" : e.texto}</Chip>; } },
                        ]}
                    />
                )}
            </SeccionLista>
        </PanelLayout>
    );
}

export default Asistencia;

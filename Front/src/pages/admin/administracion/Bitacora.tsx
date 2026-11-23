// Administración › Bitácora de cambios (Figma 580:53590). Datos de ejemplo (./datos.ts, TODO backend).
// 21 nov 2026: con las piezas del panel: cifras que filtran; buscador con «Filtros» (módulo, tipo y fechas) sobre la lista con
// bloque de fecha y scroll interno | lateral del mismo alto con los movimientos por módulo (también filtran) y la exportación.
import { useId, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { simulacion } from "../../../servicios/simulacion";
import { MODULOS, MOVIMIENTOS, fechaHora, filtrarBitacora, type FiltrosBitacora, type ModuloBitacora, type Movimiento } from "./datos";
import { ErrorCarga, Pantalla } from "./comun";
import { descargarCsv } from "./utiles";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Nota, Paginas, Tarjeta, Vacio } from "../piezasPanel";

const RUTA = "/admin/administracion/bitacora";
const POR_PAGINA = 10;
const SIN_FILTROS: FiltrosBitacora = { modulo: "todos", texto: "", tipo: "todos", desde: "", hasta: "" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function Fecha({ iso }: { iso: string }) {
    const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
    return <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{MESES[m - 1]} {String(a).slice(2)}</span></span>;
}
const hora = (iso: string) => iso.split("T")[1]?.slice(0, 5) ?? "";

function FilaMovimiento({ m }: { m: Movimiento }) {
    return (
        <article className={`pz-fila${m.tipo === "Sensible" ? " pz-fila--sensible" : ""}`}>
            <Fecha iso={m.fecha} />
            <div className="pz-fila__textos">
                <h4 className="pz-fila__titulo">{m.accion}</h4>
                <p className="pz-fila__detalle"><span className="pz-fila__folio">{m.folio}</span><span>{m.persona}</span><span>{m.modulo}</span><span>{hora(m.fecha)} h</span></p>
            </div>
            {m.tipo === "Sensible" ? <Chip tono="guinda">Sensible</Chip> : <span />}
            <Link to={`${RUTA}/${m.folio}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver detalle<span className="solo-lectores"> {m.folio}</span></Link>
        </article>
    );
}

export default function Bitacora() {
    const id = useId();
    const [f, setF] = useState<FiltrosBitacora>(SIN_FILTROS);
    const [pagina, setPagina] = useState(1);
    const [exportado, setExportado] = useState("");
    const [errorExportar, setErrorExportar] = useState(false);
    const [cargaRecuperada, setCargaRecuperada] = useState(false);
    const modo = simulacion(); // ?simular=error | vacia | error-exportar
    const errorCarga = modo === "error" && !cargaRecuperada;
    const lista = modo === "vacia" ? [] : MOVIMIENTOS;
    const filtrados = filtrarBitacora(lista, f);
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas);
    const visibles = filtrados.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);
    const hayFiltros = JSON.stringify(f) !== JSON.stringify(SIN_FILTROS);
    const porModulo = (m: ModuloBitacora | "todos") => filtrarBitacora(lista, { ...f, modulo: m }).length;
    const porTipo = (t: FiltrosBitacora["tipo"]) => filtrarBitacora(lista, { ...f, tipo: t }).length;
    const activos = (f.modulo !== "todos" ? 1 : 0) + (f.tipo !== "todos" ? 1 : 0) + (f.desde || f.hasta ? 1 : 0);

    function cambiar<K extends keyof FiltrosBitacora>(campo: K, valor: FiltrosBitacora[K]) {
        setF((x) => ({ ...x, [campo]: valor }));
        setPagina(1);
    }
    const quitarFiltros = () => { setF(SIN_FILTROS); setPagina(1); };

    function exportar() {
        setExportado("");
        setErrorExportar(false);
        if (modo === "error-exportar") { setErrorExportar(true); return; }
        const nombre = "bitacora-de-cambios.csv";
        descargarCsv(nombre, [["Folio", "Fecha", "Persona", "Módulo", "Acción", "Tipo"], ...filtrados.map((m) => [m.folio, fechaHora(m.fecha), m.persona, m.modulo, m.accion, m.tipo])]);
        setExportado(`${nombre} (${filtrados.length} movimientos)`);
    }

    return (
        <Pantalla migas={[["Bitácora de cambios"]]}>
            <div className="pz-pagina">
                <Encabezado titulo="Bitácora de cambios" texto="Quién hizo qué en el panel, del más reciente al más antiguo. Es de solo lectura: nada se puede editar ni borrar.">
                    <Cifra icono="bitacora" valor={lista.length} texto="movimientos" activa={!hayFiltros} alPresionar={quitarFiltros} />
                    <Cifra icono="usuario" valor={new Set(lista.map((m) => m.persona)).size} texto="personas" />
                    <Cifra icono="alerta" tono="vino" valor={lista.filter((m) => m.tipo === "Sensible").length} texto="cambios sensibles"
                        activa={f.tipo === "Sensible"} alPresionar={() => cambiar("tipo", f.tipo === "Sensible" ? "todos" : "Sensible")} />
                </Encabezado>

                {exportado && <Aviso titulo="Exportación lista." texto={`Se descargó ${exportado}.`} />}
                {errorExportar && <Aviso tono="error" titulo="No se pudo exportar." texto="Inténtalo de nuevo en unos minutos." />}

                {errorCarga ? (
                    <ErrorCarga titulo="No se pudo cargar la bitácora" texto="Revisa tu conexión e inténtalo de nuevo." alReintentar={() => setCargaRecuperada(true)} />
                ) : (
                    <div className="pz-columnas">
                        <Tarjeta icono="bitacora" id={`${id}-lista`} titulo="Movimientos" texto="Del más reciente al más antiguo" className="pz-pendientes">
                            <Buscador etiqueta="Buscar por persona, acción o folio" placeholder="Buscar por persona, acción o folio" valor={f.texto} alCambiar={(v) => cambiar("texto", v)}>
                                <FiltrosAvanzados activos={activos} alQuitar={() => { setF((x) => ({ ...SIN_FILTROS, texto: x.texto })); setPagina(1); }} grupos={[
                                    { titulo: "Módulo", valor: f.modulo, alCambiar: (v) => cambiar("modulo", v as ModuloBitacora | "todos"),
                                        opciones: [{ valor: "todos", texto: "Todos", cantidad: porModulo("todos") }, ...MODULOS.map((m) => ({ valor: m, texto: m, cantidad: porModulo(m) }))] },
                                    { titulo: "Tipo", valor: f.tipo, alCambiar: (v) => cambiar("tipo", v as FiltrosBitacora["tipo"]),
                                        opciones: [{ valor: "todos", texto: "Todos", cantidad: porTipo("todos") }, { valor: "Normal", texto: "Normal", cantidad: porTipo("Normal") }, { valor: "Sensible", texto: "Sensible", cantidad: porTipo("Sensible") }] },
                                ]} extra={
                                    <fieldset className="pz-filtros-av__grupo">
                                        <legend>Fechas</legend>
                                        <div className="pz-campos-fila">
                                            <label className="pz-campo pz-campo--lleno"><span>Desde</span><input type="date" value={f.desde} onChange={(e) => cambiar("desde", e.target.value)} /></label>
                                            <label className="pz-campo pz-campo--lleno"><span>Hasta</span><input type="date" value={f.hasta} min={f.desde || undefined} onChange={(e) => cambiar("hasta", e.target.value)} /></label>
                                        </div>
                                    </fieldset>
                                } />
                            </Buscador>
                            {visibles.length === 0 ? (
                                lista.length === 0
                                    ? <Vacio icono="bitacora" titulo="Todavía no hay movimientos" texto="Cada acción del personal aparecerá aquí." />
                                    : <Vacio icono="buscarCuenta" titulo="No hay movimientos con estos filtros" texto="Prueba con otro módulo, tipo o fecha."
                                        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitarFiltros}>Quitar filtros</button>} />
                            ) : (
                                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de movimientos">
                                    <ul className="pz-filas">{visibles.map((m) => <li key={m.folio}><FilaMovimiento m={m} /></li>)}</ul>
                                </div>
                            )}
                            {filtrados.length > 0 && (
                                <div className="pz-tarjeta__pie">
                                    <p aria-live="polite">{filtrados.length} {filtrados.length === 1 ? "movimiento" : "movimientos"}{hayFiltros ? " con estos filtros" : ""}</p>
                                    <Paginas pagina={actual} paginas={paginas} alCambiar={setPagina} />
                                </div>
                            )}
                        </Tarjeta>

                        <aside className="pz-lateral" aria-label="Movimientos por módulo y exportación">
                            <Tarjeta icono="estadisticas" id={`${id}-modulos`} titulo="Por módulo" texto="Toca uno para ver solo sus movimientos" className="pz-tarjeta--actividades">
                                <ul className="pz-ranking pz-ranking--botones">
                                    {MODULOS.map((m) => {
                                        const total = lista.filter((x) => x.modulo === m).length;
                                        return (
                                            <li key={m}>
                                                <button type="button" className={`pz-ranking__boton${f.modulo === m ? " pz-ranking__boton--activo" : ""}`} aria-pressed={f.modulo === m}
                                                    onClick={() => cambiar("modulo", f.modulo === m ? "todos" : m)}>
                                                    <span className="pz-ranking__textos">
                                                        <span className="pz-ranking__nombre">{m}</span>
                                                        <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: `${lista.length ? (total / lista.length) * 100 : 0}%` }} /></span>
                                                    </span>
                                                    <span className="pz-ranking__valor"><strong>{total}</strong></span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </Tarjeta>
                            <section className="pz-tarjeta pz-exportar" aria-label="Exportar">
                                <div className="pz-acciones">
                                    <button type="button" className="pz-boton" disabled={filtrados.length === 0} onClick={exportar}>Exportar {filtrados.length} en CSV</button>
                                    <p className="pz-acciones__nota">Se exporta lo que ves con la búsqueda y los filtros elegidos.</p>
                                </div>
                            </section>
                        </aside>
                    </div>
                )}
            </div>
        </Pantalla>
    );
}

// ---------- Detalle (Figma 580:54526) ----------

export function DetalleMovimiento() {
    const id = useId();
    const { folio } = useParams();
    const m = MOVIMIENTOS.find((x) => x.folio === folio);
    if (!m) return <Navigate to={RUTA} replace />;
    const otros = MOVIMIENTOS.filter((x) => x.persona === m.persona && x.folio !== m.folio).slice(0, 4);
    return (
        <Pantalla migas={[["Bitácora de cambios", RUTA], [m.folio]]}>
            <div className="pz-pagina">
                <Encabezado titulo={m.accion} texto={`Movimiento ${m.folio}. Este registro no se puede editar ni borrar.`}>
                    <Chip tono={m.tipo === "Sensible" ? "guinda" : "gris"}>{m.tipo}</Chip>
                </Encabezado>
                <div className="pz-columnas pz-columnas--libre">
                    <div className="pz-principal">
                        <Tarjeta icono="bitacora" id={`${id}-datos`} titulo="Datos del movimiento">
                            <Datos>
                                <Dato etiqueta="Fecha y hora">{fechaHora(m.fecha)}</Dato>
                                <Dato etiqueta="Persona">{m.persona}</Dato>
                                <Dato etiqueta="Módulo">{m.modulo}</Dato>
                                <Dato etiqueta="Tipo">{m.tipo}</Dato>
                            </Datos>
                            <Nota titulo="Detalle">{m.detalle}</Nota>
                        </Tarjeta>
                    </div>
                    <aside className="pz-lateral" aria-label="Más de esta persona">
                        <Tarjeta icono="usuario" id={`${id}-otros`} titulo={`Más de ${m.persona}`} texto="Sus otros movimientos recientes">
                            {otros.length ? (
                                <ul className="pz-actividades">
                                    {otros.map((x) => (
                                        <li key={x.folio}>
                                            <div className="pz-actividades__textos">
                                                <Link to={`${RUTA}/${x.folio}`} className="pz-actividades__titulo pz-enlace-fila">{x.accion}</Link>
                                                <p className="pz-actividades__detalle">{x.modulo}, {fechaHora(x.fecha)}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : <p className="pz-acciones__nota">No tiene otros movimientos registrados.</p>}
                        </Tarjeta>
                        <Link to={RUTA} className="pz-boton pz-boton--contorno panel-regresar">Volver a la bitácora</Link>
                    </aside>
                </div>
            </div>
        </Pantalla>
    );
}

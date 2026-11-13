// Administración › Bitácora de cambios (Figma 580:53590). Diseño del Editor. Datos de ejemplo (./datos.ts, TODO backend).
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { AvisoResultado, Chip, Dato, Datos, EncabezadoPagina, EstadoVacio, Tarjeta } from "../componentes";
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from "../contenidos/piezas";
import { simulacion } from "../../../servicios/simulacion";
import { MODULOS, MOVIMIENTOS, fechaHora, filtrarBitacora, type FiltrosBitacora } from "./datos";
import { ErrorCarga, Pantalla, Pestanas, Resumen } from "./comun";
import { descargarCsv } from "./utiles";
import iconoReloj from "../../../assets/admin/tarjeta-clock.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";
import vacioCheck from "../../../assets/admin/vacio-check.svg";

const RUTA = "/admin/administracion/bitacora";
const POR_PAGINA = 10;
const SIN_FILTROS: FiltrosBitacora = { modulo: "todos", texto: "", tipo: "todos", desde: "", hasta: "" };

export default function Bitacora() {
    const [f, setF] = useState<FiltrosBitacora>(SIN_FILTROS);
    const [avanzados, setAvanzados] = useState(false);
    const [pagina, setPagina] = useState(0);
    const [exportado, setExportado] = useState("");
    const [errorExportar, setErrorExportar] = useState(false);
    const modo = simulacion(); // ?simular=error | vacia | error-exportar
    const lista = modo === "vacia" ? [] : MOVIMIENTOS;
    const filtrados = filtrarBitacora(lista, f);
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas - 1);
    const visibles = filtrados.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);

    function cambiar<K extends keyof FiltrosBitacora>(campo: K, valor: FiltrosBitacora[K]) {
        setF((x) => ({ ...x, [campo]: valor }));
        setPagina(0);
    }

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
            <EncabezadoPagina etiqueta="Administración · Bitácora de cambios" titulo="Bitácora de cambios" texto="Registro de quién hizo qué en el panel. Historial de solo lectura. Datos de ejemplo." />

            <Resumen titulo="Movimientos registrados" tarjetas={[
                { tono: "azul", icono: <IconoLista />, cifra: lista.length, titulo: "Movimientos", texto: "En todo el panel (ejemplo)." },
                { tono: "gris", icono: <IconoReloj />, cifra: new Set(lista.map((m) => m.persona)).size, titulo: "Personas", texto: "Del personal." },
                { tono: "guinda", icono: <IconoAviso />, cifra: lista.filter((m) => m.tipo === "Sensible").length, titulo: "Cambios sensibles", texto: "Permisos, cuentas y datos.", activa: f.tipo === "Sensible", alPresionar: () => cambiar("tipo", f.tipo === "Sensible" ? "todos" : "Sensible") },
            ]} />

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--contorno" aria-expanded={avanzados} onClick={() => setAvanzados((x) => !x)}>Filtros avanzados</button>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={filtrados.length === 0} onClick={exportar}>Exportar</button>
            </div>

            {exportado && <AvisoResultado tono="exito" titulo="Exportación lista" texto={`Se descargó ${exportado}.`} chip="Listo" />}
            {errorExportar && <AvisoResultado tono="error" titulo="No se pudo exportar" texto="Inténtalo de nuevo en unos minutos." chip="Error" />}

            {avanzados && (
                <section className="contenidos-panel" aria-label="Filtros avanzados">
                    <div className="at-fila">
                        <div className="contenidos-campo">
                            <label htmlFor="bt-tipo">Tipo</label>
                            <select id="bt-tipo" value={f.tipo} onChange={(e) => cambiar("tipo", e.target.value as FiltrosBitacora["tipo"])}>
                                <option value="todos">Todos</option><option value="Normal">Normal</option><option value="Sensible">Sensible</option>
                            </select>
                        </div>
                        <div className="contenidos-campo"><label htmlFor="bt-desde">Desde</label><input id="bt-desde" type="date" value={f.desde} onChange={(e) => cambiar("desde", e.target.value)} /></div>
                        <div className="contenidos-campo"><label htmlFor="bt-hasta">Hasta</label><input id="bt-hasta" type="date" value={f.hasta} min={f.desde || undefined} onChange={(e) => cambiar("hasta", e.target.value)} /></div>
                    </div>
                    <button type="button" className="contenidos-boton contenidos-boton--suave-azul contenidos-boton--chico at-alinear-inicio" onClick={() => { setF(SIN_FILTROS); setPagina(0); }}>Quitar filtros</button>
                </section>
            )}

            {modo === "error" ? (
                <ErrorCarga titulo="No se pudo cargar la bitácora" texto="Revisa tu conexión e inténtalo de nuevo." />
            ) : (
                <section className="contenidos-lista" aria-labelledby="bt-lista-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoReloj /></span>
                        <div><h2 id="bt-lista-titulo">Movimientos recientes</h2><p>Del más reciente al más antiguo.</p></div>
                    </div>
                    <div className="contenidos-lista__herramientas">
                        <Pestanas etiqueta="Filtrar por módulo" valor={f.modulo} alCambiar={(v) => cambiar("modulo", v)}
                            opciones={[{ valor: "todos" as const, texto: `Todos (${lista.length})` }, ...MODULOS.map((m) => ({ valor: m, texto: m }))]} />
                        <label className="contenidos-buscar">
                            <IconoBuscar />
                            <input type="search" placeholder="Buscar por persona o acción" aria-label="Buscar por persona o acción" value={f.texto} onChange={(e) => cambiar("texto", e.target.value)} />
                        </label>
                    </div>

                    {visibles.length === 0 ? (
                        lista.length === 0
                            ? <EstadoVacio icono={vacioCheck} titulo="Todavía no hay movimientos" texto="Cada acción del personal aparecerá aquí." />
                            : <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="No hay movimientos con esos filtros." accion={{ texto: "Quitar filtros", alPresionar: () => setF(SIN_FILTROS) }} />
                    ) : (
                        <div className="contenidos-tabla ad-tabla-bitacora" tabIndex={0} role="table" aria-label="Movimientos">
                            <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                                {["Folio", "Fecha y hora", "Persona", "Módulo", "Acción", "Tipo", ""].map((t, i) => <span key={i} role="columnheader">{t}</span>)}
                            </div>
                            {visibles.map((m) => (
                                <div key={m.folio} className="contenidos-tabla__fila" role="row">
                                    <span role="cell" className="contenidos-tabla__folio">{m.folio}</span>
                                    <span role="cell" className="contenidos-tabla__titulo">{fechaHora(m.fecha)}</span>
                                    <span role="cell" className="at-celda">{m.persona}</span>
                                    <span role="cell">{m.modulo}</span>
                                    <span role="cell" className="at-celda">{m.accion}</span>
                                    <span role="cell"><Chip tono={m.tipo === "Sensible" ? "dorado" : "gris"}>{m.tipo}</Chip></span>
                                    <span role="cell"><Link to={`${RUTA}/${m.folio}`} className="contenidos-tabla__accion">Ver →<span className="solo-lectores"> {m.folio}</span></Link></span>
                                </div>
                            ))}
                        </div>
                    )}

                    {filtrados.length > 0 && (
                        <div className="contenidos-lista__pie">
                            <p aria-live="polite">Mostrando {visibles.length} de {filtrados.length} movimientos (ejemplo)</p>
                            <span />
                            <div className="contenidos-paginas" role="group" aria-label="Páginas">
                                <button type="button" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>‹ Anterior</button>
                                <button type="button" className="contenidos-paginas__actual" aria-current="page">{actual + 1} de {paginas}</button>
                                <button type="button" disabled={actual + 1 >= paginas} onClick={() => setPagina(actual + 1)}>Siguiente ›</button>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </Pantalla>
    );
}

// ---------- Detalle (Figma 580:54526) ----------

export function DetalleMovimiento() {
    const { folio } = useParams();
    const m = MOVIMIENTOS.find((x) => x.folio === folio);
    if (!m) return <Navigate to={RUTA} replace />;
    return (
        <Pantalla migas={[["Bitácora de cambios", RUTA], [m.folio]]}>
            <EncabezadoPagina volver={{ texto: "Volver a la bitácora", ruta: RUTA }} etiqueta={`Movimiento ${m.folio}`} titulo={m.accion} texto="Este registro no se puede editar ni borrar." />
            <Tarjeta icono={iconoReloj} titulo="Datos del movimiento">
                <Datos>
                    <Dato etiqueta="Fecha y hora">{fechaHora(m.fecha)}</Dato>
                    <Dato etiqueta="Persona">{m.persona}</Dato>
                    <Dato etiqueta="Módulo">{m.modulo}</Dato>
                    <Dato etiqueta="Tipo">{m.tipo}</Dato>
                </Datos>
                <div className="at-nota"><p className="at-nota__autor">Detalle</p><p>{m.detalle}</p></div>
            </Tarjeta>
            <div className="contenidos-previa__acciones">
                <Link to={RUTA} className="contenidos-boton contenidos-boton--principal panel-regresar">Volver a la bitácora</Link>
            </div>
        </Pantalla>
    );
}

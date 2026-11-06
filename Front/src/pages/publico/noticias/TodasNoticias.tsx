import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Noticias.css";
import {
    CATEGORIAS,
    esCategoria,
    esFechaValida,
    fechaCorta,
    fechaLarga,
    filtrarNoticias,
    nombreCategoria,
    paginar,
    type Categoria,
    type Noticia,
    type Orden,
} from "./datos";
import { CalendarioFecha, CargandoNoticias, ChipCategoria, EncabezadoNoticias, EstadoNoticias, Paginacion, TarjetaArchivo } from "./piezas";
import { useNoticias } from "./useNoticias";
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

type Vista = "cuadricula" | "lista";
const POR_PAGINA: Record<Vista, number> = { cuadricula: 9, lista: 6 };

// Los filtros viven en la dirección (?q=…&categoria=…&fecha=…) para poder compartirla
// y para que "Volver al listado" desde el detalle regrese a la misma búsqueda.
function leerFiltros(parametros: URLSearchParams) {
    const categoria = parametros.get("categoria");
    const fecha = parametros.get("fecha");
    return {
        texto: parametros.get("q") ?? "",
        categoria: esCategoria(categoria) ? categoria : null,
        fecha: esFechaValida(fecha) ? fecha : null,
        orden: (parametros.get("orden") === "antiguas" ? "antiguas" : "recientes") as Orden,
        vista: (parametros.get("vista") === "lista" ? "lista" : "cuadricula") as Vista,
        pagina: Number(parametros.get("pagina")) || 1,
    };
}

// /noticias/todas: archivo completo con búsqueda, fecha exacta, filtros y paginación
function TodasNoticias() {
    const { carga, reintentar } = useNoticias();

    return (
        <PaginaPublica>
            <EncabezadoNoticias
                regreso={{ texto: "Volver a Noticias", ruta: "/noticias" }}
                etiqueta="Noticias"
                titulo={<>Todas las <span>noticias</span></>}
                texto="Busca por tema, categoría o fecha exacta y encuentra cualquier noticia publicada."
            />
            <section className="noticias-seccion noticias-seccion--archivo">
                <div className="noticias-contenedor">
                    {carga.estado === "cargando" && <CargandoNoticias />}
                    {carga.estado === "error" && <EstadoNoticias tipo="error" alAccionar={reintentar} />}
                    {carga.estado === "listo" && <Archivo noticias={carga.noticias} />}
                </div>
            </section>
        </PaginaPublica>
    );
}

function Archivo({ noticias }: { noticias: Noticia[] }) {
    const [parametros, setParametros] = useSearchParams();
    const filtros = leerFiltros(parametros);
    const tituloResultados = useRef<HTMLDivElement>(null);

    // Borradores: lo que se escribe o elige antes de presionar Buscar / Aplicar
    const [texto, setTexto] = useState(filtros.texto);
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [calendarioAbierto, setCalendarioAbierto] = useState(false);
    const [borrador, setBorrador] = useState<{ categoria: Categoria | null; orden: Orden }>({ categoria: filtros.categoria, orden: filtros.orden });

    const fechasConNoticias = useMemo(() => new Set(noticias.map((n) => n.fecha)), [noticias]);
    const resultados = filtrarNoticias(noticias, filtros);
    const { elementos, pagina, totalPaginas } = paginar(resultados, filtros.pagina, POR_PAGINA[filtros.vista]);
    const busquedaActual = parametros.toString();

    // Cambia parámetros de la dirección; los vacíos se quitan. Cualquier filtro nuevo regresa a la página 1.
    const actualizar = useCallback((cambios: Record<string, string | null>, conservarPagina = false) => {
        setParametros((previos) => {
            const nuevos = new URLSearchParams(previos);
            for (const [clave, valor] of Object.entries(cambios)) {
                if (valor) nuevos.set(clave, valor);
                else nuevos.delete(clave);
            }
            if (!conservarPagina) nuevos.delete("pagina");
            return nuevos;
        });
    }, [setParametros]);

    function buscar(evento: FormEvent) {
        evento.preventDefault();
        actualizar({ q: texto.trim() || null });
    }

    function abrirPanel() {
        setBorrador({ categoria: filtros.categoria, orden: filtros.orden });
        setPanelAbierto((abierto) => !abierto);
        setCalendarioAbierto(false);
    }

    function aplicarPanel() {
        actualizar({ categoria: borrador.categoria, orden: borrador.orden === "antiguas" ? "antiguas" : null });
        setPanelAbierto(false);
    }

    function limpiarTodo() {
        setTexto("");
        setBorrador({ categoria: null, orden: "recientes" });
        actualizar({ q: null, categoria: null, fecha: null, orden: null });
    }

    function cambiarPagina(nueva: number) {
        actualizar({ pagina: nueva > 1 ? String(nueva) : null }, true);
        tituloResultados.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const cerrarCalendario = useCallback(() => setCalendarioAbierto(false), []);

    // Contador del botón Filtros: categoría, orden distinto al normal y fecha
    const cantidadFiltros = [filtros.categoria, filtros.orden === "antiguas", filtros.fecha].filter(Boolean).length;
    const aplicados = [
        filtros.texto && { clave: "q", texto: `Búsqueda: «${filtros.texto}»`, quitar: () => { setTexto(""); actualizar({ q: null }); } },
        filtros.categoria && { clave: "categoria", texto: `Categoría: ${nombreCategoria(filtros.categoria)}`, quitar: () => actualizar({ categoria: null }) },
        filtros.fecha && { clave: "fecha", texto: `Fecha: ${fechaLarga(filtros.fecha)}`, quitar: () => actualizar({ fecha: null }) },
        filtros.orden === "antiguas" && { clave: "orden", texto: "Más antiguas primero", quitar: () => actualizar({ orden: null }) },
    ].filter(Boolean) as { clave: string; texto: string; quitar: () => void }[];

    const resumen = filtros.fecha
        ? `${resultados.length} ${resultados.length === 1 ? "noticia" : "noticias"} el ${fechaLarga(filtros.fecha)}`
        : `Mostrando ${elementos.length} de ${resultados.length} ${resultados.length === 1 ? "noticia" : "noticias"}`;

    return (
        <>
            <form className="buscador-noticias" role="search" onSubmit={buscar}>
                <div className="buscador-noticias__fila">
                    <label className="buscador-noticias__campo buscador-noticias__campo--texto">
                        <span className="buscador-noticias__etiqueta">Buscar noticias</span>
                        <span className="buscador-noticias__entrada">
                            <img src={iconoBuscar} alt="" />
                            <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe una palabra o tema…" maxLength={100} />
                        </span>
                    </label>

                    <div className="buscador-noticias__campo buscador-noticias__campo--fecha">
                        <span className="buscador-noticias__etiqueta" id="etiqueta-fecha">Fecha exacta</span>
                        <button
                            type="button"
                            className={`buscador-noticias__entrada buscador-noticias__entrada--boton${filtros.fecha ? " buscador-noticias__entrada--llena" : ""}`}
                            aria-labelledby="etiqueta-fecha valor-fecha"
                            aria-expanded={calendarioAbierto}
                            aria-controls="calendario-noticias"
                            data-abre-calendario
                            onClick={() => { setCalendarioAbierto((abierto) => !abierto); setPanelAbierto(false); }}
                        >
                            <img src={iconoCalendario} alt="" />
                            <span id="valor-fecha">{filtros.fecha ? fechaCorta(filtros.fecha) : "dd/mm/aaaa"}</span>
                        </button>
                        {calendarioAbierto && (
                            <CalendarioFecha
                                id="calendario-noticias"
                                inicial={filtros.fecha}
                                fechasConNoticias={fechasConNoticias}
                                alCerrar={cerrarCalendario}
                                alAplicar={(fecha) => { actualizar({ fecha }); setCalendarioAbierto(false); }}
                            />
                        )}
                    </div>

                    <button
                        type="button"
                        className={`boton-filtros-noticias${panelAbierto ? " boton-filtros-noticias--abierto" : ""}`}
                        aria-expanded={panelAbierto}
                        aria-controls="panel-filtros-noticias"
                        onClick={abrirPanel}
                    >
                        <img src={iconoFiltros} alt="" />
                        Filtros
                        {cantidadFiltros > 0 && (
                            <span className="boton-filtros-noticias__contador" aria-label={`${cantidadFiltros} aplicados`}>{cantidadFiltros}</span>
                        )}
                        <img src={panelAbierto ? chevronArriba : chevronAbajo} alt="" />
                    </button>

                    <button type="submit" className="boton-noticias boton-noticias--verde boton-noticias--alto">
                        Buscar
                        <img src={iconoBuscarBlanco} alt="" />
                    </button>
                </div>

                {panelAbierto && (
                    <div className="panel-filtros-noticias" id="panel-filtros-noticias">
                        <div className="panel-filtros-noticias__grupo" role="group" aria-labelledby="grupo-categoria">
                            <p id="grupo-categoria" className="buscador-noticias__etiqueta">Categoría</p>
                            <div className="filtro-categorias">
                                <ChipCategoria activa={borrador.categoria === null} alPresionar={() => setBorrador({ ...borrador, categoria: null })}>Todas</ChipCategoria>
                                {CATEGORIAS.map((c) => (
                                    <ChipCategoria key={c.id} activa={borrador.categoria === c.id} alPresionar={() => setBorrador({ ...borrador, categoria: c.id })}>
                                        {c.nombre}
                                    </ChipCategoria>
                                ))}
                            </div>
                        </div>
                        <div className="panel-filtros-noticias__grupo" role="group" aria-labelledby="grupo-orden">
                            <p id="grupo-orden" className="buscador-noticias__etiqueta">Ordenar por</p>
                            <div className="filtro-categorias">
                                <ChipCategoria activa={borrador.orden === "recientes"} alPresionar={() => setBorrador({ ...borrador, orden: "recientes" })}>Más recientes</ChipCategoria>
                                <ChipCategoria activa={borrador.orden === "antiguas"} alPresionar={() => setBorrador({ ...borrador, orden: "antiguas" })}>Más antiguas</ChipCategoria>
                            </div>
                        </div>
                        <div className="panel-filtros-noticias__pie">
                            <button type="button" className="enlace-noticias enlace-noticias--subrayado" onClick={() => setBorrador({ categoria: null, orden: "recientes" })}>
                                Limpiar filtros
                            </button>
                            <button type="button" className="boton-noticias boton-noticias--verde boton-noticias--chico" onClick={aplicarPanel}>
                                Aplicar filtros
                            </button>
                        </div>
                    </div>
                )}

                {!panelAbierto && aplicados.length > 0 && (
                    <div className="filtros-aplicados">
                        <span>Filtros aplicados:</span>
                        {aplicados.map((filtro) => (
                            <button key={filtro.clave} type="button" className="filtros-aplicados__chip" onClick={filtro.quitar} aria-label={`Quitar ${filtro.texto}`}>
                                {filtro.texto}
                                <span aria-hidden="true">✕</span>
                            </button>
                        ))}
                        <button type="button" className="enlace-noticias enlace-noticias--subrayado" onClick={limpiarTodo}>
                            Limpiar todos los filtros
                        </button>
                    </div>
                )}
            </form>

            <div className="noticias-titulo noticias-titulo--archivo" ref={tituloResultados}>
                <div className="noticias-titulo__textos">
                    <span className="etiqueta-noticias">Archivo</span>
                    <h2>{filtros.fecha ? <>Noticias de <span>esa fecha</span></> : <>Noticias <span>publicadas</span></>}</h2>
                </div>
                <div className="noticias-titulo__resumen">
                    <p aria-live="polite">{resumen}</p>
                    <div className="selector-vista" role="group" aria-label="Forma de ver las noticias">
                        {(["cuadricula", "lista"] as const).map((vista) => {
                            const activa = filtros.vista === vista;
                            const icono = vista === "cuadricula" ? (activa ? cuadriculaBlanca : cuadriculaVerde) : (activa ? listaBlanca : listaVerde);
                            return (
                                <button
                                    key={vista}
                                    type="button"
                                    className={`selector-vista__opcion${activa ? " selector-vista__opcion--activa" : ""}`}
                                    aria-pressed={activa}
                                    onClick={() => actualizar({ vista: vista === "lista" ? "lista" : null })}
                                >
                                    <img src={icono} alt="" />
                                    {vista === "cuadricula" ? "Cuadrícula" : "Lista"}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {resultados.length === 0 ? (
                <EstadoNoticias
                    tipo="vacio"
                    texto="No hay noticias con esa búsqueda. Prueba con otra palabra, otra fecha o quita los filtros."
                    alAccionar={limpiarTodo}
                />
            ) : (
                <>
                    <ul className={`noticias-archivo noticias-archivo--${filtros.vista}`}>
                        {elementos.map((noticia) => (
                            <li key={noticia.id}>
                                <TarjetaArchivo noticia={noticia} vista={filtros.vista} origen={{ desde: "todas", busqueda: busquedaActual }} />
                            </li>
                        ))}
                    </ul>
                    <Paginacion pagina={pagina} totalPaginas={totalPaginas} alCambiar={cambiarPagina} />
                    {aplicados.length > 0 && (
                        <p className="noticias-nota">¿Buscabas otra noticia? Prueba con otra fecha, cambia la categoría o limpia los filtros.</p>
                    )}
                </>
            )}
        </>
    );
}

export default TodasNoticias;

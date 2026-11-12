import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Noticias.css";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import {
    CATEGORIAS,
    esCategoria,
    esFechaValida,
    fechaLarga,
    filtrarNoticias,
    paginar,
    type Noticia,
    type Orden,
} from "./datos";
import { CargandoNoticias, EncabezadoNoticias, EstadoNoticias, Paginacion, TarjetaArchivo } from "./piezas";
import { useNoticias } from "./useNoticias";
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
                texto="Encuentra cualquier noticia por tema, categoría o fecha."
            />
            <section className="noticias-seccion noticias-seccion--archivo">
                <div className="noticias-contenedor">
                    {carga.estado === "cargando" && <CargandoNoticias destacada={false} />}
                    {carga.estado === "error" && <EstadoNoticias tipo="error" alAccionar={reintentar} />}
                    {carga.estado === "listo" && <Archivo noticias={carga.noticias} />}
                </div>
            </section>
        </PaginaPublica>
    );
}

const OPCIONES_ORDEN = [{ valor: "recientes", texto: "Más recientes" }, { valor: "antiguas", texto: "Más antiguas" }];

function Archivo({ noticias }: { noticias: Noticia[] }) {
    const [parametros, setParametros] = useSearchParams();
    const filtros = leerFiltros(parametros);
    const tituloResultados = useRef<HTMLDivElement>(null);

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
        }, { replace: true });
    }, [setParametros]);

    const buscar = useCallback((texto: string) => actualizar({ q: texto.trim() || null }), [actualizar]);

    function limpiarTodo() {
        actualizar({ q: null, categoria: null, fecha: null, orden: null });
    }

    function cambiarPagina(nueva: number) {
        actualizar({ pagina: nueva > 1 ? String(nueva) : null }, true);
        tituloResultados.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const hayFiltros = Boolean(filtros.texto || filtros.categoria || filtros.fecha || filtros.orden === "antiguas");

    const resumen = filtros.fecha
        ? `${resultados.length} ${resultados.length === 1 ? "noticia" : "noticias"} el ${fechaLarga(filtros.fecha)}`
        : `Mostrando ${elementos.length} de ${resultados.length} ${resultados.length === 1 ? "noticia" : "noticias"}`;

    return (
        <>
            <BarraFiltros
                etiquetaBusqueda="Buscar noticias"
                marcador="Busca una palabra o tema…"
                texto={filtros.texto}
                alBuscar={buscar}
                grupos={[
                    {
                        etiqueta: "Categoría",
                        opciones: [{ valor: "", texto: "Todas las categorías" }, ...CATEGORIAS.map((c) => ({ valor: c.id as string, texto: c.nombre }))],
                        activa: filtros.categoria ?? "",
                        alElegir: (valor) => actualizar({ categoria: valor || null }),
                    },
                    { etiqueta: "Ordenar por", opciones: OPCIONES_ORDEN, activa: filtros.orden, alElegir: (valor) => actualizar({ orden: valor === "antiguas" ? "antiguas" : null }) },
                ]}
                fecha={{ etiqueta: "Publicada el", valor: filtros.fecha, alCambiar: (fecha) => actualizar({ fecha }) }}
                alLimpiar={limpiarTodo}
            />

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
                    {hayFiltros && (
                        <p className="noticias-nota">¿Buscabas otra noticia? Prueba con otra fecha, cambia la categoría o limpia los filtros.</p>
                    )}
                </>
            )}
        </>
    );
}

export default TodasNoticias;

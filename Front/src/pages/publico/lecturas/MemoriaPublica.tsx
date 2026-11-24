import { useCallback, useRef, useState } from "react";
import PaginasNumeradas from "../../../components/portal/PaginasNumeradas";
import { useLecturasPublicadas } from "./publicados";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import "../perfil/Perfil.css";
import { GENEROS, ORDENES_MEMORIA, aniosDeMemoria, buscaEnMemoria, memoriaPorAnio, ordenarMemoria, temasDeMemoria, type Genero, type Memoria, type OrdenMemoria } from "./datos";
import { EncabezadoLecturas, EstadoLecturas, MemoriaDestacada, PestanasLecturas, TarjetaMemoria } from "./piezas";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconoLibro } from "./iconos";

// Memoria pública (?anio=2024&tema=infantil&orden=antiguos&q=feria), con el mismo panel de «Filtros» que Por autor:
//   Año (Todos los años · 2025 1 · 2024 2 …), Tema (Todos los temas · Novela 2 …) y Ordenar por (Más recientes · Más antiguos).
// Cada opción dice cuántos registros tiene, ya con lo elegido en los demás grupos, para no llevar a una lista vacía.
// Sin filtros, el registro más reciente va destacado y debajo «Más registros» en rejilla de 3.
function MemoriaPublica() {
    const { datos, error, memorias } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const todas = memoriaPorAnio(null, memorias);
    const anioUrl = Number(parametros.get("anio"));
    const anio = aniosDeMemoria(memorias).includes(anioUrl) ? anioUrl : null;
    const temaUrl = parametros.get("tema") ?? "";
    const tema = (temaUrl in GENEROS ? temaUrl : "") as Genero | "";
    const orden: OrdenMemoria = parametros.get("orden") === "antiguos" ? "antiguos" : "recientes";
    const q = parametros.get("q") ?? "";

    // Registros que cumplen la búsqueda y los filtros dados (para los conteos de cada fila)
    const filtrar = (a: number | null, t: Genero | "") =>
        todas.filter((m) => (a === null || m.anio === a) && (!t || m.temas.includes(t)) && buscaEnMemoria(q, m));
    const registros = ordenarMemoria(filtrar(anio, tema), orden);
    const hayFiltros = Boolean(anio || tema || q || orden !== "recientes");
    const destacado = !hayFiltros ? registros[0] : undefined;
    const resto = destacado ? registros.slice(1) : registros;
    // Tableta y teléfono: 10 registros por página con números (en escritorio, todos como antes); la destacada solo en
    // la primera página. La página vuelve a 1 cuando cambian la búsqueda o los filtros.
    const claveFiltros = parametros.toString();
    const [paginaEn, setPaginaEn] = useState({ clave: claveFiltros, pagina: 1 });
    const pagina = paginaEn.clave === claveFiltros ? paginaEn.pagina : 1;
    const porPagina = 6; // 6 en todos los anchos (dos renglones de 3 en escritorio)
    const totalPaginas = Math.max(1, Math.ceil(resto.length / porPagina));
    const restoVisible = resto.slice((pagina - 1) * porPagina, pagina * porPagina);
    const inicioLista = useRef<HTMLParagraphElement>(null);
    const irAPagina = (p: number) => { setPaginaEn({ clave: claveFiltros, pagina: p }); inicioLista.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

    // Opciones con registros (o la elegida), con cuántos hay en cada una
    const porAnio = (a: number) => filtrar(a, tema).length;
    const porTema = (t: Genero) => filtrar(anio, t).length;
    const anios = aniosDeMemoria(memorias).filter((a) => porAnio(a) > 0 || a === anio);
    const temas = temasDeMemoria(todas).filter((t) => porTema(t) > 0 || t === tema);

    const actualizar = useCallback((cambios: Record<string, string | null>) => {
        setParametros((previos) => {
            const nuevos = new URLSearchParams(previos);
            for (const [clave, valor] of Object.entries(cambios)) {
                if (valor) nuevos.set(clave, valor); else nuevos.delete(clave);
            }
            return nuevos;
        }, { replace: true });
    }, [setParametros]);
    const buscar = useCallback((texto: string) => actualizar({ q: texto.trim() || null }), [actualizar]);
    const limpiar = () => setParametros({}, { replace: true });

    const titulo = destacado ? "Más registros" : anio && tema ? `${GENEROS[tema]} en ${anio}` : anio ? `Registros de ${anio}` : tema ? `Registros de ${GENEROS[tema]}` : "Registros";
    const resumen = (
        <>
            Mostrando {registros.length} {registros.length === 1 ? "registro" : "registros"}
            {anio && <> de {anio}</>}{tema && <> sobre {GENEROS[tema]}</>}{q && <> que coinciden con {q}</>}
            {orden === "antiguos" && <>, del más antiguo al más reciente</>}
        </>
    );

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Memoria pública"
                titulo={<>La historia que <span>guardamos</span></>}
                texto="Fotografías y registros autorizados de la vida de la biblioteca."
            />

            <section className="lecturas-seccion lecturas-pagina">
                <div className="lecturas-contenedor">
                    <BarraFiltros
                        arriba={<PestanasLecturas />}
                        etiquetaBusqueda="Buscar en la memoria pública"
                        marcador="Busca una actividad, un tema o un año…"
                        texto={q}
                        alBuscar={buscar}
                        grupos={[
                            {
                                etiqueta: "Año", activa: anio ? String(anio) : "", alElegir: (valor) => actualizar({ anio: valor || null }),
                                opciones: [
                                    { valor: "", texto: "Todos los años", cuenta: datos ? filtrar(null, tema).length : undefined },
                                    ...anios.map((a) => ({ valor: String(a), texto: String(a), cuenta: porAnio(a) })),
                                ],
                            },
                            {
                                etiqueta: "Tema", activa: tema, alElegir: (valor) => actualizar({ tema: valor || null }),
                                opciones: [
                                    { valor: "", texto: "Todos los temas", cuenta: datos ? filtrar(anio, "").length : undefined },
                                    ...temas.map((t) => ({ valor: t, texto: GENEROS[t], cuenta: porTema(t) })),
                                ],
                            },
                            {
                                etiqueta: "Ordenar por", activa: orden, alElegir: (valor) => actualizar({ orden: valor === "antiguos" ? valor : null }),
                                opciones: (Object.keys(ORDENES_MEMORIA) as OrdenMemoria[]).map((o) => ({ valor: o, texto: ORDENES_MEMORIA[o] })),
                            },
                        ]}
                        alLimpiar={limpiar}
                    />
                    {error ? <EstadoLecturas tipo="error" /> : !datos ? <EsqueletoTarjetas cantidad={3} texto="Cargando memoria pública…" /> : (
                        <>
                            <p className="solo-lectores" role="status" ref={inicioLista}>{resumen}</p>
                            {registros.length === 0 ? (
                                <EstadoLecturas tipo="sin-resultados" alLimpiar={limpiar} />
                            ) : (
                                <>
                                    {destacado && pagina === 1 && <MemoriaDestacada memoria={destacado} />}
                                    {resto.length > 0 && (
                                        <section className="lecturas-grupo" aria-labelledby="titulo-mas-registros">
                                            <div className="lecturas-grupo__encabezado">
                                                <EtiquetaPerfil id="titulo-mas-registros" icono={iconoLibro}>{titulo}</EtiquetaPerfil>
                                            </div>
                                            <ul className="rejilla-lecturas pagina-nueva" key={pagina}>
                                                {restoVisible.map((m: Memoria) => <TarjetaMemoria key={m.id} memoria={m} />)}
                                            </ul>
                                            <PaginasNumeradas pagina={pagina} total={totalPaginas} alCambiar={irAPagina} etiqueta="Páginas de la memoria pública" />
                                        </section>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

export default MemoriaPublica;

import { useLecturasPublicadas } from "./publicados";
import { useCallback, useRef, useState } from "react";
import PaginasNumeradas from "../../../components/portal/PaginasNumeradas";
import { useResponsivo } from "../../../components/portal/responsivo";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import "./Lecturas.css";
import "../perfil/Perfil.css";
import { EtiquetaPerfil } from "../perfil/piezas";
import {
    FILTROS_VACIOS,
    GENEROS,
    ORDENES,
    filtrarResenas,
    filtrosDesdeParametros,
    parametrosDesdeFiltros,
    type FiltrosResenas,
    type Genero,
    type Orden,
} from "./datos";
import { EncabezadoLecturas, EstadoLecturas, PestanasLecturas, TarjetaResena } from "./piezas";
import { iconoLibro } from "./iconos";

const OPCIONES_ORDEN = Object.entries(ORDENES).map(([valor, texto]) => ({ valor, texto }));

// Lecturas y reseñas · Lecturas (vista de visitante: solo consulta). Por tema se quitó (19 nov):
// el Género del panel de «Filtros» hace lo mismo, y cada género dice cuántas reseñas tiene con la búsqueda actual.
// La búsqueda y los filtros viven en la URL: /lecturas?q=rulfo&genero=novela&orden=titulo
// Mientras llegan las reseñas se ven el encabezado, los filtros y el esqueleto de las tarjetas.
function Lecturas() {
    const { datos, error, resenas } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const filtros = filtrosDesdeParametros(parametros);
    const resultado = filtrarResenas(resenas, filtros);
    // Tableta y teléfono: 10 reseñas por página con números (en escritorio, todas como antes). La página vuelve a 1
    // cuando cambian la búsqueda o los filtros.
    const responsivo = useResponsivo();
    const claveFiltros = parametros.toString();
    const [paginaEn, setPaginaEn] = useState({ clave: claveFiltros, pagina: 1 });
    const pagina = paginaEn.clave === claveFiltros ? paginaEn.pagina : 1;
    const porPagina = responsivo ? 10 : 12; // escritorio: 12 (rejilla de 3 o 4)
    const totalPaginas = Math.max(1, Math.ceil(resultado.length / porPagina));
    const visibles = resultado.slice((pagina - 1) * porPagina, pagina * porPagina);
    const inicioLista = useRef<HTMLParagraphElement>(null);
    const irAPagina = (p: number) => { setPaginaEn({ clave: claveFiltros, pagina: p }); inicioLista.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const cuantas = (genero: Genero | "") => (datos ? filtrarResenas(resenas, { ...filtros, genero }).length : undefined);
    const opcionesGenero = [
        { valor: "", texto: "Todos los géneros", cuenta: cuantas("") },
        ...(Object.keys(GENEROS) as Genero[]).filter((g) => cuantas(g) !== 0 || g === filtros.genero).map((g) => ({ valor: g, texto: GENEROS[g], cuenta: cuantas(g) })),
    ];

    const aplicar = useCallback((cambios: Partial<FiltrosResenas>) => {
        setParametros((previos) => parametrosDesdeFiltros({ ...filtrosDesdeParametros(previos), ...cambios }), { replace: true });
    }, [setParametros]);
    const buscar = useCallback((q: string) => aplicar({ q }), [aplicar]);

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Lecturas y reseñas"
                titulo={<>Un libro para <span>cada tarde</span></>}
                texto="Reseñas del equipo de la biblioteca para encontrar tu próxima lectura."
            />

            <section className="lecturas-seccion lecturas-pagina">
                <div className="lecturas-contenedor">
                    <BarraFiltros
                        arriba={<PestanasLecturas />}
                        etiquetaBusqueda="Buscar reseñas"
                        marcador="Busca por autor, título o tema…"
                        texto={filtros.q}
                        alBuscar={buscar}
                        grupos={[
                            { etiqueta: "Género", opciones: opcionesGenero, activa: filtros.genero, alElegir: (v) => aplicar({ genero: v as Genero | "" }) },
                            { etiqueta: "Ordenar por", opciones: OPCIONES_ORDEN, activa: filtros.orden, alElegir: (v) => aplicar({ orden: v as Orden }) },
                        ]}
                        alLimpiar={() => aplicar(FILTROS_VACIOS)}
                    />

                    {error ? (
                        <EstadoLecturas tipo="error" />
                    ) : !datos ? (
                        <EsqueletoTarjetas libro cantidad={4} texto="Cargando reseñas…" />
                    ) : (
                        <>
                            {/* El conteo solo para lectores de pantalla (plantilla C) */}
                            <p className="solo-lectores" role="status" ref={inicioLista}>
                                {resultado.length} {resultado.length === 1 ? "reseña" : "reseñas"} de la biblioteca
                            </p>
                            <EtiquetaPerfil icono={iconoLibro}>Reseñas de la biblioteca</EtiquetaPerfil>
                            {resultado.length === 0 ? (
                                <EstadoLecturas tipo="sin-resultados" alLimpiar={() => aplicar(FILTROS_VACIOS)} />
                            ) : (
                                <>
                                    <ul className="rejilla-resenas pagina-nueva" key={pagina}>
                                        {visibles.map((r) => <TarjetaResena key={r.id} resena={r} />)}
                                    </ul>
                                    <PaginasNumeradas pagina={pagina} total={totalPaginas} alCambiar={irAPagina} etiqueta="Páginas de reseñas" />
                                </>
                            )}
                        </>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

export default Lecturas;

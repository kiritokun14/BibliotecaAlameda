import { useLecturasPublicadas } from "./publicados";
import { useCallback } from "react";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import "./Lecturas.css";
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

const OPCIONES_GENERO = [{ valor: "", texto: "Todos los géneros" }, ...Object.entries(GENEROS).map(([valor, texto]) => ({ valor, texto }))];
const OPCIONES_ORDEN = Object.entries(ORDENES).map(([valor, texto]) => ({ valor, texto }));

// Lecturas y reseñas · Por autor (vista de visitante: solo consulta).
// La búsqueda y los filtros viven en la URL: /lecturas?q=rulfo&genero=novela&orden=titulo
// Mientras llegan las reseñas se ven el encabezado, los filtros y el esqueleto de las tarjetas.
function Lecturas() {
    const { datos, error, resenas } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const filtros = filtrosDesdeParametros(parametros);
    const resultado = filtrarResenas(resenas, filtros);

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

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <BarraFiltros
                        arriba={<PestanasLecturas />}
                        etiquetaBusqueda="Buscar reseñas"
                        marcador="Busca por autor, título o tema…"
                        texto={filtros.q}
                        alBuscar={buscar}
                        grupos={[
                            { etiqueta: "Género", opciones: OPCIONES_GENERO, activa: filtros.genero, alElegir: (v) => aplicar({ genero: v as Genero | "" }) },
                            { etiqueta: "Ordenar por", opciones: OPCIONES_ORDEN, activa: filtros.orden, alElegir: (v) => aplicar({ orden: v as Orden }) },
                        ]}
                        alLimpiar={() => aplicar(FILTROS_VACIOS)}
                    />

                    {error ? (
                        <p role="alert">{error}</p>
                    ) : !datos ? (
                        <EsqueletoTarjetas libro cantidad={4} texto="Cargando reseñas…" />
                    ) : (
                        <>
                            <p className="lecturas-resumen" role="status">
                                Mostrando {resultado.length} {resultado.length === 1 ? "reseña" : "reseñas"} de la biblioteca
                            </p>
                            <h2 className="lecturas-titulo">Reseñas de la biblioteca</h2>
                            {resultado.length === 0 ? (
                                <EstadoLecturas tipo="sin-resultados" alLimpiar={() => aplicar(FILTROS_VACIOS)} />
                            ) : (
                                <ul className="rejilla-resenas">
                                    {resultado.map((r) => <TarjetaResena key={r.id} resena={r} />)}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

export default Lecturas;

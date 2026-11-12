import { useCallback } from "react";
import { useLecturasPublicadas } from "./publicados";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import { useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import { aniosDeMemoria, coincideBusqueda, memoriaPorAnio } from "./datos";
import { EncabezadoLecturas, PestanasLecturas, TarjetaMemoria } from "./piezas";

// Memoria pública: fotos y registros autorizados. ?anio=2024&q=feria
// Mismo filtro compacto que Por autor: buscador y «Filtros» con el año.
function MemoriaPublica() {
    const { datos, error, memorias } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const anios = aniosDeMemoria(memorias);
    const anioUrl = Number(parametros.get("anio"));
    const anio = anios.includes(anioUrl) ? anioUrl : null;
    const q = parametros.get("q") ?? "";
    const registros = memoriaPorAnio(anio, memorias).filter((m) => coincideBusqueda(q, m.titulo, m.entrada));

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

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Memoria pública"
                titulo={<>La historia que <span>guardamos</span></>}
                texto="Fotografías y registros autorizados de la vida de la biblioteca."
            />

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <BarraFiltros
                        arriba={<PestanasLecturas />}
                        etiquetaBusqueda="Buscar en la memoria pública"
                        marcador="Busca un registro o actividad…"
                        texto={q}
                        alBuscar={buscar}
                        grupos={[{
                            etiqueta: "Año",
                            opciones: [{ valor: "", texto: "Todos los años" }, ...anios.map((a) => ({ valor: String(a), texto: String(a) }))],
                            activa: anio ? String(anio) : "",
                            alElegir: (valor) => actualizar({ anio: valor || null }),
                        }]}
                        alLimpiar={() => setParametros({}, { replace: true })}
                    />
                    {error ? <p role="alert">{error}</p> : !datos ? <EsqueletoTarjetas cantidad={3} texto="Cargando memoria pública…" /> : (
                        <>
                            {registros.length === 0 && <p>{q ? "No encontramos registros con esa búsqueda." : "No hay registros de memoria publicados para este año."}</p>}
                            <ul className="rejilla-memoria">
                                {registros.map((m) => <TarjetaMemoria key={m.id} memoria={m} />)}
                            </ul>
                        </>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

export default MemoriaPublica;

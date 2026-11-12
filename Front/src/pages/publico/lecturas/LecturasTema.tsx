import { useCallback } from "react";
import { useLecturasPublicadas } from "./publicados";
import BarraFiltros from "../../../components/portal/BarraFiltros";
import { EsqueletoTarjetas } from "../../../components/portal/Esqueleto";
import { Link, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import { GENEROS, coincideBusqueda, porTema, type Genero, type ItemTema } from "./datos";
import { EncabezadoLecturas, FotoMemoria, PestanasLecturas, Portada } from "./piezas";

const OPCIONES_TEMA = [{ valor: "", texto: "Todos los temas" }, ...Object.entries(GENEROS).map(([valor, texto]) => ({ valor, texto }))];

// Lecturas por tema: mezcla reseñas y registros de memoria. ?tema=novela&q=rulfo
// Mismo filtro compacto que Por autor: buscador y «Filtros» con el tema.
function LecturasTema() {
    const { datos, error, resenas, memorias } = useLecturasPublicadas();
    const [parametros, setParametros] = useSearchParams();
    const temaUrl = parametros.get("tema") ?? "";
    const tema = (temaUrl in GENEROS ? temaUrl : "") as Genero | "";
    const q = parametros.get("q") ?? "";
    const items = porTema(tema, resenas, memorias).filter((x) => x.tipo === "resena"
        ? coincideBusqueda(q, x.item.libro, x.item.autoria, x.item.titulo)
        : coincideBusqueda(q, x.item.titulo, x.item.entrada));

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
                etiqueta="Lecturas y reseñas"
                titulo={<>Explora por <span>tema</span></>}
                texto="Elige un tema y descubre lecturas, reseñas y memoria."
            />

            <section className="lecturas-seccion">
                <div className="lecturas-contenedor">
                    <BarraFiltros
                        arriba={<PestanasLecturas />}
                        etiquetaBusqueda="Buscar lecturas"
                        marcador="Busca un título o autor…"
                        texto={q}
                        alBuscar={buscar}
                        grupos={[{ etiqueta: "Tema", opciones: OPCIONES_TEMA, activa: tema, alElegir: (valor) => actualizar({ tema: valor || null }) }]}
                        alLimpiar={() => setParametros({}, { replace: true })}
                    />

                    {error ? (
                        <p role="alert">{error}</p>
                    ) : !datos ? (
                        <EsqueletoTarjetas cantidad={3} texto="Cargando lecturas…" />
                    ) : items.length === 0 ? (
                        <p className="lecturas-vacio" role="status">
                            {q ? "No encontramos lecturas con esa búsqueda." : "Aún no hay lecturas de este tema."} <button type="button" onClick={() => setParametros({}, { replace: true })}>Ver todas</button>
                        </p>
                    ) : (
                        <ul className="rejilla-temas">
                            {items.map((x) => <TarjetaTema key={`${x.tipo}-${x.item.id}`} elemento={x} />)}
                        </ul>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// Tarjeta ancha: portada ilustrada (reseña) o foto (memoria) + tipo + título
function TarjetaTema({ elemento }: { elemento: ItemTema }) {
    if (elemento.tipo === "resena") {
        const r = elemento.item;
        return (
            <li className="tarjeta-tema">
                <Portada resena={r} tamano="ancha" />
                <div className="tarjeta-tema__contenido">
                    <p className={r.recomendada ? "tipo-lectura tipo-lectura--recomendada" : "tipo-lectura tipo-lectura--resena"}>
                        <span />{r.recomendada ? "RECOMENDADA" : "RESEÑA"}
                    </p>
                    <h3><Link to={`/lecturas/${r.id}?desde=tema`} className="enlace-lectura">{r.libro}</Link></h3>
                </div>
            </li>
        );
    }
    const m = elemento.item;
    return (
        <li className="tarjeta-tema">
            <div className="tarjeta-tema__foto">
                <FotoMemoria src={m.imagen} />
                <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
            </div>
            <div className="tarjeta-tema__contenido">
                <p className="tipo-lectura tipo-lectura--memoria"><span />MEMORIA</p>
                <h3><Link to={`/lecturas/memoria/${m.id}?desde=tema`} className="enlace-lectura">{m.titulo}</Link></h3>
            </div>
        </li>
    );
}

export default LecturasTema;

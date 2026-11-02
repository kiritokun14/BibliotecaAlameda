import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import PaginaPublica from "../../components/PaginaPublica";
import "./Lecturas.css";
import { abrir, memorias, visibles } from "./datos";
import { BotonVolverClaro, EncabezadoLecturas, EstadoLecturas, TarjetaMemoria, TituloResaltado } from "./piezas";

// Memoria pública · registro. ?desde=tema cambia el botón de regreso.
function DetalleMemoria() {
    const { id } = useParams();
    // Al abrir otra desde "Más…", empezar arriba
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const [parametros] = useSearchParams();
    const regreso = parametros.get("desde") === "tema"
        ? { texto: "Volver a Lecturas por tema", ruta: "/lecturas/temas" }
        : { texto: "Volver a Memoria pública", ruta: "/lecturas/memoria" };
    const apertura = abrir(memorias, id);

    if (apertura.tipo !== "ok") {
        return (
            <PaginaPublica>
                <EncabezadoLecturas
                    etiqueta="Memoria pública"
                    titulo={<>La historia que <span>guardamos</span></>}
                    texto="Fotografías y registros autorizados de la vida de la biblioteca."
                />
                <section className="lecturas-seccion">
                    <div className="lecturas-contenedor">
                        <EstadoLecturas tipo={apertura.tipo} regreso={regreso} />
                    </div>
                </section>
            </PaginaPublica>
        );
    }

    const m = apertura.item;
    const otros = visibles(memorias).filter((x) => x.id !== m.id).slice(0, 2);

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Memoria pública"
                titulo={<TituloResaltado titulo={m.titulo} resaltado={m.resaltado} />}
                texto={`${m.anio} · Registro autorizado para difusión`}
                regreso={regreso}
                conImagenDebajo
            />

            <section className="detalle-memoria">
                <div className="detalle-memoria__contenido">
                    <div className="detalle-memoria__foto">
                        <img src={m.imagen} alt="" />
                        <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                    </div>
                    <div className="detalle-memoria__texto">
                        <p className="detalle-memoria__entrada">{m.entrada}</p>
                        {m.cuerpo.map((p) => <p key={p}>{p}</p>)}
                    </div>
                </div>
            </section>

            {otros.length > 0 && (
                <section className="lecturas-seccion" aria-labelledby="titulo-mas-memoria">
                    <div className="lecturas-contenedor lecturas-contenedor--angosto">
                        <div>
                            <h2 id="titulo-mas-memoria" className="lecturas-titulo">Más de la memoria pública</h2>
                            <p className="lecturas-subtitulo">Otros registros autorizados de la vida de la biblioteca.</p>
                        </div>
                        <ul className="rejilla-memoria">
                            {otros.map((x) => <TarjetaMemoria key={x.id} memoria={x} />)}
                        </ul>
                    </div>
                </section>
            )}

            <section className="banda-lecturas">
                <div className="banda-lecturas__contenido banda-lecturas__contenido--angosto">
                    <BotonVolverClaro texto={regreso.texto} ruta={regreso.ruta} />
                </div>
            </section>
        </PaginaPublica>
    );
}

export default DetalleMemoria;

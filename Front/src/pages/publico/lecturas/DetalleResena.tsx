import { useLecturasPublicadas } from "./publicados";
import { EstadoPublicados } from "../../../servicios/EstadoPublicados";
import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import { GENEROS, abrir, fechaLarga, visibles } from "./datos";
import {
    BotonCatalogo,
    BotonVolverClaro,
    EncabezadoLecturas,
    EstadoLecturas,
    Portada,
    TarjetaResena,
    TituloResaltado,
} from "./piezas";
import iconoLibro from "../../../assets/comun/iconos/lecturas-libro.svg";

// Reseña · detalle. ?desde=tema cambia el botón de regreso a "Lecturas por tema".
function DetalleResena() {
    const { datos, error, resenas } = useLecturasPublicadas();
    const { id } = useParams();
    // Al abrir otra desde "Más…", empezar arriba
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const [parametros] = useSearchParams();
    const regreso = parametros.get("desde") === "tema"
        ? { texto: "Volver a Lecturas por tema", ruta: "/lecturas/temas" }
        : { texto: "Volver a Lecturas y reseñas", ruta: "/lecturas" };
    const apertura = abrir(resenas, id);

    if (!datos || error) return <PaginaPublica><EstadoPublicados datos={datos} error={error} /></PaginaPublica>;

    if (apertura.tipo !== "ok") {
        return (
            <PaginaPublica>
                <EncabezadoLecturas
                    etiqueta="Lecturas y reseñas"
                    titulo={<>Un libro para <span>cada tarde</span></>}
                    texto="Lecturas y reseñas de la biblioteca."
                />
                <section className="lecturas-seccion">
                    <div className="lecturas-contenedor">
                        <EstadoLecturas tipo={apertura.tipo} regreso={regreso} />
                    </div>
                </section>
            </PaginaPublica>
        );
    }

    const r = apertura.item;
    const otras = visibles(resenas).filter((x) => x.id !== r.id).slice(0, 3);

    return (
        <PaginaPublica>
            <EncabezadoLecturas
                etiqueta="Reseña"
                titulo={<TituloResaltado titulo={r.titulo} resaltado={r.resaltado} />}
                texto={`${r.libro}, de ${r.autoria}`}
                regreso={regreso}
                conImagenDebajo
            />

            <section className="detalle-resena">
                <div className="detalle-resena__contenido">
                    <aside className="detalle-resena__lateral">
                        <Portada resena={r} tamano="detalle" />
                        <dl className="ficha-libro">
                            <div><dt>AUTOR</dt><dd>{r.autoria}</dd></div>
                            <div><dt>GÉNERO</dt><dd>{GENEROS[r.genero]}</dd></div>
                            <div><dt>AÑO</dt><dd>{r.anio}</dd></div>
                        </dl>
                    </aside>

                    <article className="detalle-resena__texto">
                        <p className="detalle-resena__sobretitulo">RESEÑA DE LA BIBLIOTECA</p>
                        <p className="autoria-resena">
                            <span className="autoria-resena__icono"><img src={iconoLibro} alt="" /></span>
                            <span>
                                <strong>Reseña escrita por el equipo de la biblioteca</strong>
                                <small>Publicada el {fechaLarga(r.publicada)} · Servicios bibliotecarios (por confirmar)</small>
                            </span>
                        </p>
                        <p className="detalle-resena__entrada">{r.entrada}</p>
                        {r.cuerpo.map((b) =>
                            b.tipo === "subtitulo"
                                ? <h2 key={b.texto}>{b.texto}</h2>
                                : <p key={b.texto} className="detalle-resena__parrafo">{b.texto}</p>,
                        )}
                    </article>
                </div>
            </section>

            {otras.length > 0 && (
                <section className="lecturas-seccion" aria-labelledby="titulo-mas-resenas">
                    <div className="lecturas-contenedor">
                        <div>
                            <h2 id="titulo-mas-resenas" className="lecturas-titulo">Más lecturas y reseñas</h2>
                            <p className="lecturas-subtitulo">Otras recomendaciones de la biblioteca.</p>
                        </div>
                        <ul className="rejilla-resenas">
                            {otras.map((x) => <TarjetaResena key={x.id} resena={x} />)}
                        </ul>
                    </div>
                </section>
            )}

            <section className="banda-lecturas">
                <div className="banda-lecturas__contenido">
                    <div>
                        <h2>¿Quieres leerlo?</h2>
                        <p>Consulta si está en el catálogo (sitio externo).</p>
                    </div>
                    <div className="banda-lecturas__botones">
                        <BotonVolverClaro texto={regreso.texto} ruta={regreso.ruta} />
                        <BotonCatalogo />
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

export default DetalleResena;

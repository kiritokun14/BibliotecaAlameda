import { useLecturasPublicadas } from "./publicados";
import { EstadoPublicados } from "../../../servicios/EstadoPublicados";
import { useEffect } from "react";
import { Link, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import "../noticias/Noticias.css";
import "../perfil/Perfil.css";
import { GENEROS, abrir, fechaLarga, mesAnio, visibles } from "./datos";
import { BotonCatalogo, EncabezadoLecturas, EstadoLecturas, Portada, TipoLectura, TituloResaltado } from "./piezas";
import { iconoLibro } from "./iconos";
import { EtiquetaPerfil } from "../perfil/piezas";
import Reacciones from "../../../components/portal/Reacciones";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";

// Reseña · detalle (plantilla C, «Página de detalle», como una noticia): franja compacta con el tipo, género y fecha
// en pastilla y el título; dos columnas: el texto y, al lado, el libro (portada y ficha), otras reseñas y los botones.
function DetalleResena() {
    const { datos, error, resenas } = useLecturasPublicadas();
    const { id } = useParams();
    // Al abrir otra desde «Otras reseñas», empezar arriba
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const apertura = abrir(resenas, id);

    if (!datos || error) return <PaginaPublica><EstadoPublicados datos={datos} error={error} /></PaginaPublica>;

    if (apertura.tipo !== "ok") {
        return (
            <PaginaPublica>
                <EncabezadoLecturas etiqueta="Lecturas y reseñas" titulo={<>Un libro para <span>cada tarde</span></>} texto="Reseñas del equipo de la biblioteca." />
                <section className="lecturas-seccion lecturas-pagina">
                    <div className="lecturas-contenedor">
                        <EstadoLecturas tipo={apertura.tipo} regreso={{ texto: "Volver a Lecturas y reseñas", ruta: "/lecturas" }} />
                    </div>
                </section>
            </PaginaPublica>
        );
    }

    const r = apertura.item;
    const otras = visibles(resenas).filter((x) => x.id !== r.id).slice(0, 3);

    return (
        <PaginaPublica>
            <article className="detalle-lectura detalle-lectura--resena">
                <header className="detalle-noticia__encabezado detalle-noticia__encabezado--compacto">
                    <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                    <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                    <p className="detalle-noticia__meta">
                        <TipoLectura tipo={r.recomendada ? "recomendada" : "resena"} claro />
                        <span>{GENEROS[r.genero]} · {fechaLarga(r.publicada)}</span>
                    </p>
                    <h1><TituloResaltado titulo={r.titulo} resaltado={r.resaltado} /></h1>
                    <p className="detalle-noticia__resumen">{r.libro !== r.titulo ? `${r.libro}, de ${r.autoria}` : `Libro de ${r.autoria}`}</p>
                </header>

                <div className="detalle-noticia__cuerpo">
                    <div className="detalle-noticia__columnas">
                        <div className="detalle-noticia__texto detalle-lectura__texto">
                            <p className="detalle-noticia__introduccion">{r.entrada}</p>
                            {r.cuerpo.map((b, i) => b.tipo === "subtitulo" ? <h2 key={i}>{b.texto}</h2> : <p key={i}>{b.texto}</p>)}
                            <p className="detalle-lectura__firma">
                                <span className="detalle-lectura__firma-icono" aria-hidden="true" />
                                <span><strong>Reseña del equipo de la biblioteca</strong><small>Publicada el {fechaLarga(r.publicada)}</small></span>
                            </p>
                            <Reacciones id={r.id} titulo={r.titulo} textoUtil="Me fue útil" pregunta="¿Te gustó esta reseña?" />
                        </div>

                        <aside className="detalle-noticia__lateral">
                            <section className="detalle-lateral__tarjeta detalle-lectura__libro" aria-labelledby="titulo-libro">
                                <Portada resena={r} tamano="detalle" />
                                <EtiquetaPerfil id="titulo-libro" icono={iconoLibro}>Sobre este libro</EtiquetaPerfil>
                                <dl className="detalle-lateral__datos">
                                    <div><dt>Autor</dt><dd>{r.autoria}</dd></div>
                                    <div><dt>Género</dt><dd>{GENEROS[r.genero]}</dd></div>
                                    <div><dt>Año</dt><dd>{r.anio}</dd></div>
                                </dl>
                            </section>

                            {otras.length > 0 && (
                                <section className="detalle-lateral__tarjeta" aria-labelledby="titulo-otras-resenas">
                                    <EtiquetaPerfil id="titulo-otras-resenas" icono={iconoLibro}>Otras reseñas</EtiquetaPerfil>
                                    <ul className="detalle-lateral__otras">
                                        {otras.map((x) => (
                                            <li key={x.id}>
                                                <Link to={`/lecturas/${x.id}`} className="detalle-lateral__otra">
                                                    <span className="detalle-lateral__miniatura detalle-lectura__mini"><Portada resena={x} /></span>
                                                    <span><strong>{x.libro}</strong><small>{x.autoria} · {mesAnio(x.publicada)}</small></span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <div className="detalle-lateral__botones">
                                <BotonCatalogo />
                                <Link to="/lecturas" className="perfil-boton perfil-boton--contorno">Volver a Lecturas</Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </article>
        </PaginaPublica>
    );
}

export default DetalleResena;

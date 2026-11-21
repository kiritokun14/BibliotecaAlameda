import { useLecturasPublicadas } from "./publicados";
import { EstadoPublicados } from "../../../servicios/EstadoPublicados";
import { useEffect } from "react";
import { Link, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Lecturas.css";
import "../noticias/Noticias.css";
import "../perfil/Perfil.css";
import { abrir, visibles } from "./datos";
import { EncabezadoLecturas, EstadoLecturas, FotoMemoria, TipoLectura, TituloResaltado } from "./piezas";
import { iconoLibro } from "./iconos";
import { EtiquetaPerfil } from "../perfil/piezas";
import Reacciones from "../../../components/portal/Reacciones";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";

// Memoria pública · registro (plantilla C, «Página de detalle»): franja compacta con tipo y año, foto montada sobre
// la franja con aro dorado y el texto; al lado, los datos del registro, otros registros y el botón de regreso.
function DetalleMemoria() {
    const { datos, error, memorias } = useLecturasPublicadas();
    const { id } = useParams();
    useEffect(() => { window.scrollTo(0, 0); }, [id]);
    const apertura = abrir(memorias, id);

    if (!datos || error) return <PaginaPublica><EstadoPublicados datos={datos} error={error} /></PaginaPublica>;

    if (apertura.tipo !== "ok") {
        return (
            <PaginaPublica>
                <EncabezadoLecturas etiqueta="Memoria pública" titulo={<>La historia que <span>guardamos</span></>} texto="Fotografías y registros autorizados de la vida de la biblioteca." />
                <section className="lecturas-seccion lecturas-pagina">
                    <div className="lecturas-contenedor">
                        <EstadoLecturas tipo={apertura.tipo} regreso={{ texto: "Volver a Memoria pública", ruta: "/lecturas/memoria" }} />
                    </div>
                </section>
            </PaginaPublica>
        );
    }

    const m = apertura.item;
    const otros = visibles(memorias).filter((x) => x.id !== m.id).slice(0, 3);
    const entradaRepetida = m.entrada.trim() === m.titulo.trim();

    return (
        <PaginaPublica>
            <article className="detalle-lectura detalle-lectura--memoria">
                <header className="detalle-noticia__encabezado detalle-noticia__encabezado--compacto">
                    <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                    <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                    <p className="detalle-noticia__meta">
                        <TipoLectura tipo="memoria" claro />
                        <span>{m.anio} · Registro autorizado para difusión</span>
                    </p>
                    <h1><TituloResaltado titulo={m.titulo} resaltado={m.resaltado} /></h1>
                </header>

                <div className="detalle-noticia__cuerpo">
                    <div className="detalle-noticia__columnas">
                        <div className="detalle-noticia__texto">
                            <div className="detalle-noticia__imagen"><FotoMemoria src={m.imagen} /></div>
                            {!entradaRepetida && <p className="detalle-noticia__introduccion">{m.entrada}</p>}
                            {m.cuerpo.map((p, i) => <p key={i}>{p}</p>)}
                            <Reacciones id={m.id} titulo={m.titulo} textoUtil="Me fue útil" pregunta="¿Qué te pareció este recuerdo?" />
                        </div>

                        <aside className="detalle-noticia__lateral">
                            <section className="detalle-lateral__tarjeta" aria-labelledby="titulo-registro">
                                <EtiquetaPerfil id="titulo-registro" icono={iconoLibro}>Sobre este registro</EtiquetaPerfil>
                                <dl className="detalle-lateral__datos">
                                    <div><dt>Año</dt><dd>{m.anio}</dd></div>
                                    <div><dt>Tipo</dt><dd>Memoria pública</dd></div>
                                    <div><dt>Uso</dt><dd>Autorizado para difusión</dd></div>
                                </dl>
                            </section>

                            {otros.length > 0 && (
                                <section className="detalle-lateral__tarjeta" aria-labelledby="titulo-otros-registros">
                                    <EtiquetaPerfil id="titulo-otros-registros" icono={iconoLibro}>Otros registros</EtiquetaPerfil>
                                    <ul className="detalle-lateral__otras">
                                        {otros.map((x) => (
                                            <li key={x.id}>
                                                <Link to={`/lecturas/memoria/${x.id}`} className="detalle-lateral__otra">
                                                    <span className="detalle-lateral__miniatura"><FotoMemoria src={x.imagen} /></span>
                                                    <span><strong>{x.titulo}</strong><small>{x.anio}</small></span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <div className="detalle-lateral__botones">
                                <Link to="/lecturas/memoria" className="perfil-boton">Ver toda la memoria</Link>
                                <Link to="/lecturas" className="perfil-boton perfil-boton--contorno">Volver a Lecturas</Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </article>
        </PaginaPublica>
    );
}

export default DetalleMemoria;

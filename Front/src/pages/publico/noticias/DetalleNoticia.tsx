import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Noticias.css";
import { fechaLarga, obtenerNoticia, obtenerNoticias, otrasNoticias, type Noticia } from "./datos";
import { BotonRegreso, CargandoNoticias, EncabezadoNoticias, EstadoNoticias, PuntoCategoria, TarjetaChica, type Origen } from "./piezas";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import volverOscura from "../../../assets/comun/iconos/volver-oscura.svg";
import iconoCalendario from "../../../assets/noticias/dato-calendario.svg";
import iconoReloj from "../../../assets/noticias/dato-reloj.svg";
import iconoPin from "../../../assets/noticias/dato-pin.svg";
import iconoEstrella from "../../../assets/noticias/reaccion-estrella.svg";
import iconoCheck from "../../../assets/noticias/reaccion-check.svg";
import iconoCompartir from "../../../assets/noticias/reaccion-compartir.svg";

type Carga =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "no-disponible" }
    | { estado: "listo"; noticia: Noticia; otras: Noticia[] };

// /noticias/:id: la noticia completa, otras noticias y un pie para seguir leyendo
function DetalleNoticia() {
    const { id } = useParams();
    const origen = (useLocation().state as Origen | null) ?? { desde: "noticias" };
    const [intento, setIntento] = useState(0);
    // Se guarda qué pedido respondió: mientras no llegue el de la noticia actual, está "cargando"
    const clave = `${id}|${intento}`;
    const [respuesta, setRespuesta] = useState<{ clave: string; carga: Carga } | null>(null);
    const carga: Carga = respuesta?.clave === clave ? respuesta.carga : { estado: "cargando" };

    useEffect(() => {
        let vigente = true;
        obtenerNoticia(id)
            .then((noticia) => {
                if (!vigente) return;
                setRespuesta({ clave, carga: noticia ? { estado: "listo", noticia, otras: [] } : { estado: "no-disponible" } });
                window.scrollTo(0, 0);
                // Las recomendaciones no bloquean el artículo ni convierten un 404 en error de carga.
                if (noticia) void obtenerNoticias().then(todas => {
                    if (vigente) setRespuesta({ clave, carga: { estado: "listo", noticia, otras: otrasNoticias(todas, noticia.id) } });
                }).catch(() => { /* El contenido principal ya está disponible. */ });
            })
            .catch(() => { if (vigente) setRespuesta({ clave, carga: { estado: "error" } }); });
        return () => { vigente = false; };
    }, [id, clave]);

    // Si llegó desde "Todas las noticias", regresa a esa misma búsqueda
    const regreso = origen.desde === "todas"
        ? { texto: "Volver al listado de noticias", ruta: `/noticias/todas${origen.busqueda ? `?${origen.busqueda}` : ""}` }
        : { texto: "Volver a Noticias", ruta: "/noticias" };

    if (carga.estado !== "listo") {
        return (
            <PaginaPublica>
                <EncabezadoNoticias regreso={regreso} etiqueta="Noticia" titulo="Noticias de la biblioteca" texto="Avisos, actividades y novedades de la comunidad." />
                <section className="noticias-seccion">
                    <div className="noticias-contenedor">
                        {carga.estado === "cargando" && <CargandoNoticias />}
                        {carga.estado === "error" && <EstadoNoticias tipo="error" alAccionar={() => setIntento((n) => n + 1)} />}
                        {carga.estado === "no-disponible" && <EstadoNoticias tipo="no-disponible" />}
                    </div>
                </section>
            </PaginaPublica>
        );
    }

    const { noticia, otras } = carga;

    return (
        <PaginaPublica>
            <article>
                <header className="detalle-noticia__encabezado">
                    <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                    <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                    <div className="encabezado-noticias__regreso">
                        <BotonRegreso {...regreso} />
                    </div>
                    <span className="etiqueta-inicio">
                        <span className="punto-dorado" />
                        Noticia
                    </span>
                    <p className="detalle-noticia__meta">
                        <PuntoCategoria categoria={noticia.categoria} claro />
                        <span>{fechaLarga(noticia.fecha)} · {noticia.minutosLectura} min de lectura</span>
                    </p>
                    <h1>{conResaltado(noticia.titulo, noticia.resaltado)}</h1>
                    <p className="detalle-noticia__resumen">{noticia.resumen}</p>
                </header>

                <div className="detalle-noticia__cuerpo">
                    <div className="detalle-noticia__imagen">
                        <img src={noticia.imagen || undefined} alt={noticia.textoAlternativo ?? ""} />
                        <span className="tarjeta-noticia__ilustrativa">Imagen ilustrativa</span>
                    </div>

                    <div className="detalle-noticia__texto">
                        <p className="detalle-noticia__introduccion">{noticia.introduccion}</p>
                        {noticia.bloques.map((bloque, i) => {
                            if (bloque.tipo === "subtitulo") return <h2 key={i}>{bloque.texto}</h2>;
                            if (bloque.tipo === "parrafo") return <p key={i}>{bloque.texto}</p>;
                            return (
                                <dl key={i} className="datos-noticia">
                                    <DatoActividad icono={iconoCalendario} titulo="CUÁNDO">{bloque.cuando}</DatoActividad>
                                    <DatoActividad icono={iconoReloj} titulo="HORARIO">{bloque.horario}</DatoActividad>
                                    <DatoActividad icono={iconoPin} titulo="DÓNDE">{bloque.donde}</DatoActividad>
                                </dl>
                            );
                        })}
                        <Reacciones noticia={noticia} />
                    </div>
                </div>
            </article>

            {otras.length > 0 && (
                <section className="otras-noticias-seccion" aria-labelledby="titulo-otras">
                    <div className="noticias-contenedor">
                        <div className="noticias-mas__titulo">
                            <h2 id="titulo-otras">Otras noticias de la biblioteca</h2>
                            <p>Sigue conociendo lo que pasa en la biblioteca.</p>
                        </div>
                        <ul className="noticias-fila">
                            {otras.map((otra) => (
                                <li key={otra.id}>
                                    <TarjetaChica noticia={otra} origen={origen} />
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            <section className="seguir-leyendo">
                <div className="noticias-contenedor seguir-leyendo__fila">
                    <div>
                        <h2>¿Quieres seguir leyendo?</h2>
                        <p>Hay más noticias de la biblioteca.</p>
                    </div>
                    <div className="seguir-leyendo__botones">
                        {origen.desde === "todas" ? (
                            <Link to={regreso.ruta} className="boton-noticias boton-noticias--contorno boton-noticias--chico">
                                <img src={volverOscura} alt="" />
                                Volver al listado
                            </Link>
                        ) : (
                            <>
                                <Link to="/noticias" className="boton-noticias boton-noticias--contorno boton-noticias--chico">
                                    <img src={volverOscura} alt="" />
                                    Volver a Noticias
                                </Link>
                                <Link to="/noticias/todas" className="boton-noticias boton-noticias--verde boton-noticias--chico">
                                    Ver más noticias
                                    <img src={flechaBlanca} alt="" />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>
        </PaginaPublica>
    );
}

// Pinta en dorado la parte "resaltado" del título, si aparece tal cual
function conResaltado(titulo: string, resaltado?: string): ReactNode {
    const inicio = resaltado ? titulo.indexOf(resaltado) : -1;
    if (!resaltado || inicio < 0) return titulo;
    return (
        <>
            {titulo.slice(0, inicio)}
            <span>{resaltado}</span>
            {titulo.slice(inicio + resaltado.length)}
        </>
    );
}

function DatoActividad({ icono, titulo, children }: { icono: string; titulo: string; children: string }) {
    return (
        <div className="datos-noticia__dato">
            <span className="datos-noticia__icono"><img src={icono} alt="" /></span>
            <div>
                <dt>{titulo}</dt>
                <dd>{children}</dd>
            </div>
        </div>
    );
}

// Visitante: ve cuántas reacciones hay, pero para reaccionar necesita una cuenta.
// Compartir sí funciona sin cuenta (menú del sistema o copia el enlace).
function Reacciones({ noticia }: { noticia: Noticia }) {
    const [aviso, setAviso] = useState("");

    async function compartir() {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: noticia.titulo, url });
                return;
            }
            await navigator.clipboard.writeText(url);
            setAviso("Enlace copiado");
        } catch {
            // El usuario cerró el menú de compartir o el navegador no dejó copiar
        }
    }

    return (
        <div className="reacciones-noticia">
            <div className="reacciones-noticia__pregunta">
                <p className="reacciones-noticia__titulo">¿QUÉ TE PARECIÓ?</p>
                <p>
                    <Link to="/iniciar-sesion" className="enlace-noticias enlace-noticias--subrayado">Inicia sesión</Link> para reaccionar
                </p>
            </div>
            <div className="reacciones-noticia__chips">
                <span className="reaccion-noticia">
                    <img src={iconoEstrella} alt="" className="reaccion-noticia__estrella" />
                    Me gusta
                    <span className="reaccion-noticia__cantidad">{noticia.reacciones.meGusta}</span>
                </span>
                <span className="reaccion-noticia">
                    <img src={iconoCheck} alt="" />
                    Me sirvió
                    <span className="reaccion-noticia__cantidad">{noticia.reacciones.meSirvio}</span>
                </span>
                <button type="button" className="reaccion-noticia reaccion-noticia--boton" onClick={compartir}>
                    <img src={iconoCompartir} alt="" />
                    Compartir
                    <span className="reaccion-noticia__cantidad">{noticia.reacciones.compartir}</span>
                </button>
            </div>
            <p className="solo-lectores" role="status">{aviso}</p>
            {aviso && <p className="reacciones-noticia__aviso" aria-hidden="true">{aviso}</p>}
        </div>
    );
}

export default DetalleNoticia;

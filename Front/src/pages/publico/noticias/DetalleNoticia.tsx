import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import "./Noticias.css";
import { fechaLarga, nombreCategoria, obtenerNoticia, obtenerNoticias, otrasNoticias, type Noticia } from "./datos";
import iconoNoticias from "../../../assets/inicio/noticias-periodico.svg";
import { EtiquetaPerfil } from "../perfil/piezas";
import { useSesion } from "../perfil/usarSesion";
import { conteoLocal, consultarReacciones, marcarReaccion, reaccionesLocales, registrarCompartido, type ReaccionesNoticia, type TipoReaccion } from "../../../servicios/reacciones";
import { EncabezadoNoticias, EstadoNoticias, ImagenNoticia, PuntoCategoria, type Origen } from "./piezas";
import { EsqueletoArticulo } from "../../../components/portal/Esqueleto";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
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
                <EncabezadoNoticias icono={iconoNoticias} compacto etiqueta="Noticia" titulo="Noticias de la biblioteca" texto="Avisos, actividades y novedades de la comunidad." />
                <section className="noticias-seccion noticias-pagina">
                    <div className="noticias-contenedor">
                        {carga.estado === "cargando" && <EsqueletoArticulo texto="Cargando la noticia…" />}
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
                <header className="detalle-noticia__encabezado detalle-noticia__encabezado--compacto">
                    <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                    <img className="encabezado-publico__circulo detalle-noticia__circulo--2" src={circulo2} alt="" />
                    <p className="detalle-noticia__meta">
                        <PuntoCategoria categoria={noticia.categoria} claro />
                        <span>{fechaLarga(noticia.fecha)} · {noticia.minutosLectura} min de lectura</span>
                    </p>
                    <h1>{conResaltado(noticia.titulo, noticia.resaltado)}</h1>
                    {noticia.resumen.trim() !== noticia.introduccion.trim() && <p className="detalle-noticia__resumen">{noticia.resumen}</p>}
                </header>

                <div className="detalle-noticia__cuerpo">
                    {/* Dos columnas: el texto y, al lado, datos, reacciones y otras noticias (sin franjas largas al final) */}
                    <div className="detalle-noticia__columnas">
                        <div className="detalle-noticia__texto">
                            <div className="detalle-noticia__imagen">
                                <ImagenNoticia noticia={noticia} ilustrativa perezosa={false} />
                            </div>
                            <p className="detalle-noticia__introduccion">{noticia.introduccion}</p>
                            {noticia.bloques.map((bloque, i) => {
                                if (bloque.tipo === "subtitulo") return <h2 key={i}>{bloque.texto}</h2>;
                                if (bloque.tipo === "parrafo") return <p key={i}>{bloque.texto}</p>;
                                return (
                                    <dl key={i} className="datos-noticia">
                                        <DatoActividad icono={iconoCalendario} titulo="Cuándo">{bloque.cuando}</DatoActividad>
                                        <DatoActividad icono={iconoReloj} titulo="Horario">{bloque.horario}</DatoActividad>
                                        <DatoActividad icono={iconoPin} titulo="Dónde">{bloque.donde}</DatoActividad>
                                    </dl>
                                );
                            })}
                            <Reacciones noticia={noticia} />
                        </div>

                        <aside className="detalle-noticia__lateral">
                            <section className="detalle-lateral__tarjeta">
                                <EtiquetaPerfil icono={iconoNoticias}>Sobre esta noticia</EtiquetaPerfil>
                                <dl className="detalle-lateral__datos">
                                    <div><dt>Categoría</dt><dd>{nombreCategoria(noticia.categoria)}</dd></div>
                                    <div><dt>Publicada</dt><dd>{fechaLarga(noticia.fecha)}</dd></div>
                                    <div><dt>Lectura</dt><dd>{noticia.minutosLectura} min</dd></div>
                                </dl>
                            </section>

                            {otras.length > 0 && (
                                <section className="detalle-lateral__tarjeta" aria-labelledby="titulo-otras">
                                    <EtiquetaPerfil id="titulo-otras" icono={iconoNoticias}>Otras noticias</EtiquetaPerfil>
                                    <ul className="detalle-lateral__otras">
                                        {otras.slice(0, 3).map((otra) => (
                                            <li key={otra.id}>
                                                <Link to={`/noticias/${otra.id}`} state={origen} className="detalle-lateral__otra">
                                                    <span className="detalle-lateral__miniatura"><ImagenNoticia noticia={otra} /></span>
                                                    <span><strong>{otra.titulo}</strong><small>{fechaLarga(otra.fecha)}</small></span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            <div className="detalle-lateral__botones">
                                <Link to="/noticias/todas" className="perfil-boton">Ver más noticias</Link>
                                <Link to={regreso.ruta} className="perfil-boton perfil-boton--contorno">{origen.desde === "todas" ? "Volver al listado" : "Volver a Noticias"}</Link>
                            </div>
                        </aside>
                    </div>
                </div>
            </article>
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
    const sesion = useSesion(); // undefined = todavía no se sabe; null = visitante
    const [aviso, setAviso] = useState("");
    const [servidor, setServidor] = useState<ReaccionesNoticia | null>(null); // lo que responde el backend (cuando exista)
    const [, refrescar] = useState(0);
    const [enviando, setEnviando] = useState(false);
    // Sin backend: marcas y compartidos guardados en este navegador (sobreviven a recargar)
    const mias = servidor?.mias ?? (sesion ? reaccionesLocales.de(sesion, noticia.id) : []);
    const conteo = servidor ?? conteoLocal(noticia.reacciones, noticia.id, mias);

    useEffect(() => {
        let vigente = true;
        consultarReacciones(noticia.id).then((r) => { if (vigente) setServidor(r); })
            .catch(() => { /* TODO backend: aún no existe; se usan los datos guardados aquí */ });
        return () => { vigente = false; };
    }, [noticia.id, sesion]);

    async function alternar(tipo: TipoReaccion) {
        if (!sesion || enviando) return;
        const activa = !mias.includes(tipo);
        setEnviando(true);
        try { setServidor(await marcarReaccion(noticia.id, tipo, activa)); }
        catch { reaccionesLocales.guardar(sesion, noticia.id, activa ? [...mias, tipo] : mias.filter((t) => t !== tipo)); refrescar((n) => n + 1); }
        finally { setEnviando(false); }
    }

    async function compartir() {
        const url = window.location.href;
        try {
            if (navigator.share) await navigator.share({ title: noticia.titulo, url });
            else { await navigator.clipboard.writeText(url); setAviso("Enlace copiado"); }
        } catch { return; /* cerró el menú de compartir o el navegador no dejó copiar */ }
        try { setServidor(await registrarCompartido(noticia.id)); }
        catch { reaccionesLocales.sumarCompartido(noticia.id); refrescar((n) => n + 1); }
    }

    const opciones = [
        { tipo: "me_gusta" as const, texto: "Me gusta", icono: iconoEstrella, cantidad: conteo.meGusta },
        { tipo: "me_sirvio" as const, texto: "Me sirvió", icono: iconoCheck, cantidad: conteo.meSirvio },
    ];
    return (
        <div className="reacciones-noticia">
            <div className="reacciones-noticia__pregunta">
                <p className="reacciones-noticia__titulo">¿Qué te pareció?</p>
                {sesion === null && (
                    <p><Link to="/iniciar-sesion" className="enlace-noticias enlace-noticias--subrayado">Inicia sesión</Link> para reaccionar</p>
                )}
                {sesion && <p>Toca una opción para marcarla o quitarla.</p>}
            </div>
            <div className="reacciones-noticia__chips">
                {opciones.map((o) => {
                    const activa = mias.includes(o.tipo);
                    return (
                        <button key={o.tipo} type="button" disabled={!sesion} aria-pressed={activa}
                            className={`reaccion-noticia reaccion-noticia--boton${activa ? " reaccion-noticia--activa" : ""}`} onClick={() => alternar(o.tipo)}>
                            <img src={o.icono} alt="" />
                            {o.texto}
                            <span className="reaccion-noticia__cantidad">{o.cantidad}</span>
                        </button>
                    );
                })}
                <button type="button" className="reaccion-noticia reaccion-noticia--boton" onClick={compartir}>
                    <img src={iconoCompartir} alt="" />
                    Compartir
                    <span className="reaccion-noticia__cantidad">{conteo.compartir}</span>
                </button>
            </div>
            <p className="solo-lectores" role="status">{aviso}</p>
            {aviso && <p className="reacciones-noticia__aviso" aria-hidden="true">{aviso}</p>}
        </div>
    );
}

export default DetalleNoticia;

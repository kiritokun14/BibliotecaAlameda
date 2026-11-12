import { usePublicados } from "../../../servicios/usarPublicados.ts";
import { noticiaPublicada, fechaLarga } from "../noticias/datos";
import { useState } from "react";
import fotoRespaldo from "../../../assets/comun/fotos/foto-biblioteca.jpg";
import { Link } from "react-router";
import { Bloque, EncabezadoSeccion, Etiqueta } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { type CategoriaNoticia } from "./datos";
import circulo1 from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import rama from "../../../assets/inicio/noticias-rama.svg";
import iconoPeriodico from "../../../assets/inicio/noticias-periodico.svg";
import flechaBlanca from "../../../assets/inicio/lecturas-flecha.svg";
import iconoUsuarios from "../../../assets/inicio/noticia-usuarios-rosa.svg";
import iconoCalendario from "../../../assets/inicio/noticia-calendario.svg";
import iconoReloj from "../../../assets/inicio/noticia-reloj.svg";
import flechaVerde from "../../../assets/inicio/noticia-flecha.svg";
import anterior from "../../../assets/inicio/noticia-anterior.svg";
import siguiente from "../../../assets/inicio/noticia-siguiente.svg";

// Color de la pastilla y su ícono según la categoría
const categorias: Record<CategoriaNoticia, { color: string; icono: string }> = {
    Institucional: { color: "verde", icono: iconoUsuarios },
    Aviso: { color: "dorada", icono: iconoReloj },
    Actividades: { color: "verde", icono: iconoCalendario },
    Comunidad: { color: "rosa", icono: iconoUsuarios },
};

// A la izquierda la noticia grande; a la derecha la lista para elegir cuál ver
function Noticias() {
    const [activa, setActiva] = useState(0);
    const { datos, error } = usePublicados('noticia');
    const categoriaInicio = { institucional: 'Institucional', avisos: 'Aviso', actividades: 'Actividades', comunidad: 'Comunidad' } as const;
    const noticias = (datos ?? []).slice(0, 4).map(noticiaPublicada).map(c => ({ ...c, categoria: categoriaInicio[c.categoria], fecha: fechaLarga(c.fecha), enlace: 'Leer noticia completa' }));
    const destacada = noticias[activa] ?? noticias[0];
    const total = noticias.length;

    if (!destacada) return <section className="seccion-inicio"><h2>Noticias</h2><p role={error ? "alert" : "status"}>{error ?? (!datos ? "Cargando noticias…" : "Todavía no hay noticias publicadas.")}</p></section>;
    return (
        <section className="seccion-inicio seccion-inicio--blanca">
            <Bloque tema="verde" circulos={[circulo1, circulo2]} textura={{ src: rama, ancho: 380, alto: 380 }}>
                <EncabezadoSeccion
                    etiqueta="Noticias"
                    iconoEtiqueta={iconoPeriodico}
                    titulo={<>Últimas <span>noticias</span> de la biblioteca</>}
                    boton={{ texto: "Ver todas las noticias", ruta: "/noticias", icono: flechaBlanca }}
                />

                <div className="noticias">
                    <article className="noticia-destacada">
                        <div className="noticia-destacada__imagen">
                            {/* Todas las fotos están encimadas; solo la activa se ve (cambio con desvanecido) */}
                            {noticias.map((noticia, i) => (
                                <FotoNoticia key={noticia.id} src={noticia.imagen}
                                    className={i === activa ? "noticia-destacada__foto noticia-destacada__foto--activa" : "noticia-destacada__foto"} />
                            ))}
                            <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                            {/* El % hace que al llegar al final vuelva a empezar */}
                            <Flecha lado="anterior" icono={anterior} alPresionar={() => setActiva((activa - 1 + total) % total)} />
                            <Flecha lado="siguiente" icono={siguiente} alPresionar={() => setActiva((activa + 1) % total)} />
                            <div className="noticia-destacada__puntos">
                                <Puntos total={total} activo={activa} alElegir={setActiva} />
                            </div>
                        </div>
                        {/* key={activa}: React vuelve a dibujar el texto y se repite la animación de entrada */}
                        <div key={activa} className="noticia-destacada__contenido">
                            <p className="noticia-destacada__meta">
                                <span className="pastilla-destacada">Destacada</span>
                                {destacada.categoria} · {destacada.fecha}
                            </p>
                            <h3>{destacada.titulo}</h3>
                            <p>{destacada.resumen}</p>
                            <Link to={`/noticias/${destacada.id}`} className="enlace-flecha">
                                {destacada.enlace}
                                <img src={flechaVerde} alt="" />
                            </Link>
                        </div>
                    </article>

                    <ul className="otras-noticias">
                        {noticias.map((noticia, i) => (
                            <li key={noticia.id}>
                                <button
                                    type="button"
                                    className={i === activa ? "noticia-mini noticia-mini--activa" : "noticia-mini"}
                                    aria-pressed={i === activa}
                                    onClick={() => setActiva(i)}
                                >
                                    <span className="noticia-mini__meta">
                                        <Etiqueta
                                            icono={categorias[noticia.categoria].icono}
                                            className={`etiqueta-inicio--${categorias[noticia.categoria].color}`}
                                        >
                                            {noticia.categoria}
                                        </Etiqueta>
                                        {noticia.fecha}
                                        <span className="noticia-mini__viendo" aria-hidden={i !== activa}>Viendo</span>
                                    </span>
                                    <span className="noticia-mini__titulo">{noticia.titulo}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="nota-ejemplo">Noticias autorizadas por la biblioteca.</p>
            </Bloque>
        </section>
    );
}

export default Noticias;

// Foto de la noticia; si no tiene o no carga (por ejemplo, el servidor de imágenes falla),
// una foto de la biblioteca en lugar de un recuadro en blanco
function FotoNoticia({ src, className }: { src?: string; className: string }) {
    const [fallo, setFallo] = useState(false);
    return <img className={className} src={src && !fallo ? src : fotoRespaldo} alt="" decoding="async" onError={() => setFallo(true)} />;
}

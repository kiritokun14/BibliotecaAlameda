import { useState } from "react";
import { Link } from "react-router";
import { Bloque, EncabezadoSeccion, Etiqueta } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { noticias, type CategoriaNoticia } from "./datos";
import circulo1 from "../../assets/inicio/noticias-circulo-1.svg";
import circulo2 from "../../assets/inicio/noticias-circulo-2.svg";
import rama from "../../assets/inicio/noticias-rama.svg";
import iconoPeriodico from "../../assets/inicio/noticias-periodico.svg";
import flechaBlanca from "../../assets/inicio/noticias-flecha-blanca.svg";
import iconoUsuarios from "../../assets/inicio/noticia-usuarios-rosa.svg";
import iconoCalendario from "../../assets/inicio/noticia-calendario.svg";
import iconoReloj from "../../assets/inicio/noticia-reloj.svg";
import flechaVerde from "../../assets/inicio/noticia-flecha.svg";
import anterior from "../../assets/inicio/noticia-anterior.svg";
import siguiente from "../../assets/inicio/noticia-siguiente.svg";

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
    const destacada = noticias[activa];
    const total = noticias.length;

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
                            <img src={destacada.imagen} alt="" />
                            <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                            {/* El % hace que al llegar al final vuelva a empezar */}
                            <Flecha lado="anterior" icono={anterior} alPresionar={() => setActiva((activa - 1 + total) % total)} />
                            <Flecha lado="siguiente" icono={siguiente} alPresionar={() => setActiva((activa + 1) % total)} />
                            <div className="noticia-destacada__puntos">
                                <Puntos total={total} activo={activa} alElegir={setActiva} />
                            </div>
                        </div>
                        <div className="noticia-destacada__contenido">
                            <p className="noticia-destacada__meta">
                                <span className="pastilla-destacada">Destacada</span>
                                {destacada.categoria} · {destacada.fecha}
                            </p>
                            <h3>{destacada.titulo}</h3>
                            <p>{destacada.resumen}</p>
                            {/* TODO: página de cada noticia */}
                            <Link to="/noticias" className="enlace-flecha">
                                {destacada.enlace}
                                <img src={flechaVerde} alt="" />
                            </Link>
                        </div>
                    </article>

                    <ul className="otras-noticias">
                        {noticias.map((noticia, i) => (
                            <li key={noticia.titulo}>
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
                                    </span>
                                    <span className="noticia-mini__titulo">{noticia.titulo}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="nota-ejemplo">Noticias de ejemplo; la biblioteca publicará su contenido real.</p>
            </Bloque>
        </section>
    );
}

export default Noticias;

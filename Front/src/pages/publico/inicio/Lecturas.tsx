import { useState } from "react";
import { useLecturasPublicadas } from "../lecturas/publicados";
import { Bloque, EncabezadoSeccion } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { useCarrusel } from "./useCarrusel";
import { Link } from "react-router";
import { type Libro } from "./datos";
import circulo1 from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import textura from "../../../assets/inicio/lecturas-textura.svg";
import iconoLibro from "../../../assets/comun/iconos/lecturas-libro.svg";
import flechaBlanca from "../../../assets/inicio/lecturas-flecha.svg";
import anterior from "../../../assets/inicio/carrusel-anterior.svg";
import siguiente from "../../../assets/inicio/carrusel-siguiente.svg";
import formaNarrativa from "../../../assets/inicio/forma-narrativa.svg";
import formaNarrativaPunto from "../../../assets/inicio/forma-narrativa-punto.svg";
import formaHistoria1 from "../../../assets/inicio/forma-historia-1.svg";
import formaHistoria2 from "../../../assets/inicio/forma-historia-2.svg";
import formaHistoria3 from "../../../assets/inicio/forma-historia-3.svg";
import formaPoesia from "../../../assets/inicio/forma-poesia.svg";
import formaEnsayo1 from "../../../assets/inicio/forma-ensayo-1.svg";
import formaEnsayo2 from "../../../assets/inicio/forma-ensayo-2.svg";
import formaEnsayo3 from "../../../assets/inicio/forma-ensayo-3.svg";
import formaEnsayo4 from "../../../assets/inicio/forma-ensayo-4.svg";
import formaEnsayo5 from "../../../assets/inicio/forma-ensayo-5.svg";
import formaEnsayo6 from "../../../assets/inicio/forma-ensayo-6.svg";
import iconoSala from "../../../assets/inicio/estado-consulta-sala.svg";
import iconoInfo from "../../../assets/comun/iconos/lecturas-info.svg";
import flechaVerde from "../../../assets/inicio/lecturas-flecha-verde.svg";

// El dibujo del centro de cada portada cambia según el género
function Ilustracion({ estilo }: { estilo: Libro["estilo"] }) {
    switch (estilo) {
        case "narrativa":
            return (
                <>
                    <img className="forma" style={{ left: 30, top: 40, width: 140 }} src={formaNarrativa} alt="" />
                    <span className="forma forma--arco-borde" />
                    <span className="forma forma--arco-relleno" />
                    <img className="forma" style={{ left: 30, top: 150, width: 26 }} src={formaNarrativaPunto} alt="" />
                    <img className="forma" style={{ left: 150, top: 140, width: 26 }} src={formaNarrativaPunto} alt="" />
                    <img className="forma" style={{ left: 160, top: 168, width: 26 }} src={formaNarrativaPunto} alt="" />
                    <span className="forma forma--linea" />
                </>
            );
        case "historia":
            return (
                <>
                    {[0.8, 0.68, 0.56, 0.44, 0.32].map((opacidad, i) => (
                        <span
                            key={opacidad}
                            className="forma forma--raya"
                            style={{ top: 36 + i * 9, background: `rgba(230, 209, 148, ${opacidad})` }}
                        />
                    ))}
                    <img className="forma" style={{ left: 110, top: 100, width: 70 }} src={formaHistoria1} alt="" />
                    <img className="forma" style={{ left: 122, top: 112, width: 46 }} src={formaHistoria2} alt="" />
                    <img className="forma" style={{ left: 134, top: 124, width: 22 }} src={formaHistoria3} alt="" />
                </>
            );
        case "poesia":
            return (
                <>
                    <img className="forma" style={{ left: 110, top: 30, width: 76 }} src={formaPoesia} alt="" />
                    <span className="forma forma--cuadro" />
                    <span className="forma forma--barra-gruesa" />
                    <span className="forma forma--barra-delgada" />
                </>
            );
        case "consulta":
            // 3 filas de 5 arcos dorados
            return (
                <>
                    {[28, 66, 104].flatMap((top) =>
                        [28, 62, 96, 130, 164].map((left) => (
                            <span key={`${top}-${left}`} className="forma forma--arquito" style={{ top, left }} />
                        )),
                    )}
                </>
            );
        case "ensayo":
            return (
                <>
                    <img className="forma" style={{ left: 32, top: 54, width: 136 }} src={formaEnsayo1} alt="" />
                    <img className="forma" style={{ left: 46, top: 68, width: 108 }} src={formaEnsayo2} alt="" />
                    <img className="forma" style={{ left: 60, top: 82, width: 80 }} src={formaEnsayo3} alt="" />
                    <img className="forma" style={{ left: 74, top: 96, width: 52 }} src={formaEnsayo4} alt="" />
                    <img className="forma" style={{ left: 88, top: 110, width: 24 }} src={formaEnsayo5} alt="" />
                    <img className="forma" style={{ left: 88, top: 110, width: 24 }} src={formaEnsayo6} alt="" />
                </>
            );
    }
}

// La portada ilustrada se ve siempre; si el libro tiene foto, aparece encima con un desvanecido
// solo cuando terminó de cargar. Si la foto falla o tarda, se queda la ilustrada (nunca un recuadro vacío).
function PortadaLibro({ libro }: { libro: Libro }) {
    const [foto, setFoto] = useState<"cargando" | "lista" | "fallo">("cargando");
    const conFoto = Boolean(libro.portadaUrl) && foto !== "fallo";
    return (
        <div className={`portada-libro portada-libro--${libro.estilo}`}>
            <Ilustracion estilo={libro.estilo} />
            {/* lomo y hojas para que parezca un libro de verdad */}
            <span className="portada-libro__lomo" aria-hidden="true" />
            <span className="portada-libro__hojas" aria-hidden="true" />
            <p className="portada-libro__genero" aria-hidden="true">{libro.genero}</p>
            {/* En la portada solo el nombre del libro (lo que va antes de «:»); el título completo va debajo */}
            <p className="portada-libro__titulo" aria-hidden="true">{libro.titulo.split(":")[0]}</p>
            <p className="portada-libro__autoria" aria-hidden="true">{libro.autoria}</p>
            {conFoto && (
                <img className={`portada-libro__foto${foto === "lista" ? " portada-libro__foto--lista" : ""}`}
                    src={libro.portadaUrl} alt={foto === "lista" ? `Portada de ${libro.titulo}` : ""} decoding="async"
                    onLoad={() => setFoto("lista")} onError={() => setFoto("fallo")} />
            )}
        </div>
    );
}

function Lecturas() {
    const { resenas, datos, error } = useLecturasPublicadas();
    const libros: Libro[] = resenas.slice(0, 8).map(c => ({ id: c.id, titulo: c.libro, autoria: c.autoria, genero: c.genero, portadaUrl: c.imagen, estilo: "narrativa" }));
    const { refPista, pagina, totalPaginas, alDesplazar, irAnterior, irSiguiente, irAPagina } = useCarrusel();

    if (!libros.length) return <section className="seccion-inicio"><h2>Lecturas y reseñas</h2><p role={error ? "alert" : "status"}>{error ?? (!datos ? "Cargando lecturas…" : "Todavía no hay reseñas publicadas.")}</p></section>;
    return (
        <section className="seccion-inicio seccion-inicio--verde-claro">
            <Bloque tema="verde" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 420, alto: 200 }}>
                <EncabezadoSeccion
                    etiqueta="Lecturas y reseñas"
                    iconoEtiqueta={iconoLibro}
                    titulo={<>Para leer <span>esta semana</span></>}
                    boton={{ texto: "Ver todas las lecturas", ruta: "/lecturas", icono: flechaBlanca }}
                />

                <div className="carrusel">
                    <Flecha lado="anterior" icono={anterior} alPresionar={irAnterior} />
                    <div className="carrusel__pista" ref={refPista} onScroll={alDesplazar}>
                        {libros.map((libro) => (
                            <article key={libro.id} className="libro">
                                <PortadaLibro libro={libro} />
                                <h3>
                                    {/* El enlace cubre todo el libro (ver .libro__enlace::after).
                                        TODO: crear la página /lecturas/:id con la reseña */}
                                    <Link to={`/lecturas/${libro.id}`} className="libro__enlace">
                                        {libro.titulo}
                                    </Link>
                                </h3>
                                <p>{libro.autoria}</p>
                                {libro.soloEnSala && (
                                    <span className="estado-libro">
                                        <img src={iconoSala} alt="" />
                                        Consulta en sala
                                    </span>
                                )}
                            </article>
                        ))}
                    </div>
                    <Flecha lado="siguiente" icono={siguiente} alPresionar={irSiguiente} />
                </div>

                <Puntos total={totalPaginas} activo={pagina} alElegir={irAPagina} />
                <div className="repisa" />

                {/* El portal no muestra disponibilidad: eso vive en Koha (HU-04) */}
                <div className="aviso-catalogo">
                    <img src={iconoInfo} alt="" />
                    <p>La disponibilidad de cada libro se consulta en el catálogo de la biblioteca.</p>
                    <Link to="/catalogo" className="boton-contorno-verde">
                        Ver en el catálogo
                        <img src={flechaVerde} alt="" />
                    </Link>
                </div>
            </Bloque>
        </section>
    );
}

export default Lecturas;

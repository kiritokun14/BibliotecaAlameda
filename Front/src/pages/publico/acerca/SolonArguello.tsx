import { useState } from "react";
import { EncabezadoSeccion } from "../inicio/Bloque";
import { FotoConMarco, NotaAcerca, SeccionAcerca } from "./piezas";
import { biografiaCompleta, ficha, fichaCompleta, obras, trayectoria, type Fragmento } from "./datos";
import retrato from "../../../assets/acerca/solon-retrato.webp";
import fotoFachada from "../../../assets/acerca/foto-fachada.webp";
import iconoPersona from "../../../assets/acerca/etiqueta-persona.svg";
import iconoReloj from "../../../assets/acerca/etiqueta-reloj.svg";
import iconoLibro from "../../../assets/acerca/etiqueta-libro.svg";
import iconoCheck from "../../../assets/acerca/dato-check.svg";

function SolonArguello() {
    return (
        <>
            {/* Semblanza */}
            <SeccionAcerca textura="credencial">
                <EncabezadoSeccion
                    etiqueta="Semblanza"
                    iconoEtiqueta={iconoPersona}
                    titulo={<>Solón <span>Argüello</span></>}
                    texto="Quien da nombre a la biblioteca."
                />
                <TarjetaSemblanza />
            </SeccionAcerca>

            {/* Trayectoria */}
            <SeccionAcerca fondo="blanca" textura="rama">
                <EncabezadoSeccion
                    etiqueta="Trayectoria"
                    iconoEtiqueta={iconoReloj}
                    titulo="De Nicaragua a Nayarit y la Revolución"
                    texto="Cuatro momentos de su vida (fechas según fuentes públicas; por confirmar)."
                />
                <ol className="tarjeta-blanca lista-etapas">
                    {trayectoria.map((momento) => (
                        <li key={momento.titulo} className="etapa">
                            <div className="etapa__boton etapa__boton--fijo">
                                <span className="icono-dorado">
                                    <img src={iconoCheck} alt="" />
                                </span>
                                <span className="etapa__textos">
                                    <strong>{momento.titulo}</strong>
                                    <span>{momento.texto}</span>
                                </span>
                                <span className="etapa__fecha">{momento.fecha}</span>
                            </div>
                        </li>
                    ))}
                </ol>
                <FotoConMarco src={fotoFachada} pie="La biblioteca que lleva su nombre" alto={200} className="foto-marco--ancha" />
            </SeccionAcerca>

            {/* Catálogo de obras */}
            <SeccionAcerca textura="libros">
                <EncabezadoSeccion
                    etiqueta="Catálogo de obras"
                    iconoEtiqueta={iconoLibro}
                    titulo={<>Catálogo de <span>obras</span></>}
                    texto="Obras publicadas según fuentes públicas; la biblioteca confirmará ediciones."
                />
                <ul className="cuatro-columnas">
                    {obras.map((obra) => (
                        <li key={obra.titulo} className="tarjeta-blanca tarjeta-obra">
                            <img loading="lazy" decoding="async" src={obra.portada} alt={`Portada ilustrativa de ${obra.titulo}`} />
                            <h3>{obra.titulo}</h3>
                            <p>{obra.tipo}</p>
                        </li>
                    ))}
                </ul>
            </SeccionAcerca>

            <NotaAcerca>
                Datos biográficos tomados de fuentes públicas (Wikipedia, Crónica, Reporte Naranja); la biblioteca los
                confirmará. Retrato y portadas por confirmar.
            </NotaAcerca>
        </>
    );
}

// Biografía: resumida al inicio; "Ver más" despliega la versión completa (Figma: Estado=Completo)
function TarjetaSemblanza() {
    const [completa, setCompleta] = useState(false);

    const botonVerMas = (
        <button
            type="button"
            className="boton-ver-mas"
            aria-expanded={completa}
            aria-controls="biografia-completa"
            onClick={() => setCompleta(!completa)}
        >
            {completa ? "Ver menos" : "Ver más"} <span aria-hidden="true">{completa ? "▴" : "▾"}</span>
        </button>
    );
    const etiquetaFuentes = <span className="pastilla-por-confirmar">Fuentes públicas · por confirmar con la biblioteca</span>;
    const filas = completa ? fichaCompleta : ficha;

    return (
        <article className={completa ? "tarjeta-blanca semblanza semblanza--completa" : "tarjeta-blanca semblanza"}>
            <figure className="semblanza__retrato">
                <img src={retrato} alt="Retrato ilustrativo de Solón Argüello" />
                <figcaption>Ilustración de ejemplo</figcaption>
            </figure>
            <div className="semblanza__texto">
                <h3>Biografía</h3>
                <p>
                    Poeta, maestro y periodista nacido en <strong>León, Nicaragua</strong>, el{" "}
                    <strong>11 de julio de 1879</strong>. Llegó a México en 1902 y fue maestro en Tepic, donde fundó la
                    revista <strong>Tepic literario</strong> (1907). Fue secretario privado de Francisco I.{" "}
                    <strong>Madero</strong> y murió fusilado en 1913 por oponerse a Victoriano Huerta.
                </p>

                <div id="biografia-completa" className="semblanza__completa" hidden={!completa}>
                    {biografiaCompleta.map((parte) => (
                        <section key={parte.titulo}>
                            <h4>{parte.titulo}</h4>
                            <p><TextoResaltado partes={parte.texto} /></p>
                        </section>
                    ))}
                </div>

                {etiquetaFuentes}
                <dl className="ficha">
                    {filas.map((fila) => (
                        <div key={fila.dato}>
                            <dt>{fila.dato}</dt>
                            <dd>{fila.valor}</dd>
                        </div>
                    ))}
                </dl>
                {/* Un solo botón (así no pierde el foco del teclado). En la versión completa
                    el CSS lo sube arriba de la ficha, como en Figma. */}
                {botonVerMas}
            </div>
        </article>
    );
}

// Pinta en negritas verdes las partes marcadas como { resaltado: "..." }
function TextoResaltado({ partes }: { partes: Fragmento[] }) {
    return (
        <>
            {partes.map((parte, i) =>
                typeof parte === "string" ? parte : <strong key={i}>{parte.resaltado}</strong>,
            )}
        </>
    );
}

export default SolonArguello;

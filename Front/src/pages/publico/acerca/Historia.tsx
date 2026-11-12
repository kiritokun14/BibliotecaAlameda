import { useState } from "react";
import { EncabezadoSeccion } from "../inicio/Bloque";
import { FotoConMarco, NotaAcerca, SeccionAcerca } from "./piezas";
import { datosHistoria, etapas, type Etapa } from "./datos";
import fotoFachada from "../../../assets/acerca/foto-fachada.jpg";
import fotoEstudio from "../../../assets/acerca/foto-sala-estudio.jpg";
import fotoHemeroteca from "../../../assets/acerca/foto-hemeroteca.jpg";
import fotoInfantil from "../../../assets/acerca/foto-sala-infantil.jpg";
import iconoReloj from "../../../assets/acerca/etiqueta-reloj.svg";
import iconoImagen from "../../../assets/acerca/etiqueta-imagen.svg";
import iconoCheck from "../../../assets/acerca/dato-check.svg";
import iconoPorConfirmar from "../../../assets/acerca/icono-imagen.svg";
import chevronAbajo from "../../../assets/comun/iconos/chevron-abajo.svg";

function Historia() {
    return (
        <>
            {/* Un lugar de lectura para Nayarit */}
            <SeccionAcerca textura="libros">
                <EncabezadoSeccion
                    etiqueta="Historia"
                    iconoEtiqueta={iconoReloj}
                    titulo={<>Un lugar de lectura para <span>Nayarit</span></>}
                    texto="La Biblioteca Solón Argüello es la biblioteca pública central del estado, en Tepic. Aquí contamos cómo nació y cómo ha crecido."
                />
                <div className="historia-intro">
                    <div className="historia-intro__datos">
                        <ul className="lista-datos">
                            {datosHistoria.map((dato) => (
                                <li key={dato.titulo} className="tarjeta-blanca dato-acerca">
                                    <span className="icono-dorado">
                                        <img src={iconoCheck} alt="" />
                                    </span>
                                    <div>
                                        <strong>{dato.titulo}</strong>
                                        <p>{dato.texto}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <p className="fuente-dorada">Datos de la investigación de la Dra. Alma Delia Sánchez Andrade.</p>
                    </div>
                    <FotoConMarco src={fotoFachada} pie="Fachada · imagen ilustrativa" alto={330} className="historia-intro__foto" />
                </div>
            </SeccionAcerca>

            {/* La biblioteca por dentro */}
            <SeccionAcerca fondo="blanca" textura="rama">
                <EncabezadoSeccion
                    etiqueta="Galería"
                    iconoEtiqueta={iconoImagen}
                    titulo={<>La biblioteca <span>por dentro</span></>}
                    texto="Un recorrido por sus espacios. Imágenes ilustrativas."
                />
                <div className="galeria-acerca">
                    <FotoConMarco src={fotoEstudio} pie="Sala de estudio" alto={360} className="foto-marco--chica" />
                    <div className="galeria-acerca__columna">
                        <FotoConMarco src={fotoHemeroteca} pie="Hemeroteca" alto={164} className="foto-marco--chica" />
                        <FotoConMarco src={fotoInfantil} pie="Sala infantil" alto={164} className="foto-marco--chica" />
                    </div>
                </div>
            </SeccionAcerca>

            {/* Línea del tiempo */}
            <SeccionAcerca textura="credencial">
                <EncabezadoSeccion
                    etiqueta="Línea del tiempo"
                    iconoEtiqueta={iconoReloj}
                    titulo={<>Etapas de nuestra <span>historia</span></>}
                    texto="Del siglo XIX a 2024, según la investigación de la Dra. Alma Delia Sánchez Andrade."
                />
                <LineaDelTiempo />
            </SeccionAcerca>

            <NotaAcerca>
                Fuentes: Becerra Juárez, E. (1992), Historia de las bibliotecas de Nayarit, RNBP/CONACULTA; Nayarit,
                Historia en fotos (nayarithistoriaenfotos.com). Fragmento de la investigación de la Dra. Alma Delia
                Sánchez Andrade, Extensión Bibliotecaria.
            </NotaAcerca>
        </>
    );
}

// Lista de etapas: al presionar una se abre su detalle (solo una abierta a la vez)
function LineaDelTiempo() {
    const [abierta, setAbierta] = useState<number | null>(null);

    return (
        <ol className="tarjeta-blanca lista-etapas">
            {etapas.map((etapa, i) => {
                const estaAbierta = abierta === i;
                const idDetalle = `etapa-detalle-${i + 1}`;
                return (
                    <li key={etapa.titulo} className={estaAbierta ? "etapa etapa--abierta" : "etapa"}>
                        <button
                            type="button"
                            className="etapa__boton"
                            aria-expanded={estaAbierta}
                            aria-controls={idDetalle}
                            onClick={() => setAbierta(estaAbierta ? null : i)}
                        >
                            <span className="etapa__numero">{i + 1}</span>
                            <span className="etapa__textos">
                                <strong>{etapa.titulo}</strong>
                                <span>{etapa.resumen}</span>
                            </span>
                            <span className="etapa__fecha">{etapa.fecha}</span>
                            <img className="etapa__flecha" src={chevronAbajo} alt="" />
                        </button>

                        <div id={idDetalle} className="etapa__detalle" hidden={!estaAbierta}>
                            <p>{etapa.detalle}</p>
                            <ImagenEtapa etapa={etapa} />
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// Foto de la etapa. Si falta (o la biblioteca debe confirmarla) se marca "por confirmar".
function ImagenEtapa({ etapa }: { etapa: Etapa }) {
    const porConfirmar = !etapa.imagen || etapa.imagenPorConfirmar;
    return (
        <figure className={porConfirmar ? "etapa__imagen etapa__imagen--por-confirmar" : "etapa__imagen"}>
            {etapa.imagen && <img loading="lazy" decoding="async" src={etapa.imagen} alt={`Imagen ilustrativa: ${etapa.titulo}`} />}
            {porConfirmar && (
                <figcaption>
                    <img src={iconoPorConfirmar} alt="" />
                    Imagen ilustrativa · por confirmar
                </figcaption>
            )}
        </figure>
    );
}

export default Historia;

import { EncabezadoSeccion } from "../inicio/Bloque";
import { FotoConMarco, NotaAcerca, SeccionAcerca } from "./piezas";
import { fotosEnAccion, valores } from "./datos";
import fotoEstudio from "../../assets/acerca/foto-sala-estudio.jpg";
import iconoEstrellaEtiqueta from "../../assets/acerca/etiqueta-estrella.svg";
import iconoPersonasEtiqueta from "../../assets/acerca/etiqueta-personas.svg";
import iconoLibro from "../../assets/acerca/valor-libro.svg";
import iconoEstrella from "../../assets/acerca/valor-estrella.svg";

function MisionVision() {
    return (
        <>
            {/* Para qué existimos */}
            <SeccionAcerca textura="libros">
                <EncabezadoSeccion
                    etiqueta="Misión y visión"
                    iconoEtiqueta={iconoEstrellaEtiqueta}
                    titulo={<>Para qué <span>existimos</span></>}
                    texto="Lo que nos mueve y hacia dónde queremos llegar."
                />
                <div className="mision-vision">
                    <article className="tarjeta-blanca tarjeta-mision">
                        <span className="icono-dorado icono-dorado--grande">
                            <img src={iconoLibro} alt="" />
                        </span>
                        <h3>Misión</h3>
                        <span className="acento-dorado" aria-hidden="true" />
                        <p>
                            Ofrecer a la población de Nayarit{" "}
                            <strong>acceso libre a la lectura, la información y la cultura</strong>, con servicios
                            cercanos, claros y respetuosos para todas las personas.
                        </p>
                        <span className="pastilla-por-confirmar">Texto por confirmar</span>
                    </article>
                    <article className="tarjeta-blanca tarjeta-mision">
                        <span className="icono-dorado icono-dorado--grande">
                            <img src={iconoEstrella} alt="" />
                        </span>
                        <h3>Visión</h3>
                        <span className="acento-dorado" aria-hidden="true" />
                        <p>
                            Ser un espacio de referencia en el estado: <strong>abierto, actualizado y vivo</strong>, donde
                            la comunidad lee, aprende, crea y se encuentra.
                        </p>
                        <span className="pastilla-por-confirmar">Texto por confirmar</span>
                    </article>
                </div>
                <FotoConMarco src={fotoEstudio} pie="Sala de estudio · imagen ilustrativa" alto={220} className="foto-marco--ancha" />
            </SeccionAcerca>

            {/* Lo que nos guía */}
            <SeccionAcerca fondo="blanca" textura="rama">
                <EncabezadoSeccion
                    etiqueta="Valores"
                    iconoEtiqueta={iconoPersonasEtiqueta}
                    titulo={<>Lo que nos <span>guía</span></>}
                    texto="Principios con los que atendemos a la comunidad."
                />
                <ul className="tres-columnas">
                    {valores.map((valor) => (
                        <li key={valor.titulo} className="tarjeta-blanca tarjeta-valor">
                            <span className="icono-dorado">
                                <img src={valor.icono} alt="" />
                            </span>
                            <h3>{valor.titulo}</h3>
                            <p>{valor.texto}</p>
                        </li>
                    ))}
                </ul>

                <h3 className="subtitulo-bloque">La biblioteca en acción</h3>
                <div className="tres-columnas">
                    {fotosEnAccion.map((foto) => (
                        <FotoConMarco key={foto.pie} src={foto.imagen} pie={foto.pie} alto={190} />
                    ))}
                </div>
            </SeccionAcerca>

            <NotaAcerca>Textos de ejemplo; la biblioteca los confirmará.</NotaAcerca>
        </>
    );
}

export default MisionVision;

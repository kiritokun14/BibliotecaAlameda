import { Link } from "react-router";
import { EncabezadoSeccion } from "../inicio/Bloque";
import { NotaAcerca, SeccionAcerca } from "./piezas";
import { perspectivas } from "./datos";
import iconoPersonas from "../../../assets/acerca/etiqueta-personas.svg";
import iconoCheck from "../../../assets/acerca/dato-check.svg";
import circuloInvitacion from "../../../assets/acerca/invitacion-circulo.svg";
import flecha from "../../../assets/comun/iconos/flecha-oscura.svg";

function RolBiblioteca() {
    return (
        <>
            {/* Cuatro perspectivas */}
            <SeccionAcerca textura="rama">
                <EncabezadoSeccion
                    etiqueta="Perspectivas"
                    iconoEtiqueta={iconoPersonas}
                    titulo={<>Cuatro perspectivas, <span>una biblioteca</span></>}
                    texto="Una biblioteca pública cumple varios papeles a la vez. Estos son los cuatro desde los que trabajamos."
                />
                <ul className="dos-columnas">
                    {perspectivas.map((perspectiva) => (
                        <li key={perspectiva.titulo} className="tarjeta-blanca tarjeta-perspectiva">
                            <img className="tarjeta-perspectiva__foto" src={perspectiva.foto} alt="" />
                            <div className="tarjeta-perspectiva__contenido">
                                <h3>
                                    <span className="icono-dorado">
                                        <img src={perspectiva.icono} alt="" />
                                    </span>
                                    {perspectiva.titulo}
                                </h3>
                                <p>{perspectiva.texto}</p>
                                <ul className="lista-check">
                                    {perspectiva.puntos.map((punto) => (
                                        <li key={punto}>
                                            <img src={iconoCheck} alt="" />
                                            {punto}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    ))}
                </ul>
            </SeccionAcerca>

            {/* Invitación */}
            <section className="seccion-inicio seccion-inicio--crema seccion-acerca">
                <div className="invitacion-acerca">
                    <img className="invitacion-acerca__circulo" src={circuloInvitacion} alt="" />
                    <div className="invitacion-acerca__texto">
                        <h2>Conoce <span>lo que sucede</span> en la biblioteca</h2>
                        <p>Consulta el programa de actividades o solicita el uso de un espacio.</p>
                    </div>
                    <div className="invitacion-acerca__botones">
                        <Link to="/eventos" className="boton-dorado">
                            Programa de actividades
                            <img src={flecha} alt="" />
                        </Link>
                        <Link to="/espacios" className="boton-contorno">Solicitar uso de espacio</Link>
                    </div>
                </div>
            </section>

            <NotaAcerca>Textos de ejemplo; la biblioteca los confirmará.</NotaAcerca>
        </>
    );
}

export default RolBiblioteca;

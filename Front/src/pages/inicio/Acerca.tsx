import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import foto from "../../assets/inicio/acerca-foto.jpg";
import circulo1 from "../../assets/inicio/acerca-circulo-1.svg";
import circulo2 from "../../assets/inicio/acerca-circulo-2.svg";
import textura from "../../assets/inicio/acerca-textura.svg";
import iconoBiblioteca from "../../assets/inicio/acerca-biblioteca.svg";
import iconoLibro from "../../assets/inicio/acerca-libro.svg";
import iconoSala from "../../assets/inicio/acerca-sala.svg";
import iconoUsuarios from "../../assets/inicio/acerca-usuarios.svg";
import flecha from "../../assets/inicio/acerca-flecha.svg";

const datos = [
    { titulo: "Acervo", texto: "Consulta y hemeroteca regional", icono: iconoLibro },
    { titulo: "Servicios", texto: "Credencial, agenda y espacios", icono: iconoSala },
    { titulo: "Acceso", texto: "Abierto al público general", icono: iconoUsuarios },
];

function Acerca() {
    return (
        <section className="seccion-inicio seccion-inicio--marfil">
            <Bloque tema="verde" className="acerca" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 420, alto: 300 }}>
                <div className="acerca__foto">
                    <div className="acerca__marco" aria-hidden="true" />
                    <img src={foto} alt="Sala de lectura de la biblioteca" />
                    <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                    <span className="acerca__sello">
                        <strong>Entrada</strong>
                        libre
                    </span>
                </div>

                <div className="acerca__texto">
                    <Etiqueta icono={iconoBiblioteca}>Acerca de la biblioteca</Etiqueta>
                    <h2 className="titulo-seccion titulo-seccion--izquierda">
                        Tu biblioteca en el <span>corazón de la Alameda</span>
                    </h2>
                    <p className="texto-seccion">
                        La Biblioteca Solón Argüello ofrece a la población de Tepic un lugar para leer, investigar y
                        participar en actividades culturales.
                    </p>
                    <ul className="datos-clave">
                        {datos.map((dato) => (
                            <li key={dato.titulo}>
                                <span className="datos-clave__icono">
                                    <img src={dato.icono} alt="" />
                                </span>
                                <strong>{dato.titulo}</strong>
                                <p>{dato.texto}</p>
                            </li>
                        ))}
                    </ul>
                    <Link to="/acerca" className="boton-contorno boton-contorno--mediano">
                        Conocer más
                        <img src={flecha} alt="" />
                    </Link>
                </div>
            </Bloque>
        </section>
    );
}

export default Acerca;

import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import circulo1 from "../../assets/inicio/contacto-circulo-1.svg";
import circulo2 from "../../assets/inicio/contacto-circulo-2.svg";
import textura from "../../assets/inicio/contacto-textura.svg";
import iconoPinEtiqueta from "../../assets/inicio/contacto-pin-etiqueta.svg";
import iconoPin from "../../assets/inicio/contacto-pin.svg";
import iconoReloj from "../../assets/inicio/contacto-reloj.svg";
import iconoTelefono from "../../assets/inicio/contacto-telefono.svg";
import iconoCorreo from "../../assets/inicio/contacto-correo.svg";
import flecha from "../../assets/inicio/contacto-flecha.svg";
import parque from "../../assets/inicio/mapa-parque.svg";
import arbol from "../../assets/inicio/mapa-arbol.svg";
import iconoBiblioteca from "../../assets/inicio/mapa-biblioteca.svg";
import puntoAbierto from "../../assets/inicio/mapa-abierto.svg";
import iconoNavegar from "../../assets/inicio/mapa-navegar.svg";
import iconoAcercar from "../../assets/inicio/mapa-acercar.svg";
import iconoAlejar from "../../assets/inicio/mapa-alejar.svg";

const datosContacto = [
    { titulo: "Dirección", texto: "Av. Allende s/n esq. Oaxaca, Parque Alameda, Tepic", icono: iconoPin },
    { titulo: "Horario", texto: "Lunes a viernes 8:00 a 19:30 h · Sábados 9:00 a 14:00 h", icono: iconoReloj },
    { titulo: "Teléfono", texto: "Por confirmar", icono: iconoTelefono },
    { titulo: "Correo", texto: "Por confirmar", icono: iconoCorreo },
];

// Posiciones del dibujo del mapa (en px, sobre un mapa de 732 × 556)
const manzanas = [
    [16, 19, 176, 132], [216, 19, 146, 132], [382, 19, 161, 132], [564, 19, 143, 132],
    [16, 180, 176, 146], [564, 180, 143, 146],
    [16, 362, 176, 161], [216, 362, 146, 161], [382, 362, 161, 161], [564, 362, 143, 161],
];
const arboles = [[245, 230], [318, 201], [421, 216], [479, 289], [274, 347], [377, 362], [450, 391]];

const comoLlegar = "https://www.google.com/maps/search/?api=1&query=Biblioteca+Sol%C3%B3n+Arg%C3%BCello+Tepic";

function MapaIlustrativo() {
    return (
        <div className="mapa" role="img" aria-label="Mapa ilustrativo: la biblioteca está frente al Parque Alameda, en Av. Allende y Calle Oaxaca">
            {manzanas.map(([left, top, width, height]) => (
                <span key={`${left}-${top}`} className="mapa__manzana" style={{ left, top, width, height }} />
            ))}
            <img className="mapa__parque" src={parque} alt="" />
            {arboles.map(([left, top]) => (
                <img key={`${left}-${top}`} className="mapa__arbol" src={arbol} alt="" style={{ left, top }} />
            ))}
            <span className="mapa__calle mapa__calle--h" style={{ top: 154 }} />
            <span className="mapa__calle mapa__calle--h" style={{ top: 336 }} />
            <span className="mapa__calle mapa__calle--v" style={{ left: 195, width: 20 }} />
            <span className="mapa__calle mapa__calle--v" style={{ left: 365, width: 18 }} />
            <span className="mapa__calle mapa__calle--v" style={{ left: 544, width: 20 }} />
            <span className="mapa__calle mapa__calle--diagonal" />

            <span className="mapa__texto" style={{ left: 25, top: 119 }}>Av. Allende</span>
            <span className="mapa__texto" style={{ left: 570, top: 298 }}>Calle Oaxaca</span>
            <span className="mapa__texto mapa__texto--parque" style={{ left: 283, top: 298 }}>Parque Alameda</span>

            <span className="mapa__marcador">
                <img src={iconoBiblioteca} alt="" />
            </span>
            <span className="mapa__nombre">Biblioteca Solón Argüello</span>

            <span className="mapa__abierto">
                <img src={puntoAbierto} alt="" />
                <strong>Abierto ahora</strong> · cierra a las 19:30 h
            </span>
            <span className="mapa__zoom" style={{ top: 12 }}><img src={iconoAcercar} alt="" /></span>
            <span className="mapa__zoom" style={{ top: 56 }}><img src={iconoAlejar} alt="" /></span>
            <span className="etiqueta-ilustrativa mapa__ilustrativo">Mapa ilustrativo</span>
            <a className="mapa__como-llegar" href={comoLlegar} target="_blank" rel="noreferrer">
                <img src={iconoNavegar} alt="" />
                Cómo llegar
            </a>
        </div>
    );
}

function Contacto() {
    return (
        <section className="seccion-inicio seccion-inicio--verde-claro">
            <Bloque tema="guinda" className="contacto" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 320, alto: 360 }}>
                <div className="contacto__datos">
                    <Etiqueta icono={iconoPinEtiqueta} className="etiqueta-inicio--dorada-fuerte">
                        Contacto y ubicación
                    </Etiqueta>
                    <h2 className="titulo-seccion titulo-seccion--izquierda">
                        Cómo <span>encontrarnos</span>
                    </h2>
                    <ul className="datos-contacto">
                        {datosContacto.map((dato) => (
                            <li key={dato.titulo}>
                                <span className="datos-contacto__icono">
                                    <img src={dato.icono} alt="" />
                                </span>
                                <div>
                                    <small>{dato.titulo}</small>
                                    <p>{dato.texto}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Link to="/contacto" className="boton-dorado boton-dorado--chico">
                        Contacto y sugerencias
                        <img src={flecha} alt="" />
                    </Link>
                </div>

                <MapaIlustrativo />
            </Bloque>
        </section>
    );
}

export default Contacto;

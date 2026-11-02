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
import iconoNavegar from "../../assets/inicio/mapa-google.svg";

const datosContacto = [
    { titulo: "Dirección", texto: "Av. Allende s/n esq. Oaxaca, Parque Alameda, Tepic", icono: iconoPin },
    { titulo: "Horario", texto: "Lunes a viernes 8:00 a 19:30 h · Sábados 9:00 a 14:00 h", icono: iconoReloj },
    { titulo: "Teléfono", texto: "Por confirmar", icono: iconoTelefono },
    { titulo: "Correo", texto: "Por confirmar", icono: iconoCorreo },
];

// Mapa real de Google Maps. El modo "embed" con ?q= no necesita clave de API.
// Si la biblioteca nos da otra dirección o el nombre exacto en Google, solo se cambia BUSQUEDA_MAPA.
const BUSQUEDA_MAPA = "Biblioteca Pública Central Estatal Solón Argüello, Av. Allende, Tepic, Nayarit";
const mapaIncrustado = `https://www.google.com/maps?q=${encodeURIComponent(BUSQUEDA_MAPA)}&z=17&output=embed`;
// Enlace corto que viene en el diseño de Figma (abre la ficha en Google Maps)
const abrirEnGoogleMaps = "https://maps.app.goo.gl/3kJpfUj9dDBsZZNz9";

function MapaGoogle() {
    return (
        <div className="mapa">
            <iframe
                className="mapa__iframe"
                src={mapaIncrustado}
                title="Mapa de Google con la ubicación de la Biblioteca Solón Argüello"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />
            <a className="mapa__abrir" href={abrirEnGoogleMaps} target="_blank" rel="noopener noreferrer">
                <img src={iconoNavegar} alt="" />
                Abrir en Google Maps
                <span className="solo-lectores">(se abre en una pestaña nueva)</span>
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

                <MapaGoogle />
            </Bloque>
        </section>
    );
}

export default Contacto;

import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import { datosBiblioteca } from "../contacto/datos";
import { useEstadoBiblioteca } from "./horarioBiblioteca";
import circulo1 from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import textura from "../../../assets/inicio/contacto-textura.svg";
import iconoPinEtiqueta from "../../../assets/inicio/contacto-pin-etiqueta.svg";
import iconoPin from "../../../assets/inicio/contacto-pin.svg";
import iconoPinPlaca from "../../../assets/inicio/contacto-pin-etiqueta.svg";
import iconoReloj from "../../../assets/inicio/contacto-reloj.svg";
import iconoTelefono from "../../../assets/inicio/contacto-telefono.svg";
import iconoCorreo from "../../../assets/inicio/contacto-correo.svg";
import iconoNavegar from "../../../assets/inicio/mapa-google.svg";

const telefono = datosBiblioteca.telefono;
const correo = datosBiblioteca.correo;
// Cada dato en su tarjeta; teléfono y correo se pueden tocar para llamar o escribir
const datosContacto = [
    { titulo: "Dirección", texto: "Av. Allende s/n esq. Oaxaca, Parque Alameda, Tepic", icono: iconoPin, ancho: true },
    { titulo: "Teléfono", texto: telefono ?? "Por confirmar", icono: iconoTelefono, enlace: telefono ? `tel:+52${telefono.replace(/\D/g, "")}` : undefined },
    { titulo: "Correo", texto: correo ?? "Por confirmar", icono: iconoCorreo, enlace: correo ? `mailto:${correo}` : undefined },
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
            <span className="mapa__placa" aria-hidden="true">
                <img src={iconoPinPlaca} alt="" />
                <span><strong>Biblioteca Solón Argüello</strong><small>Parque Alameda · Centro de Tepic</small></span>
            </span>
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
    const estado = useEstadoBiblioteca();
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
                        {/* Horario con el estado en vivo (mismo cálculo que el letrero de la portada) */}
                        <li className="datos-contacto__tarjeta datos-contacto__tarjeta--ancha">
                            <span className="datos-contacto__icono"><img src={iconoReloj} alt="" /></span>
                            <div>
                                {/* El estado va junto a «Horario» y el horario en una sola línea */}
                                <small className="datos-contacto__titulo-horario">
                                    Horario
                                    <span className={`datos-contacto__estado datos-contacto__estado--${estado.abierta ? "abierta" : "cerrada"}`}>{estado.abierta ? "Abierto ahora" : "Cerrado ahora"}</span>
                                </small>
                                <p className="datos-contacto__horario">Lun a vie 8:00–19:30 h · Sáb 9:00–14:00 h</p>
                            </div>
                        </li>
                        {datosContacto.map((dato) => (
                            <li key={dato.titulo} className={`datos-contacto__tarjeta${dato.ancho ? " datos-contacto__tarjeta--ancha" : ""}`}>
                                <span className="datos-contacto__icono">
                                    <img src={dato.icono} alt="" />
                                </span>
                                <div>
                                    <small>{dato.titulo}</small>
                                    {dato.enlace ? <a href={dato.enlace}>{dato.texto}</a> : <p>{dato.texto}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Link to="/contacto" className="boton-dorado boton-dorado--chico">
                        Contacto y sugerencias
                    </Link>
                </div>

                <MapaGoogle />
            </Bloque>
        </section>
    );
}

export default Contacto;

import { Link } from "react-router";
import foto from "../../../assets/inicio/portada-foto.jpg";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import rama from "../../../assets/inicio/portada-rama.svg";
import indicador from "../../../assets/inicio/portada-indicador.svg";
import flecha from "../../../assets/comun/iconos/portada-flecha.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import iconoUsuarios from "../../../assets/inicio/somos-usuarios.svg";
import iconoAcervo from "../../../assets/inicio/somos-libro.svg";
import iconoAgenda from "../../../assets/inicio/somos-calendario.svg";
import brillo from "../../../assets/inicio/portada-brillo.svg";
import iconoLibro from "../../../assets/inicio/portada-libro.svg";
import iconoCalendario from "../../../assets/inicio/dato-calendario.svg";
import iconoReloj from "../../../assets/inicio/portada-reloj.svg";
import iconoCredencial from "../../../assets/inicio/portada-credencial.svg";

// Qué tipo de biblioteca somos (textos de ejemplo; la biblioteca los confirmará)
const perfiles = [
    { titulo: "Comunitaria", texto: "Abierta a todas las personas de Tepic y su región.", icono: iconoUsuarios },
    { titulo: "Académica", texto: "Acervo y consulta para estudiar e investigar.", icono: iconoAcervo },
    { titulo: "Cultural", texto: "Talleres, lecturas y actividades para todas las edades.", icono: iconoAgenda },
];

// Primera sección verde: quiénes somos y la foto en forma de arco con tarjetas encima
function Portada() {
    return (
        <section className="portada">
            <img className="portada__circulo portada__circulo--1" src={circulo1} alt="" />
            <img className="portada__circulo portada__circulo--2" src={circulo2} alt="" />
            <img className="portada__rama" src={rama} alt="" />

            <div className="portada__texto">
                <span className="portada__etiqueta">
                    <img src={indicador} alt="" />
                    Acervo abierto · Parque Alameda, Tepic
                </span>
                <h1 className="portada__titulo">
                    Biblioteca <span>Solón Argüello</span>
                </h1>
                <p className="portada__descripcion">
                    Somos la Biblioteca Pública Central Estatal de Nayarit: un espacio abierto para leer, aprender y
                    encontrarnos.
                </p>
                <ul className="portada__perfiles">
                    {perfiles.map((perfil) => (
                        <li key={perfil.titulo}>
                            <span className="portada__perfil-icono">
                                <img src={perfil.icono} alt="" />
                            </span>
                            <strong>{perfil.titulo}</strong>
                            <p>{perfil.texto}</p>
                        </li>
                    ))}
                </ul>
                <p className="portada__nota">Textos de ejemplo; la biblioteca los confirmará.</p>
                <div className="portada__acciones">
                    {/* HU-04: inicio → /catalogo → Koha (2 clics) */}
                    <Link to="/catalogo" className="boton-blanco">
                        Explora el catálogo Koha
                        <img src={flecha} alt="" />
                    </Link>
                    <Link to="/acerca" className="boton-contorno boton-contorno--alto">
                        Acerca de la biblioteca
                        <img src={flechaBlanca} alt="" />
                    </Link>
                </div>
            </div>

            <div className="portada__composicion" aria-hidden="true">
                <img className="portada__brillo" src={brillo} alt="" />
                <div className="portada__marco" />
                <img className="portada__foto" src={foto} alt="" />

                <div className="portada__tarjeta">
                    <span className="chip-dorado">
                        <img src={iconoLibro} alt="" />
                        Taller
                    </span>
                    <p className="portada__tarjeta-titulo">Club de lectura mensual</p>
                    <p className="portada__tarjeta-dato">
                        <img src={iconoCalendario} alt="" />
                        Sáb 8 nov · 11:00 h
                    </p>
                </div>

                <span className="portada__chip portada__chip--horario">
                    <img src={iconoReloj} alt="" />
                    Hoy · 8:00 a 19:30 h
                </span>
                <span className="portada__chip portada__chip--credencial">
                    <img src={iconoCredencial} alt="" />
                    Tramita tu credencial
                </span>
                <span className="portada__insignia">
                    <strong>+45 mil</strong>
                    volúmenes
                </span>
            </div>
        </section>
    );
}

export default Portada;

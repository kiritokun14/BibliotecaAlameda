import foto from "../../assets/inicio/portada-foto.jpg";
import circulo1 from "../../assets/inicio/portada-circulo-1.svg";
import circulo2 from "../../assets/inicio/portada-circulo-2.svg";
import rama from "../../assets/inicio/portada-rama.svg";
import indicador from "../../assets/inicio/portada-indicador.svg";
import punto from "../../assets/inicio/portada-punto.svg";
import flecha from "../../assets/inicio/portada-flecha.svg";
import brillo from "../../assets/inicio/portada-brillo.svg";
import iconoLibro from "../../assets/inicio/portada-libro.svg";
import iconoCalendario from "../../assets/inicio/portada-calendario.svg";
import iconoReloj from "../../assets/inicio/portada-reloj.svg";
import iconoCredencial from "../../assets/inicio/portada-credencial.svg";

const beneficios = ["Catálogo en línea", "Credencial digital", "Talleres y eventos"];

// Primera sección verde: texto de bienvenida y la foto en forma de arco con tarjetas encima
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
                    Descubre qué <span>leer, aprender y hacer</span> en tu biblioteca.
                </h1>
                <p className="portada__descripcion">
                    Más de 45,000 volúmenes, hemeroteca regional y actividades para toda la comunidad, a unos
                    pasos de ti.
                </p>
                <ul className="portada__beneficios">
                    {beneficios.map((beneficio) => (
                        <li key={beneficio}>
                            <img src={punto} alt="" />
                            {beneficio}
                        </li>
                    ))}
                </ul>
                {/* TODO: poner la dirección real del catálogo Koha */}
                <a href="#" className="boton-blanco">
                    Explora el catálogo Koha
                    <img src={flecha} alt="" />
                </a>
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

import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import circulo1 from "../../assets/inicio/accesos-circulo-1.svg";
import circulo2 from "../../assets/inicio/accesos-circulo-2.svg";
import textura from "../../assets/inicio/accesos-textura.svg";
import iconoBuscar from "../../assets/inicio/accesos-buscar.svg";
import iconoCredencial from "../../assets/inicio/accesos-credencial.svg";
import iconoSala from "../../assets/inicio/accesos-sala.svg";
import iconoCalendario from "../../assets/inicio/accesos-calendario.svg";
import flecha from "../../assets/inicio/accesos-flecha.svg";
import flechaBlanca from "../../assets/inicio/accesos-flecha-blanca.svg";

// color = fondo de la tarjeta y del botón redondo
const accesos = [
    { titulo: "Buscar en el catálogo", texto: "Consulta libros y materiales en Koha.", icono: iconoBuscar, color: "verde", ruta: "/catalogo" },
    { titulo: "Tramitar credencial", texto: "Solicita tu credencial de la biblioteca.", icono: iconoCredencial, color: "dorado", ruta: "/credencial" },
    { titulo: "Reservar un espacio", texto: "Consulta la agenda de salas y módulos.", icono: iconoSala, color: "rosa", ruta: "/espacios" },
    { titulo: "Ver eventos y talleres", texto: "Actividades del mes en curso.", icono: iconoCalendario, color: "blanco", ruta: "/eventos" },
];

function Accesos() {
    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 380, alto: 260 }}>
                <div className="encabezado-seccion__titular">
                    <Etiqueta>Accesos</Etiqueta>
                    <h2 className="titulo-seccion">
                        ¿Qué quieres <span>hacer hoy</span>?
                    </h2>
                </div>

                <div className="tarjetas-acceso">
                    {accesos.map((acceso) => (
                        <Link key={acceso.titulo} to={acceso.ruta} className={`tarjeta-acceso tarjeta-acceso--${acceso.color}`}>
                            <span className="tarjeta-acceso__icono">
                                <img src={acceso.icono} alt="" />
                            </span>
                            <h3>{acceso.titulo}</h3>
                            <p>{acceso.texto}</p>
                            <span className="tarjeta-acceso__flecha">
                                <img src={flecha} alt="" />
                            </span>
                        </Link>
                    ))}
                </div>

                <Link to="/servicios" className="boton-contorno">
                    Ver servicios y programas
                    <img src={flechaBlanca} alt="" />
                </Link>
            </Bloque>
        </section>
    );
}

export default Accesos;

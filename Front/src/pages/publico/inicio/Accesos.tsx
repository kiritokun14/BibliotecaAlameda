import { Link } from "react-router";
import { Bloque, Etiqueta } from "./Bloque";
import circulo1 from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import textura from "../../../assets/inicio/cuenta-textura.svg";
import iconoEtiqueta from "../../../assets/inicio/etiqueta-accesos.svg";
import flores from "../../../assets/inicio/adorno-guia-flores.svg";
import iconoBuscar from "../../../assets/comun/iconos/accesos-buscar.svg";
import iconoCredencial from "../../../assets/comun/iconos/accesos-credencial.svg";
import iconoSala from "../../../assets/inicio/accesos-sala.svg";
import iconoCalendario from "../../../assets/inicio/accesos-calendario.svg";

// color = fondo de la tarjeta y del botón redondo
const accesos = [
    { titulo: "Buscar en el catálogo", texto: "Consulta libros y materiales en Koha.", icono: iconoBuscar, color: "verde", ruta: "/catalogo" },
    { titulo: "Tramitar credencial", texto: "Solicita tu credencial de la biblioteca.", icono: iconoCredencial, color: "dorado", ruta: "/credencial" },
    { titulo: "Reservar un espacio", texto: "Consulta la agenda de salas y módulos.", icono: iconoSala, color: "rosa", ruta: "/espacios" },
    { titulo: "Ver eventos y talleres", texto: "Actividades del mes en curso.", icono: iconoCalendario, color: "blanco", ruta: "/eventos" },
];

// Con sesión iniciada (Figma A-02, 476:20843) dos tarjetas cambian de texto.
const textosConSesion: Record<string, string> = {
    "Reservar un espacio": "Solicitar uso de espacio",
    "Ver eventos y talleres": "Programa de actividades",
};

function Accesos({ sesion = false }: { sesion?: boolean }) {
    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 380, alto: 260 }}>
                {/* Guías con flores dentro del bloque, en las cuatro esquinas (solo adorno) */}
                <img className="bloque__textura guia-flores guia-flores--izquierda" src={flores} alt="" />
                <img className="bloque__textura guia-flores guia-flores--derecha" src={flores} alt="" />
                <img className="bloque__textura guia-flores guia-flores--arriba-izquierda" src={flores} alt="" />
                <img className="bloque__textura guia-flores guia-flores--arriba-derecha" src={flores} alt="" />
                <div className="encabezado-seccion__titular">
                    <Etiqueta icono={iconoEtiqueta}>Accesos</Etiqueta>
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
                            <h3>{(sesion && textosConSesion[acceso.titulo]) || acceso.titulo}</h3>
                            <p>{acceso.texto}</p>
                        </Link>
                    ))}
                </div>

                <Link to="/servicios" className="boton-contorno">
                    Ver servicios y programas
                </Link>
            </Bloque>
        </section>
    );
}

export default Accesos;

import { Link } from "react-router";
import { Bloque, EncabezadoSeccion, Etiqueta } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { useCarrusel } from "./useCarrusel";
import { actividades, type TipoActividad } from "./datos";
import circulo1 from "../../assets/inicio/actividades-circulo-1.svg";
import circulo2 from "../../assets/inicio/actividades-circulo-2.svg";
import textura from "../../assets/inicio/actividades-textura.svg";
import iconoCalendarioEtiqueta from "../../assets/inicio/actividades-calendario-etiqueta.svg";
import flechaBlanca from "../../assets/inicio/actividades-flecha-blanca.svg";
import iconoLibro from "../../assets/inicio/etiqueta-libro.svg";
import iconoUsuariosEtiqueta from "../../assets/inicio/etiqueta-usuarios.svg";
import iconoPeriodico from "../../assets/inicio/etiqueta-periodico.svg";
import iconoCalendario from "../../assets/inicio/dato-calendario.svg";
import iconoReloj from "../../assets/inicio/dato-reloj.svg";
import iconoUsuarios from "../../assets/inicio/dato-usuarios.svg";
import flechaVerde from "../../assets/inicio/enlace-flecha-verde.svg";
import anterior from "../../assets/inicio/carrusel-anterior-2.svg";
import siguiente from "../../assets/inicio/carrusel-siguiente-2.svg";

const iconosTipo: Record<TipoActividad, string> = {
    Taller: iconoLibro,
    Actividad: iconoUsuariosEtiqueta,
    "Agenda cultural": iconoPeriodico,
};

function Actividades() {
    const { refPista, pagina, totalPaginas, alDesplazar, irAnterior, irSiguiente, irAPagina } = useCarrusel();

    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 420, alto: 300 }}>
                <EncabezadoSeccion
                    etiqueta="Eventos y actividades"
                    iconoEtiqueta={iconoCalendarioEtiqueta}
                    titulo={<>Actividades y <span>talleres</span></>}
                    boton={{ texto: "Ver todas las actividades", ruta: "/eventos", icono: flechaBlanca }}
                />

                <div className="carrusel">
                    <Flecha lado="anterior" icono={anterior} alPresionar={irAnterior} />
                    <div className="carrusel__pista carrusel__pista--tarjetas" ref={refPista} onScroll={alDesplazar}>
                        {actividades.map((actividad) => (
                            <article key={actividad.titulo} className="tarjeta-actividad">
                                <div className="tarjeta-actividad__imagen">
                                    <img src={actividad.imagen} alt="" />
                                    <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                                </div>
                                <div className="tarjeta-actividad__contenido">
                                    <Etiqueta icono={iconosTipo[actividad.tipo]} className="etiqueta-inicio--dorada">
                                        {actividad.tipo}
                                    </Etiqueta>
                                    <h3>{actividad.titulo}</h3>
                                    <ul className="datos-actividad">
                                        <li><img src={iconoCalendario} alt="" />{actividad.fecha}</li>
                                        <li><img src={iconoReloj} alt="" />{actividad.horario}</li>
                                        <li><img src={iconoUsuarios} alt="" />{actividad.publico}</li>
                                    </ul>
                                    {/* TODO: página de detalle de cada actividad */}
                                    <Link to="/eventos" className="enlace-flecha">
                                        Ver detalle
                                        <img src={flechaVerde} alt="" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                    <Flecha lado="siguiente" icono={siguiente} alPresionar={irSiguiente} />
                </div>

                <Puntos total={totalPaginas} activo={pagina} alElegir={irAPagina} />
                <p className="nota-ejemplo">
                    Actividades y fechas de ejemplo; la biblioteca confirmará la programación real.
                </p>
            </Bloque>
        </section>
    );
}

export default Actividades;

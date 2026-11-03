import { useState } from "react";
import { Link } from "react-router";
import { Bloque, EncabezadoSeccion, Etiqueta } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { useCarrusel } from "./useCarrusel";
import { actividades, type TipoActividad } from "./datos";
import circulo1 from "../../../assets/comun/iconos/bloque-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/bloque-circulo-2.svg";
import textura from "../../../assets/inicio/actividades-textura.svg";
import iconoCalendarioEtiqueta from "../../../assets/inicio/noticia-calendario.svg";
import flechaBlanca from "../../../assets/inicio/lecturas-flecha.svg";
import iconoLibro from "../../../assets/inicio/portada-libro.svg";
import iconoUsuariosEtiqueta from "../../../assets/inicio/etiqueta-usuarios.svg";
import iconoPeriodico from "../../../assets/inicio/etiqueta-periodico.svg";
import iconoCalendario from "../../../assets/inicio/dato-calendario.svg";
import iconoReloj from "../../../assets/comun/iconos/dato-reloj.svg";
import iconoUsuarios from "../../../assets/comun/iconos/dato-usuarios.svg";
import flechaVerde from "../../../assets/inicio/noticia-flecha.svg";
import anterior from "../../../assets/inicio/carrusel-anterior.svg";
import siguiente from "../../../assets/inicio/carrusel-siguiente.svg";
import filtroTodas from "../../../assets/comun/iconos/filtro-todas.svg";
import filtroTalleres from "../../../assets/inicio/filtro-talleres.svg";
import filtroActividades from "../../../assets/inicio/filtro-actividades.svg";
import filtroAgenda from "../../../assets/inicio/filtro-agenda.svg";

const iconosTipo: Record<TipoActividad, string> = {
    Taller: iconoLibro,
    Actividad: iconoUsuariosEtiqueta,
    "Agenda cultural": iconoPeriodico,
};

// null = "Todas"
const filtros: { texto: string; tipo: TipoActividad | null; icono: string }[] = [
    { texto: "Todas", tipo: null, icono: filtroTodas },
    { texto: "Talleres", tipo: "Taller", icono: filtroTalleres },
    { texto: "Actividades", tipo: "Actividad", icono: filtroActividades },
    { texto: "Agenda cultural", tipo: "Agenda cultural", icono: filtroAgenda },
];

function Actividades() {
    const [tipoElegido, setTipoElegido] = useState<TipoActividad | null>(null);
    const visibles = tipoElegido ? actividades.filter((actividad) => actividad.tipo === tipoElegido) : actividades;
    const { refPista, pagina, totalPaginas, alDesplazar, irAnterior, irSiguiente, irAPagina } = useCarrusel(tipoElegido);

    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 420, alto: 300 }}>
                <EncabezadoSeccion
                    etiqueta="Eventos y actividades"
                    iconoEtiqueta={iconoCalendarioEtiqueta}
                    titulo={<>Actividades <span>bibliotecarias</span></>}
                    boton={{ texto: "Ver todas las actividades", ruta: "/eventos", icono: flechaBlanca }}
                />

                <div className="filtros-actividad" role="group" aria-label="Filtrar actividades por categoría">
                    {filtros.map((filtro) => {
                        const activo = filtro.tipo === tipoElegido;
                        return (
                            <button
                                key={filtro.texto}
                                type="button"
                                className={activo ? "filtro-actividad filtro-actividad--activo" : "filtro-actividad"}
                                aria-pressed={activo}
                                onClick={() => setTipoElegido(filtro.tipo)}
                            >
                                {/* los íconos son verdes; en el filtro activo el CSS los pinta de blanco */}
                                <img src={filtro.icono} alt="" />
                                {filtro.texto}
                            </button>
                        );
                    })}
                </div>

                <div className="carrusel">
                    <Flecha lado="anterior" icono={anterior} alPresionar={irAnterior} />
                    <div className="carrusel__pista carrusel__pista--tarjetas" ref={refPista} onScroll={alDesplazar}>
                        {visibles.map((actividad) => (
                            <article key={actividad.id} className="tarjeta-actividad">
                                <div className="tarjeta-actividad__imagen">
                                    <img src={actividad.imagen} alt="" />
                                    <span className="etiqueta-ilustrativa">Imagen ilustrativa</span>
                                </div>
                                <div className="tarjeta-actividad__contenido">
                                    <Etiqueta icono={iconosTipo[actividad.tipo]} className="etiqueta-inicio--dorada">
                                        {actividad.tipo}
                                    </Etiqueta>
                                    <h3>
                                        {/* El enlace cubre toda la tarjeta (ver .tarjeta-actividad__enlace::after).
                                            TODO T-052: crear la página /eventos/:id con el detalle */}
                                        <Link to={`/eventos/${actividad.id}`} className="tarjeta-actividad__enlace">
                                            {actividad.titulo}
                                        </Link>
                                    </h3>
                                    <ul className="datos-actividad">
                                        <li><img src={iconoCalendario} alt="" />{actividad.fecha}</li>
                                        <li><img src={iconoReloj} alt="" />{actividad.horario}</li>
                                        <li><img src={iconoUsuarios} alt="" />{actividad.publico}</li>
                                    </ul>
                                    <span className="enlace-flecha" aria-hidden="true">
                                        Ver detalle
                                        <img src={flechaVerde} alt="" />
                                    </span>
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

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bloque, EncabezadoSeccion, Etiqueta } from "./Bloque";
import { Flecha, Puntos } from "./ControlesCarrusel";
import { useCarrusel } from "./useCarrusel";
import { ChipsFiltro } from "../../../components/portal/BarraFiltros";
import { type Actividad, type TipoActividad } from "./datos";
import { consultarAgenda } from "../../../servicios/actividades";
import { mensajeError } from "../../../servicios/api";
import imagenActividad from "../../../assets/comun/fotos/noticia-3.jpg";
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
    const [resultado, setResultado] = useState<{ actividades: Actividad[]; error?: string }>();
    useEffect(() => {
        let vigente = true;
        const cargar = () => {
            const desde = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mazatlan' });
            consultarAgenda({ desde, limite: 6 }).then(lista => {
                if (!vigente) return;
                setResultado({ actividades: lista.actividades.map(a => {
                    const sesion = a.sesiones.find(s => s.fecha >= desde);
                    return { id: a.folio, titulo: a.nombre,
                    tipo: a.tipo === 'Taller' ? 'Taller' : ['Presentación', 'Exposición'].includes(a.tipo) ? 'Agenda cultural' : 'Actividad',
                    fecha: sesion?.fecha ?? a.fecha,
                    horario: `${sesion?.inicio ?? a.inicio} a ${sesion?.fin ?? a.fin} h`, publico: a.publico, imagen: imagenActividad }; }) });
            }).catch(error => { if (vigente) setResultado({ actividades: [], error: mensajeError(error) }); });
        };
        cargar(); window.addEventListener('focus', cargar);
        return () => { vigente = false; window.removeEventListener('focus', cargar); };
    }, []);
    const actividades = resultado?.actividades ?? [];
    const [tipoElegido, setTipoElegido] = useState<TipoActividad | null>(null);
    const visibles = tipoElegido ? actividades.filter((actividad) => actividad.tipo === tipoElegido) : actividades;
    const { refPista, pagina, totalPaginas, alDesplazar, irAnterior, irSiguiente, irAPagina } = useCarrusel(`${tipoElegido}:${actividades.map(a => a.id).join()}`);

    return (
        <section className="seccion-inicio seccion-inicio--crema">
            <Bloque tema="guinda" circulos={[circulo1, circulo2]} textura={{ src: textura, ancho: 420, alto: 300 }}>
                <EncabezadoSeccion
                    etiqueta="Eventos y actividades"
                    iconoEtiqueta={iconoCalendarioEtiqueta}
                    titulo={<>Actividades <span>bibliotecarias</span></>}
                    boton={{ texto: "Ver todas las actividades", ruta: "/eventos", icono: flechaBlanca }}
                />

                {/* Mismas pastillas que los demás filtros del portal, en su versión para fondo oscuro */}
                <div className="filtros-actividad">
                    <ChipsFiltro
                        oscuro
                        etiqueta="Filtrar actividades por categoría"
                        opciones={filtros.map((f) => ({ valor: f.tipo ?? "", texto: f.texto, icono: f.icono }))}
                        activa={tipoElegido ?? ""}
                        alElegir={(valor) => setTipoElegido((valor || null) as TipoActividad | null)}
                    />
                </div>

                <div className="carrusel">
                    <Flecha lado="anterior" icono={anterior} alPresionar={irAnterior} />
                    <div className="carrusel__pista carrusel__pista--tarjetas" ref={refPista} onScroll={alDesplazar}>
                        {visibles.map((actividad) => (
                            <article key={actividad.id} className="tarjeta-actividad">
                                <div className="tarjeta-actividad__imagen">
                                    <img loading="lazy" decoding="async" src={actividad.imagen} alt="" />
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
                    {!resultado ? 'Cargando próximas actividades…' : resultado.error ? resultado.error : actividades.length === 0 ? 'No hay próximas actividades publicadas.' : 'Programación publicada por la biblioteca. Consulta los avisos en cada actividad.'}
                </p>
            </Bloque>
        </section>
    );
}

export default Actividades;

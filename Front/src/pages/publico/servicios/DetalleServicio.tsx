import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import "./Servicios.css";
import { obtenerServicio, type Servicio } from "./datos";
import { CargandoServicios, EstadoServicios } from "./piezas";
import circulo1 from "../../../assets/comun/iconos/encabezado-circulo-1.svg";
import circulo2 from "../../../assets/comun/iconos/encabezado-circulo-2.svg";
import volverBlanca from "../../../assets/comun/iconos/volver-blanca.svg";
import volverOscura from "../../../assets/comun/iconos/volver-oscura.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import SolicitudBibliocomunidad from "./SolicitudBibliocomunidad";
import iconoCheck from "../../../assets/comun/iconos/check-verde.svg";

type Carga =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "listo"; servicio: Servicio | null };

// /servicios/:id. Si el contenido no existe, es un borrador o fue retirado,
// se muestra "Contenido no disponible" (CA-01.2: un borrador no se expone por URL)
function DetalleServicio() {
    const { id } = useParams();
    const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
    const [intento, setIntento] = useState(0);
    // Si cambia la dirección, se vuelve a mostrar "cargando" (sin setState dentro del efecto)
    const [idCargado, setIdCargado] = useState(id);
    if (idCargado !== id) {
        setIdCargado(id);
        setCarga({ estado: "cargando" });
    }

    useEffect(() => {
        let vigente = true;
        obtenerServicio(id)
            .then((servicio) => { if (vigente) setCarga({ estado: "listo", servicio }); })
            .catch(() => { if (vigente) setCarga({ estado: "error" }); });
        return () => { vigente = false; };
    }, [id, intento]);

    function reintentar() {
        setCarga({ estado: "cargando" });
        setIntento((n) => n + 1);
    }

    const detalle = carga.estado === "listo" ? carga.servicio?.detalle : undefined;

    // Sin página propia (o no publicado): mismo encabezado que la lista y la tarjeta de estado
    if (!detalle) {
        return (
            <PaginaPublica>
                <EncabezadoPublico
                    etiqueta="Biblioteca"
                    titulo={<>Todo lo que <span>ofrece</span> la biblioteca</>}
                    texto="Conoce lo que ofrece la Biblioteca Solón Argüello y cómo acceder a cada servicio."
                />
                {carga.estado === "cargando" && <CargandoServicios />}
                {carga.estado === "error" && <EstadoServicios tipo="error" alReintentar={reintentar} />}
                {carga.estado === "listo" && <EstadoServicios tipo="no-disponible" />}
            </PaginaPublica>
        );
    }

    return (
        <PaginaPublica>
            {/* Mismo diseño que EncabezadoPublico, más el botón de regreso */}
            <section className="encabezado-publico encabezado-servicio">
                <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
                <img className="encabezado-publico__circulo encabezado-publico__circulo--2" src={circulo2} alt="" />
                <div className="encabezado-servicio__regreso">
                    <Link to="/servicios" className="boton-regreso">
                        <img src={volverBlanca} alt="" />
                        Volver a Servicios y programas
                    </Link>
                </div>
                <span className="etiqueta-inicio">
                    <span className="punto-dorado" />
                    {id === "bibliocomunidad" ? "Bibliocomunidad · Registro de interés" : detalle.etiqueta}
                </span>
                <h1>{detalle.nombre.normal} <span>{detalle.nombre.resaltado}</span></h1>
                <p>{detalle.subtitulo}</p>
            </section>

            <section className="servicios-seccion servicios-seccion--crema">
                <div className="programa-columnas">
                    <div className="programa-requisitos">
                        <p className="programa-sobretitulo">REQUISITOS PREVISTOS</p>
                        <h2>Así será el club</h2>
                        <ul>
                            {detalle.requisitos.map((requisito) => (
                                <li key={requisito}>
                                    <span className="programa-requisitos__check">
                                        <img src={iconoCheck} alt="" />
                                    </span>
                                    {requisito}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="programa-actividades">
                        <p className="programa-sobretitulo programa-sobretitulo--guinda">ACTIVIDADES DEL CLUB</p>
                        <ul>
                            {detalle.actividades.map((actividad) => (
                                <li key={actividad}>
                                    {actividad}
                                    <span className="punto-dorado" aria-hidden="true" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {id === "bibliocomunidad" && <SolicitudBibliocomunidad />}
            <section className="servicios-seccion servicios-seccion--verde programa-aviso">
                <span className="tarjeta-servicio__proximamente">{id === "bibliocomunidad" ? "REGISTRO DE INTERÉS DISPONIBLE" : "PRÓXIMAMENTE"}</span>
                <h2>{id === "bibliocomunidad" ? "La incorporación requiere confirmación" : detalle.aviso.titulo}</h2>
                <p>{id === "bibliocomunidad" ? "Puedes dejar tu interés mediante el formulario. El personal revisará tu solicitud y te contactará; el envío no equivale a una inscripción al club." : detalle.aviso.texto}</p>
                {id === "bibliocomunidad" && (
                    <p>Con tu sesión iniciada, ya puedes conversar en el foro de Bibliocomunidad.</p>
                )}
                <div className="programa-aviso__botones">
                    {id === "bibliocomunidad" && (
                        <Link to="/club-alameda" className="boton-servicios boton-servicios--verde">
                            Entrar a Bibliocomunidad
                            <img src={flechaBlanca} alt="" />
                        </Link>
                    )}
                    <Link to="/servicios" className="boton-servicios boton-servicios--contorno">
                        Volver a Servicios y programas
                        <img src={volverOscura} alt="" />
                    </Link>
                </div>
            </section>
        </PaginaPublica>
    );
}

export default DetalleServicio;

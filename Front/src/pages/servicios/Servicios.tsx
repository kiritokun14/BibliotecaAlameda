import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../components/PaginaPublica";
import "./Servicios.css";
import { obtenerServicios, type Servicio, type TipoContenido } from "./datos";
import { CargandoServicios, EstadoServicios } from "./piezas";
import { iconos } from "./iconos";
import flechaVerde from "../../assets/servicios/flecha-verde.svg";
import flechaDorada from "../../assets/servicios/flecha-dorada.svg";
import iconoInfo from "../../assets/servicios/nota-info.svg";
import circulo1 from "../../assets/servicios/circulo-tarjeta-1.svg";
import circulo2 from "../../assets/servicios/circulo-tarjeta-2.svg";

type Carga =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "listo"; servicios: Servicio[] };

// HU-01: servicios y programas, visibles sin iniciar sesión
function Servicios() {
    const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
    const [intento, setIntento] = useState(0); // al reintentar se vuelve a pedir

    useEffect(() => {
        let vigente = true;
        obtenerServicios()
            .then((servicios) => { if (vigente) setCarga({ estado: "listo", servicios }); })
            .catch(() => { if (vigente) setCarga({ estado: "error" }); });
        return () => { vigente = false; };
    }, [intento]);

    function reintentar() {
        setCarga({ estado: "cargando" });
        setIntento((n) => n + 1);
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico
                etiqueta="Servicios y programas"
                titulo={<>Todo lo que <span>ofrece</span> la biblioteca</>}
                texto="Conoce lo que ofrece la Biblioteca Solón Argüello y cómo acceder a cada servicio."
            />

            {carga.estado === "cargando" && <CargandoServicios />}
            {carga.estado === "error" && <EstadoServicios tipo="error" alReintentar={reintentar} />}
            {carga.estado === "listo" && (
                <>
                    <GrupoServicios tipo="servicio" titulo="Servicios" servicios={carga.servicios} fondo="crema" />
                    <GrupoServicios tipo="programa" titulo="Programas" servicios={carga.servicios} fondo="verde">
                        <p className="nota-servicios">
                            <img src={iconoInfo} alt="" />
                            Datos de ejemplo. Horarios, requisitos y descripciones se mostrarán cuando la biblioteca los publique.
                        </p>
                    </GrupoServicios>
                </>
            )}
        </PaginaPublica>
    );
}

function GrupoServicios({
    tipo,
    titulo,
    servicios,
    fondo,
    children,
}: {
    tipo: TipoContenido;
    titulo: string;
    servicios: Servicio[];
    fondo: "crema" | "verde";
    children?: ReactNode;
}) {
    const delGrupo = servicios.filter((servicio) => servicio.tipo === tipo);
    if (delGrupo.length === 0) return null;
    const idTitulo = `grupo-${tipo}`;

    return (
        <section className={`servicios-seccion servicios-seccion--${fondo}`} aria-labelledby={idTitulo}>
            <div className="servicios-grupo">
                <h2 id={idTitulo} className="servicios-grupo__titulo">
                    {titulo}
                    <span className="servicios-grupo__cantidad" aria-label={`${delGrupo.length} en total`}>
                        {delGrupo.length}
                    </span>
                </h2>
                <ul className="servicios-tarjetas">
                    {delGrupo.map((servicio) => (
                        <TarjetaServicio key={servicio.id} servicio={servicio} />
                    ))}
                </ul>
                {children}
            </div>
        </section>
    );
}

function TarjetaServicio({ servicio }: { servicio: Servicio }) {
    const clases = [
        "tarjeta-servicio",
        `tarjeta-servicio--${servicio.tipo}`,
        servicio.destacado && "tarjeta-servicio--destacada",
        servicio.proximamente && "tarjeta-servicio--proximamente",
        servicio.accion && "tarjeta-servicio--con-enlace",
    ].filter(Boolean).join(" ");

    return (
        <li className={clases}>
            {servicio.destacado && (
                <>
                    <img className="tarjeta-servicio__circulo tarjeta-servicio__circulo--1" src={circulo1} alt="" />
                    <img className="tarjeta-servicio__circulo tarjeta-servicio__circulo--2" src={circulo2} alt="" />
                </>
            )}
            <span className="tarjeta-servicio__icono">
                <img src={iconos[servicio.icono]} alt="" />
            </span>
            <p className="tarjeta-servicio__tipo">
                <span className="tarjeta-servicio__punto" aria-hidden="true" />
                {servicio.tipo === "servicio" ? "SERVICIO" : "PROGRAMA"}
                {servicio.proximamente && <span className="tarjeta-servicio__proximamente">PRÓXIMAMENTE</span>}
            </p>
            <h3>{servicio.titulo}</h3>
            <p className="tarjeta-servicio__descripcion">{servicio.descripcion}</p>
            {servicio.accion && (
                // El enlace cubre toda la tarjeta (ver .tarjeta-servicio__enlace::after)
                <Link to={servicio.accion.ruta} className="tarjeta-servicio__enlace">
                    {servicio.accion.texto}
                    <span className="solo-lectores">: {servicio.titulo}</span>
                    <img src={servicio.destacado ? flechaDorada : flechaVerde} alt="" />
                </Link>
            )}
        </li>
    );
}

export default Servicios;

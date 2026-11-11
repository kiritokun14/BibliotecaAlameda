import { useEffect, useState } from "react";
import { Link } from "react-router";
import { consultarAgenda } from "../../../servicios/actividades";
import { INTERVALO_PORTADA, eventosPortada, type EventoPortada } from "./eventosPortada";
import type { TipoActividad } from "./datos";
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
import iconoUsuariosEtiqueta from "../../../assets/inicio/etiqueta-usuarios.svg";
import iconoPeriodico from "../../../assets/inicio/etiqueta-periodico.svg";
import iconoCalendario from "../../../assets/inicio/dato-calendario.svg";
import iconoReloj from "../../../assets/inicio/portada-reloj.svg";
import iconoCredencial from "../../../assets/inicio/portada-credencial.svg";

// Qué tipo de biblioteca somos
const perfiles = [
    { titulo: "Comunitaria", texto: "Abierta a todas las personas de Tepic y su región.", icono: iconoUsuarios },
    { titulo: "Académica", texto: "Acervo y consulta para estudiar e investigar.", icono: iconoAcervo },
    { titulo: "Cultural", texto: "Talleres, lecturas y actividades para todas las edades.", icono: iconoAgenda },
];

const iconosTipo: Record<TipoActividad, string> = {
    Taller: iconoLibro,
    Actividad: iconoUsuariosEtiqueta,
    "Agenda cultural": iconoPeriodico,
};

// Próximas actividades publicadas para la tarjeta de la foto (undefined = cargando)
function useEventosPortada() {
    const [eventos, setEventos] = useState<EventoPortada[]>();
    useEffect(() => {
        let vigente = true;
        const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" });
        // Mismos filtros que la sección «Actividades»: la consulta se reutiliza
        consultarAgenda({ desde: hoy, limite: 6 })
            .then((lista) => { if (vigente) setEventos(eventosPortada(lista.actividades, hoy)); })
            .catch(() => { if (vigente) setEventos([]); });
        return () => { vigente = false; };
    }, []);
    return eventos;
}

// Tarjeta sobre la foto: pasa sola de una actividad a otra y lleva a su detalle.
// Se detiene con el mouse encima o con el foco, y no avanza si la persona pidió reducir animaciones.
function TarjetaEvento() {
    const eventos = useEventosPortada();
    const [indice, setIndice] = useState(0);
    const [pausa, setPausa] = useState(false);
    const total = eventos?.length ?? 0;

    useEffect(() => {
        const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (total < 2 || pausa || reducir) return;
        const temporizador = window.setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO_PORTADA);
        return () => window.clearInterval(temporizador);
    }, [total, pausa]);

    if (eventos === undefined) return null;

    const pausar = { onMouseEnter: () => setPausa(true), onMouseLeave: () => setPausa(false), onFocus: () => setPausa(true), onBlur: () => setPausa(false) };

    if (total === 0) {
        return (
            <Link to="/eventos" className="portada__tarjeta portada__tarjeta--enlace">
                <span className="chip-dorado">
                    <img src={iconoCalendario} alt="" />
                    Agenda
                </span>
                <span className="portada__tarjeta-titulo">Pronto publicaremos nuevas actividades</span>
                <span className="portada__tarjeta-dato">Consulta la agenda de la biblioteca</span>
            </Link>
        );
    }

    const evento = eventos[indice % total];
    return (
        <Link key={evento.id} to={`/eventos/${evento.id}`} className="portada__tarjeta portada__tarjeta--enlace" {...pausar}>
            <span className="chip-dorado">
                <img src={iconosTipo[evento.tipo]} alt="" />
                {evento.tipo}
            </span>
            <span className="portada__tarjeta-titulo">{evento.titulo}</span>
            <span className="portada__tarjeta-dato">
                <img src={iconoCalendario} alt="" />
                {evento.cuando}
            </span>
            {total > 1 && <span className="solo-lectores"> (actividad {indice % total + 1} de {total})</span>}
        </Link>
    );
}

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

            <div className="portada__composicion">
                <img className="portada__brillo" src={brillo} alt="" />
                <div className="portada__marco" />
                <img className="portada__foto" src={foto} alt="" />

                <TarjetaEvento />

                <span className="portada__chip portada__chip--horario">
                    <img src={iconoReloj} alt="" />
                    Hoy · 8:00 a 19:30 h
                </span>
                <span className="portada__chip portada__chip--credencial">
                    <img src={iconoCredencial} alt="" />
                    Tramita tu credencial
                </span>
                <span className="portada__insignia">
                    <strong>+2 mil</strong>
                    volúmenes
                </span>
            </div>
        </section>
    );
}

export default Portada;

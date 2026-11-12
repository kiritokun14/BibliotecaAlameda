import { useEffect, useState } from "react";
import { Link } from "react-router";
import { consultarAgenda } from "../../../servicios/actividades";
import { INTERVALO_PORTADA, eventosPortada, type EventoPortada } from "./eventosPortada";
import type { TipoActividad } from "./datos";
import { useTramite } from "../credencial/datos";
import foto from "../../../assets/inicio/portada-foto.webp";
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

// Próximas actividades publicadas para la portada (undefined = cargando)
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

// Pasa sola de una actividad a otra. Se detiene con el mouse encima o con el foco,
// y no avanza si la persona pidió reducir animaciones.
function useRotacion(total: number) {
    const [indice, setIndice] = useState(0);
    const [pausa, setPausa] = useState(false);
    useEffect(() => {
        const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (total < 2 || pausa || reducir) return;
        const temporizador = window.setInterval(() => setIndice((i) => (i + 1) % total), INTERVALO_PORTADA);
        return () => window.clearInterval(temporizador);
    }, [total, pausa]);
    const pausar = {
        onMouseEnter: () => setPausa(true), onMouseLeave: () => setPausa(false),
        onFocus: () => setPausa(true), onBlur: () => setPausa(false),
    };
    return { indice: total ? indice % total : 0, pausar };
}

type Pausar = ReturnType<typeof useRotacion>["pausar"];

// Tarjeta sobre la foto: lleva al detalle de la actividad que se está mostrando
function TarjetaEvento({ evento, posicion, total, pausar }: { evento?: EventoPortada; posicion: number; total: number; pausar: Pausar }) {
    if (!evento) {
        return (
            <Link to="/eventos" className="portada__tarjeta">
                <span className="chip-dorado">
                    <img src={iconoCalendario} alt="" />
                    Agenda
                </span>
                <span className="portada__tarjeta-titulo">Pronto publicaremos nuevas actividades</span>
                <span className="portada__tarjeta-dato">Consulta la agenda de la biblioteca</span>
            </Link>
        );
    }
    return (
        <Link key={evento.id} to={`/eventos/${evento.id}`} className="portada__tarjeta" title={evento.titulo} {...pausar}>
            <span className="chip-dorado">
                <img src={iconosTipo[evento.tipo]} alt="" />
                {evento.tipo}
            </span>
            <span className="portada__tarjeta-titulo">{evento.titulo}</span>
            <span className="portada__tarjeta-dato">
                <img src={iconoCalendario} alt="" />
                {evento.cuando}
            </span>
            {total > 1 && <span className="solo-lectores"> (actividad {posicion + 1} de {total})</span>}
        </Link>
    );
}

// «Tramita tu credencial» lleva a /credencial y no aparece si la cuenta ya tiene una credencial vigente
function ChipCredencial({ sesion }: { sesion: boolean }) {
    return sesion ? <ChipCredencialConSesion /> : <EnlaceCredencial />;
}

function ChipCredencialConSesion() {
    const { estado } = useTramite();
    return estado === "vigente" ? null : <EnlaceCredencial />;
}

function EnlaceCredencial() {
    return (
        <Link to="/credencial" className="portada__chip portada__chip--credencial">
            <img src={iconoCredencial} alt="" />
            Tramita tu credencial
        </Link>
    );
}

// Primera sección verde: quiénes somos y la foto en forma de arco con la actividad que se está mostrando
function Portada({ sesion = false }: { sesion?: boolean }) {
    const eventos = useEventosPortada();
    const total = eventos?.length ?? 0;
    const { indice, pausar } = useRotacion(total);
    const evento = eventos?.[indice];
    // Sin actividades se queda la foto de la biblioteca
    const imagen = evento?.imagen ?? foto;
    const fotos = [...new Set([foto, ...(eventos ?? []).map((e) => e.imagen)])];

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
                {/* Todas las fotos se cargan una vez y quedan apiladas; al cambiar de actividad solo cambia
                    cuál se ve (opacity). Así no se vuelve a montar ni a decodificar una imagen en cada cambio. */}
                <div className="portada__fotos">
                    {fotos.map((src) => (
                        <img key={src} className={`portada__foto${src === imagen ? " portada__foto--activa" : ""}`}
                            src={src} alt="" decoding="async" />
                    ))}
                </div>
                {evento && <span className="portada__ilustrativa">Imagen ilustrativa</span>}

                {eventos !== undefined && <TarjetaEvento evento={evento} posicion={indice} total={total} pausar={pausar} />}

                <ChipCredencial sesion={sesion} />
                <span className="portada__insignia">
                    <strong>+2 mil</strong>
                    volúmenes
                </span>
            </div>
        </section>
    );
}

export default Portada;

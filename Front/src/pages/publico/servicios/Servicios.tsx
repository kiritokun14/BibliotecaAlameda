import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import "../perfil/Perfil.css";
import "./Servicios.css";
import { obtenerServicios, type Servicio, type TipoContenido } from "./datos";
import { CargandoServicios, EstadoServicios } from "./piezas";
import { iconos } from "./iconos";
import { fotos } from "./fotos";
import { EtiquetaPerfil } from "../perfil/piezas";
import { iconosSeccion } from "../perfil/iconos";
import iconoEstrella from "../../../assets/perfil/menu-estrella.svg";

type Carga =
    | { estado: "cargando" }
    | { estado: "error" }
    | { estado: "listo"; servicios: Servicio[] };

// HU-01: servicios y programas, visibles sin iniciar sesión.
// Rehecha el 21 nov 2026 (Aldahir) con la plantilla C «Página pública de consulta»: franja compacta con ícono,
// grupos con EtiquetaPerfil (sin contadores), tarjetas con la foto real de cada servicio y una tarjeta verde de ayuda.
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
                icono={iconosSeccion.resumen}
                titulo={<>Todo lo que <span>ofrece</span> la biblioteca</>}
                texto="Conoce cada servicio y programa, y cómo acceder a él."
            />
            <div className="servicios-pagina">
                {carga.estado === "cargando" && <CargandoServicios />}
                {carga.estado === "error" && <EstadoServicios tipo="error" alReintentar={reintentar} />}
                {carga.estado === "listo" && (
                    <div className="servicios-contenedor">
                        <GrupoServicios tipo="servicio" titulo="Servicios" icono={iconosSeccion.credencial} servicios={carga.servicios} />
                        <GrupoServicios tipo="programa" titulo="Programas" icono={iconoEstrella} servicios={carga.servicios} />
                        <section className="servicios-ayuda" aria-labelledby="servicios-ayuda-titulo">
                            <span className="servicios-ayuda__insignia" style={{ "--icono-seccion": `url("${iconosSeccion.mensajes}")` } as CSSProperties} aria-hidden="true" />
                            <div className="servicios-ayuda__textos">
                                <h2 id="servicios-ayuda-titulo">¿No encuentras lo que buscas?</h2>
                                <p>Escríbenos y el personal te orienta, o conoce la biblioteca y sus espacios.</p>
                            </div>
                            <div className="servicios-ayuda__botones">
                                <Link to="/contacto" className="perfil-boton servicios-ayuda__principal">Escríbenos</Link>
                                <Link to="/acerca/historia" className="perfil-boton servicios-ayuda__secundario">Conoce la biblioteca</Link>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </PaginaPublica>
    );
}

function GrupoServicios({ tipo, titulo, icono, servicios }: { tipo: TipoContenido; titulo: string; icono: string; servicios: Servicio[] }) {
    const delGrupo = servicios.filter((servicio) => servicio.tipo === tipo);
    if (delGrupo.length === 0) return null;
    const idTitulo = `grupo-${tipo}`;
    return (
        <section className="servicios-grupo2" aria-labelledby={idTitulo}>
            <div className="servicios-grupo2__encabezado">
                <EtiquetaPerfil id={idTitulo} icono={icono}>{titulo}</EtiquetaPerfil>
            </div>
            <ul className="servicios-rejilla">
                {delGrupo.map((servicio) => <TarjetaServicio key={servicio.id} servicio={servicio} />)}
            </ul>
        </section>
    );
}

function TarjetaServicio({ servicio }: { servicio: Servicio }) {
    const clases = [
        "servicio-tarjeta",
        `servicio-tarjeta--${servicio.tipo}`,
        servicio.destacado && "servicio-tarjeta--destacada",
    ].filter(Boolean).join(" ");
    const contenido = (
        <>
            <span className="servicio-tarjeta__foto">
                {fotos[servicio.id] && <img src={fotos[servicio.id]} alt="" loading="lazy" decoding="async" />}
                <span className="servicio-tarjeta__insignia" style={{ "--icono": `url("${iconos[servicio.icono]}")` } as CSSProperties} aria-hidden="true" />
            </span>
            <span className="servicio-tarjeta__textos">
                <span className="servicio-tarjeta__chips">
                    <span className={`servicio-tarjeta__tipo servicio-tarjeta__tipo--${servicio.tipo}`}>
                        <span aria-hidden="true" />{servicio.tipo === "servicio" ? "Servicio" : "Programa"}
                    </span>
                    {servicio.proximamente && <span className="servicio-tarjeta__tipo servicio-tarjeta__tipo--pronto"><span aria-hidden="true" />Próximamente</span>}
                </span>
                <span className="servicio-tarjeta__titulo">{servicio.titulo}</span>
                <span className="servicio-tarjeta__descripcion">{servicio.descripcion}</span>
                {servicio.accion
                    ? <span className="servicio-tarjeta__accion">{servicio.accion.texto}</span>
                    : <span className="servicio-tarjeta__nota">En la biblioteca, sin trámite previo</span>}
            </span>
        </>
    );
    return (
        <li className={clases}>
            {servicio.accion
                ? <Link to={servicio.accion.ruta} className="servicio-tarjeta__cuerpo">{contenido}</Link>
                : <div className="servicio-tarjeta__cuerpo">{contenido}</div>}
        </li>
    );
}

export default Servicios;

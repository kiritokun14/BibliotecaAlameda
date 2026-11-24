import { useState } from "react";
import { Link } from "react-router";
import { EtiquetaPerfil, TarjetaPerfil } from "../perfil/piezas";
import { datosHistoria, etapas, type Etapa } from "./datos";
import fotoFachada from "../../../assets/acerca/foto-fachada.webp";
import fotoEstudio from "../../../assets/acerca/foto-sala-estudio.webp";
import fotoActividades from "../../../assets/acerca/foto-presentaciones.webp";
import fotoInfantil from "../../../assets/acerca/foto-sala-infantil.webp";
import solonRetrato from "../../../assets/acerca/solon-retrato.webp";
import solonMultitud from "../../../assets/acerca/solon-multitud.webp";
import tarjetaUsuario from "../../../assets/perfil/tarjeta-usuario.svg";
import iconoReloj from "../../../assets/acerca/pestana-reloj.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import chevronAbajo from "../../../assets/comun/iconos/chevron-abajo.svg";

// Historia de la biblioteca (contenido del diseño de Figma, investigación de la Dra. Alma Delia Sánchez Andrade),
// armada con el catálogo de piezas: tarjetas con franja, galería y la línea del tiempo como lista de tarjetas.
// TODO backend (HU-01): cuando la biblioteca publique «Historia» desde el panel, se muestra lo publicado en su lugar.
function Historia() {
    return (
        <>
            <TarjetaPerfil color="verde" icono={tarjetaLista} titulo="Un lugar de lectura para Nayarit"
                texto="La Biblioteca Solón Argüello es la biblioteca pública central del estado, en Tepic. Aquí contamos cómo nació y cómo ha crecido.">
                <div className="historia-intro2">
                    <ul className="historia-datos">
                        {datosHistoria.map((dato) => (
                            <li key={dato.titulo}>
                                <span className="historia-datos__punto" aria-hidden="true" />
                                <div><strong>{dato.titulo}</strong><span>{dato.texto}</span></div>
                            </li>
                        ))}
                    </ul>
                    <figure className="historia-foto">
                        <img loading="lazy" decoding="async" src={fotoFachada} alt="Fachada de la biblioteca" />
                        <figcaption>Fachada de la biblioteca</figcaption>
                    </figure>
                </div>
                <p className="historia-fuente">Datos de la investigación de la Dra. Alma Delia Sánchez Andrade.</p>
            </TarjetaPerfil>

            {/* Fotos de Solón Argüello que compartió Aldahir (21 nov 2026) */}
            <TarjetaPerfil color="rosa" icono={tarjetaUsuario} titulo="El nombre de la biblioteca"
                texto="La biblioteca lleva el nombre de José Solón Argüello, poeta, maestro y periodista que vivió y enseñó en Tepic.">
                <div className="historia-solon">
                    <figure className="historia-foto historia-foto--retrato">
                        <img loading="lazy" decoding="async" src={solonRetrato} alt="Retrato de José Solón Argüello" />
                        <figcaption>José Solón Argüello Escobar</figcaption>
                    </figure>
                    <figure className="historia-foto">
                        <img loading="lazy" decoding="async" src={solonMultitud} alt="Solón Argüello entre la gente, con el sombrero en alto" />
                        <figcaption>Solón Argüello entre la gente, a inicios del siglo XX</figcaption>
                    </figure>
                </div>
                <p className="historia-fuente"><Link to="/acerca/solon-arguello" className="historia-enlace">Conoce su vida y su obra</Link></p>
            </TarjetaPerfil>

            <TarjetaPerfil color="dorada" icono={tarjetaEstrella} titulo="La biblioteca por dentro" texto="Un recorrido por sus espacios.">
                <div className="historia-galeria">
                    {[{ src: fotoEstudio, pie: "Sala de estudio" }, { src: fotoActividades, pie: "Área de actividades" }, { src: fotoInfantil, pie: "Sala infantil" }].map((f) => (
                        <figure key={f.pie} className="historia-foto">
                            <img loading="lazy" decoding="async" src={f.src} alt={f.pie} />
                            <figcaption>{f.pie}</figcaption>
                        </figure>
                    ))}
                </div>
            </TarjetaPerfil>

            <section className="perfil-panel perfil-panel--ajustado" aria-labelledby="titulo-etapas">
                <EtiquetaPerfil id="titulo-etapas" icono={iconoReloj}>Etapas de nuestra historia</EtiquetaPerfil>
                <p className="historia-panel-texto">Del siglo XIX a 2024. Toca una etapa para leer su detalle.</p>
                <LineaDelTiempo />
            </section>

            <div className="perfil-nota">
                <p><strong>Fuentes</strong>
                    Becerra Juárez, E. (1992), Historia de las bibliotecas de Nayarit, RNBP/CONACULTA; Nayarit, Historia en fotos
                    (nayarithistoriaenfotos.com). Fragmento de la investigación de la Dra. Alma Delia Sánchez Andrade, Extensión Bibliotecaria.</p>
            </div>
        </>
    );
}

// Etapas como tarjetas de lista: número, título y resumen, y la fecha en pastilla; al tocar una se abre su detalle
// (solo una abierta a la vez)
function LineaDelTiempo() {
    const [abierta, setAbierta] = useState<number | null>(null);
    return (
        <ol className="perfil-solicitudes historia-etapas">
            {etapas.map((etapa, i) => {
                const estaAbierta = abierta === i;
                const idDetalle = `etapa-detalle-${i + 1}`;
                return (
                    <li key={etapa.titulo} className={`perfil-solicitud historia-etapa${estaAbierta ? " historia-etapa--abierta" : ""}`}>
                        <button type="button" className="historia-etapa__boton" aria-expanded={estaAbierta} aria-controls={idDetalle}
                            onClick={() => setAbierta(estaAbierta ? null : i)}>
                            <span className="historia-etapa__numero">{i + 1}</span>
                            <span className="perfil-solicitud__textos"><strong>{etapa.titulo}</strong><span>{resaltar(etapa.resumen)}</span></span>
                            <span className="historia-etapa__fecha">{etapa.fecha}</span>
                            <img className="historia-etapa__flecha" src={chevronAbajo} alt="" />
                        </button>
                        <div id={idDetalle} className={`historia-etapa__detalle${etapa.imagen ? "" : " historia-etapa__detalle--solo"}`} hidden={!estaAbierta}>
                            <p>{resaltar(etapa.detalle)}</p>
                            <ImagenEtapa etapa={etapa} />
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

// Foto de la etapa (si la etapa no tiene foto, el detalle ocupa todo el ancho)
function ImagenEtapa({ etapa }: { etapa: Etapa }) {
    if (!etapa.imagen) return null;
    return (
        <figure className="historia-foto historia-etapa__imagen">
            <img loading="lazy" decoding="async" src={etapa.imagen} alt={etapa.titulo} />
        </figure>
    );
}

// Nombres propios de la historia (bibliotecas, edificios) resaltados en verde, en lugar de entre comillas
const nombres = ["General Manuel González", "Francisco I. Madero", "Amado Nervo", "José López Portillo", "Everardo Peña Navarro", "José Solón Argüello"];
function resaltar(texto: string) {
    const partes = texto.split(new RegExp(`(${nombres.map((n) => n.replace(/[.]/g, "\\.")).join("|")})`));
    return partes.map((p, i) => (nombres.includes(p) ? <strong key={i} className="historia-nombre">{p}</strong> : p));
}

export default Historia;

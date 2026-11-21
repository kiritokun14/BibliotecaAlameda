import { useState } from "react";
import { Dato, EtiquetaPerfil, TarjetaPerfil } from "../perfil/piezas";
import { biografiaCompleta, fichaCompleta, obras, trayectoria, type Fragmento } from "./datos";
import iconoPersona from "../../../assets/comun/iconos/persona-verde.svg";
import tarjetaUsuario from "../../../assets/perfil/tarjeta-usuario.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import solonRetrato from "../../../assets/acerca/solon-retrato.webp";

// Solón Argüello (contenido del diseño de Figma), con el catálogo de piezas: ficha en datos, semblanza que se abre
// con «Leer biografía completa», trayectoria como tarjetas de lista con fecha y obras con su portada.
// TODO backend (HU-01): cuando la biblioteca publique «Solón Argüello» desde el panel, se muestra lo publicado en su lugar.
function texto(partes: Fragmento[]) {
    return partes.map((p, i) => (typeof p === "string" ? p : <strong key={i}>{p.resaltado}</strong>));
}

function SolonArguello() {
    const [completa, setCompleta] = useState(false);
    return (
        <>
            <TarjetaPerfil color="verde" icono={tarjetaUsuario} titulo="José Solón Argüello Escobar"
                texto="Poeta, maestro y periodista nicaragüense que vivió y enseñó en Tepic; da nombre a esta biblioteca.">
                <div className="acerca-solon-ficha">
                    <figure className="historia-foto historia-foto--retrato">
                        <img decoding="async" src={solonRetrato} alt="Retrato de José Solón Argüello" />
                        <figcaption>José Solón Argüello Escobar</figcaption>
                    </figure>
                    <dl className="perfil-datos">
                        {fichaCompleta.map((f) => <Dato key={f.dato} etiqueta={f.dato} valor={f.valor} icono={iconoPersona} ancho={2} />)}
                    </dl>
                </div>
            </TarjetaPerfil>

            <TarjetaPerfil color="dorada" icono={tarjetaLista} titulo="Semblanza">
                <div className="acerca-biografia">
                    {(completa ? biografiaCompleta : biografiaCompleta.slice(0, 2)).map((b) => (
                        <section key={b.titulo}>
                            <h4>{b.titulo}</h4>
                            <p className="acerca-parrafo">{texto(b.texto)}</p>
                        </section>
                    ))}
                </div>
                <div className="perfil-acciones">
                    <button type="button" className="perfil-boton perfil-boton--contorno perfil-boton--chico" aria-expanded={completa}
                        onClick={() => setCompleta(!completa)}>{completa ? "Ver menos" : "Leer biografía completa"}</button>
                </div>
            </TarjetaPerfil>

            <section className="perfil-panel perfil-panel--ajustado" aria-labelledby="titulo-trayectoria">
                <EtiquetaPerfil id="titulo-trayectoria" icono={iconoPersona}>Trayectoria</EtiquetaPerfil>
                <ol className="perfil-solicitudes historia-etapas">
                    {trayectoria.map((t, i) => (
                        <li key={t.titulo} className="perfil-solicitud historia-etapa">
                            <div className="historia-etapa__boton">
                                <span className="historia-etapa__numero">{i + 1}</span>
                                <span className="perfil-solicitud__textos"><strong>{t.titulo}</strong><span>{t.texto}</span></span>
                                <span className="historia-etapa__fecha">{t.fecha}</span>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <TarjetaPerfil color="rosa" icono={tarjetaEstrella} titulo="Obras" texto="Sus libros y la revista que fundó en Tepic.">
                <ul className="acerca-obras">
                    {obras.map((o) => (
                        <li key={o.titulo}>
                            <img loading="lazy" decoding="async" src={o.portada} alt={`Portada de ${o.titulo}`} />
                            <strong>{o.titulo}</strong>
                            <span>{o.tipo}</span>
                        </li>
                    ))}
                </ul>
            </TarjetaPerfil>
        </>
    );
}

export default SolonArguello;

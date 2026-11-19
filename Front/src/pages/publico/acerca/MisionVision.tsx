import { TarjetaPerfil } from "../perfil/piezas";
import { fotosEnAccion, valores } from "./datos";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import tarjetaUsuarios from "../../../assets/perfil/tarjeta-usuarios.svg";

// Misión y visión (contenido del diseño de Figma), con el catálogo de piezas.
// TODO backend (HU-01): cuando la biblioteca publique «Misión y visión» desde el panel, se muestra lo publicado en su lugar.
function MisionVision() {
    return (
        <>
            <div className="acerca-dos">
                <TarjetaPerfil color="verde" icono={tarjetaLista} titulo="Misión">
                    <p className="acerca-parrafo">Ofrecer a la población de Nayarit <strong>acceso libre a la lectura, la información y la cultura</strong>, con
                        servicios cercanos, claros y respetuosos para todas las personas.</p>
                </TarjetaPerfil>
                <TarjetaPerfil color="dorada" icono={tarjetaEstrella} titulo="Visión">
                    <p className="acerca-parrafo">Ser un espacio de referencia en el estado: <strong>abierto, actualizado y vivo</strong>, donde la
                        comunidad lee, aprende, crea y se encuentra.</p>
                </TarjetaPerfil>
            </div>

            <TarjetaPerfil color="blanca" icono={tarjetaUsuarios} titulo="Lo que nos guía" texto="Principios con los que atendemos a la comunidad.">
                <ul className="acerca-valores">
                    {valores.map((v) => (
                        <li key={v.titulo}>
                            <span className="perfil-lista__icono"><img src={v.icono} alt="" /></span>
                            <div><strong>{v.titulo}</strong><span>{v.texto}</span></div>
                        </li>
                    ))}
                </ul>
            </TarjetaPerfil>

            <TarjetaPerfil color="rosa" icono={tarjetaEstrella} titulo="La biblioteca en acción">
                <div className="historia-galeria">
                    {fotosEnAccion.map((f) => (
                        <figure key={f.pie} className="historia-foto">
                            <img loading="lazy" decoding="async" src={f.imagen} alt={f.pie} />
                            <figcaption>{f.pie}</figcaption>
                        </figure>
                    ))}
                </div>
            </TarjetaPerfil>

        </>
    );
}

export default MisionVision;

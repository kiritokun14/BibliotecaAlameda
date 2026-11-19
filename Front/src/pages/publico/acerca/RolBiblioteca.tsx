import { TarjetaPerfil } from "../perfil/piezas";
import { perspectivas } from "./datos";
import tarjetaUsuarios from "../../../assets/perfil/tarjeta-usuarios.svg";
import tarjetaPin from "../../../assets/perfil/tarjeta-pin.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";

// Rol de la biblioteca (contenido del diseño de Figma): sus cuatro perspectivas como tarjetas del catálogo,
// cada una con su foto, su texto y lo que ofrece. TODO backend (HU-01): lo publicado reemplaza este contenido.
const colores = ["verde", "dorada", "blanca", "rosa"] as const;
const iconos = [tarjetaUsuarios, tarjetaPin, tarjetaLista, tarjetaEstrella];

function RolBiblioteca() {
    return (
        <>
            <div className="acerca-dos">
                {perspectivas.map((p, i) => (
                    <TarjetaPerfil key={p.titulo} color={colores[i]} icono={iconos[i]} titulo={`Perspectiva ${p.titulo.toLowerCase()}`} texto={p.texto}>
                        <figure className="historia-foto acerca-rol__foto">
                            <img loading="lazy" decoding="async" src={p.foto} alt={p.titulo} />
                        </figure>
                        <ul className="historia-datos">
                            {p.puntos.map((punto) => (
                                <li key={punto}><span className="historia-datos__punto" aria-hidden="true" /><div><strong>{punto}</strong></div></li>
                            ))}
                        </ul>
                    </TarjetaPerfil>
                ))}
            </div>
        </>
    );
}

export default RolBiblioteca;

import { Link } from "react-router";
import "./EstadoPagina.css";
import iconoNube from "../../assets/comun/iconos/estado-nube.svg";
import iconoReintentar from "../../assets/comun/iconos/reintentar-blanco.svg";

// Tarjeta blanca con anillo dorado para los estados del sistema (Figma «A-01 · Estados del sistema»):
// página no encontrada, error del servidor, sin conexión, mantenimiento y «error al cargar» de una página.
// El botón principal puede ser un enlace (ruta) o una acción (por ejemplo, reintentar).

type Accion = { texto: string } & ({ ruta: string; alPresionar?: never } | { alPresionar: () => void; ruta?: never });

type EstadoPaginaProps = {
    etiqueta: string; // "ERROR 404"
    titulo: string;
    texto: string;
    principal: Accion; // botón verde con el ícono de reintentar
    secundario?: { texto: string; ruta: string }; // botón con contorno
    nivel?: "h1" | "h2"; // h2 cuando la página ya tiene su propio h1 (por ejemplo, en su encabezado verde)
};

// Lo que se dibuja en el panel de color: el número del error o una palabra corta
function arteDe(etiqueta: string) {
    const numero = etiqueta.match(/\d{3}/)?.[0];
    if (numero) return numero;
    if (/SERVIDOR/i.test(etiqueta)) return "500";
    if (/CONEXI/i.test(etiqueta)) return "Sin red";
    if (/MANTENIMIENTO/i.test(etiqueta)) return "Pronto";
    return "Ups";
}

export default function EstadoPagina({ etiqueta, titulo, texto, principal, secundario, nivel = "h1" }: EstadoPaginaProps) {
    const Titulo = nivel;
    const arte = arteDe(etiqueta);
    const contenido = (
        <>
            {principal.texto}
            <img src={iconoReintentar} alt="" />
        </>
    );
    return (
        <section className="estado-pagina-seccion">
            <div className="estado-pagina" role="alert">
                <div className="estado-pagina__arte" aria-hidden="true">
                    <span className="estado-pagina__circulo estado-pagina__circulo--uno" />
                    <span className="estado-pagina__circulo estado-pagina__circulo--dos" />
                    <span className={`estado-pagina__codigo${arte.length > 3 ? " estado-pagina__codigo--palabra" : ""}`}>{arte}</span>
                    <span className="estado-pagina__anillo">
                        <span className="estado-pagina__icono">
                            <img src={iconoNube} alt="" />
                        </span>
                    </span>
                </div>
                <div className="estado-pagina__contenido">
                    <p className="estado-pagina__etiqueta"><span />{etiqueta}</p>
                    <Titulo className="estado-pagina__titulo">{titulo}</Titulo>
                    <p className="estado-pagina__texto">{texto}</p>
                    <div className="estado-pagina__botones">
                        {principal.ruta ? (
                            <Link to={principal.ruta} className="boton-estado boton-estado--verde">{contenido}</Link>
                        ) : (
                            <button type="button" className="boton-estado boton-estado--verde" onClick={principal.alPresionar}>{contenido}</button>
                        )}
                        {secundario && (
                            <Link to={secundario.ruta} className="boton-estado boton-estado--contorno">{secundario.texto}</Link>
                        )}
                    </div>
                    <p className="estado-pagina__ayuda">
                        ¿Necesitas ayuda? Llámanos al <a href="tel:3112128989">311 212 8989</a> o escribe a <a href="mailto:bp0165@dgb.gob.mx">bp0165@dgb.gob.mx</a>.
                    </p>
                </div>
            </div>
        </section>
    );
}

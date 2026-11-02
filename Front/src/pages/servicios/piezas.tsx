import { Link } from "react-router";
import iconoArchivo from "../../assets/servicios/estado-archivo.svg";
import iconoNube from "../../assets/servicios/estado-nube.svg";
import flechaBlanca from "../../assets/servicios/boton-flecha-blanca.svg";
import iconoReintentar from "../../assets/servicios/boton-reintentar.svg";

// Mientras llega la respuesta
export function CargandoServicios() {
    return (
        <section className="servicios-seccion servicios-seccion--crema">
            <p className="servicios-cargando" role="status">
                <span className="servicios-cargando__punto" aria-hidden="true" />
                Cargando servicios…
            </p>
        </section>
    );
}

// Tarjeta blanca con anillo dorado: "Contenido no disponible" y "Error al cargar"
export function EstadoServicios({
    tipo,
    alReintentar,
}: {
    tipo: "no-disponible" | "error";
    alReintentar?: () => void;
}) {
    const esError = tipo === "error";
    return (
        <section className="servicios-seccion servicios-seccion--crema">
            <div className="estado-servicios" role={esError ? "alert" : undefined}>
                <span className="estado-servicios__anillo">
                    <span className="estado-servicios__icono">
                        <img src={esError ? iconoNube : iconoArchivo} alt="" />
                    </span>
                </span>
                <p className="estado-servicios__etiqueta">{esError ? "ERROR AL CARGAR" : "CONTENIDO NO DISPONIBLE"}</p>
                <h2>{esError ? "No pudimos cargar los servicios" : "Este contenido ya no está disponible"}</h2>
                <p className="estado-servicios__texto">
                    {esError
                        ? "Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, escríbenos desde el Buzón de sugerencias."
                        : "Pudo haber sido retirado o movido. Puedes volver al inicio o ver las noticias."}
                </p>
                <div className="estado-servicios__botones">
                    {esError ? (
                        <>
                            <button type="button" className="boton-servicios boton-servicios--verde" onClick={alReintentar}>
                                Intentar de nuevo
                                <img src={iconoReintentar} alt="" />
                            </button>
                            <Link to="/contacto" className="boton-servicios boton-servicios--contorno">
                                Ir al Buzón de sugerencias
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/" className="boton-servicios boton-servicios--verde">
                                Ir al inicio
                                <img src={flechaBlanca} alt="" />
                            </Link>
                            <Link to="/noticias" className="boton-servicios boton-servicios--contorno">
                                Ver noticias
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { IconoFlechaIzq, IconoInfo, Migas } from "./piezas";
import { TIPOS_CONTENIDO } from "./tipos";
import "./Contenidos.css";

// Paso 1 de "Nuevo contenido": elegir qué tipo de contenido se va a redactar.
// Por ahora solo es el diseño; el formulario de cada tipo viene después.

const PASOS = [
    { titulo: "Redactas", texto: "Guarda borradores cuantas veces quieras." },
    { titulo: "Envías a autorización", texto: "El Administrador lo revisa y puede pedir cambios." },
    { titulo: "Se publica", texto: "Queda en el portal y en la bitácora de cambios." },
];

function NuevoContenido() {
    return (
        <PanelLayout titulo="Contenidos" tema="solon">
            <Migas actual="Elegir tipo" />

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <Link to="/admin/contenidos/editor" className="contenidos-volver">
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a Mis contenidos
                    </Link>
                    <p className="contenidos-etiqueta">Contenidos · Editor · Nuevo</p>
                    <h1>¿Qué quieres redactar?</h1>
                    <p className="contenidos-encabezado__texto">
                        Elige el tipo de contenido. Después podrás guardarlo como borrador o enviarlo a autorización.
                    </p>
                </div>
            </div>

            <ul className="contenidos-tipos">
                {TIPOS_CONTENIDO.map((tipo) => (
                    <li key={tipo.valor} className="contenidos-tipo">
                        <span className="contenidos-tipo__letra" aria-hidden="true">{tipo.letra}</span>
                        <h2>{tipo.nombre}</h2>
                        <p>{tipo.descripcion}</p>
                        {tipo.ruta ? (
                            <Link to={tipo.ruta} className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" aria-label={`Elegir ${tipo.nombre}`}>
                                Elegir →
                            </Link>
                        ) : (
                            // TODO: formulario de este tipo
                            <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" aria-label={`Elegir ${tipo.nombre}`}>
                                Elegir →
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <section className="contenidos-como" aria-labelledby="contenidos-como-titulo">
                <div className="contenidos-como__cabecera">
                    <span className="contenidos-como__icono"><IconoInfo /></span>
                    <div>
                        <h2 id="contenidos-como-titulo">Cómo funciona</h2>
                        <p>Todo contenido pasa por autorización.</p>
                    </div>
                </div>
                <ol className="contenidos-como__pasos">
                    {PASOS.map((paso, i) => (
                        <li key={paso.titulo}>
                            <span className="contenidos-como__numero">{i + 1}</span>
                            <div>
                                <strong>{paso.titulo}</strong>
                                <p>{paso.texto}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </PanelLayout>
    );
}

export default NuevoContenido;

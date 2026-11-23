import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { IconoInfo, Migas } from "./piezas";
import { TIPOS_CONTENIDO } from "./tipos";
import { Encabezado as EncabezadoPz, Icono, type NombreIcono } from "../piezasPanel";

// El mismo ícono por tipo que en la bandeja y en la revisión
const ICONO_TIPO: Record<string, NombreIcono> = { noticia: "contenido", resena: "fuentes", acerca: "info", memoria: "evidencias" };
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
        <PanelLayout titulo="Contenidos" tema="contenidos paleta">
            <Migas actual="Elegir tipo" />

            <EncabezadoPz titulo="¿Qué quieres redactar?" texto="Elige el tipo de contenido. Después podrás guardarlo como borrador o enviarlo a autorización." />

            <ul className="contenidos-tipos">
                {TIPOS_CONTENIDO.map((tipo) => (
                    <li key={tipo.valor} className="contenidos-tipo">
                        <span className="contenidos-tipo__letra contenidos-tipo__letra--icono" aria-hidden="true"><Icono nombre={ICONO_TIPO[tipo.valor] ?? "contenido"} /></span>
                        <h2>{tipo.nombre}</h2>
                        <p>{tipo.descripcion}</p>
                        {tipo.ruta ? (
                            <Link to={tipo.ruta} className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" aria-label={`Elegir ${tipo.nombre}`}>
                                Elegir
                            </Link>
                        ) : (
                            // TODO: formulario de este tipo
                            <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" aria-label={`Elegir ${tipo.nombre}`}>
                                Elegir
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

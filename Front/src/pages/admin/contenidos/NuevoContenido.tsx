import { useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import { EncabezadoPagina } from "../componentes";
import "./Contenidos.css";
import { crearContenido } from "./datos";
import { ESQUEMAS, TIPOS, type TipoContenido } from "./esquemas";
import iconoInfo from "../../../assets/admin/tarjeta-info.svg";

// HU-12 · Editor: elegir qué tipo de contenido se va a redactar
function NuevoContenido() {
    const navigate = useNavigate();

    function elegir(tipo: TipoContenido) {
        const folio = crearContenido(tipo);
        navigate(`/admin/contenidos/editor/${folio}`);
    }

    return (
        <PanelLayout titulo="Contenidos">
            <nav className="migas-panel" aria-label="Ruta">
                <span>Contenidos</span> › <span>Editor de contenidos</span> › <strong>Elegir tipo</strong>
            </nav>

            <div className="encabezado-tarjeta">
                <EncabezadoPagina
                    volver={{ texto: "Volver a Mis contenidos", ruta: "/admin/contenidos/editor" }}
                    etiqueta="CONTENIDOS · EDITOR · NUEVO"
                    titulo="¿Qué quieres redactar?"
                    texto="Elige el tipo de contenido. Después podrás guardarlo como borrador o enviarlo a autorización."
                />
            </div>

            <ul className="tipos-contenido">
                {TIPOS.map((tipo) => {
                    const esquema = ESQUEMAS[tipo];
                    return (
                        <li key={tipo} className="tipo-contenido">
                            <span className="tipo-contenido__letra" aria-hidden="true">{esquema.letra}</span>
                            <h2>{esquema.nombre}</h2>
                            <p>{esquema.descripcionTipo}</p>
                            <button type="button" className="boton-panel boton-panel--verde boton-panel--mediano" onClick={() => elegir(tipo)}>
                                Elegir →<span className="solo-lectores"> {esquema.nombre}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>

            <section className="como-funciona">
                <div className="como-funciona__cabecera">
                    <span className="icono-tarjeta icono-tarjeta--verde"><img src={iconoInfo} alt="" /></span>
                    <div>
                        <h2>Cómo funciona</h2>
                        <p>Todo contenido pasa por autorización.</p>
                    </div>
                </div>
                <PasosContenido
                    pasos={[
                        ["Redactas", "Guardas borradores cuantas veces quieras."],
                        ["Envías a autorización", "El Administrador lo revisa y puede pedir cambios."],
                        ["Se publica", "Queda en el portal y en la bitácora de cambios."],
                    ]}
                />
            </section>
        </PanelLayout>
    );
}

export function PasosContenido({ pasos }: { pasos: [string, string][] }) {
    return (
        <ol className="pasos-contenido">
            {pasos.map(([titulo, texto], i) => (
                <li key={titulo}>
                    <span className="pasos-contenido__numero" aria-hidden="true">{i + 1}</span>
                    <span>
                        <strong>{titulo}</strong>
                        <small>{texto}</small>
                    </span>
                </li>
            ))}
        </ol>
    );
}

export default NuevoContenido;

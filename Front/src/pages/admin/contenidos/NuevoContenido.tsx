import { useNavigate } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { crearContenido } from "./datos";
import { ESQUEMAS, TIPOS, type TipoContenido } from "./esquemas";
import { EncabezadoTarjeta, Migas, Pagina, Pasos, PieDatos } from "./piezas";
import { clasesBoton } from "./utiles";

// HU-12 · Editor: elegir qué tipo de contenido se va a redactar (Figma 558:16185)
function NuevoContenido() {
    const navigate = useNavigate();

    function elegir(tipo: TipoContenido) {
        const folio = crearContenido(tipo);
        navigate(`/admin/contenidos/editor/${folio}`);
    }

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Editor de contenidos", "/admin/contenidos/editor"], ["Elegir tipo"]]} />

                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Mis contenidos", ruta: "/admin/contenidos/editor" }}
                    etiqueta="Contenidos · Editor · Nuevo"
                    titulo="¿Qué quieres redactar?"
                    texto="Elige el tipo de contenido. Después podrás guardarlo como borrador o enviarlo a autorización."
                />

                <ul className="cn-tipos">
                    {TIPOS.map((tipo) => {
                        const esquema = ESQUEMAS[tipo];
                        return (
                            <li key={tipo} className="cn-tipo">
                                <span className="cn-tipo__letra" aria-hidden="true">{esquema.letra}</span>
                                <h2>{esquema.nombre}</h2>
                                <p>{esquema.descripcionTipo}</p>
                                <button type="button" className={clasesBoton("verde", "cn-boton--chico")} onClick={() => elegir(tipo)}>
                                    Elegir →<span className="cn-solo-lectores"> {esquema.nombre}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <section className="cn-tarjeta cn-tarjeta--crema" aria-labelledby="cn-como-funciona">
                    <div className="cn-tarjeta__cabecera">
                        <span className="cn-mosaico" aria-hidden="true">i</span>
                        <div>
                            <h2 id="cn-como-funciona">Cómo funciona</h2>
                            <p>Todo contenido pasa por autorización.</p>
                        </div>
                    </div>
                    <Pasos
                        pasos={[
                            ["Redactas", "Guardas borradores cuantas veces quieras."],
                            ["Envías a autorización", "El Administrador lo revisa y puede pedir cambios."],
                            ["Se publica", "Queda en el portal y en la bitácora de cambios."],
                        ]}
                    />
                </section>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default NuevoContenido;

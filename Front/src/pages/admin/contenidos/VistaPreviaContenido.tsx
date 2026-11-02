import { Link, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, EncabezadoPagina, EstadoVacio } from "../componentes";
import "./Contenidos.css";
import { NOMBRE_ESTADO, esEditable, fechaLarga, obtenerContenido, useContenidos, type Contenido } from "./datos";
import { ESQUEMAS, tituloDe } from "./esquemas";
import { TONO_ESTADO } from "./tonos";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

// HU-12 · Así se verá en el portal. Para lo ya enviado o publicado es la vista de consulta.
function VistaPreviaContenido() {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);

    if (!contenido) {
        return (
            <PanelLayout titulo="Contenidos">
                <EstadoVacio icono={vacioBuscar} titulo="No encontramos ese contenido" texto="Puede que el folio no exista." />
                <Link to="/admin/contenidos/editor" className="boton-panel boton-panel--verde boton-panel--mediano">Volver a Mis contenidos</Link>
            </PanelLayout>
        );
    }

    const esquema = ESQUEMAS[contenido.tipo];
    const editable = esEditable(contenido.estado);
    const rutaEditar = `/admin/contenidos/editor/${contenido.folio}`;

    return (
        <PanelLayout titulo="Contenidos">
            <nav className="migas-panel" aria-label="Ruta">
                <span>Contenidos</span> › <span>Editor de contenidos</span> › <strong>{esquema.nombre}</strong>
            </nav>

            <div className="encabezado-tarjeta">
                <EncabezadoPagina
                    volver={editable ? { texto: "Volver a editar", ruta: rutaEditar } : { texto: "Volver a Mis contenidos", ruta: "/admin/contenidos/editor" }}
                    etiqueta={`VISTA PREVIA · ${esquema.etiqueta} ${contenido.folio}`}
                    titulo="Así se verá en el portal"
                    texto={
                        contenido.estado === "publicado"
                            ? "Este contenido ya está publicado en el portal."
                            : contenido.estado === "por-autorizar"
                              ? "Está en autorización: el Administrador lo revisa y no se puede editar mientras tanto."
                              : "Revisa el texto y la imagen. Aún no está publicado: nadie más lo ve."
                    }
                />
            </div>

            <article className="vista-previa-contenido">
                <p className="vista-previa-contenido__franja">
                    VISTA PREVIA · {contenido.estado === "publicado" ? "Publicado" : `${NOMBRE_ESTADO[contenido.estado]} · no publicado`}
                </p>
                <ContenidoComoEnPortal contenido={contenido} />
            </article>

            <div className="acciones-contenido">
                {editable ? (
                    <>
                        <Link to={rutaEditar} className="boton-panel boton-panel--verde boton-panel--grande">Volver a editar</Link>
                        <p className="acciones-contenido__nota">Para enviarlo, vuelve a editar y usa «Enviar a autorización».</p>
                    </>
                ) : (
                    <>
                        <Link to="/admin/contenidos/editor" className="boton-panel boton-panel--verde boton-panel--grande">Volver a Mis contenidos</Link>
                        <Chip tono={TONO_ESTADO[contenido.estado]}>{NOMBRE_ESTADO[contenido.estado]}</Chip>
                    </>
                )}
            </div>
        </PanelLayout>
    );
}

// Lo mismo que se verá en la página pública (pastilla, título, fecha, imagen y texto)
export function ContenidoComoEnPortal({ contenido }: { contenido: Contenido }) {
    const esquema = ESQUEMAS[contenido.tipo];
    const v = contenido.valores;
    const etiqueta = esquema.campoEtiqueta ? String(v[esquema.campoEtiqueta] ?? "") : "";
    const imagen = esquema.campoImagen ? String(v[esquema.campoImagen] ?? "") : "";
    const texto = String(v[esquema.campoTexto] ?? "").trim();
    const resumen = esquema.campoResumen ? String(v[esquema.campoResumen] ?? "").trim() : "";

    let linea = "Biblioteca Solón Argüello";
    if (contenido.tipo === "noticia" && v.fecha) linea = `${fechaLarga(String(v.fecha))} · Biblioteca Solón Argüello`;
    if (contenido.tipo === "resena") linea = `${String(v.autoria || "Autoría por confirmar")} · Reseña del equipo de la biblioteca`;
    if (contenido.tipo === "memoria") linea = `${String(v.periodo || "Periodo por confirmar")} · ${String(v.fuente || "Fuente por confirmar")}`;

    return (
        <div className="vista-previa-contenido__cuerpo">
            {etiqueta && <span className="chip chip--verde vista-previa-contenido__etiqueta">{etiqueta}</span>}
            <h2>{tituloDe(contenido.tipo, v).replace(esquema.prefijoTitulo ?? "", "")}</h2>
            <p className="vista-previa-contenido__linea">{linea}</p>
            {esquema.campoImagen && (
                <div className="vista-previa-contenido__imagen">
                    {imagen ? `Imagen: ${imagen} (ejemplo)` : "Sin imagen"}
                </div>
            )}
            {resumen && <p className="vista-previa-contenido__resumen">{resumen}</p>}
            {texto
                ? texto.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)
                : <p className="vista-previa-contenido__vacio">Todavía no hay texto.</p>}
        </div>
    );
}

export default VistaPreviaContenido;

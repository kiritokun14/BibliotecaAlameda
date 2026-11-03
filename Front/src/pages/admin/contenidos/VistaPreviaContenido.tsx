import { Link, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { esEditable, fechaLarga, NOMBRE_ESTADO, obtenerContenido, useContenidos, type Contenido } from "./datos";
import { ESQUEMAS, tituloDe } from "./esquemas";
import { ChipEstado, Datos, EncabezadoTarjeta, Migas, Pagina, PieDatos, Tarjeta } from "./piezas";
import { clasesBoton } from "./utiles";
import { NoEncontrado } from "./EditarContenido";
import iconoOjo from "../../../assets/admin/contenidos/tarjeta-ojo.svg";

// HU-12 · "Así se verá en el portal" (Figma 559:16593 y 610:48688). La usan el Editor y la Revisión.
function VistaPreviaContenido({ desde = "editor" }: { desde?: "editor" | "revision" }) {
    const { folio } = useParams();
    useContenidos();
    const contenido = obtenerContenido(folio);
    const base = `/admin/contenidos/${desde}`;
    if (!contenido) return <NoEncontrado ruta={base} texto={desde === "editor" ? "Volver a Mis contenidos" : "Volver a Revisión y publicación"} />;

    const esquema = ESQUEMAS[contenido.tipo];
    const editable = desde === "editor" && esEditable(contenido.estado);
    const volver = desde === "revision"
        ? { texto: "Volver a la revisión", ruta: `${base}/${contenido.folio}` }
        : editable
          ? { texto: "Volver a editar", ruta: `${base}/${contenido.folio}` }
          : { texto: "Volver a Mis contenidos", ruta: base };

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], [desde === "editor" ? "Editor de contenidos" : "Revisión y publicación", base], ["Vista previa"]]} />

                <EncabezadoTarjeta
                    volver={volver}
                    etiqueta={`Vista previa · ${esquema.etiqueta} ${contenido.folio}`}
                    titulo="Así se verá en el portal"
                    texto={
                        contenido.estado === "publicado"
                            ? "Este contenido ya está publicado en el portal."
                            : contenido.estado === "por-autorizar"
                              ? "Está en autorización: no se puede editar mientras el Administrador lo revisa."
                              : "Revisa el texto y la imagen. Aún no está publicado: nadie más lo ve."
                    }
                />

                <Tarjeta icono={iconoOjo} titulo={esquema.nombre} subtitulo={tituloDe(contenido.tipo, contenido.valores)}>
                    <p className="cn-franja">
                        Vista previa · {contenido.estado === "publicado" ? "Publicado" : `${NOMBRE_ESTADO[contenido.estado]} · no publicado`}
                    </p>
                    <PreviaContenido contenido={contenido} completa />
                </Tarjeta>

                <div className="cn-acciones">
                    {editable ? (
                        <>
                            <Link to={volver.ruta} className={clasesBoton("verde")}>Volver a editar</Link>
                            <p className="cn-nota">Para enviarlo, vuelve a editar y usa «Enviar a autorización».</p>
                        </>
                    ) : (
                        <>
                            <Link to={volver.ruta} className={clasesBoton("verde")}>{volver.texto}</Link>
                            <ChipEstado estado={contenido.estado} />
                        </>
                    )}
                </div>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Lo que verá la persona en el portal: imagen, pastilla, título, línea, texto y datos del tipo
export function PreviaContenido({ contenido, completa }: { contenido: Contenido; completa?: boolean }) {
    const esquema = ESQUEMAS[contenido.tipo];
    const v = contenido.valores;
    const s = (nombre: string, otro = "Por confirmar") => String(v[nombre] ?? "").trim() || otro;
    const imagen = esquema.campoImagen ? String(v[esquema.campoImagen] ?? "") : "";
    const resumen = esquema.campoResumen ? String(v[esquema.campoResumen] ?? "").trim() : "";
    const texto = String(v[esquema.campoTexto] ?? "").trim();
    const cuerpo = completa ? texto || resumen : resumen || texto;
    const mes = new Date(contenido.actualizado).toLocaleDateString("es-MX", { month: "short", year: "numeric" }).replace(".", "");

    const config = {
        noticia: {
            marco: "Imagen", pastilla: s("categoria", "Noticia"),
            linea: `${v.fecha ? fechaLarga(String(v.fecha)) : "Fecha por confirmar"} · Biblioteca Solón Argüello`,
            datos: [["Categoría", s("categoria")], ["Fecha", v.fecha ? fechaLarga(String(v.fecha)) : "Por confirmar"], ["Texto alternativo", s("alt", "Sin texto alternativo")]],
        },
        resena: {
            marco: "Portada", pastilla: `${s("vista", "Por autor")} · ${s("genero", "Género por confirmar")}`,
            linea: `Reseña del equipo · ${mes} (ejemplo)`,
            datos: [["Libro", s("libro")], ["Autoría", s("autoria")], ["Género", s("genero")], ["Firmada por", s("firma")]],
        },
        acerca: {
            marco: "", pastilla: s("seccion", "Acerca de"),
            linea: "Acerca de la biblioteca · Biblioteca Solón Argüello",
            datos: [["Sección", s("seccion")], ["Línea del tiempo", s("linea")]],
        },
        memoria: {
            marco: s("tipoPieza", "Pieza"), pastilla: `Memoria pública · ${s("periodoTema", "Tema por confirmar")}`,
            linea: `${s("fuente", "Fuente por confirmar")} · ${mes} (ejemplo)`,
            datos: [["Pieza", s("titulo")], ["Fuente", s("fuente")], ["Tipo", s("tipoPieza")], ["Registrada por", s("registradaPor")]],
        },
    }[contenido.tipo];

    return (
        <div className="cn-previa">
            <div className="cn-previa__fila">
                {config.marco && (
                    <div className="cn-previa__portada" role="img" aria-label={imagen ? `${config.marco}: ${imagen} (ejemplo)` : `Sin ${config.marco.toLowerCase()}`}>
                        {imagen ? `${config.marco} · ${imagen}` : config.marco}
                    </div>
                )}
                <div className="cn-previa__textos">
                    <span className="cn-chip cn-chip--verde"><span className="cn-chip__punto" aria-hidden="true" />{config.pastilla}</span>
                    <h3>{tituloDe(contenido.tipo, contenido.valores).replace(esquema.prefijoTitulo ?? "", "")}</h3>
                    <p className="cn-previa__meta">{config.linea}</p>
                    {cuerpo
                        ? cuerpo.split(/\n+/).map((p, i) => <p key={i} className="cn-previa__texto">{p}</p>)
                        : <p className="cn-previa__vacio">Todavía no hay texto.</p>}
                </div>
            </div>
            <Datos variante="compacto" filas={config.datos as [string, string][]} />
        </div>
    );
}

export default VistaPreviaContenido;

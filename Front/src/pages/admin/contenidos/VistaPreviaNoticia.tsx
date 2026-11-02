import { useEffect, useState } from "react";
import { IconoFlechaIzq, IconoImagen, Migas } from "./piezas";

// Vista previa de una noticia: así se verá en el portal. Usa lo que está escrito
// en el formulario; todavía no está publicado ni guardado.

export type DatosNoticia = {
    titulo: string;
    texto: string;
    imagen: File | null;
    textoAlternativo: string;
    categoria: string;
    fecha: string; // aaaa-mm-dd
};

function formatearFecha(fecha: string) {
    if (!fecha) return "Fecha por definir";
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${fecha}T00:00:00Z`));
}

type VistaPreviaNoticiaProps = {
    noticia: DatosNoticia;
    alVolver: () => void;
    alEnviar: () => void;
};

function VistaPreviaNoticia({ noticia, alVolver, alEnviar }: VistaPreviaNoticiaProps) {
    // La imagen elegida se lee en el navegador para mostrarla (no se sube a ningún lado)
    const [imagenLeida, setImagenLeida] = useState<{ archivo: File; url: string } | null>(null);
    useEffect(() => {
        if (!noticia.imagen) return;
        const archivo = noticia.imagen;
        const lector = new FileReader();
        lector.onload = () => setImagenLeida({ archivo, url: String(lector.result) });
        lector.readAsDataURL(archivo);
        return () => lector.abort();
    }, [noticia.imagen]);
    const urlImagen = imagenLeida && imagenLeida.archivo === noticia.imagen ? imagenLeida.url : null;

    const parrafos = noticia.texto.split(/\n+/).map((p) => p.trim()).filter(Boolean);

    return (
        <>
            <Migas actual="Noticia" />

            <div className="contenidos-encabezado contenidos-encabezado--tarjeta">
                <div>
                    <button type="button" className="contenidos-volver" onClick={alVolver}>
                        <span className="contenidos-volver__circulo"><IconoFlechaIzq /></span>
                        Volver a editar
                    </button>
                    <p className="contenidos-etiqueta">Vista previa · Noticia nueva</p>
                    <h1>Así se verá en el portal</h1>
                    <p className="contenidos-encabezado__texto">Revisa el texto y la imagen. Aún no está publicado: nadie más lo ve.</p>
                </div>
            </div>

            <article className="contenidos-previa" aria-label="Vista previa de la noticia">
                <p className="contenidos-previa__franja">Vista previa · Borrador no publicado</p>
                <div className="contenidos-previa__cuerpo">
                    {noticia.categoria && <span className="contenidos-estado contenidos-estado--por_autorizar">{noticia.categoria}</span>}
                    <h2 className={noticia.titulo ? undefined : "contenidos-previa__vacio"}>{noticia.titulo || "Sin título"}</h2>
                    <p className="contenidos-previa__meta">{formatearFecha(noticia.fecha)} · Biblioteca Solón Argüello</p>

                    {urlImagen ? (
                        <img className="contenidos-previa__imagen" src={urlImagen} alt={noticia.textoAlternativo} />
                    ) : (
                        <div className="contenidos-previa__imagen contenidos-previa__imagen--vacia">
                            <IconoImagen />
                            <span>Sin imagen principal</span>
                        </div>
                    )}

                    {parrafos.length ? (
                        parrafos.map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                        <p className="contenidos-previa__vacio">Todavía no hay texto.</p>
                    )}
                </div>
            </article>

            <div className="contenidos-previa__acciones">
                <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={alVolver}>Volver a editar</button>
                <button type="button" className="contenidos-boton contenidos-boton--principal" onClick={alEnviar}>Enviar a autorización</button>
            </div>
        </>
    );
}

export default VistaPreviaNoticia;

// Esqueletos de carga: la forma gris de lo que va a aparecer, con un brillo que la recorre,
// mientras llegan los datos. Para lectores de pantalla solo se anuncia «Cargando…».
import "./Esqueleto.css";

function Bloque({ clase = "", ancho }: { clase?: string; ancho?: string }) {
    return <span className={`esqueleto__bloque ${clase}`} style={ancho ? { width: ancho } : undefined} />;
}

function Anuncio({ texto }: { texto: string }) {
    return <span className="solo-lectores">{texto}</span>;
}

// Tarjeta con imagen arriba (noticias, actividades, reseñas): mismas medidas que .tarjeta-listado
function TarjetaEsqueleto({ libro = false }: { libro?: boolean }) {
    return (
        <div className={`esqueleto-tarjeta${libro ? " esqueleto-tarjeta--libro" : ""}`} aria-hidden="true">
            <Bloque clase="esqueleto-tarjeta__imagen" />
            <div className="esqueleto-tarjeta__textos">
                <Bloque clase="esqueleto__chip" />
                <Bloque clase="esqueleto__titulo" ancho="85%" />
                <Bloque clase="esqueleto__linea" ancho="60%" />
                {!libro && <Bloque clase="esqueleto__linea" ancho="45%" />}
            </div>
        </div>
    );
}

export function EsqueletoTarjetas({ cantidad = 3, libro = false, texto = "Cargando…" }: { cantidad?: number; libro?: boolean; texto?: string }) {
    return (
        <div className={`esqueleto-cuadricula${libro ? " esqueleto-cuadricula--libros" : ""}`} role="status">
            <Anuncio texto={texto} />
            {Array.from({ length: cantidad }, (_, i) => <TarjetaEsqueleto key={i} libro={libro} />)}
        </div>
    );
}

// Tarjeta grande verde (noticia o actividad destacada)
export function EsqueletoDestacada({ texto = "Cargando…" }: { texto?: string }) {
    return (
        <div className="esqueleto-destacada" role="status">
            <Anuncio texto={texto} />
            <Bloque clase="esqueleto-destacada__imagen" />
            <div className="esqueleto-destacada__textos" aria-hidden="true">
                <Bloque clase="esqueleto__chip esqueleto__bloque--claro" />
                <Bloque clase="esqueleto__titulo esqueleto__titulo--grande esqueleto__bloque--claro" ancho="90%" />
                <Bloque clase="esqueleto__titulo esqueleto__titulo--grande esqueleto__bloque--claro" ancho="60%" />
                <Bloque clase="esqueleto__linea esqueleto__bloque--claro" ancho="70%" />
                <Bloque clase="esqueleto__boton esqueleto__bloque--claro" />
            </div>
        </div>
    );
}

// Texto largo (Acerca de, detalle de una reseña)
export function EsqueletoArticulo({ texto = "Cargando…" }: { texto?: string }) {
    return (
        <div className="esqueleto-articulo" role="status">
            <Anuncio texto={texto} />
            <Bloque clase="esqueleto__titulo esqueleto__titulo--grande" ancho="55%" />
            {["100%", "96%", "98%", "72%"].map((ancho, i) => <Bloque key={`a${i}`} clase="esqueleto__linea" ancho={ancho} />)}
            <Bloque clase="esqueleto-articulo__imagen" />
            {["100%", "94%", "60%"].map((ancho, i) => <Bloque key={`b${i}`} clase="esqueleto__linea" ancho={ancho} />)}
        </div>
    );
}

// Mientras se descarga el código de una página (Suspense de App.tsx): la silueta del portal
// (franja guinda, menú, encabezado verde y tarjetas) en lugar de un texto suelto.
// En el panel de administración solo se muestran las tarjetas.
export function EsqueletoPagina() {
    const panel = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
    return (
        <div className={`esqueleto-pagina${panel ? " esqueleto-pagina--panel" : ""}`} role="status">
            <Anuncio texto="Cargando página…" />
            {!panel && (
                <div aria-hidden="true">
                    <div className="esqueleto-pagina__franja" />
                    <div className="esqueleto-pagina__menu" />
                    <div className="esqueleto-pagina__encabezado">
                        <Bloque clase="esqueleto__chip esqueleto__bloque--claro" />
                        <Bloque clase="esqueleto__titulo esqueleto__titulo--grande esqueleto__bloque--claro" ancho="420px" />
                        <Bloque clase="esqueleto__linea esqueleto__bloque--claro" ancho="520px" />
                    </div>
                </div>
            )}
            <div className="esqueleto-pagina__cuerpo" aria-hidden="true">
                {[0, 1, 2].map((i) => <TarjetaEsqueleto key={i} />)}
            </div>
        </div>
    );
}

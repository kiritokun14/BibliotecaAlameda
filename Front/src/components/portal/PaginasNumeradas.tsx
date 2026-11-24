// Paginación numerada (tableta y teléfono): «Anterior · 1 2 3 4 5 6 7 8 · Siguiente», como el buscador de Google.
// La página actual va llena en verde; al cambiar de página se sube al inicio de la lista. Estilos en Responsivo.css.
import { numerosPagina } from "./responsivo";

export default function PaginasNumeradas({ pagina, total, alCambiar, etiqueta = "Páginas" }: {
    pagina: number; total: number; alCambiar: (p: number) => void; etiqueta?: string;
}) {
    if (total <= 1) return null;
    return (
        <nav className="paginas-num" aria-label={etiqueta}>
            <button type="button" className="paginas-num__paso" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>Anterior</button>
            <ol className="paginas-num__numeros">
                {numerosPagina(pagina, total).map((n) => (
                    <li key={n}>
                        <button type="button" className={`paginas-num__numero${n === pagina ? " paginas-num__numero--actual" : ""}`}
                            aria-current={n === pagina ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => alCambiar(n)}>{n}</button>
                    </li>
                ))}
            </ol>
            <button type="button" className="paginas-num__paso" disabled={pagina >= total} onClick={() => alCambiar(pagina + 1)}>Siguiente</button>
        </nav>
    );
}

import { Navigate, useSearchParams } from "react-router";

// «Por tema» ya no existe (Aldahir, 19 nov): el filtro Género del panel de Lecturas hace lo mismo.
// Las direcciones viejas (/lecturas/temas?tema=novela&q=rulfo) llegan a /lecturas?genero=novela&q=rulfo.
function LecturasTema() {
    const [parametros] = useSearchParams();
    const nuevos = new URLSearchParams();
    const tema = parametros.get("tema");
    const q = parametros.get("q");
    if (tema) nuevos.set("genero", tema);
    if (q) nuevos.set("q", q);
    return <Navigate to={`/lecturas${nuevos.size ? `?${nuevos}` : ""}`} replace />;
}

export default LecturasTema;

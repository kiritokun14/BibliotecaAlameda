// Ayudas de Contenidos que no son componentes (separadas para que Fast Refresh funcione)
import { autorDe, YO, type Contenido, type EstadoContenido } from "./datos";

export type Tono = "verde" | "dorado" | "guinda" | "gris" | "azul";

export const TONO_ESTADO: Record<EstadoContenido, Tono> = {
    borrador: "gris",
    "por-autorizar": "dorado",
    observaciones: "guinda",
    publicado: "verde",
    rechazado: "guinda",
    retirado: "gris",
};

// variante: verde | contorno | suave | guinda | contorno-guinda | vino
export function clasesBoton(variante: string, extra = "") {
    return `cn-boton cn-boton--${variante} ${extra}`.trim();
}

// Corta la lista en páginas y corrige la página si quedó fuera de rango
export function paginar<T>(lista: T[], pagina: number, porPagina: number) {
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const actual = Math.min(pagina, paginas - 1);
    return { paginas, actual, visibles: lista.slice(actual * porPagina, (actual + 1) * porPagina) };
}

// En las tablas de Revisión, el Editor que redactó (CA-12.1)
export function redactoCorto(c: Contenido) {
    return autorDe(c) === YO ? "Editor (tú)" : "Editor (ejemplo)";
}

// Dónde aparece en el portal cuando se publica
export function dondeSeVe(c: Contenido) {
    const v = c.valores;
    if (c.tipo === "noticia") return v.destacar ? "Noticias · Inicio" : "Noticias";
    if (c.tipo === "resena") return `Lecturas y reseñas · ${String(v.vista || "Por autor")}`;
    if (c.tipo === "acerca") return `Acerca de la biblioteca · ${String(v.seccion || "Sección por confirmar")}`;
    return `Memoria pública · ${String(v.periodoTema || "Tema por confirmar")}`;
}

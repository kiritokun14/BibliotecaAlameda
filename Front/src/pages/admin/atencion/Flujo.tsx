// Barra de etapas de un trámite de Atención (credenciales, propuestas, espacios) con el «siguiente paso».
// Las etapas antes de la actual quedan hechas; las opcionales que no ocurrieron se ven atenuadas.
// Si el trámite terminó mal (rechazada o cancelada), la última etapa se muestra en guinda.
import type { ReactNode } from "react";

export type Etapa = { id: string; texto: string; opcional?: boolean };

type FlujoProps = {
    etapas: Etapa[];
    actual: string; // id de la etapa actual (o del final negativo)
    final?: { id: string; texto: string }; // rechazada / cancelada
    ocurridas?: string[]; // estados que aparecen en el historial
    siguiente: { titulo: string; texto: ReactNode; tono?: "verde" | "dorado" | "gris" | "guinda"; icono?: IconoSiguiente };
};

export default function Flujo({ etapas, actual, final, ocurridas = [], siguiente }: FlujoProps) {
    // Con un final negativo, se marca hecho todo lo que ocurrió y el final ocupa el lugar siguiente
    const terminoMal = !!final && final.id === actual;
    const indiceActual = terminoMal
        ? Math.max(-1, ...etapas.map((e, i) => (ocurridas.includes(e.id) ? i : -1)))
        : etapas.findIndex((e) => e.id === actual);
    // Si llegó a la última etapa, el trámite está completo: todo se ve hecho
    const completo = !terminoMal && indiceActual === etapas.length - 1;
    const visibles = terminoMal ? [...etapas.slice(0, indiceActual + 1), { id: final.id, texto: final.texto }] : etapas;

    return (
        <section className="flujo" aria-label="Etapas del trámite">
            <ol className="flujo__etapas">
                {visibles.map((etapa, i) => {
                    const estado = terminoMal
                        ? (i === visibles.length - 1 ? "final" : "hecha")
                        : i < indiceActual ? (etapa.opcional && !ocurridas.includes(etapa.id) ? "omitida" : "hecha")
                        : i === indiceActual ? (completo ? "hecha" : "actual") : "pendiente";
                    return (
                        <li key={etapa.id} className={`flujo__etapa flujo__etapa--${estado}`} aria-current={estado === "actual" || estado === "final" ? "step" : undefined}>
                            <span className="flujo__punto" aria-hidden="true">
                                {estado === "hecha" ? "✓" : estado === "final" ? "✕" : i + 1}
                            </span>
                            <span className="flujo__texto">
                                {etapa.texto}
                                <small>{estado === "hecha" ? "Hecho" : estado === "actual" ? "Ahora" : estado === "final" ? "Cerrado" : estado === "omitida" ? "No fue necesario" : "Pendiente"}</small>
                            </span>
                        </li>
                    );
                })}
            </ol>
            <div className={`flujo__siguiente flujo__siguiente--${siguiente.tono ?? "verde"}`}>
                <span className="flujo__flecha" aria-hidden="true">{ICONOS[siguiente.icono ?? ICONO_POR_TONO[siguiente.tono ?? "verde"]]}</span>
                <div><strong>{siguiente.titulo}</strong><p>{siguiente.texto}</p></div>
            </div>
        </section>
    );
}

// Ícono del «siguiente paso»: si no se indica, sale del tono (dorado = hay que actuar, gris = esperar…)
export type IconoSiguiente = "accion" | "espera" | "listo" | "publicado" | "cerrado";
const ICONO_POR_TONO: Record<string, IconoSiguiente> = { dorado: "accion", gris: "espera", verde: "listo", guinda: "cerrado" };
const Trazo = ({ children }: { children: ReactNode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const ICONOS: Record<IconoSiguiente, ReactNode> = {
    accion: <Trazo><path d="M5 12h14M13 6l6 6-6 6" /></Trazo>,
    espera: <Trazo><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Trazo>,
    listo: <Trazo><path d="M20 6 9 17l-5-5" /></Trazo>,
    publicado: <Trazo><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="m9 15.5 2 2 4-4" /></Trazo>,
    cerrado: <Trazo><path d="M18 6 6 18M6 6l12 12" /></Trazo>,
};

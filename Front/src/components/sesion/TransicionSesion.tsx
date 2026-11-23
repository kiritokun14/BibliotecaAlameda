// Animación al iniciar y al cerrar sesión (22 nov 2026), igual en el portal y en el panel: un velo cubre la pantalla
// con el logo de la biblioteca y un aro dorado que gira mientras trabaja; al terminar, el aro se completa con una
// palomita y el mensaje cambia; después se desvanece sobre la página de destino. La controlan entrarConAnimacion() y
// salirConAnimacion() (transicion.ts).
import "./TransicionSesion.css";

export type FaseTransicion = "trabajando" | "listo" | "saliendo";
export type TipoTransicion = "entrada" | "salida";

const TEXTOS = {
    entrada: { trabajando: ["Iniciando tu sesión…", "Preparando tu espacio."], listo: ["Te damos la bienvenida", ""] },
    salida: { trabajando: ["Cerrando tu sesión…", "Un momento, por favor."], listo: ["Hasta pronto", "Tu sesión se cerró en este equipo."] },
};

export default function TransicionSesion({ tipo, tema, fase, detalle }: {
    tipo: TipoTransicion; tema: "portal" | "panel"; fase: FaseTransicion; detalle?: string; // detalle: lo que sigue («Te llevamos al panel…»)
}) {
    const listo = fase !== "trabajando";
    const [titulo, texto] = TEXTOS[tipo][listo ? "listo" : "trabajando"];
    return (
        <div className={`transicion transicion--${tema} transicion--${fase}`} role="status" aria-live="assertive">
            <span className="transicion__luz transicion__luz--1" aria-hidden="true" />
            <span className="transicion__luz transicion__luz--2" aria-hidden="true" />
            <div className="transicion__centro">
                <span className="transicion__logo" aria-hidden="true" />
                <span className={`transicion__sello${listo ? " transicion__sello--listo" : ""}`} aria-hidden="true">
                    <svg viewBox="0 0 52 52" className="transicion__aro"><circle cx="26" cy="26" r="23" /></svg>
                    <svg viewBox="0 0 24 24" className="transicion__palomita"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
                <p className="transicion__titulo" key={titulo}>{titulo}</p>
                <p className="transicion__texto" key={`${titulo}-texto`}>{(listo && detalle) || texto}</p>
                <span className="transicion__linea" aria-hidden="true" />
            </div>
        </div>
    );
}

// Atención › «Llevan más tiempo esperando» (22 nov 2026, Aldahir): una tarjeta por solicitud que se abre,
// con la inicial, el nombre o título, el folio y el tipo, y a la derecha cuántos días lleva esperando
// (guinda desde 7 días). La usan Solicitudes de espacios (Bandeja.tsx) y Propuestas de eventos (AtencionTramites.tsx).
import { Link } from "react-router";

export type Esperando = { clave: string; ruta: string; titulo: string; detalle: string; dias: number };

export function ListaEspera({ items }: { items: Esperando[] }) {
    return (
        <ul className="at-espera">
            {items.map((x) => (
                <li key={x.clave}>
                    <Link to={x.ruta} className="at-espera__item">
                        <span className="at-espera__inicial" aria-hidden="true">{x.titulo.trim().charAt(0).toUpperCase()}</span>
                        <span className="at-espera__textos">
                            <span className="at-espera__titulo" title={x.titulo}>{x.titulo}</span>
                            <span className="at-espera__detalle">{x.detalle}</span>
                        </span>
                        <span className={`at-espera__dias${x.dias >= 7 ? " at-espera__dias--larga" : ""}`}>
                            {x.dias === 0 ? <strong>Hoy</strong> : <><strong>{x.dias}</strong><small>{x.dias === 1 ? "día" : "días"}</small></>}
                            <span className="solo-lectores"> esperando</span>
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

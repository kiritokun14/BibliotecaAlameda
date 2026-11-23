// Insignias: medalla dibujada (escudo con listón, aro y el emblema de la insignia) y su galería.
// Se usan en Mi perfil › Mi progreso (portal) y en la ficha del participante (panel). Estilos en Insignias.css.
import type { ReactNode } from "react";
import type { Dibujo, EstadoInsignia } from "../../servicios/insignias";
import "./Insignias.css";

const EMBLEMAS: Record<Dibujo, ReactNode> = {
    semilla: <><path d="M32 44V30" /><path d="M32 32c-6 0-10-4-10-10 6 0 10 4 10 10Z" /><path d="M32 30c0-6 4-10 10-10 0 6-4 10-10 10Z" /></>,
    libro: <><path d="M20 24c4-2 8-2 12 1v18c-4-3-8-3-12-1Z" /><path d="M44 24c-4-2-8-2-12 1v18c4-3 8-3 12-1Z" /></>,
    brujula: <><circle cx="32" cy="33" r="11" /><path d="m36 29-2.5 6.5L27 38l2.5-6.5Z" /></>,
    estrella: <path d="m32 21 3.4 7 7.6 1.1-5.5 5.4 1.3 7.6L32 38.5l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1Z" />,
    pluma: <><path d="M40 21c-9 1-15 8-16 19l-2 3" /><path d="M40 21c1 9-5 16-14 17" /><path d="M29 33h6" /></>,
    manos: <><path d="M22 36c0-5 3-9 7-9 2 0 3 1 3 3v12" /><path d="M42 36c0-5-3-9-7-9-2 0-3 1-3 3" /><path d="M24 40c2 3 5 4 8 4s6-1 8-4" /></>,
    credencial: <><rect x="20" y="24" width="24" height="17" rx="3" /><circle cx="27" cy="31" r="3" /><path d="M33 30h7M33 35h5M23 38h6" /></>,
    corona: <><path d="m21 40 2-14 6 6 3-8 3 8 6-6 2 14Z" /><path d="M21 43h22" /></>,
};

export function Medalla({ insignia, tamano = 72 }: { insignia: EstadoInsignia; tamano?: number }) {
    const { color, obtenida, dibujo } = insignia;
    return (
        <svg className={`insignia-medalla insignia-medalla--${color}${obtenida ? "" : " insignia-medalla--bloqueada"}`} width={tamano} height={tamano * 1.15} viewBox="0 0 64 74" aria-hidden="true">
            <path className="insignia-medalla__liston" d="M20 50 14 72l9-4 5 6 4-22ZM44 50l6 22-9-4-5 6-4-22Z" />
            <path className="insignia-medalla__escudo" d="M32 3 55 14v20c0 14-10 23-23 28C19 57 9 48 9 34V14Z" />
            <path className="insignia-medalla__aro" d="M32 8 50 17v17c0 11-8 19-18 23-10-4-18-12-18-23V17Z" />
            <g className="insignia-medalla__emblema" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">{EMBLEMAS[dibujo]}</g>
        </svg>
    );
}

export function GaleriaInsignias({ insignias, compacta = false }: { insignias: EstadoInsignia[]; compacta?: boolean }) {
    const ganadas = insignias.filter((i) => i.obtenida).length;
    return (
        <div className={`insignias${compacta ? " insignias--compacta" : ""}`}>
            <p className="insignias__cuenta" role="status"><strong>{ganadas} de {insignias.length}</strong> insignias ganadas</p>
            <ul className="insignias__lista">
                {insignias.map((i, n) => (
                    <li key={i.id} className={`insignia${i.obtenida ? " insignia--ganada" : ""}`} style={{ animationDelay: `${Math.min(n * 50, 300)}ms` }}>
                        <Medalla insignia={i} tamano={compacta ? 52 : 64} />
                        <div className="insignia__textos">
                            <strong>{i.nombre}</strong>
                            <span>{i.obtenida ? i.descripcion : i.regla}</span>
                            {!i.obtenida && (
                                <span className="insignia__avance" role="progressbar" aria-valuemin={0} aria-valuemax={i.meta} aria-valuenow={i.valor} aria-label={`${i.nombre}: ${i.valor} de ${i.meta}`}>
                                    <span style={{ width: `${i.avance}%` }} /><small>{i.valor} de {i.meta}</small>
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

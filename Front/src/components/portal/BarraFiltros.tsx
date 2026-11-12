// Filtros del portal (Noticias, Eventos, Lecturas), en una sola fila compacta:
//   [ Buscar…                    ] [ Filtros · 2 ▾ ]
//   Novela ✕  Más antiguas ✕  Quitar todo        ← solo lo que la persona eligió
// - El buscador filtra mientras se escribe; la ✕ lo borra.
// - «Filtros» despliega un panel flotante con las opciones agrupadas (no empuja la página).
//   Cada opción se aplica al elegirla; el panel se cierra con «Listo», Esc o clic fuera.
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./BarraFiltros.css";

export type OpcionFiltro<T extends string> = { valor: T; texto: string; icono?: string };

// Fila de pastillas de una sola elección (filtros rápidos de Noticias, Eventos e Inicio)
export function ChipsFiltro<T extends string>({
    etiqueta,
    opciones,
    activa,
    alElegir,
    oscuro = false,
}: {
    etiqueta: string;
    opciones: OpcionFiltro<T>[];
    activa: T;
    alElegir: (valor: T) => void;
    oscuro?: boolean; // sobre fondo verde o guinda
}) {
    return (
        <div className={`chips-filtro${oscuro ? " chips-filtro--oscuro" : ""}`} role="group" aria-label={etiqueta}>
            {opciones.map((o) => {
                const elegida = o.valor === activa;
                return (
                    <button key={o.valor} type="button" aria-pressed={elegida} onClick={() => alElegir(o.valor)}
                        className={`chip-filtro${elegida ? " chip-filtro--activa" : ""}`}>
                        {o.icono && <img src={o.icono} alt="" />}
                        {o.texto}
                    </button>
                );
            })}
        </div>
    );
}

// Un grupo del panel. La primera opción es la de «sin filtro» (Todas, Más recientes…).
export type GrupoFiltro = { etiqueta: string; opciones: OpcionFiltro<string>[]; activa: string; alElegir: (valor: string) => void };

const fechaCorta = (f: string) => f.split("-").reverse().join("/");

export default function BarraFiltros({
    arriba,
    etiquetaBusqueda,
    marcador,
    texto,
    alBuscar,
    grupos = [],
    fecha,
    alLimpiar,
}: {
    arriba?: ReactNode; // por ejemplo, las secciones de Lecturas
    etiquetaBusqueda: string;
    marcador: string;
    texto: string;
    alBuscar: (texto: string) => void;
    grupos?: GrupoFiltro[];
    fecha?: { etiqueta: string; valor: string | null; alCambiar: (fecha: string | null) => void };
    alLimpiar: () => void;
}) {
    const id = useId();
    const [escrito, setEscrito] = useState(texto);
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);

    // Si el texto cambia por fuera (Quitar todo, botón Atrás), el cuadro lo sigue.
    // Se compara sin espacios a los lados para no comerse el espacio que se está escribiendo.
    const [textoPrevio, setTextoPrevio] = useState(texto);
    if (texto !== textoPrevio) {
        setTextoPrevio(texto);
        if (texto !== escrito.trim()) setEscrito(texto);
    }

    // Filtra mientras se escribe, con una pausa corta para no recalcular en cada tecla
    useEffect(() => {
        if (escrito.trim() === texto.trim()) return;
        const temporizador = window.setTimeout(() => alBuscar(escrito), 300);
        return () => window.clearTimeout(temporizador);
    }, [escrito, texto, alBuscar]);

    // El panel se cierra con Esc o con un clic fuera de la barra
    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
        const alPresionar = (e: PointerEvent) => {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("keydown", alTeclear);
        document.addEventListener("pointerdown", alPresionar);
        return () => { document.removeEventListener("keydown", alTeclear); document.removeEventListener("pointerdown", alPresionar); };
    }, [abierto]);

    // Lo elegido, para el contador del botón y las etiquetas de abajo
    const elegidos = [
        ...grupos.filter((g) => g.activa !== g.opciones[0]?.valor).map((g) => ({
            clave: g.etiqueta,
            texto: g.opciones.find((o) => o.valor === g.activa)?.texto ?? g.activa,
            quitar: () => g.alElegir(g.opciones[0].valor),
        })),
        ...(fecha?.valor ? [{ clave: "fecha", texto: fechaCorta(fecha.valor), quitar: () => fecha.alCambiar(null) }] : []),
    ];
    const hayAlgo = elegidos.length > 0 || Boolean(texto);
    const tienePanel = grupos.length > 0 || Boolean(fecha);

    return (
        <div className="barra-filtros" ref={contenedor}>
            {arriba}
            <div className="barra-filtros__fila">
                <form className="barra-filtros__buscar" role="search" onSubmit={(e) => { e.preventDefault(); alBuscar(escrito); }}>
                    <label htmlFor={`${id}-q`} className="solo-lectores">{etiquetaBusqueda}</label>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="barra-filtros__lupa">
                        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                    </svg>
                    <input id={`${id}-q`} type="search" value={escrito} maxLength={100} placeholder={marcador}
                        onChange={(e) => setEscrito(e.target.value)} />
                    {escrito && (
                        <button type="button" className="barra-filtros__borrar" aria-label="Borrar búsqueda"
                            onClick={() => { setEscrito(""); alBuscar(""); }}>
                            ✕
                        </button>
                    )}
                </form>

                {tienePanel && (
                    <button type="button" className={`barra-filtros__abrir${abierto ? " barra-filtros__abrir--abierto" : ""}`}
                        aria-expanded={abierto} aria-controls={`${id}-panel`} onClick={() => setAbierto((a) => !a)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                        Filtros
                        {elegidos.length > 0 && (
                            <span className="barra-filtros__cuenta">{elegidos.length}<span className="solo-lectores"> elegidos</span></span>
                        )}
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="barra-filtros__flecha"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                )}

                {abierto && (
                    <div className="barra-filtros__panel" id={`${id}-panel`} role="group" aria-label="Filtros">
                        {grupos.map((g) => (
                            <fieldset key={g.etiqueta} className="barra-filtros__grupo">
                                <legend>{g.etiqueta}</legend>
                                <div className="barra-filtros__opciones">
                                    {g.opciones.map((o) => (
                                        <label key={o.valor} className="barra-filtros__opcion">
                                            <input type="radio" name={`${id}-${g.etiqueta}`} checked={g.activa === o.valor}
                                                onChange={() => g.alElegir(o.valor)} />
                                            <span>{o.texto}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        {fecha && (
                            <div className="barra-filtros__grupo">
                                <label htmlFor={`${id}-fecha`} className="barra-filtros__titulo-grupo">{fecha.etiqueta}</label>
                                <div className="barra-filtros__fecha">
                                    <input id={`${id}-fecha`} type="date" value={fecha.valor ?? ""}
                                        onChange={(e) => fecha.alCambiar(e.target.value || null)} />
                                    {fecha.valor && (
                                        <button type="button" className="barra-filtros__enlace" onClick={() => fecha.alCambiar(null)}>Cualquier fecha</button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="barra-filtros__pie">
                            <button type="button" className="barra-filtros__enlace" onClick={alLimpiar} disabled={!hayAlgo}>Quitar todo</button>
                            <button type="button" className="barra-filtros__listo" onClick={() => setAbierto(false)}>Listo</button>
                        </div>
                    </div>
                )}
            </div>

            {elegidos.length > 0 && (
                <ul className="barra-filtros__elegidos" aria-label="Filtros elegidos">
                    {elegidos.map((e) => (
                        <li key={e.clave}>
                            <button type="button" onClick={e.quitar} aria-label={`Quitar ${e.texto}`}>
                                {e.texto}<span aria-hidden="true">✕</span>
                            </button>
                        </li>
                    ))}
                    <li><button type="button" className="barra-filtros__enlace" onClick={alLimpiar}>Quitar todo</button></li>
                </ul>
            )}
        </div>
    );
}

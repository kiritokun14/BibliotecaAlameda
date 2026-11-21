// Piezas de las listas de Actividades con el diseño común del panel (docs/guia-diseno.md):
// franja «Accesos rápidos» (.contenidos-resumen), lista con filtros en píldora y buscador (.contenidos-lista),
// filas en tarjeta (.contenidos-tabla) y paginación (.contenidos-paginas). Las usan Cambios, Asistencia y Evidencias.
import type { ReactNode } from "react";
import { IconoBuscar } from "../contenidos/piezas";
import { Bloque } from "../../../components/portal/Esqueleto";
import BarraFiltros, { ChipsFiltro, type GrupoFiltro, type OpcionFiltro } from "../../../components/portal/BarraFiltros";
import "../atencion/AtencionTramites.css";
import "./Calendario.css"; // .cal-controles: el mismo bloque de filtros de Calendario y Visitas
import "./Actividades.css";

// Filas por página en todas las listas de Actividades: el alto de la lista no cambia al filtrar
export const FILAS_POR_PAGINA = 5;

export type TonoAcceso = "azul" | "gris" | "guinda";

export type AccesoRapido = {
    clave: string;
    icono: ReactNode;
    cifra: ReactNode;
    titulo: string;
    texto: string;
    enlace?: string; // texto del botón de la tarjeta; sin él, la tarjeta solo informa
    tono: TonoAcceso;
    activo?: boolean;
    alPresionar?: () => void;
};

export function AccesosRapidos({ titulo = "Accesos rápidos", accesos }: { titulo?: string; accesos: AccesoRapido[] }) {
    return (
        <section className="contenidos-resumen" aria-label={titulo}>
            <h2>{titulo}</h2>
            <div className="contenidos-resumen__tarjetas">
                {accesos.map((a) => (
                    <article key={a.clave} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${a.tono}${a.activo ? " at-tarjeta--activa" : ""}`}>
                        <div className="contenidos-resumen__fila">
                            <span className="contenidos-resumen__icono">{a.icono}</span>
                            {a.enlace && a.alPresionar && (
                                <button type="button" className="contenidos-resumen__enlace" aria-pressed={a.activo} onClick={a.alPresionar}>{a.enlace}</button>
                            )}
                        </div>
                        <p className="contenidos-resumen__cifra">{a.cifra}</p>
                        <p className="contenidos-resumen__titulo">{a.titulo}</p>
                        <p className="contenidos-resumen__texto">{a.texto}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

type SeccionListaProps = {
    id: string;
    icono: ReactNode;
    titulo: string;
    texto?: string;
    extra?: ReactNode; // a la derecha de la cabecera (un botón, por ejemplo)
    herramientas?: ReactNode; // filtros y buscador
    children: ReactNode;
};

export function SeccionLista({ id, icono, titulo, texto, extra, herramientas, children }: SeccionListaProps) {
    return (
        <section className="contenidos-lista" aria-labelledby={id}>
            <div className="contenidos-lista__cabecera">
                <span className="contenidos-lista__icono">{icono}</span>
                <div className="at-cabecera__textos"><h2 id={id}>{titulo}</h2>{texto && <p>{texto}</p>}</div>
                {extra}
            </div>
            {herramientas && <div className="contenidos-lista__herramientas">{herramientas}</div>}
            {children}
        </section>
    );
}

export function FiltrosPildora<T extends string>({ etiqueta, valor, opciones, alCambiar }: {
    etiqueta: string; valor: T; opciones: { valor: T; texto: string }[]; alCambiar: (v: T) => void;
}) {
    return (
        <div className="contenidos-filtros" role="group" aria-label={etiqueta}>
            {opciones.map((o) => (
                <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => alCambiar(o.valor)}
                    className={`contenidos-filtro${valor === o.valor ? " contenidos-filtro--activo" : ""}`}>{o.texto}</button>
            ))}
        </div>
    );
}

export function BuscarLista({ texto, valor, alCambiar }: { texto: string; valor: string; alCambiar: (v: string) => void }) {
    return (
        <label className="contenidos-buscar"><IconoBuscar />
            <input type="search" placeholder={texto} aria-label={texto} value={valor} onChange={(e) => alCambiar(e.target.value)} />
        </label>
    );
}

// Bloque de filtros (como Calendario y Visitas): pastillas de lo principal arriba, buscador y panel «Filtros» con el resto
export function ControlesLista<T extends string>({ etiqueta, chips, busqueda, grupos = [], alLimpiar }: {
    etiqueta: string;
    chips?: { etiqueta: string; opciones: OpcionFiltro<T>[]; activa: T; alElegir: (v: T) => void };
    busqueda: { etiqueta: string; marcador: string; texto: string; alBuscar: (texto: string) => void };
    grupos?: GrupoFiltro[];
    alLimpiar: () => void;
}) {
    return (
        <section className="cal-controles" aria-label={etiqueta}>
            <BarraFiltros
                arriba={chips && <ChipsFiltro etiqueta={chips.etiqueta} opciones={chips.opciones} activa={chips.activa} alElegir={chips.alElegir} />}
                etiquetaBusqueda={busqueda.etiqueta}
                marcador={busqueda.marcador}
                texto={busqueda.texto}
                alBuscar={busqueda.alBuscar}
                grupos={grupos}
                alLimpiar={alLimpiar}
            />
        </section>
    );
}

// Cuerpo de la lista con el alto de 5 filas: si hay menos (o está vacía), no encoge
export function CuerpoLista({ children }: { children: ReactNode }) {
    return <div className="ac-cuerpo-lista">{children}</div>;
}

export type ColumnaLista<T> = { titulo: string; celda: (fila: T) => ReactNode; folio?: boolean };

// Tabla de filas en tarjeta. El ancho de las columnas lo da la clase (ver Actividades.css, «ac-tabla--…»).
export function TablaLista<T>({ clase, etiqueta, columnas, filas, clave }: {
    clase: string; etiqueta: string; columnas: ColumnaLista<T>[]; filas: T[]; clave: (fila: T) => string;
}) {
    return (
        <div className={`contenidos-tabla ac-tabla ${clase}`} role="table" aria-label={etiqueta} tabIndex={0}>
            <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                {columnas.map((c) => <span key={c.titulo} role="columnheader">{c.titulo}</span>)}
            </div>
            {filas.map((f) => (
                <div key={clave(f)} className="contenidos-tabla__fila" role="row">
                    {columnas.map((c) => <span key={c.titulo} role="cell" className={c.folio ? "contenidos-tabla__folio" : undefined}>{c.celda(f)}</span>)}
                </div>
            ))}
        </div>
    );
}

// Dos líneas en una celda: lo principal arriba y el detalle abajo
export const CeldaDoble = ({ arriba, abajo }: { arriba: ReactNode; abajo?: ReactNode }) => (
    <span className="at-celda at-celda-doble"><span>{arriba}</span>{abajo && <small>{abajo}</small>}</span>
);

export function PieLista({ texto, pagina, paginas, alCambiar }: { texto: string; pagina: number; paginas: number; alCambiar: (p: number) => void }) {
    return (
        <div className="contenidos-lista__pie">
            <p>{texto}</p>
            {paginas > 1 && (
                <div className="contenidos-paginas" role="group" aria-label="Páginas">
                    <button type="button" disabled={pagina === 0} onClick={() => alCambiar(pagina - 1)}>‹ Anterior</button>
                    {Array.from({ length: paginas }, (_, i) => (
                        <button key={i} type="button" className={i === pagina ? "contenidos-paginas__actual" : undefined} aria-current={i === pagina ? "page" : undefined} onClick={() => alCambiar(i)}>{i + 1}</button>
                    ))}
                    <button type="button" disabled={pagina >= paginas - 1} onClick={() => alCambiar(pagina + 1)}>Siguiente ›</button>
                </div>
            )}
        </div>
    );
}

// Esqueleto con la forma de las filas mientras llegan los datos
export function CargandoFilas({ texto, filas = 4 }: { texto: string; filas?: number }) {
    return (
        <div className="contenidos-tabla" aria-busy="true" role="status">
            <span className="tr-oculto">{texto}</span>
            {Array.from({ length: filas }, (_, i) => <Bloque key={i} clase="tr-esqueleto" />)}
        </div>
    );
}

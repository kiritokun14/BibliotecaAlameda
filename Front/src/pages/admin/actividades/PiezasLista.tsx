// Piezas de las listas de Actividades con el diseño común del panel (docs/guia-diseno.md):
// franja «Accesos rápidos» (.contenidos-resumen), lista con filtros en píldora y buscador (.contenidos-lista),
// filas en tarjeta (.contenidos-tabla) y paginación (.contenidos-paginas). Las usan Cambios, Asistencia y Evidencias.
import type { ReactNode } from "react";
import { Buscador, Paginas, Segmentado } from "../piezasPanel";
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

export function AccesosRapidos({ titulo = "En cifras", accesos }: { titulo?: string; accesos: AccesoRapido[] }) {
    return (
        <section className="pz-indicadores ac-cifras" aria-label={titulo}>
            {accesos.map((a) => {
                const contenido = (
                    <>
                        <span className="pz-cifra__icono" aria-hidden="true">{a.icono}</span>
                        <span className="pz-cifra__textos"><strong>{a.cifra}</strong><span>{a.titulo}</span><small>{a.texto}</small></span>
                    </>
                );
                const clase = `pz-cifra${a.tono === "guinda" ? " pz-cifra--vino" : ""}${a.activo ? " pz-cifra--activa" : ""}`;
                return a.alPresionar
                    ? <button key={a.clave} type="button" className={clase} aria-pressed={!!a.activo} onClick={a.alPresionar} title={a.enlace}>{contenido}</button>
                    : <div key={a.clave} className={`${clase} pz-cifra--fija`}>{contenido}</div>;
            })}
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
        <section className="pz-tarjeta ac-lista" aria-labelledby={id}>
            <div className="pz-tarjeta__cabecera">
                <span className="pz-tarjeta__icono" aria-hidden="true">{icono}</span>
                <div className="pz-tarjeta__titulos"><h3 id={id}>{titulo}</h3>{texto && <p className="pz-tarjeta__texto">{texto}</p>}</div>
                {extra && <div className="pz-tarjeta__accion">{extra}</div>}
            </div>
            {herramientas && <div className="pz-herramientas">{herramientas}</div>}
            {children}
        </section>
    );
}

export function FiltrosPildora<T extends string>({ etiqueta, valor, opciones, alCambiar }: {
    etiqueta: string; valor: T; opciones: { valor: T; texto: string }[]; alCambiar: (v: T) => void;
}) {
    // «Pendientes (2)» → la cantidad va en su círculo, como en el filtro segmentado de las piezas
    const partes = (texto: string) => { const m = /^(.*?)\s*\((\d+)\)$/.exec(texto); return m ? { texto: m[1], cantidad: Number(m[2]) } : { texto }; };
    return <Segmentado etiqueta={etiqueta} valor={valor} alCambiar={alCambiar} opciones={opciones.map((o) => ({ valor: o.valor, ...partes(o.texto) }))} />;
}

export function BuscarLista({ texto, valor, alCambiar }: { texto: string; valor: string; alCambiar: (v: string) => void }) {
    return <Buscador etiqueta={texto} placeholder={texto} valor={valor} alCambiar={alCambiar} />;
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
        <div className="pz-tarjeta__pie">
            <p aria-live="polite">{texto}</p>
            {paginas > 1 && <Paginas pagina={pagina + 1} paginas={paginas} alCambiar={(p) => alCambiar(p - 1)} />}
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

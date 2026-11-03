// Piezas de las pantallas de Contenidos (Editor y Revisión), según Figma 591:48349.
// Viven aquí mientras se unifican con las del resto del panel; usan solo clases "cn-".
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { NOMBRE_ESTADO, type EstadoContenido } from "./datos";
import { clasesBoton, TONO_ESTADO, type Tono } from "./utiles";
import iconoBuscar from "../../../assets/admin/contenidos/buscar.svg";
import decoracion1 from "../../../assets/admin/contenidos/decoracion-1.svg";
import decoracion2 from "../../../assets/admin/contenidos/decoracion-2.svg";

// ---------- Página y encabezados ----------

export function Pagina({ children }: { children: ReactNode }) {
    return <div className="cn-pagina">{children}</div>;
}

// Contenidos › Revisión y publicación › Por autorizar (el último no es enlace)
export function Migas({ pasos }: { pasos: [string, string?][] }) {
    return (
        <nav className="cn-migas" aria-label="Ruta">
            <ol>
                {pasos.map(([texto, ruta], i) => (
                    <li key={texto}>
                        {ruta && i < pasos.length - 1 ? <Link to={ruta}>{texto}</Link> : <span aria-current={i === pasos.length - 1 ? "page" : undefined}>{texto}</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export function Etiqueta({ children }: { children: ReactNode }) {
    return (
        <p className="cn-etiqueta">
            <span className="cn-etiqueta__punto" aria-hidden="true" />
            {children}
        </p>
    );
}

// Encabezado suelto (bandejas y resultados). "grande" = pantallas de resultado (44 px).
export function Encabezado({ etiqueta, titulo, texto, accion, grande }: { etiqueta: string; titulo: string; texto: string; accion?: ReactNode; grande?: boolean }) {
    return (
        <header className="cn-encabezado">
            <div className="cn-encabezado__textos">
                <Etiqueta>{etiqueta}</Etiqueta>
                <h1 className={grande ? "cn-titulo cn-titulo--grande" : "cn-titulo"}>{titulo}</h1>
                <p className={grande ? "cn-entrada cn-entrada--grande" : "cn-entrada"}>{texto}</p>
            </div>
            {accion}
        </header>
    );
}

// Encabezado en tarjeta blanca con acento dorado y botón de volver (formularios y detalle)
export function EncabezadoTarjeta({ volver, etiqueta, titulo, texto }: { volver: { texto: string; ruta: string }; etiqueta: string; titulo: string; texto: string }) {
    return (
        <header className="cn-encabezado-tarjeta">
            <Link to={volver.ruta} className="cn-volver">
                <span className="cn-volver__circulo" aria-hidden="true">←</span>
                {volver.texto}
            </Link>
            <Etiqueta>{etiqueta}</Etiqueta>
            <h1 className="cn-titulo">{titulo}</h1>
            <p className="cn-entrada">{texto}</p>
        </header>
    );
}

export function PieDatos() {
    return <p className="cn-pie">Biblioteca Solón Argüello · Panel del personal · Datos de ejemplo</p>;
}

// ---------- Tarjetas ----------

type TarjetaProps = {
    icono: string;
    titulo: string;
    subtitulo?: string;
    tono?: "blanca" | "crema" | "alerta";
    lateral?: boolean; // las de la columna derecha tienen más relleno
    id?: string;
    children?: ReactNode;
};

export function Tarjeta({ icono, titulo, subtitulo, tono = "blanca", lateral, id, children }: TarjetaProps) {
    const idTitulo = id ?? `cn-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    return (
        <section className={`cn-tarjeta cn-tarjeta--${tono} ${lateral ? "cn-tarjeta--lateral" : ""}`} aria-labelledby={idTitulo}>
            <div className="cn-tarjeta__cabecera">
                <span className="cn-mosaico" aria-hidden="true"><img src={icono} alt="" /></span>
                <div>
                    <h2 id={idTitulo}>{titulo}</h2>
                    {subtitulo && <p>{subtitulo}</p>}
                </div>
            </div>
            {children}
        </section>
    );
}

export function Columnas({ principal, lateral }: { principal: ReactNode; lateral: ReactNode }) {
    return (
        <div className="cn-columnas">
            <div className="cn-columnas__principal">{principal}</div>
            <div className="cn-columnas__lateral">{lateral}</div>
        </div>
    );
}

// ---------- Chips y botones ----------

// ancho: true = 190 px (tablas de Contenidos) o un número en px
export function Chip({ tono, children, ancho }: { tono: Tono; children: ReactNode; ancho?: boolean | number }) {
    return (
        <span className={`cn-chip cn-chip--${tono} ${ancho === true ? "cn-chip--ancho" : ""}`} style={typeof ancho === "number" ? { width: ancho, boxSizing: "border-box" } : undefined}>
            <span className="cn-chip__punto" aria-hidden="true" />
            {children}
        </span>
    );
}

export function ChipEstado({ estado, ancho }: { estado: EstadoContenido; ancho?: boolean }) {
    return <Chip tono={TONO_ESTADO[estado]} ancho={ancho}>{NOMBRE_ESTADO[estado]}</Chip>;
}

// ---------- Resumen (bloque guinda con tres accesos) ----------

export type AccesoResumen = {
    icono: string;
    numero: number | string;
    titulo: string;
    texto: string;
    enlace: string;
    tono: "verde" | "dorado" | "guinda";
    activo?: boolean;
    alPresionar: () => void;
};

export function BloqueResumen({ insignia, titulo, resalte, subtitulo, accesos }: { insignia: string; titulo: string; resalte: string; subtitulo: string; accesos: AccesoResumen[] }) {
    return (
        <section className="cn-resumen" aria-labelledby="cn-resumen-titulo">
            <img className="cn-resumen__decoracion cn-resumen__decoracion--1" src={decoracion1} alt="" />
            <img className="cn-resumen__decoracion cn-resumen__decoracion--2" src={decoracion2} alt="" />
            <div className="cn-resumen__titular">
                <span className="cn-insignia"><span className="cn-chip__punto" aria-hidden="true" />{insignia}</span>
                <h2 id="cn-resumen-titulo">{titulo} <span>{resalte}</span></h2>
                <p>{subtitulo}</p>
            </div>
            <div className="cn-resumen__accesos">
                {accesos.map((a) => (
                    <button
                        key={a.titulo}
                        type="button"
                        className={`cn-acceso cn-acceso--${a.tono}`}
                        aria-pressed={a.activo}
                        onClick={a.alPresionar}
                    >
                        <span className="cn-acceso__fila">
                            <span className="cn-acceso__icono" aria-hidden="true"><img src={a.icono} alt="" /></span>
                            <span className="cn-acceso__enlace">{a.enlace} →</span>
                        </span>
                        <span className="cn-acceso__numero">{a.numero}</span>
                        <span className="cn-acceso__titulo">{a.titulo}</span>
                        <span className="cn-acceso__texto">{a.texto}</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

// ---------- Filtros, buscador, tabla y paginación ----------

export function Filtros<T extends string>({ opciones, valor, alCambiar, etiqueta = "Filtrar por estado" }: { opciones: { valor: T; texto: string }[]; valor: T; alCambiar: (v: T) => void; etiqueta?: string }) {
    return (
        <div className="cn-filtros" role="group" aria-label={etiqueta}>
            {opciones.map((o) => (
                <button
                    key={o.valor}
                    type="button"
                    className={`cn-filtro ${valor === o.valor ? "cn-filtro--activo" : ""}`}
                    aria-pressed={valor === o.valor}
                    onClick={() => alCambiar(o.valor)}
                >
                    {o.texto}
                </button>
            ))}
        </div>
    );
}

export function Buscador({ valor, alCambiar, texto = "Buscar por folio o título" }: { valor: string; alCambiar: (v: string) => void; texto?: string }) {
    return (
        <label className="cn-buscador">
            <img src={iconoBuscar} alt="" />
            <input type="search" placeholder={texto} aria-label={texto} value={valor} onChange={(e) => alCambiar(e.target.value)} />
        </label>
    );
}

export type Columna<T> = { titulo: string; ancho?: number; celda: (fila: T) => ReactNode; fuerte?: boolean; folio?: boolean };

export function Tabla<T>({ columnas, filas, clave }: { columnas: Columna<T>[]; filas: T[]; clave: (fila: T) => string }) {
    const estilo = (c: Columna<T>) => (c.ancho ? { width: c.ancho, flex: "none" } : { flex: 1, minWidth: 0 });
    return (
        <div className="cn-tabla" role="table">
            <div className="cn-tabla__encabezado" role="row">
                {columnas.map((c) => <span key={c.titulo} role="columnheader" style={estilo(c)}>{c.titulo}</span>)}
            </div>
            {filas.map((fila) => (
                <div key={clave(fila)} className="cn-tabla__fila" role="row">
                    {columnas.map((c) => (
                        <span key={c.titulo} role="cell" style={estilo(c)} className={c.folio ? "cn-tabla__folio" : c.fuerte ? "cn-tabla__fuerte" : undefined}>
                            {c.celda(fila)}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function Paginacion({ pagina, paginas, alCambiar }: { pagina: number; paginas: number; alCambiar: (p: number) => void }) {
    if (paginas <= 1) return null;
    return (
        <div className="cn-paginacion" role="group" aria-label="Páginas">
            <button type="button" className="cn-paginacion__paso" disabled={pagina === 0} onClick={() => alCambiar(pagina - 1)}>‹ Anterior</button>
            {Array.from({ length: paginas }, (_, i) => (
                <button
                    key={i}
                    type="button"
                    className={`cn-paginacion__numero ${i === pagina ? "cn-paginacion__numero--activo" : ""}`}
                    aria-current={i === pagina ? "page" : undefined}
                    onClick={() => alCambiar(i)}
                >
                    {i + 1}
                </button>
            ))}
            <button type="button" className="cn-paginacion__paso" disabled={pagina >= paginas - 1} onClick={() => alCambiar(pagina + 1)}>Siguiente ›</button>
        </div>
    );
}

export function EstadoVacio({ icono, titulo, texto, accion }: { icono: string; titulo: string; texto: string; accion?: { texto: string; alPresionar: () => void } }) {
    return (
        <div className="cn-vacio" role="status">
            <span className="cn-vacio__icono" aria-hidden="true"><img src={icono} alt="" /></span>
            <p className="cn-vacio__titulo">{titulo}</p>
            <p className="cn-vacio__texto">{texto}</p>
            {accion && <button type="button" className={clasesBoton("contorno")} onClick={accion.alPresionar}>{accion.texto}</button>}
        </div>
    );
}

// ---------- Resultados y pasos ----------

export function Resultado({ tono, icono, titulo, linea, chip }: { tono: "verde" | "dorado" | "guinda"; icono: string; titulo: string; linea: string; chip: ReactNode }) {
    return (
        <section className={`cn-resultado cn-resultado--${tono}`} role="status">
            <span className="cn-resultado__icono" aria-hidden="true"><img src={icono} alt="" /></span>
            <div className="cn-resultado__textos">
                <h2>{titulo}</h2>
                <p>{linea}</p>
            </div>
            {chip}
        </section>
    );
}

export function Pasos({ pasos }: { pasos: [string, string][] }) {
    return (
        <ol className="cn-pasos">
            {pasos.map(([titulo, texto], i) => (
                <li key={titulo}>
                    <span className="cn-pasos__numero" aria-hidden="true">{i + 1}</span>
                    <span>
                        <strong>{titulo}</strong>
                        <small>{texto}</small>
                    </span>
                </li>
            ))}
        </ol>
    );
}

// Filas "dato · valor" (registro de publicación, resumen de las ventanas, datos del libro)
export function Datos({ filas, variante = "registro" }: { filas: [string, ReactNode][]; variante?: "registro" | "caja" | "compacto" }) {
    return (
        <dl className={`cn-datos cn-datos--${variante}`}>
            {filas.map(([dato, valor]) => (
                <div key={dato}>
                    <dt>{dato}</dt>
                    <dd>{valor}</dd>
                </div>
            ))}
        </dl>
    );
}

// ---------- Ventana modal ----------

export function Ventana({ titulo, texto, alCerrar, children, pie }: { titulo: string; texto: string; alCerrar: () => void; children?: ReactNode; pie: ReactNode }) {
    const caja = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const anterior = document.activeElement as HTMLElement | null;
        caja.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
        function alTeclear(e: KeyboardEvent) {
            if (e.key === "Escape") alCerrar();
        }
        window.addEventListener("keydown", alTeclear);
        return () => {
            window.removeEventListener("keydown", alTeclear);
            anterior?.focus();
        };
    }, [alCerrar]);

    return (
        <div className="cn-fondo" onClick={alCerrar}>
            <div ref={caja} className="cn-ventana" role="dialog" aria-modal="true" aria-labelledby="cn-ventana-titulo" onClick={(e) => e.stopPropagation()}>
                <h2 id="cn-ventana-titulo">{titulo}</h2>
                <p className="cn-ventana__texto">{texto}</p>
                {children}
                <div className="cn-ventana__pie">{pie}</div>
            </div>
        </div>
    );
}

// ---------- Campos sencillos (formularios de Revisión) ----------

export function CampoTexto({ id, etiqueta, obligatorio, ayuda, error, children }: { id: string; etiqueta: string; obligatorio?: boolean; ayuda?: string; error?: string; children: ReactNode }) {
    return (
        <div className="cn-campo">
            <label htmlFor={id} className="cn-campo__etiqueta">
                {etiqueta}
                {obligatorio && <span className="cn-campo__obligatorio" aria-label="obligatorio">*</span>}
            </label>
            {children}
            {error ? <p id={`${id}-error`} className="cn-campo__error" role="alert">{error}</p> : ayuda && <p id={`${id}-ayuda`} className="cn-campo__ayuda">{ayuda}</p>}
        </div>
    );
}

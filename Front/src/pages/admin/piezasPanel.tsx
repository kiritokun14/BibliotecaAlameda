import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ContextoPanel } from "../../servicios/accesoPanel";
import { vistaEnlace, type TonoEstado } from "./resumen/datos";
import { Icono, type NombreIcono } from "./resumen/iconos";

// Piezas del panel (21 nov 2026): las del Resumen, compartidas por todos los módulos (estilos en PanelPiezas.css).
// Ver AGENTS.md, «Diseño del panel de administración» → «Normalización del panel».

export type { TonoEstado } from "./resumen/datos";
export { Icono, type NombreIcono } from "./resumen/iconos";

// Cifra que es botón: ícono, número y qué cuenta; filtra o lleva a lo que cuenta
export function Cifra({ icono, valor, texto, tono, activa, alPresionar }: {
    icono: NombreIcono; valor: ReactNode; texto: string; tono?: "vino"; activa?: boolean; alPresionar?: () => void;
}) {
    const contenido = (
        <>
            <span className="pz-cifra__icono" aria-hidden="true"><Icono nombre={icono} /></span>
            <span className="pz-cifra__textos"><strong>{valor}</strong><span>{texto}</span></span>
        </>
    );
    const clase = `pz-cifra${tono ? ` pz-cifra--${tono}` : ""}${activa ? " pz-cifra--activa" : ""}`;
    if (!alPresionar) return <div className={`${clase} pz-cifra--fija`}>{contenido}</div>;
    return <button type="button" className={clase} aria-pressed={activa} onClick={alPresionar}>{contenido}</button>;
}

// Encabezado de una pantalla de módulo: título, texto y, a la derecha, sus cifras (o una acción)
export function Encabezado({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
    return (
        <header className="pz-saludo pz-saludo--modulo">
            <div className="pz-saludo__textos">
                <h2>{titulo}</h2>
                <p>{texto}</p>
            </div>
            {children && <div className="pz-saludo__cifras" role="group" aria-label={`${titulo} en cifras`}>{children}</div>}
        </header>
    );
}

// Tarjeta con franja de color arriba y cabecera (ícono en círculo, título y ayuda); `accion` a la derecha
export function Tarjeta({ icono, titulo, texto, id, accion, className = "", children, como: Como = "section" }: {
    icono: NombreIcono; titulo: string; texto?: string; id: string; accion?: ReactNode; className?: string; children: ReactNode; como?: "section" | "article";
}) {
    return (
        <Como className={`pz-tarjeta ${className}`.trim()} aria-labelledby={id}>
            <Cabecera icono={icono} id={id} titulo={titulo} texto={texto} accion={accion} />
            {children}
        </Como>
    );
}

export function Cabecera({ icono, id, titulo, texto, accion }: { icono: NombreIcono; id: string; titulo: string; texto?: string; accion?: ReactNode }) {
    return (
        <div className="pz-tarjeta__cabecera">
            <span className="pz-tarjeta__icono"><Icono nombre={icono} /></span>
            <div className="pz-tarjeta__titulos">
                <h3 id={id}>{titulo}</h3>
                {texto && <p className="pz-tarjeta__texto">{texto}</p>}
            </div>
            {accion && <div className="pz-tarjeta__accion">{accion}</div>}
        </div>
    );
}

export function Chip({ tono, children }: { tono: TonoEstado; children: ReactNode }) {
    return (
        <span className={`pz-chip pz-chip--${tono}`}>
            <span className="pz-chip__punto" aria-hidden="true" />
            {children}
        </span>
    );
}

// Filtro segmentado: opciones con su número; la elegida en el color principal
export function Segmentado<T extends string>({ etiqueta, opciones, valor, alCambiar }: {
    etiqueta: string; opciones: { valor: T; texto: string; cantidad?: number; urgente?: boolean }[]; valor: T; alCambiar: (v: T) => void;
}) {
    return (
        <div className="pz-segmentado" role="group" aria-label={etiqueta}>
            {opciones.map((o) => (
                <button key={o.valor} type="button" aria-pressed={valor === o.valor} onClick={() => alCambiar(o.valor)}
                    className={`pz-opcion${valor === o.valor ? " pz-opcion--activa" : ""}${o.urgente && o.cantidad ? " pz-opcion--urgente" : ""}`}>
                    {o.texto}
                    {o.cantidad !== undefined && <span className="pz-opcion__cantidad">{o.cantidad}</span>}
                </button>
            ))}
        </div>
    );
}

// Vacío con insignia: «Estás al día», «Sin resultados»…; `accion` debajo
export function Vacio({ icono = "check", titulo, texto, accion }: { icono?: NombreIcono; titulo: string; texto: string; accion?: ReactNode }) {
    return (
        <div className="pz-vacio" role="status">
            <span className="pz-vacio__insignia" aria-hidden="true"><Icono nombre={icono} /></span>
            <p className="pz-vacio__titulo">{titulo}</p>
            <p>{texto}</p>
            {accion}
        </div>
    );
}

// Enlace a otra pantalla del panel: si la cuenta no tiene permiso no se muestra; si la pantalla aún no existe, el mismo
// aspecto sin poder presionarse.
export function Enlace({ ruta, className, children }: { ruta: string; className: string; children: ReactNode }) {
    const identidad = useContext(ContextoPanel);
    const vista = vistaEnlace(ruta, identidad?.acceso);
    if (vista === "enlace") return <Link to={ruta} className={className}>{children}</Link>;
    if (vista === "oculto") return null;
    return <span className={`${className} pz-sin-enlace`} title="Sección en desarrollo">{children}</span>;
}

// Paginación solo con texto: «Anterior», «1 de 3», «Siguiente»
export function Paginas({ pagina, paginas, alCambiar, bloqueada }: { pagina: number; paginas: number; alCambiar: (p: number) => void; bloqueada?: boolean }) {
    if (paginas <= 1) return null;
    return (
        <div className="pz-paginas" role="group" aria-label="Páginas">
            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={bloqueada || pagina <= 1} onClick={() => alCambiar(pagina - 1)}>Anterior</button>
            <span className="pz-paginas__actual" aria-current="page">{pagina} de {paginas}</span>
            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={bloqueada || pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>Siguiente</button>
        </div>
    );
}

// Datos de solo lectura en fichas (etiqueta arriba, valor en negrita)
export function Datos({ children }: { children: ReactNode }) {
    return <dl className="pz-datos">{children}</dl>;
}
export function Dato({ etiqueta, ancho, icono, children }: { etiqueta: string; ancho?: boolean; icono?: NombreIcono; children: ReactNode }) {
    return (
        <div className={`pz-dato${ancho ? " pz-dato--ancho" : ""}`}>
            <dt>{icono && <span className="pz-dato__icono" aria-hidden="true"><Icono nombre={icono} /></span>}{etiqueta}</dt>
            <dd>{children}</dd>
        </div>
    );
}

// Texto largo de solo lectura (detalle de un movimiento, contenido de una fuente)
export function Nota({ titulo, children }: { titulo: string; children: ReactNode }) {
    return <div className="pz-nota"><p className="pz-nota__titulo">{titulo}</p><div className="pz-nota__texto">{children}</div></div>;
}

// Aviso en línea de lo que pasó (guardado, exportado, error); entra bajando
export function Aviso({ tono = "exito", titulo, texto, children }: { tono?: "exito" | "error" | "espera"; titulo: string; texto?: string; children?: ReactNode }) {
    return (
        <div className={`pz-aviso pz-aviso--${tono}`} role={tono === "error" ? "alert" : "status"}>
            <p><strong>{titulo}</strong>{texto && <> {texto}</>}</p>
            {children}
        </div>
    );
}

// Tarjeta que se abre y se cierra (reglas, ayudas que casi todos ya conocen)
export function Plegable({ icono = "info", titulo, children }: { icono?: NombreIcono; titulo: string; children: ReactNode }) {
    return (
        <details className="pz-tarjeta pz-reglas">
            <summary>
                <span className="pz-tarjeta__icono"><Icono nombre={icono} /></span>
                <span className="pz-reglas__titulo">{titulo}</span>
                <span className="pz-reglas__mas" aria-hidden="true" />
            </summary>
            {children}
        </details>
    );
}

// Buscador de una lista: lupa, campo de 44 px y, a la derecha, lo que se le pase (p. ej. los filtros avanzados)
export function Buscador({ etiqueta, valor, alCambiar, placeholder, children }: {
    etiqueta: string; valor: string; alCambiar: (v: string) => void; placeholder: string; children?: ReactNode;
}) {
    return (
        <div className="pz-buscador">
            <label className="pz-buscador__campo">
                <span className="solo-lectores">{etiqueta}</span>
                <span className="pz-buscador__lupa" aria-hidden="true"><Icono nombre="buscarCuenta" /></span>
                <input type="search" value={valor} placeholder={placeholder} maxLength={100} onChange={(e) => alCambiar(e.target.value)} />
            </label>
            {children}
        </div>
    );
}

// Filtros avanzados: botón «Filtros» (con cuántos hay puestos) que abre un panel con grupos de opciones en pastillas,
// lo que se pase en `extra` (fechas) y «Quitar todo» · «Listo». Esc o un clic fuera lo cierran.
export type GrupoFiltro = { titulo: string; valor: string; alCambiar: (v: string) => void; opciones: { valor: string; texto: string; cantidad?: number }[] };
export function FiltrosAvanzados({ grupos, extra, activos, alQuitar }: { grupos: GrupoFiltro[]; extra?: ReactNode; activos: number; alQuitar: () => void }) {
    const [abierto, setAbierto] = useState(false);
    const caja = useRef<HTMLDivElement>(null);
    const boton = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    // El panel mide el espacio entre el botón y el pie del panel (entre 220 y 420 px) y se desplaza por dentro
    useLayoutEffect(() => {
        if (!abierto || !panel.current || !boton.current) return;
        const limite = document.querySelector(".panel-pie-admin")?.getBoundingClientRect().top ?? window.innerHeight;
        const disponible = limite - boton.current.getBoundingClientRect().bottom - 24;
        panel.current.style.maxHeight = `${Math.max(220, Math.min(420, disponible))}px`;
    }, [abierto]);
    useEffect(() => {
        if (!abierto) return;
        const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); } };
        const clic = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
        document.addEventListener("keydown", tecla);
        document.addEventListener("mousedown", clic);
        return () => { document.removeEventListener("keydown", tecla); document.removeEventListener("mousedown", clic); };
    }, [abierto]);
    return (
        <div className="pz-filtros-av" ref={caja}>
            <button ref={boton} type="button" className={`pz-filtros-av__boton${activos ? " pz-filtros-av__boton--activo" : ""}`} aria-expanded={abierto} onClick={() => setAbierto((x) => !x)}>
                <span className="pz-filtros-av__icono" aria-hidden="true" />
                Filtros
                {activos > 0 && <span className="pz-opcion__cantidad">{activos}</span>}
            </button>
            {abierto && (
                <div ref={panel} className="pz-filtros-av__panel" role="group" aria-label="Filtros avanzados">
                    <p className="pz-filtros-av__titulo">Filtrar resultados</p>
                    {grupos.map((g) => (
                        <fieldset key={g.titulo} className="pz-filtros-av__grupo">
                            <legend>{g.titulo}</legend>
                            <div className="pz-filtros-av__opciones">
                                {g.opciones.map((o) => (
                                    <button key={o.valor} type="button" aria-pressed={g.valor === o.valor} onClick={() => g.alCambiar(o.valor)}
                                        className={`pz-pastilla${g.valor === o.valor ? " pz-pastilla--activa" : ""}`}>
                                        {o.texto}{o.cantidad !== undefined && <span className="pz-pastilla__cantidad">{o.cantidad}</span>}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    {extra}
                    <div className="pz-filtros-av__pie">
                        <button type="button" className="pz-filtros-av__quitar" disabled={!activos} onClick={alQuitar}>Quitar todo</button>
                        <button type="button" className="pz-boton pz-boton--chico" onClick={() => { setAbierto(false); boton.current?.focus(); }}>Listo</button>
                    </div>
                </div>
            )}
        </div>
    );
}

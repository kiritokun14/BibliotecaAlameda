// Listas del perfil con las piezas del panel (normalización del 22 nov 2026, Aldahir): mismo diseño y mismos tamaños que
// las listas de admin. Tarjeta con cabecera → buscador con «Filtros» → filas (`pz-fila`). El área de la lista mide
// siempre lo de 4 filas (aunque haya menos, esté vacía o cargando); con más, se recorren con scroll, como en admin.
// Los colores son los del portal (verde y dorado): las variables `--pz-*` se ponen en `.perfil-listas` (ListasPerfil.css).
import { Children, useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { Buscador, Chip, FiltrosAvanzados, Icono, Tarjeta, Vacio, type GrupoFiltro, type NombreIcono, type TonoEstado } from "../../admin/piezasPanel";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import "../../admin/PanelPiezas.css";
import "./ListasPerfil.css";

export const FILAS_VISIBLES = 4;

type Props = {
    icono: NombreIcono; titulo: string; texto: string;
    buscar: { etiqueta: string; placeholder: string; valor: string; alCambiar: (v: string) => void };
    filtros: GrupoFiltro[]; activos: number; alQuitar: () => void;
    estado: "cargando" | "error" | "listo"; error?: string; alReintentar?: () => void;
    // Sin elementos, o sin resultados con la búsqueda y los filtros
    hayElementos: boolean; sinResultados: boolean;
    vacio: { titulo: string; texto: string; accion?: ReactNode };
    accion?: ReactNode; // botones a la derecha de la cabecera (p. ej. «Marcar todas como leídas»)
    llenar?: boolean; // la tarjeta llena el alto de su columna (p. ej. igual que el lateral en Notificaciones)
    conFecha?: boolean; // filas con bloque de fecha (más altas): para el alto inicial, antes de medir
    pie?: ReactNode; // algo en el pie (p. ej. las páginas del servidor en Mis eventos)
    despues?: ReactNode; // algo debajo de la lista, dentro de la tarjeta (p. ej. «¿Falta un mensaje?»)
    children: ReactNode; // las filas (<FilaPerfil />)
};

export function ListaPerfil(p: Props) {
    const id = useId();
    const quitar = () => { p.buscar.alCambiar(""); p.alQuitar(); };
    const total = Children.toArray(p.children).length;
    const area = useRef<HTMLDivElement>(null);
    // Alto de una fila cerrada, medido de las que hay a la vista (sin contar lo que se abre dentro de una). Se guarda para
    // que el área no cambie de alto al filtrar o al quedar vacía; sin filas, vale el de la hoja (`--pl-alto-fila`).
    const altoFila = useRef(0);
    useLayoutEffect(() => {
        const caja = area.current;
        if (!caja) return;
        const filas = [...caja.querySelectorAll<HTMLElement>(".pl-filas > li")].filter((li) => !li.querySelector(".pl-fila--abierta"));
        if (filas.length) altoFila.current = Math.max(...filas.map((li) => li.offsetHeight));
        if (altoFila.current) caja.style.setProperty("--pl-alto-fila", `${altoFila.current}px`);
    }, [total, p.estado]);
    return (
        <div className={`perfil-listas${p.llenar ? " perfil-listas--llenar" : ""}`}>
            <Tarjeta icono={p.icono} id={`${id}-lista`} titulo={p.titulo} texto={p.texto} className="pz-pendientes" accion={p.accion}>
                <Buscador etiqueta={p.buscar.etiqueta} placeholder={p.buscar.placeholder} valor={p.buscar.valor} alCambiar={p.buscar.alCambiar}>
                    <FiltrosAvanzados grupos={p.filtros} activos={p.activos} alQuitar={p.alQuitar} />
                </Buscador>
                <div ref={area} className={`pl-area${p.conFecha ? " pl-area--fecha" : ""}`}>
                {p.estado === "cargando" ? <EsqueletoLista filas={3} texto="Cargando…" />
                    : p.estado === "error" ? (
                        <Vacio icono="alerta" titulo="No pudimos cargar la lista" texto={p.error ?? "Inténtalo de nuevo en un momento."}
                            accion={p.alReintentar && <button type="button" className="pz-boton pz-boton--chico" onClick={p.alReintentar}>Reintentar</button>} />
                    ) : !p.hayElementos ? <Vacio icono="lista" titulo={p.vacio.titulo} texto={p.vacio.texto} accion={p.vacio.accion} />
                    : p.sinResultados ? (
                        <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="Prueba con otra búsqueda u otro filtro."
                            accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitar}>Quitar la búsqueda y los filtros</button>} />
                    ) : <FilasConScroll etiqueta={p.titulo} total={total}>{p.children}</FilasConScroll>}
                </div>
                {p.despues}
                {p.pie && <div className="pz-tarjeta__pie"><div className="perfil-listas__pie-extra">{p.pie}</div></div>}
            </Tarjeta>
        </div>
    );
}

// Las filas: con más de 4, la lista se recorre con scroll dentro del área (y con el teclado)
function FilasConScroll({ etiqueta, total, children }: { etiqueta: string; total: number; children: ReactNode }) {
    const conScroll = total > FILAS_VISIBLES;
    return (
        <ul className={`pz-filas pl-filas${conScroll ? " pl-filas--scroll" : ""}`}
            tabIndex={conScroll ? 0 : undefined} aria-label={conScroll ? `${etiqueta}: ${total}, desplázate para ver todas` : undefined}>
            {children}
        </ul>
    );
}

// Una fila: bloque de fecha (o ícono) | título y detalle | estado | acciones; `panel` se abre debajo, dentro de la fila
export function FilaPerfil({ fecha, icono = "lista", tono, titulo, detalle, estado, acciones, panel, apagada }: {
    fecha?: { dia: string; mes: string } | null; icono?: NombreIcono; tono: TonoEstado; titulo: string; detalle: ReactNode;
    estado: string; acciones?: ReactNode; panel?: ReactNode; apagada?: boolean;
}) {
    return (
        <li>
            <article className={`pz-fila pl-fila${panel ? " pl-fila--abierta" : ""}${apagada ? " pl-fila--apagada" : ""}`}>
                {fecha
                    ? <span className={`pz-fecha pl-fecha--${tono}`} aria-hidden="true"><strong>{fecha.dia}</strong><span>{fecha.mes}</span></span>
                    : <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={icono} /></span>}
                <div className="pz-fila__textos">
                    <h4 className="pz-fila__titulo" title={titulo}>{titulo}</h4>
                    <p className="pz-fila__detalle">{detalle}</p>
                </div>
                <Chip tono={tono}>{estado}</Chip>
                <div className="pz-fila__acciones">{acciones}</div>
                {panel && <div className="pl-panel">{panel}</div>}
            </article>
        </li>
    );
}

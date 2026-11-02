import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { MESES, fechaLarga, nombreCategoria, paginasVisibles, type Categoria, type Noticia } from "./datos";
import circulo1 from "../../assets/inicio/portada-circulo-1.svg";
import circulo2 from "../../assets/inicio/portada-circulo-2.svg";
import volverBlanca from "../../assets/servicios/volver-blanca.svg";
import iconoNube from "../../assets/servicios/estado-nube.svg";
import iconoReintentar from "../../assets/servicios/boton-reintentar.svg";
import flechaBlanca from "../../assets/servicios/boton-flecha-blanca.svg";
import flechaVerde from "../../assets/noticias/flecha-verde.svg";
import iconoBuscarGrande from "../../assets/noticias/vacio-buscar.svg";
import paginaAnterior from "../../assets/noticias/pagina-anterior.svg";
import paginaSiguiente from "../../assets/noticias/pagina-siguiente.svg";
import mesAnterior from "../../assets/noticias/mes-anterior.svg";
import mesSiguiente from "../../assets/noticias/mes-siguiente.svg";

// ---------- Encabezado verde (igual que EncabezadoPublico, con botón opcional para volver) ----------

export function EncabezadoNoticias({
    regreso,
    etiqueta,
    titulo,
    texto,
}: {
    regreso?: { texto: string; ruta: string };
    etiqueta: string;
    titulo: ReactNode;
    texto: string;
}) {
    return (
        <section className={`encabezado-publico encabezado-noticias${regreso ? " encabezado-noticias--con-regreso" : ""}`}>
            <img className="encabezado-publico__circulo encabezado-publico__circulo--1" src={circulo1} alt="" />
            <img className="encabezado-publico__circulo encabezado-publico__circulo--2" src={circulo2} alt="" />
            {regreso && (
                <div className="encabezado-noticias__regreso">
                    <BotonRegreso {...regreso} />
                </div>
            )}
            <span className="etiqueta-inicio">
                <span className="punto-dorado" />
                {etiqueta}
            </span>
            <h1>{titulo}</h1>
            <p>{texto}</p>
        </section>
    );
}

export function BotonRegreso({ texto, ruta }: { texto: string; ruta: string }) {
    return (
        <Link to={ruta} className="boton-regreso-noticias">
            <img src={volverBlanca} alt="" />
            {texto}
        </Link>
    );
}

// ---------- Categoría: pastilla de color o punto con texto en mayúsculas ----------

export function PastillaCategoria({ categoria }: { categoria: Categoria }) {
    return <span className={`pastilla-noticia pastilla-noticia--${categoria}`}>{nombreCategoria(categoria)}</span>;
}

export function PuntoCategoria({ categoria, claro = false }: { categoria: Categoria; claro?: boolean }) {
    return (
        <span className={`punto-categoria punto-categoria--${categoria}${claro ? " punto-categoria--claro" : ""}`}>
            <span className="punto-categoria__punto" aria-hidden="true" />
            {nombreCategoria(categoria, "singular").toUpperCase()}
        </span>
    );
}

// Pastilla para filtrar por categoría u ordenar
export function ChipCategoria({ activa, alPresionar, children }: { activa: boolean; alPresionar: () => void; children: string }) {
    return (
        <button type="button" className={`chip-noticias${activa ? " chip-noticias--activo" : ""}`} aria-pressed={activa} onClick={alPresionar}>
            {children}
        </button>
    );
}

// ---------- Tarjetas ----------

// Enlace al detalle. "desde" permite que el detalle sepa a dónde regresar.
export type Origen = { desde: "noticias" } | { desde: "todas"; busqueda: string };

function rutaDetalle(noticia: Noticia) {
    return `/noticias/${noticia.id}`;
}

// Tarjeta chica: Inicio de noticias y "Otras noticias" del detalle
export function TarjetaChica({ noticia, origen }: { noticia: Noticia; origen: Origen }) {
    return (
        <Link to={rutaDetalle(noticia)} state={origen} className="tarjeta-noticia tarjeta-noticia--chica">
            <span className="tarjeta-noticia__imagen">
                <img src={noticia.imagen} alt="" />
            </span>
            <span className="tarjeta-noticia__textos">
                <PuntoCategoria categoria={noticia.categoria} />
                <span className="tarjeta-noticia__titulo">{noticia.titulo}</span>
                <span className="tarjeta-noticia__fecha">{fechaLarga(noticia.fecha)}</span>
            </span>
        </Link>
    );
}

// Tarjeta de la cuadrícula y fila de la vista en lista de "Todas las noticias"
export function TarjetaArchivo({ noticia, vista, origen }: { noticia: Noticia; vista: "cuadricula" | "lista"; origen: Origen }) {
    return (
        <Link to={rutaDetalle(noticia)} state={origen} className={`tarjeta-noticia tarjeta-noticia--${vista}`}>
            <span className="tarjeta-noticia__imagen">
                <img src={noticia.imagen} alt="" />
                <span className="tarjeta-noticia__ilustrativa">Imagen ilustrativa</span>
            </span>
            <span className="tarjeta-noticia__textos">
                <span className="tarjeta-noticia__meta">
                    <PastillaCategoria categoria={noticia.categoria} />
                    {fechaLarga(noticia.fecha)}
                </span>
                <span className="tarjeta-noticia__titulo">{noticia.titulo}</span>
                <span className="tarjeta-noticia__resumen">{noticia.resumen}</span>
                <span className="tarjeta-noticia__leer">
                    Leer más
                    <img src={flechaVerde} alt="" />
                </span>
            </span>
        </Link>
    );
}

// ---------- Estados: cargando, sin resultados, error y no disponible ----------

export function CargandoNoticias() {
    return (
        <p className="noticias-cargando" role="status">
            <span className="noticias-cargando__punto" aria-hidden="true" />
            Cargando noticias…
        </p>
    );
}

export function EstadoNoticias({
    tipo,
    texto,
    alAccionar,
}: {
    tipo: "vacio" | "error" | "no-disponible";
    texto?: string;
    alAccionar?: () => void;
}) {
    const contenido = {
        vacio: {
            etiqueta: "SIN RESULTADOS",
            titulo: "No encontramos noticias",
            texto: texto ?? "Prueba con otra búsqueda o quita los filtros.",
        },
        error: {
            etiqueta: "ERROR AL CARGAR",
            titulo: "No pudimos cargar las noticias",
            texto: "Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, escríbenos desde Contacto.",
        },
        "no-disponible": {
            etiqueta: "NOTICIA NO DISPONIBLE",
            titulo: "Esta noticia ya no está disponible",
            texto: "Pudo haber sido retirada o la dirección no es correcta. Puedes ver las demás noticias.",
        },
    }[tipo];
    const esError = tipo === "error";

    return (
        <div className="estado-noticias" role={esError ? "alert" : "status"}>
            <span className="estado-noticias__anillo">
                <span className={`estado-noticias__icono${esError ? " estado-noticias__icono--error" : ""}`}>
                    <img src={esError ? iconoNube : iconoBuscarGrande} alt="" />
                </span>
            </span>
            <p className="estado-noticias__etiqueta">{contenido.etiqueta}</p>
            <h2>{contenido.titulo}</h2>
            <p className="estado-noticias__texto">{contenido.texto}</p>
            <div className="estado-noticias__botones">
                {tipo === "vacio" && (
                    <button type="button" className="boton-noticias boton-noticias--verde" onClick={alAccionar}>
                        Quitar filtros
                        <img src={iconoReintentar} alt="" />
                    </button>
                )}
                {tipo === "error" && (
                    <>
                        <button type="button" className="boton-noticias boton-noticias--verde" onClick={alAccionar}>
                            Intentar de nuevo
                            <img src={iconoReintentar} alt="" />
                        </button>
                        <Link to="/contacto?tipo=sugerencia" className="boton-noticias boton-noticias--contorno">
                            Ir al Buzón de sugerencias
                        </Link>
                    </>
                )}
                {tipo === "no-disponible" && (
                    <>
                        <Link to="/noticias/todas" className="boton-noticias boton-noticias--verde">
                            Ver todas las noticias
                            <img src={flechaBlanca} alt="" />
                        </Link>
                        <Link to="/" className="boton-noticias boton-noticias--contorno">
                            Ir al inicio
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

// ---------- Paginación ----------

export function Paginacion({ pagina, totalPaginas, alCambiar }: { pagina: number; totalPaginas: number; alCambiar: (pagina: number) => void }) {
    if (totalPaginas <= 1) return null;
    return (
        <nav className="paginacion-noticias" aria-label="Páginas de noticias">
            <button type="button" className="paginacion-noticias__boton" onClick={() => alCambiar(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
                <img src={paginaAnterior} alt="" />
            </button>
            {paginasVisibles(pagina, totalPaginas).map((p, i) =>
                p === "…" ? (
                    <span key={`hueco-${i}`} className="paginacion-noticias__boton paginacion-noticias__boton--hueco" aria-hidden="true">…</span>
                ) : (
                    <button
                        key={p}
                        type="button"
                        className={`paginacion-noticias__boton${p === pagina ? " paginacion-noticias__boton--activa" : ""}`}
                        onClick={() => alCambiar(p)}
                        aria-current={p === pagina ? "page" : undefined}
                        aria-label={`Página ${p}`}
                    >
                        {p}
                    </button>
                ),
            )}
            <button type="button" className="paginacion-noticias__boton" onClick={() => alCambiar(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Página siguiente">
                <img src={paginaSiguiente} alt="" />
            </button>
        </nav>
    );
}

// ---------- Calendario para elegir una fecha exacta ----------

const DIAS = [
    { corto: "D", largo: "domingo" },
    { corto: "L", largo: "lunes" },
    { corto: "M", largo: "martes" },
    { corto: "M", largo: "miércoles" },
    { corto: "J", largo: "jueves" },
    { corto: "V", largo: "viernes" },
    { corto: "S", largo: "sábado" },
];

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function CalendarioFecha({
    id,
    inicial,
    fechasConNoticias,
    alAplicar,
    alCerrar,
}: {
    id: string;
    inicial: string | null; // AAAA-MM-DD
    fechasConNoticias: Set<string>;
    alAplicar: (fecha: string | null) => void;
    alCerrar: () => void;
}) {
    // Mes que se muestra: el de la fecha elegida o el de la noticia más reciente
    const referencia = inicial ?? [...fechasConNoticias].sort().at(-1) ?? "2026-11-01";
    const [anioRef, mesRef] = referencia.split("-").map(Number);
    const [mes, setMes] = useState({ anio: anioRef, mes: mesRef }); // mes 1-12
    const [elegida, setElegida] = useState<string | null>(inicial);
    const caja = useRef<HTMLDivElement>(null);

    // Escape cierra; un clic fuera también
    useEffect(() => {
        function alTeclear(evento: KeyboardEvent) {
            if (evento.key === "Escape") alCerrar();
        }
        function alPresionar(evento: MouseEvent) {
            const destino = evento.target as HTMLElement;
            if (caja.current && !caja.current.contains(destino) && !destino.closest("[data-abre-calendario]")) alCerrar();
        }
        document.addEventListener("keydown", alTeclear);
        document.addEventListener("mousedown", alPresionar);
        return () => {
            document.removeEventListener("keydown", alTeclear);
            document.removeEventListener("mousedown", alPresionar);
        };
    }, [alCerrar]);

    const primerDia = new Date(Date.UTC(mes.anio, mes.mes - 1, 1)).getUTCDay();
    const diasDelMes = new Date(Date.UTC(mes.anio, mes.mes, 0)).getUTCDate();
    const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasDelMes }, (_, i) => i + 1)];
    while (celdas.length % 7) celdas.push(null);
    const semanas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));

    function moverMes(paso: number) {
        const total = mes.anio * 12 + (mes.mes - 1) + paso;
        setMes({ anio: Math.floor(total / 12), mes: (total % 12) + 1 });
    }

    const nombreMes = `${MESES[mes.mes - 1][0].toUpperCase()}${MESES[mes.mes - 1].slice(1)} ${mes.anio}`;

    return (
        <div ref={caja} id={id} className="calendario-noticias" role="dialog" aria-label="Elegir fecha exacta">
            <div className="calendario-noticias__encabezado">
                <button type="button" className="calendario-noticias__mes" onClick={() => moverMes(-1)} aria-label="Mes anterior">
                    <img src={mesAnterior} alt="" />
                </button>
                <p aria-live="polite">{nombreMes}</p>
                <button type="button" className="calendario-noticias__mes" onClick={() => moverMes(1)} aria-label="Mes siguiente">
                    <img src={mesSiguiente} alt="" />
                </button>
            </div>
            <table className="calendario-noticias__tabla">
                <thead>
                    <tr>
                        {DIAS.map((dia) => (
                            <th key={dia.largo} scope="col" abbr={dia.largo}>{dia.corto}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {semanas.map((semana, i) => (
                        <tr key={i}>
                            {semana.map((dia, j) => {
                                if (!dia) return <td key={j} />;
                                const valor = `${mes.anio}-${dosDigitos(mes.mes)}-${dosDigitos(dia)}`;
                                const conNoticias = fechasConNoticias.has(valor);
                                const activa = valor === elegida;
                                return (
                                    <td key={j}>
                                        <button
                                            type="button"
                                            className={`calendario-noticias__dia${activa ? " calendario-noticias__dia--activo" : ""}`}
                                            aria-pressed={activa}
                                            aria-label={`${fechaLarga(valor)}${conNoticias ? ", con noticias" : ""}`}
                                            onClick={() => setElegida(activa ? null : valor)}
                                        >
                                            {dia}
                                            {conNoticias && <span className="calendario-noticias__punto" aria-hidden="true" />}
                                        </button>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="calendario-noticias__pie">
                {/* Limpiar quita la fecha y cierra */}
                <button type="button" className="enlace-noticias" onClick={() => alAplicar(null)}>Limpiar</button>
                <button type="button" className="boton-noticias boton-noticias--verde boton-noticias--chico" onClick={() => alAplicar(elegida)}>
                    Aplicar
                </button>
            </div>
        </div>
    );
}

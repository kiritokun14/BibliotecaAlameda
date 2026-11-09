import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Chip, EncabezadoPagina, EstadoVacio, Migas, type TonoChip } from "../componentes";
import { IconoAviso, IconoBuscar, IconoLista, IconoReloj } from "../contenidos/piezas";
import type { Estado } from "./datos";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

const TONO_ESTADO: Record<Estado, TonoChip> = {
    pendiente: "guinda",
    observaciones: "dorado",
    aprobada: "verde",
    rechazada: "gris",
};

const POR_PAGINA = 12;
const EN_BANDEJA = 6;

type SolicitudBase = { folio: string; persona: string; enviada: string; estado: Estado };

export type Columna<T> = { titulo: string; ancho?: number; celda: (solicitud: T) => ReactNode };

// Todo lo que cambia entre credenciales, espacios y propuestas
export type ConfigArea = {
    ruta: string;
    titulo: string; // "Solicitudes de credencial"
    tituloTodas: string; // "Todas las solicitudes de credencial"
    descripcion: string;
    etiquetaBloque: string; // "Solicitudes"
    pregunta: string; // "¿Cómo van las solicitudes de credencial?"
    sustantivo: string; // "solicitudes" / "propuestas"
    estados: Record<Estado, string>; // cómo se llama cada estado en esta área
    filtroObservaciones: string; // "Con observaciones" / "Con cambios propuestos"
    resumen: { icono: string; detalle: string; texto: (cantidad: number) => string }[];
    periodoResueltas: string; // "esta semana" / "este mes"
    buscarPor: string;
    accionPendiente: string; // "Cotejar" / "Revisar"
    notaBandeja: string;
    textoVacio: string;
};

type BandejaProps<T extends SolicitudBase> = {
    vista: "bandeja" | "todas";
    config: ConfigArea;
    solicitudes: T[];
    columnas: Columna<T>[];
    coincide: (solicitud: T, texto: string) => boolean;
};

type Filtro = "todas" | Estado;

function Bandeja<T extends SolicitudBase>({ vista, config, solicitudes, columnas, coincide }: BandejaProps<T>) {
    const [filtro, setFiltro] = useState<Filtro>(vista === "bandeja" ? "pendiente" : "todas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    const cuenta = (estado: Estado) => solicitudes.filter((s) => s.estado === estado).length;
    const pendientes = cuenta("pendiente");
    const observaciones = cuenta("observaciones");
    const resueltas = cuenta("aprobada") + cuenta("rechazada");

    // En la bandeja van primero las más antiguas; en "Todas", las más recientes
    const ordenadas = [...solicitudes].sort((a, b) => a.enviada.localeCompare(b.enviada) || a.folio.localeCompare(b.folio));
    if (vista === "todas") ordenadas.reverse();

    const texto = busqueda.trim().toLowerCase();
    const filtradas = ordenadas.filter(
        (s) => (filtro === "todas" || s.estado === filtro) && (!texto || coincide(s, texto)),
    );

    const inicio = vista === "todas" ? pagina * POR_PAGINA : 0;
    const visibles = filtradas.slice(inicio, inicio + (vista === "todas" ? POR_PAGINA : EN_BANDEJA));

    function elegirFiltro(nuevo: Filtro) {
        setFiltro(nuevo);
        setPagina(0);
    }

    function quitarFiltros() {
        setBusqueda("");
        elegirFiltro("todas");
    }

    const filtros: { valor: Filtro; texto: string }[] = [
        { valor: "todas", texto: `Todas (${solicitudes.length})` },
        { valor: "pendiente", texto: `${config.estados.pendiente} (${pendientes})` },
        { valor: "observaciones", texto: `${config.filtroObservaciones} (${observaciones})` },
        { valor: "aprobada", texto: "Aprobadas" },
        { valor: "rechazada", texto: "Rechazadas" },
    ];

    // Bloque «Accesos rápidos»: mismas tarjetas que la bandeja del Editor
    const tarjetasResumen: { tono: "gris" | "guinda" | "azul"; icono: ReactNode; cantidad: number; titulo: string; texto: string; enlace: string; filtro: Filtro }[] = [
        { tono: "gris", icono: <IconoReloj />, cantidad: pendientes, titulo: config.estados.pendiente, texto: config.resumen[0].detalle, enlace: `Ver ${config.estados.pendiente.toLowerCase()}`, filtro: "pendiente" },
        { tono: "guinda", icono: <IconoAviso />, cantidad: observaciones, titulo: config.filtroObservaciones, texto: config.resumen[1].detalle, enlace: "Ver observaciones", filtro: "observaciones" },
        { tono: "azul", icono: <IconoCheck />, cantidad: resueltas, titulo: `Resueltas ${config.periodoResueltas}`, texto: "Aprobadas o rechazadas.", enlace: "Ver aprobadas", filtro: "aprobada" },
    ];

    const columnasRejilla = `110px ${columnas.map((c) => (c.ancho ? `${c.ancho}px` : "minmax(160px, 1fr)")).join(" ")} 170px 100px`;
    const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));

    return (
        <>
            {vista === "bandeja" ? (
                <>
                    <Migas pasos={[[config.titulo]]} />
                    <EncabezadoPagina
                        etiqueta={`Atención · ${config.titulo}`}
                        titulo={config.titulo}
                        texto={config.descripcion}
                    />
                </>
            ) : (
                <>
                    <Migas pasos={[[config.titulo, config.ruta], ["Todas"]]} />
                    <EncabezadoPagina
                        volver={{ texto: `Volver a ${config.titulo.toLowerCase()}`, ruta: config.ruta }}
                        etiqueta="Atención · Listado completo"
                        titulo={config.tituloTodas}
                        texto="Consulta el historial completo, con cualquier estado. Datos de ejemplo."
                    />
                </>
            )}

            {vista === "bandeja" && (
                <section className="contenidos-resumen" aria-labelledby="atencion-resumen-titulo">
                    <h2 id="atencion-resumen-titulo">Accesos rápidos</h2>
                    <div className="contenidos-resumen__tarjetas">
                        {tarjetasResumen.map((t) => (
                            <article key={t.filtro} className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${t.tono}${filtro === t.filtro ? " at-tarjeta--activa" : ""}`}>
                                <div className="contenidos-resumen__fila">
                                    <span className="contenidos-resumen__icono">{t.icono}</span>
                                    <button type="button" className="contenidos-resumen__enlace" aria-pressed={filtro === t.filtro} onClick={() => elegirFiltro(t.filtro)}>
                                        {t.enlace} →
                                    </button>
                                </div>
                                <p className="contenidos-resumen__cifra">{t.cantidad}</p>
                                <p className="contenidos-resumen__titulo">{t.titulo}</p>
                                <p className="contenidos-resumen__texto">{t.texto}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className="contenidos-lista" aria-labelledby="atencion-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div>
                        <h2 id="atencion-lista-titulo">{vista === "bandeja" ? `Bandeja de ${config.sustantivo}` : "Listado completo"}</h2>
                        <p>
                            {vista === "bandeja"
                                ? "Ordenadas de la más antigua a la más reciente."
                                : `Incluye ${config.sustantivo} ${config.estados.pendiente.toLowerCase()}, ${config.filtroObservaciones.toLowerCase()} y resueltas.`}
                        </p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                        {filtros.map((opcion) => (
                            <button
                                key={opcion.valor}
                                type="button"
                                className={`contenidos-filtro${filtro === opcion.valor ? " contenidos-filtro--activo" : ""}`}
                                aria-pressed={filtro === opcion.valor}
                                onClick={() => elegirFiltro(opcion.valor)}
                            >
                                {opcion.texto}
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input
                            type="search"
                            placeholder={`Buscar por ${config.buscarPor}`}
                            aria-label={`Buscar por ${config.buscarPor}`}
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(0);
                            }}
                        />
                    </label>
                </div>

                {visibles.length === 0 ? (
                    texto ? (
                        <EstadoVacio
                            icono={vacioBuscar}
                            titulo="Sin resultados"
                            texto={`No encontramos ${config.sustantivo} con esa búsqueda. Revisa el ${config.buscarPor}, o quita los filtros.`}
                            accion={{ texto: "Quitar filtros", alPresionar: quitarFiltros }}
                        />
                    ) : (
                        <EstadoVacio icono={vacioCheck} titulo={`No hay ${config.sustantivo} por ahora`} texto={config.textoVacio} />
                    )
                ) : (
                    <div className="contenidos-tabla" tabIndex={0} role="table" aria-label={vista === "bandeja" ? `Bandeja de ${config.sustantivo}` : "Listado completo"}>
                        <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row" style={{ gridTemplateColumns: columnasRejilla }}>
                            <span role="columnheader">Folio</span>
                            {columnas.map((columna) => <span key={columna.titulo} role="columnheader">{columna.titulo}</span>)}
                            <span role="columnheader">Estado</span>
                            <span role="columnheader">Acción</span>
                        </div>

                        {visibles.map((solicitud) => (
                            <div key={solicitud.folio} className="contenidos-tabla__fila" role="row" style={{ gridTemplateColumns: columnasRejilla }}>
                                <span role="cell" className="contenidos-tabla__folio">{solicitud.folio}</span>
                                {columnas.map((columna) => (
                                    <span key={columna.titulo} role="cell" className="at-celda">{columna.celda(solicitud)}</span>
                                ))}
                                <span role="cell">
                                    <Chip tono={TONO_ESTADO[solicitud.estado]}>{config.estados[solicitud.estado]}</Chip>
                                </span>
                                <span role="cell">
                                    <Link to={`${config.ruta}/${solicitud.folio}`} className="contenidos-tabla__accion">
                                        {solicitud.estado === "pendiente" ? config.accionPendiente : "Ver"} →<span className="solo-lectores"> {solicitud.folio}</span>
                                    </Link>
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {vista === "bandeja" ? (
                    <div className="contenidos-lista__pie">
                        <p>
                            Mostrando {visibles.length} de {solicitudes.length} {config.sustantivo} (ejemplo). {config.notaBandeja}
                        </p>
                        <Link to={`${config.ruta}/todas`} className="contenidos-boton contenidos-boton--oscuro">
                            Ver todas las {config.sustantivo}
                        </Link>
                    </div>
                ) : (
                    filtradas.length > 0 && (
                        <div className="contenidos-lista__pie">
                            <p>
                                Mostrando {inicio + 1} a {inicio + visibles.length} de {filtradas.length} {config.sustantivo} (ejemplo)
                            </p>
                            <div className="contenidos-paginas" role="group" aria-label="Páginas">
                                <button type="button" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
                                <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
                                <button type="button" disabled={inicio + POR_PAGINA >= filtradas.length} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
                            </div>
                        </div>
                    )
                )}
            </section>
        </>
    );
}

const IconoCheck = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

// Celda de dos renglones (nombre + "(ejemplo)", fecha + horario...)
export function CeldaDoble({ arriba, abajo }: { arriba: ReactNode; abajo: ReactNode }) {
    return (
        <span className="at-celda-doble">
            <span>{arriba}</span>
            <small>{abajo}</small>
        </span>
    );
}

export default Bandeja;

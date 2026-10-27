import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Chip, EncabezadoPagina, EstadoVacio, type TonoChip } from "../componentes";
import type { Estado } from "./datos";
import circulo1 from "../../../assets/admin/circulo-1.svg";
import circulo2 from "../../../assets/admin/circulo-2.svg";
import flechaResumen from "../../../assets/admin/resumen-flecha.svg";
import resumenCheck from "../../../assets/admin/resumen-check.svg";
import bandejaLista from "../../../assets/admin/bandeja-list.svg";
import iconoBuscar from "../../../assets/admin/icono-search.svg";
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

    const tarjetasResumen = [
        { ...config.resumen[0], cantidad: pendientes, chip: "Urgente", filtro: "pendiente" as Filtro },
        { ...config.resumen[1], cantidad: observaciones, chip: "Atención", filtro: "observaciones" as Filtro },
        {
            icono: resumenCheck,
            detalle: "Aprobadas o rechazadas",
            texto: (n: number) => `${n} resueltas ${config.periodoResueltas}`,
            cantidad: resueltas,
            chip: "Al día",
            filtro: "aprobada" as Filtro,
        },
    ];

    return (
        <>
            {vista === "bandeja" ? (
                <EncabezadoPagina etiqueta="ATENCIÓN" titulo={config.titulo} texto={config.descripcion} />
            ) : (
                <EncabezadoPagina
                    volver={{ texto: `Volver a ${config.titulo.toLowerCase()}`, ruta: config.ruta }}
                    etiqueta="ATENCIÓN · LISTADO COMPLETO"
                    titulo={config.tituloTodas}
                    texto="Consulta el historial completo, con cualquier estado. Datos de ejemplo."
                />
            )}

            {vista === "bandeja" && (
                <section className="bloque-resumen">
                    <img className="bloque-resumen__circulo bloque-resumen__circulo--1" src={circulo1} alt="" />
                    <img className="bloque-resumen__circulo bloque-resumen__circulo--2" src={circulo2} alt="" />
                    <div className="bloque-resumen__titular">
                        <span className="bloque-resumen__etiqueta">{config.etiquetaBloque}</span>
                        <h2>{config.pregunta}</h2>
                    </div>
                    <div className="bloque-resumen__tarjetas">
                        {tarjetasResumen.map((tarjeta, indice) => (
                            <article key={indice} className={`tarjeta-resumen tarjeta-resumen--${indice + 1}`}>
                                <div className="tarjeta-resumen__texto">
                                    <span className="tarjeta-resumen__icono">
                                        <img src={tarjeta.icono} alt="" />
                                    </span>
                                    <h3>{tarjeta.texto(tarjeta.cantidad)}</h3>
                                    <p>{tarjeta.detalle}</p>
                                </div>
                                <div className="tarjeta-resumen__accion">
                                    <button
                                        type="button"
                                        className="tarjeta-resumen__flecha"
                                        aria-label={`Filtrar: ${tarjeta.texto(tarjeta.cantidad)}`}
                                        onClick={() => elegirFiltro(tarjeta.filtro)}
                                    >
                                        <img src={flechaResumen} alt="" />
                                    </button>
                                    <Chip tono={(["guinda", "dorado", "verde"] as const)[indice]}>{tarjeta.chip}</Chip>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            <section className="tarjeta-panel tarjeta-panel--blanca tarjeta-bandeja">
                <div className="tarjeta-panel__cabecera">
                    <span className="icono-tarjeta icono-tarjeta--verde">
                        <img src={bandejaLista} alt="" />
                    </span>
                    <div className="tarjeta-panel__textos">
                        <h2>{vista === "bandeja" ? `Bandeja de ${config.sustantivo}` : "Listado completo"}</h2>
                        <p>
                            {vista === "bandeja"
                                ? "Ordenadas de la más antigua a la más reciente."
                                : `Incluye ${config.sustantivo} ${config.estados.pendiente.toLowerCase()}, ${config.filtroObservaciones.toLowerCase()} y resueltas.`}
                        </p>
                    </div>
                </div>

                <div className="barra-filtros">
                    <div className="filtros" role="group" aria-label="Filtrar por estado">
                        {filtros.map((opcion) => (
                            <button
                                key={opcion.valor}
                                type="button"
                                className={`filtro ${filtro === opcion.valor ? "filtro--activo" : ""}`}
                                aria-pressed={filtro === opcion.valor}
                                onClick={() => elegirFiltro(opcion.valor)}
                            >
                                {opcion.texto}
                            </button>
                        ))}
                    </div>
                    <label className="buscador">
                        <img src={iconoBuscar} alt="" />
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
                    <div className="tabla" role="table">
                        <div className="tabla__fila tabla__fila--encabezado" role="row">
                            <span role="columnheader" style={{ width: 130 }}>FOLIO</span>
                            {columnas.map((columna) => (
                                <span key={columna.titulo} role="columnheader" style={estiloColumna(columna)}>
                                    {columna.titulo}
                                </span>
                            ))}
                            <span role="columnheader" style={{ width: 190 }}>ESTADO</span>
                            <span role="columnheader" style={{ width: 130 }} />
                        </div>

                        {visibles.map((solicitud) => (
                            <div key={solicitud.folio} className="tabla__fila" role="row">
                                <span role="cell" className="tabla__fuerte" style={{ width: 130 }}>
                                    {solicitud.folio}
                                </span>
                                {columnas.map((columna) => (
                                    <span key={columna.titulo} role="cell" className="tabla__fuerte" style={estiloColumna(columna)}>
                                        {columna.celda(solicitud)}
                                    </span>
                                ))}
                                <span role="cell" style={{ width: 190 }}>
                                    <Chip tono={TONO_ESTADO[solicitud.estado]}>{config.estados[solicitud.estado]}</Chip>
                                </span>
                                <span role="cell" style={{ width: 130 }}>
                                    {solicitud.estado === "pendiente" ? (
                                        <Link to={`${config.ruta}/${solicitud.folio}`} className="boton-panel boton-panel--verde boton-panel--mediano">
                                            {config.accionPendiente}
                                        </Link>
                                    ) : (
                                        <Link to={`${config.ruta}/${solicitud.folio}`} className="boton-panel boton-panel--oscuro boton-panel--mediano">
                                            Ver
                                        </Link>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {vista === "bandeja" ? (
                    <div className="pie-bandeja">
                        <p>
                            Mostrando {visibles.length} de {solicitudes.length} {config.sustantivo} (ejemplo). {config.notaBandeja}
                        </p>
                        <Link to={`${config.ruta}/todas`} className="boton-panel boton-panel--guinda">
                            Ver todas las {config.sustantivo}
                        </Link>
                    </div>
                ) : (
                    filtradas.length > 0 && (
                        <div className="pie-bandeja">
                            <p>
                                Mostrando {inicio + 1} a {inicio + visibles.length} de {filtradas.length} {config.sustantivo} (ejemplo)
                            </p>
                            <button
                                type="button"
                                className="boton-panel boton-panel--oscuro boton-panel--mediano-alto"
                                disabled={pagina === 0}
                                onClick={() => setPagina(pagina - 1)}
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                className="boton-panel boton-panel--guinda boton-panel--mediano-alto"
                                disabled={inicio + POR_PAGINA >= filtradas.length}
                                onClick={() => setPagina(pagina + 1)}
                            >
                                Siguiente
                            </button>
                        </div>
                    )
                )}
            </section>
        </>
    );
}

// Sin ancho = la columna ocupa el espacio que sobra
function estiloColumna(columna: { ancho?: number }) {
    return columna.ancho ? { width: columna.ancho } : { flex: 1, minWidth: 0 };
}

// Celda de dos renglones (nombre + "(ejemplo)", fecha + horario...)
export function CeldaDoble({ arriba, abajo }: { arriba: ReactNode; abajo: ReactNode }) {
    return (
        <span className="celda-doble">
            <span>{arriba}</span>
            <span className="celda-doble__abajo">{abajo}</span>
        </span>
    );
}

export default Bandeja;

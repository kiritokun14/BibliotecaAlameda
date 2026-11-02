import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { IconoAviso, IconoBuscar, IconoDocumento, IconoLapiz, IconoLista, IconoMas, IconoReloj, Migas } from "./piezas";
import PanelLayout from "../PanelLayout";
import { mensajeError } from "../../../servicios/api";
import {
    consultarResumen, listarContenidos, type EstadoContenidoApi, type ListaContenidos, type ResumenContenidos, type TipoContenidoApi,
} from "../../../servicios/contenidos";
import "./Contenidos.css";

// Pantalla de inicio del Editor de contenidos (HU-11 / T-054).
// Las cifras y la lista vienen del backend (/contenidos/editor) y solo incluyen lo propio.

export type EstadoContenido = "borrador" | "por_autorizar" | "con_observaciones" | "publicado";

// La base llama "en_revision" a lo que aquí se muestra como "Por autorizar"
const ESTADO_API: Record<EstadoContenido, EstadoContenidoApi> = {
    borrador: "borrador",
    por_autorizar: "en_revision",
    con_observaciones: "con_observaciones",
    publicado: "publicado",
};
const ESTADO_PANTALLA: Partial<Record<EstadoContenidoApi, EstadoContenido>> = {
    borrador: "borrador",
    en_revision: "por_autorizar",
    con_observaciones: "con_observaciones",
    publicado: "publicado",
};
const NOMBRE_TIPO: Record<TipoContenidoApi, string> = {
    noticia: "Noticia",
    resena: "Reseña",
    acerca: "Acerca de",
    memoria: "Memoria pública",
    servicio: "Servicio",
    programa: "Programa",
    recurso: "Recurso",
};
const POR_PAGINA = 10;

const formatoFecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

const ESTADOS: Record<EstadoContenido, { texto: string; accion: string }> = {
    borrador: { texto: "Borrador", accion: "Editar" },
    por_autorizar: { texto: "Por autorizar", accion: "Ver" },
    con_observaciones: { texto: "Con observaciones", accion: "Corregir" },
    publicado: { texto: "Publicado", accion: "Ver" },
};

type Filtro = "todos" | EstadoContenido;

const FILTROS: { valor: Filtro; texto: string }[] = [
    { valor: "todos", texto: "Todos" },
    { valor: "borrador", texto: "Borradores" },
    { valor: "por_autorizar", texto: "Por autorizar" },
    { valor: "con_observaciones", texto: "Con observaciones" },
    { valor: "publicado", texto: "Publicados" },
];

type TarjetaResumenProps = {
    tono: "azul" | "gris" | "guinda";
    icono: ReactNode;
    cifra: number;
    titulo: string;
    texto: string;
    enlace: string;
    alPresionar: () => void;
};

function TarjetaResumen({ tono, icono, cifra, titulo, texto, enlace, alPresionar }: TarjetaResumenProps) {
    return (
        <article className={`contenidos-resumen__tarjeta contenidos-resumen__tarjeta--${tono}`}>
            <div className="contenidos-resumen__fila">
                <span className="contenidos-resumen__icono">{icono}</span>
                <button type="button" className="contenidos-resumen__enlace" onClick={alPresionar}>
                    {enlace} →
                </button>
            </div>
            <p className="contenidos-resumen__cifra">{cifra}</p>
            <p className="contenidos-resumen__titulo">{titulo}</p>
            <p className="contenidos-resumen__texto">{texto}</p>
        </article>
    );
}

function EditorContenidos() {
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [busquedaAplicada, setBusquedaAplicada] = useState("");
    const [pagina, setPagina] = useState(0);
    const [resumen, setResumen] = useState<ResumenContenidos | null>(null);
    const [lista, setLista] = useState<ListaContenidos | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;
        consultarResumen()
            .then((r) => { if (activo) setResumen(r); })
            .catch((e) => { if (activo) setError(mensajeError(e)); });
        return () => { activo = false; };
    }, []);

    // Espera a que dejes de escribir antes de buscar
    useEffect(() => {
        const espera = setTimeout(() => {
            setBusquedaAplicada(busqueda.trim());
            setPagina(0);
        }, 300);
        return () => clearTimeout(espera);
    }, [busqueda]);

    useEffect(() => {
        let activo = true;
        listarContenidos({
            estado: filtro === "todos" ? undefined : ESTADO_API[filtro],
            busqueda: busquedaAplicada,
            limite: POR_PAGINA,
            desplazamiento: pagina * POR_PAGINA,
        })
            .then((l) => { if (activo) { setLista(l); setError(""); } })
            .catch((e) => { if (activo) setError(mensajeError(e)); });
        return () => { activo = false; };
    }, [filtro, busquedaAplicada, pagina]);

    const elegirFiltro = (f: Filtro) => {
        setFiltro(f);
        setPagina(0);
    };
    const cuenta = (estado: EstadoContenido) => resumen?.[ESTADO_API[estado] as keyof ResumenContenidos] ?? 0;
    const total = resumen?.total ?? 0;
    const visibles = (lista?.contenidos ?? []).map((c) => ({
        ...c,
        estadoPantalla: ESTADO_PANTALLA[c.estado] ?? "borrador",
    }));
    const totalFiltrado = lista?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(totalFiltrado / POR_PAGINA));

    return (
        <PanelLayout titulo="Contenidos" tema="solon">
            <Migas actual="Bandeja" />

            <div className="contenidos-encabezado">
                <div>
                    <p className="contenidos-etiqueta">Contenidos · Editor</p>
                    <h1>Editor de contenidos</h1>
                    <p className="contenidos-encabezado__texto">
                        Redacta noticias, reseñas y textos del portal. Lo que envíes lo autoriza y publica el Administrador.
                    </p>
                </div>
                <Link to="/admin/contenidos/editor/nuevo" className="contenidos-boton contenidos-boton--principal">
                    <IconoMas />
                    Nuevo contenido
                </Link>
            </div>

            <section className="contenidos-resumen" aria-labelledby="contenidos-resumen-titulo">
                <p className="contenidos-resumen__chip">Editor de contenidos</p>
                <h2 id="contenidos-resumen-titulo">
                    ¿Cómo van tus <span>contenidos</span>?
                </h2>
                <p className="contenidos-resumen__subtitulo">Tu actividad en el Editor.</p>
                <div className="contenidos-resumen__tarjetas">
                    <TarjetaResumen
                        tono="azul"
                        icono={<IconoLapiz />}
                        cifra={cuenta("borrador")}
                        titulo="Borradores"
                        texto="Aún no los has enviado a autorización."
                        enlace="Ver borradores"
                        alPresionar={() => elegirFiltro("borrador")}
                    />
                    <TarjetaResumen
                        tono="gris"
                        icono={<IconoReloj />}
                        cifra={cuenta("por_autorizar")}
                        titulo="Por autorizar"
                        texto="Esperan la decisión del Administrador."
                        enlace="Ver en autorización"
                        alPresionar={() => elegirFiltro("por_autorizar")}
                    />
                    <TarjetaResumen
                        tono="guinda"
                        icono={<IconoAviso />}
                        cifra={cuenta("con_observaciones")}
                        titulo="Con observaciones"
                        texto="Corrige y vuelve a enviar."
                        enlace="Ver observaciones"
                        alPresionar={() => elegirFiltro("con_observaciones")}
                    />
                </div>
            </section>

            <section className="contenidos-lista" aria-labelledby="contenidos-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div>
                        <h2 id="contenidos-lista-titulo">Mis contenidos</h2>
                        <p>Del más reciente al más antiguo.</p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="tablist" aria-label="Filtrar por estado">
                        {FILTROS.map((f) => (
                            <button
                                key={f.valor}
                                type="button"
                                role="tab"
                                aria-selected={filtro === f.valor}
                                className={`contenidos-filtro${filtro === f.valor ? " contenidos-filtro--activo" : ""}`}
                                onClick={() => elegirFiltro(f.valor)}
                            >
                                {f.texto} ({f.valor === "todos" ? total : cuenta(f.valor)})
                            </button>
                        ))}
                    </div>
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input
                            type="search"
                            placeholder="Buscar por folio o título"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            aria-label="Buscar por folio o título"
                        />
                    </label>
                </div>

                <div className="contenidos-tabla" role="table" aria-label="Mis contenidos">
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        <span role="columnheader">Folio</span>
                        <span role="columnheader">Título</span>
                        <span role="columnheader">Tipo</span>
                        <span role="columnheader">Autoría</span>
                        <span role="columnheader">Estado</span>
                        <span role="columnheader">Actualizado</span>
                        <span role="columnheader">Acción</span>
                    </div>

                    {visibles.map((c) => (
                        <div key={c.folio} className="contenidos-tabla__fila" role="row">
                            <span role="cell" className="contenidos-tabla__folio">{c.folio}</span>
                            <span role="cell" className="contenidos-tabla__titulo">{c.titulo || "Sin título"}</span>
                            <span role="cell">{NOMBRE_TIPO[c.tipo] ?? c.tipo}</span>
                            <span role="cell">Tú</span>
                            <span role="cell">
                                <span className={`contenidos-estado contenidos-estado--${c.estadoPantalla}`}>{ESTADOS[c.estadoPantalla].texto}</span>
                            </span>
                            <span role="cell">{formatoFecha.format(new Date(c.actualizadoEn))}</span>
                            <span role="cell">
                                {c.estadoPantalla === "con_observaciones" ? (
                                    <Link to={`/admin/contenidos/editor/${c.folio}/corregir`} className="contenidos-tabla__accion">{ESTADOS[c.estadoPantalla].accion} →</Link>
                                ) : c.estadoPantalla === "borrador" ? (
                                    <Link to={`/admin/contenidos/editor/${c.folio}/editar`} className="contenidos-tabla__accion">{ESTADOS[c.estadoPantalla].accion} →</Link>
                                ) : (
                                    // TODO: pantalla para ver un contenido enviado o publicado
                                    <button type="button" className="contenidos-tabla__accion" disabled title="Disponible pronto">{ESTADOS[c.estadoPantalla].accion} →</button>
                                )}
                            </span>
                        </div>
                    ))}

                    {error && (
                        <p className="contenidos-error" role="alert">{error}</p>
                    )}

                    {!error && lista && visibles.length === 0 && (
                        <div className="contenidos-vacio" role="row">
                            <span role="cell">
                                <span className="contenidos-vacio__icono"><IconoDocumento /></span>
                                <strong>{total === 0 ? "Todavía no tienes contenidos" : "No hay contenidos con este filtro"}</strong>
                                <span>
                                    {total === 0
                                        ? "Cuando crees un borrador aparecerá aquí. Empieza con «Nuevo contenido»."
                                        : "Prueba con otro estado o cambia la búsqueda."}
                                </span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="contenidos-lista__pie">
                    <p>Mostrando {visibles.length} de {totalFiltrado} contenidos</p>
                    <button
                        type="button"
                        className="contenidos-boton contenidos-boton--oscuro"
                        disabled={total === 0 || (filtro === "todos" && !busqueda)}
                        onClick={() => { elegirFiltro("todos"); setBusqueda(""); }}
                    >
                        Ver todos mis contenidos
                    </button>
                    <div className="contenidos-paginas" aria-label="Páginas">
                        <button type="button" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina + 1} de {paginas}</button>
                        <button type="button" disabled={pagina + 1 >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
                    </div>
                </div>
            </section>
        </PanelLayout>
    );
}

export default EditorContenidos;

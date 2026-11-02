import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { IconoAviso, IconoBuscar, IconoDocumento, IconoLapiz, IconoLista, IconoMas, IconoReloj, Migas } from "./piezas";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";

// Pantalla de inicio del Editor de contenidos (HU-11 / T-054).
// Por ahora solo es el diseño: no hay datos. La lista y las cifras se llenarán
// cuando conectemos el backend de contenidos.

export type EstadoContenido = "borrador" | "por_autorizar" | "con_observaciones" | "publicado";

export type FilaContenido = {
    folio: string;
    titulo: string;
    tipo: string;
    autoria: string;
    estado: EstadoContenido;
    actualizado: string;
};

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
    // TODO: traer del backend los contenidos de la cuenta (más reciente primero)
    const contenidos: FilaContenido[] = [];
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [busqueda, setBusqueda] = useState("");

    const cuenta = (estado: EstadoContenido) => contenidos.filter((c) => c.estado === estado).length;
    const texto = busqueda.trim().toLowerCase();
    const visibles = contenidos.filter(
        (c) =>
            (filtro === "todos" || c.estado === filtro) &&
            (!texto || c.folio.toLowerCase().includes(texto) || c.titulo.toLowerCase().includes(texto)),
    );

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
                <p className="contenidos-resumen__subtitulo">Tu actividad en el Editor esta semana.</p>
                <div className="contenidos-resumen__tarjetas">
                    <TarjetaResumen
                        tono="azul"
                        icono={<IconoLapiz />}
                        cifra={cuenta("borrador")}
                        titulo="Borradores"
                        texto="Aún no los has enviado a autorización."
                        enlace="Ver borradores"
                        alPresionar={() => setFiltro("borrador")}
                    />
                    <TarjetaResumen
                        tono="gris"
                        icono={<IconoReloj />}
                        cifra={cuenta("por_autorizar")}
                        titulo="Por autorizar"
                        texto="Esperan la decisión del Administrador."
                        enlace="Ver en autorización"
                        alPresionar={() => setFiltro("por_autorizar")}
                    />
                    <TarjetaResumen
                        tono="guinda"
                        icono={<IconoAviso />}
                        cifra={cuenta("con_observaciones")}
                        titulo="Con observaciones"
                        texto="Corrige y vuelve a enviar."
                        enlace="Ver observaciones"
                        alPresionar={() => setFiltro("con_observaciones")}
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
                                onClick={() => setFiltro(f.valor)}
                            >
                                {f.texto} ({f.valor === "todos" ? contenidos.length : cuenta(f.valor)})
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
                            <span role="cell" className="contenidos-tabla__titulo">{c.titulo}</span>
                            <span role="cell">{c.tipo}</span>
                            <span role="cell">{c.autoria}</span>
                            <span role="cell">
                                <span className={`contenidos-estado contenidos-estado--${c.estado}`}>{ESTADOS[c.estado].texto}</span>
                            </span>
                            <span role="cell">{c.actualizado}</span>
                            <span role="cell">
                                {c.estado === "con_observaciones" ? (
                                    <Link to={`/admin/contenidos/editor/${c.folio}/corregir`} className="contenidos-tabla__accion">{ESTADOS[c.estado].accion} →</Link>
                                ) : (
                                    // TODO: abrir para editar (borrador) o ver (por autorizar / publicado)
                                    <button type="button" className="contenidos-tabla__accion">{ESTADOS[c.estado].accion} →</button>
                                )}
                            </span>
                        </div>
                    ))}

                    {visibles.length === 0 && (
                        <div className="contenidos-vacio" role="row">
                            <span role="cell">
                                <span className="contenidos-vacio__icono"><IconoDocumento /></span>
                                <strong>{contenidos.length === 0 ? "Todavía no tienes contenidos" : "No hay contenidos con este filtro"}</strong>
                                <span>
                                    {contenidos.length === 0
                                        ? "Cuando crees un borrador aparecerá aquí. Empieza con «Nuevo contenido»."
                                        : "Prueba con otro estado o cambia la búsqueda."}
                                </span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="contenidos-lista__pie">
                    <p>Mostrando {visibles.length} de {contenidos.length} contenidos</p>
                    <button type="button" className="contenidos-boton contenidos-boton--oscuro" disabled={contenidos.length === 0}>
                        Ver todos mis contenidos
                    </button>
                    <div className="contenidos-paginas" aria-label="Páginas">
                        <button type="button" disabled>‹ Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">1</button>
                        <button type="button" disabled>Siguiente ›</button>
                    </div>
                </div>
            </section>
        </PanelLayout>
    );
}

export default EditorContenidos;

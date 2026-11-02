import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, EncabezadoPagina, EstadoVacio } from "../componentes";
import { TONO_ESTADO } from "./tonos";
import "./Contenidos.css";
import {
    NOMBRE_ESTADO,
    cuandoSeActualizo,
    filtrarContenidos,
    nombreTipo,
    useContenidos,
    type Contenido,
    type EstadoContenido,
    type FiltroEstado,
} from "./datos";
import { tituloDe } from "./esquemas";
import circulo1 from "../../../assets/admin/circulo-1.svg";
import circulo2 from "../../../assets/admin/circulo-2.svg";
import flechaResumen from "../../../assets/admin/resumen-flecha.svg";
import iconoLapiz from "../../../assets/admin/contenidos/resumen-lapiz.svg";
import iconoReloj from "../../../assets/admin/resumen-clock.svg";
import iconoAlerta from "../../../assets/admin/contenidos/resumen-alerta.svg";
import bandejaLista from "../../../assets/admin/bandeja-list.svg";
import iconoBuscar from "../../../assets/admin/icono-search.svg";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

const POR_PAGINA = 6;

// HU-12 · Editor de contenidos: bandeja "Mis contenidos"
function MisContenidos() {
    const contenidos = useContenidos();
    const [filtro, setFiltro] = useState<FiltroEstado>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    const cuenta = (estado: EstadoContenido) => contenidos.filter((c) => c.estado === estado).length;
    const filtrados = filtrarContenidos(contenidos, filtro, busqueda);
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const actual = Math.min(pagina, paginas - 1);
    const visibles = filtrados.slice(actual * POR_PAGINA, (actual + 1) * POR_PAGINA);

    function elegir(nuevo: FiltroEstado) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const filtros: { valor: FiltroEstado; texto: string }[] = [
        { valor: "todos", texto: `Todos (${contenidos.length})` },
        { valor: "borrador", texto: `Borradores (${cuenta("borrador")})` },
        { valor: "por-autorizar", texto: `Por autorizar (${cuenta("por-autorizar")})` },
        { valor: "observaciones", texto: `Con observaciones (${cuenta("observaciones")})` },
        { valor: "publicado", texto: `Publicados (${cuenta("publicado")})` },
    ];

    const resumen = [
        { icono: iconoLapiz, cantidad: cuenta("borrador"), texto: "Borradores", detalle: "Aún no los has enviado a autorización.", chip: "Ver borradores", tono: "verde" as const, filtro: "borrador" as const },
        { icono: iconoReloj, cantidad: cuenta("por-autorizar"), texto: "Por autorizar", detalle: "Esperan la decisión del Administrador.", chip: "Ver en autorización", tono: "dorado" as const, filtro: "por-autorizar" as const },
        { icono: iconoAlerta, cantidad: cuenta("observaciones"), texto: "Con observaciones", detalle: "Corrige y vuelve a enviar.", chip: "Ver observaciones", tono: "guinda" as const, filtro: "observaciones" as const },
    ];

    return (
        <PanelLayout titulo="Contenidos">
            <nav className="migas-panel" aria-label="Ruta">
                <span>Contenidos</span> › <span>Editor de contenidos</span> › <strong>Bandeja</strong>
            </nav>

            <div className="encabezado-con-accion">
                <EncabezadoPagina
                    etiqueta="CONTENIDOS · EDITOR"
                    titulo="Editor de contenidos"
                    texto="Redacta noticias, reseñas y textos del portal. Lo que envíes lo autoriza y publica el Administrador."
                />
                <Link to="/admin/contenidos/editor/nuevo" className="boton-panel boton-panel--verde boton-panel--grande">
                    + Nuevo contenido
                </Link>
            </div>

            <section className="bloque-resumen">
                <img className="bloque-resumen__circulo bloque-resumen__circulo--1" src={circulo1} alt="" />
                <img className="bloque-resumen__circulo bloque-resumen__circulo--2" src={circulo2} alt="" />
                <div className="bloque-resumen__titular">
                    <span className="bloque-resumen__etiqueta">Editor de contenidos</span>
                    <h2>¿Cómo van tus contenidos?</h2>
                </div>
                <div className="bloque-resumen__tarjetas">
                    {resumen.map((tarjeta, indice) => (
                        <article key={tarjeta.texto} className={`tarjeta-resumen tarjeta-resumen--${indice + 1}`}>
                            <div className="tarjeta-resumen__texto">
                                <span className="tarjeta-resumen__icono"><img src={tarjeta.icono} alt="" /></span>
                                <h3>{tarjeta.cantidad} {tarjeta.texto.toLowerCase()}</h3>
                                <p>{tarjeta.detalle}</p>
                            </div>
                            <div className="tarjeta-resumen__accion">
                                <button
                                    type="button"
                                    className="tarjeta-resumen__flecha"
                                    aria-label={tarjeta.chip}
                                    onClick={() => elegir(tarjeta.filtro)}
                                >
                                    <img src={flechaResumen} alt="" />
                                </button>
                                <Chip tono={tarjeta.tono}>{tarjeta.chip}</Chip>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="tarjeta-panel tarjeta-panel--blanca tarjeta-bandeja">
                <div className="tarjeta-panel__cabecera">
                    <span className="icono-tarjeta icono-tarjeta--verde"><img src={bandejaLista} alt="" /></span>
                    <div className="tarjeta-panel__textos">
                        <h2>Mis contenidos</h2>
                        <p>Del más reciente al más antiguo.</p>
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
                                onClick={() => elegir(opcion.valor)}
                            >
                                {opcion.texto}
                            </button>
                        ))}
                    </div>
                    <label className="buscador">
                        <img src={iconoBuscar} alt="" />
                        <input
                            type="search"
                            placeholder="Buscar por folio o título"
                            aria-label="Buscar por folio o título"
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(0);
                            }}
                        />
                    </label>
                </div>

                {contenidos.length === 0 ? (
                    <EstadoVacio
                        icono={vacioCheck}
                        titulo="Aún no tienes contenidos"
                        texto="Cuando redactes una noticia, reseña o texto del portal aparecerá aquí."
                    />
                ) : visibles.length === 0 ? (
                    <EstadoVacio
                        icono={vacioBuscar}
                        titulo="Sin resultados"
                        texto="No encontramos contenidos con esa búsqueda. Revisa el folio o el título, o quita los filtros."
                        accion={{ texto: "Quitar filtros", alPresionar: () => { setBusqueda(""); elegir("todos"); } }}
                    />
                ) : (
                    <TablaContenidos contenidos={visibles} />
                )}

                {filtrados.length > 0 && (
                    <div className="pie-bandeja">
                        <p>Mostrando {visibles.length} de {filtrados.length} contenidos (ejemplo)</p>
                        <div className="paginacion-panel" role="group" aria-label="Páginas">
                            <button type="button" className="boton-panel boton-panel--contorno boton-panel--chico" disabled={actual === 0} onClick={() => setPagina(actual - 1)}>
                                ‹ Anterior
                            </button>
                            {Array.from({ length: paginas }, (_, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    className={`paginacion-panel__numero ${i === actual ? "paginacion-panel__numero--activo" : ""}`}
                                    aria-current={i === actual ? "page" : undefined}
                                    onClick={() => setPagina(i)}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button type="button" className="boton-panel boton-panel--contorno boton-panel--chico" disabled={actual >= paginas - 1} onClick={() => setPagina(actual + 1)}>
                                Siguiente ›
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </PanelLayout>
    );
}

function TablaContenidos({ contenidos }: { contenidos: Contenido[] }) {
    return (
        <div className="tabla" role="table">
            <div className="tabla__fila tabla__fila--encabezado" role="row">
                <span role="columnheader" style={{ width: 100 }}>FOLIO</span>
                <span role="columnheader" style={{ flex: 1, minWidth: 0 }}>TÍTULO</span>
                <span role="columnheader" style={{ width: 110 }}>TIPO</span>
                <span role="columnheader" style={{ width: 110 }}>AUTORÍA</span>
                <span role="columnheader" style={{ width: 190 }}>ESTADO</span>
                <span role="columnheader" style={{ width: 120 }}>ACTUALIZADO</span>
                <span role="columnheader" style={{ width: 100 }}>ACCIÓN</span>
            </div>
            {contenidos.map((c) => {
                const accion = c.estado === "borrador" ? "Editar" : c.estado === "observaciones" ? "Corregir" : "Ver";
                return (
                    <div key={c.folio} className="tabla__fila" role="row">
                        <span role="cell" className="tabla__fuerte" style={{ width: 100 }}>{c.folio}</span>
                        <span role="cell" className="tabla__fuerte" style={{ flex: 1, minWidth: 0 }}>{tituloDe(c.tipo, c.valores)}</span>
                        <span role="cell" style={{ width: 110 }}>{nombreTipo(c.tipo)}</span>
                        <span role="cell" style={{ width: 110 }}>Tú (Editor)</span>
                        <span role="cell" style={{ width: 190 }}><Chip tono={TONO_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</Chip></span>
                        <span role="cell" style={{ width: 120 }}>{cuandoSeActualizo(c.actualizado)}</span>
                        <span role="cell" style={{ width: 100 }}>
                            <Link to={`/admin/contenidos/editor/${c.folio}`} className="enlace-accion">
                                {accion} →<span className="solo-lectores"> {c.folio}</span>
                            </Link>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default MisContenidos;

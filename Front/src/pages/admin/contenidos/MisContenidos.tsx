import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import { cuandoSeActualizo, filtrarContenidos, nombreTipo, soloMios, useContenidos, YO, type Contenido, type EstadoContenido, type FiltroEstado } from "./datos";
import { tituloDe } from "./esquemas";
import { BloqueResumen, Buscador, ChipEstado, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, type Columna } from "./piezas";
import { clasesBoton, paginar } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/resumen-lapiz.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoAlerta from "../../../assets/admin/contenidos/resumen-alerta-guinda.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const POR_PAGINA = 6;

// HU-12 · Editor de contenidos: bandeja "Mis contenidos" (Figma 557:16085, vacía 559:18581, sin resultados 559:18820)
function MisContenidos() {
    const contenidos = soloMios(useContenidos());
    const [filtro, setFiltro] = useState<FiltroEstado>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    const cuenta = (estado: EstadoContenido) => contenidos.filter((c) => c.estado === estado).length;
    const filtrados = filtrarContenidos(contenidos, filtro, busqueda);
    const { paginas, actual, visibles } = paginar(filtrados, pagina, POR_PAGINA);

    function elegir(nuevo: FiltroEstado) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const columnas: Columna<Contenido>[] = [
        { titulo: "FOLIO", ancho: 100, folio: true, celda: (c) => c.folio },
        { titulo: "TÍTULO", fuerte: true, celda: (c) => tituloDe(c.tipo, c.valores) },
        { titulo: "TIPO", ancho: 120, celda: (c) => nombreTipo(c.tipo) },
        { titulo: "AUTORÍA", ancho: 110, celda: () => YO },
        { titulo: "ESTADO", ancho: 160, celda: (c) => <ChipEstado estado={c.estado} /> },
        { titulo: "ACTUALIZADO", ancho: 110, celda: (c) => cuandoSeActualizo(c.actualizado) },
        {
            titulo: "ACCIÓN",
            ancho: 100,
            celda: (c) => (
                <Link to={`/admin/contenidos/editor/${c.folio}`} className="cn-enlace">
                    {c.estado === "borrador" ? "Editar" : c.estado === "observaciones" ? "Corregir" : "Ver"} →<span className="cn-solo-lectores"> {c.folio}</span>
                </Link>
            ),
        },
    ];

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Editor de contenidos"], ["Bandeja"]]} />

                <Encabezado
                    etiqueta="Contenidos · Editor"
                    titulo="Editor de contenidos"
                    texto="Redacta noticias, reseñas y textos del portal. Lo que envíes lo autoriza y publica el Administrador."
                    accion={<Link to="/admin/contenidos/editor/nuevo" className={clasesBoton("verde")}>+ Nuevo contenido</Link>}
                />

                <BloqueResumen
                    insignia="Editor de contenidos"
                    titulo="¿Cómo van tus"
                    resalte="contenidos?"
                    subtitulo="Tu actividad en el Editor · cifras de ejemplo"
                    accesos={[
                        { icono: iconoLapiz, numero: cuenta("borrador"), titulo: "Borradores", texto: "Aún no los has enviado a autorización.", enlace: "Ver borradores", tono: "verde", activo: filtro === "borrador", alPresionar: () => elegir("borrador") },
                        { icono: iconoReloj, numero: cuenta("por-autorizar"), titulo: "Por autorizar", texto: "Esperan la decisión del Administrador.", enlace: "Ver en autorización", tono: "dorado", activo: filtro === "por-autorizar", alPresionar: () => elegir("por-autorizar") },
                        { icono: iconoAlerta, numero: cuenta("observaciones"), titulo: "Con observaciones", texto: "Corrige y vuelve a enviar.", enlace: "Ver observaciones", tono: "guinda", activo: filtro === "observaciones", alPresionar: () => elegir("observaciones") },
                    ]}
                />

                <Tarjeta icono={iconoLista} titulo="Mis contenidos" subtitulo="Del más reciente al más antiguo.">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todos", texto: `Todos (${contenidos.length})` },
                                { valor: "borrador", texto: `Borradores (${cuenta("borrador")})` },
                                { valor: "por-autorizar", texto: `Por autorizar (${cuenta("por-autorizar")})` },
                                { valor: "observaciones", texto: `Con observaciones (${cuenta("observaciones")})` },
                                { valor: "publicado", texto: `Publicados (${cuenta("publicado")})` },
                            ]}
                        />
                        <Buscador valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>

                    {contenidos.length === 0 ? (
                        <EstadoVacio icono={vacioCheck} titulo="Aún no tienes contenidos" texto="Cuando redactes una noticia, reseña o texto del portal aparecerá aquí." />
                    ) : visibles.length === 0 ? (
                        <EstadoVacio
                            icono={vacioBuscar}
                            titulo={busqueda.trim() ? `Sin resultados para «${busqueda.trim()}»` : "Sin resultados"}
                            texto="Prueba con otra palabra, otro estado o quita los filtros."
                            accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todos"); } }}
                        />
                    ) : (
                        <Tabla columnas={columnas} filas={visibles} clave={(c) => c.folio} />
                    )}

                    {filtrados.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtrados.length} contenidos (ejemplo)</p>
                            {filtro !== "todos" && <button type="button" className={clasesBoton("vino")} onClick={() => elegir("todos")}>Ver todos mis contenidos</button>}
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default MisContenidos;

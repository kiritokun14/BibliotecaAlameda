import { useState } from "react";
import { Link } from "react-router";
import PanelLayout from "../PanelLayout";
import "./Contenidos.css";
import {
    cuandoSeActualizo, diasDesde, filtrarRevision, NOMBRE_ESTADO, nombreTipo, publicadosEsteMes, useContenidos,
    type Contenido, type EstadoContenido, type FiltroRevision,
} from "./datos";
import { tituloDe } from "./esquemas";
import { BloqueResumen, Buscador, ChipEstado, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta, type Columna } from "./piezas";
import { clasesBoton, paginar, redactoCorto } from "./utiles";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-guinda.svg";
import iconoAlerta from "../../../assets/admin/contenidos/resumen-alerta-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import vacioCheck from "../../../assets/admin/contenidos/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const POR_PAGINA = 6;

// HU-12 · Revisión y publicación: bandeja (Figma 560:17410, vacía 561:19259, sin resultados 561:19476)
function BandejaRevision() {
    const todos = useContenidos();
    const [filtro, setFiltro] = useState<FiltroRevision>("por-autorizar");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    const visiblesParaRevision = filtrarRevision(todos, "todos", "");
    const cuenta = (estado: EstadoContenido) => visiblesParaRevision.filter((c) => c.estado === estado).length;
    const porAutorizar = filtrarRevision(todos, "por-autorizar", "");
    const masAntiguo = porAutorizar[0];
    const filtrados = filtrarRevision(todos, filtro, busqueda);
    const { paginas, actual, visibles } = paginar(filtrados, pagina, POR_PAGINA);

    function elegir(nuevo: FiltroRevision) {
        setFiltro(nuevo);
        setPagina(0);
    }

    const columnas: Columna<Contenido>[] = [
        { titulo: "FOLIO", ancho: 110, folio: true, celda: (c) => c.folio },
        { titulo: "TÍTULO", fuerte: true, celda: (c) => tituloDe(c.tipo, c.valores) },
        { titulo: "TIPO", ancho: 130, celda: (c) => nombreTipo(c.tipo) },
        { titulo: "REDACTÓ", ancho: 150, celda: redactoCorto },
        { titulo: "ESTADO", ancho: 190, celda: (c) => <ChipEstado estado={c.estado} ancho /> },
        { titulo: "ENVIADO", ancho: 120, celda: (c) => cuandoSeActualizo(c.enviado ?? c.actualizado) },
        {
            titulo: "ACCIÓN",
            ancho: 110,
            celda: (c) => (
                <Link to={`/admin/contenidos/revision/${c.folio}`} className="cn-enlace">
                    {c.estado === "por-autorizar" ? "Revisar" : "Ver"} →<span className="cn-solo-lectores"> {c.folio}</span>
                </Link>
            ),
        },
    ];

    const nombreFiltro = filtro === "todos" ? "contenidos" : NOMBRE_ESTADO[filtro as EstadoContenido].toLowerCase();

    return (
        <PanelLayout titulo="Contenidos">
            <Pagina>
                <Migas pasos={[["Contenidos"], ["Revisión y publicación"], [filtro === "todos" ? "Todos" : NOMBRE_ESTADO[filtro as EstadoContenido]]]} />

                <Encabezado
                    etiqueta="Contenidos · Revisión y publicación"
                    titulo="Revisión y publicación"
                    texto="Autoriza, pide cambios o rechaza lo que redacta el Editor. Solo tú publicas en el portal."
                    accion={<Link to="/admin/contenidos/revision/historial" className={clasesBoton("contorno")}>Historial de publicaciones</Link>}
                />

                <BloqueResumen
                    insignia="Revisión y publicación"
                    titulo="¿Qué espera tu"
                    resalte="decisión?"
                    subtitulo="Lo que espera tu decisión como Administrador · cifras de ejemplo"
                    accesos={[
                        {
                            icono: iconoReloj, numero: porAutorizar.length, titulo: "Por autorizar", tono: "guinda", enlace: "Ver por autorizar",
                            texto: masAntiguo ? `El más antiguo lleva ${diasDesde(masAntiguo.enviado ?? masAntiguo.actualizado)} días.` : "No hay nada pendiente.",
                            activo: filtro === "por-autorizar", alPresionar: () => elegir("por-autorizar"),
                        },
                        { icono: iconoAlerta, numero: cuenta("observaciones"), titulo: "Con observaciones", texto: "Esperan correcciones del Editor.", enlace: "Ver observaciones", tono: "dorado", activo: filtro === "observaciones", alPresionar: () => elegir("observaciones") },
                        { icono: iconoCheck, numero: publicadosEsteMes(todos), titulo: "Publicados este mes", texto: "Registrados en la bitácora.", enlace: "Ver publicados", tono: "verde", activo: filtro === "publicado", alPresionar: () => elegir("publicado") },
                    ]}
                />

                <Tarjeta icono={iconoLista} titulo="Bandeja de contenidos" subtitulo="Del más antiguo al más reciente.">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todos", texto: `Todos (${visiblesParaRevision.length})` },
                                { valor: "por-autorizar", texto: `Por autorizar (${cuenta("por-autorizar")})` },
                                { valor: "observaciones", texto: `Con observaciones (${cuenta("observaciones")})` },
                                { valor: "publicado", texto: `Publicados (${cuenta("publicado")})` },
                                { valor: "rechazado", texto: `Rechazados (${cuenta("rechazado")})` },
                            ]}
                        />
                        <Buscador valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>

                    {visibles.length === 0 ? (
                        busqueda.trim() ? (
                            <EstadoVacio
                                icono={vacioBuscar}
                                titulo={`Sin resultados para «${busqueda.trim()}»`}
                                texto="Prueba con otra palabra, otro estado o quita los filtros."
                                accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todos"); } }}
                            />
                        ) : (
                            <EstadoVacio
                                icono={vacioCheck}
                                titulo={filtro === "por-autorizar" ? "No hay contenidos por autorizar" : `No hay contenidos ${filtro === "todos" ? "en la bandeja" : nombreFiltro}`}
                                texto="Cuando el Editor envíe algo, aparecerá aquí con su folio y fecha de envío."
                            />
                        )
                    ) : (
                        <Tabla columnas={columnas} filas={visibles} clave={(c) => c.folio} />
                    )}

                    {filtrados.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtrados.length} {nombreFiltro} (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                            {filtro !== "todos" && <button type="button" className={clasesBoton("vino")} onClick={() => elegir("todos")}>Ver todos los contenidos</button>}
                        </div>
                    )}
                </Tarjeta>

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default BandejaRevision;

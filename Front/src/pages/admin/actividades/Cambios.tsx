import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "./datos";
import { NOMBRE_ESTADO_CAMBIO, useCambios, type Cambio, type FiltroCambio } from "./cambios";
import { BASE_CAMBIOS, TONO_CAMBIO } from "./utiles";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoTarjeta from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoRelojTarjeta from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const POR_PAGINA = 6;

// Actividades · Cambios y cancelaciones: bandeja (Figma 569:22126, sin cambios 569:25772, sin resultados 569:26013)
// e historial (569:25331)
function Cambios() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const cambios = useCambios();
    const [filtro, setFiltro] = useState<FiltroCambio>("todos");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    if (params.get("vista") === "historial") return <Historial cambios={cambios} />;

    const texto = busqueda.trim().toLowerCase();
    const cuenta = (e: FiltroCambio) => cambios.filter((c) => e === "todos" || c.estado === e).length;
    const filtrados = [...cambios]
        .sort((a, b) => b.folio.localeCompare(a.folio))
        .filter((c) => (filtro === "todos" || c.estado === filtro) && (!texto || c.folio.toLowerCase().includes(texto) || c.nombre.toLowerCase().includes(texto)));
    const { paginas, actual, visibles } = paginar(filtrados, pagina, POR_PAGINA);
    const elegir = (f: FiltroCambio) => { setFiltro(f); setPagina(0); };

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones"], ["Bandeja"]]} />
                <Encabezado etiqueta="Actividades · Cambios" titulo="Cambios y cancelaciones" texto="Solicita, revisa y aplica cambios a actividades ya programadas, avisando a quienes se inscribieron." />
                <BloqueResumen
                    insignia="Cambios y cancelaciones"
                    titulo="Cambios por"
                    resalte="atender"
                    subtitulo="Reprogramaciones y cancelaciones de actividades · cifras de ejemplo"
                    accesos={[
                        { icono: iconoReloj, numero: cuenta("pendiente"), titulo: "Pendientes", texto: "Esperan decisión", enlace: "Ver pendientes", tono: "dorado", activo: filtro === "pendiente", alPresionar: () => elegir("pendiente") },
                        { icono: iconoCheck, numero: cuenta("aplicado"), titulo: "Aplicados", texto: "Este mes", enlace: "Ver aplicados", tono: "verde", activo: filtro === "aplicado", alPresionar: () => elegir("aplicado") },
                        { icono: iconoX, numero: cuenta("rechazado"), titulo: cuenta("rechazado") === 1 ? "Rechazado" : "Rechazados", texto: "Este mes", enlace: "Ver rechazados", tono: "guinda", activo: filtro === "rechazado", alPresionar: () => elegir("rechazado") },
                        { icono: iconoArchivo, numero: cambios.reduce((s, c) => s + c.avisados, 0), titulo: "Personas avisadas", texto: "Este mes (ejemplo)", enlace: "Ver historial", tono: "verde", alPresionar: () => navigate(`${BASE_CAMBIOS}?vista=historial`) },
                    ]}
                />
                <div className="cn-acciones">
                    <Link to={`${BASE_CAMBIOS}/cancelar`} className={clasesBoton("contorno-guinda")}>Cancelar una actividad</Link>
                    <Link to={`${BASE_CAMBIOS}/reprogramar`} className={clasesBoton("contorno")}>Reprogramar una actividad</Link>
                </div>
                <Tarjeta icono={iconoTarjeta} titulo="Cambios solicitados" subtitulo="Más recientes primero.">
                    <div className="cn-barra">
                        <Filtros
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todos", texto: `Todos (${cuenta("todos")})` },
                                { valor: "pendiente", texto: `Pendientes (${cuenta("pendiente")})` },
                                { valor: "aplicado", texto: `Aplicados (${cuenta("aplicado")})` },
                                { valor: "rechazado", texto: `Rechazados (${cuenta("rechazado")})` },
                            ]}
                        />
                        <Buscador texto="Buscar por folio o actividad" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>
                    {cambios.length === 0 ? (
                        <EstadoVacio icono={vacioArchivo} titulo="Aún no hay cambios" texto="Cuando alguien pida reprogramar o cancelar una actividad, aparecerá aquí." />
                    ) : visibles.length === 0 ? (
                        <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay cambios con este estado"} texto="Prueba con otra palabra, otro estado o quita los filtros." accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todos"); } }} />
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FOLIO", ancho: 90, folio: true, celda: (c: Cambio) => c.folio },
                                { titulo: "ACTIVIDAD", fuerte: true, celda: (c: Cambio) => c.nombre },
                                { titulo: "CAMBIO", ancho: 150, celda: (c: Cambio) => c.tipo },
                                { titulo: "INSCRITOS", ancho: 90, celda: (c: Cambio) => c.inscritos },
                                { titulo: "SOLICITÓ", ancho: 170, celda: (c: Cambio) => c.solicito },
                                { titulo: "ESTADO", ancho: 130, celda: (c: Cambio) => <Chip tono={TONO_CAMBIO[c.estado]} ancho={120}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</Chip> },
                                { titulo: "ACCIÓN", ancho: 90, celda: (c: Cambio) => <Link to={`${BASE_CAMBIOS}/${c.folio}`} className="cn-enlace">{c.estado === "pendiente" ? "Revisar" : "Abrir"} →<span className="cn-solo-lectores"> {c.folio}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(c) => c.folio}
                        />
                    )}
                    {filtrados.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtrados.length} cambios (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                    <div className="cn-acciones">
                        <Link to={`${BASE_CAMBIOS}?vista=historial`} className={clasesBoton("suave")}>Ver historial de cambios</Link>
                    </div>
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function Historial({ cambios }: { cambios: Cambio[] }) {
    const aplicados = cambios.filter((c) => c.estado === "aplicado").sort((a, b) => b.aplico!.fecha.localeCompare(a.aplico!.fecha));
    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones", BASE_CAMBIOS], ["Historial"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cambios y cancelaciones", ruta: BASE_CAMBIOS }} etiqueta="Cambios y cancelaciones" titulo="Historial de cambios" texto="Registro de todo lo aplicado, con fecha y responsable." />
                <Tarjeta icono={iconoRelojTarjeta} titulo="Cambios aplicados">
                    {aplicados.length === 0 ? (
                        <EstadoVacio icono={vacioArchivo} titulo="Todavía no hay cambios aplicados" texto="Lo que apliques aparecerá aquí con su responsable." />
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "FOLIO", ancho: 90, folio: true, celda: (c: Cambio) => <Link to={`${BASE_CAMBIOS}/${c.folio}`} className="cn-enlace">{c.folio}</Link> },
                                    { titulo: "ACTIVIDAD", fuerte: true, celda: (c: Cambio) => c.nombre },
                                    { titulo: "CAMBIO", ancho: 160, celda: (c: Cambio) => c.tipo },
                                    { titulo: "APLICÓ", ancho: 190, celda: (c: Cambio) => c.aplico!.quien },
                                    { titulo: "FECHA", ancho: 120, celda: (c: Cambio) => fechaCorta(c.aplico!.fecha) },
                                    { titulo: "AVISADOS", ancho: 90, celda: (c: Cambio) => c.avisados },
                                ]}
                                filas={aplicados}
                                clave={(c) => c.folio}
                            />
                            <p className="cn-nota">{aplicados.length} registros (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Cambios;

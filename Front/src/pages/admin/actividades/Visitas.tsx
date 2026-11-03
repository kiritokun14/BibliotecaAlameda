import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "./datos";
import { enFiltro, NOMBRE_ESTADO_VISITA, useVisitas, type FiltroVisita, type UsoEspacio, type Visita } from "./visitas";
import { BASE_VISITAS, TONO_VISITA } from "./utiles";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoTarjeta from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoCalendario from "../../../assets/admin/actividades/tarjeta-calendario.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const POR_PAGINA = 6;

// Actividades · Visitas y uso de espacios: bandeja (Figma 567:20782, sin solicitudes 567:24903, sin resultados 567:25143)
// y registro de uso (567:23137)
function Visitas() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const uso = params.get("vista") === "uso";
    const { visitas, usos } = useVisitas();
    const [filtro, setFiltro] = useState<FiltroVisita>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const texto = busqueda.trim().toLowerCase();

    function cambiarVista(v: "visitas" | "uso") {
        setParams(v === "uso" ? { vista: "uso" } : {});
        setBusqueda("");
        setPagina(0);
    }
    function elegir(f: FiltroVisita) {
        setFiltro(f);
        setPagina(0);
    }

    const cuenta = (f: FiltroVisita) => visitas.filter((v) => enFiltro(v, f)).length;
    const filtradas = [...visitas]
        .sort((a, b) => b.folio.localeCompare(a.folio))
        .filter((v) => enFiltro(v, filtro) && (!texto || v.folio.toLowerCase().includes(texto) || v.grupo.toLowerCase().includes(texto)));
    const usosFiltrados = usos.filter((u) => !texto || u.sala.toLowerCase().includes(texto) || u.fecha.includes(texto) || fechaCorta(u.fecha).includes(texto));
    const { paginas, actual, visibles } = paginar(filtradas, pagina, POR_PAGINA);

    const pestanas = (
        <div className="cn-barra">
            <Filtros etiqueta="Qué ver" valor={uso ? "uso" : "visitas"} alCambiar={cambiarVista} opciones={[{ valor: "visitas", texto: "Visitas" }, { valor: "uso", texto: "Uso de espacios" }]} />
            <Buscador texto={uso ? "Buscar por sala o fecha" : "Buscar por folio o grupo"} valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
        </div>
    );
    const limpiar = { texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todas"); } };

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios"], [uso ? "Registro" : "Bandeja"]]} />

                {uso ? (
                    <>
                        <Encabezado etiqueta="Actividades · Uso de espacios" titulo="Uso de espacios" texto="Registro de cómo se usó cada sala." />
                        <BloqueResumen
                            insignia="Visitas y uso de espacios"
                            titulo="Uso de"
                            resalte="espacios"
                            subtitulo="Cómo se usaron las salas este mes · cifras de ejemplo"
                            accesos={[
                                { icono: iconoArchivo, numero: usos.filter((u) => u.estado === "registrado").length, titulo: "Registros del mes", texto: "Usos registrados (ejemplo)", enlace: "Ver registro", tono: "verde", alPresionar: () => setBusqueda("") },
                                { icono: iconoCheck, numero: new Set(usos.map((u) => u.sala)).size, titulo: "Salas usadas", texto: "Con al menos un uso (ejemplo)", enlace: "Ver salas", tono: "verde", alPresionar: () => setBusqueda("") },
                                { icono: iconoReloj, numero: usos.filter((u) => u.estado === "por-registrar").length, titulo: "Por registrar", texto: "Usos sin registrar (ejemplo)", enlace: "Registrar uso", tono: "dorado", alPresionar: () => navigate(`${BASE_VISITAS}/uso/registrar`) },
                            ]}
                        />
                        <Tarjeta icono={iconoCalendario} titulo="Registro de uso" subtitulo="Última semana (ejemplo).">
                            {pestanas}
                            {usosFiltrados.length === 0 ? (
                                <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "Sin registros de uso"} texto="Prueba con otra sala o fecha." accion={texto ? { texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") } : undefined} />
                            ) : (
                                <>
                                    <Tabla
                                        columnas={[
                                            { titulo: "FECHA", ancho: 120, folio: true, celda: (u: UsoEspacio) => fechaCorta(u.fecha) },
                                            { titulo: "SALA", ancho: 170, fuerte: true, celda: (u: UsoEspacio) => u.sala },
                                            { titulo: "USO", celda: (u: UsoEspacio) => u.actividad || "Uso libre" },
                                            { titulo: "PERSONAS", ancho: 90, celda: (u: UsoEspacio) => u.personas },
                                            { titulo: "HORAS", ancho: 70, celda: (u: UsoEspacio) => u.horas },
                                            { titulo: "ESTADO", ancho: 150, celda: (u: UsoEspacio) => <Chip tono={u.estado === "registrado" ? "verde" : "dorado"} ancho={140}>{u.estado === "registrado" ? "Registrado" : "Por registrar"}</Chip> },
                                            {
                                                titulo: "ACCIÓN",
                                                ancho: 100,
                                                celda: (u: UsoEspacio) => u.estado === "registrado"
                                                    ? <Link to={`${BASE_VISITAS}/uso/${u.id}`} className="cn-enlace">Ver →<span className="cn-solo-lectores"> {u.sala} {fechaCorta(u.fecha)}</span></Link>
                                                    : <Link to={`${BASE_VISITAS}/uso/registrar?id=${u.id}`} className="cn-enlace">Registrar →<span className="cn-solo-lectores"> {u.sala} {fechaCorta(u.fecha)}</span></Link>,
                                            },
                                        ]}
                                        filas={usosFiltrados}
                                        clave={(u) => u.id}
                                    />
                                    <p className="cn-nota">{usosFiltrados.length} registros (ejemplo)</p>
                                </>
                            )}
                        </Tarjeta>
                        <div className="cn-acciones">
                            <Link to={`${BASE_VISITAS}/uso/registrar`} className={clasesBoton("verde")}>Registrar uso de un espacio</Link>
                        </div>
                    </>
                ) : (
                    <>
                        <Encabezado etiqueta="Actividades · Visitas" titulo="Visitas y uso de espacios" texto="Solicitudes de visitas de grupos y registro de cómo se usan las salas." />
                        <BloqueResumen
                            insignia="Visitas y uso de espacios"
                            titulo="Visitas por"
                            resalte="atender"
                            subtitulo="Solicitudes de grupos y uso de salas · cifras de ejemplo"
                            accesos={[
                                { icono: iconoReloj, numero: cuenta("por-confirmar"), titulo: "Por confirmar", texto: "Esperan respuesta", enlace: "Ver por confirmar", tono: "dorado", activo: filtro === "por-confirmar", alPresionar: () => elegir("por-confirmar") },
                                { icono: iconoCheck, numero: cuenta("confirmada"), titulo: "Confirmadas", texto: "Próximas", enlace: "Ver confirmadas", tono: "verde", activo: filtro === "confirmada", alPresionar: () => elegir("confirmada") },
                                { icono: iconoArchivo, numero: cuenta("realizada"), titulo: "Realizadas", texto: "Este mes", enlace: "Ver realizadas", tono: "verde", activo: filtro === "realizada", alPresionar: () => elegir("realizada") },
                                { icono: iconoX, numero: cuenta("cancelada"), titulo: "Canceladas", texto: "Este mes", enlace: "Ver canceladas", tono: "guinda", activo: filtro === "cancelada", alPresionar: () => elegir("cancelada") },
                            ]}
                        />
                        <Tarjeta icono={iconoTarjeta} titulo="Solicitudes de visita" subtitulo="Más recientes primero.">
                            {pestanas}
                            <Filtros
                                valor={filtro}
                                alCambiar={elegir}
                                opciones={[
                                    { valor: "todas", texto: `Todas (${visitas.length})` },
                                    { valor: "por-confirmar", texto: `Por confirmar (${cuenta("por-confirmar")})` },
                                    { valor: "confirmada", texto: `Confirmadas (${cuenta("confirmada")})` },
                                    { valor: "realizada", texto: `Realizadas (${cuenta("realizada")})` },
                                    { valor: "cancelada", texto: `Canceladas (${cuenta("cancelada")})` },
                                ]}
                            />
                            {visitas.length === 0 ? (
                                <EstadoVacio icono={vacioArchivo} titulo="Aún no hay solicitudes de visita" texto="Cuando un grupo pida una visita desde el portal, aparecerá aquí." />
                            ) : visibles.length === 0 ? (
                                <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay visitas con este estado"} texto="Prueba con otra palabra, otro estado o quita los filtros." accion={limpiar} />
                            ) : (
                                <Tabla
                                    columnas={[
                                        { titulo: "FOLIO", ancho: 90, folio: true, celda: (v: Visita) => v.folio },
                                        { titulo: "GRUPO O INSTITUCIÓN", fuerte: true, celda: (v: Visita) => v.grupo },
                                        { titulo: "PERSONAS", ancho: 90, celda: (v: Visita) => v.personas },
                                        { titulo: "FECHA SOLICITADA", ancho: 140, celda: (v: Visita) => fechaCorta(v.fecha) },
                                        { titulo: "ESPACIO", ancho: 150, celda: (v: Visita) => v.espacio },
                                        { titulo: "ESTADO", ancho: 160, celda: (v: Visita) => <Chip tono={TONO_VISITA[v.estado]} ancho={150}>{NOMBRE_ESTADO_VISITA[v.estado]}</Chip> },
                                        { titulo: "ACCIÓN", ancho: 90, celda: (v: Visita) => <Link to={`${BASE_VISITAS}/${v.folio}`} className="cn-enlace">{v.estado === "por-confirmar" ? "Revisar" : "Abrir"} →<span className="cn-solo-lectores"> {v.folio}</span></Link> },
                                    ]}
                                    filas={visibles}
                                    clave={(v) => v.folio}
                                />
                            )}
                            {filtradas.length > 0 && (
                                <div className="cn-pie-tabla">
                                    <p>Mostrando {visibles.length} de {filtradas.length} visitas (ejemplo)</p>
                                    <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                                </div>
                            )}
                        </Tarjeta>
                    </>
                )}
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Visitas;

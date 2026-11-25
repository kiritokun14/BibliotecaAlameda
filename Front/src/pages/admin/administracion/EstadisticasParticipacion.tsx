import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { ahoraTepic } from "../../../servicios/vigenciaActividades";
import {
    consultarParticipacion, descargarParticipacion, guardarConteo,
    type CapturaEstadistica, type DiaParticipacion, type FiltrosParticipacion,
    type ReporteParticipacion, type SesionParticipacion,
} from "../../../servicios/estadisticas";
import { CeldaDoble, PieLista, TablaLista } from "../actividades/PiezasLista";
import { Aviso, Encabezado, Icono, Plegable, Segmentado, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";
import { Ventana } from "../Ventana";
import modalInfo from "../../../assets/admin/modal-info.svg";
import { ErrorCarga } from "./comun";
import type { Periodo } from "./datos";
import { errorConteo, errorPeriodo, fechasParticipacion, MAXIMO_CONTEO, MAXIMO_REFERENCIA } from "./participacion";
import { descargarArchivo, useCarga } from "./utiles";
import "./EstadisticasParticipacion.css";

type VistaDetalle = "dias" | "sesiones";
type PeriodoSeleccionado = Periodo | "personalizado";
type Objetivo = {
    tipo: "visitas-generales" | "incidencias";
    clave: string;
    etiqueta: string;
    registro: CapturaEstadistica | null;
};

const PERIODOS: { valor: PeriodoSeleccionado; texto: string }[] = [
    { valor: "30dias", texto: "Últimos 30 días" }, { valor: "mes", texto: "Este mes" },
    { valor: "anio", texto: "Este año" }, { valor: "personalizado", texto: "Personalizado" },
];
const VISTAS: { valor: VistaDetalle; texto: string }[] = [{ valor: "dias", texto: "Por día" }, { valor: "sesiones", texto: "Por sesión" }];
const POR_PAGINA = 7;
const ESTADOS: Record<string, string> = { programada: "Programada", en_curso: "En curso", finalizada: "Finalizada", cancelada: "Cancelada" };
const fechaCorta = (fecha: string) => fecha.split("-").reverse().join("/");
const numero = (total: number) => total.toLocaleString("es-MX");
const cantidad = (total: number | null) => total === null ? "Sin registro" : numero(total);

export default function EstadisticasParticipacion({ secciones }: { secciones?: ReactNode }) {
    const id = useId();
    const [filtros, setFiltros] = useState<FiltrosParticipacion>(() => ({ ...fechasParticipacion("30dias"), actividadId: "" }));
    const [fechas, setFechas] = useState(filtros);
    const [periodo, setPeriodo] = useState<PeriodoSeleccionado>("30dias");
    const [filtroError, setFiltroError] = useState("");
    const [vista, setVista] = useState<VistaDetalle>("dias");
    const [objetivo, setObjetivo] = useState<Objetivo | null>(null);
    const [exportando, setExportando] = useState(false);
    const [aviso, setAviso] = useState("");
    const [errorExportacion, setErrorExportacion] = useState("");
    const exportacion = useRef<symbol | null>(null);
    useEffect(() => () => { exportacion.current = null; }, []);
    const clave = [filtros.desde, filtros.hasta, filtros.actividadId].join("|");
    const { datos, error, cargando, recargar } = useCarga(clave, () => consultarParticipacion(filtros));
    const [catalogo, setCatalogo] = useState<ReporteParticipacion["actividades"]>([]);
    if (datos && catalogo !== datos.actividades) setCatalogo(datos.actividades);

    function aplicar(nuevos: FiltrosParticipacion) {
        exportacion.current = null;
        setExportando(false);
        setFiltroError("");
        setAviso("");
        setErrorExportacion("");
        setFiltros(nuevos);
    }

    function cambiarPeriodo(valor: PeriodoSeleccionado) {
        setPeriodo(valor);
        if (valor === "personalizado") return;
        const nuevos = { ...filtros, ...fechasParticipacion(valor) };
        setFechas(nuevos);
        aplicar(nuevos);
    }

    function cambiarActividad(actividadId: string) {
        aplicar({ ...filtros, actividadId });
    }

    function consultarFechas(evento: FormEvent) {
        evento.preventDefault();
        const mensaje = errorPeriodo(fechas.desde, fechas.hasta);
        if (mensaje) {
            setFiltroError(mensaje);
            return;
        }
        aplicar({ desde: fechas.desde, hasta: fechas.hasta, actividadId: filtros.actividadId });
    }

    async function exportar() {
        const solicitud = Symbol();
        exportacion.current = solicitud;
        setExportando(true);
        setAviso("");
        setErrorExportacion("");
        try {
            const archivo = await descargarParticipacion(filtros);
            if (exportacion.current !== solicitud) return;
            descargarArchivo("participacion-" + filtros.desde + "-" + filtros.hasta + ".csv", archivo);
            setAviso("Se descargó el CSV del periodo y ámbito consultados.");
        } catch (error) {
            if (exportacion.current === solicitud) setErrorExportacion(mensajeError(error));
        } finally {
            if (exportacion.current === solicitud) {
                exportacion.current = null;
                setExportando(false);
            }
        }
    }

    return <>
        <Encabezado titulo="Estadísticas" texto="Consulta y exporta los conteos de participación y atención.">
            <button type="button" className="pz-boton pz-boton--contorno" disabled={!datos || exportando} onClick={exportar}>
                {exportando ? "Descargando…" : "Exportar en CSV"}
            </button>
        </Encabezado>
        <section className="pz-tarjeta cal-barra est-barra" aria-label="Filtros de participación">
            {secciones && <div className="cal-barra__fila">{secciones}</div>}
            <div className="cal-barra__fila est-participacion__filtros">
                <div className="est-barra__grupo"><span>Periodo</span>
                    <Segmentado etiqueta="Periodo" valor={periodo} opciones={PERIODOS} alCambiar={cambiarPeriodo} />
                </div>
                <label className="pz-campo est-barra__grupo"><span>Ámbito</span>
                    <select value={filtros.actividadId} onChange={(evento) => cambiarActividad(evento.target.value)}>
                        <option value="">{datos?.ambito === "actividades_asignadas" ? "Actividades asignadas" : "Todas las actividades disponibles"}</option>
                        {catalogo.map((actividad) => <option key={actividad.id} value={actividad.id}>{actividad.folio} · {actividad.titulo}</option>)}
                    </select>
                </label>
            </div>
            {periodo === "personalizado" && <form className="cal-barra__fila est-participacion__fechas" onSubmit={consultarFechas}>
                <label className="pz-campo pz-campo--lleno"><span>Desde</span>
                    <input type="date" required value={fechas.desde} onChange={(evento) => setFechas({ ...fechas, desde: evento.target.value })} />
                </label>
                <label className="pz-campo pz-campo--lleno"><span>Hasta</span>
                    <input type="date" required value={fechas.hasta} onChange={(evento) => setFechas({ ...fechas, hasta: evento.target.value })} />
                </label>
                <button type="submit" className="pz-boton">Consultar periodo</button>
            </form>}
            {filtroError && <Aviso tono="error" titulo="Revisa el periodo." texto={filtroError} />}
        </section>

        {aviso && <Aviso titulo={aviso} />}
        {errorExportacion && <Aviso tono="error" titulo="No se pudo descargar el CSV." texto={errorExportacion} />}
        {error && <ErrorCarga titulo="No se pudo cargar el informe" texto={error} alReintentar={recargar} />}
        {cargando && <EsqueletoLista texto="Cargando estadísticas de participación…" />}
        {datos && <>
            <ResumenReporte datos={datos} />
            <DetalleReporte key={clave} id={id} datos={datos} vista={vista} alCambiarVista={setVista} alCapturar={setObjetivo} />
            <OrigenConteos datos={datos} />
        </>}
        {objetivo && <VentanaConteo objetivo={objetivo} alCerrar={() => setObjetivo(null)} alActualizar={() => {
            setObjetivo(null);
            recargar();
        }} alGuardar={() => {
            setObjetivo(null);
            setAviso("Se guardó el conteo.");
            recargar();
        }} />}
    </>;
}

function Indicador({ titulo, valor, detalle, icono, principal = false }: {
    titulo: string; valor: number | null; detalle: string; icono: NombreIcono; principal?: boolean;
}) {
    return <article className={principal ? "est-indicador est-indicador--principal" : "est-indicador"}>
        <span className="est-indicador__icono" aria-hidden="true"><Icono nombre={icono} /></span>
        <p className={"est-indicador__valor" + (valor === null ? " est-participacion__sin-cifra" : "")}>{cantidad(valor)}</p>
        <p className="est-indicador__titulo">{titulo}</p>
        <p className="est-indicador__detalle">{detalle}</p>
    </article>;
}

function incluyeBiblioteca(datos: ReporteParticipacion) {
    return datos.ambito === "global" && !datos.actividadId;
}

function ResumenReporte({ datos }: { datos: ReporteParticipacion }) {
    const id = useId();
    const { totales } = datos;
    const periodo = fechaCorta(datos.desde) + " al " + fechaCorta(datos.hasta);
    return <>
        <Tarjeta id={id + "-participacion"} titulo="Participación en actividades" texto={periodo} icono="asistencia">
            <div className="est-indicadores" role="group" aria-label="Participación">
                <Indicador titulo="Solicitudes de inscripción" valor={totales.solicitudes} detalle="Solicitudes de las sesiones del periodo" icono="inscripciones" />
                <Indicador titulo="Inscripciones confirmadas" valor={totales.confirmaciones} detalle="Con confirmación vigente" icono="check" />
                <Indicador titulo="Asistencia real" valor={totales.asistencias} detalle={numero(totales.listasCerradas) + " listas cerradas"} icono="asistencia" principal />
                <Indicador titulo="Incidencias registradas" valor={totales.incidencias} detalle={numero(totales.sesionesConIncidencias) + " sesiones con incidencias"} icono="alerta" />
            </div>
            <div className="est-resumen">
                <span><small>Sesiones realizadas</small><strong>{numero(totales.sesionesRealizadas)}</strong></span>
                <span><small>Sesiones canceladas</small><strong>{numero(totales.sesionesCanceladas)}</strong></span>
                <span><small>Ausencias registradas</small><strong>{numero(totales.ausencias)}</strong></span>
            </div>
        </Tarjeta>
        {incluyeBiblioteca(datos) && <Tarjeta id={id + "-biblioteca"} titulo="Visitas y atenciones de biblioteca" icono="espacios">
            <div className="est-indicadores est-participacion__biblioteca" role="group" aria-label="Biblioteca">
                <Indicador titulo="Visitas generales" valor={totales.visitasGenerales} detalle={numero(totales.diasConVisitas ?? 0) + " días con conteo registrado"} icono="espacios" />
                <Indicador titulo="Atenciones cerradas" valor={totales.atenciones} detalle="Contactos y solicitudes de Bibliocomunidad" icono="mensajes" />
            </div>
        </Tarjeta>}
    </>;
}

function DetalleReporte({ datos, id, vista, alCambiarVista, alCapturar }: {
    datos: ReporteParticipacion; id: string; vista: VistaDetalle; alCambiarVista: (valor: VistaDetalle) => void; alCapturar: (objetivo: Objetivo) => void;
}) {
    const [pagina, setPagina] = useState(1);
    const cantidadFilas = vista === "dias" ? datos.dias.length : datos.sesiones.length;
    const paginas = Math.max(1, Math.ceil(cantidadFilas / POR_PAGINA));
    const actual = Math.min(pagina, paginas);
    const inicio = (actual - 1) * POR_PAGINA;
    const dias = [...datos.dias].reverse().slice(inicio, inicio + POR_PAGINA);
    const sesiones = [...datos.sesiones].reverse().slice(inicio, inicio + POR_PAGINA);
    const biblioteca = incluyeBiblioteca(datos);
    const hoy = ahoraTepic().fecha;

    return <Tarjeta id={id + "-detalle"} titulo="Desglose del periodo" icono="lista"
        accion={<Segmentado etiqueta="Desglose" valor={vista} opciones={VISTAS} alCambiar={(valor) => {
            alCambiarVista(valor);
            setPagina(1);
        }} />}>
        {cantidadFilas === 0 ? <Vacio titulo="Sin datos para este periodo" texto="Consulta otro periodo o actividad." icono="estadisticas" />
            : vista === "dias" ? <TablaLista<DiaParticipacion> etiqueta="Conteos por día" clave={(dia) => dia.fecha} filas={dias}
                clase={"est-tabla-dia" + (biblioteca ? " est-tabla-dia--biblioteca" : "") + (datos.puedeRegistrarVisitas ? " est-tabla-dia--captura" : "")}
                columnas={[
                    { titulo: "Fecha", celda: (dia) => fechaCorta(dia.fecha) },
                    { titulo: "Solicitudes", celda: (dia) => numero(dia.solicitudes) },
                    { titulo: "Confirmadas", celda: (dia) => numero(dia.confirmaciones) },
                    { titulo: "Asistencia real", celda: (dia) => numero(dia.asistencias) },
                    { titulo: "Incidencias", celda: (dia) => cantidad(dia.incidencias) },
                    ...(biblioteca ? [
                        { titulo: "Visitas generales", celda: (dia: DiaParticipacion) => <CeldaDoble arriba={cantidad(dia.visitasGenerales)} abajo={dia.registroVisitas?.referencia} /> },
                        { titulo: "Atenciones", celda: (dia: DiaParticipacion) => cantidad(dia.atenciones) },
                    ] : []),
                    ...(datos.puedeRegistrarVisitas ? [{ titulo: "Registro", celda: (dia: DiaParticipacion) => dia.fecha <= hoy ?
                        <BotonConteo registro={dia.registroVisitas} etiqueta={"visitas del " + fechaCorta(dia.fecha)} alCapturar={() =>
                            alCapturar({ tipo: "visitas-generales", clave: dia.fecha, etiqueta: fechaCorta(dia.fecha), registro: dia.registroVisitas })} /> : "—",
                    }] : []),
                ]} />
                : <TablaLista<SesionParticipacion> etiqueta="Conteos por sesión" clave={(sesion) => sesion.id} filas={sesiones} clase="est-tabla-sesion"
                    columnas={[
                        { titulo: "Sesión", celda: (sesion) => <CeldaDoble arriba={sesion.titulo} abajo={[sesion.folio, fechaCorta(sesion.fecha), ESTADOS[sesion.estado]].filter(Boolean).join(" · ")} /> },
                        { titulo: "Solicitudes", celda: (sesion) => numero(sesion.solicitudes) },
                        { titulo: "Confirmadas", celda: (sesion) => numero(sesion.confirmaciones) },
                        { titulo: "Asistencia real", celda: (sesion) => sesion.listaCerrada ? numero(sesion.asistencias) : "Sin lista cerrada" },
                        { titulo: "Ausencias", celda: (sesion) => sesion.listaCerrada ? numero(sesion.ausencias) : "—" },
                        { titulo: "Incidencias", celda: (sesion) => <span className="at-celda at-celda-doble">
                            <CeldaDoble arriba={cantidad(sesion.incidencias)} abajo={sesion.registroIncidencias?.referencia} />
                            {sesion.puedeRegistrarIncidencias && <BotonConteo registro={sesion.registroIncidencias} etiqueta={"incidencias de " + sesion.titulo}
                                alCapturar={() => alCapturar({ tipo: "incidencias", clave: sesion.id, etiqueta: sesion.titulo + " · " + fechaCorta(sesion.fecha), registro: sesion.registroIncidencias })} />}
                        </span> },
                    ]} />}
        <PieLista texto={numero(cantidadFilas) + (vista === "dias" ? " días" : " sesiones")} pagina={actual - 1} paginas={paginas} alCambiar={(valor) => setPagina(valor + 1)} />
    </Tarjeta>;
}

function BotonConteo({ registro, etiqueta, alCapturar }: { registro: CapturaEstadistica | null; etiqueta: string; alCapturar: () => void }) {
    return <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alCapturar}>
        {registro ? "Editar" : "Registrar"}<span className="solo-lectores"> {etiqueta}</span>
    </button>;
}

const ORIGENES = [
    ["solicitudes", "Solicitudes de inscripción"], ["confirmaciones", "Inscripciones confirmadas"],
    ["asistencias", "Asistencia real"], ["ausencias", "Ausencias"], ["incidencias", "Incidencias registradas"],
    ["visitasGenerales", "Visitas generales"], ["atenciones", "Atenciones cerradas"],
] as const;

function OrigenConteos({ datos }: { datos: ReporteParticipacion }) {
    const fuentes = ORIGENES.filter(([clave]) =>
        datos.fuentes?.[clave] && (incluyeBiblioteca(datos) || (clave !== "visitasGenerales" && clave !== "atenciones")));
    if (!fuentes.length) return null;
    return <Plegable titulo="Origen de los conteos">
        <ul>{fuentes.map(([clave, titulo]) => <li key={clave}><strong>{titulo}</strong> · {datos.fuentes[clave]}</li>)}</ul>
    </Plegable>;
}

function VentanaConteo({ objetivo, alCerrar, alGuardar, alActualizar }: { objetivo: Objetivo; alCerrar: () => void; alGuardar: () => void; alActualizar: () => void }) {
    const id = useId();
    const [total, setTotal] = useState(objetivo.registro?.total.toString() ?? "");
    const [referencia, setReferencia] = useState(objetivo.registro?.referencia ?? "");
    const [error, setError] = useState("");
    const [ocupada, setOcupada] = useState(false);
    const [conflicto, setConflicto] = useState(false);

    async function confirmar() {
        if (ocupada || conflicto) return;
        const mensaje = errorConteo(total, referencia);
        if (mensaje) {
            setError(mensaje);
            return;
        }
        setOcupada(true);
        setError("");
        try {
            await guardarConteo(objetivo.tipo, objetivo.clave, { total: Number(total), referencia: referencia.trim(), version: objetivo.registro?.version ?? null });
            alGuardar();
        } catch (error) {
            setError(mensajeError(error));
            setOcupada(false);
            setConflicto(error instanceof ErrorServicio && error.estado === 409);
        }
    }

    return <Ventana tono="verde" icono={modalInfo} titulo={objetivo.tipo === "visitas-generales" ? "Conteo de visitas generales" : "Conteo de incidencias"}
        texto={objetivo.etiqueta} textoConfirmar={ocupada ? "Guardando…" : "Guardar conteo"} alConfirmar={confirmar}
        alCerrar={() => { if (!ocupada) alCerrar(); }} angosta ocupada={ocupada || conflicto} error={error}>
        <div className="contenidos-campo">
            <label htmlFor={id + "-total"}>Total registrado</label>
            <input id={id + "-total"} type="number" min={0} max={MAXIMO_CONTEO} step={1} required disabled={ocupada}
                value={total} onChange={(evento) => setTotal(evento.target.value)} />
        </div>
        <div className="contenidos-campo">
            <label htmlFor={id + "-referencia"}>Folio o referencia del registro</label>
            <input id={id + "-referencia"} type="text" required disabled={ocupada} maxLength={MAXIMO_REFERENCIA}
                value={referencia} onChange={(evento) => setReferencia(evento.target.value)} />
        </div>
        {conflicto && <button type="button" className="pz-boton pz-boton--contorno" onClick={alActualizar}>Consultar registro actualizado</button>}
    </Ventana>;
}

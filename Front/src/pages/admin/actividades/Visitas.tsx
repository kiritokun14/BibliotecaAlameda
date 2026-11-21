import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Calendario.css";
import "../atencion/AtencionTramites.css";
import { BloqueResumen, Encabezado, Migas, Pagina } from "../contenidoDemo/piezas";
import { Chip, EstadoVacio, type TonoChip } from "../componentes";
import BarraFiltros, { ChipsFiltro } from "../../../components/portal/BarraFiltros";
import { fechaCorta } from "./datos";
import { enFiltro, NOMBRE_ESTADO_VISITA, type EstadoVisita, type FiltroVisita, type Visita } from "./visitas";
import { BASE_VISITAS } from "./utiles";
import { useVisitasPersonal } from "../../../servicios/usarVisitasPersonal";
import { useCalendarioPersonal } from "../../../servicios/usarCalendarioPersonal";
import { hoyISO } from "./salas";
import { ocupa, sumarDias } from "./calendario";
import type { Actividad } from "./datos";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

// Actividades · Visitas y uso de espacios (Figma 567:20782, sin solicitudes 567:24903, sin resultados 567:25143; uso 567:23137).
// Filtros iguales a los del portal (Noticias). Las visitas se ordenan por lo que hay que hacer:
// por confirmar (la más urgente primero), próximas confirmadas e historial.

type Vista = "visitas" | "uso";
const TONO: Record<EstadoVisita, TonoChip> = { "por-confirmar": "dorado", propuesta: "dorado", confirmada: "verde", realizada: "gris", cancelada: "guinda", rechazada: "guinda" };
const ESTADOS: { valor: FiltroVisita; texto: string }[] = [
    { valor: "todas", texto: "Todos los estados" }, { valor: "por-confirmar", texto: "Por confirmar" }, { valor: "confirmada", texto: "Confirmadas" },
    { valor: "realizada", texto: "Realizadas" }, { valor: "cancelada", texto: "Canceladas o rechazadas" },
];
const DETALLE = (folio: string) => `/admin/atencion/espacios/${folio}`;
const cuando = (v: Visita) => `${v.fecha}${v.hora ?? ""}`;

function Visitas() {
    const [params, setParams] = useSearchParams();
    const vista: Vista = params.get("vista") === "uso" ? "uso" : "visitas";
    const { visitas, cargando, error, reintentar } = useVisitasPersonal();
    const [filtro, setFiltro] = useState<FiltroVisita>("todas");
    const [espacio, setEspacio] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const texto = busqueda.trim().toLowerCase();

    const cambiarVista = (v: Vista) => { setParams(v === "uso" ? { vista: "uso" } : {}); setBusqueda(""); };
    const limpiar = () => { setBusqueda(""); setFiltro("todas"); setEspacio(""); };

    const cuenta = (f: FiltroVisita) => visitas.filter((v) => enFiltro(v, f)).length;
    const espacios = [...new Set(visitas.map((v) => v.espacio).filter(Boolean))].sort();
    const filtradas = visitas.filter((v) => enFiltro(v, filtro) && (!espacio || v.espacio === espacio)
        && (!texto || v.folio.toLowerCase().includes(texto) || v.grupo.toLowerCase().includes(texto) || v.espacio.toLowerCase().includes(texto)));
    // Grupos por lo que toca hacer
    const porConfirmar = filtradas.filter((v) => enFiltro(v, "por-confirmar")).sort((a, b) => (a.responderAntes || cuando(a)).localeCompare(b.responderAntes || cuando(b)));
    const proximas = filtradas.filter((v) => v.estado === "confirmada").sort((a, b) => cuando(a).localeCompare(cuando(b)));
    const historial = filtradas.filter((v) => enFiltro(v, "realizada") || enFiltro(v, "cancelada")).sort((a, b) => cuando(b).localeCompare(cuando(a)));

    if (cargando) return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios"]]} />
                <EsqueletoLista texto="Cargando visitas…" />
            </Pagina>
        </PanelLayout>
    );

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                {error && <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las visitas" texto={error} accion={{ texto: "Reintentar", alPresionar: reintentar }} />}
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios"], [vista === "uso" ? "Registro de uso" : "Bandeja"]]} />
                <Encabezado etiqueta="Actividades · Visitas" titulo="Visitas y uso de espacios"
                    texto={vista === "uso" ? "Registro de cómo se usó cada sala." : "Solicitudes de visita de grupos: confirma, da seguimiento y consulta el historial."} />

                {vista === "visitas" && (
                    <BloqueResumen
                        insignia="Visitas y uso de espacios"
                        titulo="Visitas por"
                        resalte="atender"
                        subtitulo="Solicitudes de visitas registradas en el portal"
                        accesos={[
                            { icono: iconoReloj, numero: cuenta("por-confirmar"), titulo: "Por confirmar", texto: "Esperan respuesta", enlace: "Ver por confirmar", tono: "dorado", activo: filtro === "por-confirmar", alPresionar: () => setFiltro(filtro === "por-confirmar" ? "todas" : "por-confirmar") },
                            { icono: iconoCheck, numero: cuenta("confirmada"), titulo: "Confirmadas", texto: "Próximas visitas", enlace: "Ver confirmadas", tono: "verde", activo: filtro === "confirmada", alPresionar: () => setFiltro(filtro === "confirmada" ? "todas" : "confirmada") },
                            { icono: iconoArchivo, numero: cuenta("realizada"), titulo: "Realizadas", texto: "Visitas atendidas", enlace: "Ver realizadas", tono: "verde", activo: filtro === "realizada", alPresionar: () => setFiltro(filtro === "realizada" ? "todas" : "realizada") },
                            { icono: iconoX, numero: cuenta("cancelada"), titulo: "Canceladas", texto: "O rechazadas", enlace: "Ver canceladas", tono: "guinda", activo: filtro === "cancelada", alPresionar: () => setFiltro(filtro === "cancelada" ? "todas" : "cancelada") },
                        ]}
                    />
                )}

                <section className="cal-controles" aria-label="Qué ver y filtros">
                    <BarraFiltros
                        arriba={<ChipsFiltro etiqueta="Qué ver" opciones={[{ valor: "visitas" as Vista, texto: `Visitas (${visitas.length})` }, { valor: "uso" as Vista, texto: "Uso de espacios" }]} activa={vista} alElegir={cambiarVista} />}
                        etiquetaBusqueda={vista === "uso" ? "Buscar por sala o fecha" : "Buscar por folio, grupo o espacio"}
                        marcador={vista === "uso" ? "Sala o fecha…" : "Folio, grupo o espacio…"}
                        texto={busqueda}
                        alBuscar={setBusqueda}
                        grupos={[
                            ...(vista === "visitas" ? [{ etiqueta: "Estado", opciones: ESTADOS, activa: filtro, alElegir: (v: string) => setFiltro(v as FiltroVisita) }] : []),
                            ...(espacios.length ? [{ etiqueta: "Espacio", opciones: [{ valor: "", texto: "Todos los espacios" }, ...espacios.map((e) => ({ valor: e, texto: e }))], activa: espacio, alElegir: setEspacio }] : []),
                        ]}
                        alLimpiar={limpiar}
                    />
                </section>

                {vista === "uso" ? (
                    <UsoEspacios texto={texto} espacio={espacio} />
                ) : visitas.length === 0 ? (
                    <EstadoVacio icono={vacioArchivo} titulo="Aún no hay solicitudes de visita" texto="Cuando un grupo pida una visita desde el portal, aparecerá aquí." />
                ) : filtradas.length === 0 ? (
                    <EstadoVacio icono={vacioBuscar} titulo="Sin resultados" texto="Ninguna visita coincide con la búsqueda o los filtros." accion={{ texto: "Quitar filtros", alPresionar: limpiar }} />
                ) : (
                    <div className="vis-grupos">
                        <GrupoVisitas titulo="Por confirmar" texto="Responde primero las que vencen antes." tono="dorado" visitas={porConfirmar} accion="Revisar" />
                        <GrupoVisitas titulo="Próximas confirmadas" texto="En orden de fecha de la visita." tono="verde" visitas={proximas} accion="Ver" />
                        <GrupoVisitas titulo="Historial" texto="Realizadas, canceladas y rechazadas; las más recientes primero." tono="gris" visitas={historial} accion="Ver" />
                    </div>
                )}
            </Pagina>
        </PanelLayout>
    );
}

function GrupoVisitas({ titulo, texto, tono, visitas, accion }: { titulo: string; texto: string; tono: "dorado" | "verde" | "gris"; visitas: Visita[]; accion: string }) {
    if (visitas.length === 0) return null;
    return (
        <section className={`contenidos-lista vis-grupo vis-grupo--${tono}`} aria-label={titulo}>
            <div className="contenidos-lista__cabecera">
                <div><h2>{titulo} <span className="vis-grupo__cuenta">{visitas.length}</span></h2><p>{texto}</p></div>
            </div>
            <div className="vis-grupo__lista">
                {visitas.map((v) => (
                    <Link key={v.folio} to={DETALLE(v.folio)} className="vis-fila">
                        <span className="vis-fila__fecha"><strong>{fechaCorta(v.fecha)}</strong><small>{v.hora || "Hora por confirmar"}</small></span>
                        <span className="vis-fila__textos">
                            <strong>{v.grupo}</strong>
                            <small>{v.detallePersonas || `${v.personas} personas`} · {v.espacio || "Espacio por confirmar"} · <span className="tr-codigo">{v.folio}</span></small>
                        </span>
                        {v.estado === "por-confirmar" && v.responderAntes && <span className="vis-fila__plazo">Responder antes del {fechaCorta(v.responderAntes)}</span>}
                        <Chip tono={TONO[v.estado]}>{NOMBRE_ESTADO_VISITA[v.estado]}</Chip>
                        <span className="vis-fila__accion">{accion}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

// ---------- Uso de espacios ----------
// TODO backend: el registro de uso efectivo (quién usó la sala, cuántas personas, incidencias) aún no tiene servicio.
// Mientras, se arma con las actividades del calendario: las que ya pasaron quedan «por registrar».
const horasDe = (a: Actividad) => {
    if (!a.inicio || !a.fin) return 0;
    const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    return Math.max(0, (m(a.fin) - m(a.inicio)) / 60);
};

function UsoEspacios({ texto, espacio }: { texto: string; espacio: string }) {
    const { actividades, salas, cargando } = useCalendarioPersonal();
    const ir = useNavigate();
    const hoy = hoyISO();
    const hace30 = sumarDias(hoy, -30);
    const lunes = sumarDias(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7));
    const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const mes = hoy.slice(0, 7);
    const validas = actividades.filter((a) => ocupa(a) && (!espacio || a.espacio === espacio)
        && (!texto || a.espacio.toLowerCase().includes(texto) || a.nombre.toLowerCase().includes(texto) || fechaCorta(a.fecha).includes(texto)));
    const porRegistrar = validas.filter((a) => a.fecha < hoy && a.fecha >= hace30).sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
    const enSemana = validas.filter((a) => semana.includes(a.fecha)).length;
    const delMes = validas.filter((a) => a.fecha.startsWith(mes));
    const usadas = new Set(delMes.map((a) => a.espacio)).size;
    const porSala = salas.filter((s) => !espacio || s.nombre === espacio).map((s) => {
        const lista = delMes.filter((a) => a.espacio === s.nombre);
        return { sala: s, cantidad: lista.length, horas: lista.reduce((t, a) => t + horasDe(a), 0) };
    });
    const maximo = Math.max(1, ...porSala.map((x) => x.cantidad));

    if (cargando) return <EsqueletoLista texto="Cargando uso de espacios…" />;
    return (
        <>
            <BloqueResumen
                insignia="Visitas y uso de espacios"
                titulo="Uso de"
                resalte="espacios"
                subtitulo="Calculado con las actividades del calendario"
                accesos={[
                    { icono: iconoArchivo, numero: enSemana, titulo: "Usos esta semana", texto: "Actividades programadas", enlace: "Ver calendario", tono: "verde", alPresionar: () => { ir("/admin/actividades/calendario?vista=semana"); } },
                    { icono: iconoCheck, numero: `${usadas} de ${salas.length}`, titulo: "Salas usadas este mes", texto: "Con al menos una actividad", enlace: "Ver salas", tono: "verde", alPresionar: () => { ir("/admin/actividades/calendario?vista=salas"); } },
                    { icono: iconoReloj, numero: porRegistrar.length, titulo: "Por registrar", texto: "Actividades que ya pasaron", enlace: "Registrar uso", tono: "dorado", alPresionar: () => { ir(`${BASE_VISITAS}/uso/registrar`); } },
                ]}
            />

            <section className="contenidos-lista vis-grupo vis-grupo--dorado" aria-labelledby="uso-pendiente">
                <div className="contenidos-lista__cabecera">
                    <div><h2 id="uso-pendiente">Por registrar <span className="vis-grupo__cuenta">{porRegistrar.length}</span></h2>
                        <p>Actividades de los últimos 30 días. Registra cuántas personas asistieron y si hubo incidencias en la sala.</p></div>
                    <Link to={`${BASE_VISITAS}/uso/registrar`} className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico">Registrar otro uso</Link>
                </div>
                {porRegistrar.length === 0
                    ? <EstadoVacio icono={vacioArchivo} titulo="Nada por registrar" texto="Cuando pase una actividad del calendario, aparecerá aquí para registrar cómo se usó la sala." />
                    : <div className="vis-grupo__lista">{porRegistrar.slice(0, 8).map((a) => (
                        <Link key={`${a.folio}:${a.fecha}:${a.inicio}`} to={`${BASE_VISITAS}/uso/registrar`} className="vis-fila vis-fila--uso">
                            <span className="vis-fila__fecha"><strong>{fechaCorta(a.fecha)}</strong><small>{a.inicio}{a.fin ? `–${a.fin}` : ""}</small></span>
                            <span className="vis-fila__textos"><strong>{a.espacio}</strong><small>{a.nombre} · {a.inscritos} {a.inscritos === 1 ? "inscrita" : "inscritas"}</small></span>
                            <Chip tono="dorado">Por registrar</Chip>
                            <span className="vis-fila__accion">Registrar</span>
                        </Link>
                    ))}</div>}
                {porRegistrar.length > 8 && <p className="contenidos-campo__ayuda">Y {porRegistrar.length - 8} más. Usa la búsqueda o el filtro de espacio para encontrarlas.</p>}
            </section>

            <section className="contenidos-lista" aria-labelledby="uso-salas">
                <div className="contenidos-lista__cabecera">
                    <div><h2 id="uso-salas">Ocupación por sala este mes</h2><p>Actividades y horas programadas en cada espacio.</p></div>
                </div>
                {porSala.length === 0
                    ? <EstadoVacio icono={vacioBuscar} titulo="Sin salas con ese filtro" texto="Prueba con otro espacio." />
                    : <ul className="uso-salas">{porSala.map(({ sala, cantidad, horas }) => (
                        <li key={sala.id}>
                            <span className="uso-salas__nombre"><strong>{sala.nombre}</strong><small>{sala.capacidad} personas</small></span>
                            <span className="uso-salas__barra" aria-hidden="true"><span style={{ width: `${(cantidad / maximo) * 100}%` }} /></span>
                            <span className="uso-salas__cifras"><strong>{cantidad}</strong> {cantidad === 1 ? "actividad" : "actividades"} · {horas % 1 ? horas.toFixed(1) : horas} h</span>
                        </li>
                    ))}</ul>}
                <p className="contenidos-campo__ayuda">El registro de uso efectivo todavía no se guarda en el servidor; estas cifras salen del calendario de actividades.</p>
            </section>
        </>
    );
}

export default Visitas;

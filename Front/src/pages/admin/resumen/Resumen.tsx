import { useContext, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import PanelLayout from "../PanelLayout";
import { AvisoResumenParcial, ResumenCargando, ResumenConError, ResumenSinPendientes } from "../EstadosPanel";
import { ContextoPanel } from "../../../servicios/accesoPanel";
import {
    AREAS,
    ICONO_AREA,
    NOMBRE_AREA,
    PLAZOS,
    REGLAS,
    accesosDeLaCuenta,
    actividadesHoy,
    contarPorArea,
    contarPorPlazo,
    filtrarPendientes,
    ordenarPorVencimiento,
    pendientes as todosLosPendientes,
    pendientesDeLaCuenta,
    pendientesPorRuta,
    plazoDe,
    saludo,
    momentosDelDia,
    type AccesoRapido,
    type AreaPendiente,
    type Pendiente,
    type Plazo,
    type TonoEstado,
    vistaEnlace,
} from "./datos";
import { Icono } from "./iconos";
import { Buscador, Cabecera, Chip, Cifra, Enlace, FiltrosAvanzados } from "../piezasPanel";
import { consultarResumen, listarContenidos, type FilaContenidoApi, type ResumenContenidos } from "../../../servicios/contenidos";
import { mensajeError } from "../../../servicios/api";
import { MOVIMIENTOS, fechaHora } from "../administracion/datos";
import { ListaServicios, TarjetaServicios } from "./servicios";
import { cifrasServicios, estadoAccesoServicios, sinDatosServicios, textoServicios, useServicios } from "./datosServicios";
import { ListaPrestamos, TarjetaPrestamos } from "./prestamos";
import { cifrasPrestamos, estadoAccesoPrestamos, textoPrestamos, usePrestamos } from "./datosPrestamos";

const TEMA = "paleta"; // paleta institucional (21 nov 2026), por ahora solo en el Resumen

// «sábado 21 de noviembre» → «Sábado 21 de noviembre»
function fechaDeHoy(fecha = new Date()) {
    const texto = fecha.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mazatlan" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Admin · Resumen (Figma 358:3838), reorganizado el 21 nov 2026 (Aldahir: «los accesos y los pendientes no son intuitivos»).
// Una sola idea por bloque y nada repetido:
// 1. Saludo con tres cifras que son botones: filtran la lista de pendientes o llevan a las actividades de hoy.
// 2. Accesos rápidos: cada uno dice cuánto tiene esperando («4 por atender», «1 vence hoy», «Al día»).
// 3. Pendientes por atender: una sola lista (antes «Lo más urgente», la tabla y «Contenidos en revisión» repetían lo mismo),
//    solo con lo que la cuenta puede abrir, agrupada por vencimiento, con filtros por plazo y área, búsqueda y «Atender».
// 4. A un lado: actividades de hoy y las reglas de operación (plegables).
export default function Resumen() {
    const identidad = useContext(ContextoPanel);
    const acceso = identidad?.acceso;
    const accesos = accesosDeLaCuenta(acceso);
    // Las actividades de hoy solo para quien trabaja con actividades; quien administra ve el estado del sistema
    const veActividades = vistaEnlace("/admin/actividades/calendario", acceso) === "enlace";
    // Sin actividades, quien administra ve los últimos cambios (los mismos de la Bitácora)
    const veCambios = !veActividades && vistaEnlace("/admin/administracion/bitacora", acceso) === "enlace";
    // Quien redacta (Editor) ve sus contenidos: cifras reales de /contenidos/editor/resumen
    const veContenidos = !veActividades && !veCambios && vistaEnlace("/admin/contenidos/editor", acceso) === "enlace";
    const editor = useContenidosEditor(veContenidos);
    // Servicios Digitales (Contactos y Altas asistidas) ve lo real de sus servicios, no pendientes de ejemplo (22 nov 2026)
    const veContactos = vistaEnlace("/admin/atencion/contactos", acceso) === "enlace";
    const veAltas = vistaEnlace("/admin/atencion/altas-asistidas", acceso) === "enlace";
    const veServicios = !veActividades && !veCambios && !veContenidos && (veContactos || veAltas);
    const servicios = useServicios(veServicios, veContactos, veAltas);
    const cifras = cifrasServicios(servicios);
    // Préstamos (Solicitudes de credencial y Cotejo) ve sus solicitudes reales y los cotejos pendientes (T3, 22 nov 2026)
    const veSolicitudes = vistaEnlace("/admin/atencion/credenciales", acceso) === "enlace";
    const veCotejo = vistaEnlace("/admin/participantes/cotejo", acceso) === "enlace";
    const vePrestamos = !veActividades && !veCambios && !veContenidos && !veServicios && (veSolicitudes || veCotejo);
    const prestamos = usePrestamos(vePrestamos, veSolicitudes, veCotejo);
    const cifrasP = cifrasPrestamos(prestamos);
    const pendientes = veServicios || vePrestamos ? [] : ordenarPorVencimiento(pendientesDeLaCuenta(todosLosPendientes, acceso));
    const porPlazo = contarPorPlazo(pendientes);
    const actividades = veActividades ? actividadesHoy : [];
    const momentos = momentosDelDia(actividades.map((a) => a.hora), minutosAhora());
    // La lista de actividades se coloca en la que sigue (o la que está ahora) al abrir el Resumen
    const listaActividades = useRef<HTMLUListElement>(null);
    useEffect(() => {
        const lista = listaActividades.current;
        const destino = lista?.querySelector<HTMLElement>('[data-momento="ahora"], [data-momento="siguiente"]');
        if (lista && destino) lista.scrollTop = destino.offsetTop - lista.offsetTop - 6;
    }, []);
    const [plazo, setPlazo] = useState<Plazo | null>(null);
    // Pendientes y actividades forman el área de trabajo: mide el alto visible y el scroll la encuadra (AGENTS §1)
    const area = useRef<HTMLDivElement>(null);
    // Estados del sistema del Resumen (Figma 583:47942, 583:48297, 583:48650, 595:49373).
    // TODO backend: el Resumen todavía usa datos de ejemplo; cuando venga del servidor, estos estados saldrán
    // de la consulta. Mientras, en desarrollo se revisan con ?simular=cargando | error | sin-pendientes | parcial.
    const { search } = useLocation();
    const [simulado, setSimulado] = useState(() => (import.meta.env.DEV ? new URLSearchParams(search).get("simular") : null));
    const reintentar = () => setSimulado(null);

    const ir = (destino: HTMLElement | null) => destino?.scrollIntoView({ behavior: "smooth", block: "start" });
    function verPendientes(nuevo: Plazo | null) { setPlazo(nuevo); ir(area.current); }

    if (simulado === "cargando") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenCargando /></PanelLayout>;
    if (simulado === "error") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenConError alReintentar={reintentar} /></PanelLayout>;
    if (simulado === "sin-pendientes") return <PanelLayout titulo="Resumen" tema={TEMA}><ResumenSinPendientes /></PanelLayout>;

    return (
        <PanelLayout titulo="Resumen" tema={TEMA}>
            <div className="pz-pagina">
                {simulado === "parcial" && <AvisoResumenParcial alReintentar={reintentar} />}

                {/* 1. Saludo: qué día es y cuánto hay; cada cifra lleva a lo que cuenta */}
                <header className="pz-saludo">
                    <div className="pz-saludo__textos">
                        <p className="pz-saludo__fecha">{fechaDeHoy()}</p>
                        <h2>{saludo(new Date().getHours())}</h2>
                        <p>{veServicios ? textoServicios(servicios) : vePrestamos ? textoPrestamos(prestamos) : textoDelDia(pendientes.length, porPlazo.hoy)}</p>
                    </div>
                    <div className="pz-saludo__cifras" role="group" aria-label="Tu día en cifras">
                        {veServicios ? <>
                            <Cifra icono="lista" valor={sinDatosServicios(servicios) ? "—" : cifras.total} texto="por atender" alPresionar={() => ir(area.current)} />
                            <Cifra icono="alerta" valor={sinDatosServicios(servicios) ? "—" : cifras.sinAtender + cifras.altasRevision} texto="requieren acción" tono="vino" alPresionar={() => ir(area.current)} />
                        </> : vePrestamos ? <>
                            <Cifra icono="lista" valor={prestamos.credenciales.estado === "cargando" ? "…" : cifrasP.total} texto="por atender" alPresionar={() => ir(area.current)} />
                            <Cifra icono="alerta" valor={prestamos.credenciales.estado === "cargando" ? "…" : cifrasP.urgentes} texto="requieren acción" tono="vino" alPresionar={() => ir(area.current)} />
                        </> : <>
                        <Cifra icono="lista" valor={pendientes.length} texto="por atender" alPresionar={() => verPendientes(null)} />
                        <Cifra icono="alerta" valor={porPlazo.hoy} texto="vencen hoy" tono="vino" alPresionar={() => verPendientes("hoy")} />
                        </>}
                        {veActividades && <Cifra icono="calendario" valor={actividades.length} texto="actividades hoy" alPresionar={() => ir(area.current)} />}
                    </div>
                </header>

                {/* 2. Accesos rápidos: cada uno dice cuánto tiene esperando */}
                {accesos.length > 0 && (
                    <section className="pz-seccion" aria-labelledby="pz-accesos">
                        <div className="pz-seccion__titular">
                            <h2 id="pz-accesos" className="pz-titulo"><span className="pz-titulo__icono"><Icono nombre="lista" /></span>Accesos rápidos</h2>
                            <p className="pz-ayuda">Cada acceso te dice cuánto tienes esperando en esa sección.</p>
                        </div>
                        <ul className="pz-accesos">
                            {accesos.map((a) => <li key={a.ruta}><Acceso acceso={a} estado={(veServicios && estadoAccesoServicios(a.ruta, servicios)) || (vePrestamos && estadoAccesoPrestamos(a.ruta, prestamos)) || estadoAcceso(a, pendientes, actividades)} /></li>)}
                        </ul>
                    </section>
                )}

                {/* 3. Pendientes | actividades de hoy y reglas */}
                <div className="pz-columnas" ref={area}>
                    {veContenidos ? (
                        <div className="pz-columna-doble">
                            <ListaPendientes pendientes={pendientes} plazo={plazo} alCambiarPlazo={setPlazo} />
                            <TarjetaRecientes editor={editor} />
                        </div>
                    ) : veServicios ? <ListaServicios datos={servicios} />
                        : vePrestamos ? <ListaPrestamos datos={prestamos} />
                        : <ListaPendientes pendientes={pendientes} plazo={plazo} alCambiarPlazo={setPlazo} />}

                    <aside className="pz-lateral" aria-label="Tu día">
                        {veContenidos && <TarjetaMisContenidos editor={editor} />}
                        {veServicios && <TarjetaServicios datos={servicios} />}
                        {vePrestamos && <TarjetaPrestamos datos={prestamos} />}
                        {veCambios && (
                            <section className="pz-tarjeta pz-tarjeta--actividades" aria-labelledby="pz-cambios">
                                <Cabecera icono="bitacora" id="pz-cambios" titulo="Últimos cambios" texto="Lo más reciente de la bitácora" />
                                <ul className="pz-actividades pz-cambios">
                                    {MOVIMIENTOS.slice(0, 5).map((m) => (
                                        <li key={m.folio}>
                                            <div className="pz-actividades__textos">
                                                <p className="pz-actividades__titulo">{m.accion}</p>
                                                <p className="pz-actividades__detalle">{m.persona}, {m.modulo}, {fechaHora(m.fecha)}</p>
                                                {m.tipo === "Sensible" && <div className="pz-actividades__pie"><Chip tono="guinda">Sensible</Chip></div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <Enlace ruta="/admin/administracion/bitacora" className="pz-enlace">Ver la bitácora</Enlace>
                            </section>
                        )}
                        {veActividades && (
                        <section className="pz-tarjeta pz-tarjeta--actividades" aria-labelledby="pz-actividades">
                            <Cabecera icono="hoy" id="pz-actividades" titulo="Actividades de hoy" texto={textoActividades(momentos, actividades.length)} />
                            <ul className="pz-actividades" ref={listaActividades}>
                                {actividades.map((actividad, i) => (
                                    <li key={actividad.titulo} data-momento={momentos[i]}
                                        className={[actividad.chip.texto === "Cancelada" ? "pz-actividades__cancelada" : "", `pz-actividades--${momentos[i]}`].join(" ").trim()}>
                                        {(momentos[i] === "ahora" || momentos[i] === "siguiente") && (
                                            <span className="pz-actividades__momento">{momentos[i] === "ahora" ? "En este momento" : "Sigue"}</span>
                                        )}
                                        <span className="pz-actividades__hora"><strong>{actividad.hora}</strong><span>h</span></span>
                                        <div className="pz-actividades__textos">
                                            <p className="pz-actividades__titulo">{actividad.titulo}</p>
                                            <p className="pz-actividades__detalle">{actividad.detalle}</p>
                                            <div className="pz-actividades__pie">
                                                <Chip tono={actividad.chip.tono}>{actividad.chip.texto}</Chip>
                                                {actividad.pasarLista && (
                                                    <Enlace ruta="/admin/actividades/asistencia" className="pz-boton pz-boton--chico">Pasar lista</Enlace>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Enlace ruta="/admin/actividades/calendario" className="pz-enlace">Ver el calendario</Enlace>
                        </section>
                        )}

                        <details className="pz-tarjeta pz-reglas">
                            <summary>
                                <span className="pz-tarjeta__icono"><Icono nombre="info" /></span>
                                <span className="pz-reglas__titulo">Reglas de operación</span>
                                <span className="pz-reglas__mas" aria-hidden="true" />
                            </summary>
                            <ul>{REGLAS.map((regla) => <li key={regla}>{regla}</li>)}</ul>
                        </details>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

function minutosAhora() {
    const [h, m] = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mazatlan" }).split(":").map(Number);
    return h * 60 + m;
}
function textoActividades(momentos: string[], total: number) {
    const faltan = momentos.filter((m) => m !== "pasada").length;
    if (total === 0) return "No hay actividades hoy";
    if (faltan === 0) return `Ya terminaron las ${total} de hoy`;
    return `${faltan} de ${total} por realizar o en curso`;
}

function textoDelDia(total: number, hoy: number) {
    if (total === 0) return "Estás al día: no tienes pendientes por atender.";
    const vencen = hoy === 0 ? "ninguno vence hoy" : hoy === 1 ? "1 vence hoy" : `${hoy} vencen hoy`;
    return `Tienes ${total} ${total === 1 ? "pendiente" : "pendientes"} y ${vencen}. Empieza por los que vencen primero.`;
}


// ---------- Accesos rápidos ----------
type EstadoAcceso = { texto: string; tono: TonoEstado } | null;

// Qué espera en la pantalla del acceso: pendientes (con cuántos vencen hoy), listas por pasar o actividades del día
function estadoAcceso(a: AccesoRapido, pendientes: Pendiente[], actividades: typeof actividadesHoy): EstadoAcceso {
    const cuenta = pendientesPorRuta(pendientes)[a.ruta];
    if (cuenta) {
        if (cuenta.hoy > 0) return { texto: `${cuenta.total} por atender, ${cuenta.hoy} hoy`, tono: "guinda" };
        return { texto: `${cuenta.total} por atender`, tono: "dorado" };
    }
    if (a.icono === "asistencia") {
        const listas = actividades.filter((x) => x.pasarLista).length;
        return listas ? { texto: listas === 1 ? "1 lista por pasar" : `${listas} listas por pasar`, tono: "dorado" } : { texto: "Al día", tono: "verde" };
    }
    if (a.icono === "calendario") return { texto: `${actividades.length} actividades hoy`, tono: "gris" };
    // Pantallas que reciben pendientes pero hoy no tienen ninguno
    if (todosLosPendientes.some((p) => p.ruta === a.ruta)) return { texto: "Al día", tono: "verde" };
    return null;
}

function Acceso({ acceso, estado }: { acceso: AccesoRapido; estado: EstadoAcceso }) {
    return (
        <Link to={acceso.ruta} className={`pz-acceso${estado?.tono === "guinda" ? " pz-acceso--urgente" : ""}`}>
            <span className="pz-acceso__cabecera">
                <span className="pz-acceso__icono"><Icono nombre={acceso.icono} /></span>
                <span className="pz-acceso__textos">
                    <span className="pz-acceso__titulo">{acceso.titulo}</span>
                    <span className="pz-acceso__texto">{acceso.texto}</span>
                </span>
            </span>
            {estado && <Chip tono={estado.tono}>{estado.texto}</Chip>}
        </Link>
    );
}

// ---------- Pendientes por atender ----------
function ListaPendientes({ pendientes, plazo, alCambiarPlazo }: { pendientes: Pendiente[]; plazo: Plazo | null; alCambiarPlazo: (p: Plazo | null) => void }) {
    const id = useId();
    const [area, setArea] = useState<AreaPendiente | null>(null);
    const [texto, setTexto] = useState("");
    const filtrados = filtrarPendientes(pendientes, area, texto, plazo);
    const visibles = filtrados;
    const porPlazo = contarPorPlazo(filtrarPendientes(pendientes, area, texto));
    const porArea = contarPorArea(pendientes);
    const areas = AREAS.filter((a) => porArea[a.id] > 0);
    const hayFiltros = !!(plazo || area || texto);
    const quitarFiltros = () => { alCambiarPlazo(null); setArea(null); setTexto(""); };
    // Con «Todos», la lista va por grupos de vencimiento (Vencen hoy, Mañana, Esta semana)
    const grupos = PLAZOS.map((x) => ({ ...x, filas: visibles.filter((p) => plazoDe(p) === x.id) })).filter((g) => g.filas.length);

    return (
        <section className="pz-tarjeta pz-pendientes" id="pendientes" aria-labelledby={`${id}-titulo`}>
            <Cabecera icono="lista" id={`${id}-titulo`} titulo="Pendientes por atender" texto="Los que vencen antes van primero" />

            {/* Con pocos pendientes (4 o menos) y sin filtros puestos, el filtro y el buscador sobran */}
            {(pendientes.length > 4 || hayFiltros) && <Buscador etiqueta="Buscar por folio o asunto" placeholder="Buscar por folio o asunto" valor={texto} alCambiar={setTexto}>
                <FiltrosAvanzados activos={(plazo ? 1 : 0) + (area ? 1 : 0)} alQuitar={() => { alCambiarPlazo(null); setArea(null); }} grupos={[
                    { titulo: "Vencimiento", valor: plazo ?? "", alCambiar: (v) => alCambiarPlazo((v || null) as Plazo | null),
                        opciones: [{ valor: "", texto: "Todos", cantidad: porPlazo.hoy + porPlazo.manana + porPlazo.semana }, ...PLAZOS.map((x) => ({ valor: x.id, texto: x.nombre, cantidad: porPlazo[x.id] }))] },
                    ...(areas.length > 1 ? [{ titulo: "Área", valor: area ?? "", alCambiar: (v: string) => setArea((v || null) as AreaPendiente | null),
                        opciones: [{ valor: "", texto: "Todas" }, ...areas.map((a) => ({ valor: a.id, texto: a.nombre, cantidad: porArea[a.id] }))] }] : []),
                ]} />
            </Buscador>}

            <p className="solo-lectores" role="status">{filtrados.length} pendientes con estos filtros</p>

            {filtrados.length === 0 ? (
                <div className="pz-vacio">
                    <span className="pz-vacio__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                    <p className="pz-vacio__titulo">{hayFiltros ? "No hay pendientes con estos filtros" : "Estás al día"}</p>
                    <p>{hayFiltros ? "Prueba con otro plazo u otra área." : "Cuando llegue algo que atender, aparecerá aquí."}</p>
                    {hayFiltros && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitarFiltros}>Quitar filtros</button>}
                </div>
            ) : (
                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de pendientes">
                    {(plazo ? [{ id: plazo, nombre: "", filas: visibles }] : grupos).map((g) => (
                        <div key={g.id} className="pz-grupo">
                            {!plazo && <p className={`pz-grupo__titulo pz-grupo__titulo--${g.id}`}>{g.nombre}<span>{porPlazo[g.id]}</span></p>}
                            <ul className="pz-filas">
                                {g.filas.map((p) => <li key={p.folio}><FilaPendiente pendiente={p} /></li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

        </section>
    );
}

function FilaPendiente({ pendiente: p }: { pendiente: Pendiente }) {
    const plazo = plazoDe(p);
    return (
        <article className="pz-fila pz-fila--pendiente">
            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={p.icono ?? ICONO_AREA[p.area]} /></span>
            <div className="pz-fila__textos">
                <h4 className="pz-fila__titulo">{p.asunto}</h4>
                <p className="pz-fila__detalle">
                    <span className="pz-fila__folio">{p.folio}</span>
                    <span>{NOMBRE_AREA[p.area]}</span>
                    <span>{p.responsable === "Sin asignar" ? "Sin responsable" : `Atiende ${p.responsable}`}</span>
                </p>
            </div>
            <span className={`pz-vence pz-vence--${plazo}`}>{plazo === "hoy" ? "Vence hoy" : p.vence}</span>
            <Chip tono={p.estado.tono}>{p.estado.texto}</Chip>
            <Enlace ruta={p.ruta} className="pz-boton pz-boton--chico">
                Atender<span className="solo-lectores"> {p.folio}</span>
            </Enlace>
        </article>
    );
}

// Lateral del Editor: sus contenidos por estado y lo más reciente (datos reales de /contenidos/editor)
const ESTADO_EDITOR: Record<string, { texto: string; tono: "gris" | "dorado" | "guinda" | "verde" }> = {
    borrador: { texto: "Borrador", tono: "gris" }, en_revision: { texto: "Por autorizar", tono: "dorado" }, con_observaciones: { texto: "Con observaciones", tono: "guinda" },
    publicado: { texto: "Publicado", tono: "verde" }, aprobado: { texto: "Aprobado", tono: "verde" }, rechazado: { texto: "Rechazado", tono: "guinda" },
    retirado: { texto: "Retirado", tono: "gris" }, archivado: { texto: "Archivado", tono: "gris" },
};
const TIPO_EDITOR: Record<string, { texto: string; icono: "contenido" | "fuentes" | "info" | "evidencias" | "lista" }> = {
    noticia: { texto: "Noticia", icono: "contenido" }, resena: { texto: "Reseña", icono: "fuentes" }, acerca: { texto: "Acerca de", icono: "info" }, memoria: { texto: "Memoria pública", icono: "evidencias" },
};
const rutaContenido = (c: FilaContenidoApi) =>
    c.estado === "con_observaciones" ? `/admin/contenidos/editor/${c.folio}/corregir` : c.estado === "borrador" ? `/admin/contenidos/editor/${c.folio}/editar` : `/admin/contenidos/editor/${c.folio}/ver`;
const fechaCorta = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });

type DatosEditor = { resumen: ResumenContenidos | null; recientes: FilaContenidoApi[] | null; error: string };
function useContenidosEditor(activo: boolean): DatosEditor {
    const [d, setD] = useState<DatosEditor>({ resumen: null, recientes: null, error: "" });
    useEffect(() => {
        if (!activo) return;
        let vigente = true;
        Promise.all([consultarResumen(), listarContenidos({ limite: 6 })])
            .then(([r, l]) => { if (vigente) setD({ resumen: r, recientes: l.contenidos, error: "" }); })
            .catch((e) => { if (vigente) setD((x) => ({ ...x, error: mensajeError(e) })); });
        return () => { vigente = false; };
    }, [activo]);
    return d;
}

// Lo más reciente del Editor, ancho, bajo sus pendientes: cada contenido con su estado y su acción
function TarjetaRecientes({ editor }: { editor: DatosEditor }) {
    const accion = (c: FilaContenidoApi) => (c.estado === "con_observaciones" ? "Corregir" : c.estado === "borrador" ? "Editar" : "Ver");
    return (
        <section className="pz-tarjeta pz-recientes-tarjeta" aria-labelledby="rs-recientes">
            <Cabecera icono="reloj" id="rs-recientes" titulo="Lo más reciente" texto="Tus últimos contenidos, del más nuevo al más antiguo"
                accion={<Enlace ruta="/admin/contenidos/editor" className="pz-boton pz-boton--contorno pz-boton--chico">Ver todos</Enlace>} />
            {editor.error ? <p className="pz-acciones__nota">No se pudieron cargar: {editor.error}</p>
                : !editor.recientes ? <p className="pz-acciones__nota">Cargando…</p>
                    : editor.recientes.length === 0 ? <p className="pz-acciones__nota">Aún no has redactado nada. Empieza con «Nuevo contenido».</p> : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lo más reciente">
                            <ul className="pz-filas">
                                {editor.recientes.map((c) => (
                                    <li key={c.folio}>
                                        <article className="pz-fila">
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={TIPO_EDITOR[c.tipo]?.icono ?? "contenido"} /></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo">{c.titulo || "Sin título"}</h4>
                                                <p className="pz-fila__detalle"><span className="pz-fila__folio">{c.folio}</span><span>{TIPO_EDITOR[c.tipo]?.texto ?? c.tipo}</span><span>Actualizado el {fechaCorta.format(new Date(c.actualizadoEn))}</span></p>
                                            </div>
                                            <Chip tono={ESTADO_EDITOR[c.estado]?.tono ?? "gris"}>{ESTADO_EDITOR[c.estado]?.texto ?? c.estado}</Chip>
                                            <Link to={rutaContenido(c)} className={`pz-boton pz-boton--chico${accion(c) === "Ver" ? " pz-boton--contorno" : ""}`}>{accion(c)}<span className="solo-lectores"> {c.titulo}</span></Link>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
        </section>
    );
}

// Lateral del Editor: sus cifras por estado y para empezar uno nuevo
function TarjetaMisContenidos({ editor }: { editor: DatosEditor }) {
    const datos = editor.resumen;
    const cifras: { texto: string; valor?: number; tono: string }[] = [
        { texto: "Borradores", valor: datos?.borrador, tono: "gris" },
        { texto: "Por autorizar", valor: datos?.en_revision, tono: "dorado" },
        { texto: "Con observaciones", valor: datos?.con_observaciones, tono: "guinda" },
        { texto: "Publicados", valor: datos?.publicado, tono: "verde" },
    ];
    return (
        <section className="pz-tarjeta pz-tarjeta--actividades" aria-labelledby="rs-mis-contenidos">
            <Cabecera icono="contenido" id="rs-mis-contenidos" titulo="Mis contenidos" texto={datos ? `${datos.total} en total` : "Lo que has redactado"} />
            {editor.error ? <p className="pz-acciones__nota">No se pudieron cargar: {editor.error}</p> : (
                <dl className="pz-mini-cifras">
                    {cifras.map((c) => (
                        <div key={c.texto} className={`pz-mini-cifra pz-mini-cifra--${c.tono}`}>
                            <dt>{c.texto}</dt>
                            <dd>{c.valor ?? "…"}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <div className="pz-acciones pz-acciones--pie">
                <Enlace ruta="/admin/contenidos/editor/nuevo" className="pz-boton">Nuevo contenido</Enlace>
                <Enlace ruta="/admin/contenidos/revision/historial" className="pz-boton pz-boton--contorno">Ver lo publicado</Enlace>
                <p className="pz-acciones__nota">Lo que envías lo autoriza el Administrador antes de aparecer en el portal.</p>
            </div>
        </section>
    );
}


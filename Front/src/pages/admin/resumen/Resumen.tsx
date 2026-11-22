import { useContext, useId, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import PanelLayout from "../PanelLayout";
import { AvisoResumenParcial, ResumenCargando, ResumenConError, ResumenSinPendientes } from "../EstadosPanel";
import "./Resumen.css";
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
    type AccesoRapido,
    type AreaPendiente,
    type Pendiente,
    type Plazo,
    type TonoEstado,
    vistaEnlace,
} from "./datos";
import { Icono, type NombreIcono } from "./iconos";
import { MOVIMIENTOS, fechaHora } from "../administracion/datos";

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
    const pendientes = ordenarPorVencimiento(pendientesDeLaCuenta(todosLosPendientes, acceso));
    const porPlazo = contarPorPlazo(pendientes);
    // Las actividades de hoy solo para quien trabaja con actividades; quien administra ve el estado del sistema
    const veActividades = vistaEnlace("/admin/actividades/calendario", acceso) === "enlace";
    // Sin actividades, quien administra ve los últimos cambios (los mismos de la Bitácora)
    const veCambios = !veActividades && vistaEnlace("/admin/administracion/bitacora", acceso) === "enlace";
    const actividades = veActividades ? actividadesHoy : [];
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
            <div className="rs">
                {simulado === "parcial" && <AvisoResumenParcial alReintentar={reintentar} />}

                {/* 1. Saludo: qué día es y cuánto hay; cada cifra lleva a lo que cuenta */}
                <header className="rs-saludo">
                    <div className="rs-saludo__textos">
                        <p className="rs-saludo__fecha">{fechaDeHoy()}</p>
                        <h2>{saludo(new Date().getHours())}</h2>
                        <p>{textoDelDia(pendientes.length, porPlazo.hoy)}</p>
                    </div>
                    <div className="rs-saludo__cifras" role="group" aria-label="Tu día en cifras">
                        <Cifra icono="lista" valor={pendientes.length} texto="por atender" alPresionar={() => verPendientes(null)} />
                        <Cifra icono="alerta" valor={porPlazo.hoy} texto="vencen hoy" tono="vino" alPresionar={() => verPendientes("hoy")} />
                        {veActividades && <Cifra icono="calendario" valor={actividades.length} texto="actividades hoy" alPresionar={() => ir(area.current)} />}
                    </div>
                </header>

                {/* 2. Accesos rápidos: cada uno dice cuánto tiene esperando */}
                {accesos.length > 0 && (
                    <section className="rs-seccion" aria-labelledby="rs-accesos">
                        <div className="rs-seccion__titular">
                            <h2 id="rs-accesos" className="rs-titulo"><span className="rs-titulo__icono"><Icono nombre="lista" /></span>Accesos rápidos</h2>
                            <p className="rs-ayuda">Cada acceso te dice cuánto tienes esperando en esa sección.</p>
                        </div>
                        <ul className="rs-accesos">
                            {accesos.map((a) => <li key={a.ruta}><Acceso acceso={a} estado={estadoAcceso(a, pendientes, actividades)} /></li>)}
                        </ul>
                    </section>
                )}

                {/* 3. Pendientes | actividades de hoy y reglas */}
                <div className="rs-columnas" ref={area}>
                    <ListaPendientes pendientes={pendientes} plazo={plazo} alCambiarPlazo={setPlazo} />

                    <aside className="rs-lateral" aria-label="Tu día">
                        {veCambios && (
                            <section className="rs-tarjeta rs-tarjeta--actividades" aria-labelledby="rs-cambios">
                                <Cabecera icono="bitacora" id="rs-cambios" titulo="Últimos cambios" texto="Lo más reciente de la bitácora" />
                                <ul className="rs-actividades rs-cambios">
                                    {MOVIMIENTOS.slice(0, 5).map((m) => (
                                        <li key={m.folio}>
                                            <div className="rs-actividades__textos">
                                                <p className="rs-actividades__titulo">{m.accion}</p>
                                                <p className="rs-actividades__detalle">{m.persona}, {m.modulo}, {fechaHora(m.fecha)}</p>
                                                {m.tipo === "Sensible" && <div className="rs-actividades__pie"><ChipEstado tono="guinda">Sensible</ChipEstado></div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <Enlace ruta="/admin/administracion/bitacora" className="rs-enlace">Ver la bitácora</Enlace>
                            </section>
                        )}
                        {veActividades && (
                        <section className="rs-tarjeta rs-tarjeta--actividades" aria-labelledby="rs-actividades">
                            <Cabecera icono="hoy" id="rs-actividades" titulo="Actividades de hoy" texto={`${actividades.length} programadas`} />
                            <ul className="rs-actividades">
                                {actividades.map((actividad) => (
                                    <li key={actividad.titulo} className={actividad.chip.texto === "Cancelada" ? "rs-actividades__cancelada" : undefined}>
                                        <span className="rs-actividades__hora"><strong>{actividad.hora}</strong><span>h</span></span>
                                        <div className="rs-actividades__textos">
                                            <p className="rs-actividades__titulo">{actividad.titulo}</p>
                                            <p className="rs-actividades__detalle">{actividad.detalle}</p>
                                            <div className="rs-actividades__pie">
                                                <ChipEstado tono={actividad.chip.tono}>{actividad.chip.texto}</ChipEstado>
                                                {actividad.pasarLista && (
                                                    <Enlace ruta="/admin/actividades/asistencia" className="rs-boton rs-boton--chico">Pasar lista</Enlace>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Enlace ruta="/admin/actividades/calendario" className="rs-enlace">Ver el calendario</Enlace>
                        </section>
                        )}

                        <details className="rs-tarjeta rs-reglas">
                            <summary>
                                <span className="rs-tarjeta__icono"><Icono nombre="info" /></span>
                                <span className="rs-reglas__titulo">Reglas de operación</span>
                                <span className="rs-reglas__mas" aria-hidden="true" />
                            </summary>
                            <ul>{REGLAS.map((regla) => <li key={regla}>{regla}</li>)}</ul>
                        </details>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

function textoDelDia(total: number, hoy: number) {
    if (total === 0) return "Estás al día: no tienes pendientes por atender.";
    const vencen = hoy === 0 ? "ninguno vence hoy" : hoy === 1 ? "1 vence hoy" : `${hoy} vencen hoy`;
    return `Tienes ${total} ${total === 1 ? "pendiente" : "pendientes"} y ${vencen}. Empieza por los que vencen primero.`;
}

function Cifra({ icono, valor, texto, tono, alPresionar }: { icono: NombreIcono; valor: number; texto: string; tono?: "vino"; alPresionar: () => void }) {
    return (
        <button type="button" className={`rs-cifra${tono ? ` rs-cifra--${tono}` : ""}`} onClick={alPresionar}>
            <span className="rs-cifra__icono" aria-hidden="true"><Icono nombre={icono} /></span>
            <span className="rs-cifra__textos"><strong>{valor}</strong><span>{texto}</span></span>
        </button>
    );
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
        <Link to={acceso.ruta} className={`rs-acceso${estado?.tono === "guinda" ? " rs-acceso--urgente" : ""}`}>
            <span className="rs-acceso__cabecera">
                <span className="rs-acceso__icono"><Icono nombre={acceso.icono} /></span>
                <span className="rs-acceso__textos">
                    <span className="rs-acceso__titulo">{acceso.titulo}</span>
                    <span className="rs-acceso__texto">{acceso.texto}</span>
                </span>
            </span>
            {estado && <ChipEstado tono={estado.tono}>{estado.texto}</ChipEstado>}
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
        <section className="rs-tarjeta rs-pendientes" id="pendientes" aria-labelledby={`${id}-titulo`}>
            <Cabecera icono="lista" id={`${id}-titulo`} titulo="Pendientes por atender" texto="Los que vencen antes van primero" />

            <div className="rs-herramientas">
                <div className="rs-segmentado" role="group" aria-label="Filtrar por vencimiento">
                    <Opcion activa={plazo === null} cantidad={porPlazo.hoy + porPlazo.manana + porPlazo.semana} alPresionar={() => alCambiarPlazo(null)}>Todos</Opcion>
                    {PLAZOS.map((x) => (
                        <Opcion key={x.id} activa={plazo === x.id} cantidad={porPlazo[x.id]} urgente={x.id === "hoy"} alPresionar={() => alCambiarPlazo(x.id)}>{x.nombre}</Opcion>
                    ))}
                </div>
                <div className="rs-herramientas__campos">
                    {areas.length > 1 && (
                        <label className="rs-campo">
                            <span className="solo-lectores">Área</span>
                            <select value={area ?? ""} onChange={(e) => setArea((e.target.value || null) as AreaPendiente | null)}>
                                <option value="">Todas las áreas</option>
                                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre} ({porArea[a.id]})</option>)}
                            </select>
                        </label>
                    )}
                    <label className="rs-campo rs-campo--buscar">
                        <span className="solo-lectores">Buscar por folio o asunto</span>
                        <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar folio o asunto" />
                    </label>
                </div>
            </div>

            <p className="solo-lectores" role="status">{filtrados.length} pendientes con estos filtros</p>

            {filtrados.length === 0 ? (
                <div className="rs-vacio">
                    <span className="rs-vacio__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                    <p className="rs-vacio__titulo">{hayFiltros ? "No hay pendientes con estos filtros" : "Estás al día"}</p>
                    <p>{hayFiltros ? "Prueba con otro plazo u otra área." : "Cuando llegue algo que atender, aparecerá aquí."}</p>
                    {hayFiltros && <button type="button" className="rs-boton rs-boton--contorno rs-boton--chico" onClick={quitarFiltros}>Quitar filtros</button>}
                </div>
            ) : (
                <div className="rs-grupos" tabIndex={0} role="region" aria-label="Lista de pendientes">
                    {(plazo ? [{ id: plazo, nombre: "", filas: visibles }] : grupos).map((g) => (
                        <div key={g.id} className="rs-grupo">
                            {!plazo && <p className={`rs-grupo__titulo rs-grupo__titulo--${g.id}`}>{g.nombre}<span>{porPlazo[g.id]}</span></p>}
                            <ul className="rs-filas">
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
        <article className="rs-fila">
            <span className="rs-fila__icono" aria-hidden="true"><Icono nombre={p.icono ?? ICONO_AREA[p.area]} /></span>
            <div className="rs-fila__textos">
                <h4 className="rs-fila__titulo">{p.asunto}</h4>
                <p className="rs-fila__detalle">
                    <span className="rs-fila__folio">{p.folio}</span>
                    <span>{NOMBRE_AREA[p.area]}</span>
                    <span>{p.responsable === "Sin asignar" ? "Sin responsable" : `Atiende ${p.responsable}`}</span>
                </p>
            </div>
            <span className={`rs-vence rs-vence--${plazo}`}>{plazo === "hoy" ? "Vence hoy" : p.vence}</span>
            <ChipEstado tono={p.estado.tono}>{p.estado.texto}</ChipEstado>
            <Enlace ruta={p.ruta} className="rs-boton rs-boton--chico">
                Atender<span className="solo-lectores"> {p.folio}</span>
            </Enlace>
        </article>
    );
}

function Opcion({ activa, cantidad, urgente, alPresionar, children }: { activa: boolean; cantidad: number; urgente?: boolean; alPresionar: () => void; children: string }) {
    return (
        <button type="button" className={`rs-opcion${activa ? " rs-opcion--activa" : ""}${urgente && cantidad > 0 ? " rs-opcion--urgente" : ""}`} aria-pressed={activa} onClick={alPresionar}>
            {children}
            <span className="rs-opcion__cantidad">{cantidad}</span>
        </button>
    );
}

// ---------- Piezas ----------
// Enlace a otra pantalla del panel. Si la cuenta no tiene permiso, no se muestra; si la pantalla aún no existe,
// el mismo aspecto sin poder presionarse.
function Enlace({ ruta, className, children }: { ruta: string; className: string; children: ReactNode }) {
    const identidad = useContext(ContextoPanel);
    const vista = vistaEnlace(ruta, identidad?.acceso);
    if (vista === "enlace") return <Link to={ruta} className={className}>{children}</Link>;
    if (vista === "oculto") return null;
    return <span className={`${className} rs-sin-enlace`} title="Sección en desarrollo">{children}</span>;
}

function ChipEstado({ tono, children }: { tono: TonoEstado; children: ReactNode }) {
    return (
        <span className={`rs-chip rs-chip--${tono}`}>
            <span className="rs-chip__punto" aria-hidden="true" />
            {children}
        </span>
    );
}

function Cabecera({ icono, id, titulo, texto }: { icono: NombreIcono; id: string; titulo: string; texto?: string }) {
    return (
        <div className="rs-tarjeta__cabecera">
            <span className="rs-tarjeta__icono"><Icono nombre={icono} /></span>
            <div>
                <h3 id={id}>{titulo}</h3>
                {texto && <p className="rs-tarjeta__texto">{texto}</p>}
            </div>
        </div>
    );
}

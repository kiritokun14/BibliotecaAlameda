// Actividades › Cambios y cancelaciones del panel, con datos reales (HU-17 / T-094 de boba, servicios/cambiosActividad.ts)
// y el diseño de las piezas del panel (23 nov 2026, Aldahir: «no tiene diseño, dáselo»).
// Bandeja: cifras que filtran → lista con antes y después de cada sesión | qué aplicar, pedir un cambio y cómo funciona.
// Detalle: qué cambia, motivo, avisos y correos | la resolución en el lugar (autorizar con acuerdo o rechazar), aplicar e historial.
// Formulario: actividad, sesiones en casillas y nueva programación | «Antes de enviarla».
// La página del portal «Mis cambios» sigue en CambiosActividadReal.tsx (con propia).
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Historial, Icono, LineaHistorial, Paginas, Plegable, Segmentado, Tarjeta, Vacio, type Movimiento, type TonoEstado } from "../piezasPanel";
import { fechaCorta } from "../atencion/comun/fechas";
import { mensajeError } from "../../../servicios/api";
import { consultarEspaciosAgenda, type ActividadPublica } from "../../../servicios/actividades";
import { actividadesParaCambio, aplicarCambioActividad, consultarCorreosCambio, listarCambiosActividad, obtenerCambioActividad,
    reintentarAvisosCambio, reintentarCorreosCambio, resolverCambioActividad, solicitarCambioActividad,
    type AcuerdoCambio, type CambioActividad, type EstadoCorreos, type ProgramacionCambio } from "../../../servicios/cambiosActividad";

const BASE = "/admin/actividades/cambios";
type Estado = CambioActividad["estado"];
const ESTADO: Record<Estado, { texto: string; tono: TonoEstado }> = {
    pendiente: { texto: "Por resolver", tono: "guinda" }, autorizado: { texto: "Por aplicar", tono: "dorado" },
    aplicado: { texto: "Aplicado", tono: "verde" }, rechazado: { texto: "Rechazado", tono: "gris" },
};
const TIPO = { reprogramacion: "Reprogramación", cancelacion: "Cancelación" };
const ACCION: Record<string, string> = {
    solicitar: "Solicitud registrada", solicitado: "Solicitud registrada", autorizar: "Autorizada con acuerdo", autorizado: "Autorizada con acuerdo",
    rechazar: "Rechazada", rechazado: "Rechazada", aplicar: "Aplicada en la agenda", aplicado: "Aplicada en la agenda",
    reintentar_avisos: "Se reintentaron los avisos", reintentar_correos: "Se reintentaron los correos",
};
const nombreAccion = (a: string) => ACCION[a] ?? (a.charAt(0).toUpperCase() + a.slice(1)).replace(/_/g, " ");
const tonoAccion = (a: string): Movimiento["tono"] => (/rechaz/.test(a) ? "guinda" : /aplic/.test(a) ? "verde" : /autoriz/.test(a) ? "dorado" : "gris");
// «17 nov 2026» y «13:03» en hora de Tepic (24 horas); «16:00:00» → «16:00»
const diaDe = (iso: string) => fechaCorta(new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Mazatlan" }));
const horaDe = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { timeZone: "America/Mazatlan", hour: "2-digit", minute: "2-digit", hour12: false });
const fechaHora = (iso: string) => `${diaDe(iso)}, ${horaDe(iso)} h`;
const hm = (h: string) => h.slice(0, 5);
const fechaDe = (c: CambioActividad) => c.historial.at(-1)?.fecha ?? c.solicitado;

// Cada sesión con su antes y su después (o «Se cancela»), en dos minicajas
function AntesDespues({ c }: { c: CambioActividad }) {
    return <>{c.anterior.map((a) => {
        const n = c.programacion.find((p) => p.sesionId === a.sesionId);
        return (
            <div className="cb-mini" key={a.sesionId}>
                <div className="cb-mini__caja cb-mini__caja--antes"><small>Antes</small><strong>{diaDe(a.inicio)}, {horaDe(a.inicio)} a {horaDe(a.fin)} h</strong><span title={a.espacio}>{a.espacio}</span></div>
                <span className="cb-mini__paso" aria-hidden="true">pasa a</span>
                {c.tipo === "cancelacion" || !n
                    ? <div className="cb-mini__caja cb-mini__caja--cancela"><small>Después</small><strong>{c.tipo === "cancelacion" ? "Se cancela" : "Sin cambio propuesto"}</strong><span>{c.tipo === "cancelacion" ? "La sala queda libre" : ""}</span></div>
                    : <div className="cb-mini__caja cb-mini__caja--despues"><small>Después</small><strong>{fechaCorta(n.fecha)}, {hm(n.inicio)} a {hm(n.fin)} h</strong><span title={n.espacio}>{n.espacio}</span></div>}
            </div>
        );
    })}</>;
}

// ---------- Bandeja e historial ----------
export default function CambiosBandeja() {
    const [parametros] = useSearchParams();
    const historial = parametros.get("vista") === "historial";
    const [pagina, setPagina] = useState(0);
    const [intento, recargar] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; lista?: CambioActividad[]; total?: number; error?: string }>({ clave: "" });
    const clave = `${pagina}:${intento}`;
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        listarCambiosActividad(false, pagina * 20).then((d) => { if (vigente) setCarga({ clave, lista: d.cambios, total: d.total }); })
            .catch((e) => { if (vigente) setCarga({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, pagina]);
    const [busqueda, setBusqueda] = useState("");
    const [estado, setEstado] = useState("");
    const [tipo, setTipo] = useState("");
    const lista = actual?.lista ?? [];
    const cuenta = (e: Estado) => lista.filter((c) => c.estado === e).length;
    const q = busqueda.trim().toLocaleLowerCase("es");
    const orden: Record<Estado, number> = { pendiente: 0, autorizado: 1, aplicado: 2, rechazado: 3 };
    const visibles = lista
        .filter((c) => (!historial || c.estado === "aplicado" || c.estado === "rechazado") && (!estado || c.estado === estado) && (!tipo || c.tipo === tipo)
            && (!q || `${c.folio} ${c.nombre}`.toLocaleLowerCase("es").includes(q)))
        .sort((a, b) => (historial ? fechaDe(b).localeCompare(fechaDe(a)) : orden[a.estado] - orden[b.estado] || b.solicitado.localeCompare(a.solicitado)));
    const porAplicar = lista.filter((c) => c.estado === "autorizado");
    const decididos = lista.filter((c) => c.estado === "aplicado" || c.estado === "rechazado").sort((a, b) => fechaDe(b).localeCompare(fechaDe(a))).slice(0, 4);
    const alternar = (e: Estado) => setEstado(estado === e ? "" : e);
    const limpiar = () => { setBusqueda(""); setEstado(""); setTipo(""); };
    const paginas = Math.max(1, Math.ceil((actual?.total ?? 0) / 20));

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={historial ? [["Cambios y cancelaciones", BASE], ["Historial"]] : [["Cambios y cancelaciones"]]} />
            <div className="pz-pagina">
                <Encabezado titulo={historial ? "Historial de cambios" : "Cambios y cancelaciones"}
                    texto={historial ? "Lo que ya se aplicó en la agenda o se rechazó, con su motivo y los avisos." : "Revisa cada solicitud, registra su resolución con el acuerdo institucional y aplícala en la agenda."}>
                    <Cifra icono="alerta" tono="vino" valor={actual?.lista ? cuenta("pendiente") : "…"} texto="por resolver" activa={estado === "pendiente"} alPresionar={() => alternar("pendiente")} />
                    <Cifra icono="reloj" valor={actual?.lista ? cuenta("autorizado") : "…"} texto="por aplicar" activa={estado === "autorizado"} alPresionar={() => alternar("autorizado")} />
                    <Cifra icono="check" valor={actual?.lista ? cuenta("aplicado") : "…"} texto="aplicados" activa={estado === "aplicado"} alPresionar={() => alternar("aplicado")} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="calendario" id="cambios-lista" titulo={historial ? "Cambios decididos" : "Solicitudes de cambio"}
                        texto={historial ? "Lo más reciente primero" : "Primero las que esperan resolución"} className="pz-pendientes"
                        accion={<Link to={historial ? BASE : `${BASE}?vista=historial`} className="pz-boton pz-boton--contorno pz-boton--chico">{historial ? "Volver a la bandeja" : "Ver historial"}</Link>}>
                        <Buscador etiqueta="Buscar por folio o actividad" placeholder="Folio o actividad" valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={(estado ? 1 : 0) + (tipo ? 1 : 0)} alQuitar={() => { setEstado(""); setTipo(""); }} grupos={[
                                { titulo: "Estado", valor: estado, alCambiar: setEstado, opciones: [{ valor: "", texto: "Todos", cantidad: lista.length },
                                    ...(Object.keys(ESTADO) as Estado[]).filter((e) => !historial || e === "aplicado" || e === "rechazado").map((e) => ({ valor: e, texto: ESTADO[e].texto, cantidad: cuenta(e) }))] },
                                { titulo: "Tipo de cambio", valor: tipo, alCambiar: setTipo, opciones: [{ valor: "", texto: "Todos" },
                                    ...(["reprogramacion", "cancelacion"] as const).map((t) => ({ valor: t, texto: TIPO[t], cantidad: lista.filter((c) => c.tipo === t).length }))] },
                            ]} />
                        </Buscador>
                        {!actual ? <p className="pz-acciones__nota cb-cargando" role="status">Cargando solicitudes…</p>
                            : actual.error ? <Vacio icono="alerta" titulo="No pudimos cargar los cambios" texto={actual.error}
                                accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => recargar((x) => x + 1)}>Reintentar</button>} />
                            : lista.length === 0 ? <Vacio icono="check" titulo="Aún no hay solicitudes de cambio" texto="Cuando alguien pida reprogramar o cancelar una sesión, aparecerá aquí." />
                            : visibles.length === 0 ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="Prueba con otra palabra u otro filtro."
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                            : (
                                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Solicitudes de cambio">
                                    <ul className="pz-filas">
                                        {visibles.map((c) => {
                                            const [d, m] = diaDe(historial ? fechaDe(c) : c.solicitado).split(" ");
                                            const accion = c.puedeResolver && c.estado === "pendiente" ? "Resolver" : c.puedeResolver && c.estado === "autorizado" ? "Aplicar" : "Abrir";
                                            return (
                                                <li key={c.folio}>
                                                    <article className={`pz-fila cb-fila cb-fila--decidida${c.estado === "pendiente" ? " pz-fila--espera" : ""}`}>
                                                        <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                        <div className="pz-fila__textos">
                                                            <h4 className="pz-fila__titulo cb-fila__titulo" title={c.nombre}>{c.nombre}</h4>
                                                            <p className="pz-fila__detalle"><span className={`cb-fila__tipo${c.tipo === "cancelacion" ? " cb-fila__tipo--vino" : ""}`}>{TIPO[c.tipo]}</span>
                                                                <span className="pz-fila__folio">{c.folio}</span><span>{c.sesiones.length} {c.sesiones.length === 1 ? "sesión" : "sesiones"}</span></p>
                                                        </div>
                                                        <Chip tono={ESTADO[c.estado].tono}>{ESTADO[c.estado].texto}</Chip>
                                                        <Link to={`${BASE}/${c.folio}`} className={`pz-boton pz-boton--chico${accion === "Abrir" ? " pz-boton--contorno" : ""}`}>{accion}<span className="solo-lectores"> {c.folio}</span></Link>
                                                        <div className="cb-fila__cambio">
                                                            <AntesDespues c={c} />
                                                            {historial && <p className={`cb-fila__motivo${c.estado === "rechazado" ? " cb-fila__motivo--vino" : ""}`}>Motivo: {c.motivo}</p>}
                                                        </div>
                                                    </article>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{visibles.length} de {actual?.total ?? 0} solicitudes</p>
                            <Paginas pagina={pagina + 1} paginas={paginas} alCambiar={(p) => setPagina(p - 1)} />
                        </div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Por aplicar y pedir un cambio">
                        <Tarjeta icono="calendario" id="cambios-pedir" titulo="Pedir un cambio" texto="Nada cambia en la agenda hasta aplicarlo">
                            <div className="cb-opciones">
                                <Link to={`${BASE}/reprogramar`} className="cb-opcion"><span className="cb-opcion__icono" aria-hidden="true"><Icono nombre="calendario" /></span>
                                    <span><strong>Reprogramar sesiones</strong><small>Otra fecha, horario o sala</small></span></Link>
                                <Link to={`${BASE}/cancelar`} className="cb-opcion cb-opcion--vino"><span className="cb-opcion__icono" aria-hidden="true"><Icono nombre="alerta" /></span>
                                    <span><strong>Cancelar sesiones</strong><small>Se libera la sala al aplicarse</small></span></Link>
                            </div>
                        </Tarjeta>
                        <Tarjeta icono="reloj" id="cambios-aplicar" titulo={porAplicar.length ? "Autorizados por aplicar" : "Lo último decidido"}
                            texto={porAplicar.length ? "Ya tienen acuerdo; falta aplicarlos en la agenda" : "Aplicados o rechazados"} className="pz-tarjeta--actividades">
                            {porAplicar.length ? (
                                <ul className="cb-pendientes">{porAplicar.map((c) => (
                                    <li key={c.folio}><Link to={`${BASE}/${c.folio}`} className="cb-pendiente">
                                        <span className="cb-pendiente__textos"><strong title={c.nombre}>{c.nombre}</strong><small>{c.folio}, {TIPO[c.tipo].toLowerCase()}</small></span>
                                        <span className="cb-pendiente__accion">Aplicar</span>
                                    </Link></li>
                                ))}</ul>
                            ) : decididos.length ? (
                                <LineaHistorial etiqueta="Lo último decidido" movimientos={decididos.map((c) => ({
                                    titulo: `${TIPO[c.tipo]}: ${c.nombre}`, tono: c.estado === "aplicado" ? "verde" : "guinda", detalle: `${fechaHora(fechaDe(c))}, ${c.folio}`,
                                }))} />
                            ) : <Vacio icono="bitacora" titulo="Nada decidido aún" texto="Lo que se aplique o rechace aparecerá aquí." />}
                        </Tarjeta>
                        <Plegable titulo="Cómo funciona un cambio">
                            <ul>
                                <li>Quien coordina la actividad pide reprogramar o cancelar una o varias sesiones, con su motivo.</li>
                                <li>Se registra la resolución: autorizar con el acuerdo institucional (referencia, autoridad y fecha) o rechazar con motivo.</li>
                                <li>Lo autorizado se aplica en la agenda: se vuelve a revisar la sala y se avisa a cada persona inscrita.</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// ---------- Detalle de una solicitud ----------
export function CambioDetalle() {
    const { folio = "" } = useParams();
    const [intento, recargar] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; cambio?: CambioActividad; error?: string }>({ clave: "" });
    const clave = `${folio}:${intento}`;
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        obtenerCambioActividad(folio).then((cambio) => { if (vigente) setCarga({ clave, cambio }); })
            .catch((e) => { if (vigente) setCarga({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, folio]);
    const c = actual?.cambio;
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones", BASE], [folio]]} />
            <div className="pz-pagina">
                <Encabezado titulo={c?.nombre ?? "Solicitud de cambio"} texto={c ? `${TIPO[c.tipo]}, folio ${c.folio}. Solicitada el ${fechaHora(c.solicitado)}.` : "Consultando la solicitud…"}>
                    {c && <Chip tono={ESTADO[c.estado].tono}>{ESTADO[c.estado].texto}</Chip>}
                    <Link to={BASE} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>
                </Encabezado>
                {!actual ? <p className="pz-acciones__nota cb-cargando" role="status">Consultando la solicitud…</p>
                    : actual.error || !c ? <div className="pz-tarjeta"><Vacio icono="alerta" titulo="No pudimos abrir la solicitud" texto={actual.error ?? "No existe."}
                        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => recargar((x) => x + 1)}>Reintentar</button>} /></div>
                    : <FichaCambio key={`${c.folio}:${c.version}`} c={c} actualizar={() => recargar((x) => x + 1)} />}
            </div>
        </PanelLayout>
    );
}

function FichaCambio({ c, actualizar }: { c: CambioActividad; actualizar: () => void }) {
    const cancelacion = c.tipo === "cancelacion";
    const [correos, setCorreos] = useState<EstadoCorreos>();
    const [errorCorreos, setErrorCorreos] = useState("");
    useEffect(() => {
        if (!c.puedeResolver) return;
        let vigente = true;
        consultarCorreosCambio(c.folio).then((d) => { if (vigente) setCorreos(d); }).catch((e) => { if (vigente) setErrorCorreos(mensajeError(e)); });
        return () => { vigente = false; };
    }, [c.folio, c.puedeResolver, c.version]);
    const [decision, setDecision] = useState<"" | "autorizar" | "rechazar">("");
    const [motivo, setMotivo] = useState("");
    const [acuerdo, setAcuerdo] = useState<AcuerdoCambio>({ referencia: "", autoridad: "", fecha: "" });
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    async function operar(accion: () => Promise<unknown>) {
        setOcupado(true); setError("");
        try { await accion(); actualizar(); } catch (e) { setError(mensajeError(e)); } finally { setOcupado(false); }
    }
    function resolver(e: FormEvent) {
        e.preventDefault();
        if (!decision) return;
        if (!motivo.trim()) { setError("Escribe el motivo de la resolución."); return; }
        if (decision === "autorizar" && (!acuerdo.referencia.trim() || !acuerdo.autoridad.trim() || !acuerdo.fecha)) { setError("Completa los datos del acuerdo institucional."); return; }
        void operar(() => resolverCambioActividad(c, decision, motivo, decision === "autorizar" ? acuerdo : undefined));
    }
    const movimientos: Movimiento[] = [...c.historial].reverse().map((h) => ({
        titulo: nombreAccion(h.accion), tono: tonoAccion(h.accion), detalle: `${fechaHora(h.fecha)}, ${h.responsable}`, nota: h.motivo || undefined,
    }));
    const campo = (k: keyof AcuerdoCambio, etiqueta: string, tipo = "text") => (
        <label className="pz-campo pz-campo--lleno"><span>{etiqueta}</span>
            <input type={tipo} maxLength={k === "referencia" ? 200 : 150} value={acuerdo[k]} onChange={(e) => { setAcuerdo({ ...acuerdo, [k]: e.target.value }); setError(""); }} /></label>
    );

    return (
        <div className="pz-columnas pz-columnas--libre">
            <div className="pz-pila">
                <Tarjeta icono={cancelacion ? "alerta" : "calendario"} id="cambio-que" titulo={cancelacion ? "Sesiones que se cancelan" : "Qué cambia en cada sesión"}
                    texto={cancelacion ? "Se liberan de la sala al aplicarse" : "Lo nuevo va en verde; horas de Tepic"}>
                    <div className="cb-sesiones"><AntesDespues c={c} /></div>
                </Tarjeta>
                <Tarjeta icono="contenido" id="cambio-datos" titulo="Motivo y acuerdo" texto="Lo que se pidió y con qué se autorizó">
                    <Datos>
                        <Dato icono="calendario" etiqueta="Solicitada">{fechaHora(c.solicitado)}</Dato>
                        <Dato icono="lista" etiqueta="Sesiones">{c.sesiones.length}</Dato>
                        <Dato ancho icono="contenido" etiqueta="Motivo">{c.motivo}</Dato>
                        {c.acuerdo && <Dato ancho icono="check" etiqueta="Acuerdo institucional">{c.acuerdo.autoridad}, referencia {c.acuerdo.referencia}, {fechaCorta(c.acuerdo.fecha)}</Dato>}
                    </Datos>
                </Tarjeta>
                <Tarjeta icono="mensajes" id="cambio-avisos" titulo="Avisos a las personas inscritas" texto="Registrar un aviso en el portal no confirma que llegó el correo">
                    <div className="cb-avisos">
                        <div className="cb-aviso"><strong>{c.avisos.registrados}</strong><span>avisos en el portal</span></div>
                        <div className={`cb-aviso${c.avisos.fallidos ? " cb-aviso--vino" : ""}`}><strong>{c.avisos.fallidos}</strong><span>avisos fallidos</span></div>
                        {correos && <>
                            <div className="cb-aviso"><strong>{correos.enviados}</strong><span>correos enviados</span></div>
                            <div className="cb-aviso"><strong>{correos.pendientes}</strong><span>correos pendientes</span></div>
                            <div className={`cb-aviso${correos.fallidos ? " cb-aviso--vino" : ""}`}><strong>{correos.fallidos}</strong><span>correos fallidos</span></div>
                            <div className="cb-aviso"><strong>{correos.inciertos}</strong><span>sin resultado confirmado</span></div>
                        </>}
                    </div>
                    {errorCorreos && <p className="cb-error" role="alert">No se pudo consultar el estado de los correos: {errorCorreos}</p>}
                    {c.puedeResolver && (c.avisos.fallidos > 0 || (correos?.fallidos ?? 0) > 0) && <div className="pz-acciones pz-acciones--fila">
                        {c.avisos.fallidos > 0 && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={ocupado} onClick={() => void operar(() => reintentarAvisosCambio(c))}>Reintentar avisos</button>}
                        {(correos?.fallidos ?? 0) > 0 && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={ocupado} onClick={() => void operar(() => reintentarCorreosCambio(c.folio))}>Reintentar correos</button>}
                    </div>}
                </Tarjeta>
            </div>

            <aside className="pz-lateral" aria-label="Resolución e historial">
                <Tarjeta icono="revision" id="cambio-resolucion" titulo={c.estado === "pendiente" ? "Resolver la solicitud" : c.estado === "autorizado" ? "Aplicar en la agenda" : "Resolución"}
                    texto={c.estado === "pendiente" ? "Autoriza con el acuerdo institucional o recházala" : c.estado === "autorizado" ? "Se revisa de nuevo la sala y se avisa a las personas" : c.estado === "aplicado" ? "Ya está en la agenda del portal" : "Las sesiones siguen como estaban"}>
                    {c.estado === "pendiente" && c.puedeResolver ? <form onSubmit={resolver} className="cb-resolver" noValidate>
                        <div className="pz-acciones">
                            <button type="button" aria-pressed={decision === "autorizar"} className={`pz-boton${decision === "rechazar" ? " pz-boton--contorno" : ""}`} onClick={() => { setDecision(decision === "autorizar" ? "" : "autorizar"); setError(""); }}>Autorizar con acuerdo</button>
                            <button type="button" aria-pressed={decision === "rechazar"} className="pz-boton pz-boton--guinda pz-boton--contorno" onClick={() => { setDecision(decision === "rechazar" ? "" : "rechazar"); setError(""); }}>Rechazar</button>
                        </div>
                        {decision && <fieldset key={decision} className="pz-decision" disabled={ocupado}>
                            {decision === "autorizar" && <>{campo("referencia", "Referencia del acuerdo")}{campo("autoridad", "Autoridad que autorizó")}{campo("fecha", "Fecha del acuerdo", "date")}</>}
                            <label className="pz-campo pz-campo--lleno"><span>{decision === "autorizar" ? "Motivo de la autorización" : "Motivo del rechazo"}</span>
                                <textarea rows={3} maxLength={1000} value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(""); }} /></label>
                            {error && <p className="cb-error" role="alert">{error}</p>}
                            <button type="submit" className={`pz-boton${decision === "rechazar" ? " pz-boton--guinda" : ""}`}>{ocupado ? "Guardando…" : decision === "autorizar" ? "Sí, autorizar" : "Sí, rechazar"}</button>
                        </fieldset>}
                    </form> : c.estado === "autorizado" && c.puedeResolver ? <>
                        <p className="pz-acciones__nota">Al aplicarlo se actualizan las sesiones y se registran los avisos en el portal.</p>
                        {error && <p className="cb-error" role="alert">{error}</p>}
                        <button type="button" className={`pz-boton${cancelacion ? " pz-boton--guinda" : ""}`} disabled={ocupado} onClick={() => void operar(() => aplicarCambioActividad(c))}>
                            {ocupado ? "Aplicando…" : cancelacion ? "Aplicar la cancelación" : "Aplicar la reprogramación"}</button>
                    </> : <>
                        {c.estado === "aplicado" && <Aviso tono="exito" titulo="Aplicado en la agenda" texto={`Se registraron ${c.avisos.registrados} avisos para las personas inscritas.`} />}
                        {c.estado === "rechazado" && <Aviso tono="error" titulo="Solicitud rechazada" texto="Las sesiones conservan su programación." />}
                        {!c.puedeResolver && c.estado !== "aplicado" && c.estado !== "rechazado" && <p className="pz-acciones__nota">Tu cuenta puede ver esta solicitud, pero no resolverla.</p>}
                    </>}
                </Tarjeta>
                <Historial id="cambio-historial" movimientos={movimientos} />
            </aside>
        </div>
    );
}

// ---------- Pedir una reprogramación o una cancelación ----------
export function CambioFormulario() {
    const { pathname } = useLocation();
    const cancelacion = pathname.endsWith("/cancelar");
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones", BASE], [cancelacion ? "Cancelar sesiones" : "Reprogramar sesiones"]]} />
            <div className="pz-pagina">
                <Encabezado titulo={cancelacion ? "Cancelar sesiones" : "Reprogramar sesiones"} texto="Pedirlo no cambia la agenda: primero se resuelve con el acuerdo institucional y después se aplica.">
                    <Link to={BASE} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>
                </Encabezado>
                <Formulario key={pathname} cancelacion={cancelacion} />
            </div>
        </PanelLayout>
    );
}

function Formulario({ cancelacion }: { cancelacion: boolean }) {
    const navigate = useNavigate();
    const [carga, setCarga] = useState<{ actividades: ActividadPublica[]; espacios: string[] } | null>(null);
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [folio, setFolio] = useState("");
    const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
    const [programacion, setProgramacion] = useState<ProgramacionCambio[]>([]);
    const [motivo, setMotivo] = useState("");
    useEffect(() => {
        let vigente = true;
        Promise.all([actividadesParaCambio(), consultarEspaciosAgenda()]).then(([actividades, espacios]) => {
            if (vigente) setCarga({ actividades, espacios: espacios.map((e) => e.nombre) });
        }).catch((e) => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, []);
    const actividad = carga?.actividades.find((a) => a.folio === folio);
    const sesiones = actividad?.sesiones.filter((s) => ["borrador", "programada"].includes(s.estado)) ?? [];
    function elegir(valor: string) {
        setFolio(valor); setSeleccionadas([]); setError("");
        setProgramacion(carga?.actividades.find((a) => a.folio === valor)?.sesiones.map((s) => ({ sesionId: s.id, fecha: s.fecha, inicio: s.inicio, fin: s.fin, espacio: s.espacio })) ?? []);
    }
    const cambiar = (id: string, k: keyof ProgramacionCambio, v: string) => setProgramacion((ps) => ps.map((p) => (p.sesionId === id ? { ...p, [k]: v } : p)));
    const faltan = [!actividad && "la actividad", !seleccionadas.length && "al menos una sesión", !motivo.trim() && "el motivo"].filter(Boolean) as string[];
    async function enviar(e: FormEvent) {
        e.preventDefault();
        if (!actividad || faltan.length) { setError(`Falta ${faltan.join(", ")}.`); return; }
        setOcupado(true); setError("");
        try {
            const c = await solicitarCambioActividad({ actividad: actividad.folio, actualizado: actividad.actualizado, tipo: cancelacion ? "cancelacion" : "reprogramacion",
                sesiones: seleccionadas, motivo, programacion: cancelacion ? [] : programacion.filter((p) => seleccionadas.includes(p.sesionId)) });
            navigate(`${BASE}/${c.folio}`);
        } catch (err) { setError(mensajeError(err)); } finally { setOcupado(false); }
    }
    return (
        <form className="pz-columnas pz-columnas--libre" onSubmit={(e) => void enviar(e)} noValidate>
            <div className="pz-pila">
                <Tarjeta icono={cancelacion ? "alerta" : "calendario"} id="cambio-formulario" titulo="La solicitud" texto="Elige la actividad y las sesiones"
                    accion={<Segmentado<"reprogramar" | "cancelar"> etiqueta="Qué pedir" valor={cancelacion ? "cancelar" : "reprogramar"} alCambiar={(v) => navigate(`${BASE}/${v}`)}
                        opciones={[{ valor: "reprogramar", texto: "Reprogramar" }, { valor: "cancelar", texto: "Cancelar" }]} />}>
                    {!carga ? (error ? <p className="cb-error" role="alert">{error}</p> : <p className="pz-acciones__nota cb-cargando" role="status">Cargando actividades…</p>)
                        : carga.actividades.length === 0 ? <Vacio icono="calendario" titulo="No hay actividades para cambiar" texto="Solo se pueden cambiar actividades aprobadas con sesiones por realizarse." />
                        : <fieldset className="cb-campos" disabled={ocupado}>
                            <label className="pz-campo pz-campo--lleno"><span>Actividad</span>
                                <select value={folio} onChange={(e) => elegir(e.target.value)}>
                                    <option value="">Elige una actividad</option>
                                    {carga.actividades.map((a) => <option key={a.folio} value={a.folio}>{a.nombre}</option>)}
                                </select></label>
                            {actividad && (sesiones.length === 0 ? <p className="pz-acciones__nota">Esta actividad no tiene sesiones por realizarse.</p> : (
                                <div className="cb-elegir" role="group" aria-label="Sesiones">
                                    <p className="cb-subtitulo">Sesiones</p>
                                    {sesiones.map((s) => {
                                        const si = seleccionadas.includes(s.id);
                                        const p = programacion.find((x) => x.sesionId === s.id)!;
                                        return (
                                            <div key={s.id} className={`cb-elegir__sesion${si ? " cb-elegir__sesion--elegida" : ""}`}>
                                                <label className={`pz-casilla${si ? " pz-casilla--elegida" : ""}`}>
                                                    <input type="checkbox" checked={si} onChange={(e) => setSeleccionadas((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))} />
                                                    <span><strong>{fechaCorta(s.fecha)}, {hm(s.inicio)} a {hm(s.fin)} h</strong><small>{s.espacio}</small></span>
                                                </label>
                                                {si && !cancelacion && (
                                                    <div className="cb-nueva">
                                                        <label className="pz-campo pz-campo--lleno"><span>Nueva fecha</span><input type="date" value={p.fecha} onChange={(e) => cambiar(s.id, "fecha", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno"><span>Inicio</span><input type="time" value={p.inicio} onChange={(e) => cambiar(s.id, "inicio", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno"><span>Fin</span><input type="time" value={p.fin} onChange={(e) => cambiar(s.id, "fin", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno"><span>Sala</span>
                                                            <select value={p.espacio} onChange={(e) => cambiar(s.id, "espacio", e.target.value)}>
                                                                <option value="">Elige una sala</option>{carga.espacios.map((n) => <option key={n}>{n}</option>)}
                                                            </select></label>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <label className="pz-campo pz-campo--lleno"><span>Motivo</span>
                                <textarea rows={3} maxLength={1000} value={motivo} placeholder="Ej.: la persona que imparte la sesión no puede ese día." onChange={(e) => setMotivo(e.target.value)} /></label>
                        </fieldset>}
                </Tarjeta>
            </div>
            <aside className="pz-lateral" aria-label="Antes de enviarla">
                <Tarjeta icono="check" id="cambio-revisar" titulo="Antes de enviarla" texto={faltan.length ? `Falta ${faltan.join(", ")}` : "Todo listo para enviar"}>
                    <ul className="cb-revisar">
                        <li className={actividad ? "cb-ok" : ""}>{actividad ? actividad.nombre : "Elige la actividad"}</li>
                        <li className={seleccionadas.length ? "cb-ok" : ""}>{seleccionadas.length ? `${seleccionadas.length} ${seleccionadas.length === 1 ? "sesión elegida" : "sesiones elegidas"}` : "Elige al menos una sesión"}</li>
                        <li className={motivo.trim() ? "cb-ok" : ""}>{motivo.trim() ? "Motivo escrito" : "Explica el motivo"}</li>
                    </ul>
                    <p className="pz-acciones__nota">Las sesiones conservan su programación hasta que se autorice y se aplique el cambio.</p>
                    {error && carga && <p className="cb-error" role="alert">{error}</p>}
                    <div className="pz-acciones">
                        <button type="submit" className={`pz-boton${cancelacion ? " pz-boton--guinda" : ""}`} disabled={ocupado || !carga}>{ocupado ? "Enviando…" : "Enviar solicitud"}</button>
                        <Link to={BASE} className="pz-boton pz-boton--contorno">Volver a la bandeja</Link>
                    </div>
                </Tarjeta>
            </aside>
        </form>
    );
}

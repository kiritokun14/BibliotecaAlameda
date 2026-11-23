// Atención › Solicitudes de credencial (rediseño del perfil de Préstamos, 22 nov 2026, T3).
// Mismas plantillas que Administración (referencia terminada): lista | lateral del mismo alto, y ficha en columnas libres
// con la decisión y el historial al lado. Los datos y las acciones son los reales del backend (servicios/tramites.ts),
// igual que en la versión anterior (AtencionTramites.tsx, que sigue sirviendo a Propuestas de eventos).
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { Migas } from "../../componentes";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, Enlace, FiltrosAvanzados, Icono, Nota, Paginas, Plegable, Tarjeta, Vacio } from "../../piezasPanel";
import { EsqueletoDetalle, EsqueletoLista } from "../../../../components/portal/Esqueleto";
import { mensajeError } from "../../../../servicios/api";
import {
    conteosEnMemoria, conteosTramites, consultarTramite, estadoTramite, listarTramites, resolverTramite, tramiteEnMemoria, tramitesEnMemoria,
    ESTADOS_CREDENCIAL, type ConteoTramites, type ListaTramites, type SolicitudAtencion,
} from "../../../../servicios/tramites";
import { partirDescripcion } from "../descripcion";
import {
    ETAPAS, ICONO_ESTADO, POR_PAGINA, RUTA_COTEJO, RUTA_CREDENCIALES, SIGUIENTE, TEXTO_DECISION, TONO_CREDENCIAL,
    abierta, antiguedad, decisionesDe, fechaCita, fechaCorta, fechaHora, folioCorto, negativa, nombreDe, partesFecha, tramiteDe,
} from "./utiles";

function Pantalla({ migas, children }: { migas: [string, string?][]; children: ReactNode }) {
    return (
        <PanelLayout titulo="Atención" tema="contenidos paleta">
            <Migas pasos={migas} />
            <div className="pz-pagina">{children}</div>
        </PanelLayout>
    );
}

const EstadoChip = ({ estado }: { estado: string }) => <Chip tono={TONO_CREDENCIAL[estado] ?? "gris"}>{ESTADOS_CREDENCIAL[estado] ?? estado}</Chip>;

// ---------- Lista ----------

const ESTADOS_FILTRO = ["recibida", "en_atencion", "cita_programada", "atendida", "rechazada", "cancelada"];

export default function SolicitudesCredencial() {
    const id = useId();
    const [filtro, setFiltro] = useState("");
    const [texto, setTexto] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const [intento, setIntento] = useState(0);
    const clave = JSON.stringify([pagina, filtro, busqueda, intento]);
    const [resultado, setResultado] = useState<{ clave: string; lista?: ListaTramites; error?: string }>({ clave: "" });
    // Mientras llega la respuesta se muestra lo último recibido para esos mismos filtros (si lo hay)
    const guardada = tramitesEnMemoria("credencial", pagina, filtro, busqueda);
    const actual = resultado.clave === clave ? resultado : guardada ? { clave, lista: guardada } : undefined;
    const conteo = useConteo();

    useEffect(() => {
        let vigente = true;
        listarTramites("credencial", false, pagina, filtro, busqueda)
            .then((lista) => { if (vigente) setResultado({ clave, lista }); })
            .catch((error) => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [clave, pagina, filtro, busqueda]);

    // La búsqueda se manda sola al dejar de escribir
    useEffect(() => {
        const espera = setTimeout(() => { setBusqueda((b) => (b === texto.trim() ? b : texto.trim())); setPagina(0); }, 350);
        return () => clearTimeout(espera);
    }, [texto]);

    const elegir = (estado: string) => { setFiltro((f) => (f === estado ? "" : estado)); setPagina(0); };
    const quitarTodo = () => { setTexto(""); setBusqueda(""); setFiltro(""); setPagina(0); };
    const lista = actual?.lista;
    const paginas = lista ? Math.max(1, Math.ceil(lista.total / POR_PAGINA)) : 1;
    const cifra = (...estados: string[]) => (conteo.datos ? estados.reduce((s, e) => s + (conteo.datos!.porEstado[e] ?? 0), 0) : conteo.error ? "—" : "…");

    return (
        <Pantalla migas={[["Solicitudes de credencial"]]}>
            <Encabezado titulo="Solicitudes de credencial" texto="Registra la atención y la cita de cotejo de cada trámite. Atender una solicitud no emite ni valida la credencial.">
                <Cifra icono="credencial" tono="vino" valor={cifra("recibida")} texto="por atender" activa={filtro === "recibida"} alPresionar={() => elegir("recibida")} />
                <Cifra icono="revision" valor={cifra("en_atencion")} texto="en atención" activa={filtro === "en_atencion"} alPresionar={() => elegir("en_atencion")} />
                <Cifra icono="calendario" valor={cifra("cita_programada")} texto="con cita" activa={filtro === "cita_programada"} alPresionar={() => elegir("cita_programada")} />
            </Encabezado>

            <div className="pz-columnas">
                <Tarjeta icono="credencial" id={`${id}-lista`} titulo="Solicitudes" className="pz-pendientes"
                    texto={lista ? `${lista.total} ${lista.total === 1 ? "solicitud" : "solicitudes"}${filtro ? `, ${(ESTADOS_CREDENCIAL[filtro] ?? filtro).toLowerCase()}` : ""}${busqueda ? `, con «${busqueda}»` : ""}` : "Consultando la bandeja…"}>
                    <Buscador etiqueta="Buscar por folio o nombre" placeholder="Buscar por folio o nombre" valor={texto} alCambiar={setTexto}>
                        <FiltrosAvanzados activos={filtro ? 1 : 0} alQuitar={() => { setFiltro(""); setPagina(0); }} grupos={[
                            { titulo: "Estado", valor: filtro || "todas", alCambiar: (v) => { setFiltro(v === "todas" ? "" : v); setPagina(0); }, opciones: [
                                { valor: "todas", texto: "Todas", cantidad: conteo.datos?.revisadas },
                                ...ESTADOS_FILTRO.map((e) => ({ valor: e, texto: ESTADOS_CREDENCIAL[e], cantidad: conteo.datos ? conteo.datos.porEstado[e] ?? 0 : undefined })),
                            ] },
                        ]} />
                    </Buscador>

                    {!actual ? <EsqueletoLista texto="Cargando solicitudes…" />
                        : actual.error ? (
                            <Aviso tono="error" titulo="No se pudo cargar la bandeja." texto={actual.error}>
                                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setIntento((x) => x + 1)}>Reintentar</button>
                            </Aviso>
                        ) : !lista?.solicitudes.length ? (
                            filtro || busqueda
                                ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="No hay solicitudes con esa búsqueda o ese estado."
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={quitarTodo}>Quitar filtros</button>} />
                                : <Vacio titulo="No hay solicitudes por ahora" texto="Cuando alguien pida su credencial desde el portal, aparecerá aquí." />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lista de solicitudes">
                                <ul className="pz-filas">
                                    {lista.solicitudes.map((s) => {
                                        const estado = estadoTramite(s);
                                        const [dia, mes] = partesFecha(s.creadaEn);
                                        return (
                                            <li key={s.id}>
                                                <article className="pz-fila">
                                                    <span className="pz-fecha" aria-hidden="true"><strong>{dia}</strong><span>{mes}</span></span>
                                                    <div className="pz-fila__textos">
                                                        <h4 className="pz-fila__titulo">{nombreDe(s)}</h4>
                                                        <p className="pz-fila__detalle">
                                                            <span>{tramiteDe(s)}</span>
                                                            <span>Folio {folioCorto(s.id)}</span>
                                                            <span>{estado === "cita_programada" && s.fechaCita ? `Cita: ${fechaCita(s.fechaCita)}` : abierta(s) ? antiguedad(s.creadaEn) : `Recibida el ${fechaCorta(s.creadaEn)}`}</span>
                                                        </p>
                                                    </div>
                                                    <EstadoChip estado={estado} />
                                                    <Link to={`${RUTA_CREDENCIALES}/${s.id}`} className={`pz-boton pz-boton--chico${abierta(s) ? "" : " pz-boton--contorno"}`}>
                                                        {abierta(s) ? "Atender" : "Ver"}<span className="solo-lectores"> la solicitud de {nombreDe(s)}</span>
                                                    </Link>
                                                </article>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                    {lista && lista.total > 0 && (
                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{lista.solicitudes.length} de {lista.total} solicitudes{conteo.datos && conteo.datos.total > conteo.datos.revisadas ? ` · las cifras cuentan las ${conteo.datos.revisadas} más recientes` : ""}</p>
                            <Paginas pagina={pagina + 1} paginas={paginas} alCambiar={(p) => setPagina(p - 1)} />
                        </div>
                    )}
                </Tarjeta>

                <aside className="pz-lateral" aria-label="Citas y cómo se atiende">
                    <ProximasCitas id={`${id}-citas`} />
                    <Plegable titulo="Cómo se atiende una solicitud">
                        <ul>
                            <li>Márcala en atención al revisarla y agenda la cita de cotejo con la persona.</li>
                            <li>En la cita se revisan sus documentos; después se registra como atendida.</li>
                            <li>Rechazar o cancelar siempre lleva un motivo, que la persona ve en su perfil.</li>
                            <li>Si la persona ya tiene credencial y solo quiere vincular su cuenta, eso se hace en Cotejo de credenciales.</li>
                        </ul>
                    </Plegable>
                </aside>
            </div>
        </Pantalla>
    );
}

function useConteo() {
    const [datos, setDatos] = useState<ConteoTramites | undefined>(() => conteosEnMemoria("credencial"));
    const [error, setError] = useState(false);
    useEffect(() => {
        let vigente = true;
        conteosTramites("credencial").then((c) => { if (vigente) setDatos(c); }).catch(() => { if (vigente) setError(true); });
        return () => { vigente = false; };
    }, []);
    return { datos, error };
}

// Lateral: las citas de cotejo que vienen, de la más próxima a la más lejana
function ProximasCitas({ id }: { id: string }) {
    const [estado, setEstado] = useState<{ citas?: SolicitudAtencion[]; error?: string }>(() => {
        const guardada = tramitesEnMemoria("credencial", 0, "cita_programada", "");
        return guardada ? { citas: guardada.solicitudes } : {};
    });
    const [intento, setIntento] = useState(0);
    const [ahora] = useState(() => Date.now());
    useEffect(() => {
        let vigente = true;
        listarTramites("credencial", false, 0, "cita_programada", "")
            .then((l) => { if (vigente) setEstado({ citas: l.solicitudes }); })
            .catch((e) => { if (vigente) setEstado({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);
    const proximas = (estado.citas ?? []).filter((s) => s.fechaCita && new Date(s.fechaCita).getTime() >= ahora - 3600000)
        .sort((a, b) => (a.fechaCita ?? "").localeCompare(b.fechaCita ?? "")).slice(0, 5);

    return (
        <Tarjeta icono="calendario" id={id} titulo="Próximas citas de cotejo" texto="La persona acude con sus documentos" className="pz-tarjeta--actividades">
            {estado.error ? (
                <Aviso tono="error" titulo="No se pudieron cargar las citas." texto={estado.error}>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setIntento((x) => x + 1)}>Reintentar</button>
                </Aviso>
            ) : !estado.citas ? <p className="pz-acciones__nota" role="status">Consultando las citas…</p>
                : proximas.length === 0 ? <Vacio icono="calendario" titulo="Sin citas próximas" texto="Cuando agendes una cita de cotejo, aparecerá aquí." />
                    : (
                        <ul className="pz-actividades">
                            {proximas.map((s) => {
                                const [dia, mes] = partesFecha(s.fechaCita!);
                                return (
                                    <li key={s.id}>
                                        <span className="pz-actividades__hora"><strong>{dia}</strong><span>{mes}</span></span>
                                        <div className="pz-actividades__textos">
                                            <p className="pz-actividades__titulo">{nombreDe(s)}</p>
                                            <p className="pz-actividades__detalle">{fechaCita(s.fechaCita!)} h</p>
                                            <div className="pz-actividades__pie">
                                                <Link to={`${RUTA_CREDENCIALES}/${s.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Abrir<span className="solo-lectores"> la cita de {nombreDe(s)}</span></Link>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
        </Tarjeta>
    );
}

// ---------- Ficha de una solicitud ----------

export function DetalleCredencial() {
    const { folio = "" } = useParams();
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<{ intento: number; solicitud?: SolicitudAtencion; error?: string }>();
    useEffect(() => {
        let vigente = true;
        consultarTramite("credencial", folio)
            .then((solicitud) => { if (vigente) setResultado({ intento, solicitud }); })
            .catch((error) => { if (vigente) setResultado({ intento, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [folio, intento]);
    const guardada = tramiteEnMemoria("credencial", folio);
    const actual = resultado?.intento === intento ? resultado : guardada ? { intento, solicitud: guardada } : undefined;
    const recargar = () => setIntento((x) => x + 1);
    const s = actual?.solicitud;

    return (
        <Pantalla migas={[["Solicitudes de credencial", RUTA_CREDENCIALES], [folioCorto(folio)]]}>
            {!actual ? <EsqueletoDetalle texto="Cargando la solicitud…" />
                : actual.error || !s ? (
                    <Aviso tono="error" titulo="No se pudo abrir la solicitud." texto={actual.error ?? "La solicitud no existe."}>
                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={recargar}>Reintentar</button>
                        <Link to={RUTA_CREDENCIALES} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a Solicitudes de credencial</Link>
                    </Aviso>
                ) : <Ficha key={s.actualizadaEn ?? s.actualizadoEn ?? s.id} s={s} alGuardar={recargar} />}
        </Pantalla>
    );
}

function Ficha({ s, alGuardar }: { s: SolicitudAtencion; alGuardar: () => void }) {
    const id = useId();
    const estado = estadoTramite(s);
    const cerrada = estado === "rechazada" || estado === "cancelada";
    const ocurridas = new Set(["recibida", ...s.historial.map((h) => h.estadoNuevo)]);
    const indice = ETAPAS.findIndex((e) => e.id === estado);
    const siguiente = SIGUIENTE[estado] ?? { titulo: "Sin acciones pendientes", texto: "Este trámite no requiere nada por ahora." };
    const observaciones = s.observacionesInstitucionales ?? s.observaciones;
    // El historial, lo más reciente arriba; el registro de la solicitud al final
    const historial = [...s.historial].reverse();

    return (
        <>
            <Encabezado titulo={nombreDe(s)} texto={`${tramiteDe(s)} de credencial con folio ${folioCorto(s.id)}. ${siguiente.texto}`}>
                <EstadoChip estado={estado} />
            </Encabezado>

            <ol className="pz-etapas" aria-label="Etapas del trámite">
                {ETAPAS.map((e, i) => {
                    const actualEtapa = e.id === estado;
                    const hecha = !actualEtapa && (ocurridas.has(e.id) || (!cerrada && i < indice));
                    return (
                        <li key={e.id} className={`pz-etapas__paso${hecha ? " pz-etapas__paso--hecho" : ""}${actualEtapa ? " pz-etapas__paso--actual" : ""}`} aria-current={actualEtapa ? "step" : undefined}>
                            <span className="pz-etapas__numero" aria-hidden="true">{hecha ? <Icono nombre="check" /> : i + 1}</span>
                            <span className="pz-etapas__texto">{e.texto}</span>
                        </li>
                    );
                })}
                {cerrada && (
                    <li className="pz-etapas__paso pz-etapas__paso--cerrado" aria-current="step">
                        <span className="pz-etapas__numero" aria-hidden="true"><Icono nombre="alerta" /></span>
                        <span className="pz-etapas__texto">{ESTADOS_CREDENCIAL[estado]}</span>
                    </li>
                )}
            </ol>

            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-pila">
                    <Tarjeta icono="usuario" id={`${id}-persona`} titulo="Persona solicitante" texto="Lo que registró en el portal">
                        <div className="pz-identidad pz-tono-rol--usuario">
                            <span className="pz-rol-avatar pz-identidad__avatar" aria-hidden="true">{nombreDe(s).charAt(0).toUpperCase()}</span>
                            <div className="pz-identidad__textos">
                                <p className="pz-identidad__nombre">{nombreDe(s)}</p>
                                <p className="pz-identidad__correo">{s.perfil?.municipio ? `${s.perfil.municipio}, Nayarit` : "Municipio sin registrar"}</p>
                            </div>
                        </div>
                        <Datos>
                            <Dato icono="credencial" etiqueta="Trámite">{tramiteDe(s)}</Dato>
                            <Dato icono="reloj" etiqueta="Recibida">{fechaCorta(s.creadaEn)}<small className="pz-dato__nota">{abierta(s) ? antiguedad(s.creadaEn) : fechaHora(s.creadaEn)}</small></Dato>
                            <Dato icono="calendario" etiqueta="Cita de cotejo">{s.fechaCita ? fechaCita(s.fechaCita) : "Sin cita"}{s.fechaCita && <small className="pz-dato__nota">Hora de Tepic</small>}</Dato>
                            <Dato icono="mensajes" etiqueta="Teléfono">{s.perfil?.telefono ? <a className="pz-enlace" href={`tel:${s.perfil.telefono}`}>{s.perfil.telefono}</a> : "Sin teléfono"}</Dato>
                            <Dato ancho icono="lista" etiqueta="Folio completo">{s.id}</Dato>
                        </Datos>
                    </Tarjeta>

                    {(s.descripcion || observaciones) && (
                        <Tarjeta icono="contenido" id={`${id}-texto`} titulo={s.descripcion ? "Lo que escribió la persona" : "Observaciones"}>
                            {s.descripcion && <Descripcion texto={s.descripcion} />}
                            {observaciones && <Nota titulo={!s.observacionesInstitucionales ? "Comentario de la persona" : "Observaciones registradas"}>{observaciones}</Nota>}
                        </Tarjeta>
                    )}

                    <Tarjeta icono="cotejo" id={`${id}-cotejo`} titulo="¿Ya tiene credencial?" texto="Vincular su cuenta es otro trámite">
                        <p className="pz-acciones__nota">Si la persona ya tiene credencial de la biblioteca y solo quiere vincularla a su cuenta del portal, eso se revisa en Cotejo de credenciales.</p>
                        <div className="pz-acciones pz-acciones--fila">
                            <Enlace ruta={RUTA_COTEJO} className="pz-boton pz-boton--contorno pz-boton--chico">Ir a Cotejo de credenciales</Enlace>
                        </div>
                    </Tarjeta>
                </div>

                <aside className="pz-lateral" aria-label="Decisión e historial">
                    <Tarjeta icono="revision" id={`${id}-decision`} titulo={siguiente.titulo} texto="La persona ve el nuevo estado y tus observaciones en su perfil">
                        <Decision s={s} alGuardar={alGuardar} />
                        <div className="pz-acciones pz-acciones--pie">
                            <Link to={RUTA_CREDENCIALES} className="pz-boton pz-boton--contorno">Volver a Solicitudes de credencial</Link>
                        </div>
                    </Tarjeta>



                    <Tarjeta icono="reloj" id={`${id}-historial`} titulo="Historial" texto="Lo más reciente arriba">
                        <ol className="pz-linea" aria-label="Historial de la solicitud">
                            {historial.map((h, i) => (
                                <li key={`${h.fecha}:${i}`} className={`pz-linea__paso pz-linea__paso--${TONO_CREDENCIAL[h.estadoNuevo] ?? "gris"}${i === 0 ? " pz-linea__paso--actual" : ""}`}>
                                    <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={ICONO_ESTADO[h.estadoNuevo] ?? "info"} /></span>
                                    <div className="pz-linea__textos">
                                        <p className="pz-linea__titulo">{ESTADOS_CREDENCIAL[h.estadoNuevo] ?? h.estadoNuevo}</p>
                                        <p className="pz-linea__detalle">{fechaHora(h.fecha)}</p>
                                        {h.nota && <p className="pz-linea__nota">{h.nota}</p>}
                                    </div>
                                </li>
                            ))}
                            <li className={`pz-linea__paso pz-linea__paso--gris${historial.length === 0 ? " pz-linea__paso--actual" : ""}`}>
                                <span className="pz-linea__icono" aria-hidden="true"><Icono nombre="credencial" /></span>
                                <div className="pz-linea__textos">
                                    <p className="pz-linea__titulo">Solicitud registrada en el portal</p>
                                    <p className="pz-linea__detalle">{fechaHora(s.creadaEn)}</p>
                                </div>
                            </li>
                        </ol>
                        {estado === "atendida" && <p className="pz-acciones__nota">Registrar la atención no emite ni valida una credencial.</p>}
                    </Tarjeta>
                </aside>
            </div>
        </>
    );
}

// La decisión: se elige qué hacer, se completan los datos que pide y se confirma (mismas reglas que antes)
function Decision({ s, alGuardar }: { s: SolicitudAtencion; alGuardar: () => void }) {
    const estado = estadoTramite(s);
    const opciones = decisionesDe(estado);
    const [decision, setDecision] = useState<string>();
    const [cita, setCita] = useState("");
    const [nota, setNota] = useState("");
    const [confirmado, setConfirmado] = useState(false);
    const [error, setError] = useState("");
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);

    if (!opciones.length) {
        return <p className="pz-acciones__nota">Esta solicitud ya está {(ESTADOS_CREDENCIAL[estado] ?? estado).toLowerCase()}; no hay más cambios de estado posibles.</p>;
    }
    const notaObligatoria = !!decision && negativa(decision);
    const textoOpcion = (op: string) => (op === "cita_programada" && estado === "cita_programada" ? "Cambiar la cita" : TEXTO_DECISION[op]);

    async function guardar() {
        if (!decision || bloqueo.current) return;
        setError("");
        if (notaObligatoria && !nota.trim()) return setError("Escribe el motivo: la persona lo verá en su perfil.");
        let fecha: string | undefined;
        if (decision === "cita_programada") {
            const f = new Date(cita);
            if (!cita || !Number.isFinite(f.getTime()) || f.getTime() <= Date.now()) return setError("Elige una fecha y hora futuras para la cita.");
            fecha = f.toISOString();
        }
        if (!confirmado) return setError("Marca la casilla para confirmar la decisión.");
        bloqueo.current = true;
        setGuardando(true);
        try {
            await resolverTramite("credencial", s, decision, nota.trim(), fecha);
            alGuardar();
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }

    return (
        <>
            <div className="pz-acciones">
                {opciones.map((op) => (
                    <button key={op} type="button" disabled={guardando} aria-pressed={decision === op}
                        onClick={() => { setDecision(decision === op ? undefined : op); setError(""); setConfirmado(false); }}
                        className={`pz-boton${negativa(op) ? " pz-boton--guinda pz-boton--contorno" : decision === op ? "" : " pz-boton--contorno"}`}>
                        {textoOpcion(op)}
                    </button>
                ))}
            </div>
            {decision && (
                <fieldset key={decision} disabled={guardando} className="pz-decision">
                    {decision === "cita_programada" && (
                        <label className="pz-campo pz-campo--lleno">
                            <span>Fecha y hora de la cita <span className="contenidos-campo__obligatorio">*</span></span>
                            <input type="datetime-local" value={cita} onChange={(e) => setCita(e.target.value)} />
                            <small className="pz-campo__ayuda">Hora de este equipo. La persona la ve en su perfil.</small>
                        </label>
                    )}
                    <label className="pz-campo pz-campo--lleno">
                        <span>{notaObligatoria ? "Motivo" : "Observaciones para la persona"}{notaObligatoria && <span className="contenidos-campo__obligatorio"> *</span>}</span>
                        <textarea rows={3} maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)}
                            placeholder={notaObligatoria ? "Explica por qué se cierra el trámite." : "Opcional: qué documentos traer o indicaciones."} />
                    </label>
                    {decision === "atendida" && <p className="pz-acciones__nota">Registrar la atención no emite ni valida la credencial.</p>}
                    <label className={`pz-casilla${confirmado ? " pz-casilla--elegida" : ""}`}>
                        <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
                        <span><strong>Revisé la solicitud</strong><small>Confirmo esta decisión.</small></span>
                    </label>
                    <button type="button" className={`pz-boton${negativa(decision) ? " pz-boton--guinda" : ""}`} onClick={() => void guardar()}>
                        {guardando ? "Guardando…" : `Sí, ${textoOpcion(decision).toLowerCase()}`}
                    </button>
                </fieldset>
            )}
            {error && (
                <Aviso tono="error" titulo="No se guardó la decisión." texto={error}>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alGuardar}>Recargar versión actual</button>
                </Aviso>
            )}
        </>
    );
}

// El portal guarda la descripción como texto libre con renglones «Etiqueta: valor»
function Descripcion({ texto }: { texto: string }) {
    return (
        <div className="pz-pila">
            {partirDescripcion(texto).map((b, i) =>
                b.tipo === "parrafo" ? <p key={i} className="pz-acciones__nota">{b.texto}</p>
                    : b.tipo === "subtitulo" ? <p key={i} className="pz-subtitulo">{b.texto}</p>
                        : <Datos key={i}>{b.pares.map(([etiqueta, valor], j) => <Dato key={j} etiqueta={etiqueta}>{valor}</Dato>)}</Datos>)}
        </div>
    );
}

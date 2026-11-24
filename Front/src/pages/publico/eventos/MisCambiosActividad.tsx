// Mis actividades › Cambios y cancelaciones (persona que propuso la actividad). Rehecho el 23 nov 2026 (Aldahir) con
// la estructura de las piezas del panel (como Mis propuestas: ListaPerfil y `pz-*`) y los colores del portal:
//   /mis-actividades/cambios              → franja verde, acciones y lista con buscador + «Filtros» (estado y tipo)
//   /mis-actividades/cambios/reprogramar  → formulario en columnas: actividad, sesiones y motivo | «Antes de enviar»
//   /mis-actividades/cambios/cancelar     → lo mismo para cancelar sesiones
//   /mis-actividades/cambios/:folio       → ficha: antes y después | estado, avisos e historial en línea del tiempo
// Mismos servicios que antes (servicios/cambiosActividad.ts); la bandeja del panel es otra pantalla (CambiosPanel.tsx).
import { useEffect, useId, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { mensajeError } from "../../../servicios/api";
import { consultarEspaciosAgenda, type ActividadPublica } from "../../../servicios/actividades";
import {
    actividadesParaCambio, listarCambiosActividad, obtenerCambioActividad, solicitarCambioActividad,
    type CambioActividad, type ProgramacionCambio,
} from "../../../servicios/cambiosActividad";
import { Aviso, Chip, Dato, Datos, Icono, Tarjeta, type TonoEstado } from "../../admin/piezasPanel";
import { FilaPerfil, ListaPerfil } from "../perfil/ListaPerfil";
import { coincide, diaMes } from "../perfil/utilesLista";
import { iconosSeccion } from "../perfil/iconos";
import "../perfil/Perfil.css";
import "./MisCambios.css";

const BASE = "/mis-actividades/cambios";
const ESTADO: Record<CambioActividad["estado"], { texto: string; tono: TonoEstado }> = {
    pendiente: { texto: "En revisión", tono: "dorado" },
    autorizado: { texto: "Autorizado", tono: "verde" },
    aplicado: { texto: "Aplicado", tono: "verde" },
    rechazado: { texto: "Rechazado", tono: "guinda" },
};
const TIPO = { reprogramacion: "Reprogramación", cancelacion: "Cancelación" } as const;
const FECHA = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mazatlan", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fecha = (iso: string) => FECHA.format(new Date(iso));

// Marco común: franja verde con el ícono y las piezas con los colores del portal (.perfil-listas)
function Pantalla({ titulo, texto, children }: { titulo: string; texto: string; children: React.ReactNode }) {
    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Mis actividades" titulo={<>{titulo.split(" ")[0]} <span>{titulo.split(" ").slice(1).join(" ")}</span></>}
                texto={texto} icono={iconosSeccion.eventos} />
            <section className="mc-pagina">
                <div className="mc-contenedor perfil-listas">{children}</div>
            </section>
        </PaginaPublica>
    );
}

export default function MisCambiosActividad() {
    const { folio } = useParams();
    const { pathname } = useLocation();
    if (pathname.endsWith("/reprogramar") || pathname.endsWith("/cancelar")) return <FormularioCambio key={pathname} cancelacion={pathname.endsWith("/cancelar")} />;
    if (folio) return <FichaCambio key={folio} folio={folio} />;
    return <ListaCambios />;
}

// ---------- Lista ----------
function ListaCambios() {
    const [intento, setIntento] = useState(0);
    const [pagina, setPagina] = useState(0);
    const [carga, setCarga] = useState<{ clave: string; lista?: CambioActividad[]; total?: number; error?: string }>({ clave: "" });
    const [texto, setTexto] = useState("");
    const [estado, setEstado] = useState("todos");
    const [tipo, setTipo] = useState("todos");
    const clave = `${pagina}:${intento}`;
    const actual = carga.clave === clave ? carga : undefined;
    useEffect(() => {
        let vigente = true;
        listarCambiosActividad(true, pagina * 20)
            .then((d) => { if (vigente) setCarga({ clave, lista: d.cambios, total: d.total }); })
            .catch((e) => { if (vigente) setCarga({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, pagina]);

    const lista = actual?.lista ?? [];
    const filtrados = lista.filter((c) => (estado === "todos" || c.estado === estado) && (tipo === "todos" || c.tipo === tipo)
        && coincide(texto, c.folio, c.nombre, c.motivo));
    const cuenta = (e: string, t: string) => lista.filter((c) => (e === "todos" || c.estado === e) && (t === "todos" || c.tipo === t)).length;
    const hayMas = (actual?.total ?? 0) > (pagina + 1) * 20;

    return (
        <Pantalla titulo="Cambios y cancelaciones" texto="Pide reprogramar o cancelar sesiones de las actividades que propusiste. El horario oficial no cambia hasta que el personal lo autoriza.">
            <div className="mc-acciones">
                <Link to={`${BASE}/reprogramar`} className="pz-boton">Solicitar reprogramación</Link>
                <Link to={`${BASE}/cancelar`} className="pz-boton pz-boton--contorno pz-boton--guinda">Solicitar cancelación</Link>
                <Link to="/mi-perfil/propuestas" className="pz-boton pz-boton--contorno">Mis propuestas</Link>
            </div>
            <ListaPerfil icono="calendario" titulo="Mis solicitudes" texto="Abre una para ver el antes y después, su estado y el historial"
                buscar={{ etiqueta: "Buscar una solicitud", placeholder: "Folio, actividad o motivo", valor: texto, alCambiar: setTexto }}
                filtros={[
                    { titulo: "Estado", valor: estado, alCambiar: setEstado, opciones: [
                        { valor: "todos", texto: "Todos", cantidad: cuenta("todos", tipo) },
                        ...(Object.keys(ESTADO) as CambioActividad["estado"][]).map((e) => ({ valor: e, texto: ESTADO[e].texto, cantidad: cuenta(e, tipo) })),
                    ] },
                    { titulo: "Tipo", valor: tipo, alCambiar: setTipo, opciones: [
                        { valor: "todos", texto: "Todos", cantidad: cuenta(estado, "todos") },
                        { valor: "reprogramacion", texto: TIPO.reprogramacion, cantidad: cuenta(estado, "reprogramacion") },
                        { valor: "cancelacion", texto: TIPO.cancelacion, cantidad: cuenta(estado, "cancelacion") },
                    ] },
                ]}
                activos={(estado === "todos" ? 0 : 1) + (tipo === "todos" ? 0 : 1)} alQuitar={() => { setEstado("todos"); setTipo("todos"); }}
                estado={!actual ? "cargando" : actual.error ? "error" : "listo"} error={actual?.error} alReintentar={() => setIntento((x) => x + 1)}
                hayElementos={lista.length > 0} sinResultados={filtrados.length === 0}
                vacio={{ titulo: "No has pedido cambios", texto: "Si una actividad que propusiste necesita otra fecha, otro horario u otra sala, o hay que cancelarla, pídelo aquí.",
                    accion: <Link to={`${BASE}/reprogramar`} className="pz-boton pz-boton--chico">Solicitar reprogramación</Link> }}
                pie={(pagina > 0 || hayMas) && <>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Más recientes</button>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" disabled={!hayMas} onClick={() => setPagina((p) => p + 1)}>Más antiguas</button>
                </>}>
                {filtrados.map((c) => (
                    <FilaPerfil key={c.folio} fecha={diaMes(c.solicitado)} tono={c.tipo === "cancelacion" && c.estado !== "rechazado" ? "guinda" : ESTADO[c.estado].tono}
                        titulo={c.nombre} estado={ESTADO[c.estado].texto} apagada={c.estado === "rechazado"}
                        detalle={<><span className="pz-fila__folio">{c.folio}</span><span>{TIPO[c.tipo]}</span><span>{c.sesiones.length} {c.sesiones.length === 1 ? "sesión" : "sesiones"}</span></>}
                        acciones={<Link to={`${BASE}/${c.folio}`} className={`pz-boton pz-boton--chico${c.estado === "pendiente" ? "" : " pz-boton--contorno"}`}>Ver</Link>} />
                ))}
            </ListaPerfil>
            <p className="mc-nota"><Icono nombre="info" /> Solicitar no modifica el horario oficial. El personal registra la autorización institucional antes de aplicar el cambio, y quienes están inscritos reciben un aviso.</p>
        </Pantalla>
    );
}

// ---------- Formulario ----------
function FormularioCambio({ cancelacion }: { cancelacion: boolean }) {
    const id = useId();
    const navegar = useNavigate();
    const [carga, setCarga] = useState<{ actividades: ActividadPublica[]; espacios: string[] } | null>(null);
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [folio, setFolio] = useState("");
    const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
    const [programacion, setProgramacion] = useState<ProgramacionCambio[]>([]);
    const [motivo, setMotivo] = useState("");
    useEffect(() => {
        let vigente = true;
        Promise.all([actividadesParaCambio(), consultarEspaciosAgenda()])
            .then(([actividades, espacios]) => { if (vigente) setCarga({ actividades, espacios: espacios.map((e) => e.nombre) }); })
            .catch((e) => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, []);
    const actividad = carga?.actividades.find((a) => a.folio === folio);
    const sesiones = actividad?.sesiones.filter((s) => ["borrador", "programada"].includes(s.estado)) ?? [];
    function elegir(valor: string) {
        setFolio(valor); setSeleccionadas([]);
        setProgramacion(carga?.actividades.find((a) => a.folio === valor)?.sesiones.map((s) => ({ sesionId: s.id, fecha: s.fecha, inicio: s.inicio, fin: s.fin, espacio: s.espacio })) ?? []);
    }
    const cambiar = (sid: string, campo: keyof ProgramacionCambio, valor: string) => setProgramacion((ps) => ps.map((p) => (p.sesionId === sid ? { ...p, [campo]: valor } : p)));
    const listo = { actividad: !!actividad, sesiones: seleccionadas.length > 0, motivo: motivo.trim().length >= 10 };
    async function enviar(e: FormEvent) {
        e.preventDefault();
        if (!actividad) { setError("Elige la actividad."); return; }
        if (!seleccionadas.length) { setError("Selecciona al menos una sesión."); return; }
        if (!listo.motivo) { setError("Cuenta el motivo con al menos 10 caracteres."); return; }
        setOcupado(true); setError("");
        try {
            const c = await solicitarCambioActividad({
                actividad: actividad.folio, actualizado: actividad.actualizado, tipo: cancelacion ? "cancelacion" : "reprogramacion",
                sesiones: seleccionadas, motivo: motivo.trim(), programacion: cancelacion ? [] : programacion.filter((p) => seleccionadas.includes(p.sesionId)),
            });
            navegar(`${BASE}/${c.folio}`);
        } catch (err) { setError(mensajeError(err)); }
        finally { setOcupado(false); }
    }
    const titulo = cancelacion ? "Cancelar sesiones" : "Reprogramar sesiones";
    return (
        <Pantalla titulo={titulo} texto={cancelacion ? "Elige las sesiones que ya no se podrán realizar y cuenta por qué." : "Elige las sesiones y propón su nueva fecha, horario o sala."}>
            <Link to={BASE} className="mc-volver">Volver a mis solicitudes</Link>
            <form className="mc-columnas" onSubmit={(e) => void enviar(e)} noValidate>
                <fieldset className="mc-principal" disabled={ocupado}>
                    <Tarjeta icono="calendario" id={`${id}-act`} titulo="1. Actividad" texto="Solo aparecen tus actividades aprobadas">
                        {!carga ? <p className="pz-ayuda" role="status">Cargando tus actividades…</p>
                            : carga.actividades.length === 0 ? <Aviso tono="espera" titulo="No tienes actividades aprobadas" texto="Cuando el personal apruebe una de tus propuestas podrás pedir cambios aquí." />
                            : (
                                <label className="pz-campo pz-campo--lleno">
                                    <span>Actividad *</span>
                                    <select value={folio} onChange={(e) => elegir(e.target.value)} required>
                                        <option value="">Elige una actividad</option>
                                        {carga.actividades.map((a) => <option key={a.folio} value={a.folio}>{a.nombre}</option>)}
                                    </select>
                                </label>
                            )}
                    </Tarjeta>
                    {actividad && (
                        <Tarjeta icono="reloj" id={`${id}-ses`} titulo="2. Sesiones" texto={cancelacion ? "Marca las que se cancelan" : "Marca las que cambian y escribe su nueva programación"}>
                            {sesiones.length === 0 ? <p className="pz-ayuda">Esta actividad no tiene sesiones por realizar.</p> : (
                                <ul className="mc-sesiones">
                                    {sesiones.map((s) => {
                                        const marcada = seleccionadas.includes(s.id);
                                        const p = programacion.find((x) => x.sesionId === s.id)!;
                                        return (
                                            <li key={s.id} className={`mc-sesion${marcada ? " mc-sesion--elegida" : ""}`}>
                                                <label className="mc-sesion__casilla">
                                                    <input type="checkbox" checked={marcada} onChange={(e) => setSeleccionadas((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))} />
                                                    <span><strong>{s.fecha} · {s.inicio} a {s.fin}</strong><small>{s.espacio}</small></span>
                                                </label>
                                                {!cancelacion && marcada && (
                                                    <div className="mc-sesion__nueva">
                                                        <label className="pz-campo pz-campo--lleno"><span>Nueva fecha</span><input type="date" required value={p.fecha} onChange={(e) => cambiar(s.id, "fecha", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno"><span>Inicio</span><input type="time" required value={p.inicio} onChange={(e) => cambiar(s.id, "inicio", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno"><span>Fin</span><input type="time" required value={p.fin} onChange={(e) => cambiar(s.id, "fin", e.target.value)} /></label>
                                                        <label className="pz-campo pz-campo--lleno mc-sesion__sala"><span>Sala</span>
                                                            <select required value={p.espacio} onChange={(e) => cambiar(s.id, "espacio", e.target.value)}>
                                                                <option value="">Elige una sala</option>
                                                                {carga?.espacios.map((n) => <option key={n}>{n}</option>)}
                                                            </select>
                                                        </label>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Tarjeta>
                    )}
                    <Tarjeta icono="mensajes" id={`${id}-mot`} titulo={actividad ? "3. Motivo" : "2. Motivo"} texto="El personal lo lee antes de decidir">
                        <label className="pz-campo pz-campo--lleno">
                            <span>Motivo *</span>
                            <textarea rows={4} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. La sala no estará disponible por mantenimiento" />
                            <small className="pz-campo__ayuda">{motivo.length} de 1000</small>
                        </label>
                    </Tarjeta>
                </fieldset>
                <aside className="mc-lateral">
                    <Tarjeta icono="check" id={`${id}-env`} titulo="Antes de enviar" texto="Revisa que esté completo">
                        <ul className="mc-lista">
                            <li className={listo.actividad ? "mc-lista--listo" : ""}>Actividad elegida</li>
                            <li className={listo.sesiones ? "mc-lista--listo" : ""}>{seleccionadas.length === 0 ? "Ninguna sesión marcada" : `${seleccionadas.length} ${seleccionadas.length === 1 ? "sesión marcada" : "sesiones marcadas"}`}</li>
                            <li className={listo.motivo ? "mc-lista--listo" : ""}>Motivo escrito</li>
                        </ul>
                        {error && <Aviso tono="error" titulo="No se pudo enviar" texto={error} />}
                        <button type="submit" className={`pz-boton${cancelacion ? " pz-boton--guinda" : ""}`} disabled={ocupado || !carga}>{ocupado ? "Enviando…" : "Enviar solicitud"}</button>
                        <p className="pz-ayuda">Las sesiones conservan su programación hasta que se autorice y aplique el cambio.</p>
                    </Tarjeta>
                </aside>
            </form>
        </Pantalla>
    );
}

// ---------- Ficha ----------
function FichaCambio({ folio }: { folio: string }) {
    const id = useId();
    const [intento, setIntento] = useState(0);
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
        <Pantalla titulo="Detalle de la solicitud" texto={c ? `${c.folio} · ${c.nombre}` : "Consultando tu solicitud…"}>
            <Link to={BASE} className="mc-volver">Volver a mis solicitudes</Link>
            {!actual ? <p className="pz-ayuda" role="status">Cargando…</p> : actual.error || !c ? (
                <Aviso tono="error" titulo="No pudimos cargar la solicitud" texto={actual.error}>
                    <button type="button" className="pz-boton pz-boton--chico" onClick={() => setIntento((x) => x + 1)}>Reintentar</button>
                </Aviso>
            ) : (
                <div className="mc-columnas">
                    <div className="mc-principal">
                        <Tarjeta icono={c.tipo === "cancelacion" ? "alerta" : "calendario"} id={`${id}-cambio`} titulo={TIPO[c.tipo]}
                            texto={`${c.sesiones.length} ${c.sesiones.length === 1 ? "sesión afectada" : "sesiones afectadas"}`}
                            accion={<Chip tono={ESTADO[c.estado].tono}>{ESTADO[c.estado].texto}</Chip>}>
                            <ul className="mc-antes-despues">
                                {c.anterior.map((a) => {
                                    const nueva = c.programacion.find((p) => p.sesionId === a.sesionId);
                                    return (
                                        <li key={a.sesionId} className="cb-mini">
                                            <div className="cb-mini__caja cb-mini__caja--antes"><small>Antes</small><strong>{fecha(a.inicio)}</strong><span>{a.espacio}</span></div>
                                            <span className="cb-mini__paso" aria-hidden="true">pasa a</span>
                                            {c.tipo === "cancelacion"
                                                ? <div className="cb-mini__caja cb-mini__caja--cancela"><small>Después</small><strong>Se cancela</strong><span>La sala queda libre</span></div>
                                                : <div className="cb-mini__caja cb-mini__caja--despues"><small>Después</small><strong>{nueva ? `${nueva.fecha}, ${nueva.inicio} a ${nueva.fin}` : "Sin cambio"}</strong><span>{nueva?.espacio ?? ""}</span></div>}
                                        </li>
                                    );
                                })}
                            </ul>
                            <Datos>
                                <Dato etiqueta="Motivo" icono="mensajes" ancho>{c.motivo}</Dato>
                                <Dato etiqueta="Solicitada" icono="reloj">{fecha(c.solicitado)}</Dato>
                                {c.acuerdo && <Dato etiqueta="Acuerdo" icono="revision">{c.acuerdo.autoridad} · {c.acuerdo.referencia}</Dato>}
                            </Datos>
                        </Tarjeta>
                    </div>
                    <aside className="mc-lateral">
                        <Tarjeta icono="aviso" id={`${id}-avisos`} titulo="Avisos a inscritos" texto="Se registran al aplicar el cambio">
                            <Datos>
                                <Dato etiqueta="Registrados" icono="check">{c.avisos.registrados}</Dato>
                                <Dato etiqueta="Fallidos" icono="alerta">{c.avisos.fallidos}</Dato>
                            </Datos>
                        </Tarjeta>
                        <Tarjeta icono="lista" id={`${id}-hist`} titulo="Historial" texto="Lo que ha pasado con tu solicitud">
                            <ol className="pz-linea">
                                {c.historial.map((h, i) => (
                                    <li key={i} className={`pz-linea__paso pz-linea__paso--${i === c.historial.length - 1 ? "dorado pz-linea__paso--actual" : "verde"}`}>
                                        <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={i === 0 ? "propuesta" : "check"} /></span>
                                        <div className="pz-linea__textos">
                                            <p className="pz-linea__titulo">{h.accion}</p>
                                            <p className="pz-linea__detalle">{fecha(h.fecha)} · {h.responsable}{h.motivo ? ` · ${h.motivo}` : ""}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </Tarjeta>
                    </aside>
                </div>
            )}
        </Pantalla>
    );
}

import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, Migas, Pagina, PieDatos, Resultado, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import { mensajeError } from "../../../servicios/api";
import {
    ajustarProgreso, asignarRecompensa, avanceNivel, cancelarAsignacion, confirmarEntrega, consultarParticipante, listarRecompensas,
    NOMBRE_RAZON, nombreNivel, puedeRecibir, siguienteNivel, type Entrega, type FichaProgreso, type Recompensa,
} from "../../../servicios/progreso";
import { diaDe, estadoCredencial, NOMBRE_ENTREGA, TEXTO_CREDENCIAL, TONO_ENTREGA } from "./progreso";
import { BASE_PROGRESO } from "./utiles";
import { Aviso, Chip as ChipPz, Cifra, Dato as DatoPz, Datos as DatosPz, Encabezado as EncabezadoPz, Icono as IconoPz, Tarjeta as TarjetaPz, Vacio as VacioPz } from "../piezasPanel";
import { GaleriaInsignias } from "../../../components/portal/Insignias";
import { contarPorTipo, insigniasDe } from "../../../servicios/insignias";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

// Progreso · ficha (Figma 572:27973), ajustar progreso (572:28431), entregar recompensa (572:28544)
// y error al entregar (637:51315). Diseño de Aldahir con los datos reales de HU-28 / HU-29.
// La ruta lleva el id de la cuenta (:folio). Asignar registra la autorización de la Dirección y aparta
// una pieza; confirmar la entrega es un paso aparte; cancelar una asignación devuelve la pieza.

type Ventanas = null | "ajustar" | "asignar" | { confirmar: Entrega } | { cancelar: Entrega };
export type ResultadoFicha = { tipo: "ajustado" | "asignada" | "entregada" | "cancelada"; persona: string; titulo: string; linea: string };
const hoyTepic = () => diaDe(new Date().toISOString());

export function FichaParticipante() {
    const { folio: usuarioId = "" } = useParams();
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<{ intento: number; ficha?: FichaProgreso; recompensas?: Recompensa[]; error?: string; estado?: number }>();
    const leer = useCallback(() => Promise.all([consultarParticipante(usuarioId), listarRecompensas()]), [usuarioId]);
    useEffect(() => {
        let vigente = true;
        leer().then(([ficha, recompensas]) => { if (vigente) setResultado({ intento, ficha, recompensas }); })
            .catch((error) => { if (vigente) setResultado({ intento, error: mensajeError(error), estado: (error as { estado?: number }).estado }); });
        return () => { vigente = false; };
    }, [leer, intento]);
    const actual = resultado?.intento === intento ? resultado : undefined;

    if (actual?.estado === 404) return <Navigate to={BASE_PROGRESO} replace />;
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [actual?.ficha?.resumen.nombre ?? "Ficha"]]} />
            {!actual ? <div className="pz-pagina"><VacioPz icono="reloj" titulo="Cargando ficha…" texto="Esto tarda unos segundos." /></div>
                : actual.error ? (
                    <div className="pz-pagina"><VacioPz icono="alerta" titulo="No pudimos cargar la ficha" texto={actual.error}
                        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => setIntento((i) => i + 1)}>Reintentar</button>} /></div>
                ) : <Ficha ficha={actual.ficha!} recompensas={actual.recompensas!} />}
        </PanelLayout>
    );
}

function Ficha({ ficha, recompensas }: { ficha: FichaProgreso; recompensas: Recompensa[] }) {
    const navigate = useNavigate();
    const { resumen: p, participaciones, ajustes, entregas } = ficha;
    const [ventana, setVentana] = useState<Ventanas>(null);
    const [cambio, setCambio] = useState("1");
    const [motivo, setMotivo] = useState("");
    const [asignacion, setAsignacion] = useState({ recompensaId: "", referencia: "", autoridad: "Dirección de la biblioteca", fechaAutorizacion: hoyTepic(), notas: "" });
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [fallo, setFallo] = useState("");
    const [ocupado, setOcupado] = useState(false);

    const s = siguienteNivel(p.total);
    const ruta = `${BASE_PROGRESO}/${p.usuarioId}`;
    const credencial = estadoCredencial(p);
    const pendientes = entregas.filter((e) => e.estado === "asignada");
    const elegibles = recompensas.filter((r) => !puedeRecibir(p, r, entregas));
    const tipos = contarPorTipo(participaciones.filter((x) => x.cuenta).map((x) => x.actividad));
    const insignias = insigniasDe({ asistencias: p.validas, clubes: tipos.clubes, talleres: tipos.talleres, credencial: credencial === "vigente" ? 1 : 0, propuestas: 0 });

    // Línea de tiempo: participaciones y ajustes, lo más reciente arriba
    const linea = [
        ...participaciones.map((x) => ({ id: x.sesionId, fecha: x.inicio, titulo: x.actividad, detalle: NOMBRE_RAZON[x.razon], cuenta: x.cuenta, ajuste: false, nota: "", valor: x.cuenta ? "+1" : "0" })),
        ...ajustes.map((x) => ({ id: x.id, fecha: x.fecha, titulo: "Ajuste manual", detalle: `Registró ${x.quien}`, cuenta: true, ajuste: true, nota: x.motivo, valor: x.cambio > 0 ? `+${x.cambio}` : `${x.cambio}` })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    function abrir(v: Ventanas) { setErrores({}); setFallo(""); setMotivo(""); setVentana(v); }

    async function ejecutar(accion: () => Promise<ResultadoFicha>) {
        setOcupado(true); setFallo("");
        try {
            const r = await accion();
            navigate(`${ruta}/${r.tipo}`, { state: r });
        } catch (error) {
            setFallo(mensajeError(error));
        } finally { setOcupado(false); }
    }

    function guardarAjuste() {
        if (!motivo.trim()) return setErrores({ motivo: "Escribe el motivo del ajuste." });
        const n = Number(cambio);
        void ejecutar(async () => {
            const f = await ajustarProgreso(p.usuarioId, n, motivo.trim());
            return { tipo: "ajustado", persona: p.usuarioId, titulo: p.nombre, linea: `${n > 0 ? "+" : ""}${n} · Total: ${f.resumen.total} · ${nombreNivel(f.resumen.nivel)}` };
        });
    }

    function guardarAsignacion() {
        const e: Record<string, string> = {};
        if (!asignacion.recompensaId) e.recompensaId = "Elige la recompensa.";
        if (!asignacion.referencia.trim()) e.referencia = "Escribe el oficio, acta o folio de la autorización.";
        if (!asignacion.autoridad.trim()) e.autoridad = "Escribe quién autorizó.";
        if (!asignacion.fechaAutorizacion) e.fechaAutorizacion = "Escribe la fecha de la autorización.";
        else if (asignacion.fechaAutorizacion > hoyTepic()) e.fechaAutorizacion = "La fecha no puede ser futura.";
        setErrores(e);
        if (Object.keys(e).length) return;
        void ejecutar(async () => {
            const r = await asignarRecompensa({ ...asignacion, usuarioId: p.usuarioId, referencia: asignacion.referencia.trim(), autoridad: asignacion.autoridad.trim(), notas: asignacion.notas.trim() });
            return { tipo: "asignada", persona: p.usuarioId, titulo: `${r.recompensa} · ${p.nombre}`, linea: `Autorización ${r.autorizacion?.referencia ?? ""} · Asignó ${r.asignadaPor}` };
        });
    }

    return (
        <>
            <div className="pz-pagina">
                <EncabezadoPz titulo={p.nombre} texto={`${TEXTO_CREDENCIAL[credencial]}${p.credencial?.vence ? ` hasta el ${fechaCorta(p.credencial.vence)}` : ""}. ${p.ultimaParticipacion ? `Última participación: ${fechaCorta(diaDe(p.ultimaParticipacion))}.` : "Aún sin participaciones que cuenten."}`}>
                    <Cifra icono="check" valor={p.total} texto={p.ajustes ? `participaciones (${p.ajustes > 0 ? "+" : ""}${p.ajustes} por ajuste)` : "participaciones"} />
                    <Cifra icono="estadisticas" valor={nombreNivel(p.nivel)} texto="nivel" />
                    <Cifra icono="recompensa" tono={pendientes.length ? "vino" : undefined} valor={pendientes.length} texto="por entregar" />
                </EncabezadoPz>
                <div className="pz-columnas pz-columnas--libre">
                    <div className="pz-pila">
                        <TarjetaPz icono="recompensa" id="ficha-recompensas" titulo="Recompensas" texto="Asignadas con autorización de la Dirección; la entrega se confirma aparte">
                            {entregas.length ? (
                                <ul className="pz-filas">
                                    {entregas.map((e) => (
                                        <li key={e.id}>
                                            <article className="pz-fila pr-fila">
                                                <span className="pz-fila__icono" aria-hidden="true"><IconoPz nombre="recompensa" /></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{e.recompensa}</h4>
                                                    <p className="pz-fila__detalle">
                                                        <span>Asignó {e.asignadaPor}, {fechaCorta(diaDe(e.asignadaEn))}</span>
                                                        {e.autorizacion && <span>{e.autorizacion.autoridad}, {e.autorizacion.referencia} ({fechaCorta(e.autorizacion.fecha)})</span>}
                                                        {e.estado === "entregada" && e.confirmadaEn && <span>Entregó {e.confirmadaPor}, {fechaCorta(diaDe(e.confirmadaEn))}</span>}
                                                        {e.estado === "cancelada" && <span>Cancelada: {e.motivoCancelacion}</span>}
                                                    </p>
                                                </div>
                                                <ChipPz tono={TONO_ENTREGA[e.estado]}>{NOMBRE_ENTREGA[e.estado]}</ChipPz>
                                                {e.estado === "asignada" && (
                                                    <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                                        <button type="button" className="pz-boton pz-boton--chico" onClick={() => abrir({ confirmar: e })}>Entregar<span className="solo-lectores"> {e.recompensa}</span></button>
                                                        <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => abrir({ cancelar: e })}>Cancelar<span className="solo-lectores"> la asignación de {e.recompensa}</span></button>
                                                    </span>
                                                )}
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            ) : <VacioPz icono="recompensa" titulo="Sin recompensas" texto="Cuando la Dirección autorice una recompensa, asígnala desde aquí." />}
                        </TarjetaPz>
                        <TarjetaPz icono="recompensa" id="ficha-insignias" titulo="Insignias" texto="Se ganan solas al participar; la persona las ve en su perfil">
                            <GaleriaInsignias insignias={insignias} compacta />
                        </TarjetaPz>
                        <TarjetaPz icono="asistencia" id="ficha-actividades" titulo="Participaciones y ajustes" texto={`${linea.length} ${linea.length === 1 ? "registro" : "registros"}, lo más reciente arriba`}>
                            {linea.length ? (
                                <ol className="pz-linea">
                                    {linea.map((x, n) => (
                                        <li key={x.id} className={`pz-linea__paso pz-linea__paso--${x.ajuste ? "dorado" : x.cuenta ? "verde" : "gris"}${n === 0 ? " pz-linea__paso--actual" : ""}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><IconoPz nombre={x.ajuste ? "revision" : x.cuenta ? "check" : "alerta"} /></span>
                                            <div className="pz-linea__textos">
                                                <p className="pz-linea__titulo">{x.titulo} <span className="pr-puntos">{x.valor}</span></p>
                                                <p className="pz-linea__detalle">{fechaCorta(diaDe(x.fecha))}, {x.detalle}</p>
                                                {x.nota && <p className="pz-linea__nota">{x.nota}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : <VacioPz icono="asistencia" titulo="Aún sin participaciones" texto="Cuando el personal registre su asistencia, aparecerá aquí." />}
                        </TarjetaPz>
                    </div>
                    <aside className="pz-lateral" aria-label="Nivel y recompensas">
                        <TarjetaPz icono="recompensa" id="ficha-meta" titulo={`Nivel ${nombreNivel(p.nivel)}`}
                            texto={s ? `Le ${s.faltan === 1 ? "falta 1 participación" : `faltan ${s.faltan} participaciones`} para ${s.nombre}` : "Nivel más alto"}
                            accion={<ChipPz tono={credencial === "vigente" ? "verde" : "gris"}>{credencial === "vigente" ? "Suma" : "En pausa"}</ChipPz>}>
                            <div className={`ins-medidor ins-medidor--${s ? "dorado" : "verde"}`} style={{ ["--p" as string]: `${avanceNivel(p.total)}%` }} role="img" aria-label={s ? `${p.total} de ${s.desde} participaciones` : `${p.total} participaciones`}>
                                <span className="ins-medidor__centro"><strong>{p.total}</strong><small>{s ? `de ${s.desde}` : "participaciones"}</small></span>
                            </div>
                            <DatosPz>
                                <DatoPz ancho icono="check" etiqueta="Verificadas por asistencia">{p.validas}</DatoPz>
                                {p.noContadas > 0 && <DatoPz ancho icono="alerta" etiqueta="No contaron">{p.noContadas} sin credencial vigente ese día</DatoPz>}
                                <DatoPz ancho icono="recompensa" etiqueta="Puede recibir">{elegibles.length ? elegibles.map((r) => r.nombre).join(", ") : "Ninguna por ahora"}</DatoPz>
                            </DatosPz>
                            <div className="pz-acciones">
                                <button type="button" className="pz-boton" disabled={!elegibles.length} onClick={() => { abrir("asignar"); setAsignacion((a) => ({ ...a, recompensaId: elegibles.length === 1 ? elegibles[0].id : "" })); }}>Asignar recompensa</button>
                                <button type="button" className="pz-boton pz-boton--contorno" onClick={() => { abrir("ajustar"); setCambio("1"); }}>Ajustar progreso</button>
                            </div>
                            {!elegibles.length && <p className="pz-acciones__nota">{credencial !== "vigente" ? "Asignar se habilita con credencial validada y vigente." : "No hay otra recompensa activa, con existencias y para su nivel."}</p>}
                            <Link to={BASE_PROGRESO} className="pz-enlace">Volver a Progreso y recompensas</Link>
                        </TarjetaPz>
                    </aside>
                </div>
            </div>

            {ventana === "ajustar" && (
                <Ventana titulo="Ajustar progreso" texto="Úsalo solo para corregir errores. Queda en el historial con tu nombre y el motivo." alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={guardarAjuste}>{ocupado ? "Guardando…" : "Guardar ajuste"}</button></>}>
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Participaciones", `${p.total} · ${nombreNivel(p.nivel)}`]]} />
                    <CampoTexto id="pr-ajuste" etiqueta="Ajuste" obligatorio>
                        <select id="pr-ajuste" className="cn-control" value={cambio} onChange={(e) => setCambio(e.target.value)}>
                            {[1, 2, 3, -1, -2, -3].map((n) => <option key={n} value={n} disabled={n < 0 && p.total + n < 0}>{n > 0 ? `+${n}` : `−${-n}`} {Math.abs(n) === 1 ? "participación" : "participaciones"}</option>)}
                        </select>
                    </CampoTexto>
                    <CampoTexto id="pr-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                        <textarea id="pr-motivo" maxLength={500} className={`cn-control cn-control--area ${errores.motivo ? "cn-control--error" : ""}`} placeholder="Ej.: asistió pero no se marcó su asistencia." value={motivo}
                            onChange={(e) => { setMotivo(e.target.value); setErrores({}); }} aria-invalid={!!errores.motivo} aria-describedby={errores.motivo ? "pr-motivo-error" : undefined} />
                    </CampoTexto>
                    {fallo && <Aviso tono="error" titulo="No se guardó el ajuste." texto={fallo} />}
                </Ventana>
            )}
            {ventana === "asignar" && (
                <Ventana titulo="Asignar recompensa" texto="Registra la autorización de la Dirección. Se aparta una pieza; la entrega se confirma después." alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={guardarAsignacion}>{ocupado ? "Asignando…" : "Asignar"}</button></>}>
                    <CampoTexto id="as-recompensaId" etiqueta="Recompensa" obligatorio error={errores.recompensaId}>
                        <select id="as-recompensaId" className={`cn-control ${errores.recompensaId ? "cn-control--error" : ""}`} value={asignacion.recompensaId} aria-invalid={!!errores.recompensaId}
                            onChange={(e) => { setAsignacion((a) => ({ ...a, recompensaId: e.target.value })); setErrores({}); }}>
                            <option value="">Elige una recompensa</option>
                            {elegibles.map((r) => <option key={r.id} value={r.id}>{r.nombre} ({r.existencias} en existencia)</option>)}
                        </select>
                    </CampoTexto>
                    <div className="cn-campos__fila">
                        <CampoTexto id="as-referencia" etiqueta="Oficio o acta de autorización" obligatorio error={errores.referencia}>
                            <input id="as-referencia" maxLength={120} className={`cn-control ${errores.referencia ? "cn-control--error" : ""}`} value={asignacion.referencia} aria-invalid={!!errores.referencia}
                                onChange={(e) => { setAsignacion((a) => ({ ...a, referencia: e.target.value })); setErrores({}); }} />
                        </CampoTexto>
                        <CampoTexto id="as-fecha" etiqueta="Fecha de autorización" obligatorio error={errores.fechaAutorizacion}>
                            <input id="as-fecha" type="date" max={hoyTepic()} className={`cn-control ${errores.fechaAutorizacion ? "cn-control--error" : ""}`} value={asignacion.fechaAutorizacion} aria-invalid={!!errores.fechaAutorizacion}
                                onChange={(e) => { setAsignacion((a) => ({ ...a, fechaAutorizacion: e.target.value })); setErrores({}); }} />
                        </CampoTexto>
                    </div>
                    <CampoTexto id="as-autoridad" etiqueta="Quién autorizó" obligatorio error={errores.autoridad}>
                        <input id="as-autoridad" maxLength={150} className={`cn-control ${errores.autoridad ? "cn-control--error" : ""}`} value={asignacion.autoridad} aria-invalid={!!errores.autoridad}
                            onChange={(e) => { setAsignacion((a) => ({ ...a, autoridad: e.target.value })); setErrores({}); }} />
                    </CampoTexto>
                    <CampoTexto id="as-notas" etiqueta="Notas (opcional)">
                        <textarea id="as-notas" maxLength={500} className="cn-control cn-control--area" value={asignacion.notas} onChange={(e) => setAsignacion((a) => ({ ...a, notas: e.target.value }))} />
                    </CampoTexto>
                    {fallo && <Aviso tono="error" titulo="No se asignó la recompensa." texto={fallo} />}
                </Ventana>
            )}
            {ventana && typeof ventana === "object" && "confirmar" in ventana && (
                <Ventana titulo={fallo ? "No se pudo confirmar" : "¿Confirmar la entrega?"} texto={fallo ? "La recompensa sigue asignada." : "Registra que la persona ya recibió la recompensa."} alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado}
                        onClick={() => void ejecutar(async () => { const r = await confirmarEntrega(ventana.confirmar.id); return { tipo: "entregada", persona: p.usuarioId, titulo: `${r.recompensa} · ${p.nombre}`, linea: `Entregó: ${r.confirmadaPor} · ${fechaCorta(diaDe(r.confirmadaEn ?? new Date().toISOString()))}` }; })}>
                        {ocupado ? "Guardando…" : fallo ? "Reintentar" : "Confirmar entrega"}</button></>}>
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Recompensa", ventana.confirmar.recompensa], ["Autorización", ventana.confirmar.autorizacion?.referencia ?? "—"]]} />
                    {fallo && <Aviso tono="error" titulo="Hubo un problema al guardar." texto={fallo} />}
                </Ventana>
            )}
            {ventana && typeof ventana === "object" && "cancelar" in ventana && (
                <Ventana titulo="Cancelar la asignación" texto="La pieza vuelve a las existencias. Queda en el historial con tu nombre y el motivo." alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Volver</button><button type="button" className={clasesBoton("verde")} disabled={ocupado}
                        onClick={() => { if (!motivo.trim()) return setErrores({ motivo: "Escribe el motivo." }); void ejecutar(async () => { const r = await cancelarAsignacion(ventana.cancelar.id, motivo.trim()); return { tipo: "cancelada", persona: p.usuarioId, titulo: `${r.recompensa} · ${p.nombre}`, linea: `Motivo: ${r.motivoCancelacion ?? ""}` }; }); }}>
                        {ocupado ? "Guardando…" : "Cancelar asignación"}</button></>}>
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Recompensa", ventana.cancelar.recompensa]]} />
                    <CampoTexto id="pr-cancelar" etiqueta="Motivo" obligatorio error={errores.motivo}>
                        <textarea id="pr-cancelar" maxLength={500} className={`cn-control cn-control--area ${errores.motivo ? "cn-control--error" : ""}`} placeholder="Ej.: no se presentó a recogerla." value={motivo}
                            onChange={(e) => { setMotivo(e.target.value); setErrores({}); }} aria-invalid={!!errores.motivo} />
                    </CampoTexto>
                    {fallo && <Aviso tono="error" titulo="No se canceló." texto={fallo} />}
                </Ventana>
            )}
        </>
    );
}

const TEXTOS_RESULTADO: Record<ResultadoFicha["tipo"], { titulo: string; texto: string; chip: string }> = {
    ajustado: { titulo: "Progreso ajustado", texto: "El ajuste quedó en el historial con su motivo.", chip: "Ajustado" },
    asignada: { titulo: "Recompensa asignada", texto: "Se apartó una pieza. Confirma la entrega cuando la persona la reciba.", chip: "Por entregar" },
    entregada: { titulo: "Recompensa entregada", texto: "La entrega quedó registrada con tu nombre.", chip: "Entregada" },
    cancelada: { titulo: "Asignación cancelada", texto: "La pieza volvió a las existencias.", chip: "Cancelada" },
};

// Resultados: recompensa entregada (572:28648) y progreso ajustado (631:50594); asignada y cancelada con el mismo diseño
export function ResultadoParticipante({ tipo }: { tipo: ResultadoFicha["tipo"] }) {
    const { folio } = useParams();
    const estado = useLocation().state as ResultadoFicha | null;
    if (!estado || estado.tipo !== tipo || estado.persona !== folio) return <Navigate to={folio ? `${BASE_PROGRESO}/${folio}` : BASE_PROGRESO} replace />;
    const t = TEXTOS_RESULTADO[tipo];
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [t.titulo]]} />
                <Encabezado grande etiqueta="Progreso y recompensas" titulo={t.titulo} texto={t.texto} />
                <Resultado tono={tipo === "cancelada" ? "dorado" : "verde"} icono={iconoCheck} titulo={estado.titulo} linea={estado.linea}
                    chip={<Chip tono={tipo === "cancelada" ? "gris" : tipo === "asignada" ? "dorado" : "verde"}>{t.chip}</Chip>} />
                <div className="cn-acciones">
                    <Link to={`${BASE_PROGRESO}/${folio}`} className={clasesBoton("verde")}>Ver ficha</Link>
                    <Link to={BASE_PROGRESO} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Progreso y recompensas</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

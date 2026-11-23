import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, Pasos, PieDatos, Resultado, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { espacios, fechaCorta, obtenerActividad, useActividades } from "./datos";
import { useSalas } from "./salas";
import { ocupacion } from "./calendario";
import { aplicarCambio, cancelarActividad, NOMBRE_ESTADO_CAMBIO, obtenerCambio, programable, rechazarCambio, solicitarReprogramacion, useCambios, type Programacion } from "./cambios";
import { BASE_CAMBIOS, TONO_CAMBIO } from "./utiles";
import { Chip as ChipPz, Dato, Datos as DatosPz, Encabezado as EncabezadoPz, Historial, Icono as IconoPz, Tarjeta as TarjetaPz, type Movimiento, type TonoEstado } from "../piezasPanel";
import iconoReloj from "../../../assets/admin/actividades/resultado-reloj.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoFlecha from "../../../assets/admin/contenidos/tarjeta-flecha.svg";

const prog = (p?: Programacion) => (p ? `${fechaCorta(p.fecha)} · ${p.hora}` : "—");

// Cambios · detalle, rehecho con las piezas del panel (22 nov 2026, Aldahir: «mejora el diseño al entrar al detalle»).
// Encabezado con el estado → el cambio (antes y después lado a lado) y sus efectos | la decisión en el lugar
// (aplicar y avisar con el mensaje, o rechazar con motivo) y el historial debajo, como las demás fichas.
export function DetalleCambio() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useCambios();
    const actividades = useActividades();
    const { bloqueos } = useSalas();
    const [decision, setDecision] = useState<null | "aplicar" | "rechazar">(null);
    const [mensaje, setMensaje] = useState("");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const c = obtenerCambio(folio);
    if (!c) return <Navigate to={BASE_CAMBIOS} replace />;
    const ruta = `${BASE_CAMBIOS}/${c.folio}`;
    const a = obtenerActividad(c.actividad);
    const cancelacion = c.tipo === "Cancelación";
    const libre = c.despues ? ocupacion(c.despues.sala, c.despues.fecha, c.despues.hora, actividades.filter((x) => x.folio !== c.actividad), bloqueos).tipo === "libre" : true;
    const solicito = c.solicito.replace(/ \(ejemplo\)$/, "");
    const cambia = (campo: keyof Programacion) => !cancelacion && !!c.despues && c.despues[campo] !== c.antes[campo];

    function elegir(d: "aplicar" | "rechazar") {
        setError("");
        if (d === "aplicar" && !mensaje) setMensaje(cancelacion ? "Lamentamos cancelar la actividad." : `Cambiamos ${c!.tipo === "Cambio de sala" ? "la sala" : "la fecha"} de la actividad. Si ya no puedes asistir, puedes cancelar tu inscripción.`);
        setDecision(decision === d ? null : d);
    }
    function confirmar() {
        if (decision === "aplicar") { aplicarCambio(c!.folio, mensaje); navigate(`${ruta}/aplicado`); return; }
        if (!motivo.trim()) { setError("Escribe el motivo del rechazo."); return; }
        rechazarCambio(c!.folio, motivo); navigate(`${ruta}/rechazado`);
    }

    const movimientos: Movimiento[] = [
        ...(c.estado === "aplicado" ? [{ titulo: cancelacion ? "Actividad cancelada y avisada" : "Cambio aplicado y avisado", tono: "verde" as const, detalle: `${fechaCorta(c.aplico?.fecha ?? "")}, ${c.aplico?.quien ?? "Coordinación"}`, nota: `Se avisó a ${c.avisados} ${c.avisados === 1 ? "persona" : "personas"}.` }] : []),
        ...(c.estado === "rechazado" ? [{ titulo: "Cambio rechazado", tono: "guinda" as const, detalle: fechaCorta(c.rechazo?.fecha ?? ""), nota: c.rechazo?.motivo }] : []),
        ...(c.estado === "pendiente" ? [{ titulo: "Esperando tu decisión", tono: "dorado" as const, detalle: `Afecta a ${c.inscritos} ${c.inscritos === 1 ? "persona inscrita" : "personas inscritas"}` }] : []),
        { titulo: `${c.tipo} solicitado`, tono: "gris" as const, icono: "contenido" as const, detalle: `${fechaCorta(c.solicitado)}, ${solicito}`, nota: c.motivo },
    ];

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <div className="pz-pagina">
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones", BASE_CAMBIOS], [c.folio]]} />
                <EncabezadoPz titulo={c.nombre} texto={`${c.tipo}, folio ${c.folio}. Lo solicitó ${solicito.toLowerCase() === "personal" ? "el personal" : solicito} el ${fechaCorta(c.solicitado)}.`}>
                    <ChipPz tono={TONO_CAMBIO[c.estado] as TonoEstado}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</ChipPz>
                    <Link to={BASE_CAMBIOS} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>
                </EncabezadoPz>

                <div className="pz-columnas pz-columnas--libre">
                    <div className="pz-pila">
                        <TarjetaPz icono="calendario" id="cambio-que" titulo={cancelacion ? "Qué se cancela" : "Qué cambia"} texto={cancelacion ? "La sesión deja de estar en la agenda y se libera la sala" : "Lo que cambia va resaltado en verde"}>
                            <div className="cb-comparar">
                                <section className="cb-lado cb-lado--antes" aria-labelledby="cb-antes">
                                    <p id="cb-antes" className="cb-lado__titulo">Antes</p>
                                    <dl className="cb-lado__datos">
                                        <div><dt><IconoPz nombre="calendario" />Fecha</dt><dd>{fechaCorta(c.antes.fecha)}</dd></div>
                                        <div><dt><IconoPz nombre="reloj" />Hora</dt><dd>{c.antes.hora} h</dd></div>
                                        <div><dt><IconoPz nombre="espacios" />Sala</dt><dd>{c.antes.sala}</dd></div>
                                    </dl>
                                </section>
                                <span className="cb-comparar__paso" aria-hidden="true">pasa a</span>
                                {cancelacion || !c.despues ? (
                                    <section className="cb-lado cb-lado--cancelada" aria-labelledby="cb-despues">
                                        <p id="cb-despues" className="cb-lado__titulo">Después</p>
                                        <p className="cb-lado__cancelada"><IconoPz nombre="alerta" />Se cancela</p>
                                        <p className="cb-lado__nota">La sala queda libre en ese horario.</p>
                                    </section>
                                ) : (
                                    <section className="cb-lado cb-lado--despues" aria-labelledby="cb-despues">
                                        <p id="cb-despues" className="cb-lado__titulo">Después</p>
                                        <dl className="cb-lado__datos">
                                            <div className={cambia("fecha") ? "cb-cambia" : ""}><dt><IconoPz nombre="calendario" />Fecha</dt><dd>{fechaCorta(c.despues.fecha)}</dd></div>
                                            <div className={cambia("hora") ? "cb-cambia" : ""}><dt><IconoPz nombre="reloj" />Hora</dt><dd>{c.despues.hora} h</dd></div>
                                            <div className={cambia("sala") ? "cb-cambia" : ""}><dt><IconoPz nombre="espacios" />Sala</dt><dd>{c.despues.sala}</dd></div>
                                        </dl>
                                    </section>
                                )}
                            </div>
                        </TarjetaPz>
                        <TarjetaPz icono="alerta" id="cambio-efectos" titulo="Motivo y efectos" texto="A quién afecta y qué se revisó">
                            <DatosPz>
                                <Dato ancho icono="contenido" etiqueta="Motivo">{c.motivo}</Dato>
                                <Dato icono="grupo" etiqueta="Personas inscritas">{c.inscritos}{a ? ` de ${a.cupo}` : ""}</Dato>
                                <Dato icono="info" etiqueta="Aviso">{c.estado === "aplicado" ? `Avisadas ${c.avisados}` : "Por correo al aplicar"}</Dato>
                                {!cancelacion && <Dato icono="espacios" etiqueta="Sala en la nueva fecha"><ChipPz tono={libre ? "verde" : "guinda"}>{libre ? "Disponible" : "Ocupada"}</ChipPz></Dato>}
                                <Dato icono="lista" etiqueta="Lista de espera">{a?.espera ? `${a.espera} ${a.espera === 1 ? "persona" : "personas"}` : "Sin lista"}</Dato>
                            </DatosPz>
                            {!cancelacion && !libre && c.estado === "pendiente" && <p className="pz-acciones__nota">La sala ya está ocupada en el nuevo horario: si lo aplicas, habrá dos actividades en el mismo lugar.</p>}
                        </TarjetaPz>
                    </div>

                    <aside className="pz-lateral" aria-label="Decisión e historial">
                        <TarjetaPz icono="revision" id="cambio-decision" titulo={c.estado === "pendiente" ? "Qué decides" : "Decisión tomada"}
                            texto={c.estado === "pendiente" ? "Al aplicarlo se actualiza la agenda y se avisa a cada persona" : c.estado === "aplicado" ? "Ya está en la agenda del portal" : "La actividad sigue como estaba"}>
                            {c.estado === "pendiente" ? <>
                                <div className="pz-acciones">
                                    <button type="button" aria-pressed={decision === "aplicar"} className={`pz-boton${decision === "rechazar" ? " pz-boton--contorno" : ""}`} onClick={() => elegir("aplicar")}>{cancelacion ? "Cancelar y avisar" : "Aplicar cambio y avisar"}</button>
                                    <button type="button" aria-pressed={decision === "rechazar"} className="pz-boton pz-boton--guinda pz-boton--contorno" onClick={() => elegir("rechazar")}>Rechazar cambio</button>
                                </div>
                                {decision && <fieldset key={decision} className="pz-decision">
                                    {decision === "aplicar" ? (
                                        <label className="pz-campo pz-campo--lleno"><span>Mensaje para las {c.inscritos} personas inscritas</span>
                                            <textarea rows={4} maxLength={600} value={mensaje} onChange={(e) => setMensaje(e.target.value)} /></label>
                                    ) : (
                                        <label className="pz-campo pz-campo--lleno"><span>Motivo del rechazo <span className="contenidos-campo__obligatorio">*</span></span>
                                            <textarea rows={3} maxLength={600} placeholder="Ej.: la nueva fecha coincide con otro evento." value={motivo} aria-invalid={!!error}
                                                onChange={(e) => { setMotivo(e.target.value); setError(""); }} /></label>
                                    )}
                                    {error && <p className="cb-error" role="alert">{error}</p>}
                                    <p className="pz-acciones__nota">{decision === "aplicar" ? "Se actualiza el portal y cada persona recibe el aviso por correo." : "Se avisa a quien lo solicitó; la actividad no cambia."}</p>
                                    <button type="button" className={`pz-boton${decision === "rechazar" ? " pz-boton--guinda" : ""}`} onClick={confirmar}>{decision === "aplicar" ? "Sí, aplicar y avisar" : "Sí, rechazar"}</button>
                                </fieldset>}
                            </> : (
                                <DatosPz>
                                    <Dato ancho icono={c.estado === "aplicado" ? "check" : "alerta"} etiqueta={c.estado === "aplicado" ? "Aplicó" : "Motivo"}>{c.estado === "aplicado" ? `${c.aplico?.quien}, ${fechaCorta(c.aplico?.fecha ?? "")}` : c.rechazo?.motivo}</Dato>
                                </DatosPz>
                            )}
                            <Link to={`${BASE_CAMBIOS}?vista=historial`} className="pz-boton pz-boton--contorno pz-boton--chico cb-ver-historial">Ver todos los cambios decididos</Link>
                        </TarjetaPz>
                        <Historial id="cambio-historial" movimientos={movimientos} />
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// Cambios · cancelar una actividad (Figma 569:23928) y confirmar cancelación (569:24378)
export function CancelarActividad() {
    const navigate = useNavigate();
    const actividades = useActividades().filter((a) => programable(a.estado));
    const [folio, setFolio] = useState("");
    const [motivo, setMotivo] = useState("");
    const [avisarPor, setAvisarPor] = useState("Correo electrónico");
    const [reprogramar, setReprogramar] = useState("Sí, elegir fecha después");
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [confirmar, setConfirmar] = useState(false);
    const a = actividades.find((x) => x.folio === folio);

    function revisar() {
        const e: Record<string, string> = {};
        if (!a) e.actividad = "Elige la actividad.";
        if (!motivo.trim()) e.motivo = "Escribe el motivo.";
        setErrores(e);
        if (!Object.keys(e).length) setConfirmar(true);
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones", BASE_CAMBIOS], [confirmar ? "Confirmar cancelación" : "Cancelar actividad"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cambios y cancelaciones", ruta: BASE_CAMBIOS }} etiqueta="Cambios y cancelaciones" titulo="Cancelar una actividad" texto="Se avisará a las personas inscritas y se liberará la sala." />
                <Tarjeta icono={iconoLapiz} titulo="Datos de la cancelación">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="cc-actividad" etiqueta="Actividad" obligatorio error={errores.actividad}>
                                <select id="cc-actividad" className={`cn-control ${errores.actividad ? "cn-control--error" : ""}`} value={folio} onChange={(e) => { setFolio(e.target.value); setErrores((x) => ({ ...x, actividad: "" })); }}>
                                    <option value="">Elige una actividad</option>
                                    {actividades.map((x) => <option key={x.folio} value={x.folio}>{x.nombre} · {fechaCorta(x.fecha)}</option>)}
                                </select>
                            </CampoTexto>
                            <CampoTexto id="cc-inscritos" etiqueta="Inscritos a avisar"><p id="cc-inscritos" className="cn-control cn-control--fijo">{a ? a.inscritos : "—"}</p></CampoTexto>
                        </div>
                        <CampoTexto id="cc-motivo" etiqueta="Motivo" obligatorio ayuda="Se incluye en el aviso a las personas inscritas." error={errores.motivo}>
                            <textarea id="cc-motivo" className={`cn-control cn-control--area ${errores.motivo ? "cn-control--error" : ""}`} placeholder="Ej.: ponente no disponible." value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrores((x) => ({ ...x, motivo: "" })); }} />
                        </CampoTexto>
                        <div className="cn-campos__fila">
                            <CampoTexto id="cc-avisar" etiqueta="Avisar por"><select id="cc-avisar" className="cn-control" value={avisarPor} onChange={(e) => setAvisarPor(e.target.value)}><option>Correo electrónico</option><option>Correo y aviso en el portal</option></select></CampoTexto>
                            <CampoTexto id="cc-reprog" etiqueta="Ofrecer reprogramar"><select id="cc-reprog" className="cn-control" value={reprogramar} onChange={(e) => setReprogramar(e.target.value)}><option>Sí, elegir fecha después</option><option>No</option></select></CampoTexto>
                        </div>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("guinda")} onClick={revisar}>Cancelar actividad</button>
                    <Link to={`${BASE_CAMBIOS}/reprogramar${folio ? `?actividad=${folio}` : ""}`} className={clasesBoton("contorno")}>Mejor reprogramar</Link>
                    <Link to={BASE_CAMBIOS} className={`${clasesBoton("suave")} panel-regresar`}>Volver</Link>
                </div>
                <PieDatos />
            </Pagina>
            {confirmar && a && (
                <Ventana
                    titulo="¿Cancelar la actividad?"
                    texto={`Esta acción avisa a ${a.inscritos} personas. Si cambias de opinión, puedes crear otra actividad.`}
                    alCerrar={() => setConfirmar(false)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setConfirmar(false)}>Volver</button><button type="button" className={clasesBoton("guinda")} onClick={() => { const f = cancelarActividad(a.folio, motivo, avisarPor); navigate(`${BASE_CAMBIOS}/${f}/cancelada`); }}>Sí, cancelar actividad</button></>}
                >
                    <Datos variante="caja" filas={[["Actividad", a.nombre], ["Fecha", fechaCorta(a.fecha)], ["Personas a avisar", String(a.inscritos)]]} />
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Cambios · reprogramar (Figma 569:24881)
export function Reprogramar() {
    const navigate = useNavigate();
    const actividades = useActividades().filter((a) => programable(a.estado));
    const [params] = useSearchParams();
    const inicial = params.get("actividad") ?? "";
    const [folio, setFolio] = useState(actividades.some((a) => a.folio === inicial) ? inicial : "");
    const elegida = actividades.find((x) => x.folio === folio);
    const [d, setD] = useState<Programacion>({ fecha: elegida?.fecha ?? "", hora: elegida?.inicio ?? "", sala: elegida?.espacio ?? "" });
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<Record<string, string>>({});

    function elegir(f: string) {
        setFolio(f);
        const a = actividades.find((x) => x.folio === f);
        if (a) setD({ fecha: a.fecha, hora: a.inicio, sala: a.espacio });
        setErrores({});
    }
    function enviar() {
        const e: Record<string, string> = {};
        if (!elegida) e.actividad = "Elige la actividad.";
        if (!d.fecha) e.fecha = "Elige la nueva fecha.";
        if (!d.hora) e.hora = "Elige la hora.";
        if (!d.sala) e.sala = "Elige la sala.";
        if (!motivo.trim()) e.motivo = "Escribe el motivo.";
        if (elegida && d.fecha === elegida.fecha && d.hora === elegida.inicio && d.sala === elegida.espacio) e.fecha = "Cambia la fecha, la hora o la sala.";
        setErrores(e);
        if (Object.keys(e).length) return;
        const f = solicitarReprogramacion(folio, d, motivo);
        navigate(`${BASE_CAMBIOS}/${f}/enviada`);
    }
    const clase = (c: string) => `cn-control ${errores[c] ? "cn-control--error" : ""}`;

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones", BASE_CAMBIOS], ["Reprogramar"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Cambios y cancelaciones", ruta: BASE_CAMBIOS }} etiqueta="Cambios y cancelaciones" titulo="Reprogramar una actividad" texto="Elige nueva fecha, hora o sala." />
                <Tarjeta icono={iconoLapiz} titulo="Nueva programación">
                    <div className="cn-campos">
                        <CampoTexto id="rp-actividad" etiqueta="Actividad" obligatorio error={errores.actividad}>
                            <select id="rp-actividad" className={clase("actividad")} value={folio} onChange={(e) => elegir(e.target.value)}>
                                <option value="">Elige una actividad</option>
                                {actividades.map((x) => <option key={x.folio} value={x.folio}>{x.nombre}</option>)}
                            </select>
                        </CampoTexto>
                        <div className="cn-campos__fila">
                            <CampoTexto id="rp-fecha" etiqueta="Nueva fecha" obligatorio error={errores.fecha}><input id="rp-fecha" type="date" className={clase("fecha")} value={d.fecha} onChange={(e) => setD({ ...d, fecha: e.target.value })} /></CampoTexto>
                            <CampoTexto id="rp-hora" etiqueta="Hora" obligatorio error={errores.hora}><input id="rp-hora" type="time" className={clase("hora")} value={d.hora} onChange={(e) => setD({ ...d, hora: e.target.value })} /></CampoTexto>
                            <CampoTexto id="rp-sala" etiqueta="Sala" obligatorio error={errores.sala}><select id="rp-sala" className={clase("sala")} value={d.sala} onChange={(e) => setD({ ...d, sala: e.target.value })}><option value="">Elige una sala</option>{espacios().map((x) => <option key={x.nombre}>{x.nombre}</option>)}</select></CampoTexto>
                        </div>
                        <CampoTexto id="rp-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                            <textarea id="rp-motivo" className={`${clase("motivo")} cn-control--area`} placeholder="Ej.: cambio de la persona a cargo." value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} onClick={enviar}>Enviar para decisión</button>
                    <Link to={BASE_CAMBIOS} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Cambios · resultados: aplicado (569:23171), rechazado (623:49922), actividad cancelada (569:24466), solicitud enviada (623:50096)
export function ResultadoCambio({ tipo }: { tipo: "aplicado" | "rechazado" | "cancelada" | "enviada" }) {
    const { folio } = useParams();
    useCambios();
    const c = obtenerCambio(folio);
    const esperado = { aplicado: "aplicado", rechazado: "rechazado", cancelada: "aplicado", enviada: "pendiente" }[tipo];
    if (!c || c.estado !== esperado) return <Navigate to={c ? `${BASE_CAMBIOS}/${c.folio}` : BASE_CAMBIOS} replace />;
    const corto = c.nombre.split(":")[0];
    const datos = {
        aplicado: { etiqueta: `Cambio ${c.folio} · Aplicado`, titulo: "Cambio aplicado", texto: "El portal ya muestra la nueva programación.", tono: "verde" as const, icono: iconoCheck, nombre: `${corto} · ${prog(c.despues)}`, linea: `${c.avisados} personas avisadas por correo`, chip: <Chip tono="verde">Aplicado</Chip> },
        rechazado: { etiqueta: `Cambio ${c.folio} · Rechazado`, titulo: "Cambio rechazado", texto: "La actividad sigue como estaba.", tono: "guinda" as const, icono: iconoX, nombre: `${corto} · ${prog(c.antes)}`, linea: `Motivo: ${c.rechazo?.motivo}`, chip: <Chip tono="guinda">Rechazado</Chip> },
        cancelada: { etiqueta: `Cambio ${c.folio} · Cancelación`, titulo: "Actividad cancelada", texto: "Se avisó a las personas inscritas y la sala quedó libre.", tono: "guinda" as const, icono: iconoX, nombre: `${c.nombre} · ${fechaCorta(c.antes.fecha)}`, linea: `${c.avisados} personas avisadas · Motivo: ${c.motivo}`, chip: <Chip tono="guinda">Cancelada</Chip> },
        enviada: { etiqueta: "Solicitud de cambio · Enviada", titulo: "Solicitud enviada", texto: "Queda a la espera de una decisión.", tono: "verde" as const, icono: iconoReloj, nombre: `${corto} · ${prog(c.despues)}`, linea: "Aún no se avisa a las personas inscritas", chip: <Chip tono="verde">En espera</Chip> },
    }[tipo];

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Cambios y cancelaciones", BASE_CAMBIOS], [datos.titulo]]} />
                <Encabezado grande etiqueta={datos.etiqueta} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={datos.nombre} linea={datos.linea} chip={datos.chip} />
                {tipo === "enviada" && (
                    <Tarjeta icono={iconoFlecha} titulo="¿Qué sigue?">
                        <Pasos pasos={[["Se revisa la solicitud", "Quien decide la aprueba o la rechaza."], ["Nada cambia todavía", "La actividad sigue publicada como estaba."], ["Recibirás el aviso", "Aparecerá en la bandeja de cambios."]]} />
                    </Tarjeta>
                )}
                <div className="cn-acciones">
                    <Link to={BASE_CAMBIOS} className={`${clasesBoton("verde")} panel-regresar`}>Volver a Cambios y cancelaciones</Link>
                    {tipo === "enviada" ? <Link to={`${BASE_CAMBIOS}/${c.folio}`} className={clasesBoton("contorno")}>Ver solicitud</Link> : <Link to={`${BASE_CAMBIOS}?vista=historial`} className={clasesBoton("suave")}>Ver historial de cambios</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

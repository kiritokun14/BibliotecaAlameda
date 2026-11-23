// Participantes › Cotejo de credenciales: ficha, pedir corrección y resultados (rediseño del perfil de Préstamos,
// 22 nov 2026, T3). Plantillas de Administración: ficha en columnas libres con la decisión al lado; resultado como en
// Cuentas y permisos. Las reglas no cambian (cotejos.ts): solo se vincula si todo coincide.
import { useId, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { Aviso, Chip, Dato, Datos, Encabezado, Historial, Icono, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "../piezasPanel";
import { fechaCorta } from "../actividades/datos";
import {
    avisarRenovacion, comparar, DATOS_A_CORREGIR, iconoResultado, NOMBRE_ESTADO_COTEJO, obtenerCotejo, pedirCorreccion, rechazarVinculo, resultadoDe,
    sistemaDisponible, textoResultado, TONO_ESTADO_COTEJO, useCotejos, vincular, type Cotejo,
} from "./cotejos";
import { PantallaCotejo, SinSistema } from "./Cotejo";
import { BASE_COTEJO } from "./utiles";

function useCotejo() {
    const { folio } = useParams();
    useCotejos();
    return obtenerCotejo(folio);
}

// Qué encontró el cotejo y qué toca hacer (recuadro de estado de la tarjeta de decisión)
function hallazgo(c: Cotejo): { tono: TonoEstado; titulo: string; texto: string } {
    const r = resultadoDe(c);
    switch (r.tipo) {
        case "coincide": return { tono: "verde", titulo: "Todos los datos coinciden", texto: "Puedes vincular la cuenta con su credencial." };
        case "diferencias": return { tono: "guinda", titulo: r.diferencias === 1 ? "Hay 1 diferencia" : `Hay ${r.diferencias} diferencias`, texto: "Pide a la persona que corrija su captura en el portal." };
        case "vencida": return { tono: "dorado", titulo: "La credencial está vencida", texto: "Los datos coinciden, pero debe renovarla antes de vincularla." };
        case "sin-coincidencia": return { tono: "guinda", titulo: "No encontramos esa credencial", texto: `El número ${c.portal.credencial} no existe en el sistema de la biblioteca.` };
        default: return { tono: "dorado", titulo: "La credencial ya está vinculada", texto: `Pertenece a ${c.sistema?.vinculadaA}. Revisa antes de decidir.` };
    }
}

const CLASE_ESTADO: Record<TonoEstado, string> = { verde: "", dorado: " pz-estado-cuenta--dorado", guinda: " pz-estado-cuenta--guinda", gris: "" };

// Ficha (Figma 573:29674 coincide, 573:30135 diferencias, 573:30596 vencida, 638:51218 sin coincidencia,
// 638:51423 ya vinculada), confirmar vínculo (573:31057) y rechazar vínculo (573:32396)
export function DetalleCotejo() {
    const c = useCotejo();
    if (!sistemaDisponible()) return <SinSistema />;
    if (!c) return <Navigate to={BASE_COTEJO} replace />;
    return (
        <PantallaCotejo migas={[["Cotejo de credenciales", BASE_COTEJO], [c.folio]]}>
            <Ficha key={`${c.folio}:${c.estado}`} c={c} />
        </PantallaCotejo>
    );
}

function Ficha({ c }: { c: Cotejo }) {
    const id = useId();
    const navigate = useNavigate();
    const [accion, setAccion] = useState<"vincular" | "rechazar" | "aviso">();
    const [motivo, setMotivo] = useState("");
    const [confirmado, setConfirmado] = useState(false);
    const [error, setError] = useState("");
    const ruta = `${BASE_COTEJO}/${c.folio}`;
    const pendiente = c.estado === "pendiente";
    const tipo = resultadoDe(c).tipo;
    const r = textoResultado(c);
    const h = hallazgo(c);
    const filas = comparar(c);

    function confirmar() {
        setError("");
        if (accion === "rechazar" && !motivo.trim()) return setError("Escribe el motivo: la persona lo recibirá.");
        if (!confirmado) return setError("Marca la casilla para confirmar.");
        try {
            if (accion === "vincular") { vincular(c.folio); navigate(`${ruta}/vinculada`); }
            if (accion === "aviso") { avisarRenovacion(c.folio); navigate(`${ruta}/aviso`); }
            if (accion === "rechazar") { rechazarVinculo(c.folio, motivo); navigate(`${ruta}/rechazada`); }
        } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
        }
    }
    const elegir = (a: typeof accion) => { setAccion(accion === a ? undefined : a); setError(""); setConfirmado(false); };

    return (
        <>
            <Encabezado titulo={c.persona} texto={`Cotejo ${c.folio}: lo que capturó en el portal contra el registro de la biblioteca. ${pendiente ? h.texto : ""}`.trim()}>
                {pendiente ? <Chip tono={r.tono}>{r.texto}</Chip> : <Chip tono={TONO_ESTADO_COTEJO[c.estado]}>{NOMBRE_ESTADO_COTEJO[c.estado]}</Chip>}
            </Encabezado>

            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-pila">
                    <Tarjeta icono="cotejo" id={`${id}-comparacion`} titulo="Comparación de datos" texto="Lo capturado en el portal y lo que dice el sistema de la biblioteca">
                        {c.sistema ? (
                            <ul className="pz-filas">
                                {filas.map((f) => (
                                    <li key={f.dato}>
                                        <article className={`pz-fila${f.coincide ? "" : " pz-fila--guinda"}`}>
                                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={f.coincide ? "check" : "alerta"} /></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo">{f.dato}</h4>
                                                {f.portal !== "—" && <p className="pz-fila__detalle"><span>En el portal: {f.portal}</span></p>}
                                                <p className="pz-fila__detalle"><span>En el sistema: {f.sistema}</span></p>
                                            </div>
                                            <Chip tono={f.coincide ? "verde" : "guinda"}>{f.coincide ? "Coincide" : "No coincide"}</Chip>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <Vacio icono="alerta" titulo="Sin registro en el sistema" texto={`No hay ninguna credencial con el número ${c.portal.credencial}. Puede ser un error al capturarlo.`} />
                        )}
                    </Tarjeta>

                    <Tarjeta icono="usuario" id={`${id}-captura`} titulo="Lo que capturó la persona" texto={`Se registró el ${fechaCorta(c.registro)}`}>
                        <Datos>
                            <Dato icono="usuario" etiqueta="Nombre">{c.portal.nombre}</Dato>
                            <Dato icono="credencial" etiqueta="Número de credencial">{c.portal.credencial}</Dato>
                            <Dato icono="calendario" etiqueta="Fecha de nacimiento">{c.portal.nacimiento}</Dato>
                            <Dato icono="cotejo" etiqueta="En el sistema">{c.sistema ? c.sistema.vigencia : "Sin registro"}</Dato>
                        </Datos>
                    </Tarjeta>
                </div>

                <aside className="pz-lateral" aria-label="Decisión e historial del cotejo">
                    <Tarjeta icono="revision" id={`${id}-decision`} titulo={pendiente ? "Decide el cotejo" : "Cotejo resuelto"} texto={pendiente ? "La persona recibe el resultado en su perfil" : "Ya no admite cambios"} className="pz-tarjeta--acciones">
                        <div className={`pz-estado-cuenta${pendiente ? CLASE_ESTADO[h.tono] : CLASE_ESTADO[TONO_ESTADO_COTEJO[c.estado]]}`}>
                            <p className="pz-estado-cuenta__titulo">{pendiente ? h.titulo : NOMBRE_ESTADO_COTEJO[c.estado]}</p>
                            <p>{pendiente ? h.texto : `${c.resolucion?.detalle} Resolvió ${c.resolucion?.quien}, el ${fechaCorta(c.resolucion?.fecha ?? "")}.`}</p>
                        </div>

                        {pendiente && (
                            <div className="pz-acciones">
                                {tipo === "coincide" && <button type="button" aria-pressed={accion === "vincular"} className={`pz-boton${accion === "vincular" || !accion ? "" : " pz-boton--contorno"}`} onClick={() => elegir("vincular")}>Vincular cuenta</button>}
                                {(tipo === "diferencias" || tipo === "sin-coincidencia" || tipo === "ya-vinculada") && <Link to={`${ruta}/correccion`} className="pz-boton">Pedir corrección</Link>}
                                {tipo === "vencida" && <button type="button" aria-pressed={accion === "aviso"} className={`pz-boton${accion === "aviso" || !accion ? "" : " pz-boton--contorno"}`} onClick={() => elegir("aviso")}>Avisar que renueve</button>}
                                <button type="button" aria-pressed={accion === "rechazar"} className="pz-boton pz-boton--guinda pz-boton--contorno" onClick={() => elegir("rechazar")}>Rechazar vínculo</button>
                            </div>
                        )}

                        {pendiente && accion && (
                            <fieldset key={accion} className="pz-decision">
                                {accion === "vincular" && (
                                    <Datos>
                                        <Dato etiqueta="Credencial">{c.portal.credencial}</Dato>
                                        <Dato etiqueta="Vigencia">{c.sistema?.vigencia ?? "—"}</Dato>
                                    </Datos>
                                )}
                                {accion === "vincular" && <p className="pz-acciones__nota">La persona podrá usar su credencial en el portal: inscripciones, progreso y recompensas.</p>}
                                {accion === "aviso" && <p className="pz-acciones__nota">Se le avisa que renueve su credencial en Préstamos. Cuando lo haga, podrás vincularla.</p>}
                                {accion === "rechazar" && (
                                    <label className="pz-campo pz-campo--lleno">
                                        <span>Motivo <span className="contenidos-campo__obligatorio">*</span></span>
                                        <textarea rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: la credencial pertenece a otra persona." />
                                    </label>
                                )}
                                <label className={`pz-casilla${confirmado ? " pz-casilla--elegida" : ""}`}>
                                    <input type="checkbox" checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
                                    <span><strong>Revisé la comparación</strong><small>Confirmo esta decisión.</small></span>
                                </label>
                                <button type="button" className={`pz-boton${accion === "rechazar" ? " pz-boton--guinda" : ""}`} onClick={confirmar}>
                                    {accion === "vincular" ? "Sí, vincular la cuenta" : accion === "aviso" ? "Sí, enviar el aviso" : "Sí, rechazar el vínculo"}
                                </button>
                            </fieldset>
                        )}
                        {error && <Aviso tono="error" titulo="No se guardó." texto={error} />}

                        <div className="pz-acciones pz-acciones--pie">
                            <Link to={BASE_COTEJO} className="pz-boton pz-boton--contorno">Volver a Cotejo de credenciales</Link>
                        </div>
                    </Tarjeta>


                    <Historial id={`${id}-historial`} movimientos={[
                        ...(c.resolucion ? [{
                            titulo: NOMBRE_ESTADO_COTEJO[c.estado], tono: TONO_ESTADO_COTEJO[c.estado], icono: iconoResultado(c),
                            detalle: `${fechaCorta(c.resolucion.fecha)}, ${c.resolucion.quien}`, nota: c.resolucion.detalle,
                        }] : []),
                        { titulo: "Capturó su credencial en el portal", detalle: fechaCorta(c.registro), tono: "gris" as const, icono: "credencial" as const },
                    ]} />
                </aside>
            </div>
        </>
    );
}

// Pedir corrección (Figma 573:31571): qué datos y el mensaje, con las diferencias a la vista
export function PedirCorreccion() {
    const c = useCotejo();
    if (!c || c.estado !== "pendiente") return <Navigate to={c ? `${BASE_COTEJO}/${c.folio}` : BASE_COTEJO} replace />;
    return (
        <PantallaCotejo migas={[["Cotejo de credenciales", BASE_COTEJO], [c.folio, `${BASE_COTEJO}/${c.folio}`], ["Pedir corrección"]]}>
            <FormularioCorreccion c={c} />
        </PantallaCotejo>
    );
}

function FormularioCorreccion({ c }: { c: Cotejo }) {
    const id = useId();
    const navigate = useNavigate();
    const ruta = `${BASE_COTEJO}/${c.folio}`;
    const distintas = comparar(c).slice(0, 3).filter((f) => !f.coincide);
    // Se propone lo que no coincide; si no hay comparación (no existe la credencial), el número
    const sugerido = !c.sistema ? DATOS_A_CORREGIR[1] : distintas.length === 1 ? distintas[0].dato : distintas.length === 2 && distintas.every((f) => f.dato !== "Número de credencial") ? DATOS_A_CORREGIR[3] : distintas.length ? DATOS_A_CORREGIR[4] : DATOS_A_CORREGIR[0];
    const [datos, setDatos] = useState(sugerido);
    const [mensaje, setMensaje] = useState(!c.sistema ? "Revisa el número de tu credencial: no lo encontramos en el sistema de la biblioteca." : "Revisa que tus datos coincidan con los de tu credencial de la biblioteca.");
    const [error, setError] = useState("");

    function enviar() {
        if (!mensaje.trim()) return setError("Escribe el mensaje para la persona.");
        try { pedirCorreccion(c.folio, datos, mensaje); navigate(`${ruta}/correccion-solicitada`); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo enviar."); }
    }

    return (
        <>
            <Encabezado titulo="Pedir corrección" texto={`${c.persona} recibirá el mensaje en su perfil y podrá corregir su captura. El cotejo vuelve a la bandeja cuando lo haga.`} />
            <div className="pz-columnas pz-columnas--libre">
                <div className="pz-pila">
                    <Tarjeta icono="contenido" id={`${id}-mensaje`} titulo="Mensaje para la persona" texto="Qué debe corregir y cómo">
                        <div className="pz-campo pz-campo--lleno">
                            <span>Datos a corregir <span className="contenidos-campo__obligatorio">*</span></span>
                            <div className="pz-pastillas" role="group" aria-label="Datos a corregir">
                                {DATOS_A_CORREGIR.map((d) => (
                                    <button key={d} type="button" aria-pressed={datos === d} className={`pz-pastilla${datos === d ? " pz-pastilla--elegida" : ""}`} onClick={() => setDatos(d)}>{d}</button>
                                ))}
                            </div>
                        </div>
                        <label className={`pz-campo pz-campo--lleno${error ? " pz-campo--error" : ""}`}>
                            <span>Mensaje <span className="contenidos-campo__obligatorio">*</span></span>
                            <textarea rows={4} maxLength={500} value={mensaje} aria-invalid={!!error} onChange={(e) => { setMensaje(e.target.value); setError(""); }} />
                            <small className="pz-campo__ayuda">{mensaje.length} de 500 caracteres</small>
                        </label>
                        {error && <p className="pz-campo__error" role="alert">{error}</p>}
                    </Tarjeta>
                </div>

                <aside className="pz-lateral" aria-label="Diferencias y envío">
                    <Tarjeta icono="alerta" id={`${id}-diferencias`} titulo="Lo que no coincide" texto="Según el sistema de la biblioteca" className="pz-tarjeta--acciones">
                        {c.sistema ? (
                            <ul className="pz-actividades">
                                {comparar(c).filter((f) => !f.coincide).map((f) => (
                                    <li key={f.dato}>
                                        <div className="pz-actividades__textos">
                                            <p className="pz-actividades__titulo">{f.dato}</p>
                                            <p className="pz-actividades__detalle">{f.portal !== "—" ? `Portal: ${f.portal} · ` : ""}Sistema: {f.sistema}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="pz-acciones__nota">El número {c.portal.credencial} no existe en el sistema.</p>}
                        <div className="pz-acciones pz-acciones--pie">
                            <button type="button" className="pz-boton" onClick={enviar}>Enviar el mensaje</button>
                            <Link to={ruta} className="pz-boton pz-boton--contorno">Cancelar</Link>
                        </div>
                    </Tarjeta>
                </aside>
            </div>
        </>
    );
}

// Resultados: vinculada (573:31164), corrección solicitada (573:31991), aviso de renovación (573:32505) y rechazada (631:50735)
export function ResultadoCotejo({ tipo }: { tipo: "vinculada" | "correccion" | "aviso" | "rechazada" }) {
    const c = useCotejo();
    if (!c || c.estado !== tipo) return <Navigate to={c ? `${BASE_COTEJO}/${c.folio}` : BASE_COTEJO} replace />;
    const datos: Record<typeof tipo, { titulo: string; texto: string; icono: NombreIcono }> = {
        vinculada: { titulo: "Cuenta vinculada", texto: `${c.persona} ya puede usar su credencial ${c.portal.credencial} en el portal.`, icono: "check" },
        correccion: { titulo: "Corrección solicitada", texto: `${c.persona} recibió el mensaje. El cotejo vuelve a la bandeja cuando corrija.`, icono: "reloj" },
        aviso: { titulo: "Aviso de renovación enviado", texto: `Cuando ${c.persona} renueve su credencial, podrás vincular la cuenta.`, icono: "reloj" },
        rechazada: { titulo: "Vínculo rechazado", texto: `La cuenta de ${c.persona} sigue sin credencial y recibió el motivo.`, icono: "alerta" },
    };
    const d = datos[tipo];
    return (
        <PantallaCotejo migas={[["Cotejo de credenciales", BASE_COTEJO], [d.titulo]]}>
            <section className="pz-tarjeta pz-resultado" aria-label={d.titulo}>
                <Vacio icono={d.icono} titulo={d.titulo} texto={d.texto}
                    accion={<div className="pz-resultado__acciones">
                        <Link to={BASE_COTEJO} className="pz-boton">Seguir cotejando</Link>
                        <Link to={`${BASE_COTEJO}/${c.folio}`} className="pz-boton pz-boton--contorno">Ver el cotejo</Link>
                    </div>} />
            </section>
        </PantallaCotejo>
    );
}

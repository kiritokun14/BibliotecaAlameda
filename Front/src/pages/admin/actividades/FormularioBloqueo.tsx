import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta, useActividades } from "./datos";
import { guardarBloqueo, hoyISO, horarioBloqueo, obtenerBloqueo, obtenerSala, useSalas, validarBloqueo, type Bloqueo, type DatosBloqueo } from "./salas";
import { conflictoBloqueo } from "./calendario";
import { BASE_CALENDARIO } from "./utiles";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

type Errores = Partial<Record<keyof DatosBloqueo, string>>;

// Actividades · Calendario: bloquear (Figma 566:24022), conflicto (566:24473), error (618:50580)
export function NuevoBloqueo() {
    const [params] = useSearchParams();
    const sala = obtenerSala(params.get("sala") ?? undefined)?.nombre ?? "";
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.get("fecha") ?? "") ? params.get("fecha")! : hoyISO();
    return <FormularioBloqueo inicial={{ sala, fecha, desde: "", hasta: "", motivo: "" }} />;
}

// Editar bloqueo (Figma 619:50541)
export function EditarBloqueo() {
    const { id } = useParams();
    useSalas();
    const bloqueo = obtenerBloqueo(id);
    if (!bloqueo) return <Navigate to={BASE_CALENDARIO} replace />;
    const { sala, fecha, desde, hasta, motivo } = bloqueo;
    return <FormularioBloqueo key={bloqueo.id} inicial={{ sala, fecha, desde, hasta, motivo }} id={bloqueo.id} />;
}

function FormularioBloqueo({ inicial, id }: { inicial: DatosBloqueo; id?: string }) {
    const navigate = useNavigate();
    const actividades = useActividades();
    const { salas } = useSalas();
    const [datos, setDatos] = useState<DatosBloqueo>(inicial);
    const [todoElDia, setTodoElDia] = useState(id ? !inicial.desde : false);
    const [errores, setErrores] = useState<Errores>({});
    const [error, setError] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const conDatos: DatosBloqueo = todoElDia ? { ...datos, desde: "", hasta: "" } : datos;
    const [conflicto, setConflicto] = useState<ReturnType<typeof conflictoBloqueo>>(undefined);

    function cambiar<K extends keyof DatosBloqueo>(c: K, v: DatosBloqueo[K]) {
        setDatos((d) => ({ ...d, [c]: v }));
        setErrores((e) => ({ ...e, [c]: undefined }));
        setConflicto(undefined);
    }

    async function guardar() {
        const e = validarBloqueo(conDatos);
        if (!todoElDia && !conDatos.desde && !conDatos.hasta) {
            e.desde = "Elige la hora de inicio o marca «Todo el día».";
            e.hasta = "Elige la hora de fin.";
        }
        setErrores(e);
        if (Object.keys(e).length) return;
        const choque = conflictoBloqueo(conDatos, actividades);
        setConflicto(choque);
        if (choque) return window.scrollTo({ top: 0, behavior: "smooth" });
        setOcupado(true);
        try {
            const nuevo = await guardarBloqueo(conDatos, id);
            navigate(`${BASE_CALENDARIO}/bloqueos/${nuevo}/guardado`);
        } catch {
            setError(true);
        } finally {
            setOcupado(false);
        }
    }

    const props = (c: keyof DatosBloqueo) => ({
        id: `bl-${c}`,
        "aria-invalid": !!errores[c] || (c === "hasta" && !!conflicto),
        "aria-describedby": errores[c] ? `bl-${c}-error` : undefined,
        className: `cn-control ${errores[c] || (c === "hasta" && conflicto) ? "cn-control--error" : ""}`,
    });

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas", BASE_CALENDARIO], [conflicto ? "Conflicto detectado" : id ? "Editar bloqueo" : "Bloquear"]]} />
                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Calendario y salas", ruta: BASE_CALENDARIO }}
                    etiqueta="Calendario y salas"
                    titulo={id ? "Editar bloqueo" : "Bloquear sala u horario"}
                    texto="Un bloqueo impide programar actividades en ese espacio."
                />

                {conflicto && (
                    <Resultado
                        tono="guinda"
                        icono={iconoAlerta}
                        titulo="Hay una actividad en ese horario"
                        linea={`«${conflicto.nombre}» · ${fechaCorta(conflicto.fecha)}, ${conflicto.inicio}. Cámbiala o elige otro horario.`}
                        chip={<Chip tono="guinda">Conflicto</Chip>}
                    />
                )}
                {error && (
                    <div className="cn-aviso cn-aviso--chico" role="alert">
                        <span className="cn-aviso__x" aria-hidden="true">✕</span>
                        <div className="cn-aviso__textos">
                            <strong>No se pudo guardar el bloqueo</strong>
                            <p>Tus datos siguen en el formulario. Revisa la conexión e inténtalo de nuevo.</p>
                        </div>
                    </div>
                )}

                <Tarjeta icono={iconoLapiz} titulo="Datos del bloqueo">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="bl-sala" etiqueta="Sala" obligatorio error={errores.sala}>
                                <select {...props("sala")} value={datos.sala} onChange={(e) => cambiar("sala", e.target.value)}>
                                    <option value="">Elige una sala</option>
                                    {salas.map((s) => <option key={s.id}>{s.nombre}</option>)}
                                </select>
                            </CampoTexto>
                            <CampoTexto id="bl-fecha" etiqueta="Fecha" obligatorio error={errores.fecha}>
                                <input type="date" {...props("fecha")} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
                            </CampoTexto>
                        </div>
                        <label className="cn-interruptor-campo">
                            <span className="cn-casilla">
                                <input type="checkbox" checked={todoElDia} onChange={(e) => { setTodoElDia(e.target.checked); setConflicto(undefined); setErrores((x) => ({ ...x, desde: undefined, hasta: undefined })); }} />
                                <span aria-hidden="true" />
                            </span>
                            <strong>Todo el día</strong>
                        </label>
                        {!todoElDia && (
                            <div className="cn-campos__fila">
                                <CampoTexto id="bl-desde" etiqueta="Desde" obligatorio error={errores.desde}>
                                    <input type="time" {...props("desde")} value={datos.desde} onChange={(e) => cambiar("desde", e.target.value)} />
                                </CampoTexto>
                                <CampoTexto id="bl-hasta" etiqueta="Hasta" obligatorio error={errores.hasta}>
                                    <input type="time" {...props("hasta")} value={datos.hasta} onChange={(e) => cambiar("hasta", e.target.value)} />
                                </CampoTexto>
                            </div>
                        )}
                        <CampoTexto id="bl-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                            <textarea {...props("motivo")} className={`${props("motivo").className} cn-control--area`} placeholder="Ej.: mantenimiento de sonido." value={datos.motivo} onChange={(e) => cambiar("motivo", e.target.value)} />
                        </CampoTexto>
                    </div>
                </Tarjeta>

                <div className="cn-acciones">
                    {conflicto ? (
                        <button type="button" className={clasesBoton("verde")} onClick={() => { setConflicto(undefined); document.getElementById(todoElDia ? "bl-fecha" : "bl-desde")?.focus(); }}>Elegir otro horario</button>
                    ) : (
                        <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => void guardar()}>{ocupado ? "Guardando…" : id ? "Guardar cambios" : "Guardar bloqueo"}</button>
                    )}
                    <Link to={BASE_CALENDARIO} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Bloqueo guardado (Figma 566:24935)
export function BloqueoGuardado() {
    const { id } = useParams();
    useSalas();
    const b: Bloqueo | undefined = obtenerBloqueo(id);
    if (!b) return <Navigate to={BASE_CALENDARIO} replace />;
    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas", BASE_CALENDARIO], ["Bloqueo guardado"]]} />
                <div className="cn-encabezado"><div className="cn-encabezado__textos">
                    <p className="cn-etiqueta"><span className="cn-etiqueta__punto" aria-hidden="true" />Calendario y salas</p>
                    <h1 className="cn-titulo">Bloqueo guardado</h1>
                    <p className="cn-entrada">El horario ya no se puede reservar.</p>
                </div></div>
                <Resultado tono="verde" icono={iconoCheck} titulo={`${b.sala} bloqueada`} linea={`${fechaCorta(b.fecha)} · ${horarioBloqueo(b)} · ${b.motivo}`} chip={<Chip tono="verde">Bloqueada</Chip>} />
                <div className="cn-acciones">
                    <Link to={`${BASE_CALENDARIO}?vista=mes&fecha=${b.fecha}`} className={clasesBoton("verde")}>Ver calendario</Link>
                    <Link to={`${BASE_CALENDARIO}/bloquear`} className={clasesBoton("contorno")}>Hacer otro bloqueo</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

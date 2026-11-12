import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { Chip, Nota } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import { mensajeError } from "../../../servicios/api";
import { enviarSolicitud, hoyLocal, listarAreas, type AreaEspacio } from "../../../servicios/espacios";
import { separarAreas } from "./datos";
import { validarSolicitud, type DatosSolicitud, type ErroresSolicitud } from "./datosSesion";
import "../../../components/portal/Visitante.css";
import "./EspaciosSesion.css";
import iconoPin from "../../../assets/espacios/pin-verde.svg";
import checkPaso from "../../../assets/credencial/paso-check.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import enviar from "../../../assets/perfil/tarjeta-enviar.svg";

// Agenda de espacios con sesión (Figma A-02, 476:28196).
// HU-16 (CA-16.1): cualquier cuenta con sesión puede solicitar; no se pide credencial.
// Las áreas que se pueden solicitar vienen de GET /espacios/areas; enviar no reserva el espacio (CA-16.2).
// Flujo en tres pasos (12 nov): 1) el mapa de áreas a todo lo ancho, 2) fecha y horario, 3) datos y envío.
// En los pasos 2 y 3 el resumen del área queda fijo a la izquierda y el formulario avanza a la derecha.
const pasos = ["Elige un área", "Fecha y horario", "Envía tu solicitud"];
const vacio: DatosSolicitud = { tipo: "uso_espacio", fecha: "", horaInicio: "", horaFin: "", personas: "", motivo: "", institucion: "" };
const CAMPOS_HORARIO = ["fecha", "horaInicio", "horaFin"] as const;
const CAMPOS_ENVIO = ["personas", "motivo", "institucion"] as const;

type CargaAreas = { areas: AreaEspacio[] } | { error: string } | null;
type Paso = 1 | 2 | 3;

export default function AgendaEspacios() {
    const navegar = useNavigate();
    const hoy = hoyLocal();
    const { noSolicitables } = separarAreas(); // solo informativas (no se solicitan)
    const [carga, setCarga] = useState<CargaAreas>(null);
    const [intento, setIntento] = useState(0);
    const [areaId, setAreaId] = useState("");
    const [paso, setPaso] = useState<Paso>(1);
    const [datos, setDatos] = useState(vacio);
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const [errorEnvio, setErrorEnvio] = useState("");
    const [enviando, setEnviando] = useState(false);
    const bloqueo = useRef(false);
    const arriba = useRef<HTMLOListElement>(null);

    useEffect(() => {
        let vigente = true;
        listarAreas()
            .then((areas) => { if (vigente) setCarga({ areas }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);

    const areas = carga && "areas" in carga ? carga.areas : [];
    const area = areas.find((a) => a.slug === areaId);

    function cambiar(campo: keyof DatosSolicitud, valor: string) { setDatos((d) => ({ ...d, [campo]: valor })); }

    function irA(nuevo: Paso) {
        setPaso(nuevo);
        setErrores({});
        arriba.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Valida solo los campos del paso; lleva el foco al primero con error
    function revisar(campos: readonly (keyof ErroresSolicitud)[]) {
        const todos = validarSolicitud(datos, hoy, area?.capacidad);
        const encontrados: ErroresSolicitud = {};
        for (const c of campos) if (todos[c]) encontrados[c] = todos[c];
        setErrores(encontrados);
        const primero = campos.find((c) => encontrados[c]);
        if (primero) document.getElementById(`esp-${primero}`)?.focus();
        return !primero;
    }

    async function enviarFormulario(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current || !area) return;
        if (!revisar(CAMPOS_ENVIO)) return;
        setErrorEnvio("");
        bloqueo.current = true;
        setEnviando(true);
        try {
            const s = await enviarSolicitud({
                tipo: datos.tipo, areaId: area.slug, fecha: datos.fecha, horaInicio: datos.horaInicio, horaFin: datos.horaFin,
                personas: Number(datos.personas), motivo: datos.motivo.trim(), institucion: datos.institucion.trim() || undefined,
            });
            navegar(`/espacios/enviada?folio=${encodeURIComponent(s.folio)}`);
        } catch (error) {
            setErrorEnvio(mensajeError(error));
            bloqueo.current = false;
            setEnviando(false);
        }
    }

    const fechaLegible = datos.fecha
        ? new Date(`${datos.fecha}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
        : "";

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Espacios" titulo={<>Solicita un <span>espacio</span></>}
                texto="Elige el área, indica fecha y horario y envía tu solicitud." />
            <div className="espacios-cuerpo">
                <ol className="cred-pasos espacios-pasos espacios-pasos--centro" ref={arriba}>
                    {pasos.map((p, i) => {
                        const numero = (i + 1) as Paso;
                        const estado = numero < paso ? "hecho" : numero === paso ? "actual" : "pendiente";
                        return (
                            <li key={p} className={`cred-paso cred-paso--${estado}`} aria-current={estado === "actual" ? "step" : undefined}>
                                {estado === "hecho" ? (
                                    <button type="button" className="espacios-paso-boton" onClick={() => irA(numero)}>
                                        <span className="cred-paso__numero"><img src={checkPaso} alt="Completado:" /></span>{p}
                                    </button>
                                ) : <><span className="cred-paso__numero">{numero}</span>{p}</>}
                            </li>
                        );
                    })}
                </ol>

                {paso === 1 && (
                    <section className="cred-tarjeta espacios-plano espacios-plano--completo" aria-labelledby="titulo-plano">
                        <div className="espacios-plano__cabecera">
                            <span><img src={iconoPin} alt="" /></span>
                            <div>
                                <h2 id="titulo-plano">Mapa de áreas de la biblioteca</h2>
                                <p>Elige el área que quieres solicitar. Nombres y capacidades por confirmar con la biblioteca.</p>
                            </div>
                        </div>
                        <p className="cred-sobretitulo">SE PUEDEN SOLICITAR</p>
                        {!carga && <p className="cred-texto" role="status">Cargando áreas…</p>}
                        {carga && "error" in carga && (
                            <div>
                                <p className="cred-texto" role="alert">{carga.error}</p>
                                <button type="button" className="boton-visitante cred-boton-contorno" onClick={() => { setCarga(null); setIntento((x) => x + 1); }}>Reintentar</button>
                            </div>
                        )}
                        {carga && "areas" in carga && carga.areas.length === 0 && <p className="cred-texto">Por ahora no hay áreas que se puedan solicitar.</p>}
                        <div id="esp-area" tabIndex={-1} className="espacios-areas" role="radiogroup" aria-label="Áreas que se pueden solicitar">
                            {areas.map((a) => <AreaBoton key={a.slug} area={a} elegida={a.slug === areaId} alElegir={() => setAreaId(a.slug)} />)}
                        </div>
                        <p className="cred-sobretitulo">NO SE SOLICITAN</p>
                        <div className="espacios-areas">
                            {noSolicitables.map((a) => (
                                <div key={a.id} className="espacios-area espacios-area--apagada">
                                    <strong>{a.nombre}</strong>{a.nota && <span>{a.nota}</span>}<Chip color="gris">No reservable</Chip>
                                </div>
                            ))}
                        </div>
                        <Nota color="dorada" icono={infoDorado}>Que un área se pueda solicitar no significa que esté libre: el personal revisa la agenda y te confirma.</Nota>
                        <div className="espacios-barra">
                            <p aria-live="polite">
                                {area ? <>Elegiste <strong>{area.nombre}</strong>{area.capacidad ? ` · hasta ${area.capacidad} personas` : ""}</> : "Elige un área para continuar."}
                            </p>
                            <button type="button" className="espacios-enviar espacios-boton-paso" disabled={!area} onClick={() => irA(2)}>
                                Continuar con fecha y horario →
                            </button>
                        </div>
                    </section>
                )}

                {paso > 1 && area && (
                    <div className="espacios-columnas espacios-columnas--pasos">
                        <aside className="cred-tarjeta espacios-resumen" aria-label="Resumen de tu solicitud">
                            <p className="cred-sobretitulo">ÁREA SELECCIONADA</p>
                            <h2>{area.nombre}</h2>
                            <p className="espacios-formulario__nota">
                                {area.capacidad ? `Hasta ${area.capacidad} personas. ` : ""}{area.descripcion ?? "Capacidad y equipamiento: por confirmar con la biblioteca."}
                            </p>
                            {paso === 3 && (
                                <dl className="espacios-resumen__datos">
                                    <div><dt>Fecha</dt><dd>{fechaLegible}</dd></div>
                                    <div><dt>Horario</dt><dd>{datos.horaInicio} a {datos.horaFin} h</dd></div>
                                    <div><dt>Tipo</dt><dd>{datos.tipo === "visita" ? "Visita guiada" : "Uso del área"}</dd></div>
                                </dl>
                            )}
                            <button type="button" className="espacios-cambiar" onClick={() => irA(1)}>Cambiar área</button>
                            {paso === 3 && <button type="button" className="espacios-cambiar" onClick={() => irA(2)}>Cambiar fecha u horario</button>}
                        </aside>

                        {paso === 2 ? (
                            <form className="cred-tarjeta espacios-formulario" noValidate
                                onSubmit={(e) => { e.preventDefault(); if (revisar(CAMPOS_HORARIO)) irA(3); }}>
                                <p className="cred-sobretitulo">PASO 2</p>
                                <h2>¿Cuándo lo necesitas?</h2>
                                <div className="cred-campo">
                                    <label htmlFor="esp-tipo">¿Qué necesitas?</label>
                                    <select id="esp-tipo" value={datos.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
                                        <option value="uso_espacio">Usar el área para una actividad</option>
                                        <option value="visita">Una visita guiada (escuela o grupo)</option>
                                    </select>
                                </div>
                                <Campo id="fecha" etiqueta="Fecha" error={errores.fecha}>
                                    <input id="esp-fecha" type="date" min={hoy} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)}
                                        required aria-invalid={errores.fecha ? true : undefined} />
                                </Campo>
                                <div className="cred-fila">
                                    <Campo id="horaInicio" etiqueta="Hora de inicio" error={errores.horaInicio}>
                                        <input id="esp-horaInicio" type="time" value={datos.horaInicio} onChange={(e) => cambiar("horaInicio", e.target.value)}
                                            aria-invalid={errores.horaInicio ? true : undefined} />
                                    </Campo>
                                    <Campo id="horaFin" etiqueta="Hora de término" error={errores.horaFin}>
                                        <input id="esp-horaFin" type="time" value={datos.horaFin} onChange={(e) => cambiar("horaFin", e.target.value)}
                                            aria-invalid={errores.horaFin ? true : undefined} />
                                    </Campo>
                                </div>
                                <div className="espacios-botones">
                                    <button type="button" className="espacios-atras" onClick={() => irA(1)}>← Atrás</button>
                                    <button type="submit" className="espacios-enviar espacios-boton-paso">Continuar →</button>
                                </div>
                            </form>
                        ) : (
                            <form className="cred-tarjeta espacios-formulario" onSubmit={enviarFormulario} noValidate>
                                <p className="cred-sobretitulo">PASO 3</p>
                                <h2>Envía tu solicitud</h2>
                                <fieldset disabled={enviando}>
                                    <Campo id="personas" etiqueta="Número de personas" error={errores.personas}>
                                        <input id="esp-personas" inputMode="numeric" placeholder="Ej. 15" maxLength={3} value={datos.personas}
                                            onChange={(e) => cambiar("personas", e.target.value.replace(/\D/g, ""))} aria-invalid={errores.personas ? true : undefined} />
                                    </Campo>
                                    <Campo id="motivo" etiqueta="Motivo de la solicitud" error={errores.motivo}>
                                        <textarea id="esp-motivo" placeholder="Describe brevemente la actividad" maxLength={300} rows={3} value={datos.motivo}
                                            onChange={(e) => cambiar("motivo", e.target.value)} aria-invalid={errores.motivo ? true : undefined} />
                                    </Campo>
                                    {datos.tipo === "visita" && (
                                        <Campo id="institucion" etiqueta="Escuela o institución (opcional)" error={errores.institucion} sinObligatorio>
                                            <input id="esp-institucion" placeholder="Ej. Primaria Amado Nervo" maxLength={150} value={datos.institucion}
                                                onChange={(e) => cambiar("institucion", e.target.value)} aria-invalid={errores.institucion ? true : undefined} />
                                        </Campo>
                                    )}
                                </fieldset>
                                {errorEnvio && <p className="cred-error-campo espacios-error" role="alert">{errorEnvio}</p>}
                                <Nota color="dorada" icono={infoDorado}>Enviar la solicitud no reserva el espacio. El personal la revisa y te responde en tu cuenta.</Nota>
                                <div className="espacios-botones">
                                    <button type="button" className="espacios-atras" onClick={() => irA(2)} disabled={enviando}>← Atrás</button>
                                    <button type="submit" className="espacios-enviar espacios-boton-paso" disabled={enviando}>
                                        {enviando ? "Enviando…" : "Enviar solicitud"} <img src={enviar} alt="" />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </PaginaPublica>
    );
}

function AreaBoton({ area, elegida, alElegir }: { area: AreaEspacio; elegida: boolean; alElegir: () => void }) {
    return (
        <button type="button" role="radio" aria-checked={elegida} onClick={alElegir} className={`espacios-area${elegida ? " espacios-area--elegida" : ""}`}>
            <strong>{area.nombre}</strong>
            {area.capacidad ? <span>Hasta {area.capacidad} personas</span> : null}
            {elegida ? <span className="espacios-area__chip">Seleccionada</span> : <Chip color="verde">Se puede solicitar</Chip>}
        </button>
    );
}

function Campo({ id, etiqueta, error, sinObligatorio, children }: { id: string; etiqueta: string; error?: string; sinObligatorio?: boolean; children: ReactNode }) {
    return (
        <div className="cred-campo">
            <label htmlFor={`esp-${id}`}>{etiqueta}{!sinObligatorio && <span className="espacios-obligatorio">(obligatorio)</span>}</label>
            {children}
            {error && <p className="cred-error-campo espacios-error">{error}</p>}
        </div>
    );
}

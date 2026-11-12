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
const pasos = ["Elige un área", "Fecha y horario", "Envía tu solicitud"];
const vacio: DatosSolicitud = { tipo: "uso_espacio", fecha: "", horaInicio: "", horaFin: "", personas: "", motivo: "", institucion: "" };

type CargaAreas = { areas: AreaEspacio[] } | { error: string } | null;

export default function AgendaEspacios() {
    const navegar = useNavigate();
    const hoy = hoyLocal();
    const { noSolicitables } = separarAreas(); // solo informativas (no se solicitan)
    const [carga, setCarga] = useState<CargaAreas>(null);
    const [intento, setIntento] = useState(0);
    const [areaId, setAreaId] = useState("");
    const [datos, setDatos] = useState(vacio);
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const [errorEnvio, setErrorEnvio] = useState("");
    const [enviando, setEnviando] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        let vigente = true;
        listarAreas()
            .then((areas) => {
                if (!vigente) return;
                setCarga({ areas });
                setAreaId((actual) => actual || areas[0]?.slug || "");
            })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);

    const areas = carga && "areas" in carga ? carga.areas : [];
    const area = areas.find((a) => a.slug === areaId);
    const paso = !area ? 1 : datos.fecha && datos.horaInicio && datos.horaFin ? 3 : 2;

    function cambiar(campo: keyof DatosSolicitud, valor: string) { setDatos((d) => ({ ...d, [campo]: valor })); }

    async function enviarFormulario(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const encontrados = validarSolicitud(datos, hoy, area?.capacidad);
        if (!area && datos.tipo === "uso_espacio") encontrados.area = "Elige el área que quieres solicitar.";
        setErrores(encontrados);
        setErrorEnvio("");
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`esp-${primero}`)?.focus(); return; }
        bloqueo.current = true;
        setEnviando(true);
        try {
            const s = await enviarSolicitud({
                tipo: datos.tipo, areaId: area?.slug ?? null, fecha: datos.fecha, horaInicio: datos.horaInicio, horaFin: datos.horaFin,
                personas: Number(datos.personas), motivo: datos.motivo.trim(), institucion: datos.institucion.trim() || undefined,
            });
            navegar(`/espacios/enviada?folio=${encodeURIComponent(s.folio)}`);
        } catch (error) {
            setErrorEnvio(mensajeError(error));
            bloqueo.current = false;
            setEnviando(false);
        }
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="Espacios" titulo="Elige el área que quieres solicitar"
                texto="Selecciona un área, indica fecha y horario y envía tu solicitud. La biblioteca la revisa y confirma." />
            <div className="espacios-cuerpo">
                <ol className="cred-pasos espacios-pasos espacios-pasos--centro">
                    {pasos.map((p, i) => {
                        const numero = i + 1;
                        const estado = numero < paso ? "hecho" : numero === paso ? "actual" : "pendiente";
                        return (
                            <li key={p} className={`cred-paso cred-paso--${estado}`} aria-current={estado === "actual" ? "step" : undefined}>
                                <span className="cred-paso__numero">{estado === "hecho" ? <img src={checkPaso} alt="Completado:" /> : numero}</span>
                                {p}
                            </li>
                        );
                    })}
                </ol>

                <div className="espacios-columnas">
                    <section className="cred-tarjeta espacios-plano" aria-labelledby="titulo-plano">
                        <div className="espacios-plano__cabecera">
                            <span><img src={iconoPin} alt="" /></span>
                            <div><h2 id="titulo-plano">Áreas de la biblioteca</h2><p>Nombres y capacidades por confirmar con la biblioteca</p></div>
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
                        {errores.area && <p className="cred-error-campo espacios-error">{errores.area}</p>}
                        <p className="cred-sobretitulo">NO SE SOLICITAN</p>
                        <div className="espacios-areas">
                            {noSolicitables.map((a) => (
                                <div key={a.id} className="espacios-area espacios-area--apagada">
                                    <strong>{a.nombre}</strong>{a.nota && <span>{a.nota}</span>}<Chip color="gris">No reservable</Chip>
                                </div>
                            ))}
                        </div>
                        <Nota color="dorada" icono={infoDorado}>Que un área se pueda solicitar no significa que esté libre: el personal revisa la agenda y te confirma.</Nota>
                    </section>

                    <form className="cred-tarjeta espacios-formulario" onSubmit={enviarFormulario} noValidate>
                        <p className="cred-sobretitulo">ÁREA SELECCIONADA</p>
                        <h2>{area?.nombre ?? "Elige un área"}</h2>
                        <p className="espacios-formulario__nota">
                            {area?.capacidad ? `Hasta ${area.capacidad} personas. ` : ""}{area?.descripcion ?? "Capacidad y equipamiento: por confirmar con la biblioteca."}
                        </p>
                        <fieldset disabled={enviando}>
                            <div className="cred-campo">
                                <label htmlFor="esp-tipo">¿Qué necesitas?</label>
                                <select id="esp-tipo" value={datos.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
                                    <option value="uso_espacio">Usar el área para una actividad</option>
                                    <option value="visita">Una visita guiada (escuela o grupo)</option>
                                </select>
                            </div>
                            <Campo id="fecha" etiqueta="Fecha" error={errores.fecha}>
                                <input id="esp-fecha" type="date" min={hoy} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} required aria-invalid={errores.fecha ? true : undefined} />
                            </Campo>
                            <div className="cred-fila">
                                <Campo id="horaInicio" etiqueta="Hora de inicio" error={errores.horaInicio} sinObligatorio>
                                    <input id="esp-horaInicio" type="time" value={datos.horaInicio} onChange={(e) => cambiar("horaInicio", e.target.value)} aria-invalid={errores.horaInicio ? true : undefined} />
                                </Campo>
                                <Campo id="horaFin" etiqueta="Hora de término" error={errores.horaFin} sinObligatorio>
                                    <input id="esp-horaFin" type="time" value={datos.horaFin} onChange={(e) => cambiar("horaFin", e.target.value)} aria-invalid={errores.horaFin ? true : undefined} />
                                </Campo>
                            </div>
                            <Campo id="personas" etiqueta="Número de personas" error={errores.personas}>
                                <input id="esp-personas" inputMode="numeric" placeholder="Ej. 15" maxLength={3} value={datos.personas}
                                    onChange={(e) => cambiar("personas", e.target.value.replace(/\D/g, ""))} aria-invalid={errores.personas ? true : undefined} />
                            </Campo>
                            <Campo id="motivo" etiqueta="Motivo de la solicitud" error={errores.motivo}>
                                <input id="esp-motivo" placeholder="Describe brevemente la actividad" maxLength={300} value={datos.motivo}
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
                        <button type="submit" className="espacios-enviar" disabled={enviando || !carga || "error" in carga}>
                            {enviando ? "Enviando…" : "Enviar solicitud"} <img src={enviar} alt="" />
                        </button>
                    </form>
                </div>
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

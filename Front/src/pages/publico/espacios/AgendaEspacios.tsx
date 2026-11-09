import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { useTramite } from "../credencial/datos";
import { Chip, Nota } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import { HOY_EJEMPLO } from "../eventos/datosAgenda";
import { notificaciones } from "../notificaciones/datos";
import { areas, separarAreas, type Area } from "./datos";
import { disponibilidad, enviarSolicitudEspacio, validarSolicitud, type DatosSolicitud, type ErroresSolicitud } from "./datosSesion";
import "./EspaciosSesion.css";
import iconoPin from "../../../assets/espacios/pin-verde.svg";
import checkPaso from "../../../assets/credencial/paso-check.svg";
import checkBlanco from "../../../assets/perfil/tarjeta-check.svg";
import alerta from "../../../assets/credencial/alerta-dorada.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import enviar from "../../../assets/perfil/tarjeta-enviar.svg";

// Agenda de espacios con sesión (Figma A-02, 476:28196; sin credencial vigente, 476:28399).
const pasos = ["Credencial verificada", "Elige un área", "Fecha y horario", "Envía tu solicitud"];
const vacio: DatosSolicitud = { fecha: "", horaInicio: "", horaFin: "", personas: "", motivo: "" };

export default function AgendaEspacios() {
    const navegar = useNavigate();
    const tramite = useTramite(); // GET /mis-solicitudes
    const vigente = tramite.estado === "vigente";
    const { solicitables, noSolicitables } = separarAreas();
    const [areaId, setAreaId] = useState(areas.find((a) => a.id === "area-actividades")?.id ?? solicitables[0].id);
    const [datos, setDatos] = useState(vacio);
    const [errores, setErrores] = useState<ErroresSolicitud>({});
    const bloqueo = useRef(false);
    const area = areas.find((a) => a.id === areaId)!;
    const paso = !vigente ? 1 : datos.fecha && datos.horaInicio && datos.horaFin ? 4 : 3;

    function cambiar(campo: keyof DatosSolicitud, valor: string) { setDatos((d) => ({ ...d, [campo]: valor })); }

    function enviarSolicitud(e: FormEvent) {
        e.preventDefault();
        if (!vigente || bloqueo.current) return;
        const encontrados = validarSolicitud(datos, HOY_EJEMPLO);
        setErrores(encontrados);
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`esp-${primero}`)?.focus(); return; }
        bloqueo.current = true;
        const s = enviarSolicitudEspacio(areaId, datos);
        notificaciones.agregar({
            area: "espacios", titulo: "Recibimos tu solicitud de espacio", cuando: "Ahora",
            texto: `${area.nombre}. El personal revisará la disponibilidad y te responderá aquí.`,
            accion: { texto: "Ver solicitud", ruta: `/espacios/solicitud/${s.id}` },
        });
        navegar(`/espacios/enviada?id=${s.id}`);
    }

    return (
        <PaginaPublica>
            <EncabezadoPublico etiqueta="AGENDA DE ESPACIOS" titulo="Elige el área que quieres solicitar"
                texto="Selecciona un área, indica fecha y horario y envía tu solicitud. La biblioteca la revisa y confirma." />
            <div className="espacios-cuerpo">
                <ol className="cred-pasos espacios-pasos">
                    {pasos.map((p, i) => {
                        const numero = i + 1;
                        const estado = vigente ? (numero < Math.max(paso, 2) ? "hecho" : numero === Math.max(paso, 2) ? "actual" : "pendiente") : numero === 1 ? "actual" : "pendiente";
                        return (
                            <li key={p} className={`cred-paso cred-paso--${estado}`} aria-current={estado === "actual" ? "step" : undefined}>
                                <span className="cred-paso__numero">{estado === "hecho" ? <img src={checkPaso} alt="Completado:" /> : numero}</span>
                                {numero === 1 && !vigente ? "Valida tu credencial" : p}
                            </li>
                        );
                    })}
                </ol>

                {vigente ? (
                    <div className="espacios-aviso">
                        <span className="espacios-aviso__icono"><img src={checkBlanco} alt="" /></span>
                        <strong>Credencial validada y vigente. Puedes solicitar espacios.</strong>
                        <Link to="/mi-perfil/credencial" className="boton-visitante cred-boton-contorno">Ver mi credencial</Link>
                    </div>
                ) : (
                    <div className="espacios-aviso espacios-aviso--dorado">
                        <span className="espacios-aviso__icono"><img src={alerta} alt="" /></span>
                        <strong>
                            Necesitas una credencial validada y vigente para solicitar espacios.
                            {tramite.estado === "en-revision" ? " Tu trámite está en revisión." : ""}
                        </strong>
                        <Link to={tramite.estado === "sin-solicitud" ? "/credencial" : "/credencial/seguimiento"} className="boton-visitante cred-boton-contorno">
                            {tramite.estado === "sin-solicitud" ? "Solicitar mi credencial" : "Ver mi trámite"}
                        </Link>
                    </div>
                )}

                <div className="espacios-columnas">
                    <section className="cred-tarjeta espacios-plano" aria-labelledby="titulo-plano">
                        <div className="espacios-plano__cabecera">
                            <span><img src={iconoPin} alt="" /></span>
                            <div><h2 id="titulo-plano">Plano de la biblioteca</h2><p>Plano esquemático ilustrativo · áreas por confirmar</p></div>
                        </div>
                        <p className="cred-sobretitulo">SE PUEDEN SOLICITAR</p>
                        <div className="espacios-areas" role="radiogroup" aria-label="Áreas que se pueden solicitar">
                            {solicitables.map((a) => <AreaBoton key={a.id} area={a} elegida={a.id === areaId} alElegir={() => setAreaId(a.id)} />)}
                        </div>
                        <p className="cred-sobretitulo">NO SE SOLICITAN</p>
                        <div className="espacios-areas">
                            {noSolicitables.map((a) => (
                                <div key={a.id} className="espacios-area espacios-area--apagada">
                                    <strong>{a.nombre}</strong>{a.nota && <span>{a.nota}</span>}<Chip color="gris">No reservable</Chip>
                                </div>
                            ))}
                        </div>
                        <Nota color="dorada" icono={infoDorado}>La disponibilidad que ves es de ejemplo. Las áreas y el plano real están por confirmar con la biblioteca.</Nota>
                    </section>

                    <form className="cred-tarjeta espacios-formulario" onSubmit={enviarSolicitud} noValidate>
                        <p className="cred-sobretitulo">ÁREA SELECCIONADA</p>
                        <h2>{area.nombre}</h2>
                        <p className="espacios-formulario__nota">Capacidad y equipamiento: por confirmar con la biblioteca.</p>
                        <fieldset disabled={!vigente}>
                            <Campo id="fecha" etiqueta="Fecha" error={errores.fecha}>
                                <input id="esp-fecha" type="date" min={HOY_EJEMPLO} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} required aria-invalid={errores.fecha ? true : undefined} />
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
                        </fieldset>
                        <Nota color="dorada" icono={infoDorado}>El personal revisa cada solicitud. Recibirás la respuesta en tu cuenta.</Nota>
                        <button type="submit" className="espacios-enviar" disabled={!vigente}>Enviar solicitud <img src={enviar} alt="" /></button>
                    </form>
                </div>
            </div>
        </PaginaPublica>
    );
}

function AreaBoton({ area, elegida, alElegir }: { area: Area; elegida: boolean; alElegir: () => void }) {
    const disp = disponibilidad(area);
    if (disp === "no-disponible") {
        return <div className="espacios-area espacios-area--apagada"><strong>{area.nombre}</strong><Chip color="gris">No disponible</Chip></div>;
    }
    return (
        <button type="button" role="radio" aria-checked={elegida} onClick={alElegir} className={`espacios-area${elegida ? " espacios-area--elegida" : ""}`}>
            <strong>{area.nombre}</strong>
            {elegida ? <span className="espacios-area__chip">Seleccionada</span> : <Chip color="verde">Disponible</Chip>}
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

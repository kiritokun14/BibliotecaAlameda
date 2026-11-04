import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PaginaPublica from "../../../components/portal/PaginaPublica";
import { EncabezadoNoticias } from "../noticias/piezas";
import "../noticias/Noticias.css";
import { Chip, Nota } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import { useSesion, usePerfil } from "../perfil/usarSesion";
import { nombreCompleto } from "../perfil/datos";
import { separarAreas } from "../espacios/datos";
import { HOY_EJEMPLO } from "../eventos/datosAgenda";
import { notificaciones } from "../notificaciones/datos";
import {
    enviarPropuesta, obtenerPropuesta, propuestaVacia, publicos, reenviarPropuesta, validarCorreccion, validarPropuesta,
    type DatosPropuesta, type ErroresPropuesta, type Propuesta,
} from "./datos";
import "./Proponer.css";
import radioMarcado from "../../../assets/credencial/radio.svg";
import infoDorado from "../../../assets/credencial/info-dorado.svg";
import alertaGuinda from "../../../assets/credencial/alerta-guinda.svg";
import checkEnviada from "../../../assets/credencial/enviada-check.svg";
import estrella from "../../../assets/perfil/tarjeta-estrella.svg";
import libro from "../../../assets/credencial/libro.svg";
import calendario from "../../../assets/perfil/evento-calendario-verde.svg";
import usuario from "../../../assets/perfil/tarjeta-usuario.svg";
import enviar from "../../../assets/perfil/tarjeta-enviar.svg";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";

// Proponer una actividad con sesión (Figma A-02, 476:29029 formulario, 476:29255 enviado,
// 476:29488 con observaciones, 543:15773 no aprobada).
const regresoEventos = { texto: "Volver a Eventos y actividades", ruta: "/eventos" };
const regresoPropuestas = { texto: "Volver a Mis propuestas", ruta: "/mi-perfil/propuestas" };

function SinSesion() {
    return (
        <PaginaPublica>
            <div className="cred-estado">
                <h1>Inicia sesión para proponer una actividad</h1>
                <p>Con tu cuenta puedes proponer eventos o clubes y dar seguimiento a tus propuestas.</p>
                <Link className="boton-visitante" to="/iniciar-sesion">Iniciar sesión <img src={flechaBlanca} alt="" /></Link>
            </div>
        </PaginaPublica>
    );
}

function Seccion({ icono, titulo, dorado, children }: { icono: string; titulo: string; dorado?: boolean; children: ReactNode }) {
    return (
        <section className="cred-tarjeta proponer-seccion">
            <div className="proponer-seccion__cabecera">
                <span className={dorado ? "proponer-icono--dorado" : undefined}><img src={icono} alt="" /></span>
                <h2>{titulo}</h2>
            </div>
            {children}
        </section>
    );
}

function Campo({ id, etiqueta, error, obligatorio = false, children }: { id: string; etiqueta: string; error?: string; obligatorio?: boolean; children: ReactNode }) {
    return (
        <div className="cred-campo">
            <label htmlFor={`pro-${id}`}>{etiqueta}{obligatorio && <span className="proponer-obligatorio">(obligatorio)</span>}</label>
            {children}
            {error && <p id={`pro-${id}-error`} className="cred-error-campo proponer-error">{error}</p>}
        </div>
    );
}

// ---------- Formulario ----------
export default function Proponer() {
    const sesion = useSesion();
    const carga = usePerfil(sesion);
    if (sesion === null) return <SinSesion />;
    if (!carga || "error" in carga) return <PaginaPublica><p className="cred-estado" role="status">Cargando…</p></PaginaPublica>;
    return <Formulario key={carga.perfil.id} responsable={nombreCompleto(carga.perfil)} telefono={carga.perfil.telefono} />;
}

function Formulario({ responsable, telefono }: { responsable: string; telefono: string }) {
    const navegar = useNavigate();
    const [datos, setDatos] = useState<DatosPropuesta>(() => propuestaVacia(responsable, telefono));
    const [errores, setErrores] = useState<ErroresPropuesta>({});
    const bloqueo = useRef(false);
    const { solicitables } = separarAreas();
    const cambiar = <K extends keyof DatosPropuesta>(campo: K, valor: DatosPropuesta[K]) => setDatos((d) => ({ ...d, [campo]: valor }));
    const invalido = (c: keyof DatosPropuesta) => (errores[c] ? { "aria-invalid": true, "aria-describedby": `pro-${c}-error` } : {});

    function enviarFormulario(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const encontrados = validarPropuesta(datos, HOY_EJEMPLO);
        setErrores(encontrados);
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`pro-${primero}`)?.focus(); return; }
        bloqueo.current = true;
        const p = enviarPropuesta(datos);
        notificaciones.agregar({
            area: "propuesta", titulo: "Recibimos tu propuesta", cuando: "Ahora",
            texto: `${p.titulo}. El personal la revisará y te responderá aquí.`, accion: { texto: "Ver propuesta", ruta: `/proponer/${p.id}` },
        });
        navegar(`/proponer/enviada?id=${p.id}`);
    }

    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regresoEventos} etiqueta="PROPUESTA" titulo={<>Propón un evento <span>o club</span></>}
                texto="Cuéntanos tu idea. Proponer no aprueba ni reserva: el personal la revisa y te responde." />
            <div className="proponer-cuerpo">
                <form className="proponer-formulario" onSubmit={enviarFormulario} noValidate>
                    <Seccion icono={estrella} titulo="Tipo de propuesta" dorado>
                        <div className="cred-opciones" role="radiogroup" aria-label="Tipo de propuesta">
                            {([["evento", "Evento", "Una actividad puntual"], ["club", "Club", "Un grupo que se reúne con regularidad"]] as const).map(([v, t, x]) => (
                                <label key={v} className={`cred-opcion${datos.tipo === v ? " cred-opcion--elegida" : ""}`}>
                                    <input type="radio" name="tipo" checked={datos.tipo === v} onChange={() => cambiar("tipo", v)} />
                                    <span className="cred-opcion__radio" aria-hidden="true">{datos.tipo === v && <img src={radioMarcado} alt="" />}</span>
                                    <span className="cred-opcion__textos"><strong>{t}</strong>{x}</span>
                                </label>
                            ))}
                        </div>
                    </Seccion>
                    <Seccion icono={libro} titulo="La actividad">
                        <Campo id="titulo" etiqueta="Título de la propuesta" obligatorio error={errores.titulo}>
                            <input id="pro-titulo" placeholder="Nombre de tu evento o club" maxLength={150} value={datos.titulo} onChange={(e) => cambiar("titulo", e.target.value)} {...invalido("titulo")} />
                        </Campo>
                        <Campo id="descripcion" etiqueta="Descripción" obligatorio error={errores.descripcion}>
                            <textarea id="pro-descripcion" rows={3} placeholder="Describe de qué trata y qué se hará" maxLength={1000} value={datos.descripcion}
                                onChange={(e) => cambiar("descripcion", e.target.value)} {...invalido("descripcion")} />
                        </Campo>
                        <div className="cred-fila">
                            <Campo id="publico" etiqueta="Público al que va dirigido" obligatorio error={errores.publico}>
                                <select id="pro-publico" value={datos.publico} onChange={(e) => cambiar("publico", e.target.value)} {...invalido("publico")}>
                                    <option value="">Selecciona una opción</option>
                                    {publicos.map((p) => <option key={p}>{p}</option>)}
                                </select>
                            </Campo>
                            <Campo id="participantes" etiqueta="Número estimado de participantes" obligatorio error={errores.participantes}>
                                <input id="pro-participantes" inputMode="numeric" placeholder="Ej. 20" maxLength={3} value={datos.participantes}
                                    onChange={(e) => cambiar("participantes", e.target.value.replace(/\D/g, ""))} {...invalido("participantes")} />
                            </Campo>
                        </div>
                    </Seccion>
                    <Seccion icono={calendario} titulo="Fecha, lugar y material">
                        <div className="cred-fila">
                            <Campo id="fecha" etiqueta="Fecha propuesta" error={errores.fecha}>
                                <input id="pro-fecha" type="date" min={HOY_EJEMPLO} value={datos.fecha} onChange={(e) => cambiar("fecha", e.target.value)} {...invalido("fecha")} />
                            </Campo>
                            <div className="cred-campo">
                                <label htmlFor="pro-horaInicio">Horario propuesto</label>
                                <div className="proponer-horario">
                                    <input id="pro-horaInicio" type="time" aria-label="Hora de inicio" value={datos.horaInicio} onChange={(e) => cambiar("horaInicio", e.target.value)} />
                                    <span>a</span>
                                    <input id="pro-horaFin" type="time" aria-label="Hora de término" value={datos.horaFin} onChange={(e) => cambiar("horaFin", e.target.value)} {...invalido("horaFin")} />
                                </div>
                                {errores.horaFin && <p id="pro-horaFin-error" className="cred-error-campo proponer-error">{errores.horaFin}</p>}
                            </div>
                        </div>
                        <div className="cred-fila">
                            <Campo id="espacio" etiqueta="Espacio sugerido">
                                <select id="pro-espacio" value={datos.espacio} onChange={(e) => cambiar("espacio", e.target.value)}>
                                    <option value="">Selecciona un área</option>
                                    {solicitables.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                </select>
                            </Campo>
                            <Campo id="material" etiqueta="Material que necesitas">
                                <input id="pro-material" placeholder="Libros, proyector, sillas…" maxLength={300} value={datos.material} onChange={(e) => cambiar("material", e.target.value)} />
                            </Campo>
                        </div>
                    </Seccion>
                    <Seccion icono={usuario} titulo="Responsable">
                        <div className="cred-fila">
                            <Campo id="responsable" etiqueta="Nombre de la persona responsable" obligatorio error={errores.responsable}>
                                <input id="pro-responsable" placeholder="Nombre completo" maxLength={200} value={datos.responsable} onChange={(e) => cambiar("responsable", e.target.value)} {...invalido("responsable")} />
                            </Campo>
                            <Campo id="telefono" etiqueta="Teléfono de contacto" obligatorio error={errores.telefono}>
                                <input id="pro-telefono" type="tel" inputMode="numeric" placeholder="10 dígitos" maxLength={10} value={datos.telefono}
                                    onChange={(e) => cambiar("telefono", e.target.value.replace(/\D/g, ""))} {...invalido("telefono")} />
                            </Campo>
                        </div>
                    </Seccion>
                    <label className="cred-casilla">
                        <input id="pro-acepta" type="checkbox" checked={datos.acepta} onChange={(e) => cambiar("acepta", e.target.checked)} {...invalido("acepta")} />
                        Entiendo que enviar la propuesta no la aprueba ni reserva el espacio.
                    </label>
                    {errores.acepta && <p id="pro-acepta-error" className="cred-error-campo">{errores.acepta}</p>}
                    <div><button type="submit" className="proponer-enviar">Enviar propuesta <img src={enviar} alt="" /></button></div>
                </form>
                <aside className="cred-tarjeta proponer-lateral">
                    <h2>¿Qué pasa con tu propuesta?</h2>
                    <ol className="cred-mini-pasos">
                        <li><span>1</span><div><strong>La envías</strong>Queda registrada como propuesta.</div></li>
                        <li><span>2</span><div><strong>El personal la revisa</strong>Evalúa espacio, fechas y material.</div></li>
                        <li><span>3</span><div><strong>El personal decide</strong>Aprueba, pide cambios o rechaza.</div></li>
                        <li><span>4</span><div><strong>Si se aprueba, se publica</strong>Aparecerá en Eventos y Actividades.</div></li>
                    </ol>
                    <Nota color="dorada" icono={infoDorado}>Puedes dar seguimiento a tus propuestas desde tu Perfil. Los cambios o cancelaciones se solicitan, no se aplican directamente.</Nota>
                </aside>
            </div>
        </PaginaPublica>
    );
}

// ---------- Propuesta enviada ----------
export function PropuestaEnviada() {
    const [parametros] = useSearchParams();
    const propuesta = obtenerPropuesta(parametros.get("id") ?? undefined);
    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regresoEventos} etiqueta="PROPUESTA" titulo={<>Propón un evento <span>o club</span></>}
                texto="Tu propuesta queda registrada para revisión." />
            <div className="proponer-cuerpo proponer-cuerpo--una">
                <section className="cred-tarjeta proponer-enviada">
                    <span className="proponer-enviada__icono"><img src={checkEnviada} alt="" /></span>
                    <h2>Propuesta enviada</h2>
                    <p className="cred-texto">Tu propuesta quedó registrada. Enviarla no la aprueba ni reserva el espacio: el personal la revisará y te responderá.</p>
                    <div className="proponer-enviada__chips">
                        <Chip color="gris">{propuesta?.folio ? `Folio: ${propuesta.folio}` : "Folio: por asignar"}</Chip>
                        <Chip color="dorado">Pendiente de revisión por el personal</Chip>
                    </div>
                    <p className="proponer-suave">Recibirás los cambios en tus notificaciones.</p>
                    <div className="cred-acciones">
                        <Link to="/mi-perfil/propuestas" className="boton-visitante">Ver mis propuestas <img src={flechaBlanca} alt="" /></Link>
                        <Link to="/eventos" className="boton-visitante cred-boton-contorno">Volver a Eventos y actividades</Link>
                    </div>
                </section>
            </div>
        </PaginaPublica>
    );
}

// ---------- Detalle de una propuesta: con observaciones, no aprobada o en revisión ----------
export function DetallePropuesta() {
    const { id } = useParams();
    const [version, setVersion] = useState(0);
    const propuesta = obtenerPropuesta(id);
    if (!propuesta) return <Navigate to="/mi-perfil/propuestas" replace />;
    return <VistaPropuesta key={version} propuesta={propuesta} alReenviar={() => setVersion((v) => v + 1)} />;
}

function VistaPropuesta({ propuesta: p, alReenviar }: { propuesta: Propuesta; alReenviar: () => void }) {
    const [correccion, setCorreccion] = useState({ cupo: "", fecha: "", comentarios: "" });
    const [errores, setErrores] = useState<Partial<Record<"cupo" | "fecha" | "comentarios", string>>>({});
    const folio = p.folio ?? "por asignar";

    function reenviar(e: FormEvent) {
        e.preventDefault();
        const encontrados = validarCorreccion(correccion, HOY_EJEMPLO);
        setErrores(encontrados);
        if (encontrados.cupo || encontrados.fecha || encontrados.comentarios) {
            document.getElementById(encontrados.cupo ? "cor-cupo" : encontrados.fecha ? "cor-fecha" : "cor-comentarios")?.focus();
            return;
        }
        reenviarPropuesta(p.id);
        alReenviar();
    }

    if (p.estado === "no-aprobada") return <NoAprobada etiqueta="MIS PROPUESTAS" titulo={p.titulo} folio={folio} tipo="propuesta" regreso={regresoPropuestas} />;

    const texto = p.estado === "con-observaciones" ? `Folio ${folio} · el personal dejó observaciones.` : `Folio ${folio} · en revisión por el personal.`;
    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regresoPropuestas} etiqueta="MIS PROPUESTAS" titulo={p.titulo} texto={texto} />
            <div className="proponer-cuerpo">
                <div className="proponer-formulario">
                    {p.estado === "con-observaciones" ? <>
                        <Nota color="guinda" icono={alertaGuinda}><strong>Observaciones del personal.</strong> {p.observaciones}</Nota>
                        <form className="cred-tarjeta proponer-seccion" onSubmit={reenviar} noValidate>
                            <h2>Corregir propuesta</h2>
                            <div className="cred-fila">
                                <div className="cred-campo">
                                    <label htmlFor="cor-cupo">Cupo máximo<span className="proponer-obligatorio">(obligatorio)</span></label>
                                    <input id="cor-cupo" inputMode="numeric" placeholder="Ejemplo: 25 personas" maxLength={3} value={correccion.cupo}
                                        onChange={(e) => setCorreccion((c) => ({ ...c, cupo: e.target.value.replace(/\D/g, "") }))} aria-invalid={errores.cupo ? true : undefined} />
                                    {errores.cupo && <p className="cred-error-campo proponer-error">{errores.cupo}</p>}
                                </div>
                                <div className="cred-campo">
                                    <label htmlFor="cor-fecha">Fecha alternativa</label>
                                    <input id="cor-fecha" type="date" min={HOY_EJEMPLO} value={correccion.fecha}
                                        onChange={(e) => setCorreccion((c) => ({ ...c, fecha: e.target.value }))} aria-invalid={errores.fecha ? true : undefined} />
                                    {errores.fecha && <p className="cred-error-campo proponer-error">{errores.fecha}</p>}
                                </div>
                            </div>
                            <div className="cred-campo">
                                <label htmlFor="cor-comentarios">Comentarios para el personal</label>
                                <textarea id="cor-comentarios" rows={3} placeholder="Explica los cambios" maxLength={500} value={correccion.comentarios}
                                    onChange={(e) => setCorreccion((c) => ({ ...c, comentarios: e.target.value }))} />
                            </div>
                            <div><button type="submit" className="boton-visitante">Reenviar propuesta <img src={flechaBlanca} alt="" /></button></div>
                        </form>
                    </> : (
                        <section className="cred-tarjeta proponer-seccion" role="status">
                            <h2>Tu propuesta está en revisión</h2>
                            <p className="cred-texto">El personal la está revisando. Recibirás la respuesta en tus notificaciones.</p>
                        </section>
                    )}
                </div>
                <aside className="cred-tarjeta proponer-lateral">
                    <p className="cred-sobretitulo">ESTADO</p>
                    <Chip color="dorado">En atención</Chip>
                    <p className="cred-texto">Al reenviar, la propuesta vuelve a revisión y recibirás un aviso con la respuesta.</p>
                </aside>
            </div>
        </PaginaPublica>
    );
}

// «Propuesta no aprobada» y «Solicitud de espacio no aprobada» (Figma 543:15773 y 543:15939).
export function NoAprobada({ etiqueta, titulo, folio, tipo, regreso }: {
    etiqueta: string; titulo: string; folio: string; tipo: "propuesta" | "espacio"; regreso: { texto: string; ruta: string };
}) {
    const queEs = tipo === "propuesta" ? "la propuesta fue evaluada y no fue aprobada" : "la solicitud fue evaluada y no fue aprobada";
    return (
        <PaginaPublica>
            <EncabezadoNoticias regreso={regreso} etiqueta={etiqueta} titulo={titulo} texto={`Folio ${folio} · ${queEs}.`} />
            <div className="proponer-cuerpo">
                <div className="proponer-formulario">
                    <section className="cred-tarjeta proponer-seccion">
                        <h2>Mensaje de la biblioteca</h2>
                        <p className="cred-texto">
                            Tu {tipo === "propuesta" ? "propuesta" : "solicitud de espacio"} fue evaluada y no fue aprobada. Para conocer el motivo y darle
                            seguimiento, acude personalmente a la biblioteca con tu folio. Este mensaje es automático (ejemplo).
                        </p>
                    </section>
                    <section className="cred-tarjeta proponer-seccion">
                        <h2>Qué hacer ahora</h2>
                        <ol className="cred-mini-pasos">
                            <li><span>1</span><div>Acude con tu folio {folio} a la biblioteca.</div></li>
                            <li><span>2</span><div>Pregunta en atención por el motivo de la decisión.</div></li>
                            <li><span>3</span><div>{tipo === "propuesta" ? "Si lo deseas, puedes volver a proponer la actividad." : "Si lo deseas, puedes solicitar el espacio de nuevo con otra fecha."}</div></li>
                        </ol>
                        <p className="proponer-suave">Horario de atención: por confirmar con la biblioteca.</p>
                    </section>
                </div>
                <aside className="cred-tarjeta proponer-lateral">
                    <p className="cred-sobretitulo">ESTADO</p>
                    <Chip color="guinda">No aprobada</Chip>
                    <p className="cred-texto">Esta decisión no se aclara en línea: acude presencialmente a la biblioteca.</p>
                </aside>
            </div>
        </PaginaPublica>
    );
}

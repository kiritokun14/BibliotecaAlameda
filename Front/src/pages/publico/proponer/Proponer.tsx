import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import PaginaPublica, { EncabezadoPublico } from "../../../components/portal/PaginaPublica";
import { EsqueletoDetalle } from "../../../components/portal/Esqueleto";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { editarPropuestaUsuario, fechaHoyTepic, registrarPropuestaUsuario } from "../../../servicios/propuestasUsuario";
import { cancelarPropuesta, consultarTramitePropio, type SolicitudAtencion } from "../../../servicios/tramites";
import { useCuentaTramites } from "../../../servicios/useCuentaTramites";
import { sesionSimulada, useSesion, usePerfil } from "../perfil/usarSesion";
import { nombreCompleto } from "../perfil/datos";
import { TarjetaPerfil } from "../perfil/piezas";
import { Campo } from "../perfil/secciones";
import { iconosSeccion } from "../perfil/iconos";
import { AyudaTramite, Chip, PasosTramite, RutaCredencial } from "../credencial/piezas";
import { separarAreas } from "../espacios/datos";
import { HORARIO } from "../espacios/datosSesion";
import PedirSesion from "../sesion/PedirSesion";
import {
    cancelarPropuestaSimulada, estadoDePropuesta, etapasPropuesta, guardarPropuestaSimulada, pasosPropuesta, pasosRutaPropuesta,
    propuestaDesdeSolicitud, propuestaSimulada, propuestaVacia, publicos, puedeCancelar, puedeEditar, rutasPropuesta,
    textosPropuesta, validarPropuesta, type DatosPropuesta, type ErroresPropuesta, type TipoPropuesta,
} from "./datos";
import "../contacto/Contacto.css";
import "../perfil/Perfil.css";
import "../credencial/CredencialSesion.css";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";

// Propuestas de actividades con la plantilla C «Página de trámite», como Credencial y Espacios (Aldahir, 20 y 21 nov 2026).
//   /proponer             → pasos «Tu propuesta · Seguimiento» → formulario (qué, la actividad, cuándo y dónde,
//                           responsable y confirmaciones) | «Qué pasa con tu propuesta» + ayuda (acompaña al bajar).
//   /proponer/:id         → seguimiento: el estado (chip, qué pasa, folio, tipo y fecha, observaciones, «Editar propuesta»
//                           y «Cancelar propuesta» con confirmación en el lugar) y la ruta de cuatro pasos | resumen + ayuda.
//   /proponer/:id/editar  → el mismo formulario ya lleno; al guardar vuelve al seguimiento con el aviso.
// Al enviar se va directo al seguimiento con el aviso de que quedó registrada (sin pantalla aparte de «enviada»).
// Fecha y horario, si se indican, dentro del horario de la biblioteca. Con ?simular=sesion, la propuesta vive en memoria.
const PAGINA = "contacto-seccion contacto-seccion--crema cred-pagina pro-pagina";
type Aviso = { enviada?: boolean; editada?: boolean };

export default function Proponer() {
    const sesion = useSesion();
    const [intento, reintentar] = useState(0);
    const carga = usePerfil(sesion, intento);
    if (sesion === null) {
        return <PaginaPublica><PedirSesion titulo="Inicia sesión para proponer una actividad" texto="Con tu cuenta propones eventos o clubes y sigues su revisión." /></PaginaPublica>;
    }
    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.propuestas} etiqueta="Propuestas" titulo={<>Propón una <span>actividad</span></>}
                texto="Cuéntanos tu idea. Proponer no la aprueba ni reserva el espacio: el personal la revisa y te responde." />
            <section className={PAGINA}>
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosPropuesta} rutas={rutasPropuesta()} actual={1} pagina={1} />
                    {!carga ? <section className="esp-mapa esp-seguimiento__carga"><EsqueletoDetalle texto="Cargando tus datos…" /></section>
                        : "error" in carga ? (
                            <section className="esp-mapa esp-seguimiento__carga">
                                <div className="perfil-vacio perfil-vacio--eventos">
                                    <h2>No pudimos cargar tus datos</h2><p role="alert">{carga.error}</p>
                                    <div className="perfil-acciones perfil-acciones--centro"><button type="button" className="perfil-boton" onClick={() => reintentar((v) => v + 1)}>Reintentar</button></div>
                                </div>
                            </section>
                        ) : <Formulario key={carga.perfil.id} inicial={propuestaVacia(nombreCompleto(carga.perfil), carga.perfil.telefono)} />}
                </div>
            </section>
        </PaginaPublica>
    );
}

// ---------- Editar una propuesta ----------
export function EditarPropuesta() {
    const { id } = useParams();
    const sesion = useSesion();
    const [version, setVersion] = useState(0);
    const { solicitud: s, error, cargando } = usePropuestaReal(id, version);
    if (sesion === null) {
        return <PaginaPublica><PedirSesion titulo="Inicia sesión para editar tu propuesta" texto="Tus propuestas están en tu cuenta." /></PaginaPublica>;
    }
    if (s && !puedeEditar(estadoDePropuesta(s), sesionSimulada)) return <Navigate to={`/proponer/${encodeURIComponent(s.id)}`} replace />;
    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.propuestas} etiqueta="Propuestas" titulo={<>Edita tu <span>propuesta</span></>}
                texto="Cambia lo que necesites; al guardar, tu propuesta vuelve a revisión." />
            <section className={PAGINA}>
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosPropuesta} rutas={rutasPropuesta(id)} actual={2} pagina={1} />
                    {s ? <Formulario key={s.actualizadoEn ?? s.id} inicial={propuestaDesdeSolicitud(s)} anterior={s} />
                        : cargando && !error ? <section className="esp-mapa esp-seguimiento__carga"><EsqueletoDetalle texto="Cargando tu propuesta…" /></section>
                        : <NoAbre error={error} reintentar={() => setVersion((v) => v + 1)} />}
                </div>
            </section>
        </PaginaPublica>
    );
}

function Formulario({ inicial, anterior }: { inicial: DatosPropuesta; anterior?: SolicitudAtencion }) {
    const navegar = useNavigate();
    const [datos, setDatos] = useState<DatosPropuesta>(inicial);
    const [errores, setErrores] = useState<ErroresPropuesta>({});
    const bloqueo = useRef(false);
    const [guardando, setGuardando] = useState(false);
    const [errorEnvio, setErrorEnvio] = useState("");
    const [motivoCambio, setMotivoCambio] = useState("");
    const hoy = fechaHoyTepic();
    const { solicitables } = separarAreas();
    const cambiar = <K extends keyof DatosPropuesta>(campo: K, valor: DatosPropuesta[K]) => setDatos((d) => ({ ...d, [campo]: valor }));
    const editando = !!anterior;

    function enviar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        const encontrados = validarPropuesta(datos, hoy);
        setErrores(encontrados);
        const primero = Object.keys(encontrados)[0];
        if (primero) { document.getElementById(`pro-${primero}`)?.focus(); return; }
        if (anterior && !motivoCambio.trim()) { setErrorEnvio('Escribe el motivo de la modificación.'); return; }
        bloqueo.current = true; setGuardando(true); setErrorEnvio("");
        const pedir = sesionSimulada ? Promise.resolve(guardarPropuestaSimulada(datos, anterior))
            : anterior ? editarPropuestaUsuario(datos, anterior, motivoCambio) : registrarPropuestaUsuario(datos);
        const aviso: Aviso = editando ? { editada: true } : { enviada: true };
        pedir.then((p) => navegar(`/proponer/${encodeURIComponent(p.id)}`, { state: aviso }))
            .catch((error) => {
                const codigo = error instanceof ErrorServicio ? error.estado : 0;
                setErrorEnvio(codigo === 409 ? "Tu propuesta cambió de estado mientras la editabas. Vuelve al seguimiento para ver cómo va." : mensajeError(error));
                bloqueo.current = false; setGuardando(false);
            });
    }

    const tipos: { valor: TipoPropuesta; titulo: string; texto: string }[] = [
        { valor: "evento", titulo: "Un evento", texto: "Una actividad en una fecha: presentación, charla, taller." },
        { valor: "club", titulo: "Un club", texto: "Un grupo que se reúne con regularidad." },
    ];
    const casilla = (campo: "abiertaAlPublico" | "sinFinesDeLucro" | "acepta", texto: string) => (
        <>
            <label className="cred-casilla">
                <input id={`pro-${campo}`} type="checkbox" checked={datos[campo]} onChange={(e) => cambiar(campo, e.target.checked)}
                    aria-invalid={errores[campo] && !datos[campo] ? true : undefined} aria-describedby={errores[campo] && !datos[campo] ? `pro-${campo}-error` : undefined} />
                {texto}
            </label>
            {errores[campo] && !datos[campo] && <p id={`pro-${campo}-error`} className="cred-error-campo">{errores[campo]}</p>}
        </>
    );

    return (
        <div className="contacto-columnas contacto-columnas--nuevo">
            <form className="formulario-contacto cred-formulario esp-formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-propuesta" aria-busy={guardando}>
                {anterior && <div className="perfil-campo"><label htmlFor="pro-motivo-cambio">Motivo de la modificación</label><textarea id="pro-motivo-cambio" value={motivoCambio} onChange={e => setMotivoCambio(e.target.value)} maxLength={1000} required /></div>}
                <h2 id="titulo-propuesta" className="formulario-contacto__titulo">{editando ? "Edita tu propuesta" : "Tu propuesta"}</h2>

                <fieldset className="cred-grupo" disabled={guardando}>
                    <legend className="cred-grupo__titulo">¿Qué propones?</legend>
                    <div className="perfil-opciones cred-opciones-tipo">
                        {tipos.map((o) => (
                            <label key={o.valor} className={`perfil-opcion${datos.tipo === o.valor ? " perfil-opcion--activa" : ""}`}>
                                <input type="radio" name="tipo" value={o.valor} checked={datos.tipo === o.valor} onChange={() => cambiar("tipo", o.valor)} />
                                <strong>{o.titulo}</strong>
                                <span>{o.texto}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={guardando}>
                    <legend className="cred-grupo__titulo">La actividad</legend>
                    <Campo id="pro-titulo" etiqueta="Nombre" valor={datos.titulo} alCambiar={(v) => cambiar("titulo", v)} maximo={150}
                        marcador="Ej. Club de cómic de los viernes" error={errores.titulo} icono={iconosSeccion.eventos} />
                    <div className="perfil-campo">
                        <label htmlFor="pro-descripcion">De qué trata<span>(obligatorio)</span></label>
                        <textarea id="pro-descripcion" rows={3} maxLength={1000} value={datos.descripcion} placeholder="Qué harán, cómo será cada sesión y qué necesitan"
                            onChange={(e) => cambiar("descripcion", e.target.value)} aria-invalid={errores.descripcion ? true : undefined}
                            aria-describedby={errores.descripcion ? "pro-descripcion-error" : undefined} />
                        {errores.descripcion && <p id="pro-descripcion-error" className="perfil-campo__error">{errores.descripcion}</p>}
                    </div>
                    <div className="perfil-fila">
                        <div className="perfil-campo">
                            <label htmlFor="pro-publico">Para quién<span>(obligatorio)</span></label>
                            <select id="pro-publico" value={datos.publico} onChange={(e) => cambiar("publico", e.target.value)}
                                aria-invalid={errores.publico ? true : undefined} aria-describedby={errores.publico ? "pro-publico-error" : undefined}>
                                <option value="">Selecciona una opción</option>
                                {publicos.map((p) => <option key={p}>{p}</option>)}
                            </select>
                            {errores.publico && <p id="pro-publico-error" className="perfil-campo__error">{errores.publico}</p>}
                        </div>
                        <Campo id="pro-participantes" etiqueta="Personas que esperas" valor={datos.participantes} modoTeclado="numeric" maximo={3}
                            marcador="Ej. 20" alCambiar={(v) => cambiar("participantes", v.replace(/\D/g, ""))} error={errores.participantes} icono={iconosSeccion.datos} />
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={guardando}>
                    <legend className="cred-grupo__titulo">Cuándo y dónde <span className="pro-opcional">(opcional; el personal lo confirma)</span></legend>
                    <div className="perfil-fila esp-fila-tres">
                        <Campo id="pro-fecha" etiqueta="Fecha" tipo="date" obligatorio={false} valor={datos.fecha} alCambiar={(v) => cambiar("fecha", v)}
                            error={errores.fecha} icono={iconosSeccion.eventos} ayuda={errores.fecha ? undefined : HORARIO.texto} />
                        <Campo id="pro-horaInicio" etiqueta="Desde" tipo="time" obligatorio={false} valor={datos.horaInicio} alCambiar={(v) => cambiar("horaInicio", v)} error={errores.horaInicio} />
                        <Campo id="pro-horaFin" etiqueta="Hasta" tipo="time" obligatorio={false} valor={datos.horaFin} alCambiar={(v) => cambiar("horaFin", v)} error={errores.horaFin} />
                    </div>
                    <div className="perfil-fila">
                        <div className="perfil-campo">
                            <label htmlFor="pro-espacio">Espacio que te gustaría<span>(opcional)</span></label>
                            <select id="pro-espacio" value={datos.espacio} onChange={(e) => cambiar("espacio", e.target.value)}>
                                <option value="">Que lo sugiera la biblioteca</option>
                                {solicitables.map((a) => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                            </select>
                        </div>
                        <Campo id="pro-material" etiqueta="Material que necesitas" obligatorio={false} valor={datos.material} maximo={300}
                            marcador="Proyector, sillas, mesas…" alCambiar={(v) => cambiar("material", v)} />
                    </div>
                </fieldset>

                <fieldset className="cred-grupo" disabled={guardando}>
                    <legend className="cred-grupo__titulo">Quién la organiza</legend>
                    <div className="perfil-fila">
                        <Campo id="pro-responsable" etiqueta="Persona responsable" valor={datos.responsable} maximo={200} alCambiar={(v) => cambiar("responsable", v)}
                            error={errores.responsable} icono={iconosSeccion.datos} />
                        <Campo id="pro-telefono" etiqueta="Teléfono" tipo="tel" modoTeclado="numeric" maximo={10} valor={datos.telefono}
                            marcador="10 dígitos" alCambiar={(v) => cambiar("telefono", v.replace(/\D/g, ""))} error={errores.telefono} />
                    </div>
                    {casilla("abiertaAlPublico", "La actividad será abierta al público.")}
                    {casilla("sinFinesDeLucro", "La actividad será sin fines de lucro.")}
                    {casilla("acepta", "Entiendo que enviar la propuesta no la aprueba ni reserva el espacio.")}
                </fieldset>

                {errorEnvio && <p className="cred-error-campo" role="alert">{editando ? "No pudimos guardar tus cambios: " : "No pudimos enviar tu propuesta: "}{errorEnvio}</p>}
                <div className="perfil-acciones">
                    <button type="submit" className="perfil-boton" disabled={guardando}>
                        {guardando ? (editando ? "Guardando…" : "Enviando…") : (editando ? "Guardar cambios" : "Enviar propuesta")}
                    </button>
                    {anterior
                        ? <Link to={`/proponer/${encodeURIComponent(anterior.id)}`} className="perfil-boton perfil-boton--contorno">Volver al seguimiento</Link>
                        : <Link to="/eventos" className="perfil-boton perfil-boton--contorno">Volver a Eventos</Link>}
                </div>
                <p className="solo-lectores" role="status">{guardando ? "Guardando, espera un momento." : ""}</p>
            </form>

            <div className="contacto-lateral pro-lateral">
                <TarjetaPerfil color="verde" icono={tarjetaLista} titulo={editando ? "Al guardar tus cambios" : "Qué pasa con tu propuesta"}>
                    {editando ? (
                        <ol className="cred-mini-pasos">
                            <li><span>1</span><div><strong>Se conserva tu folio</strong>Es la misma propuesta, con tus cambios.</div></li>
                            <li><span>2</span><div><strong>Vuelve a revisión</strong>El personal la revisa de nuevo.</div></li>
                            <li><span>3</span><div><strong>Te responde</strong>Te avisaremos en tus notificaciones.</div></li>
                        </ol>
                    ) : (
                        <ol className="cred-mini-pasos">
                            <li><span>1</span><div><strong>La envías</strong>Recibes un folio para seguirla.</div></li>
                            <li><span>2</span><div><strong>El personal la revisa</strong>Espacio, fechas y material.</div></li>
                            <li><span>3</span><div><strong>Te responde</strong>La aprueba, pide cambios o no la aprueba.</div></li>
                            <li><span>4</span><div><strong>Se publica</strong>La biblioteca la programa en la agenda.</div></li>
                        </ol>
                    )}
                    <div className="perfil-nota perfil-nota--dorada">
                        <img src={notaInfoDorada} alt="" />
                        <p>Las actividades del portal son abiertas al público y sin fines de lucro.</p>
                    </div>
                </TarjetaPerfil>
                <AyudaTramite compacta texto="El personal te orienta con tu propuesta." />
            </div>
        </div>
    );
}

// /proponer/enviada (de antes): ya no hay pantalla aparte; con id va a su seguimiento
export function PropuestaEnviada() {
    const [parametros] = useSearchParams();
    const id = parametros.get("id");
    const aviso: Aviso = { enviada: true };
    return <Navigate to={id ? `/proponer/${encodeURIComponent(id)}` : "/mi-perfil/propuestas"} replace state={aviso} />;
}

// La respuesta se mantiene asociada a la cuenta actual; con la sesión de ejemplo, la propuesta en memoria.
function usePropuestaReal(id?: string, version = 0) {
    const usuario = useCuentaTramites();
    const clave = JSON.stringify([usuario, id, version]);
    const [resultado, setResultado] = useState<{ clave: string; solicitud?: SolicitudAtencion; error?: string }>();
    useEffect(() => {
        if (sesionSimulada || !usuario || !id) return;
        let vigente = true;
        consultarTramitePropio("propuesta", id, usuario).then((solicitud) => { if (vigente) setResultado({ clave, solicitud }); })
            .catch((error) => { if (vigente) setResultado({ clave, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [usuario, id, clave]);
    if (sesionSimulada) {
        const s = propuestaSimulada();
        return { solicitud: s && s.id === id ? s : undefined, error: s && s.id === id ? undefined : "No encontramos esta propuesta. Revisa tus propuestas en Mi perfil.", cargando: false };
    }
    const actual = resultado?.clave === clave ? resultado : undefined;
    return { solicitud: actual?.solicitud, error: !id ? "No se indicó una propuesta." : actual?.error,
        cargando: usuario === undefined || !!usuario && !!id && !actual };
}

function NoAbre({ error, reintentar }: { error?: string; reintentar: () => void }) {
    return (
        <section className="esp-mapa esp-seguimiento__carga">
            <div className="perfil-vacio perfil-vacio--eventos">
                <h2>No pudimos abrir tu propuesta</h2>
                <p role="alert">{error}</p>
                <div className="perfil-acciones perfil-acciones--centro">
                    <button type="button" className="perfil-boton" onClick={reintentar}>Reintentar</button>
                    <Link to="/mi-perfil/propuestas" className="perfil-boton perfil-boton--contorno">Ir a Mis propuestas</Link>
                </div>
            </div>
        </section>
    );
}

// ---------- Seguimiento de una propuesta ----------
export function DetallePropuesta() {
    const { id } = useParams();
    const sesion = useSesion();
    const aviso = (useLocation().state as Aviso | null) ?? {};
    const [version, setVersion] = useState(0);
    const { solicitud: s, error, cargando } = usePropuestaReal(id, version);
    if (sesion === null) {
        return <PaginaPublica><PedirSesion titulo="Inicia sesión para ver tu propuesta" texto="El seguimiento de tus propuestas está en tu cuenta." /></PaginaPublica>;
    }
    const estado = s ? estadoDePropuesta(s) : "en_revision";
    return (
        <PaginaPublica>
            <EncabezadoPublico icono={iconosSeccion.propuestas} etiqueta="Propuestas" titulo={<>Seguimiento de tu <span>propuesta</span></>}
                texto="En qué va tu propuesta; las observaciones del personal se reflejan aquí." />
            <section className={PAGINA}>
                <div className="contacto-pila">
                    <PasosTramite nombres={pasosPropuesta} rutas={rutasPropuesta(id)} actual={estado === "aprobada" ? 3 : 2} pagina={2} />
                    {!s ? (cargando && !error ? <section className="esp-mapa esp-seguimiento__carga"><EsqueletoDetalle texto="Cargando tu propuesta…" /></section>
                        : <NoAbre error={error} reintentar={() => setVersion((v) => v + 1)} />) : (
                        <div className="contacto-columnas contacto-columnas--nuevo">
                            <div className="cred-principal">
                                <EstadoPropuesta solicitud={s} aviso={aviso} alCambiar={() => setVersion((v) => v + 1)} />
                                <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo avanza tu propuesta"
                                    texto={estado === "aprobada" ? "Solo falta que la biblioteca la publique." : "Te avisaremos en tus notificaciones de cada cambio."}>
                                    <RutaCredencial pasos={pasosRutaPropuesta} etapas={etapasPropuesta(estado)} />
                                </TarjetaPerfil>
                            </div>
                            <div className="contacto-lateral pro-lateral">
                                <TarjetaPerfil color="verde" icono={tarjetaEstrella} titulo="Tu propuesta">
                                    <dl className="pro-resumen">
                                        <div><dt>Público</dt><dd>{s.publicoDirigido || "Por definir"}</dd></div>
                                        <div><dt>Espacio</dt><dd>{s.necesidadEspacio || "Por acordar"}</dd></div>
                                        <div><dt>Fecha</dt><dd>{s.diasSolicitados || "Por acordar"}</dd></div>
                                        <div><dt>Horario</dt><dd>{s.horarioSolicitado || "Por acordar"}</dd></div>
                                    </dl>
                                    {s.descripcion && <p className="pro-resumen__texto">{s.descripcion.split("\n\nDatos de la propuesta:")[0]}</p>}
                                </TarjetaPerfil>
                                <AyudaTramite compacta texto="El personal te orienta con tu propuesta." />
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </PaginaPublica>
    );
}

// El estado: insignia con el tipo, chip, qué pasa, fichas Folio · Tipo · Enviada, avisos, observaciones y lo que se puede hacer
function EstadoPropuesta({ solicitud: s, aviso, alCambiar }: { solicitud: SolicitudAtencion; aviso: Aviso; alCambiar: () => void }) {
    const estado = estadoDePropuesta(s);
    const t = textosPropuesta[estado];
    const editar = puedeEditar(estado, sesionSimulada);
    const enviadaEl = s.creadaEn ? new Date(s.creadaEn).toLocaleDateString("es-MX", { timeZone: "America/Mazatlan", day: "2-digit", month: "short", year: "numeric" }).replace(".", "") : "Por confirmar";
    const botonEditar = editar && <Link to={`/proponer/${encodeURIComponent(s.id)}/editar`} className="perfil-boton perfil-boton--chico">Editar propuesta</Link>;
    return (
        <section className="esp-estado pro-estado" aria-labelledby="titulo-estado-propuesta">
            <div className="esp-estado__visual pro-estado__visual">
                <span className="pro-estado__insignia"><img src={tarjetaEstrella} alt="" /></span>
                <p><strong>{s.tituloPropuesta || "Tu propuesta"}</strong>{s.tipoPropuesta || "Actividad"}</p>
            </div>
            <div className="esp-estado__textos">
                <Chip color={t.color}>{t.chip}</Chip>
                <h2 id="titulo-estado-propuesta">{t.titulo}</h2>
                <p>{t.texto}</p>
                <dl className="perfil-datos perfil-datos--tres">
                    <div className="perfil-dato"><dt>Folio</dt><dd>{s.id.slice(0, 8).toUpperCase()}</dd></div>
                    <div className="perfil-dato"><dt>Tipo</dt><dd>{s.tipoPropuesta || "Actividad"}</dd></div>
                    <div className="perfil-dato"><dt>Enviada</dt><dd>{enviadaEl}</dd></div>
                </dl>
                {estado === "en_revision" && (aviso.enviada || aviso.editada) && (
                    <p className="perfil-nota cred-aviso" role="status">
                        <img src={notaInfo} alt="" />
                        {aviso.editada
                            ? <span><strong>Guardamos tus cambios.</strong> Tu propuesta volvió a revisión con el mismo folio.</span>
                            : <span><strong>Tu propuesta quedó registrada.</strong> Ya está en revisión; aquí verás cada cambio.</span>}
                    </p>
                )}
                {s.observacionesInstitucionales && estado !== "cancelada" && (
                    <div className="perfil-nota perfil-nota--guinda"><p><strong>Observaciones del personal</strong>{s.observacionesInstitucionales}</p></div>
                )}
                {puedeCancelar(estado) ? <CancelarPropuesta solicitud={s} alCancelar={alCambiar}>{botonEditar}</CancelarPropuesta>
                    : botonEditar ? <div className="perfil-acciones">{botonEditar}</div> : null}
                {(estado === "rechazada" || estado === "cancelada" || estado === "aprobada") && (
                    <div className="perfil-acciones">
                        {estado !== "aprobada" && <Link to="/proponer" className="perfil-boton perfil-boton--chico">Proponer otra actividad</Link>}
                        <Link to="/mi-perfil/propuestas" className={`perfil-boton perfil-boton--chico${estado !== "aprobada" ? " perfil-boton--contorno" : ""}`}>Mis propuestas</Link>
                    </div>
                )}
            </div>
        </section>
    );
}

// Cancelar en el lugar, como «Cancelar solicitud» de Credencial: el botón guinda se vuelve una nota rosa con la pregunta,
// qué pasa y «Sí, cancelar» · «No, conservarla»; abre y cierra animando su alto. `children` va junto al botón (Editar).
function CancelarPropuesta({ solicitud: s, alCancelar, children }: { solicitud: SolicitudAtencion; alCancelar: () => void; children?: ReactNode }) {
    const [confirmando, setConfirmando] = useState(false);
    const [cerrando, setCerrando] = useState(false);
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState("");
    const [motivo, setMotivo] = useState("");
    function cancelar() {
        if (!motivo.trim()) { setError('Escribe el motivo de la cancelación.'); return; }
        setCancelando(true); setError("");
        const pedir = sesionSimulada ? Promise.resolve(cancelarPropuestaSimulada()) : cancelarPropuesta(s, motivo);
        pedir.then(() => { setCancelando(false); setConfirmando(false); alCancelar(); })
            .catch((e) => {
                setCancelando(false);
                const codigo = e instanceof ErrorServicio ? e.estado : 0;
                setError(codigo === 404 || codigo === 405 || codigo === 422 // la base aún no tiene la operación (PARA_BACKEND.md, punto 8)
                    ? "Por ahora no se puede cancelar en línea. Llama al 311 212 8989 o escribe a la biblioteca con tu folio y el personal la cancela."
                    : codigo === 409 ? "Tu propuesta ya cambió de estado y no se puede cancelar. Recarga la página para ver cómo va."
                    : mensajeError(e));
            });
    }
    if (!confirmando) {
        return (
            <div key="boton" className="perfil-acciones">
                {children}
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={() => setConfirmando(true)}>Cancelar propuesta</button>
            </div>
        );
    }
    return (
        <div key="confirmacion" className={`perfil-nota perfil-nota--guinda cred-cancelar${cerrando ? " cred-cancelar--cerrando" : ""}`} role="group" aria-labelledby="titulo-cancelar-propuesta">
            <p><strong id="titulo-cancelar-propuesta">¿Cancelar tu propuesta?</strong>
                El personal ya no la revisará. Si después cambias de opinión, puedes proponerla de nuevo.</p>
            <label htmlFor="pro-motivo-cancelar">Motivo de la cancelación</label>
            <textarea id="pro-motivo-cancelar" value={motivo} onChange={e => setMotivo(e.target.value)} maxLength={1000} disabled={cancelando} />
            {error && <p className="cred-error-campo" role="alert">{error}</p>}
            <div className="perfil-acciones">
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={cancelar} disabled={cancelando}>
                    {cancelando ? "Cancelando…" : "Sí, cancelar"}
                </button>
                <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno"
                    onClick={() => { setCerrando(true); window.setTimeout(() => { setConfirmando(false); setCerrando(false); setError(""); }, 300); }}
                    disabled={cancelando}>No, conservarla</button>
            </div>
        </div>
    );
}

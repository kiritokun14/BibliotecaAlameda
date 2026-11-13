import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import type { PerfilPropio } from "../../../servicios/perfil";
import { mensajeError } from "../../../servicios/api";
import { EncabezadoSeccion, TarjetaPerfil } from "./piezas";
import { sesionSimulada } from "./usarSesion";
import {
    alternar, consultarPreferencias, estadoNivel, filtrarInscripciones, guardarPreferencias, inscripcionesEjemplo,
    nivelesEjemplo, nombreCompleto, porcentajeProgreso, siguienteMeta, validarCambioContrasena,
    type FiltroEventos, type Inscripcion, type Preferencia,
} from "./datos";
import {
    consultarMisSolicitudes, contarPorGrupo, estadoEspacio, estadoPropuesta, fechaCorta, historialEjemplo,
    type GrupoFiltro, type HistorialSolicitudes,
} from "./solicitudes";
import { cambiarContrasena } from "./seguridad";
import { listarMisSolicitudes, type SolicitudEspacioApi } from "../../../servicios/espacios";
import { etapasCompletas, etapasEnRevision, fechaLarga, useTramite } from "../credencial/datos";
import { Chip, EtapasTramite, TarjetaCredencial } from "../credencial/piezas";
import { sinLeer, useNotificaciones } from "../notificaciones/datos";
import "../credencial/CredencialSesion.css";
import flechaBlanca from "../../../assets/comun/iconos/flecha-blanca.svg";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";
import alertaGuinda from "../../../assets/perfil/alerta-guinda.svg";
import tarjetaCheck from "../../../assets/perfil/tarjeta-check.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import tarjetaCandado from "../../../assets/perfil/tarjeta-candado.svg";
import tarjetaGlobo from "../../../assets/perfil/tarjeta-globo.svg";
import tarjetaEnviar from "../../../assets/perfil/tarjeta-enviar.svg";
import tarjetaCampana from "../../../assets/perfil/tarjeta-campana.svg";
import chipCheckVerde from "../../../assets/perfil/chip-check-verde.svg";
import chipCandado from "../../../assets/perfil/chip-candado.svg";
import interruptorEncendido from "../../../assets/perfil/interruptor-encendido.svg";
import interruptorApagado from "../../../assets/perfil/interruptor-apagado.svg";
import calendarioVerde from "../../../assets/perfil/evento-calendario-verde.svg";
import calendarioDorado from "../../../assets/perfil/evento-calendario-dorado.svg";
import calendarioGuinda from "../../../assets/perfil/evento-calendario-guinda.svg";
import filaCalendario from "../../../assets/perfil/fila-calendario-verde.svg";
import progresoCirculo from "../../../assets/perfil/progreso-circulo.svg";

function NotaInfo({ children }: { children: ReactNode }) {
    return <div className="perfil-nota"><img src={notaInfo} alt="" /><p>{children}</p></div>;
}

function Filtros<T extends string>({ opciones, actual, alElegir }: { opciones: { valor: T; texto: string }[]; actual: T; alElegir: (v: T) => void }) {
    return (
        <div className="perfil-filtros" role="group" aria-label="Filtrar">
            {opciones.map((o) => (
                <button key={o.valor} type="button" aria-pressed={actual === o.valor}
                    className={`perfil-filtro${actual === o.valor ? " perfil-filtro--activo" : ""}`} onClick={() => alElegir(o.valor)}>
                    {o.texto}
                </button>
            ))}
        </div>
    );
}

// ---------- Mi credencial ----------
export function MiCredencialPerfil({ perfil, menor = false }: { perfil: PerfilPropio; menor?: boolean }) {
    const tramite = useTramite(); // GET /mis-solicitudes
    const vigente = tramite.estado === "vigente";
    const enCurso = tramite.estado === "en-revision" || tramite.estado === "correccion";
    return (
        <>
            <EncabezadoSeccion sobretitulo="MI CREDENCIAL" titulo="Mi credencial"
                texto={menor ? "Consulta el estado de la credencial y da seguimiento a la solicitud." : "Consulta el estado de tu credencial y da seguimiento a tu solicitud."} />
            {(vigente || tramite.estado === "vencida") && (
                <div className="perfil-credencial">
                    <TarjetaCredencial titular={nombreCompleto(perfil)} vencida={!vigente} emision={tramite.emision} />
                </div>
            )}
            <TarjetaPerfil color="verde" icono={tarjetaCheck} titulo="Estado de tu credencial">
                {vigente ? <span className="perfil-chip"><img src={chipCheckVerde} alt="" />Vigente</span>
                    : <Chip color={tramite.estado === "vencida" ? "guinda" : tramite.estado === "sin-solicitud" ? "gris" : "dorado"}>
                        {{ "sin-solicitud": "Sin solicitud", "en-revision": "En revisión", correccion: "Corrección solicitada", vencida: "Vencida", vigente: "" }[tramite.estado]}
                    </Chip>}
                {(vigente || tramite.estado === "vencida") && (
                    <dl className="perfil-datos">
                        <div className="perfil-dato"><dt>ESTADO</dt><dd>{vigente ? "Validada y vigente" : "Vencida"}</dd></div>
                        <div className="perfil-dato"><dt>VIGENCIA</dt><dd>2 años desde la emisión</dd></div>
                        <div className="perfil-dato"><dt>EMISIÓN</dt><dd>{tramite.emision ? fechaLarga(tramite.emision) : "Por confirmar"}</dd></div>
                    </dl>
                )}
                <p className="perfil-tarjeta__texto perfil-tarjeta__texto--suave">
                    La credencial la valida el personal de la biblioteca en un cotejo presencial; solicitarla no la valida.
                </p>
                <div className="perfil-acciones">
                    {tramite.estado === "sin-solicitud"
                        ? <Link to="/credencial" className="perfil-boton">Solicitar mi credencial</Link>
                        : tramite.estado === "vencida"
                            ? <Link to="/credencial/solicitud?tipo=renovacion" className="perfil-boton">Solicitar renovación</Link>
                            : <Link to="/credencial/seguimiento" className="perfil-boton">Ver mi credencial</Link>}
                    {tramite.estado !== "sin-solicitud" && <Link to="/credencial/seguimiento" className="perfil-boton perfil-boton--contorno">Ver seguimiento de mi solicitud</Link>}
                </div>
            </TarjetaPerfil>
            {(vigente || enCurso) && (
                <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Seguimiento de tu solicitud" texto="Así avanzó tu trámite (ejemplo).">
                    <EtapasTramite etapas={vigente ? etapasCompletas : etapasEnRevision} />
                </TarjetaPerfil>
            )}
            {menor && (
                <div className="perfil-nota perfil-nota--dorada">
                    <img src={notaInfoDorada} alt="" />
                    <p><strong>Consentimiento de la persona responsable</strong>La credencial de menores requiere el consentimiento de una persona responsable.</p>
                </div>
            )}
        </>
    );
}

// ---------- Mis eventos ----------
const textoInscripcion: Record<Inscripcion["estado"], { texto: string; color: "verde" | "dorado" | "gris" }> = {
    confirmada: { texto: "Inscripción confirmada", color: "verde" },
    pendiente: { texto: "Pendiente de confirmación", color: "dorado" },
    asistida: { texto: "Asistencia registrada", color: "verde" },
    cancelada: { texto: "Cancelada", color: "gris" },
};
const calendarioColor = { verde: calendarioVerde, dorado: calendarioDorado, guinda: calendarioGuinda };

export function MisEventos({ menor = false }: { menor?: boolean }) {
    const lista = inscripcionesEjemplo; // TODO backend: ver datos.ts
    const [filtro, setFiltro] = useState<FiltroEventos>("todos");
    const cuenta = (f: FiltroEventos) => filtrarInscripciones(lista, f).length;
    const visibles = filtrarInscripciones(lista, filtro);
    return (
        <>
            <EncabezadoSeccion sobretitulo="MIS EVENTOS" titulo="Mis eventos"
                texto={menor ? "Las inscripciones y las actividades en las que se ha participado." : "Tus inscripciones y las actividades en las que has participado."} />
            <Filtros actual={filtro} alElegir={setFiltro} opciones={[
                { valor: "todos", texto: `Todos (${cuenta("todos")})` }, { valor: "proximos", texto: `Próximos (${cuenta("proximos")})` },
                { valor: "asistidos", texto: `Asistidos (${cuenta("asistidos")})` }, { valor: "cancelados", texto: `Cancelados (${cuenta("cancelados")})` },
            ]} />
            {visibles.length ? (
                <ul className="perfil-eventos">
                    {visibles.map((i) => (
                        <li key={i.id} className="perfil-evento">
                            <span className={`perfil-evento__fecha perfil-evento__fecha--${i.color}`}>
                                {i.fecha ? <><small>{i.fecha.dia}</small><strong>{i.fecha.numero}</strong><small>{i.fecha.mes}</small></>
                                    : <img src={calendarioColor[i.color]} alt="" />}
                            </span>
                            <div className="perfil-evento__textos">
                                <h3>{i.titulo}</h3>
                                <p>{i.detalle}</p>
                                <Chip color={textoInscripcion[i.estado].color}>{textoInscripcion[i.estado].texto}</Chip>
                            </div>
                            {i.estado === "confirmada" && <Link to="/eventos" className="perfil-boton perfil-boton--contorno">Ver mi inscripción</Link>}
                        </li>
                    ))}
                </ul>
            ) : <p className="perfil-vacio">No tienes eventos en este filtro.</p>}
            <div className="perfil-acciones">
                <Link to="/eventos" className="perfil-boton">Explorar más actividades <img src={flechaBlanca} alt="" /></Link>
                {!menor && <Link to="/mi-perfil/propuestas" className="perfil-boton perfil-boton--negro">Ver mis propuestas</Link>}
            </div>
            <NotaInfo>Datos de ejemplo.{menor && " Las actividades de menores requieren el consentimiento de la persona responsable."} Confirmar una inscripción no acredita la asistencia; esta la registra el personal.</NotaInfo>
        </>
    );
}

// ---------- Mis propuestas y Mis espacios (GET /mis-solicitudes) ----------
type CargaHistorial = { datos: HistorialSolicitudes } | { error: string } | null;
function useHistorial(): [CargaHistorial, () => void] {
    const [carga, setCarga] = useState<CargaHistorial>(sesionSimulada ? { datos: historialEjemplo } : null);
    const [intento, setIntento] = useState(0);
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        consultarMisSolicitudes()
            .then((datos) => { if (vigente) setCarga({ datos }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);
    return [carga, () => { setCarga(null); setIntento((x) => x + 1); }];
}

function EstadoCarga({ carga, alReintentar }: { carga: CargaHistorial; alReintentar: () => void }) {
    if (!carga) return <p className="perfil-vacio" role="status">Cargando…</p>;
    if ("error" in carga) return (
        <div className="perfil-vacio">
            <p role="alert">{carga.error}</p>
            <button type="button" className="perfil-boton perfil-boton--contorno" onClick={alReintentar}>Reintentar</button>
        </div>
    );
    return null;
}

type Fila = { id: string; titulo: string; detalle: string; estado: { texto: string; color: "dorado" | "guinda" | "gris" | "verde"; accion: string | null }; ruta: string };
function ListaSolicitudes({ filas, vacio }: { filas: Fila[]; vacio: string }) {
    if (!filas.length) return <p className="perfil-vacio">{vacio}</p>;
    return (
        <ul className="perfil-solicitudes">
            {filas.map((f) => (
                <li key={f.id} className="perfil-solicitud">
                    <span className="perfil-lista__icono"><img src={filaCalendario} alt="" /></span>
                    <div className="perfil-solicitud__textos"><strong>{f.titulo}</strong><span>{f.detalle}</span></div>
                    <Chip color={f.estado.color}>{f.estado.texto}</Chip>
                    {f.estado.accion && (
                        <Link to={f.ruta} className={`perfil-boton perfil-boton--chico${f.estado.color === "guinda" && f.estado.accion !== "Ver" ? "" : " perfil-boton--contorno"}`}>
                            {f.estado.accion}
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    );
}

export function MisPropuestas() {
    const [carga, reintentar] = useHistorial();
    const [filtro, setFiltro] = useState<GrupoFiltro | "todas">("todas");
    const propuestas = carga && "datos" in carga ? carga.datos.propuestas_eventos : [];
    const cuenta = contarPorGrupo(propuestas, (p) => estadoPropuesta[p.estadoRevision].grupo);
    const visibles = filtro === "todas" ? propuestas : propuestas.filter((p) => estadoPropuesta[p.estadoRevision].grupo === filtro);
    return (
        <>
            <EncabezadoSeccion sobretitulo="MIS PROPUESTAS" titulo="Mis propuestas" texto="Lo que has propuesto a la biblioteca y en qué estado va cada propuesta." />
            <Filtros actual={filtro} alElegir={setFiltro} opciones={[
                { valor: "todas", texto: `Todas (${propuestas.length})` }, { valor: "atencion", texto: `En atención (${cuenta.atencion})` },
                { valor: "observaciones", texto: `Con observaciones (${cuenta.observaciones})` }, { valor: "borradores", texto: `Borradores (${cuenta.borradores})` },
            ]} />
            <EstadoCarga carga={carga} alReintentar={reintentar} />
            {carga && "datos" in carga && (
                <ListaSolicitudes vacio="Aún no has propuesto actividades." filas={visibles.map((p) => ({
                    id: p.id, titulo: p.tituloPropuesta, estado: estadoPropuesta[p.estadoRevision],
                    detalle: p.estadoRevision === "borrador" ? `Borrador guardado el ${fechaCorta(p.creadaEn)}` : `Enviada el ${fechaCorta(p.creadaEn)}`,
                    ruta: "/proponer/" + p.id,
                }))} />
            )}
            <div className="perfil-acciones">
                <Link to="/proponer" className="perfil-boton">Proponer una actividad <img src={flechaBlanca} alt="" /></Link>
                <Link to="/mi-perfil/eventos" className="perfil-boton perfil-boton--negro">Ver mis eventos</Link>
            </div>
            <NotaInfo>Proponer no aprueba ni reserva</NotaInfo>
        </>
    );
}

// Mis espacios: GET /espacios/solicitudes (T-076), para tener el folio y abrir el detalle real.
type CargaEspacios = { solicitudes: SolicitudEspacioApi[] } | { error: string } | null;
export function MisEspacios() {
    const [carga, setCarga] = useState<CargaEspacios>(sesionSimulada ? { solicitudes: [] } : null);
    const [intento, setIntento] = useState(0);
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        listarMisSolicitudes()
            .then((datos) => { if (vigente) setCarga({ solicitudes: datos.solicitudes }); })
            .catch((e) => { if (vigente) setCarga({ error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [intento]);
    const reintentar = () => { setCarga(null); setIntento((x) => x + 1); };
    const [filtro, setFiltro] = useState<GrupoFiltro | "todas">("todas");
    const solicitudes = carga && "solicitudes" in carga ? carga.solicitudes : [];
    const cuenta = contarPorGrupo(solicitudes, (s) => estadoEspacio[s.estado].grupo);
    const visibles = filtro === "todas" ? solicitudes : solicitudes.filter((s) => estadoEspacio[s.estado].grupo === filtro);
    // EstadoCarga solo distingue cargando / error
    const estadoCarga: CargaHistorial = !carga ? null : "error" in carga ? carga : { datos: { solicitudes_espacio: [], propuestas_eventos: [] } };
    return (
        <>
            <EncabezadoSeccion sobretitulo="MIS ESPACIOS" titulo="Mis espacios"
                texto="Las solicitudes de espacio que has hecho y el estado de cada una. Una solicitud no es una reserva hasta que se aprueba." />
            <Filtros actual={filtro} alElegir={setFiltro} opciones={[
                { valor: "todas", texto: `Todas (${solicitudes.length})` }, { valor: "atencion", texto: `Pendientes (${cuenta.atencion})` },
                { valor: "observaciones", texto: `Con cambio propuesto (${cuenta.observaciones})` }, { valor: "canceladas", texto: `Canceladas (${cuenta.canceladas})` },
            ]} />
            <EstadoCarga carga={estadoCarga} alReintentar={reintentar} />
            {carga && "solicitudes" in carga && (
                <ListaSolicitudes vacio="Aún no has solicitado espacios." filas={visibles.map((s) => ({
                    id: s.folio, titulo: s.motivo,
                    // Todas se pueden abrir para ver el detalle, también las canceladas
                    estado: { ...estadoEspacio[s.estado], accion: estadoEspacio[s.estado].accion ?? "Ver" },
                    detalle: `${s.folio} · ${(s.acuerdo?.espacio ?? s.espacio)?.nombre ?? "Visita"} · Solicitada el ${fechaCorta(s.creadaEn)} · ${s.personas} personas`,
                    ruta: "/espacios/solicitud/" + encodeURIComponent(s.folio),
                }))} />
            )}
            <div className="perfil-acciones">
                <Link to="/espacios" className="perfil-boton">Solicitar un espacio <img src={flechaBlanca} alt="" /></Link>
                <Link to="/mi-perfil/propuestas" className="perfil-boton perfil-boton--negro">Ver mis propuestas</Link>
            </div>
            <NotaInfo>Solicitar no es reservar: el personal te responde en tus notificaciones.</NotaInfo>
        </>
    );
}

// ---------- Progreso y recompensas ----------
export function Progreso({ menor = false }: { menor?: boolean }) {
    const vigente = useTramite().estado === "vigente"; // sin credencial vigente, el progreso está bloqueado
    const asistencias = 3; // TODO backend: ver datos.ts
    const meta = siguienteMeta(asistencias);
    const textoNivel = { alcanzado: "Alcanzado", "en-progreso": "En progreso", pendiente: "Pendiente" };
    const colorNivel = { alcanzado: "verde", "en-progreso": "dorado", pendiente: "gris" } as const;
    return (
        <>
            <EncabezadoSeccion sobretitulo="PROGRESO Y RECOMPENSAS" titulo="Mi progreso y recompensas"
                texto={vigente ? (menor ? "Cada asistencia verificada acerca al siguiente nivel." : "Cada asistencia verificada te acerca al siguiente nivel.") : "Tu progreso se activa con una credencial validada y vigente."} />
            {vigente ? (
                <section className="perfil-progreso" aria-labelledby="titulo-asistencias">
                    <img className="perfil-progreso__circulo" src={progresoCirculo} alt="" />
                    <p id="titulo-asistencias" className="perfil-sobretitulo perfil-sobretitulo--claro">ASISTENCIAS VERIFICADAS</p>
                    <p className="perfil-progreso__cifra perfil-progreso__cifra--grande"><strong>{asistencias}</strong> de {meta} para el siguiente nivel</p>
                    <div className="perfil-progreso__barra" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={asistencias}
                        aria-label="Asistencias para el siguiente nivel"><span style={{ width: `${porcentajeProgreso(asistencias, meta)}%` }} /></div>
                    <p className="perfil-progreso__texto">
                        Cada asistencia verificada cuenta una sola vez. Inscribirte o confirmar tu lugar no suma hasta que el personal registre tu asistencia.
                    </p>
                </section>
            ) : (
                <section className="perfil-bloqueado">
                    <div className="perfil-tarjeta__cabecera">
                        <span className="perfil-tarjeta__icono perfil-tarjeta__icono--guinda"><img src={tarjetaCandado} alt="" /></span>
                        <h3>Tu progreso y tus recompensas se activan con una credencial validada y vigente</h3>
                    </div>
                    <p className="perfil-tarjeta__texto">
                        Puedes inscribirte y participar en actividades sin credencial, pero las asistencias anteriores a la validación no se acumulan. Consulta el estado de tu trámite.
                    </p>
                    <div className="perfil-acciones"><Link to="/mi-perfil/credencial" className="perfil-boton perfil-boton--guinda">Ver mi trámite de credencial</Link></div>
                </section>
            )}
            <ul className="perfil-niveles">
                {nivelesEjemplo.map((n, i) => {
                    const estado = estadoNivel(n, asistencias);
                    return (
                        <li key={n} className={`perfil-nivel perfil-nivel--${["verde", "dorado", "blanco"][i]}`}>
                            <p>NIVEL {i + 1}</p>
                            <strong>{n} asistencias</strong>
                            {vigente ? <Chip color={colorNivel[estado]}>{textoNivel[estado]}</Chip>
                                : <span className="perfil-chip perfil-chip--gris"><img src={chipCandado} alt="" />Bloqueado</span>}
                        </li>
                    );
                })}
            </ul>
            <section className="perfil-recompensas">
                <div className="perfil-tarjeta__cabecera">
                    <span className="perfil-tarjeta__icono perfil-tarjeta__icono--rosa"><img src={tarjetaEstrella} alt="" /></span>
                    <h3>Mis recompensas</h3>
                </div>
                <ul>
                    {nivelesEjemplo.map((n, i) => {
                        const disponible = vigente && asistencias >= n;
                        return (
                            <li key={n}>
                                <div>
                                    <strong>{i === 0 ? "Reconocimiento de participación · Nivel 1" : `Recompensa · Nivel ${i + 1}`}</strong>
                                    <span>{disponible ? "Alcanzado. Entrega por confirmar con la biblioteca." : `Se habilita al llegar a ${n} asistencias verificadas.`}</span>
                                </div>
                                <Chip color={disponible ? "verde" : "gris"}>{disponible ? "Disponible" : "Bloqueada"}</Chip>
                            </li>
                        );
                    })}
                </ul>
            </section>
            <NotaInfo>
                Las recompensas dependen de su disponibilidad y de que tu credencial siga vigente. El personal registra la entrega; no se garantiza un premio. Niveles y metas de ejemplo; la biblioteca los definirá.
            </NotaInfo>
        </>
    );
}

// ---------- Avisos (preferencias) ----------
function FilaPreferencia({ p, alAlternar }: { p: Preferencia; alAlternar: () => void }) {
    const estado = p.fijo ? "Siempre activo" : p.activo ? "Activado" : "Desactivado";
    return (
        <li className="perfil-preferencia">
            <div className="perfil-preferencia__textos"><strong>{p.titulo}</strong>{p.texto && <span>{p.texto}</span>}</div>
            {p.proximamente && <span className="perfil-etiqueta-pronto">En desarrollo · Próximamente</span>}
            <button type="button" role="switch" aria-checked={p.activo} aria-label={p.titulo} className="perfil-interruptor"
                disabled={p.fijo || p.proximamente} onClick={alAlternar}>
                <img src={p.activo ? interruptorEncendido : interruptorApagado} alt="" />
            </button>
            <span className={`perfil-preferencia__estado${p.activo ? "" : " perfil-preferencia__estado--apagado"}`}>{estado}</span>
        </li>
    );
}

export function Avisos() {
    const [prefs, setPrefs] = useState(consultarPreferencias);
    const [guardado, setGuardado] = useState(false);
    const pendientes = sinLeer(useNotificaciones());
    return (
        <>
            <EncabezadoSeccion sobretitulo="AVISOS" titulo="Preferencias de avisos" texto="Elige cómo quieres enterarte de lo que ocurre en la biblioteca." />
            <TarjetaPerfil color="verde" icono={tarjetaEnviar} titulo="Canales" texto="Elige cómo quieres enterarte de lo que ocurre en la biblioteca.">
                <ul className="perfil-preferencias">
                    {prefs.canales.map((p) => <FilaPreferencia key={p.clave} p={p}
                        alAlternar={() => { setGuardado(false); setPrefs((x) => ({ ...x, canales: alternar(x.canales, p.clave) })); }} />)}
                </ul>
            </TarjetaPerfil>
            <TarjetaPerfil color="dorada" icono={tarjetaCampana} titulo="Tipos de aviso">
                <ul className="perfil-preferencias">
                    {prefs.tipos.map((p) => <FilaPreferencia key={p.clave} p={p}
                        alAlternar={() => { setGuardado(false); setPrefs((x) => ({ ...x, tipos: alternar(x.tipos, p.clave) })); }} />)}
                </ul>
            </TarjetaPerfil>
            <div className="perfil-nota perfil-nota--guinda">
                <img src={alertaGuinda} alt="" />
                <p><strong>Importante</strong>Los cambios o cancelaciones de actividades en las que estás inscrito se envían siempre.</p>
            </div>
            {guardado && <p className="perfil-exito" role="status">Tus preferencias se guardaron.</p>}
            <div className="perfil-acciones">
                <button type="button" className="perfil-boton" onClick={() => { guardarPreferencias(prefs); setGuardado(true); }}>Guardar preferencias</button>
                <button type="button" className="perfil-boton perfil-boton--contorno" onClick={() => { setPrefs(consultarPreferencias()); setGuardado(false); }}>Cancelar</button>
            </div>
            <TarjetaPerfil color="blanca" icono={tarjetaCampana} titulo="Mis notificaciones"
                texto={pendientes ? `Tienes ${pendientes} notificaciones sin leer (ejemplo).` : "Estás al día con tus notificaciones."}>
                <div className="perfil-acciones"><Link to="/notificaciones" className="perfil-boton perfil-boton--contorno perfil-boton--chico">Ver mis notificaciones</Link></div>
            </TarjetaPerfil>
        </>
    );
}

// ---------- Seguridad ----------
export function Seguridad({ perfil, menor = false, alCerrarSesion }: { perfil: PerfilPropio; menor?: boolean; alCerrarSesion: () => void }) {
    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [errores, setErrores] = useState<{ actual?: string; nueva?: string }>({});
    const [error, setError] = useState("");
    const [exito, setExito] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    async function cambiar(e: FormEvent) {
        e.preventDefault();
        if (bloqueo.current) return;
        setError(""); setExito(false);
        const encontrados = validarCambioContrasena(actual, nueva);
        setErrores(encontrados);
        if (encontrados.actual || encontrados.nueva) { document.getElementById(encontrados.actual ? "seg-actual" : "seg-nueva")?.focus(); return; }
        bloqueo.current = true; setGuardando(true);
        try {
            if (!sesionSimulada) await cambiarContrasena(perfil.correo, actual, nueva);
            setActual(""); setNueva(""); setExito(true);
        } catch (err) { setError(mensajeError(err)); }
        finally { bloqueo.current = false; setGuardando(false); }
    }
    return (
        <>
            <EncabezadoSeccion sobretitulo="SEGURIDAD" titulo="Seguridad de mi cuenta"
                texto={menor ? "Protege la cuenta y cierra la sesión al terminar." : "Protege tu cuenta y cierra tu sesión cuando termines."} />
            <TarjetaPerfil color="verde" icono={tarjetaCandado} titulo="Contraseña" texto="Cámbiala si crees que otra persona la conoce.">
                <form className="perfil-formulario" onSubmit={cambiar} noValidate>
                    <fieldset disabled={guardando}>
                        <div className="perfil-fila">
                            <div className="perfil-campo">
                                <label htmlFor="seg-actual">Contraseña actual</label>
                                <input id="seg-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password"
                                    placeholder="••••••••" aria-invalid={errores.actual ? true : undefined} aria-describedby={errores.actual ? "seg-actual-error" : undefined} />
                                {errores.actual && <p id="seg-actual-error" className="perfil-campo__error">{errores.actual}</p>}
                            </div>
                            <div className="perfil-campo">
                                <label htmlFor="seg-nueva">Nueva contraseña</label>
                                <input id="seg-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" maxLength={128}
                                    placeholder="Mínimo 8 caracteres" aria-invalid={errores.nueva ? true : undefined}
                                    aria-describedby={`seg-nueva-ayuda${errores.nueva ? " seg-nueva-error" : ""}`} />
                                {errores.nueva && <p id="seg-nueva-error" className="perfil-campo__error">{errores.nueva}</p>}
                                <p id="seg-nueva-ayuda" className="perfil-campo__ayuda">Al cambiarla se revocan las sesiones previas.</p>
                            </div>
                        </div>
                    </fieldset>
                    {error && <p className="perfil-error" role="alert">{error}</p>}
                    {exito && <p className="perfil-exito" role="status">Tu contraseña se cambió. Cerramos tus otras sesiones.</p>}
                    <div className="perfil-acciones">
                        <button type="submit" className="perfil-boton" disabled={guardando}>{guardando ? "Cambiando…" : "Cambiar contraseña"}</button>
                    </div>
                </form>
            </TarjetaPerfil>
            <section className="perfil-tarjeta perfil-tarjeta--rosa">
                <div className="perfil-tarjeta__cabecera">
                    <span className="perfil-tarjeta__icono perfil-tarjeta__icono--rosa"><img src={tarjetaGlobo} alt="" /></span>
                    <div>
                        <h3>Sesión actual</h3>
                        <p>Cuando termines, cierra tu sesión para proteger tu cuenta, sobre todo si usas un equipo compartido.</p>
                    </div>
                </div>
                <div className="perfil-sesion">
                    <div><strong>Este navegador</strong><span>Sesión iniciada</span></div>
                    <Chip color="verde">Activa</Chip>
                </div>
                <div className="perfil-acciones">
                    <button type="button" className="perfil-boton perfil-boton--contorno" onClick={alCerrarSesion}>Cerrar sesión</button>
                </div>
            </section>
        </>
    );
}

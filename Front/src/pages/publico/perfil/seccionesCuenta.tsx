import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import type { PerfilPropio } from "../../../servicios/perfil";
import { mensajeError } from "../../../servicios/api";
import { EncabezadoSeccion, EtiquetaPerfil, TarjetaPerfil } from "./piezas";
import { iconosSeccion } from "./iconos";
import { sesionSimulada } from "./usarSesion";
import {
    estadoNivel,
    nivelesEjemplo, nombreCompleto, porcentajeProgreso, siguienteMeta, validarCambioContrasena,
} from "./datos";
import {
    consultarMisSolicitudes, contarPorGrupo, estadoEspacio, estadoPropuesta, fechaCorta, historialEjemplo,
    type GrupoFiltro, type HistorialSolicitudes,
} from "./solicitudes";
import { cambiarContrasena } from "./seguridad";
import { listarMisSolicitudes, type SolicitudEspacioApi } from "../../../servicios/espacios";
import { estadosCredencial, etapasCredencial, useTramite, verEjemplo } from "../credencial/datos";
import { Chip, EstadoCredencial, EtapasTramite, SelectorEstados } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import tarjetaCandado from "../../../assets/perfil/tarjeta-candado.svg";
import filaCalendario from "../../../assets/perfil/fila-calendario-verde.svg";
import progresoCirculo from "../../../assets/perfil/progreso-circulo.svg";

import { EsqueletoLista } from "../../../components/portal/Esqueleto";
function NotaInfo({ children }: { children: ReactNode }) {
    return <div className="perfil-nota"><img src={notaInfo} alt="" /><p>{children}</p></div>;
}

function Filtros<T extends string>({ opciones, actual, alElegir }: { opciones: { valor: T; texto: string }[]; actual: T; alElegir: (v: T) => void }) {
    return (
        <div className="perfil-filtros" role="group" aria-label="Filtrar">
            {opciones.map((o) => {
                const partes = o.texto.match(/^(.*?)(?: \((\d+)\))?$/);
                const texto = partes?.[1] ?? o.texto;
                const cuenta = partes?.[2];
                return (
                    <button key={o.valor} type="button" aria-pressed={actual === o.valor}
                        className={`perfil-filtro${actual === o.valor ? " perfil-filtro--activo" : ""}`} onClick={() => alElegir(o.valor)}>
                        {texto}{cuenta !== undefined && <span className="perfil-filtro__cuenta">{cuenta}</span>}
                    </button>
                );
            })}
        </div>
    );
}

// ---------- Mi credencial ----------
// Un bloque por estado: a la izquierda la credencial (o su lugar mientras no existe) y a la derecha qué pasa y qué hacer.
// Abajo, los cuatro pasos del trámite con el paso actual marcado. Con ?simular=sesion se pueden ver todos los estados.
export function MiCredencialPerfil({ perfil, menor = false }: { perfil: PerfilPropio; menor?: boolean }) {
    const tramite = useTramite(); // GET /mis-solicitudes
    const datos = estadosCredencial[tramite.estado];
    return (
        <>
            <EncabezadoSeccion titulo="Mi credencial"
                texto={menor ? "Consulta el estado de la credencial y da seguimiento a la solicitud." : "Consulta el estado de tu credencial y da seguimiento a tu solicitud."} />
            {sesionSimulada && <SelectorEstados actual={tramite.estado} alElegir={verEjemplo} />}
            <EstadoCredencial datos={datos} titular={nombreCompleto(perfil)} tramite={tramite}>
                <div className="perfil-acciones">
                    <Link to={datos.accion.ruta} className="perfil-boton">{datos.accion.texto}</Link>
                    {tramite.estado !== "sin-solicitud" && datos.accion.ruta !== "/credencial/seguimiento" && (
                        <Link to="/credencial/seguimiento" className="perfil-boton perfil-boton--contorno">Ver seguimiento</Link>
                    )}
                </div>
            </EstadoCredencial>
            <TarjetaPerfil color="blanca" icono={tarjetaLista} titulo="Cómo avanza tu trámite" texto="Los cuatro pasos para tener tu credencial.">
                <EtapasTramite etapas={etapasCredencial(datos.paso)} />
            </TarjetaPerfil>
            <NotaInfo>La credencial la valida el personal de la biblioteca en un cotejo presencial; solicitarla en línea no la valida.</NotaInfo>
            {menor && (
                <div className="perfil-nota perfil-nota--dorada">
                    <img src={notaInfoDorada} alt="" />
                    <p><strong>Consentimiento de la persona responsable</strong>La credencial de menores requiere el consentimiento de una persona responsable.</p>
                </div>
            )}
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
    if (!carga) return <EsqueletoLista filas={3} />;
    if ("error" in carga) return (
        <div className="perfil-vacio">
            <p role="alert">{carga.error}</p>
            <button type="button" className="perfil-boton perfil-boton--contorno" onClick={alReintentar}>Reintentar</button>
        </div>
    );
    return null;
}

type Fila = { id: string; titulo: string; detalle: string; estado: { texto: string; color: "dorado" | "guinda" | "gris" | "verde"; accion: string | null }; ruta: string };
function ListaSolicitudes({ filas, vacio, vacioTexto, vacioAccion }: { filas: Fila[]; vacio: string; vacioTexto?: string; vacioAccion?: ReactNode }) {
    if (!filas.length) return (
        <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
            <span className="perfil-vacio__insignia" aria-hidden="true" />
            <p><strong>{vacio}</strong>{vacioTexto}</p>
            {vacioAccion}
        </div>
    );
    return (
        <ul className="perfil-solicitudes">
            {filas.map((f) => (
                <li key={f.id} className={`perfil-solicitud perfil-solicitud--${f.estado.color}`}>
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
            <EncabezadoSeccion titulo="Mis propuestas" texto="Lo que has propuesto a la biblioteca y en qué estado va cada propuesta."
                accion={<Link to="/proponer" className="perfil-boton">Proponer una actividad</Link>} />
            <section className="perfil-panel" aria-label="Lista de propuestas">
            <Filtros actual={filtro} alElegir={setFiltro} opciones={[
                { valor: "todas", texto: `Todas (${propuestas.length})` }, { valor: "atencion", texto: `En atención (${cuenta.atencion})` },
                { valor: "observaciones", texto: `Con observaciones (${cuenta.observaciones})` }, { valor: "borradores", texto: `Borradores (${cuenta.borradores})` },
            ]} />
            <EstadoCarga carga={carga} alReintentar={reintentar} />
            {carga && "datos" in carga && (
                <ListaSolicitudes vacio={filtro === "todas" ? "Aún no has propuesto actividades" : "No hay propuestas en este grupo"}
                    vacioTexto="Propón un taller, un club o una charla; el personal la revisa y te responde aquí."
                    vacioAccion={filtro === "todas" ? <Link to="/proponer" className="perfil-boton">Proponer una actividad</Link> : undefined}
                    filas={visibles.map((p) => ({
                    id: p.id, titulo: p.tituloPropuesta, estado: estadoPropuesta[p.estadoRevision],
                    detalle: p.estadoRevision === "borrador" ? `Borrador guardado el ${fechaCorta(p.creadaEn)}` : `Enviada el ${fechaCorta(p.creadaEn)}`,
                    ruta: "/proponer/" + p.id,
                }))} />
            )}
            </section>
            <div className="perfil-acciones"><Link to="/mis-actividades/cambios" className="perfil-boton perfil-boton--contorno">Cambios y cancelaciones de mis actividades</Link></div>
            <NotaInfo>Proponer no aprueba ni reserva: el personal revisa cada propuesta y te avisa en tus notificaciones.</NotaInfo>
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
            <EncabezadoSeccion titulo="Mis espacios" texto="Las solicitudes de espacio que has hecho y el estado de cada una."
                accion={<Link to="/espacios" className="perfil-boton">Solicitar un espacio</Link>} />
            <section className="perfil-panel" aria-label="Lista de solicitudes de espacio">
            <Filtros actual={filtro} alElegir={setFiltro} opciones={[
                { valor: "todas", texto: `Todas (${solicitudes.length})` }, { valor: "atencion", texto: `Pendientes (${cuenta.atencion})` },
                { valor: "observaciones", texto: `Con cambio propuesto (${cuenta.observaciones})` }, { valor: "canceladas", texto: `Canceladas (${cuenta.canceladas})` },
            ]} />
            <EstadoCarga carga={estadoCarga} alReintentar={reintentar} />
            {carga && "solicitudes" in carga && (
                <ListaSolicitudes vacio={filtro === "todas" ? "Aún no has solicitado espacios" : "No hay solicitudes en este grupo"}
                    vacioTexto="Pide una sala o un módulo para tu actividad; el personal revisa la fecha y te responde aquí."
                    vacioAccion={filtro === "todas" ? <Link to="/espacios" className="perfil-boton">Solicitar un espacio</Link> : undefined}
                    filas={visibles.map((s) => ({
                    id: s.folio, titulo: s.motivo,
                    // Todas se pueden abrir para ver el detalle, también las canceladas
                    estado: { ...estadoEspacio[s.estado], accion: estadoEspacio[s.estado].accion ?? "Ver" },
                    detalle: `${s.folio} · ${(s.acuerdo?.espacio ?? s.espacio)?.nombre ?? "Visita"} · Solicitada el ${fechaCorta(s.creadaEn)} · ${s.personas} personas`,
                    ruta: "/espacios/solicitud/" + encodeURIComponent(s.folio),
                }))} />
            )}
            </section>
            <NotaInfo>Solicitar no es reservar: una solicitud se vuelve reserva hasta que el personal la aprueba, y te avisa en tus notificaciones.</NotaInfo>
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
            <EncabezadoSeccion titulo="Mi progreso y recompensas"
                texto={vigente ? (menor ? "Cada asistencia verificada acerca al siguiente nivel." : "Cada asistencia verificada te acerca al siguiente nivel.") : "Tu progreso se activa con una credencial validada y vigente."}
                accion={<Link to="/eventos" className="perfil-boton perfil-boton--contorno">Ver actividades</Link>} />
            {vigente ? (
                <section className="perfil-progreso" aria-labelledby="titulo-asistencias">
                    <img className="perfil-progreso__circulo" src={progresoCirculo} alt="" />
                    <EtiquetaPerfil id="titulo-asistencias" icono={iconosSeccion.progreso} claro>Asistencias verificadas</EtiquetaPerfil>
                    <p className="perfil-progreso__cifra perfil-progreso__cifra--grande"><strong>{asistencias}</strong> de {meta} para el siguiente nivel</p>
                    <div className="perfil-progreso__barra" role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={asistencias}
                        aria-label="Asistencias para el siguiente nivel"><span style={{ width: `${porcentajeProgreso(asistencias, meta)}%` }} /></div>
                    <p className="perfil-progreso__texto">
                        Cada asistencia verificada cuenta una sola vez. Inscribirte o confirmar tu lugar no suma hasta que el personal registre tu asistencia.
                    </p>
                </section>
            ) : (
                <TarjetaPerfil color="rosa" icono={tarjetaCandado} titulo="Tu progreso se activa con tu credencial"
                    texto="Puedes participar sin credencial, pero las asistencias anteriores a la validación no se acumulan.">
                    <div className="perfil-acciones"><Link to="/mi-perfil/credencial" className="perfil-boton perfil-boton--guinda">Ver mi trámite de credencial</Link></div>
                </TarjetaPerfil>
            )}
            <TarjetaPerfil color="dorada" icono={tarjetaEstrella} titulo="Niveles" texto="Cada nivel se alcanza con asistencias verificadas por el personal.">
                <ol className="perfil-niveles perfil-niveles--ruta">
                    {nivelesEjemplo.map((n, i) => {
                        const estado = vigente ? estadoNivel(n, asistencias) : "pendiente";
                        return (
                            <li key={n} className={`perfil-nivel perfil-nivel--${vigente ? colorNivel[estado] : "bloqueado"}`}>
                                <span className="perfil-nivel__numero" aria-hidden="true">{i + 1}</span>
                                <p>Nivel {i + 1}</p>
                                <strong>{n} asistencias</strong>
                                {vigente ? <Chip color={colorNivel[estado]}>{textoNivel[estado]}</Chip> : <Chip color="gris">Bloqueado</Chip>}
                            </li>
                        );
                    })}
                </ol>
            </TarjetaPerfil>
            <section className="perfil-panel" aria-labelledby="titulo-recompensas">
                <EtiquetaPerfil id="titulo-recompensas" icono={iconosSeccion.progreso}>Mis recompensas</EtiquetaPerfil>
                <ul className="perfil-solicitudes">
                    {nivelesEjemplo.map((n, i) => {
                        const disponible = vigente && asistencias >= n;
                        return (
                            <li key={n} className={`perfil-solicitud perfil-solicitud--${disponible ? "verde" : "gris"}`}>
                                <span className="perfil-lista__icono"><img src={iconosSeccion.progreso} alt="" /></span>
                                <div className="perfil-solicitud__textos">
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

export { default as Avisos } from "./Avisos";

// ---------- Seguridad ----------
export function Seguridad({ perfil, menor = false, alCerrarSesion }: { perfil: PerfilPropio; menor?: boolean; alCerrarSesion: () => void }) {
    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");
    const [errores, setErrores] = useState<{ actual?: string; nueva?: string }>({});
    const [error, setError] = useState("");
    const [exito, setExito] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    // Requisitos de la nueva contraseña, en vivo
    const requisitos = [
        { texto: "Mínimo 8 caracteres", ok: nueva.length >= 8 },
        { texto: "Distinta a la actual", ok: nueva.length > 0 && nueva !== actual },
        { texto: "Con letras y números", ok: /[a-záéíóúñ]/i.test(nueva) && /\d/.test(nueva) },
    ];
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
    const candado = { "--icono": `url("${iconosSeccion.seguridad}")` } as CSSProperties;
    return (
        <>
            <EncabezadoSeccion titulo="Seguridad de mi cuenta"
                texto={menor ? "Protege la cuenta y cierra la sesión al terminar." : "Protege tu cuenta y cierra tu sesión cuando termines."} />
            <TarjetaPerfil color="verde" icono={tarjetaCandado} titulo="Cambiar contraseña" texto="Cámbiala si crees que otra persona la conoce. Al cambiarla se cierran tus otras sesiones.">
                <form className="perfil-seguridad__formulario" onSubmit={cambiar} noValidate>
                    <fieldset disabled={guardando}>
                        <div className="perfil-fila">
                            <div className="perfil-campo">
                                <label htmlFor="seg-actual" className="perfil-campo__etiqueta--icono" style={candado}>Contraseña actual</label>
                                <input id="seg-actual" type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password"
                                    placeholder="Tu contraseña de ahora" aria-invalid={errores.actual ? true : undefined} aria-describedby={errores.actual ? "seg-actual-error" : undefined} />
                                {errores.actual && <p id="seg-actual-error" className="perfil-campo__error">{errores.actual}</p>}
                            </div>
                            <div className="perfil-campo">
                                <label htmlFor="seg-nueva" className="perfil-campo__etiqueta--icono" style={candado}>Nueva contraseña</label>
                                <input id="seg-nueva" type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" maxLength={128}
                                    placeholder="Mínimo 8 caracteres" aria-invalid={errores.nueva ? true : undefined}
                                    aria-describedby={`seg-nueva-requisitos${errores.nueva ? " seg-nueva-error" : ""}`} />
                                {errores.nueva && <p id="seg-nueva-error" className="perfil-campo__error">{errores.nueva}</p>}
                            </div>
                        </div>
                        <ul id="seg-nueva-requisitos" className="perfil-requisitos" aria-label="Requisitos de la nueva contraseña">
                            {requisitos.map((r) => <li key={r.texto} className={r.ok ? "perfil-requisitos__ok" : undefined}>{r.texto}</li>)}
                        </ul>
                    </fieldset>
                    {error && <p className="perfil-error" role="alert">{error}</p>}
                    {exito && <p className="perfil-exito" role="status">Tu contraseña se cambió. Cerramos tus otras sesiones.</p>}
                    <div className="perfil-acciones">
                        <button type="submit" className="perfil-boton perfil-boton--guardar" disabled={guardando}>{guardando ? "Cambiando…" : "Cambiar contraseña"}</button>
                    </div>
                </form>
            </TarjetaPerfil>
            <section className="perfil-panel" aria-labelledby="titulo-sesiones">
                <EtiquetaPerfil id="titulo-sesiones" icono={iconosSeccion.seguridad}>Sesión actual</EtiquetaPerfil>
                <ul className="perfil-solicitudes">
                    <li className="perfil-solicitud perfil-solicitud--verde">
                        <span className="perfil-lista__icono"><img src={iconosSeccion.seguridad} alt="" /></span>
                        <div className="perfil-solicitud__textos"><strong>Este navegador</strong><span>Sesión iniciada como {perfil.correo}</span></div>
                        <Chip color="verde">Activa</Chip>
                        <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--guinda" onClick={alCerrarSesion}>Cerrar sesión</button>
                    </li>
                </ul>
            </section>
            <div className="perfil-protegidos">
                <span className="perfil-protegidos__icono"><img src={tarjetaCandado} alt="" /></span>
                <div>
                    <strong>Consejos para proteger tu cuenta</strong>
                    <p>No compartas tu contraseña, usa una distinta a la de tu correo y cierra tu sesión en equipos públicos. El personal de la biblioteca nunca te la pedirá.</p>
                </div>
            </div>
        </>
    );
}

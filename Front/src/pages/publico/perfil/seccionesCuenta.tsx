import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import type { PerfilPropio } from "../../../servicios/perfil";
import { mensajeError } from "../../../servicios/api";
import { EncabezadoSeccion, EtiquetaPerfil, TarjetaPerfil } from "./piezas";
import { iconosSeccion } from "./iconos";
import { sesionSimulada } from "./usarSesion";
import { nombreCompleto, validarCambioContrasena } from "./datos";
import { avanceNivel, consultarMiProgreso, NIVELES, nombreNivel, siguienteNivel, type MiProgreso } from "../../../servicios/progreso";
import {
    consultarMisSolicitudes, contarPorGrupo, estadoEspacio, estadoPropuesta, fechaCorta, historialEjemplo,
    type GrupoFiltro, type HistorialSolicitudes,
} from "./solicitudes";
import { cambiarContrasena } from "./seguridad";
import { listarMisSolicitudes, type SolicitudEspacioApi } from "../../../servicios/espacios";
import { estadosCredencial, etapasCredencial, useSeguimientoTramite, verEjemplo } from "../credencial/datos";
import { Chip, EstadoCredencial, EtapasTramite, SelectorEstados } from "../credencial/piezas";
import "../credencial/CredencialSesion.css";
import notaInfo from "../../../assets/perfil/nota-info.svg";
import notaInfoDorada from "../../../assets/perfil/nota-info-dorada.svg";
import tarjetaLista from "../../../assets/perfil/tarjeta-lista.svg";
import tarjetaEstrella from "../../../assets/perfil/tarjeta-estrella.svg";
import tarjetaCandado from "../../../assets/perfil/tarjeta-candado.svg";
import progresoCirculo from "../../../assets/perfil/progreso-circulo.svg";

import { GaleriaInsignias } from "../../../components/portal/Insignias";
import { insigniasDe } from "../../../servicios/insignias"; // TODO backend: GET /v1/me/insignias
import { FilaPerfil, ListaPerfil } from "./ListaPerfil";
import { coincide, diaMes } from "./utilesLista";
import { EsqueletoDetalle } from "../../../components/portal/Esqueleto";
function NotaInfo({ children }: { children: ReactNode }) {
    return <div className="perfil-nota"><img src={notaInfo} alt="" /><p>{children}</p></div>;
}

// ---------- Mi credencial ----------
// Un bloque por estado: a la izquierda la credencial (o su lugar mientras no existe) y a la derecha qué pasa y qué hacer.
// Abajo, los cuatro pasos del trámite con el paso actual marcado. Con ?simular=sesion se pueden ver todos los estados.
export function MiCredencialPerfil({ perfil, menor = false }: { perfil: PerfilPropio; menor?: boolean }) {
    const { tramite, listo, error, reintentar } = useSeguimientoTramite();
    const datos = estadosCredencial[tramite.estado];
    return (
        <>
            <EncabezadoSeccion titulo="Mi credencial"
                texto={menor ? "Consulta el estado de la credencial y da seguimiento a la solicitud." : "Consulta el estado de tu credencial y da seguimiento a tu solicitud."}
                accion={!sesionSimulada ? <Link to="/mis-tramites/credencial" className="perfil-boton perfil-boton--contorno">Ver historial de solicitudes</Link> : undefined} />
            {error ? <div className="perfil-vacio perfil-vacio--eventos" role="alert">
                <span className="perfil-vacio__insignia" aria-hidden="true" />
                <p><strong>No pudimos cargar tu credencial</strong>{error}</p>
                <button type="button" className="perfil-boton" onClick={reintentar}>Reintentar</button>
            </div> : !listo ? <EsqueletoDetalle texto="Cargando tu credencial…" /> : <>
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
            </>}
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

// Filtro de estado de las dos listas: «todas» o un grupo
type FiltroGrupo = GrupoFiltro | "todas";
const opcionesGrupo = (lista: [FiltroGrupo, string][], cuenta: Record<GrupoFiltro, number>, total: number) =>
    lista.map(([valor, texto]) => ({ valor, texto, cantidad: valor === "todas" ? total : cuenta[valor] }));

export function MisPropuestas() {
    const [carga, reintentar] = useHistorial();
    const [filtro, setFiltro] = useState<FiltroGrupo>("todas");
    const [texto, setTexto] = useState("");
    const propuestas = carga && "datos" in carga ? carga.datos.propuestas_eventos : [];
    const cuenta = contarPorGrupo(propuestas, (p) => estadoPropuesta[p.estadoRevision].grupo);
    const filtradas = propuestas.filter((p) => (filtro === "todas" || estadoPropuesta[p.estadoRevision].grupo === filtro)
        && coincide(texto, p.tituloPropuesta, p.tipoPropuesta, estadoPropuesta[p.estadoRevision].texto));
    const visibles = filtradas;
    return (
        <>
            <EncabezadoSeccion titulo="Mis propuestas" texto="Lo que has propuesto a la biblioteca y en qué estado va cada propuesta."
                accion={<Link to="/proponer" className="perfil-boton">Proponer una actividad</Link>} />
            <ListaPerfil icono="propuesta" titulo="Tus propuestas" texto="Ábrelas para ver su revisión o corregirlas"
                buscar={{ etiqueta: "Buscar una propuesta", placeholder: "Nombre o tipo de actividad", valor: texto, alCambiar: (v) => { setTexto(v); } }}
                filtros={[{
                    titulo: "Estado", valor: filtro, alCambiar: (v) => { setFiltro(v as FiltroGrupo); },
                    opciones: opcionesGrupo([["todas", "Todas"], ["atencion", "En revisión"], ["aceptadas", "Aceptadas"], ["observaciones", "Con observaciones"], ["borradores", "Borradores"]], cuenta, propuestas.length),
                }]}
                activos={filtro === "todas" ? 0 : 1} alQuitar={() => { setFiltro("todas"); }}
                estado={!carga ? "cargando" : "error" in carga ? "error" : "listo"} error={carga && "error" in carga ? carga.error : undefined} alReintentar={reintentar}
                hayElementos={propuestas.length > 0} sinResultados={filtradas.length === 0}
                vacio={{ titulo: "Aún no has propuesto actividades", texto: "Propón un taller, un club o una charla; el personal la revisa y te responde aquí.",
                    accion: <Link to="/proponer" className="pz-boton pz-boton--chico">Proponer una actividad</Link> }}>
                {visibles.map((p) => {
                    const e = estadoPropuesta[p.estadoRevision];
                    const borrador = p.estadoRevision === "borrador";
                    return <FilaPerfil key={p.id} icono="propuesta" tono={e.color} titulo={p.tituloPropuesta} estado={e.texto}
                        apagada={p.estadoRevision === "cancelada"}
                        detalle={<><span>{borrador ? `Borrador guardado el ${fechaCorta(p.creadaEn)}` : `Enviada el ${fechaCorta(p.creadaEn)}`}</span>{p.tipoPropuesta && <span className="perfil-mayuscula">{p.tipoPropuesta}</span>}</>}
                        acciones={e.accion && <Link to={"/proponer/" + p.id} className={`pz-boton pz-boton--chico${e.color === "guinda" && e.accion !== "Ver" ? "" : " pz-boton--contorno"}`}>{e.accion}</Link>} />;
                })}
            </ListaPerfil>
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
    const [filtro, setFiltro] = useState<FiltroGrupo>("todas");
    const [texto, setTexto] = useState("");
    const solicitudes = carga && "solicitudes" in carga ? carga.solicitudes : [];
    const cuenta = contarPorGrupo(solicitudes, (s) => estadoEspacio[s.estado].grupo);
    const lugar = (s: SolicitudEspacioApi) => (s.acuerdo?.espacio ?? s.espacio)?.nombre ?? "Visita";
    const filtradas = solicitudes.filter((s) => (filtro === "todas" || estadoEspacio[s.estado].grupo === filtro)
        && coincide(texto, s.motivo, s.folio, lugar(s), estadoEspacio[s.estado].texto));
    const visibles = filtradas;
    return (
        <>
            <EncabezadoSeccion titulo="Mis espacios" texto="Las solicitudes de espacio que has hecho y el estado de cada una."
                accion={<Link to="/espacios" className="perfil-boton">Solicitar un espacio</Link>} />
            <ListaPerfil icono="espacios" conFecha titulo="Tus solicitudes" texto="Todas se pueden abrir para ver su detalle"
                buscar={{ etiqueta: "Buscar una solicitud", placeholder: "Motivo, espacio o folio", valor: texto, alCambiar: (v) => { setTexto(v); } }}
                filtros={[{
                    titulo: "Estado", valor: filtro, alCambiar: (v) => { setFiltro(v as FiltroGrupo); },
                    opciones: opcionesGrupo([["todas", "Todas"], ["atencion", "Pendientes"], ["observaciones", "Con cambio propuesto"], ["canceladas", "Canceladas"]], cuenta, solicitudes.length),
                }]}
                activos={filtro === "todas" ? 0 : 1} alQuitar={() => { setFiltro("todas"); }}
                estado={!carga ? "cargando" : "error" in carga ? "error" : "listo"} error={carga && "error" in carga ? carga.error : undefined} alReintentar={reintentar}
                hayElementos={solicitudes.length > 0} sinResultados={filtradas.length === 0}
                vacio={{ titulo: "Aún no has solicitado espacios", texto: "Pide una sala o un módulo para tu actividad; el personal revisa la fecha y te responde aquí.",
                    accion: <Link to="/espacios" className="pz-boton pz-boton--chico">Solicitar un espacio</Link> }}>
                {visibles.map((s) => {
                    const e = estadoEspacio[s.estado];
                    return <FilaPerfil key={s.folio} fecha={diaMes(s.inicio)} tono={e.color} titulo={s.motivo} estado={e.texto}
                        apagada={e.grupo === "canceladas"}
                        detalle={<><span className="pz-fila__folio">{s.folio}</span><span>{lugar(s)}</span><span>{s.personas} personas</span><span>Solicitada el {fechaCorta(s.creadaEn)}</span></>}
                        acciones={<Link to={"/espacios/solicitud/" + encodeURIComponent(s.folio)}
                            className={`pz-boton pz-boton--chico${e.color === "guinda" ? "" : " pz-boton--contorno"}`}>{e.accion ?? "Ver"}</Link>} />;
                })}
            </ListaPerfil>
            <NotaInfo>Solicitar no es reservar: una solicitud se vuelve reserva hasta que el personal la aprueba, y te avisa en tus notificaciones.</NotaInfo>
        </>
    );
}

// ---------- Progreso y recompensas ----------
// HU-28 / HU-29 (servicios/progreso.ts). Cuenta una participación por sesión con asistencia registrada por el
// personal y credencial vigente ese día. Niveles del documento (D-11). Con ?simular=sesion se ve un ejemplo.
const progresoEjemplo: MiProgreso = {
    resumen: { usuarioId: "ejemplo", nombre: "", validas: 3, ajustes: 0, total: 3, nivel: 1, noContadas: 0, credencial: { estado: "validada", vence: "2028-09-26", vigente: true }, asignadas: 0, entregadas: 0, ultimaParticipacion: null },
    participaciones: [], recompensas: [{ id: "ejemplo", nombre: "Separador conmemorativo", descripcion: "", nivelRequerido: 1, disponible: true, vigenciaFin: "2027-01-24T23:59:59-07:00" }], entregas: [],
};

export function Progreso({ menor = false, usuario }: { menor?: boolean; usuario: string }) {
    const [estado, setEstado] = useState<{ datos?: MiProgreso; error?: string }>(sesionSimulada ? { datos: progresoEjemplo } : {});
    const [intento, setIntento] = useState(0);
    useEffect(() => {
        if (sesionSimulada) return;
        let vigente = true;
        consultarMiProgreso().then((datos) => {
            if (!vigente) return;
            if (datos.resumen.usuarioId === usuario) setEstado({ datos });
            else setEstado({ error: "La cuenta cambió. Vuelve a consultar tu progreso." });
        })
            .catch((error) => { if (vigente) setEstado({ error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [intento, usuario]);
    const textoNivel = { alcanzado: "Alcanzado", "en-progreso": "En progreso", pendiente: "Pendiente" };
    const colorNivel = { alcanzado: "verde", "en-progreso": "dorado", pendiente: "gris" } as const;
    const datos = estado.datos;
    if (!datos) {
        return (
            <>
                <EncabezadoSeccion titulo="Mi progreso y recompensas" texto={estado.error ? "No pudimos cargar tu progreso." : "Cargando tu progreso…"} />
                {estado.error && <TarjetaPerfil color="rosa" icono={tarjetaCandado} titulo="Intenta de nuevo" texto={estado.error}>
                    <div className="perfil-acciones"><button type="button" className="perfil-boton perfil-boton--guinda" onClick={() => { setEstado({}); setIntento((i) => i + 1); }}>Reintentar</button></div>
                </TarjetaPerfil>}
            </>
        );
    }
    const r = datos.resumen;
    const vigente = !!r.credencial?.vigente; // sin credencial vigente, las asistencias nuevas no suman
    const s = siguienteNivel(r.total);
    const estadoDe = (desde: number) => (r.total >= desde ? "alcanzado" : s?.desde === desde ? "en-progreso" : "pendiente");
    return (
        <>
            <EncabezadoSeccion titulo="Mi progreso y recompensas"
                texto={vigente ? (menor ? "Cada asistencia verificada acerca al siguiente nivel." : "Cada asistencia verificada te acerca al siguiente nivel.") : "Tu progreso suma con una credencial validada y vigente."}
                accion={<Link to="/eventos" className="perfil-boton perfil-boton--contorno">Ver actividades</Link>} />
            <section className="perfil-progreso" aria-labelledby="titulo-asistencias">
                <img className="perfil-progreso__circulo" src={progresoCirculo} alt="" />
                <EtiquetaPerfil id="titulo-asistencias" icono={iconosSeccion.progreso} claro>{`Nivel ${nombreNivel(r.nivel)}`}</EtiquetaPerfil>
                <p className="perfil-progreso__cifra perfil-progreso__cifra--grande">
                    {s ? <><strong>{r.total}</strong> de {s.desde} para {s.nombre}</> : <><strong>{r.total}</strong> participaciones, nivel más alto</>}
                </p>
                <div className="perfil-progreso__barra" role="progressbar" aria-valuemin={0} aria-valuemax={s?.desde ?? r.total} aria-valuenow={r.total}
                    aria-label="Participaciones para el siguiente nivel"><span style={{ width: `${avanceNivel(r.total)}%` }} /></div>
                <p className="perfil-progreso__texto">
                    Cada sesión con asistencia registrada por el personal cuenta una sola vez. Inscribirte, comentar o enviar propuestas no suma.
                    {r.noContadas > 0 && ` ${r.noContadas === 1 ? "Una asistencia no contó" : `${r.noContadas} asistencias no contaron`} porque ese día no había credencial vigente.`}
                </p>
            </section>
            {!vigente && (
                <TarjetaPerfil color="rosa" icono={tarjetaCandado} titulo="Tu progreso está en pausa"
                    texto="Lo que ya acumulaste se conserva. Las asistencias nuevas suman cuando tu credencial esté validada y vigente; no se cuentan hacia atrás.">
                    <div className="perfil-acciones"><Link to="/mi-perfil/credencial" className="perfil-boton perfil-boton--guinda">Ver mi trámite de credencial</Link></div>
                </TarjetaPerfil>
            )}
            <TarjetaPerfil color="dorada" icono={tarjetaEstrella} titulo="Niveles" texto="Cada nivel se alcanza con asistencias verificadas por el personal.">
                <ol className="perfil-niveles perfil-niveles--ruta">
                    {NIVELES.map((n, i) => {
                        const e = estadoDe(n.desde);
                        return (
                            <li key={n.nivel} className={`perfil-nivel perfil-nivel--${colorNivel[e]}`}>
                                <span className="perfil-nivel__numero" aria-hidden="true">{i + 1}</span>
                                <p>{n.nombre}</p>
                                <strong>{n.hasta === null ? `${n.desde} o más` : `${n.desde} a ${n.hasta}`} asistencias</strong>
                                <Chip color={colorNivel[e]}>{textoNivel[e]}</Chip>
                            </li>
                        );
                    })}
                </ol>
            </TarjetaPerfil>
            <TarjetaPerfil color="verde" icono={tarjetaEstrella} titulo="Mis insignias"
                texto="Se ganan solas al participar: cada una dice qué la desbloquea y cuánto te falta.">
                <GaleriaInsignias insignias={insigniasDe({ asistencias: r.validas, clubes: 0, talleres: 0, credencial: vigente ? 1 : 0, propuestas: 0 })} />
            </TarjetaPerfil>
            <section className="perfil-panel" aria-labelledby="titulo-recompensas">
                <EtiquetaPerfil id="titulo-recompensas" icono={iconosSeccion.progreso}>Mis recompensas</EtiquetaPerfil>
                {datos.recompensas.length === 0 && datos.entregas.length === 0 ? (
                    <p className="perfil-progreso__texto">Por ahora la biblioteca no tiene recompensas vigentes.</p>
                ) : (
                    <ul className="perfil-solicitudes">
                        {datos.entregas.map((e) => (
                            <li key={e.id} className={`perfil-solicitud perfil-solicitud--${e.estado === "entregada" ? "verde" : "dorado"}`}>
                                <span className="perfil-lista__icono"><img src={iconosSeccion.progreso} alt="" /></span>
                                <div className="perfil-solicitud__textos">
                                    <strong>{e.recompensa}</strong>
                                    <span>{e.estado === "entregada" ? "Ya la recibiste." : "La biblioteca te la asignó. Pasa a recogerla."}</span>
                                </div>
                                <Chip color={e.estado === "entregada" ? "verde" : "dorado"}>{e.estado === "entregada" ? "Entregada" : "Por recoger"}</Chip>
                            </li>
                        ))}
                        {datos.recompensas.filter((x) => !datos.entregas.some((e) => e.recompensaId === x.id)).map((x) => {
                            const alcanzado = r.nivel >= x.nivelRequerido;
                            return (
                                <li key={x.id} className={`perfil-solicitud perfil-solicitud--${alcanzado ? "verde" : "gris"}`}>
                                    <span className="perfil-lista__icono"><img src={iconosSeccion.progreso} alt="" /></span>
                                    <div className="perfil-solicitud__textos">
                                        <strong>{x.nombre} · {nombreNivel(x.nivelRequerido)}</strong>
                                        <span>{alcanzado ? (x.disponible ? "Ya tienes el nivel. La entrega la autoriza la biblioteca." : "Ya tienes el nivel, pero por ahora no hay existencias.") : `Se habilita al llegar a ${nombreNivel(x.nivelRequerido)}.`}</span>
                                    </div>
                                    <Chip color={alcanzado ? "verde" : "gris"}>{alcanzado ? "Nivel alcanzado" : "Bloqueada"}</Chip>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
            <NotaInfo>
                Las recompensas dependen de su disponibilidad, de la autorización de la Dirección y de que tu credencial siga vigente. El personal registra la entrega; llegar a un nivel no garantiza un premio.
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

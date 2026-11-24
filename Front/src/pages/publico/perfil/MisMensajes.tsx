// Mi perfil › Mis mensajes: lo que la persona escribió en Contacto y sugerencias, como en Mis eventos.
// Flujo: una sola lista (filtros por estado) → cada mensaje abre su seguimiento dentro de su tarjeta
// (pasos, respuesta de la biblioteca y folio) → al pie, «¿Falta un mensaje?» para agregarlo con su folio.
// Consulta real: GET /v1/public/contacto/seguimiento/{folio} (estados recibido, en_atencion y cerrado).
// Los folios de la cuenta se guardan en este navegador (mensajesGuardados.ts) al enviar o consultar.
// TODO backend: endpoint de «mis mensajes» con sesión (contrato en docs/pendientes-backend.md, «Mis mensajes»);
// cuando exista, la lista sale de ahí y el folio solo hace falta para mensajes enviados sin sesión.
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { consultarContacto, type Seguimiento } from "../../../servicios/atencionComunidad";
import { ErrorServicio, mensajeError } from "../../../servicios/api";
import { Chip, EtapasTramite, type ColorChip } from "../credencial/piezas";
import { NOMBRE_ESTADO, esFolio, etapasContacto, type EstadoContacto } from "../contacto/seguimiento";
import { EncabezadoSeccion } from "./piezas";
import { iconosSeccion } from "./iconos";
import { foliosDe, guardarFolio, olvidarFolio } from "./mensajesGuardados";
import { sesionSimulada, useSesion } from "./usarSesion";
import "../credencial/CredencialSesion.css";

type Mensaje = { folio: string; seguimiento?: Seguimiento; error?: boolean };
type Filtro = "todos" | "abiertos" | "atendidos";

const COLOR_ESTADO: Record<EstadoContacto, ColorChip> = { recibido: "gris", en_atencion: "dorado", cerrado: "verde" };
const estadoDe = (s: Seguimiento) => (s.estadoAtencion in NOMBRE_ESTADO ? s.estadoAtencion : "recibido") as EstadoContacto;

function fechaLarga(iso: string) {
    const fecha = new Date(iso);
    return Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-MX", { timeZone: "America/Mazatlan", day: "numeric", month: "long", year: "numeric" });
}
function partes(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { dia: "", mes: "" };
    return {
        dia: d.toLocaleString("es-MX", { timeZone: "America/Mazatlan", day: "numeric" }),
        mes: d.toLocaleString("es-MX", { timeZone: "America/Mazatlan", month: "short" }).replace(".", ""),
    };
}
// Folio corto para mostrar (el completo va en el seguimiento)
const folioCorto = (f: string) => f.slice(0, 8).toUpperCase();

// Con la sesión de ejemplo (?simular=sesion, solo en desarrollo)
const ejemplos: Mensaje[] = [
    { folio: "3f2a9c1e-5b7d-4e21-9a10-7c8d2e4f6a11", seguimiento: { id: "3f2a9c1e-5b7d-4e21-9a10-7c8d2e4f6a11", asunto: "Sugerencia: más horario en sábado", estadoAtencion: "en_atencion", creadoEn: "2026-11-12T16:00:00Z" } },
    { folio: "8b41d0aa-2c9e-4f3b-8d55-1e6a7b9c0d22", seguimiento: { id: "8b41d0aa-2c9e-4f3b-8d55-1e6a7b9c0d22", asunto: "Duda sobre la credencial", estadoAtencion: "cerrado", creadoEn: "2026-11-03T18:30:00Z", respuestaFinal: "Puedes tramitarla en línea desde Mi credencial y acudir al cotejo con tu identificación." } },
    { folio: "c7e5f912-9a3b-4c8d-b1e2-5f6a7d8e9f33", seguimiento: { id: "c7e5f912-9a3b-4c8d-b1e2-5f6a7d8e9f33", asunto: "Préstamo de sala para un club de lectura", estadoAtencion: "recibido", creadoEn: "2026-11-17T15:10:00Z" } },
];

export function MisMensajes() {
    const sesion = useSesion();
    const cuenta = sesion && sesion !== "simulado" ? sesion : null;
    const [mensajes, setMensajes] = useState<Mensaje[] | null>(sesionSimulada ? ejemplos : null);
    const [filtro, setFiltro] = useState<Filtro>("todos");
    const [parametros, setParametros] = useSearchParams();
    const folioUrl = (parametros.get("folio") ?? "").trim();
    const [abierto, setAbierto] = useState<string | null>(esFolio(folioUrl) ? folioUrl : null);

    // Agrega (o actualiza) un mensaje arriba de la lista
    const poner = useCallback((m: Mensaje) => {
        setMensajes((lista) => [m, ...(lista ?? []).filter((x) => x.folio !== m.folio)]);
    }, []);

    // Mensajes guardados para esta cuenta: se consulta el estado de cada uno
    useEffect(() => {
        if (sesionSimulada || !cuenta) return;
        let vigente = true;
        Promise.all(foliosDe(cuenta).map((f): Promise<Mensaje | null> => consultarContacto(f)
            .then((seguimiento) => ({ folio: f, seguimiento }))
            .catch((e) => {
                if (e instanceof ErrorServicio && e.estado === 404) { olvidarFolio(f, cuenta); return null; } // ya no existe
                return { folio: f, error: true };
            })))
            .then((lista) => {
                if (!vigente) return;
                setMensajes((previos) => {
                    const cargados = lista.filter((x): x is Mensaje => x !== null);
                    const extra = (previos ?? []).filter((p) => !cargados.some((c) => c.folio === p.folio));
                    return [...extra, ...cargados];
                });
            });
        return () => { vigente = false; };
    }, [cuenta]);

    // Al llegar desde la confirmación de Contacto (?folio=…): se agrega a la lista y se abre
    useEffect(() => {
        if (!esFolio(folioUrl) || sesionSimulada) return;
        let vigente = true;
        consultarContacto(folioUrl)
            .then((seguimiento) => {
                if (!vigente) return;
                poner({ folio: folioUrl, seguimiento });
                if (cuenta) guardarFolio(folioUrl, cuenta);
            })
            .catch(() => { /* si falla, la lista lo muestra al cargar los guardados */ });
        return () => { vigente = false; };
    }, [folioUrl, cuenta, poner]);

    const cuentas = useMemo(() => {
        const lista = mensajes ?? [];
        const atendidos = lista.filter((m) => m.seguimiento && estadoDe(m.seguimiento) === "cerrado").length;
        return { todos: lista.length, atendidos, abiertos: lista.length - atendidos };
    }, [mensajes]);
    const visibles = (mensajes ?? []).filter((m) => {
        if (filtro === "todos") return true;
        const cerrado = !!m.seguimiento && estadoDe(m.seguimiento) === "cerrado";
        return filtro === "atendidos" ? cerrado : !cerrado;
    }).sort((a, b) => (b.seguimiento?.creadoEn ?? "").localeCompare(a.seguimiento?.creadoEn ?? "")); // el más reciente primero

    function reintentar(folio: string) {
        consultarContacto(folio).then((seguimiento) => poner({ folio, seguimiento })).catch(() => undefined);
    }
    function alternar(folio: string) {
        setAbierto((actual) => (actual === folio ? null : folio));
        if (folioUrl) setParametros({}, { replace: true });
    }

    const opciones: [Filtro, string][] = [["todos", "Todos"], ["abiertos", "En proceso"], ["atendidos", "Atendidos"]];

    return (
        <>
            <EncabezadoSeccion titulo="Mis mensajes" texto="Los mensajes y sugerencias que enviaste a la biblioteca y en qué va cada uno."
                accion={<Link to="/contacto" className="perfil-boton">Escribir a la biblioteca</Link>} />

            <section className="perfil-panel perfil-mensajes" aria-label="Lista de mensajes">
                {mensajes === null && cuenta ? (
                    <p className="perfil-mensajes__cargando" role="status">Cargando tus mensajes…</p>
                ) : !mensajes?.length ? (
                    <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
                        <span className="perfil-vacio__insignia" aria-hidden="true" />
                        <p><strong>Aún no nos has escrito</strong>
                            Cuando envíes un mensaje o una sugerencia con tu sesión iniciada, aparecerá aquí y verás en qué va. Así avanza cada mensaje:</p>
                        <ul className="perfil-vacio__sugerencias" aria-label="Estados de un mensaje">
                            <li>Registrado</li><li>En revisión</li><li>Atendido</li>
                        </ul>
                        <Link to="/contacto" className="perfil-boton">Escribir a la biblioteca</Link>
                    </div>
                ) : (
                    <>
                        <div className="perfil-filtros" role="group" aria-label="Filtrar mensajes">
                            {opciones.map(([v, t]) => (
                                <button key={v} type="button" aria-pressed={filtro === v} className={`perfil-filtro${filtro === v ? " perfil-filtro--activo" : ""}`}
                                    onClick={() => setFiltro(v)}>{t}<span className="perfil-filtro__cuenta">{cuentas[v]}</span></button>
                            ))}
                        </div>
                        {visibles.length === 0 ? (
                            <div className="perfil-vacio perfil-vacio--eventos perfil-vacio--panel">
                                <span className="perfil-vacio__insignia" aria-hidden="true" />
                                <p><strong>No hay mensajes en este grupo</strong>Prueba con otro filtro.</p>
                            </div>
                        ) : (
                            <ul className="perfil-solicitudes">
                                {visibles.map((m) => <TarjetaMensaje key={m.folio} mensaje={m} abierto={abierto === m.folio}
                                    alAlternar={() => alternar(m.folio)} alReintentar={() => reintentar(m.folio)} />)}
                            </ul>
                        )}
                    </>
                )}
                <AgregarPorFolio alAgregar={(m) => { poner(m); setAbierto(m.folio); setFiltro("todos"); if (cuenta) guardarFolio(m.folio, cuenta); }} />
            </section>
        </>
    );
}

function TarjetaMensaje({ mensaje, abierto, alAlternar, alReintentar }: { mensaje: Mensaje; abierto: boolean; alAlternar: () => void; alReintentar: () => void }) {
    const { folio, seguimiento } = mensaje;
    const estado = seguimiento ? estadoDe(seguimiento) : null;
    const color: ColorChip = estado ? COLOR_ESTADO[estado] : "gris";
    const { dia, mes } = seguimiento ? partes(seguimiento.creadoEn) : { dia: "", mes: "" };
    const idPanel = `seguimiento-${folio}`;
    return (
        <li className={`perfil-solicitud perfil-solicitud--con-panel perfil-solicitud--${color} perfil-mensaje${abierto ? " perfil-mensaje--abierto" : ""}`}>
            {dia
                ? <span className={`perfil-evento__fecha perfil-mensaje__fecha--${color}`} aria-hidden="true"><strong>{dia}</strong>{mes}</span>
                : <span className="perfil-lista__icono"><img src={iconosSeccion.mensajes} alt="" /></span>}
            <div className="perfil-solicitud__textos">
                <strong>{seguimiento?.asunto ?? "Mensaje a la biblioteca"}</strong>
                <span>{seguimiento ? <>Enviado el {fechaLarga(seguimiento.creadoEn)} · folio <span className="perfil-mensaje__folio">{folioCorto(folio)}</span></> : "No pudimos consultar su estado en este momento."}</span>
            </div>
            {estado ? <Chip color={color}>{NOMBRE_ESTADO[estado]}</Chip> : <Chip color="gris">Sin conexión</Chip>}
            <span className="perfil-solicitud__acciones">
                {seguimiento
                    ? <button type="button" className={`perfil-boton perfil-boton--chico${abierto ? " perfil-boton--contorno" : ""}`}
                        aria-expanded={abierto} aria-controls={idPanel} onClick={alAlternar}>{abierto ? "Ocultar" : "Ver seguimiento"}</button>
                    : <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={alReintentar}>Reintentar</button>}
            </span>
            {abierto && seguimiento && estado && (
                <div className="perfil-solicitud__panel perfil-mensaje__detalle" id={idPanel}>
                    <EtapasTramite etapas={etapasContacto(estado)} />
                    {seguimiento.respuestaFinal
                        ? <div className="perfil-mensajes__respuesta"><strong>Respuesta de la biblioteca</strong><p>{seguimiento.respuestaFinal}</p></div>
                        : <p className="perfil-mensaje__nota">Te avisaremos en la campana de notificaciones cuando el personal responda.</p>}
                    <p className="perfil-mensaje__folio-completo">Folio completo: <code>{folio}</code></p>
                </div>
            )}
        </li>
    );
}

// «¿Falta un mensaje?»: agrega a la lista uno enviado sin sesión o desde otro equipo
function AgregarPorFolio({ alAgregar }: { alAgregar: (m: Mensaje) => void }) {
    const [abierto, setAbierto] = useState(false);
    const [folio, setFolio] = useState("");
    const [estado, setEstado] = useState<{ tipo: "inicio" | "cargando" } | { tipo: "error"; texto: string }>({ tipo: "inicio" });

    async function enviar(e: FormEvent) {
        e.preventDefault();
        const limpio = folio.trim();
        if (!esFolio(limpio)) { setEstado({ tipo: "error", texto: "Escribe el folio completo que recibiste al enviar tu mensaje." }); return; }
        setEstado({ tipo: "cargando" });
        try {
            const seguimiento = await consultarContacto(limpio);
            alAgregar({ folio: limpio, seguimiento });
            setFolio(""); setEstado({ tipo: "inicio" }); setAbierto(false);
        } catch (err) {
            setEstado({ tipo: "error", texto: mensajeError(err) });
        }
    }

    return (
        <div className="perfil-mensajes__agregar">
            <div className="perfil-mensajes__agregar-texto">
                <strong>¿Falta un mensaje?</strong>
                <span>Si lo enviaste sin iniciar sesión o desde otro equipo, agrégalo con el folio que recibiste.</span>
            </div>
            {!abierto
                ? <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => setAbierto(true)}>Agregar con folio</button>
                : (
                    <form className="perfil-mensajes__buscar" onSubmit={enviar}>
                        <div className="perfil-campo">
                            <label htmlFor="folio-mensaje" className="perfil-campo__etiqueta--icono" style={{ "--icono": `url("${iconosSeccion.mensajes}")` } as CSSProperties}>Folio del mensaje</label>
                            <input id="folio-mensaje" value={folio} onChange={(e) => setFolio(e.target.value)} maxLength={36} autoFocus
                                placeholder="Ej. 3f2a9c1e-…" autoComplete="off" spellCheck={false}
                                disabled={estado.tipo === "cargando"} aria-invalid={estado.tipo === "error" ? true : undefined} />
                        </div>
                        <button type="submit" className="perfil-boton perfil-boton--chico" disabled={estado.tipo === "cargando"}>
                            {estado.tipo === "cargando" ? "Buscando…" : "Agregar"}
                        </button>
                        <button type="button" className="perfil-boton perfil-boton--chico perfil-boton--contorno" onClick={() => { setAbierto(false); setEstado({ tipo: "inicio" }); }}>Cancelar</button>
                        {estado.tipo === "error" && <p className="perfil-campo__error" role="alert">{estado.texto}</p>}
                    </form>
                )}
        </div>
    );
}

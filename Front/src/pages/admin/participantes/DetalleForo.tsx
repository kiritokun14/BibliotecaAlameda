import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import {
    advertirPersona,
    aprobarPublicacion,
    DURACIONES,
    fechaHasta,
    hiloDe,
    historialDe,
    NOMBRE_ESTADO_PUBLICACION,
    nombreNorma,
    normaProbable,
    NORMAS,
    obtenerPublicacion,
    retirarPublicacion,
    silencioDe,
    silenciarPersona,
    ultimaDecision,
    useForo,
    validarDecision,
    type Publicacion,
} from "./moderacion";
import { BASE_FORO, TONO_PUBLICACION } from "./utiles";
import { ErrorDecision } from "./ErrorDecision";
import iconoBanderaResultado from "../../../assets/admin/participantes/resultado-bandera.svg";
import iconoCita from "../../../assets/admin/participantes/tarjeta-cita.svg";
import iconoContexto from "../../../assets/admin/contenidos/tarjeta-ayuda.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoX from "../../../assets/admin/contenidos/resultado-x.svg";

const fechaHora = (f: string) => `${fechaCorta(f)}, ${f.slice(11, 16)}`;
const diaHora = (f: string) => `${fechaCorta(f).replace(/ \d{4}$/, "")} ${f.slice(11, 16)}`;

// Una decisión que se guarda en el servidor y puede fallar; si falla se muestra «Error al decidir» con «Reintentar».
function useDecision() {
    const navigate = useNavigate();
    const [ocupado, setOcupado] = useState(false);
    const [pendiente, setPendiente] = useState<null | { accion: () => Promise<void>; ruta: string }>(null);
    const [fallo, setFallo] = useState(false);

    async function ejecutar(accion: () => Promise<void>, ruta: string) {
        setPendiente({ accion, ruta });
        setOcupado(true);
        try {
            await accion();
            navigate(ruta);
        } catch {
            setFallo(true);
        } finally {
            setOcupado(false);
        }
    }

    const error = fallo && pendiente ? <ErrorDecision ocupado={ocupado} alReintentar={() => void ejecutar(pendiente.accion, pendiente.ruta)} alVolver={() => navigate(BASE_FORO)} /> : null;
    return { ocupado, ejecutar, error };
}

const atendida = (p: Publicacion) => p.estado === "aprobada" || p.estado === "retirada";

// Publicación reportada (Figma 574:31123), retirar (574:31567) y silenciar (574:33302)
export function DetallePublicacion() {
    const { folio } = useParams();
    const [params] = useSearchParams();
    useForo();
    const { ocupado, ejecutar, error } = useDecision();
    const [ventana, setVentana] = useState<null | "retirar" | "silenciar">(params.get("accion") === "silenciar" ? "silenciar" : null);
    const p = obtenerPublicacion(folio);
    const [norma, setNorma] = useState<number | "">(() => (p ? (normaProbable(p) ?? "") : ""));
    const [mensaje, setMensaje] = useState("");
    const [dias, setDias] = useState(7);
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<{ norma?: string; mensaje?: string; motivo?: string }>({});
    if (!p) return <Navigate to={BASE_FORO} replace />;
    if (error) return error;

    const ruta = `${BASE_FORO}/${p.folio}`;
    const historial = historialDe(p.autor, p.folio);
    const silenciada = silencioDe(p.autor);
    const probable = normaProbable(p);
    const abrir = (v: "retirar" | "silenciar") => { setErrores({}); setMensaje(""); setMotivo(""); setVentana(v); };

    const banda = p.estado === "reportada"
        ? { tono: "guinda" as const, titulo: `${p.reportes === 1 ? "1 reporte" : `${p.reportes} reportes`} por ${p.motivo.toLowerCase()}`, linea: "Visible para el público hasta que decidas" }
        : p.estado === "pendiente"
            ? { tono: "dorado" as const, titulo: "Primera publicación de la persona", linea: "No se ve en el foro hasta que la apruebes" }
            : p.estado === "retirada"
                ? { tono: "guinda" as const, titulo: "Publicación retirada", linea: `Norma ${ultimaDecision(p, "retirada")?.norma ?? "—"}: ${nombreNorma(ultimaDecision(p, "retirada")?.norma).toLowerCase()} · ${fechaCorta(ultimaDecision(p, "retirada")?.fecha ?? "")}` }
                : { tono: "verde" as const, titulo: "Publicación aprobada", linea: `Sin infracción · ${fechaCorta(ultimaDecision(p, "aprobada")?.fecha ?? "")}` };

    function retirar() {
        const e = validarDecision(norma, mensaje, false);
        if (e.norma) return setErrores(e);
        void ejecutar(() => retirarPublicacion(p!.folio, Number(norma), mensaje), `${ruta}/retirada`);
    }

    function silenciar() {
        if (!motivo.trim()) return setErrores({ motivo: "Escribe el motivo del silencio." });
        void ejecutar(() => silenciarPersona(p!.folio, dias, motivo), `${ruta}/silenciada`);
    }

    const miga = ventana === "retirar" ? "Retirar publicación" : ventana === "silenciar" ? "Silenciar a la persona" : p.estado === "reportada" ? "Publicación reportada" : "Publicación";

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Moderación del foro", BASE_FORO], [miga]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Moderación del foro", ruta: BASE_FORO }} etiqueta={`Publicación ${p.folio}`} titulo={p.estado === "reportada" ? "Publicación reportada" : p.estado === "pendiente" ? "Publicación por aprobar" : "Publicación"} texto={`Hilo: «${p.hilo}» · ${fechaHora(p.fecha)} (ejemplo).`} />
                <Resultado tono={banda.tono} icono={iconoBanderaResultado} titulo={banda.titulo} linea={banda.linea} chip={<Chip tono={TONO_PUBLICACION[p.estado]}>{NOMBRE_ESTADO_PUBLICACION[p.estado]}</Chip>} />
                <Tarjeta icono={iconoCita} titulo="Contenido">
                    <blockquote className="cn-previa cn-parrafo" style={{ margin: 0 }}>{p.texto}</blockquote>
                </Tarjeta>
                <Tarjeta icono={iconoContexto} titulo="Contexto">
                    <Datos
                        filas={[
                            ["Autor", p.autor],
                            ["Historial", silenciada ? `${historial.texto} hasta el ${fechaCorta(silenciada.hasta)}` : historial.texto],
                            ["Norma probable", probable ? `${nombreNorma(probable)} (norma ${probable})` : "Ninguna"],
                            ["Reportes", p.reportes === 0 ? "Sin reportes" : p.reportes === 1 ? "1 persona" : `${p.reportes} personas distintas`],
                            ...(p.decisiones.length > 0 ? [["Decisiones", p.decisiones.map((d) => `${{ aprobada: "Aprobada", retirada: "Retirada", advertencia: "Advertencia", silenciada: "Silencio" }[d.tipo]} · ${d.quien} · ${fechaCorta(d.fecha)}`).join(" / ")] as [string, string]] : []),
                        ]}
                    />
                </Tarjeta>
                <div className="cn-acciones">
                    {!atendida(p) && (
                        <>
                            <button type="button" className={clasesBoton("contorno")} disabled={ocupado} onClick={() => void ejecutar(() => aprobarPublicacion(p.folio), `${ruta}/aprobada`)}>{ocupado && !ventana ? "Aprobando…" : "Aprobar (sin infracción)"}</button>
                            <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => abrir("retirar")}>Retirar publicación</button>
                        </>
                    )}
                    <Link to={`${ruta}/advertir`} className={clasesBoton("contorno")}>Advertir a la persona</Link>
                    {!silenciada && <button type="button" className={clasesBoton("guinda")} onClick={() => abrir("silenciar")}>Silenciar a la persona</button>}
                    <Link to={`${ruta}/hilo`} className={clasesBoton("suave")}>Ver hilo completo</Link>
                </div>
                {silenciada && <p className="cn-nota">Esta persona ya está silenciada hasta el {fechaCorta(silenciada.hasta)}. Puedes restaurarla en «Personas silenciadas».</p>}
                <PieDatos />
            </Pagina>

            {ventana === "retirar" && (
                <Ventana
                    titulo="¿Retirar la publicación?"
                    texto="Deja de verse en el foro. La persona recibe el motivo y queda registro."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("guinda")} disabled={ocupado} onClick={retirar}>{ocupado ? "Retirando…" : "Retirar publicación"}</button></>}
                >
                    <Datos variante="caja" filas={[["Publicación", p.folio], ["Autor", p.autor]]} />
                    <CampoNorma valor={norma} alCambiar={(v) => { setNorma(v); setErrores({}); }} error={errores.norma} id="fo-norma-retiro" etiqueta="Norma incumplida" />
                    <CampoTexto id="fo-mensaje-retiro" etiqueta="Mensaje a la persona">
                        <textarea id="fo-mensaje-retiro" className="cn-control cn-control--area" placeholder="Opcional. Se envía junto con el aviso." value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
                    </CampoTexto>
                </Ventana>
            )}
            {ventana === "silenciar" && (
                <Ventana
                    titulo="¿Silenciar a la persona?"
                    texto="No podrá publicar en el foro durante el tiempo que elijas. Podrá seguir leyendo."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("guinda")} disabled={ocupado} onClick={silenciar}>{ocupado ? "Silenciando…" : "Silenciar"}</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", p.autor], ["Antecedentes", historial.retiros === 0 ? "Sin retiros" : historial.retiros === 1 ? "1 retiro" : `${historial.retiros} retiros`]]} />
                    <CampoTexto id="fo-duracion" etiqueta="Duración" obligatorio ayuda={`Termina el ${fechaCorta(fechaHasta(dias))}.`}>
                        <select id="fo-duracion" className="cn-control" value={dias} onChange={(e) => setDias(Number(e.target.value))}>
                            {DURACIONES.map((d) => <option key={d.dias} value={d.dias}>{d.texto}</option>)}
                        </select>
                    </CampoTexto>
                    <CampoTexto id="fo-motivo" etiqueta="Motivo" obligatorio error={errores.motivo}>
                        <textarea id="fo-motivo" className={`cn-control cn-control--area ${errores.motivo ? "cn-control--error" : ""}`} placeholder="Ej.: reincidencia en lenguaje ofensivo." value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrores({}); }} aria-invalid={!!errores.motivo} aria-describedby={errores.motivo ? "fo-motivo-error" : undefined} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

function CampoNorma({ id, etiqueta, valor, alCambiar, error }: { id: string; etiqueta: string; valor: number | ""; alCambiar: (v: number | "") => void; error?: string }) {
    return (
        <CampoTexto id={id} etiqueta={etiqueta} obligatorio error={error}>
            <select id={id} className={`cn-control ${error ? "cn-control--error" : ""}`} value={valor} onChange={(e) => alCambiar(e.target.value ? Number(e.target.value) : "")} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>
                <option value="">Elige una norma</option>
                {NORMAS.map((n) => <option key={n.numero} value={n.numero}>{n.nombre}</option>)}
            </select>
        </CampoTexto>
    );
}

// Advertir a la persona (Figma 574:32477)
export function AdvertirPersona() {
    const { folio } = useParams();
    useForo();
    const navigate = useNavigate();
    const { ocupado, ejecutar, error } = useDecision();
    const p = obtenerPublicacion(folio);
    const [norma, setNorma] = useState<number | "">(() => (p ? (normaProbable(p) ?? "") : ""));
    const [mensaje, setMensaje] = useState("Te pedimos mantener un trato respetuoso. Una próxima infracción puede suspender tu participación.");
    const [errores, setErrores] = useState<{ norma?: string; mensaje?: string }>({});
    if (!p) return <Navigate to={BASE_FORO} replace />;
    if (error) return error;
    const ruta = `${BASE_FORO}/${p.folio}`;

    function enviar() {
        const e = validarDecision(norma, mensaje, true);
        if (e.norma || e.mensaje) return setErrores(e);
        void ejecutar(() => advertirPersona(p!.folio, Number(norma), mensaje), `${ruta}/advertencia`);
    }

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Moderación del foro", BASE_FORO], ["Advertir a la persona"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a la publicación", ruta }} etiqueta={`Publicación ${p.folio}`} titulo="Advertir a la persona" texto={`Envía un aviso a ${p.autor} sin retirar la publicación.`} />
                <Tarjeta icono={iconoLapiz} titulo="Aviso">
                    <CampoNorma id="fo-norma-aviso" etiqueta="Norma" valor={norma} alCambiar={(v) => { setNorma(v); setErrores((x) => ({ ...x, norma: undefined })); }} error={errores.norma} />
                    <CampoTexto id="fo-mensaje-aviso" etiqueta="Mensaje" obligatorio error={errores.mensaje}>
                        <textarea id="fo-mensaje-aviso" className={`cn-control cn-control--area ${errores.mensaje ? "cn-control--error" : ""}`} value={mensaje} onChange={(e) => { setMensaje(e.target.value); setErrores((x) => ({ ...x, mensaje: undefined })); }} aria-invalid={!!errores.mensaje} aria-describedby={errores.mensaje ? "fo-mensaje-aviso-error" : undefined} />
                    </CampoTexto>
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={enviar}>{ocupado ? "Enviando…" : "Enviar advertencia"}</button>
                    <button type="button" className={clasesBoton("suave")} onClick={() => navigate(ruta)}>Cancelar</button>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Hilo completo (Figma 574:33808)
export function HiloCompleto() {
    const { folio } = useParams();
    useForo();
    const p = obtenerPublicacion(folio);
    if (!p) return <Navigate to={BASE_FORO} replace />;
    const hilo = hiloDe(p);
    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Moderación del foro", BASE_FORO], ["Hilo completo"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a la publicación", ruta: `${BASE_FORO}/${p.folio}` }} etiqueta="Hilo" titulo={p.hilo} texto={`${hilo.length === 1 ? "1 publicación" : `${hilo.length} publicaciones`} · la que revisas está marcada.`} />
                <Tarjeta icono={iconoLista} titulo="Publicaciones del hilo">
                    <Tabla
                        columnas={[
                            { titulo: "FECHA", ancho: 130, folio: true, celda: (x: Publicacion) => diaHora(x.fecha) },
                            { titulo: "AUTOR", ancho: 230, fuerte: true, celda: (x: Publicacion) => x.autor },
                            { titulo: "PUBLICACIÓN", celda: (x: Publicacion) => (x.folio === p.folio ? <strong>{x.texto} (la que revisas)</strong> : <Link to={`${BASE_FORO}/${x.folio}`} className="cn-enlace">{x.texto}</Link>) },
                            { titulo: "ESTADO", ancho: 140, celda: (x: Publicacion) => <Chip tono={TONO_PUBLICACION[x.estado]} ancho={130}>{NOMBRE_ESTADO_PUBLICACION[x.estado]}</Chip> },
                        ]}
                        filas={hilo}
                        clave={(x) => x.folio}
                    />
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Resultados: retirada (574:31665), aprobada (574:32072), advertencia enviada (574:32897) y persona silenciada (574:33401)
export function ResultadoForo({ tipo }: { tipo: "retirada" | "aprobada" | "advertencia" | "silenciada" }) {
    const { folio } = useParams();
    useForo();
    const p = obtenerPublicacion(folio);
    const d = p && ultimaDecision(p, tipo);
    if (!p || !d) return <Navigate to={p ? `${BASE_FORO}/${p.folio}` : BASE_FORO} replace />;
    const ruta = `${BASE_FORO}/${p.folio}`;
    const silencio = silencioDe(p.autor);

    const datos = {
        retirada: { titulo: "Publicación retirada", texto: "Ya no se ve en el foro y se avisó a la persona.", chip: "Retirada", tono: "guinda" as const, icono: iconoX, cabeza: p.folio, linea: `Retirada ${fechaCorta(d.fecha)} · Norma ${d.norma}: ${nombreNorma(d.norma).toLowerCase()}` },
        aprobada: { titulo: "Publicación aprobada", texto: "Se ve en el foro y se descartaron los reportes.", chip: "Aprobada", tono: "verde" as const, icono: iconoCheck, cabeza: p.folio, linea: `Aprobada ${fechaCorta(d.fecha)} · sin infracción` },
        advertencia: { titulo: "Advertencia enviada", texto: "La persona recibió el aviso. La publicación sigue en el foro.", chip: "Enviada", tono: "dorado" as const, icono: iconoBanderaResultado, cabeza: p.autor, linea: `Norma ${d.norma}: ${nombreNorma(d.norma).toLowerCase()} · ${fechaCorta(d.fecha)}` },
        silenciada: { titulo: "Persona silenciada", texto: "No podrá publicar hasta la fecha indicada. Puede seguir leyendo.", chip: "Silenciada", tono: "guinda" as const, icono: iconoX, cabeza: p.autor, linea: `Hasta el ${fechaCorta(silencio?.hasta ?? "")} · ${d.mensaje ?? ""}` },
    }[tipo];

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Moderación del foro", BASE_FORO], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Publicación ${p.folio} · ${datos.chip}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={datos.cabeza} linea={datos.linea} chip={<Chip tono={datos.tono}>{datos.chip}</Chip>} />
                <div className="cn-acciones">
                    <Link to={BASE_FORO} className={clasesBoton("verde")}>Volver a Moderación del foro</Link>
                    {tipo === "retirada" && !silencio && <Link to={`${ruta}?accion=silenciar`} className={clasesBoton("contorno")}>Silenciar a la persona</Link>}
                    {tipo === "silenciada" && <Link to={`${BASE_FORO}?vista=silenciadas`} className={clasesBoton("contorno")}>Ver personas silenciadas</Link>}
                    {(tipo === "aprobada" || tipo === "advertencia") && <Link to={ruta} className={clasesBoton("contorno")}>Ver publicación</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Participación restaurada (Figma 639:52717)
export function ParticipacionRestaurada() {
    const { state } = useLocation() as { state: { persona?: string } | null };
    if (!state?.persona) return <Navigate to={`${BASE_FORO}?vista=silenciadas`} replace />;
    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Moderación del foro", BASE_FORO], ["Participación restaurada"]]} />
                <Encabezado grande etiqueta="Participantes · Foro" titulo="Participación restaurada" texto="La persona ya puede volver a publicar en el foro." />
                <Resultado tono="verde" icono={iconoCheck} titulo={state.persona} linea="Silencio terminado hoy · se le avisó por correo" chip={<Chip tono="verde">Restaurada</Chip>} />
                <div className="cn-acciones">
                    <Link to={`${BASE_FORO}?vista=silenciadas`} className={clasesBoton("verde")}>Volver a Personas silenciadas</Link>
                    <Link to={BASE_FORO} className={clasesBoton("contorno")}>Ir a la cola de moderación</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

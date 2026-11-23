import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, Migas, Pagina, PieDatos, Resultado, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import { ajustarProgreso, avanceDe, entregarRecompensa, estadoRecompensa, NOMBRE_ESTADO_RECOMPENSA, obtenerMeta, obtenerParticipante, obtenerRecompensa, useProgreso, type Avance } from "./progreso";
import { BASE_PROGRESO } from "./utiles";
import { Chip as ChipPz, Cifra, Dato as DatoPz, Datos as DatosPz, Encabezado as EncabezadoPz, Icono as IconoPz, Tarjeta as TarjetaPz, Vacio as VacioPz } from "../piezasPanel";
import { GaleriaInsignias } from "../../../components/portal/Insignias";
import { contarPorTipo, insigniasDe } from "../../../servicios/insignias";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";

const desdeTexto = (ym: string) => {
    const [a, m] = ym.split("-").map(Number);
    return `${new Date(a, m - 1, 1).toLocaleDateString("es-MX", { month: "long" })} de ${a}`;
};

// Progreso · ficha (Figma 572:27973), ajustar progreso (572:28431), entregar recompensa (572:28544)
// y error al entregar (637:51315)
export function FichaParticipante() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useProgreso();
    const [ventana, setVentana] = useState<null | "ajustar" | "entregar">(null);
    const [cambio, setCambio] = useState<"1" | "-1">("1");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [fallo, setFallo] = useState(false);
    const [ocupado, setOcupado] = useState(false);
    const p = obtenerParticipante(folio);
    if (!p) return <Navigate to={BASE_PROGRESO} replace />;

    const meta = obtenerMeta(p.meta);
    const recompensa = obtenerRecompensa(meta?.recompensa);
    const a = avanceDe(p);
    const estado = estadoRecompensa(p);
    const faltan = Math.max(0, a.necesarias - a.hechas);
    const ruta = `${BASE_PROGRESO}/${p.folio}`;
    const tipos = contarPorTipo(p.avances.map((x) => x.actividad));
    const insignias = insigniasDe({ asistencias: p.avances.length, clubes: tipos.clubes, talleres: tipos.talleres, credencial: p.credencial ? 1 : 0, propuestas: 0 });

    async function entregar() {
        setOcupado(true);
        try {
            await entregarRecompensa(p!.folio);
            navigate(`${ruta}/entregada`);
        } catch {
            setFallo(true);
        } finally {
            setOcupado(false);
        }
    }

    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [p.nombre]]} />
            <div className="pz-pagina">
                <EncabezadoPz titulo={p.nombre} texto={`${p.folio}, credencial ${p.credencial}. Participa desde ${desdeTexto(p.desde)}.`}>
                    <Cifra icono="check" valor={`${Math.min(a.hechas, a.necesarias)} de ${a.necesarias}`} texto={meta?.nombre ?? "sin meta"} />
                    <Cifra icono="estadisticas" valor={a.puntos} texto="puntos" />
                    <Cifra icono="recompensa" tono={estado === "por-entregar" ? "vino" : undefined} valor={insignias.filter((x) => x.obtenida).length} texto="insignias" />
                </EncabezadoPz>
                <div className="pz-columnas pz-columnas--libre">
                    <div className="pz-pila">
                        <TarjetaPz icono="recompensa" id="ficha-insignias" titulo="Insignias" texto="Se ganan solas al participar; la persona las ve en su perfil">
                            <GaleriaInsignias insignias={insignias} compacta />
                        </TarjetaPz>
                        <TarjetaPz icono="asistencia" id="ficha-actividades" titulo="Actividades que cuentan" texto={`${p.avances.length} ${p.avances.length === 1 ? "registro" : "registros"}, lo más reciente arriba`}>
                            {p.avances.length ? (
                                <ol className="pz-linea">
                                    {[...p.avances].sort((x, y) => y.fecha.localeCompare(x.fecha)).map((x: Avance, n) => (
                                        <li key={x.id} className={`pz-linea__paso pz-linea__paso--${x.origen === "Ajuste manual" ? "dorado" : "verde"}${n === 0 ? " pz-linea__paso--actual" : ""}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><IconoPz nombre={x.origen === "Ajuste manual" ? "revision" : "check"} /></span>
                                            <div className="pz-linea__textos">
                                                <p className="pz-linea__titulo">{x.actividad} <span className="pr-puntos">+{x.puntos}</span></p>
                                                <p className="pz-linea__detalle">{fechaCorta(x.fecha)}, {x.origen}</p>
                                                {x.motivo && <p className="pz-linea__nota">{x.motivo}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : <VacioPz icono="asistencia" titulo="Aún sin actividades" texto="Cuando el personal registre su asistencia, aparecerá aquí." />}
                        </TarjetaPz>
                    </div>
                    <aside className="pz-lateral" aria-label="Meta y recompensa">
                        <TarjetaPz icono="recompensa" id="ficha-meta" titulo={`Meta «${meta?.nombre ?? "sin meta"}»`} texto={estado === "entregada" ? "Recompensa entregada" : a.cumplida ? "Meta cumplida" : `Le ${faltan === 1 ? "falta 1 actividad" : `faltan ${faltan} actividades`}`}
                            accion={<ChipPz tono={estado === "entregada" ? "verde" : estado === "por-entregar" ? "dorado" : "gris"}>{estado === "sin" ? "En progreso" : NOMBRE_ESTADO_RECOMPENSA[estado]}</ChipPz>}>
                            <div className={`ins-medidor ins-medidor--${a.cumplida ? "verde" : "dorado"}`} style={{ ["--p" as string]: `${Math.min(100, (a.hechas / Math.max(1, a.necesarias)) * 100)}%` }} role="img" aria-label={`${a.hechas} de ${a.necesarias} actividades`}>
                                <span className="ins-medidor__centro"><strong>{Math.min(a.hechas, a.necesarias)}</strong><small>de {a.necesarias}</small></span>
                            </div>
                            <DatosPz>
                                <DatoPz ancho icono="recompensa" etiqueta="Al completarla">{recompensa?.nombre ?? "Sin recompensa"}</DatoPz>
                                {p.entregada && <DatoPz ancho icono="check" etiqueta="Entregó">{p.entregada.entrego}, el {fechaCorta(p.entregada.fecha)}</DatoPz>}
                            </DatosPz>
                            <div className="pz-acciones">
                                <button type="button" className="pz-boton" disabled={estado !== "por-entregar"} onClick={() => { setFallo(false); setVentana("entregar"); }}>Entregar recompensa</button>
                                {!p.entregada && <button type="button" className="pz-boton pz-boton--contorno" onClick={() => { setMotivo(""); setError(""); setCambio("1"); setVentana("ajustar"); }}>Ajustar progreso</button>}
                            </div>
                            {estado === "sin" && <p className="pz-acciones__nota">«Entregar recompensa» se habilita cuando completa la meta.</p>}
                            <Link to={BASE_PROGRESO} className="pz-enlace">Volver a Progreso y recompensas</Link>
                        </TarjetaPz>
                    </aside>
                </div>
            </div>

            {ventana === "ajustar" && (
                <Ventana
                    titulo="Ajustar progreso"
                    texto="Úsalo solo para corregir errores. Queda en la bitácora con tu nombre y el motivo."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={() => { if (!motivo.trim()) return setError("Escribe el motivo del ajuste."); ajustarProgreso(p.folio, cambio === "1" ? 1 : -1, motivo); navigate(`${ruta}/ajustado`); }}>Guardar ajuste</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Meta", `${meta?.nombre ?? "Sin meta"} · ${Math.min(a.hechas, a.necesarias)} de ${a.necesarias}`]]} />
                    <CampoTexto id="pr-ajuste" etiqueta="Ajuste" obligatorio>
                        <select id="pr-ajuste" className="cn-control" value={cambio} onChange={(e) => setCambio(e.target.value as "1" | "-1")}>
                            <option value="1">+1 actividad</option>
                            <option value="-1" disabled={p.avances.length === 0}>−1 actividad</option>
                        </select>
                    </CampoTexto>
                    <CampoTexto id="pr-motivo" etiqueta="Motivo" obligatorio error={error}>
                        <textarea id="pr-motivo" className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} placeholder="Ej.: asistió pero no se marcó su asistencia." value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "pr-motivo-error" : undefined} />
                    </CampoTexto>
                </Ventana>
            )}
            {ventana === "entregar" && (
                <Ventana
                    titulo={fallo ? "No se pudo entregar" : "¿Entregar la recompensa?"}
                    texto={fallo ? "La recompensa sigue pendiente y no se descontó de las existencias." : "Marca la recompensa como entregada y avisa a la persona."}
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado || recompensa?.existencias === 0} onClick={() => void entregar()}>{ocupado ? "Entregando…" : fallo ? "Reintentar" : "Entregar"}</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Recompensa", recompensa?.nombre ?? "—"], ["Existencias", recompensa?.existencias === null ? "Sin límite" : `${recompensa?.existencias}`]]} />
                    {fallo && (
                        <div className="cn-aviso cn-aviso--chico" role="alert">
                            <span className="cn-aviso__x" aria-hidden="true">✕</span>
                            <div className="cn-aviso__textos"><strong>Hubo un problema al guardar</strong><p>Intenta de nuevo en unos minutos.</p></div>
                        </div>
                    )}
                    {recompensa?.existencias === 0 && <p className="cn-campo__error" role="alert">No hay existencias. Agrega más en el catálogo de recompensas.</p>}
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Resultados: recompensa entregada (572:28648) y progreso ajustado (631:50594)
export function ResultadoParticipante({ tipo }: { tipo: "entregada" | "ajustado" }) {
    const { folio } = useParams();
    useProgreso();
    const p = obtenerParticipante(folio);
    if (!p || (tipo === "entregada" && !p.entregada)) return <Navigate to={p ? `${BASE_PROGRESO}/${p.folio}` : BASE_PROGRESO} replace />;
    const a = avanceDe(p);
    const recompensa = obtenerRecompensa(obtenerMeta(p.meta)?.recompensa);
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [tipo === "entregada" ? "Recompensa entregada" : "Progreso ajustado"]]} />
                <Encabezado grande etiqueta={`Participante ${p.folio}`} titulo={tipo === "entregada" ? "Recompensa entregada" : "Progreso ajustado"} texto={tipo === "entregada" ? "Se avisó a la persona y se descontó de las existencias." : "El ajuste quedó en la bitácora con su motivo."} />
                <Resultado
                    tono="verde"
                    icono={iconoCheck}
                    titulo={tipo === "entregada" ? `${recompensa?.nombre ?? "Recompensa"} · ${p.nombre}` : p.nombre}
                    linea={tipo === "entregada" ? `Entregó: ${p.entregada?.entrego} · ${fechaCorta(p.entregada?.fecha ?? "")}` : `Avance: ${Math.min(a.hechas, a.necesarias)} de ${a.necesarias} · ${a.puntos} puntos`}
                    chip={<Chip tono="verde">{tipo === "entregada" ? "Entregada" : "Ajustado"}</Chip>}
                />
                <div className="cn-acciones">
                    <Link to={`${BASE_PROGRESO}/${p.folio}`} className={clasesBoton("verde")}>Ver ficha</Link>
                    <Link to={BASE_PROGRESO} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Progreso y recompensas</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

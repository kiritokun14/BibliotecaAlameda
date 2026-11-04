import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import { CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, Migas, Pagina, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import { ajustarProgreso, avanceDe, entregarRecompensa, estadoRecompensa, NOMBRE_ESTADO_RECOMPENSA, obtenerMeta, obtenerParticipante, obtenerRecompensa, useProgreso, type Avance } from "./progreso";
import { BASE_PROGRESO, TONO_RECOMPENSA } from "./utiles";
import iconoResultado from "../../../assets/admin/participantes/resultado-estrella.svg";
import iconoEstrella from "../../../assets/admin/participantes/tarjeta-estrella.svg";
import iconoCasilla from "../../../assets/admin/actividades/tarjeta-casilla.svg";
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
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", BASE_PROGRESO], [ventana === "ajustar" ? "Ajustar progreso" : ventana === "entregar" ? (fallo ? "Error al entregar" : "Entregar recompensa") : "Ficha"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Progreso y recompensas", ruta: BASE_PROGRESO }} etiqueta={`Participante ${p.folio}`} titulo={p.nombre} texto={`${p.credencial} · Participa desde ${desdeTexto(p.desde)}.`} />
                <Resultado
                    tono={estado === "entregada" ? "verde" : "dorado"}
                    icono={estado === "entregada" ? iconoCheck : iconoResultado}
                    titulo={`Meta «${meta?.nombre ?? "sin meta"}»: ${Math.min(a.hechas, a.necesarias)} de ${a.necesarias}`}
                    linea={estado === "entregada" ? `Recompensa entregada el ${fechaCorta(p.entregada!.fecha)} · ${a.puntos} puntos` : a.cumplida ? `Meta cumplida · ${a.puntos} puntos · falta entregar la recompensa` : `Le ${faltan === 1 ? "falta 1 actividad" : `faltan ${faltan} actividades`} para completarla · ${a.puntos} puntos`}
                    chip={<Chip tono={estado === "sin" ? "dorado" : TONO_RECOMPENSA[estado]}>{estado === "sin" ? "En progreso" : NOMBRE_ESTADO_RECOMPENSA[estado]}</Chip>}
                />
                <Tarjeta icono={iconoCasilla} titulo="Actividades que cuentan">
                    <Tabla
                        columnas={[
                            { titulo: "FECHA", ancho: 120, folio: true, celda: (x: Avance) => fechaCorta(x.fecha) },
                            { titulo: "ACTIVIDAD", fuerte: true, celda: (x: Avance) => x.actividad },
                            { titulo: "PUNTOS", ancho: 80, celda: (x: Avance) => `+${x.puntos}` },
                            { titulo: "ORIGEN", ancho: 200, celda: (x: Avance) => (x.motivo ? `${x.origen} · ${x.motivo}` : x.origen) },
                        ]}
                        filas={p.avances}
                        clave={(x) => x.id}
                    />
                </Tarjeta>
                <Tarjeta icono={iconoEstrella} titulo="Recompensa asociada">
                    <Datos filas={[["Al completar", recompensa?.nombre ?? "Sin recompensa"], ["Estado", estado === "entregada" ? `Entregada por ${p.entregada!.entrego}` : a.cumplida ? "Lista para entregar" : "Pendiente de meta"]]} />
                </Tarjeta>
                <div className="cn-acciones">
                    <button type="button" className={clasesBoton("verde")} disabled={estado !== "por-entregar"} onClick={() => { setFallo(false); setVentana("entregar"); }}>Entregar recompensa</button>
                    {!p.entregada && <button type="button" className={clasesBoton("contorno")} onClick={() => { setMotivo(""); setError(""); setCambio("1"); setVentana("ajustar"); }}>Ajustar progreso</button>}
                    <Link to={BASE_PROGRESO} className={clasesBoton("suave")}>Volver</Link>
                </div>
                {estado === "sin" && <p className="cn-nota">«Entregar recompensa» se habilita cuando la persona completa la meta.</p>}
                <PieDatos />
            </Pagina>

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
                    <Datos variante="caja" filas={[["Persona", p.nombre], ["Recompensa", recompensa?.nombre ?? "—"], ["Existencias", recompensa?.existencias === null ? "Sin límite" : `${recompensa?.existencias} (ejemplo)`]]} />
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
        <PanelLayout titulo="Participantes">
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
                    <Link to={BASE_PROGRESO} className={clasesBoton("contorno")}>Volver a Progreso y recompensas</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

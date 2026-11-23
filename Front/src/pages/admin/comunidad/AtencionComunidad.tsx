// Atención › Contactos y sugerencias. Conectado al backend (servicios/atencionComunidad.ts).
// 22 nov 2026: rehecho con las piezas del panel y la paleta (plantilla «Lista» del Resumen): cifras por estado que filtran,
// lista con filtro segmentado y buscador | al lado, el mensaje elegido con «Iniciar atención» y la respuesta final, o
// «Cómo se atiende un mensaje» si no hay ninguno elegido. Bibliocomunidad se eliminó (Aldahir, 22 nov).
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Icono, Nota, Paginas, Plegable, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { mensajeError } from "../../../servicios/api";
import { listarCasos, atenderContacto, type Caso, type ListaCasos } from "../../../servicios/atencionComunidad";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import { Paso } from "../atencion/comun/Paso";
import { fechaHora } from "../atencion/comun/fechas";
import "./Comunidad.css";

type EstadoCaso = "recibido" | "en_atencion" | "cerrado";
type Filtro = "" | EstadoCaso;
const ESTADOS: Record<EstadoCaso, { texto: string; tono: TonoEstado }> = {
    recibido: { texto: "Sin atender", tono: "guinda" },
    en_atencion: { texto: "En atención", tono: "dorado" },
    cerrado: { texto: "Cerrados", tono: "verde" },
};
const POR_PAGINA = 10;
const esSugerencia = (c: Caso) => /sugerencia/i.test(c.asunto);
// Cuándo llegó: hoy, en los últimos 7 días o en los últimos 30
type Periodo = "" | "hoy" | "semana" | "mes";
function enPeriodo(iso: string, periodo: Periodo, ahora = new Date()) {
    if (!periodo) return true;
    if (periodo === "hoy") return new Date(iso).toDateString() === ahora.toDateString();
    return ahora.getTime() - new Date(iso).getTime() <= (periodo === "semana" ? 7 : 30) * 86400000;
}

function Estado({ estado }: { estado: string }) {
    const e = ESTADOS[estado as EstadoCaso] ?? { texto: estado, tono: "gris" as TonoEstado };
    return <Chip tono={e.tono}>{e.texto}</Chip>;
}

export default function AtencionComunidad() {
    const id = useId();
    const [estado, setEstado] = useState<Filtro>("");
    const [pagina, setPagina] = useState(1);
    const [texto, setTexto] = useState("");
    const [tipo, setTipo] = useState<"" | "contacto" | "sugerencia">("");
    const [periodo, setPeriodo] = useState<Periodo>("");
    const [recarga, setRecarga] = useState(0);
    const [seleccion, setSeleccion] = useState<Caso | null>(null);
    const [aviso, setAviso] = useState("");
    const [resultado, setResultado] = useState<{ clave: string; datos?: ListaCasos; error?: string }>({ clave: "" });
    const [cuentas, setCuentas] = useState<Partial<Record<EstadoCaso, number>>>({});
    const clave = JSON.stringify([estado, pagina, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;

    useEffect(() => {
        let vigente = true;
        listarCasos(false, estado, pagina)
            .then((datos) => { if (vigente) setResultado({ clave, datos }); })
            .catch((e) => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [estado, pagina, clave]);

    // Cuántos hay en cada estado (para las cifras y el filtro): solo se pide el total de cada uno
    useEffect(() => {
        let vigente = true;
        Promise.all((Object.keys(ESTADOS) as EstadoCaso[]).map((e) => listarCasos(false, e, 1).then((r) => [e, r.total] as const)))
            .then((pares) => { if (vigente) setCuentas(Object.fromEntries(pares)); })
            .catch(() => { if (vigente) setCuentas({}); });
        return () => { vigente = false; };
    }, [recarga]);

    const datos = actual?.datos;
    const paginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;
    const buscado = texto.trim().toLowerCase();
    const items = datos?.items ?? [];
    const porTipo = (c: Caso) => !tipo || (tipo === "sugerencia") === esSugerencia(c);
    const visibles = items.filter((c) => porTipo(c) && enPeriodo(c.creadoEn, periodo)
        && (!buscado || [c.nombreRemitente, c.asunto, c.cuerpoMensaje, c.correoContacto ?? "", c.id].some((v) => v.toLowerCase().includes(buscado))));
    const activos = [estado, tipo, periodo].filter(Boolean).length;
    const cuenta = (e: EstadoCaso) => cuentas[e] ?? "—";
    const total = (Object.values(cuentas) as number[]).reduce((s, n) => s + n, 0);

    function elegirEstado(valor: Filtro) {
        setEstado(valor);
        setPagina(1);
        setSeleccion(null);
    }

    function actualizar() {
        setRecarga((x) => x + 1);
        setSeleccion(null);
    }

    return (
        <PanelLayout titulo="Atención" tema="contenidos paleta">
            <Migas pasos={[["Contactos y sugerencias"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Contactos y sugerencias" texto="Los mensajes que la gente envía desde el portal. Atiéndelos y deja la respuesta final en cada caso.">
                    <Cifra icono="alerta" tono="vino" valor={cuenta("recibido")} texto="sin atender" activa={estado === "recibido"} alPresionar={() => elegirEstado(estado === "recibido" ? "" : "recibido")} />
                    <Cifra icono="reloj" valor={cuenta("en_atencion")} texto="en atención" activa={estado === "en_atencion"} alPresionar={() => elegirEstado(estado === "en_atencion" ? "" : "en_atencion")} />
                    <Cifra icono="check" valor={cuenta("cerrado")} texto="cerrados" activa={estado === "cerrado"} alPresionar={() => elegirEstado(estado === "cerrado" ? "" : "cerrado")} />
                </Encabezado>

                {aviso && <Aviso titulo={aviso} />}

                <div className="pz-columnas">
                    <Tarjeta icono="mensajes" id={`${id}-lista`} titulo="Mensajes recibidos" texto="Del más reciente al más antiguo" className="pz-pendientes"
                        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={actualizar}>Actualizar</button>}>
                        <Buscador etiqueta="Buscar un mensaje" placeholder="Remitente, asunto o texto del mensaje" valor={texto} alCambiar={setTexto}>
                            <FiltrosAvanzados activos={activos} alQuitar={() => { elegirEstado(""); setTipo(""); setPeriodo(""); }} grupos={[
                                {
                                    titulo: "Estado", valor: estado, alCambiar: (v) => elegirEstado(v as Filtro),
                                    opciones: [
                                        { valor: "", texto: "Todos", cantidad: Object.keys(cuentas).length ? total : undefined },
                                        ...(Object.entries(ESTADOS) as [EstadoCaso, { texto: string }][]).map(([valor, e]) => ({ valor, texto: e.texto, cantidad: cuentas[valor] })),
                                    ],
                                },
                                {
                                    titulo: "Tipo de mensaje", valor: tipo, alCambiar: (v) => setTipo(v as typeof tipo),
                                    opciones: [
                                        { valor: "", texto: "Todos" },
                                        { valor: "contacto", texto: "Contacto", cantidad: datos ? items.filter((c) => !esSugerencia(c)).length : undefined },
                                        { valor: "sugerencia", texto: "Sugerencia", cantidad: datos ? items.filter(esSugerencia).length : undefined },
                                    ],
                                },
                                {
                                    titulo: "Cuándo llegó", valor: periodo, alCambiar: (v) => setPeriodo(v as Periodo),
                                    opciones: [
                                        { valor: "", texto: "Cuando sea" },
                                        { valor: "hoy", texto: "Hoy", cantidad: datos ? items.filter((c) => enPeriodo(c.creadoEn, "hoy")).length : undefined },
                                        { valor: "semana", texto: "Últimos 7 días", cantidad: datos ? items.filter((c) => enPeriodo(c.creadoEn, "semana")).length : undefined },
                                        { valor: "mes", texto: "Últimos 30 días", cantidad: datos ? items.filter((c) => enPeriodo(c.creadoEn, "mes")).length : undefined },
                                    ],
                                },
                            ]} />
                        </Buscador>
                        {(tipo || periodo || buscado) && datos && datos.total > POR_PAGINA && <p className="pz-acciones__nota">El tipo, la fecha y la búsqueda se aplican a esta página.</p>}

                        {!actual && <EsqueletoLista filas={4} texto="Cargando mensajes…" />}
                        {actual?.error && (
                            <div className="ct-centro">
                                <Vacio icono="alerta" titulo="No pudimos cargar los mensajes" texto={actual.error}
                                    accion={<button type="button" className="pz-boton pz-boton--chico" onClick={actualizar}>Reintentar</button>} />
                            </div>
                        )}
                        {datos && (visibles.length === 0 ? (
                            <div className="ct-centro">
                                <Vacio icono={datos.total === 0 && !activos ? "check" : "buscarCuenta"} titulo={datos.total === 0 && !activos ? "Estás al día" : "Sin resultados"}
                                    texto={datos.total === 0 && !activos ? "Cuando alguien escriba desde el portal, aparecerá aquí." : "No hay mensajes con estos filtros."}
                                    accion={activos > 0 && <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { elegirEstado(""); setTipo(""); setPeriodo(""); setTexto(""); }}>Quitar filtros</button>} />
                            </div>
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Mensajes recibidos">
                                <ul className="pz-filas">
                                    {visibles.map((c) => {
                                        const abierta = seleccion?.id === c.id;
                                        const sinAtender = c.estadoAtencion === "recibido";
                                        return (
                                            <li key={c.id}>
                                                <article className={`pz-fila${sinAtender ? " pz-fila--guinda" : c.estadoAtencion === "en_atencion" ? " pz-fila--espera" : ""}${abierta ? " pz-fila--elegida" : ""}`}>
                                                    <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={esSugerencia(c) ? "contenido" : "mensajes"} /></span>
                                                    <div className="pz-fila__textos">
                                                        <h4 className="pz-fila__titulo">{c.nombreRemitente}</h4>
                                                        <p className="pz-fila__detalle"><span>{esSugerencia(c) ? "Sugerencia" : "Contacto"}</span><span>{fechaHora(c.creadoEn)}</span></p>
                                                        <p className="ct-extracto">{c.cuerpoMensaje}</p>
                                                    </div>
                                                    <Estado estado={c.estadoAtencion} />
                                                    <button type="button" className={`pz-boton pz-boton--chico${abierta || sinAtender ? "" : " pz-boton--contorno"}`} aria-pressed={abierta}
                                                        onClick={() => { setAviso(""); setSeleccion(abierta ? null : c); }}>
                                                        {abierta ? "Abierto" : c.estadoAtencion === "cerrado" ? "Ver" : "Atender"}<span className="solo-lectores"> el mensaje de {c.nombreRemitente}</span>
                                                    </button>
                                                </article>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}

                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{visibles.length} de {datos?.total ?? 0} mensajes</p>
                            <Paginas pagina={pagina} paginas={paginas} bloqueada={!actual} alCambiar={(p) => { setPagina(p); setSeleccion(null); }} />
                        </div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label={seleccion ? "Mensaje elegido" : "Cómo se atiende"}>
                        {seleccion ? (
                            <Detalle key={seleccion.id} caso={seleccion} alCerrar={() => setSeleccion(null)}
                                alGuardar={(caso, mensaje) => { setAviso(mensaje); setRecarga((x) => x + 1); setSeleccion(caso.estadoAtencion === "cerrado" ? null : caso); }} />
                        ) : (
                            <>
                                <Tarjeta icono="info" id={`${id}-como`} titulo="Cómo se atiende un mensaje" texto="Elige uno de la lista para abrirlo" className="pz-tarjeta--actividades">
                                    <ol className="pz-linea">
                                        <Paso tono="guinda" icono="mensajes" titulo="Llega sin atender" texto="La persona lo envió desde Contacto en el portal y recibió su folio." />
                                        <Paso tono="dorado" icono="reloj" titulo="Inicia la atención" texto="Así el equipo sabe que alguien ya lo está viendo." />
                                        <Paso tono="verde" icono="check" titulo="Ciérralo con la respuesta" texto="La respuesta final queda en el caso y la persona la ve con su folio." />
                                    </ol>
                                </Tarjeta>
                                <Plegable titulo="Reglas para responder">
                                    <ul>
                                        <li>Responde con lenguaje claro y sin datos de otras personas.</li>
                                        <li>Si el mensaje es de credencial, espacios o actividades, orienta a la persona a ese trámite.</li>
                                        <li>Un caso cerrado ya no se reabre: escribe la respuesta completa.</li>
                                    </ul>
                                </Plegable>
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}


function Detalle({ caso, alGuardar, alCerrar }: { caso: Caso; alGuardar: (caso: Caso, mensaje: string) => void; alCerrar: () => void }) {
    const id = useId();
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [respuesta, setRespuesta] = useState("");
    const bloqueo = useRef(false);
    const abierto = caso.estadoAtencion !== "cerrado";
    const estadoActual = caso.estadoAtencion as EstadoCaso;

    async function ejecutar(accion: () => Promise<Caso>, mensaje: string) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setOcupado(true);
        setError("");
        try {
            const nuevo = await accion();
            alGuardar({ ...caso, ...nuevo }, mensaje);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setOcupado(false);
        }
    }

    function cerrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const textoFinal = respuesta.trim();
        if (!textoFinal) { setError("Escribe la respuesta final antes de cerrar el caso."); return; }
        void ejecutar(() => atenderContacto(caso.id, "cerrado", textoFinal), `Cerraste el caso de ${caso.nombreRemitente}.`);
    }

    return (
        <Tarjeta icono={esSugerencia(caso) ? "contenido" : "mensajes"} id={`${id}-caso`} titulo={caso.asunto} texto={`Recibido el ${fechaHora(caso.creadoEn)}`}
            accion={<Estado estado={caso.estadoAtencion} />} className="ct-detalle">
            <Datos>
                <Dato icono="usuario" etiqueta="Remitente" ancho>{caso.nombreRemitente}</Dato>
                <Dato icono="mensajes" etiqueta="Correo" ancho>{caso.correoContacto || "No lo dejó"}</Dato>
                {caso.telefonoContacto && <Dato icono="info" etiqueta="Teléfono" ancho>{caso.telefonoContacto}</Dato>}
                <Dato icono="lista" etiqueta="Folio" ancho><span className="ct-folio" title={caso.id}>{caso.id}</span></Dato>
            </Datos>
            <Nota titulo="Mensaje"><div className="pz-nota__desplazable ct-texto">{caso.cuerpoMensaje}</div></Nota>
            {caso.respuestaFinal && <Nota titulo="Respuesta final"><div className="ct-texto">{caso.respuestaFinal}</div></Nota>}

            {error && <Aviso tono="error" titulo="No se pudo guardar." texto={error} />}

            {estadoActual === "recibido" && (
                <div className="pz-acciones">
                    <button type="button" className="pz-boton" disabled={ocupado} onClick={() => void ejecutar(() => atenderContacto(caso.id, "en_atencion", ""), "Iniciaste la atención del mensaje.")}>
                        {ocupado ? "Guardando…" : "Iniciar atención"}
                    </button>
                </div>
            )}
            {abierto && (
                <form className="pz-decision" onSubmit={cerrar} aria-label="Cerrar el caso">
                    <label className="pz-campo pz-campo--lleno">
                        <span>Respuesta final *</span>
                        <textarea rows={4} maxLength={10000} value={respuesta} onChange={(e) => { setRespuesta(e.target.value); setError(""); }}
                            placeholder="Lo que le respondiste o resolviste a la persona" disabled={ocupado} />
                    </label>
                    <div className="pz-acciones">
                        <button type="submit" className={`pz-boton${estadoActual === "recibido" ? " pz-boton--contorno" : ""}`} disabled={ocupado}>{ocupado ? "Guardando…" : "Cerrar con esta respuesta"}</button>
                    </div>
                </form>
            )}
            {!abierto && <p className="pz-acciones__nota">Este caso ya está cerrado; la persona ve la respuesta con su folio.</p>}
            <div className="pz-acciones pz-acciones--pie">
                <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alCerrar}>Cerrar</button>
            </div>
        </Tarjeta>
    );
}

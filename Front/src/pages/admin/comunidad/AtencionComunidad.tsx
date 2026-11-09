// Atención › Contactos y sugerencias / Bibliocomunidad. Conectado al backend (servicios/atencionComunidad.ts).
// Diseño: el del Editor de contenidos. Mismo flujo de antes: lista de casos y, al elegir uno, su detalle abajo.
import { useEffect, useRef, useState, type FormEvent } from "react";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { IconoAviso, IconoLapiz, IconoLista, IconoReloj } from "../contenidos/piezas";
import "../contenidos/Contenidos.css";
import "../atencion/Atencion.css";
import "./Comunidad.css";
import { mensajeError } from "../../../servicios/api";
import { listarCasos, atenderContacto, registrarIntento, finalizarCaso, intentosCaso, type Caso, type ListaCasos, type Intento } from "../../../servicios/atencionComunidad";

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    recibido: { texto: "Recibido", clase: "con_observaciones" },
    en_atencion: { texto: "En atención", clase: "por_autorizar" },
    cerrado: { texto: "Cerrado", clase: "publicado" },
};
const FILTROS = [{ valor: "", texto: "Todos" }, ...Object.entries(ESTADOS).map(([valor, e]) => ({ valor, texto: e.texto }))];
const MEDIOS: Record<string, string> = { llamada: "Llamada", correo: "Correo", presencial: "Presencial" };
const POR_PAGINA = 10;

function Estado({ estado }: { estado: string }) {
    const e = ESTADOS[estado] ?? { texto: estado, clase: "borrador" };
    return <span className={`contenidos-estado contenidos-estado--${e.clase}`}>{e.texto}</span>;
}

export default function AtencionComunidad({ bibliocomunidad = false }: { bibliocomunidad?: boolean }) {
    const [estado, setEstado] = useState("");
    const [pagina, setPagina] = useState(1);
    const [recarga, setRecarga] = useState(0);
    const [seleccion, setSeleccion] = useState<Caso | null>(null);
    const [resultado, setResultado] = useState<{ clave: string; datos?: ListaCasos; error?: string }>({ clave: "" });
    const clave = JSON.stringify([bibliocomunidad, estado, pagina, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;

    useEffect(() => {
        let vigente = true;
        listarCasos(bibliocomunidad, estado, pagina)
            .then((datos) => { if (vigente) setResultado({ clave, datos }); })
            .catch((e) => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [bibliocomunidad, estado, pagina, clave]);

    // Al elegir un caso, la vista baja a su detalle
    useEffect(() => {
        if (seleccion) document.getElementById("comunidad-detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [seleccion]);

    const titulo = bibliocomunidad ? "Bibliocomunidad" : "Contactos y sugerencias";
    const datos = actual?.datos;
    const paginas = datos ? Math.max(1, Math.ceil(datos.total / POR_PAGINA)) : 1;

    function elegirEstado(valor: string) {
        setEstado(valor);
        setPagina(1);
        setSeleccion(null);
    }

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <Migas pasos={[[titulo]]} />

            <div className="contenidos-encabezado">
                <div>
                    <p className="contenidos-etiqueta">Atención · {titulo}</p>
                    <h1>{titulo}</h1>
                    <p className="contenidos-encabezado__texto">Los casos y sus cambios se guardan en la base de datos.</p>
                </div>
                <button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => { setRecarga((x) => x + 1); setSeleccion(null); }}>
                    Actualizar
                </button>
            </div>

            <section className="contenidos-lista" aria-labelledby="comunidad-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div>
                        <h2 id="comunidad-lista-titulo">{bibliocomunidad ? "Solicitudes de Bibliocomunidad" : "Mensajes recibidos"}</h2>
                        <p>Elige un caso para ver su detalle y atenderlo.</p>
                    </div>
                </div>

                <div className="contenidos-lista__herramientas">
                    <div className="contenidos-filtros" role="group" aria-label="Filtrar por estado">
                        {FILTROS.map((f) => (
                            <button key={f.valor || "todos"} type="button" aria-pressed={estado === f.valor}
                                className={`contenidos-filtro${estado === f.valor ? " contenidos-filtro--activo" : ""}`} onClick={() => elegirEstado(f.valor)}>
                                {f.texto}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="contenidos-tabla comunidad-tabla" tabIndex={0} role="table" aria-label="Casos" aria-busy={!actual}>
                    {!actual && <p role="status" className="contenidos-cargando">Cargando casos…</p>}
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        {["Folio", "Remitente", "Asunto", "Estado", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                    </div>
                    {datos?.items.map((c) => (
                        <div key={c.id} className={`contenidos-tabla__fila${seleccion?.id === c.id ? " comunidad-fila--elegida" : ""}`} role="row">
                            <span role="cell" className="contenidos-tabla__folio comunidad-folio" title={c.id}>{c.id}</span>
                            <span role="cell" className="contenidos-tabla__titulo">{c.nombreRemitente}</span>
                            <span role="cell" className="comunidad-asunto">{c.asunto}</span>
                            <span role="cell"><Estado estado={c.estadoAtencion} /></span>
                            <span role="cell">
                                <button type="button" className="contenidos-tabla__accion" aria-pressed={seleccion?.id === c.id} onClick={() => setSeleccion(c)}>
                                    Ver caso →<span className="solo-lectores"> de {c.nombreRemitente}</span>
                                </button>
                            </span>
                        </div>
                    ))}
                    {actual?.error && <p className="contenidos-error" role="alert">{actual.error}</p>}
                    {datos && datos.total === 0 && (
                        <div className="contenidos-vacio" role="row">
                            <span role="cell">
                                <span className="contenidos-vacio__icono"><IconoLista /></span>
                                <strong>No hay casos con este filtro</strong>
                                <span>Prueba con otro estado.</span>
                            </span>
                        </div>
                    )}
                </div>

                <div className="contenidos-lista__pie">
                    <p aria-live="polite">Mostrando {datos?.items.length ?? 0} de {datos?.total ?? 0} casos</p>
                    <div className="contenidos-paginas" role="group" aria-label="Páginas">
                        <button type="button" disabled={!datos || pagina === 1} onClick={() => { setPagina((p) => p - 1); setSeleccion(null); }}>‹ Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina} de {paginas}</button>
                        <button type="button" disabled={!datos || pagina * POR_PAGINA >= datos.total} onClick={() => { setPagina((p) => p + 1); setSeleccion(null); }}>Siguiente ›</button>
                    </div>
                </div>
            </section>

            {seleccion && <Detalle key={seleccion.id} caso={seleccion} comunidad={bibliocomunidad} alGuardar={() => { setSeleccion(null); setRecarga((x) => x + 1); }} />}
        </PanelLayout>
    );
}

function Detalle({ caso, comunidad, alGuardar }: { caso: Caso; comunidad: boolean; alGuardar: () => void }) {
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const [intentos, setIntentos] = useState<Intento[] | null>(null);
    const [recarga, setRecarga] = useState(0);
    const bloqueo = useRef(false);

    useEffect(() => {
        if (!comunidad) return;
        let vigente = true;
        intentosCaso(caso.id)
            .then((r) => { if (vigente) setIntentos(r.items); })
            .catch((e) => { if (vigente) setError(mensajeError(e)); });
        return () => { vigente = false; };
    }, [caso.id, comunidad, recarga]);

    async function ejecutar(accion: () => Promise<unknown>, terminar = true) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setOcupado(true);
        setError("");
        try {
            await accion();
            if (terminar) alGuardar();
            else { setIntentos(null); setRecarga((x) => x + 1); }
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setOcupado(false);
        }
    }

    function cerrar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const texto = String(f.get("respuesta") || "").trim();
        if (!texto) { setError("Escribe una respuesta final."); return; }
        void ejecutar(() => (comunidad
            ? finalizarCaso(caso.id, f.get("incorporacion") === "on", texto, f.get("resolucion") === "on")
            : atenderContacto(caso.id, "cerrado", texto)));
    }

    function intento(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formulario = e.currentTarget;
        const f = new FormData(formulario);
        const nota = String(f.get("nota") || "").trim();
        if (!nota) { setError("Describe el intento de contacto."); return; }
        void ejecutar(() => registrarIntento(caso.id, String(f.get("tipo")), f.get("exitoso") === "on", nota).then(() => formulario.reset()), false);
    }

    const abierto = caso.estadoAtencion !== "cerrado";

    return (
        <div className="contenidos-formulario" id="comunidad-detalle">
            <div className="at-columna">
                <section className="contenidos-panel" aria-labelledby="comunidad-caso-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoAviso /></span>
                        <div className="at-cabecera__textos">
                            <h2 id="comunidad-caso-titulo">{caso.asunto}</h2>
                            <p>Folio {caso.id}</p>
                        </div>
                    </div>
                    <div className="at-datos">
                        <div className="at-dato"><p className="at-dato__etiqueta">Remitente</p><p className="at-dato__valor">{caso.nombreRemitente}</p></div>
                        <div className="at-dato"><p className="at-dato__etiqueta">Contacto</p><p className="at-dato__valor">{caso.correoContacto || caso.telefonoContacto || "Sin contacto"}</p></div>
                        <div className="at-dato"><p className="at-dato__etiqueta">Recibido</p><p className="at-dato__valor">{new Date(caso.creadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</p></div>
                    </div>
                    <div className="at-nota">
                        <p className="at-nota__autor">Mensaje</p>
                        <p className="comunidad-texto">{caso.cuerpoMensaje}</p>
                    </div>
                    {caso.respuestaFinal && (
                        <div className="at-nota">
                            <p className="at-nota__autor">Respuesta final</p>
                            <p className="comunidad-texto">{caso.respuestaFinal}</p>
                        </div>
                    )}
                </section>

                {comunidad && (
                    <section className="contenidos-panel" aria-labelledby="comunidad-intentos-titulo">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoReloj /></span>
                            <div className="at-cabecera__textos">
                                <h2 id="comunidad-intentos-titulo">Intentos de contacto</h2>
                                <p>Bitácora de llamadas, correos y visitas.</p>
                            </div>
                        </div>
                        {intentos === null ? <p role="status" className="contenidos-cargando">Cargando bitácora…</p>
                            : intentos.length === 0 ? <p className="contenidos-nota">Sin intentos registrados.</p>
                            : (
                                <ol className="at-eventos">
                                    {intentos.map((i) => (
                                        <li key={i.id} className={i.exitoso ? "at-eventos--hecho" : undefined}>
                                            <strong>{MEDIOS[i.tipoIntento] ?? i.tipoIntento} · {i.exitoso ? "Efectivo" : "Sin contacto"}</strong>
                                            <small>{i.observaciones}</small>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        {abierto && (
                            <form className="comunidad-formulario" onSubmit={intento}>
                                <fieldset disabled={ocupado}>
                                    <legend className="at-subtitulo">Registrar intento</legend>
                                    <div className="contenidos-campo">
                                        <label htmlFor="comunidad-medio">Medio</label>
                                        <select id="comunidad-medio" name="tipo">
                                            {Object.entries(MEDIOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                        </select>
                                    </div>
                                    <label className="comunidad-casilla"><input type="checkbox" name="exitoso" /> Se logró contactar a la persona</label>
                                    <div className="contenidos-campo">
                                        <label htmlFor="comunidad-nota">Observaciones</label>
                                        <textarea id="comunidad-nota" name="nota" rows={3} required maxLength={2000} />
                                    </div>
                                    <button type="submit" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico at-alinear-inicio">Guardar intento</button>
                                </fieldset>
                            </form>
                        )}
                    </section>
                )}

                {abierto && (
                    <section className="contenidos-panel" aria-labelledby="comunidad-cierre-titulo">
                        <div className="contenidos-lista__cabecera">
                            <span className="contenidos-lista__icono"><IconoLapiz /></span>
                            <div className="at-cabecera__textos">
                                <h2 id="comunidad-cierre-titulo">Cerrar caso</h2>
                                <p>La respuesta final queda registrada en el caso.</p>
                            </div>
                        </div>
                        <form className="comunidad-formulario" onSubmit={cerrar}>
                            <fieldset disabled={ocupado}>
                                <div className="contenidos-campo">
                                    <label htmlFor="comunidad-respuesta">Respuesta final <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                                    <textarea id="comunidad-respuesta" name="respuesta" rows={4} required maxLength={10000} />
                                </div>
                                {comunidad && (
                                    <>
                                        <label className="comunidad-casilla"><input type="checkbox" name="incorporacion" /> Confirmar incorporación (requiere contacto efectivo)</label>
                                        <label className="comunidad-casilla"><input type="checkbox" name="resolucion" /> Resolución explícita para cerrar sin contacto efectivo</label>
                                    </>
                                )}
                                <button type="submit" className="contenidos-boton contenidos-boton--principal at-alinear-inicio">{ocupado ? "Guardando…" : "Guardar cierre"}</button>
                            </fieldset>
                        </form>
                    </section>
                )}
            </div>

            <aside className="contenidos-formulario__lateral">
                <section className="contenidos-panel contenidos-panel--estado" aria-labelledby="comunidad-estado-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoReloj /></span>
                        <h2 id="comunidad-estado-titulo">Estado</h2>
                    </div>
                    <p className="contenidos-estado-linea"><Estado estado={caso.estadoAtencion} /></p>
                    {error && <p className="contenidos-error" role="alert">{error}</p>}
                    {!comunidad && caso.estadoAtencion === "recibido" && (
                        <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--ancho" disabled={ocupado}
                            onClick={() => void ejecutar(() => atenderContacto(caso.id, "en_atencion", ""))}>
                            Iniciar atención
                        </button>
                    )}
                    <p className="contenidos-nota">
                        {abierto ? "Al cerrar el caso, la respuesta final queda guardada en la base de datos." : "Este caso ya está cerrado."}
                    </p>
                </section>
            </aside>
        </div>
    );
}

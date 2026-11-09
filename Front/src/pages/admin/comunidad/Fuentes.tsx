// Administración › Fuentes del asistente (Figma 580:45266). Conectada al backend (servicios/fuentes.ts).
// Diseño: el del Editor de contenidos. Mismo flujo de antes: lista, detalle de la fuente elegida y formulario
// para registrar una fuente o crear una nueva versión (se guarda como borrador).
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { EncabezadoPagina } from "../componentes";
import { Pantalla, Pestanas, Resumen } from "../administracion/comun";
import { IconoAviso, IconoLapiz, IconoLista, IconoReloj } from "../contenidos/piezas";
import "./Comunidad.css";
import { ContextoPanel } from "../../../servicios/accesoPanel";
import { mensajeError } from "../../../servicios/api";
import { crearFuente, decidirFuente, listarFuentes, type Fuente, type EntradaFuente } from "../../../servicios/fuentes";

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    borrador: { texto: "Borrador", clase: "borrador" },
    en_revision: { texto: "En revisión", clase: "por_autorizar" },
    aprobada: { texto: "Aprobada", clase: "publicado" },
    retirada: { texto: "Retirada", clase: "con_observaciones" },
};
const POR_PAGINA = 10;

function Estado({ estado }: { estado: string }) {
    const e = ESTADOS[estado] ?? { texto: estado, clase: "borrador" };
    return <span className={`contenidos-estado contenidos-estado--${e.clase}`}>{e.texto}</span>;
}

export default function Fuentes() {
    const identidad = useContext(ContextoPanel);
    const aprueba = identidad?.acceso.roles.some((r) => r.rolCodigo === "administrador");
    const [pagina, setPagina] = useState(1);
    const [estado, setEstado] = useState("");
    const [recarga, setRecarga] = useState(0);
    const [seleccion, setSeleccion] = useState<Fuente | null>(null);
    const [resultado, setResultado] = useState<{ clave: string; items?: Fuente[]; total?: number; error?: string }>({ clave: "" });
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    const clave = JSON.stringify([pagina, estado, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;

    useEffect(() => {
        let vigente = true;
        listarFuentes(pagina, estado)
            .then((r) => { if (vigente) setResultado({ clave, ...r }); })
            .catch((e) => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [pagina, estado, clave]);

    useEffect(() => {
        if (seleccion) document.getElementById("fuente-detalle")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [seleccion]);

    async function ejecutar(accion: () => Promise<unknown>, mensaje: string) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setGuardando(true);
        setError("");
        setAviso("");
        try {
            await accion();
            setSeleccion(null);
            setRecarga((x) => x + 1);
            setAviso(mensaje);
        } catch (e) {
            setError(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }

    function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const datos: EntradaFuente = {
            tituloFuente: String(f.get("titulo") || "").trim(),
            tipoFuente: String(f.get("tipo") || "").trim(),
            contenidoReferencia: String(f.get("contenido") || "").trim(),
        };
        if (!datos.tituloFuente || !datos.tipoFuente || !datos.contenidoReferencia) { setError("Completa los campos de la fuente."); return; }
        void ejecutar(() => (seleccion ? decidirFuente(seleccion.id, "version", datos) : crearFuente(datos)), seleccion ? "Se creó una nueva versión como borrador." : "La fuente se guardó como borrador.");
    }

    function elegirEstado(valor: string) {
        setEstado(valor);
        setPagina(1);
        setSeleccion(null);
    }

    const items = actual?.items ?? [];
    const total = actual?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const enPagina = (fn: (f: Fuente) => boolean) => (actual?.items ? items.filter(fn).length : "…");

    return (
        <Pantalla migas={[["Fuentes del asistente"]]}>
            <EncabezadoPagina etiqueta="Administración · Fuentes del asistente" titulo="Fuentes del asistente"
                texto="Solo las fuentes aprobadas y activas quedan disponibles para recuperación. Esto no activa por sí solo el asistente conversacional."
                accion={<button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => { setRecarga((x) => x + 1); setSeleccion(null); }}>Actualizar</button>} />

            <Resumen tarjetas={[
                { tono: "azul", icono: <IconoLista />, cifra: enPagina((f) => f.activa), titulo: "Activas", texto: "Usadas por el asistente (en esta página)." },
                { tono: "gris", icono: <IconoReloj />, cifra: enPagina((f) => f.estadoFuente === "en_revision" || f.estadoFuente === "borrador"), titulo: "Por aprobar", texto: "Borradores o en revisión.", activa: estado === "en_revision", alPresionar: () => elegirEstado("en_revision") },
                { tono: "guinda", icono: <IconoAviso />, cifra: enPagina((f) => f.estadoFuente === "retirada"), titulo: "Retiradas", texto: "Ya no se usan.", activa: estado === "retirada", alPresionar: () => elegirEstado("retirada") },
            ]} />

            {aviso && <div className="at-bloque at-bloque--info" role="status"><strong>{aviso}</strong></div>}
            {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se pudo completar</strong><p>{error}</p></div>}

            <section className="contenidos-lista" aria-labelledby="fuentes-lista-titulo">
                <div className="contenidos-lista__cabecera">
                    <span className="contenidos-lista__icono"><IconoLista /></span>
                    <div><h2 id="fuentes-lista-titulo">Fuentes registradas</h2><p>Elige una para ver su contenido y sus acciones.</p></div>
                </div>
                <div className="contenidos-lista__herramientas">
                    <Pestanas etiqueta="Filtrar por estado" valor={estado} alCambiar={elegirEstado}
                        opciones={[{ valor: "", texto: "Todas" }, ...Object.entries(ESTADOS).map(([valor, e]) => ({ valor, texto: e.texto }))]} />
                    <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" onClick={() => { setSeleccion(null); document.getElementById("fuente-formulario")?.scrollIntoView({ behavior: "smooth" }); }}>Agregar fuente</button>
                </div>

                <div className="contenidos-tabla ad-tabla-fuentes" tabIndex={0} role="table" aria-label="Fuentes" aria-busy={!actual}>
                    {!actual && <p role="status" className="contenidos-cargando">Cargando fuentes…</p>}
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        {["Fuente", "Tipo", "Versión", "Estado", "Activa", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                    </div>
                    {items.map((f) => (
                        <div key={f.id} className={`contenidos-tabla__fila${seleccion?.id === f.id ? " comunidad-fila--elegida" : ""}`} role="row">
                            <span role="cell" className="contenidos-tabla__titulo at-celda">{f.tituloFuente}</span>
                            <span role="cell" className="at-celda">{f.tipoFuente}</span>
                            <span role="cell">{f.version}</span>
                            <span role="cell"><Estado estado={f.estadoFuente} /></span>
                            <span role="cell">{f.activa ? "Sí" : "No"}</span>
                            <span role="cell"><button type="button" className="contenidos-tabla__accion" disabled={guardando} onClick={() => setSeleccion(f)}>Abrir →<span className="solo-lectores"> {f.tituloFuente}</span></button></span>
                        </div>
                    ))}
                    {actual?.error && <p className="contenidos-error" role="alert">{actual.error}</p>}
                    {actual?.items && items.length === 0 && (
                        <div className="contenidos-vacio" role="row"><span role="cell"><span className="contenidos-vacio__icono"><IconoLista /></span><strong>No hay fuentes con este filtro</strong><span>El asistente responde únicamente con las fuentes registradas.</span></span></div>
                    )}
                </div>

                <div className="contenidos-lista__pie">
                    <p aria-live="polite">Mostrando {items.length} de {total} fuentes</p>
                    <span />
                    <div className="contenidos-paginas" role="group" aria-label="Páginas">
                        <button type="button" disabled={!actual || pagina === 1 || guardando} onClick={() => { setPagina((x) => x - 1); setSeleccion(null); }}>‹ Anterior</button>
                        <button type="button" className="contenidos-paginas__actual" aria-current="page">{pagina} de {paginas}</button>
                        <button type="button" disabled={!actual || pagina * POR_PAGINA >= total || guardando} onClick={() => { setPagina((x) => x + 1); setSeleccion(null); }}>Siguiente ›</button>
                    </div>
                </div>
            </section>

            {seleccion && (
                <section className="contenidos-panel" id="fuente-detalle" aria-labelledby="fuente-detalle-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoLista /></span>
                        <div className="at-cabecera__textos"><h2 id="fuente-detalle-titulo">{seleccion.tituloFuente}</h2><p>{seleccion.tipoFuente} · versión {seleccion.version} · {seleccion.activa ? "activa" : "no activa"}</p></div>
                        <Estado estado={seleccion.estadoFuente} />
                    </div>
                    <div className="at-nota"><p className="at-nota__autor">Contenido de referencia</p><p className="comunidad-texto">{seleccion.contenidoReferencia}</p></div>
                    <div className="contenidos-previa__acciones">
                        {seleccion.estadoFuente !== "retirada" && aprueba && (
                            <>
                                <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={guardando} onClick={() => void ejecutar(() => decidirFuente(seleccion.id, "aprobar", { aprobar: true }), "La fuente quedó aprobada.")}>Aprobar fuente</button>
                                <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => void ejecutar(() => decidirFuente(seleccion.id, "aprobar", { aprobar: false }), "La fuente regresó a revisión.")}>Devolver a revisión</button>
                            </>
                        )}
                        {seleccion.estadoFuente === "aprobada" && !seleccion.activa && (
                            <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={guardando} onClick={() => void ejecutar(() => decidirFuente(seleccion.id, "activar"), "La fuente quedó activa para el asistente.")}>Activar fuente</button>
                        )}
                        {seleccion.estadoFuente !== "retirada" && (
                            <button type="button" className="contenidos-boton at-boton--guinda" disabled={guardando} onClick={() => void ejecutar(() => decidirFuente(seleccion.id, "retirar"), "La fuente se retiró.")}>Retirar fuente</button>
                        )}
                        <button type="button" className="contenidos-boton contenidos-boton--suave-azul" disabled={guardando} onClick={() => setSeleccion(null)}>Nueva fuente</button>
                    </div>
                </section>
            )}

            {seleccion?.estadoFuente !== "retirada" && (
                <form key={seleccion?.id || "nueva-" + recarga} id="fuente-formulario" className="contenidos-panel comunidad-formulario" onSubmit={guardar} aria-labelledby="fuente-formulario-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoLapiz /></span>
                        <div className="at-cabecera__textos"><h2 id="fuente-formulario-titulo">{seleccion ? "Crear nueva versión" : "Registrar fuente"}</h2><p>Se guardará como borrador, sin aprobación ni activación.</p></div>
                    </div>
                    <fieldset disabled={guardando}>
                        <div className="at-fila">
                            <div className="contenidos-campo">
                                <label htmlFor="fuente-titulo">Título <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                                <input id="fuente-titulo" type="text" name="titulo" defaultValue={seleccion?.tituloFuente} required maxLength={250} />
                            </div>
                            <div className="contenidos-campo">
                                <label htmlFor="fuente-tipo">Tipo <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                                <input id="fuente-tipo" type="text" name="tipo" defaultValue={seleccion?.tipoFuente} required maxLength={80} placeholder="Ej.: Reglamento, Preguntas frecuentes" />
                            </div>
                        </div>
                        <div className="contenidos-campo">
                            <label htmlFor="fuente-contenido">Contenido de referencia <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                            <textarea id="fuente-contenido" name="contenido" rows={6} defaultValue={seleccion?.contenidoReferencia} required maxLength={50000} />
                        </div>
                        <button type="submit" className="contenidos-boton contenidos-boton--principal at-alinear-inicio">{guardando ? "Guardando…" : "Guardar borrador"}</button>
                    </fieldset>
                </form>
            )}
        </Pantalla>
    );
}

// Administración › Fuentes del asistente (HU-31; Figma 580:45267 lista, 580:46180 agregar, 580:47460 detalle).
// Conectada a /v1/admin/rag/fuentes (servicios/fuentes.ts). Diseño del Editor de contenidos.
// Mismo flujo de antes: lista, detalle de la fuente elegida y formulario para registrar o crear una nueva versión.
// El contrato actual guarda texto (no archivos), filtra por estado y tipo, y no ofrece desactivar sin retirar,
// sincronizar ni probar el asistente: esas acciones no se muestran como si existieran.
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Dato, Datos, EncabezadoPagina } from "../componentes";
import { Ventana } from "../Ventana";
import { Pantalla, Pestanas, Resumen } from "../administracion/comun";
import { IconoAviso, IconoBuscar, IconoLapiz, IconoLista, IconoReloj } from "../contenidos/piezas";
import "./Comunidad.css";
import { ContextoPanel } from "../../../servicios/accesoPanel";
import { mensajeError } from "../../../servicios/api";
import { crearFuente, decidirFuente, listarFuentes, type Fuente, type EntradaFuente } from "../../../servicios/fuentes";
import { CONFIRMACION, ESTADO_FUENTE, accionesDisponibles, buscarFuentes, type AccionFuente } from "./reglasFuentes";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";

const POR_PAGINA = 10;
const fecha = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");

function Estado({ estado }: { estado: string }) {
    const e = ESTADO_FUENTE[estado] ?? { texto: estado, clase: "borrador" };
    return <span className={`contenidos-estado contenidos-estado--${e.clase}`}>{e.texto}</span>;
}

export default function Fuentes() {
    const identidad = useContext(ContextoPanel);
    const aprueba = !!identidad?.acceso.roles.some((r) => r.rolCodigo === "administrador");
    const [pagina, setPagina] = useState(1);
    const [estado, setEstado] = useState("");
    const [tipo, setTipo] = useState("");
    const [tipoAplicado, setTipoAplicado] = useState("");
    const [texto, setTexto] = useState("");
    const [recarga, setRecarga] = useState(0);
    const [seleccion, setSeleccion] = useState<Fuente | null>(null);
    const [confirmando, setConfirmando] = useState<Exclude<AccionFuente, "version"> | null>(null);
    const [resultado, setResultado] = useState<{ clave: string; items?: Fuente[]; total?: number; error?: string }>({ clave: "" });
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);
    const clave = JSON.stringify([pagina, estado, tipoAplicado, recarga]);
    const actual = resultado.clave === clave ? resultado : undefined;

    useEffect(() => {
        let vigente = true;
        listarFuentes(pagina, estado, tipoAplicado)
            .then((r) => { if (vigente) setResultado({ clave, ...r }); })
            .catch((e) => { if (vigente) setResultado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [pagina, estado, tipoAplicado, clave]);

    // El tipo se aplica al dejar de escribir
    useEffect(() => {
        const espera = setTimeout(() => { setTipoAplicado(tipo.trim()); setPagina(1); }, 400);
        return () => clearTimeout(espera);
    }, [tipo]);

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

    function confirmar() {
        if (!seleccion || !confirmando) return;
        const id = seleccion.id;
        const accion = confirmando;
        setConfirmando(null);
        if (accion === "aprobar") void ejecutar(() => decidirFuente(id, "aprobar", { aprobar: true }), "La fuente quedó aprobada. Todavía no está activa.");
        if (accion === "devolver") void ejecutar(() => decidirFuente(id, "aprobar", { aprobar: false }), "La fuente regresó a revisión.");
        if (accion === "activar") void ejecutar(() => decidirFuente(id, "activar"), "La fuente quedó activa para el asistente.");
        if (accion === "retirar") void ejecutar(() => decidirFuente(id, "retirar"), "La fuente se retiró y ya no se usa en nuevas respuestas.");
    }

    function guardar(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const datos: EntradaFuente = {
            tituloFuente: String(f.get("titulo") || "").trim(),
            tipoFuente: String(f.get("tipo") || "").trim(),
            contenidoReferencia: String(f.get("contenido") || "").trim(),
        };
        if (!datos.tituloFuente || !datos.tipoFuente || !datos.contenidoReferencia) { setError("Completa el título, el tipo y el contenido de la fuente."); return; }
        void ejecutar(() => (seleccion ? decidirFuente(seleccion.id, "version", datos) : crearFuente(datos)),
            seleccion ? "Se creó una nueva versión como borrador. Debe aprobarse y activarse para usarse." : "La fuente se guardó como borrador. Debe aprobarse y activarse para usarse.");
    }

    function elegirEstado(valor: string) {
        setEstado(valor);
        setPagina(1);
        setSeleccion(null);
    }

    const items = actual?.items ?? [];
    const visibles = buscarFuentes(items, texto);
    const total = actual?.total ?? 0;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const enPagina = (fn: (f: Fuente) => boolean) => (actual?.items ? items.filter(fn).length : "…");
    const acciones = seleccion ? accionesDisponibles(seleccion, aprueba) : [];

    return (
        <Pantalla migas={[["Fuentes del asistente"]]}>
            <EncabezadoPagina etiqueta="Administración · Fuentes del asistente" titulo="Fuentes del asistente"
                texto="Solo las fuentes aprobadas y activas quedan disponibles para el asistente. Registrar o aprobar una fuente no la activa."
                accion={<button type="button" className="contenidos-boton contenidos-boton--contorno" onClick={() => { setRecarga((x) => x + 1); setSeleccion(null); }}>Actualizar</button>} />

            <Resumen tarjetas={[
                { tono: "azul", icono: <IconoLista />, cifra: enPagina((f) => f.activa), titulo: "Activas", texto: "Usadas por el asistente (en esta página)." },
                { tono: "gris", icono: <IconoReloj />, cifra: enPagina((f) => f.estadoFuente === "en_revision" || f.estadoFuente === "borrador"), titulo: "Por aprobar", texto: "Borradores o en revisión.", activa: estado === "en_revision", alPresionar: () => elegirEstado("en_revision") },
                { tono: "guinda", icono: <IconoAviso />, cifra: enPagina((f) => f.estadoFuente === "retirada"), titulo: "Retiradas", texto: "Ya no se usan en nuevas respuestas.", activa: estado === "retirada", alPresionar: () => elegirEstado("retirada") },
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
                        opciones={[{ valor: "", texto: "Todas" }, ...Object.entries(ESTADO_FUENTE).map(([valor, e]) => ({ valor, texto: e.texto }))]} />
                    <button type="button" className="contenidos-boton contenidos-boton--principal contenidos-boton--chico" onClick={() => { setSeleccion(null); document.getElementById("fuente-formulario")?.scrollIntoView({ behavior: "smooth" }); }}>Agregar fuente</button>
                </div>
                <div className="at-fila fuentes-filtros">
                    <label className="contenidos-buscar">
                        <IconoBuscar />
                        <input type="search" placeholder="Buscar por título en esta página" aria-label="Buscar por título en esta página" value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </label>
                    <label className="contenidos-buscar">
                        <IconoLista />
                        <input type="search" placeholder="Filtrar por tipo exacto (p. ej. Reglamento)" aria-label="Filtrar por tipo exacto" maxLength={80} value={tipo} onChange={(e) => setTipo(e.target.value)} />
                    </label>
                </div>

                <div className="contenidos-tabla ad-tabla-fuentes" tabIndex={0} role="table" aria-label="Fuentes" aria-busy={!actual}>
                    {!actual && <p role="status" className="contenidos-cargando">Cargando fuentes…</p>}
                    <div className="contenidos-tabla__fila contenidos-tabla__fila--titulos" role="row">
                        {["Fuente", "Tipo (origen)", "Versión", "Estado", "Activa", "Acción"].map((t) => <span key={t} role="columnheader">{t}</span>)}
                    </div>
                    {visibles.map((f) => (
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
                    {actual?.items && visibles.length === 0 && (
                        <div className="contenidos-vacio" role="row"><span role="cell"><span className="contenidos-vacio__icono"><IconoLista /></span>
                            <strong>{items.length === 0 ? "No hay fuentes con este filtro" : "Sin resultados en esta página"}</strong>
                            <span>{items.length === 0 ? "El asistente responde únicamente con las fuentes registradas, aprobadas y activas." : "Prueba con otra palabra o pasa de página."}</span></span></div>
                    )}
                </div>

                <div className="contenidos-lista__pie">
                    <p aria-live="polite">Mostrando {visibles.length} de {total} fuentes</p>
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
                        <div className="at-cabecera__textos"><h2 id="fuente-detalle-titulo">{seleccion.tituloFuente}</h2><p>Detalle de la fuente</p></div>
                        <Estado estado={seleccion.estadoFuente} />
                    </div>
                    <Datos>
                        <Dato etiqueta="Tipo (origen)">{seleccion.tipoFuente}</Dato>
                        <Dato etiqueta="Versión">{seleccion.version}</Dato>
                        <Dato etiqueta="Activa">{seleccion.activa ? "Sí, la usa el asistente" : "No"}</Dato>
                        <Dato etiqueta="Aprobación">{seleccion.aprobadaPor ? "Aprobada por un administrador" : "Sin aprobar"}</Dato>
                        <Dato etiqueta="Registrada">{fecha(seleccion.creadaEn)}</Dato>
                        <Dato etiqueta="Última actualización">{fecha(seleccion.actualizadaEn)}</Dato>
                    </Datos>
                    <div className="at-nota"><p className="at-nota__autor">Contenido de referencia</p><p className="comunidad-texto">{seleccion.contenidoReferencia}</p></div>
                    {!aprueba && seleccion.estadoFuente !== "aprobada" && seleccion.estadoFuente !== "retirada" && (
                        <p className="contenidos-nota">La aprobación está reservada al rol administrador.</p>
                    )}
                    <div className="contenidos-previa__acciones">
                        {acciones.includes("aprobar") && <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={guardando} onClick={() => setConfirmando("aprobar")}>Aprobar fuente</button>}
                        {acciones.includes("activar") && <button type="button" className="contenidos-boton contenidos-boton--principal" disabled={guardando} onClick={() => setConfirmando("activar")}>Activar fuente</button>}
                        {acciones.includes("devolver") && <button type="button" className="contenidos-boton contenidos-boton--contorno" disabled={guardando} onClick={() => setConfirmando("devolver")}>Devolver a revisión</button>}
                        {acciones.includes("retirar") && <button type="button" className="contenidos-boton at-boton--guinda" disabled={guardando} onClick={() => setConfirmando("retirar")}>Retirar fuente</button>}
                        <button type="button" className="contenidos-boton contenidos-boton--suave-azul" disabled={guardando} onClick={() => setSeleccion(null)}>Nueva fuente</button>
                    </div>
                </section>
            )}

            {seleccion?.estadoFuente !== "retirada" && (
                <form key={seleccion?.id || "nueva-" + recarga} id="fuente-formulario" className="contenidos-panel comunidad-formulario" onSubmit={guardar} aria-labelledby="fuente-formulario-titulo">
                    <div className="contenidos-lista__cabecera">
                        <span className="contenidos-lista__icono"><IconoLapiz /></span>
                        <div className="at-cabecera__textos">
                            <h2 id="fuente-formulario-titulo">{seleccion ? "Reemplazar con una nueva versión" : "Registrar fuente"}</h2>
                            <p>Se guarda como borrador. No se aprueba ni se activa sola.</p>
                        </div>
                    </div>
                    <fieldset disabled={guardando}>
                        <div className="at-fila">
                            <div className="contenidos-campo">
                                <label htmlFor="fuente-titulo">Título <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                                <input id="fuente-titulo" type="text" name="titulo" defaultValue={seleccion?.tituloFuente} required maxLength={250} />
                            </div>
                            <div className="contenidos-campo">
                                <label htmlFor="fuente-tipo">Tipo (origen) <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                                <input id="fuente-tipo" type="text" name="tipo" defaultValue={seleccion?.tipoFuente} required maxLength={80} placeholder="Ej.: Reglamento, Preguntas frecuentes" />
                            </div>
                        </div>
                        <div className="contenidos-campo">
                            <label htmlFor="fuente-contenido">Contenido de referencia <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                            <textarea id="fuente-contenido" name="contenido" rows={6} defaultValue={seleccion?.contenidoReferencia} required maxLength={50000} aria-describedby="fuente-contenido-ayuda" />
                            <p id="fuente-contenido-ayuda" className="contenidos-campo__ayuda">Texto de hasta 50,000 caracteres. La carga de archivos (PDF o DOCX) todavía no está disponible en el servicio.</p>
                        </div>
                        <button type="submit" className="contenidos-boton contenidos-boton--principal at-alinear-inicio">{guardando ? "Guardando…" : "Guardar borrador"}</button>
                    </fieldset>
                </form>
            )}

            {confirmando && seleccion && (
                <Ventana tono={confirmando === "retirar" || confirmando === "devolver" ? "guinda" : "verde"} icono={confirmando === "retirar" || confirmando === "devolver" ? modalAlerta : modalCheck} angosta
                    titulo={CONFIRMACION[confirmando].titulo} texto={`«${seleccion.tituloFuente}». ${CONFIRMACION[confirmando].texto}`}
                    textoConfirmar={CONFIRMACION[confirmando].boton} alConfirmar={confirmar} alCerrar={() => setConfirmando(null)} />
            )}
        </Pantalla>
    );
}

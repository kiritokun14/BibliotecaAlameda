// Administración › Fuentes del asistente (HU-31; Figma 580:45267 lista, 580:46180 agregar, 580:47460 detalle).
// Conectada a /v1/admin/rag/fuentes (servicios/fuentes.ts). 21 nov 2026: con las piezas del panel (como el Resumen):
// cifras que filtran, lista con filtro segmentado y, al lado (acompaña al bajar), el detalle de la fuente elegida o el formulario.
// Mismo flujo de antes: lista, detalle de la fuente elegida y formulario para registrar o crear una nueva versión.
// El contrato actual guarda texto (no archivos), filtra por estado y tipo, y no ofrece desactivar sin retirar,
// sincronizar ni probar el asistente: esas acciones no se muestran como si existieran.
import { useContext, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Ventana } from "../Ventana";
import { Pantalla } from "../administracion/comun";
import { Aviso, Chip, Cifra, Dato, Datos, Encabezado, Nota, Paginas, Segmentado, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { ContextoPanel } from "../../../servicios/accesoPanel";
import { mensajeError } from "../../../servicios/api";
import { crearFuente, decidirFuente, listarFuentes, type Fuente, type EntradaFuente } from "../../../servicios/fuentes";
import { CONFIRMACION, ESTADO_FUENTE, accionesDisponibles, buscarFuentes, type AccionFuente } from "./reglasFuentes";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";

import { EsqueletoLista } from "../../../components/portal/Esqueleto";
const POR_PAGINA = 10;
const fecha = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "—");

const TONO_FUENTE: Record<string, TonoEstado> = { borrador: "gris", en_revision: "dorado", aprobada: "verde", retirada: "guinda" };
function Estado({ estado }: { estado: string }) {
    return <Chip tono={TONO_FUENTE[estado] ?? "gris"}>{ESTADO_FUENTE[estado]?.texto ?? estado}</Chip>;
}

export default function Fuentes() {
    const id = useId();
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

    const formulario = seleccion?.estadoFuente !== "retirada" && (
        <form key={seleccion?.id || "nueva-" + recarga} className="pz-tarjeta pz-formulario" onSubmit={guardar} aria-labelledby={`${id}-formulario`}>
            <div className="pz-tarjeta__cabecera">
                <span className="pz-tarjeta__icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4.5 19.5 9.5 9 20H4v-5L14.5 4.5Z" /><path d="m12.5 6.5 5 5" /></svg></span>
                <div className="pz-tarjeta__titulos">
                    <h3 id={`${id}-formulario`}>{seleccion ? "Nueva versión de esta fuente" : "Registrar una fuente"}</h3>
                    <p className="pz-tarjeta__texto">Se guarda como borrador; no se aprueba ni se activa sola</p>
                </div>
            </div>
            <fieldset disabled={guardando}>
                <div className="contenidos-campo">
                    <label htmlFor="fuente-titulo">Título <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                    <input id="fuente-titulo" type="text" name="titulo" defaultValue={seleccion?.tituloFuente} required maxLength={250} />
                </div>
                <div className="contenidos-campo">
                    <label htmlFor="fuente-tipo">Tipo (origen) <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                    <input id="fuente-tipo" type="text" name="tipo" defaultValue={seleccion?.tipoFuente} required maxLength={80} placeholder="Ej.: Reglamento, Preguntas frecuentes" />
                </div>
                <div className="contenidos-campo">
                    <label htmlFor="fuente-contenido">Contenido de referencia <span className="contenidos-campo__obligatorio" aria-label="obligatorio">*</span></label>
                    <textarea id="fuente-contenido" name="contenido" rows={6} defaultValue={seleccion?.contenidoReferencia} required maxLength={50000} aria-describedby="fuente-contenido-ayuda" />
                    <p id="fuente-contenido-ayuda" className="contenidos-campo__ayuda">Hasta 50,000 caracteres. La carga de archivos (PDF o DOCX) todavía no está disponible.</p>
                </div>
                <button type="submit" className="pz-boton">{guardando ? "Guardando…" : "Guardar borrador"}</button>
            </fieldset>
        </form>
    );

    return (
        <Pantalla migas={[["Fuentes del asistente"]]}>
            <div className="pz-pagina">
                <Encabezado titulo="Fuentes del asistente" texto="El asistente solo responde con fuentes aprobadas y activas. Registrar o aprobar una fuente no la activa.">
                    <Cifra icono="check" valor={enPagina((f) => f.activa)} texto="activas" />
                    <Cifra icono="reloj" valor={enPagina((f) => f.estadoFuente === "en_revision" || f.estadoFuente === "borrador")} texto="por aprobar" activa={estado === "en_revision"} alPresionar={() => elegirEstado(estado === "en_revision" ? "" : "en_revision")} />
                    <Cifra icono="alerta" tono="vino" valor={enPagina((f) => f.estadoFuente === "retirada")} texto="retiradas" activa={estado === "retirada"} alPresionar={() => elegirEstado(estado === "retirada" ? "" : "retirada")} />
                </Encabezado>

                {aviso && <Aviso titulo={aviso} />}
                {error && <Aviso tono="error" titulo="No se pudo completar." texto={error} />}

                <div className="pz-columnas pz-columnas--libre">
                    <Tarjeta icono="fuentes" id={`${id}-lista`} titulo="Fuentes registradas" texto="Elige una para ver su contenido y sus acciones"
                        accion={<>
                            <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setRecarga((x) => x + 1); setSeleccion(null); }}>Actualizar</button>
                            <button type="button" className="pz-boton pz-boton--chico" onClick={() => setSeleccion(null)}>Agregar fuente</button>
                        </>}>
                        <Segmentado etiqueta="Filtrar por estado" valor={estado} alCambiar={elegirEstado}
                            opciones={[{ valor: "", texto: "Todas" }, ...Object.entries(ESTADO_FUENTE).map(([valor, e]) => ({ valor, texto: e.texto }))]} />
                        <div className="pz-campos-fila">
                            <label className="pz-campo pz-campo--lleno"><span>Buscar por título</span><input type="search" placeholder="En esta página" value={texto} onChange={(e) => setTexto(e.target.value)} /></label>
                            <label className="pz-campo pz-campo--lleno"><span>Tipo exacto</span><input type="search" placeholder="Ej.: Reglamento" maxLength={80} value={tipo} onChange={(e) => setTipo(e.target.value)} /></label>
                        </div>

                        {!actual && <EsqueletoLista texto="Cargando fuentes…" />}
                        {actual?.error && <Aviso tono="error" titulo="No se pudieron cargar las fuentes." texto={actual.error} />}
                        {actual?.items && (visibles.length === 0 ? (
                            <Vacio icono="fuentes" titulo={items.length === 0 ? "No hay fuentes con este filtro" : "Sin resultados en esta página"}
                                texto={items.length === 0 ? "El asistente responde únicamente con las fuentes registradas, aprobadas y activas." : "Prueba con otra palabra o pasa de página."} />
                        ) : (
                            <ul className="pz-filas" aria-busy={!actual}>
                                {visibles.map((f) => (
                                    <li key={f.id}>
                                        <article className={`pz-fila${seleccion?.id === f.id ? " pz-fila--elegida" : ""}`}>
                                            <span className="pz-fila__icono" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" /><path d="M5 17a3 3 0 0 1 3-3h10M9 8.5h5" /></svg></span>
                                            <div className="pz-fila__textos">
                                                <h4 className="pz-fila__titulo">{f.tituloFuente}</h4>
                                                <p className="pz-fila__detalle"><span>{f.tipoFuente}</span><span>Versión {f.version}</span><span className="pz-fila__folio">{f.activa ? "La usa el asistente" : "No activa"}</span></p>
                                            </div>
                                            <Estado estado={f.estadoFuente} />
                                            <button type="button" className={`pz-boton pz-boton--chico${seleccion?.id === f.id ? "" : " pz-boton--contorno"}`} disabled={guardando} aria-pressed={seleccion?.id === f.id} onClick={() => setSeleccion(f)}>
                                                {seleccion?.id === f.id ? "Abierta" : "Abrir"}<span className="solo-lectores"> {f.tituloFuente}</span>
                                            </button>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        ))}

                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{visibles.length} de {total} fuentes</p>
                            <Paginas pagina={pagina} paginas={paginas} bloqueada={!actual || guardando} alCambiar={(p) => { setPagina(p); setSeleccion(null); }} />
                        </div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label={seleccion ? "Detalle de la fuente" : "Registrar una fuente"}>
                        {seleccion && (
                            <Tarjeta icono="fuentes" id={`${id}-detalle`} titulo={seleccion.tituloFuente} texto="Detalle de la fuente" accion={<Estado estado={seleccion.estadoFuente} />}>
                                <Datos>
                                    <Dato etiqueta="Tipo (origen)">{seleccion.tipoFuente}</Dato>
                                    <Dato etiqueta="Versión">{seleccion.version}</Dato>
                                    <Dato etiqueta="Activa" ancho>{seleccion.activa ? "Sí, la usa el asistente" : "No"}</Dato>
                                    <Dato etiqueta="Aprobación" ancho>{seleccion.aprobadaPor ? "Aprobada por un administrador" : "Sin aprobar"}</Dato>
                                    <Dato etiqueta="Registrada">{fecha(seleccion.creadaEn)}</Dato>
                                    <Dato etiqueta="Actualizada">{fecha(seleccion.actualizadaEn)}</Dato>
                                </Datos>
                                <Nota titulo="Contenido de referencia"><div className="pz-nota__desplazable">{seleccion.contenidoReferencia}</div></Nota>
                                {!aprueba && seleccion.estadoFuente !== "aprobada" && seleccion.estadoFuente !== "retirada" && (
                                    <p className="pz-acciones__nota">La aprobación está reservada al rol administrador.</p>
                                )}
                                <div className="pz-acciones">
                                    {acciones.includes("aprobar") && <button type="button" className="pz-boton" disabled={guardando} onClick={() => setConfirmando("aprobar")}>Aprobar fuente</button>}
                                    {acciones.includes("activar") && <button type="button" className="pz-boton" disabled={guardando} onClick={() => setConfirmando("activar")}>Activar fuente</button>}
                                    {acciones.includes("devolver") && <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando} onClick={() => setConfirmando("devolver")}>Devolver a revisión</button>}
                                    {acciones.includes("retirar") && <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" disabled={guardando} onClick={() => setConfirmando("retirar")}>Retirar fuente</button>}
                                    <button type="button" className="pz-boton pz-boton--contorno" disabled={guardando} onClick={() => setSeleccion(null)}>Cerrar y registrar otra</button>
                                </div>
                            </Tarjeta>
                        )}
                        {formulario}
                    </aside>
                </div>
            </div>

            {confirmando && seleccion && (
                <Ventana tono={confirmando === "retirar" || confirmando === "devolver" ? "guinda" : "verde"} icono={confirmando === "retirar" || confirmando === "devolver" ? modalAlerta : modalCheck} angosta
                    titulo={CONFIRMACION[confirmando].titulo} texto={`${seleccion.tituloFuente}. ${CONFIRMACION[confirmando].texto}`}
                    textoConfirmar={CONFIRMACION[confirmando].boton} alConfirmar={confirmar} alCerrar={() => setConfirmando(null)} />
            )}
        </Pantalla>
    );
}

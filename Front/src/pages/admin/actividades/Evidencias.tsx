// Actividades › Evidencias privadas (datos reales: servicios/evidencias.ts → Back/evidencias.py).
// Lista (Figma 570:28876), subir (570:29352), detalle (570:30676), acceso restringido (570:31428) y resultados.
// Diseño común del panel (docs/guia-diseno.md). Para que abra rápido: usa las piezas que el panel ya tiene cargadas
// y recuerda la última respuesta de cada consulta (se muestra al instante y se actualiza en segundo plano).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { AvisoResultado, Chip, EncabezadoPagina, EstadoVacio, Migas, Tarjeta } from "../componentes";
import { Ventana } from "../Ventana";
import { IconoAviso, IconoBandera, IconoDocumento, IconoLista, IconoMas } from "../contenidos/piezas";
import { paginar } from "../contenidoDemo/utiles";
import {
    aEvidencia, aEvidenciaCompleta, CLAVE_LISTA, CLAVE_SESIONES, claveEvidencia, fechaLocal, horaDe, NOMBRE_ACCESO, revisarArchivo, TIPO_API, TIPOS_EVIDENCIA,
    type Acceso, type Evidencia, type EvidenciaCompleta, type TipoEvidencia,
} from "./evidencias";
import { mensajeError } from "../../../servicios/api";
import { consultarConMemoria, enMemoria } from "../../../servicios/consultas";
import { diaLocal, hoyLocal } from "../../../servicios/espacios";
import {
    cambiarAccesoEvidencia, descargarEvidencia, listarEvidencias, listarSesionesEvidencia, obtenerEvidenciaApi, retirarEvidenciaApi,
    solicitarAccesoEvidencia, subirEvidenciaApi, type EvidenciaDetalle, type EvidenciaResumen, type SesionEvidencia,
} from "../../../servicios/evidencias";
import { AccesosRapidos, CargandoFilas, CeldaDoble, ControlesLista, CuerpoLista, FILAS_POR_PAGINA, PieLista, SeccionLista, TablaLista } from "./PiezasLista";
import iconoAviso from "../../../assets/admin/actividades/aviso-ojo.svg";
import tarjetaInfo from "../../../assets/admin/tarjeta-info.svg";
import tarjetaClock from "../../../assets/admin/tarjeta-clock.svg";
import tarjetaCheck from "../../../assets/admin/tarjeta-check.svg";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

const BASE = "/admin/actividades/evidencias";
type Filtro = "todas" | TipoEvidencia;

// Consulta con memoria: si ya se pidió antes, se muestra lo guardado mientras llega la respuesta nueva
function useCarga<T>(clave: string, cargar: () => Promise<T>) {
    const [estado, setEstado] = useState<{ clave: string; datos?: T; error?: string } | null>(null);
    const [intento, setIntento] = useState(0);
    const ultima = useRef(cargar);
    useEffect(() => { ultima.current = cargar; });
    useEffect(() => {
        let vigente = true;
        consultarConMemoria(clave, () => ultima.current())
            .then((datos) => { if (vigente) setEstado({ clave, datos }); }, (e) => { if (vigente) setEstado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, intento]);
    const actual = estado?.clave === clave ? estado : null;
    const guardada = actual ? undefined : enMemoria<T>(clave);
    return {
        datos: actual?.datos ?? guardada,
        error: actual?.error,
        cargando: !actual && guardada === undefined,
        reintentar: () => { setEstado(null); setIntento((x) => x + 1); },
    };
}

function AvisoPrivado() {
    return (
        <p className="ac-privado" role="note">
            <img src={iconoAviso} alt="" />
            Estas evidencias son privadas: solo las ve el personal autorizado. No se publican en el portal y cada consulta queda registrada.
        </p>
    );
}

const chipAcceso = (e: Evidencia) => (e.retirada ? <Chip tono="gris">Retirada</Chip> : e.puedeVer ? <Chip tono="dorado">{e.acceso === "coordinacion" ? "Coordinación" : "Personal"}</Chip> : <Chip tono="guinda">Restringida</Chip>);

function ErrorCarga({ error, reintentar }: { error?: string; reintentar: () => void }) {
    return <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar las evidencias" texto={error ?? "Inténtalo de nuevo."} accion={{ texto: "Reintentar", alPresionar: reintentar }} />;
}

// ---------- Lista ----------
function Evidencias() {
    const carga = useCarga<EvidenciaResumen[]>(CLAVE_LISTA, listarEvidencias);
    const evidencias = (carga.datos ?? []).map(aEvidencia).filter((e) => !e.retirada);
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [accesoFiltro, setAccesoFiltro] = useState("");
    const [pagina, setPagina] = useState(0);
    const texto = busqueda.trim().toLowerCase();
    const mes = hoyLocal().slice(0, 7);
    const filtradas = evidencias.filter((e) => (filtro === "todas" || e.tipo === filtro) && (!accesoFiltro || (accesoFiltro === "restringida" ? !e.puedeVer : e.puedeVer && e.acceso === accesoFiltro)) && (!texto || e.folio.toLowerCase().includes(texto) || e.actividadTexto.toLowerCase().includes(texto))).sort((a, b) => b.folio.localeCompare(a.folio));
    const { paginas, actual, visibles } = paginar(filtradas, pagina, FILAS_POR_PAGINA);
    const cuenta = (t: TipoEvidencia) => evidencias.filter((e) => e.tipo === t).length;
    const elegir = (f: Filtro) => { setFiltro(f); setPagina(0); };
    const limpiar = () => { setBusqueda(""); setAccesoFiltro(""); elegir("todas"); };
    const restringidas = evidencias.filter((e) => !e.puedeVer).length;
    const delMes = evidencias.filter((e) => diaLocal(e.fecha).slice(0, 7) === mes).length;

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas"]]} />
            <EncabezadoPagina etiqueta="Actividades · Evidencias" titulo="Evidencias privadas"
                texto="Fotos, listas firmadas e informes que respaldan las actividades. Solo las ve el personal autorizado."
                accion={<Link className="contenidos-boton contenidos-boton--oscuro" to={`${BASE}/subir`}>Subir evidencia</Link>} />
            <AccesosRapidos accesos={[
                { clave: "guardadas", icono: <IconoDocumento />, cifra: carga.cargando ? "…" : evidencias.length, titulo: "Guardadas", texto: "Archivos disponibles.", enlace: "Ver todas", tono: "azul", activo: filtro === "todas" && !texto, alPresionar: () => { setBusqueda(""); elegir("todas"); } },
                { clave: "mes", icono: <IconoBandera />, cifra: carga.cargando ? "…" : delMes, titulo: "Subidas este mes", texto: "Listas, fotos e informes.", enlace: "Subir otra", tono: "gris", alPresionar: () => navigate(`${BASE}/subir`) },
                { clave: "restringidas", icono: <IconoAviso />, cifra: carga.cargando ? "…" : restringidas, titulo: "Con acceso restringido", texto: "Solo Coordinación puede abrirlas.", tono: "guinda" },
            ]} />
            <AvisoPrivado />

            <ControlesLista
                etiqueta="Filtros de evidencias"
                chips={{ etiqueta: "Tipo de evidencia", activa: filtro, alElegir: elegir, opciones: [
                    { valor: "todas" as Filtro, texto: `Todas (${evidencias.length})` },
                    { valor: "Fotografía" as Filtro, texto: `Fotografías (${cuenta("Fotografía")})` },
                    { valor: "Lista firmada" as Filtro, texto: `Listas firmadas (${cuenta("Lista firmada")})` },
                    { valor: "Informe" as Filtro, texto: `Informes (${cuenta("Informe")})` },
                ] }}
                busqueda={{ etiqueta: "Buscar por actividad o folio", marcador: "Actividad o folio…", texto: busqueda, alBuscar: (v) => { setBusqueda(v); setPagina(0); } }}
                grupos={[{ etiqueta: "Quién puede verla", opciones: [{ valor: "", texto: "Cualquier acceso" }, { valor: "personal", texto: "Personal autorizado" }, { valor: "coordinacion", texto: "Solo Coordinación" }, { valor: "restringida", texto: "Restringidas para mí" }], activa: accesoFiltro, alElegir: (v) => { setAccesoFiltro(v); setPagina(0); } }]}
                alLimpiar={limpiar}
            />

            <SeccionLista
                id="evidencias-lista"
                icono={<IconoLista />}
                titulo="Evidencias guardadas"
                texto="Más recientes primero."
            >
                <CuerpoLista>
                {carga.cargando ? (
                    <CargandoFilas texto="Cargando evidencias…" />
                ) : carga.error && !carga.datos ? (
                    <ErrorCarga error={carga.error} reintentar={carga.reintentar} />
                ) : evidencias.length === 0 ? (
                    <EstadoVacio icono={vacioCheck} titulo="Aún no hay evidencias" texto="Sube la primera lista firmada, foto o informe de una actividad." accion={{ texto: "Subir evidencia", alPresionar: () => navigate(`${BASE}/subir`) }} />
                ) : visibles.length === 0 ? (
                    <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay evidencias con estos filtros"} texto="Prueba con otra palabra o quita los filtros." accion={{ texto: "Quitar filtros", alPresionar: limpiar }} />
                ) : (
                    <TablaLista
                        clase="ac-tabla--evidencias"
                        etiqueta="Evidencias guardadas"
                        filas={visibles}
                        clave={(e) => e.folio}
                        columnas={[
                            { titulo: "Folio", folio: true, celda: (e) => e.folio },
                            { titulo: "Actividad", celda: (e) => <CeldaDoble arriba={e.actividadTexto} abajo={e.tipo} /> },
                            { titulo: "Subió", celda: (e) => <CeldaDoble arriba={e.subio} abajo={fechaLocal(e.fecha)} /> },
                            { titulo: "Acceso", celda: chipAcceso },
                            { titulo: "Acción", celda: (e) => <Link to={`${BASE}/${e.folio}`} className="contenidos-tabla__accion">{e.puedeVer ? "Abrir" : "Pedir acceso"}<span className="tr-oculto"> {e.folio}</span></Link> },
                        ]}
                    />
                )}
                </CuerpoLista>
                {filtradas.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${filtradas.length} evidencias`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
            </SeccionLista>
        </PanelLayout>
    );
}

// ---------- Subir evidencia (Figma 570:29352) y error al subir (570:29801) ----------
export function SubirEvidencia() {
    const navigate = useNavigate();
    const carga = useCarga<SesionEvidencia[]>(CLAVE_SESIONES, listarSesionesEvidencia);
    const sesiones = carga.datos ?? [];
    const [elegida, setElegida] = useState("");
    const [tipo, setTipo] = useState<TipoEvidencia>("Lista firmada");
    const [archivo, setArchivo] = useState<File | null>(null);
    const [problema, setProblema] = useState("");
    const [nota, setNota] = useState("");
    const [acceso, setAcceso] = useState<Acceso>("personal");
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);
    const sesionId = elegida || sesiones[0]?.sesionId || "";
    const tamano = (f: File) => Math.round((f.size / (1024 * 1024)) * 10) / 10 || 0.1;

    function elegirArchivo(f: File | undefined) {
        if (!f) return;
        setArchivo(f);
        setProblema(revisarArchivo(f) ?? "");
        setErrores((x) => ({ ...x, archivo: "" }));
    }

    async function guardar() {
        const e: Record<string, string> = {};
        if (!sesionId) e.actividad = "Elige la actividad.";
        if (!archivo) e.archivo = "Elige el archivo.";
        if (nota.trim().length > 500) e.nota = "La nota admite hasta 500 caracteres.";
        setErrores(e);
        if (Object.keys(e).length || problema || guardando) return;
        setGuardando(true);
        try {
            const r = await subirEvidenciaApi({ sesionId, tipo: TIPO_API[tipo], acceso, nota, archivo: archivo! });
            navigate(`${BASE}/${r.folio}/guardada`, { state: r });
        } catch (error) {
            setProblema(mensajeError(error));
        } finally {
            setGuardando(false);
        }
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], ["Subir evidencia"]]} />
            <EncabezadoPagina volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta="Actividades · Evidencias" titulo="Subir evidencia" texto="Respalda una actividad con un archivo privado." />
            {problema && <AvisoResultado tono="error" titulo="No se pudo subir el archivo" texto={problema} chip="Error" />}

            <div className="contenidos-formulario">
                <div className="at-columna">
                    <Tarjeta icono={tarjetaInfo} titulo="Archivo" subtitulo="PDF, JPG o PNG de hasta 10 MB.">
                        <label className={`ac-archivo${problema || errores.archivo ? " ac-archivo--error" : ""}${archivo && !problema ? " ac-archivo--listo" : ""}`}>
                            <input type="file" className="tr-oculto" accept="application/pdf,image/jpeg,image/png" aria-describedby="ev-archivo-ayuda"
                                onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
                            <span className="ac-archivo__icono" aria-hidden="true"><IconoMas /></span>
                            <strong>{archivo ? archivo.name : "Elige el archivo"}</strong>
                            <small id="ev-archivo-ayuda">{archivo ? `${tamano(archivo)} MB · haz clic para cambiarlo` : "Haz clic aquí para buscarlo en tu equipo"}</small>
                        </label>
                        {errores.archivo && <p className="contenidos-campo__error" role="alert">{errores.archivo}</p>}
                        <div className="contenidos-campo">
                            <label htmlFor="ev-nota">Nota (opcional)</label>
                            <textarea id="ev-nota" rows={3} maxLength={500} placeholder="Ej.: lista firmada por las personas asistentes." value={nota} onChange={(e) => setNota(e.target.value)} />
                            {errores.nota && <p className="contenidos-campo__error" role="alert">{errores.nota}</p>}
                        </div>
                    </Tarjeta>
                </div>
                <aside className="contenidos-formulario__lateral">
                    <Tarjeta icono={tarjetaCheck} titulo="Datos de la evidencia" subtitulo="A qué actividad pertenece y quién la ve.">
                        <fieldset className="tr-campos" disabled={guardando}>
                            <div className="contenidos-campo">
                                <label htmlFor="ev-actividad">Actividad <span className="contenidos-campo__obligatorio">*</span></label>
                                <select id="ev-actividad" value={sesionId} onChange={(e) => setElegida(e.target.value)} disabled={carga.cargando} aria-invalid={!!errores.actividad}>
                                    {carga.cargando && <option value="">Cargando actividades…</option>}
                                    {!carga.cargando && sesiones.length === 0 && <option value="">No hay actividades realizadas a tu cargo</option>}
                                    {sesiones.map((x) => (
                                        <option key={x.sesionId} value={x.sesionId}>{x.titulo} · {fechaLocal(x.inicio)} {horaDe(x.inicio)}{x.estado === "cancelada" ? " (cancelada)" : ""}</option>
                                    ))}
                                </select>
                                {(errores.actividad || carga.error) && <p className="contenidos-campo__error" role="alert">{errores.actividad || carga.error}</p>}
                            </div>
                            <div className="contenidos-campo">
                                <label htmlFor="ev-tipo">Tipo de evidencia</label>
                                <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Tipo de evidencia">
                                    {TIPOS_EVIDENCIA.map((t) => (
                                        <label key={t} className={`contenidos-filtro${tipo === t ? " contenidos-filtro--activo" : ""}`}>
                                            <input id={t === tipo ? "ev-tipo" : undefined} type="radio" name="ev-tipo" className="tr-oculto" checked={tipo === t} onChange={() => setTipo(t)} />{t}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="contenidos-campo">
                                <label htmlFor="ev-acceso">Quién puede verla</label>
                                <select id="ev-acceso" value={acceso} onChange={(e) => setAcceso(e.target.value as Acceso)}>
                                    <option value="personal">{NOMBRE_ACCESO.personal}</option>
                                    <option value="coordinacion">{NOMBRE_ACCESO.coordinacion}</option>
                                </select>
                                <p className="contenidos-campo__ayuda">No se publica en el portal.</p>
                            </div>
                        </fieldset>
                    </Tarjeta>
                    <div className="tr-acciones">
                        <button type="button" className="contenidos-boton contenidos-boton--oscuro" onClick={() => { setProblema(""); void guardar(); }} disabled={guardando || (!!problema && !!archivo && !!revisarArchivo(archivo))}>
                            {guardando ? "Guardando…" : problema ? "Intentar de nuevo" : "Guardar evidencia"}
                        </button>
                        <Link to={BASE} className="contenidos-boton contenidos-boton--contorno">Cancelar</Link>
                    </div>
                </aside>
            </div>
        </PanelLayout>
    );
}

// ---------- Detalle (570:30676) con descargar, cambiar acceso y retirar; sin permiso: acceso restringido (570:31428) ----------
export function DetalleEvidencia() {
    const { folio = "" } = useParams();
    const navigate = useNavigate();
    const carga = useCarga<EvidenciaDetalle>(claveEvidencia(folio), () => obtenerEvidenciaApi(folio));
    const [cambio, setCambio] = useState<EvidenciaCompleta | null>(null);
    const [ventana, setVentana] = useState<null | "descargar" | "acceso" | "retirar">(null);
    const [acceso, setAcceso] = useState<Acceso>("coordinacion");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const e = cambio?.folio === folio ? cambio : carga.datos ? aEvidenciaCompleta(carga.datos) : undefined;
    const ruta = `${BASE}/${folio}`;
    const volver = { texto: "Volver a Evidencias privadas", ruta: BASE };

    if (!e) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos paleta">
                <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [folio]]} />
                <EncabezadoPagina volver={volver} etiqueta={`Evidencia ${folio}`} titulo="Evidencia" texto="Detalle de la evidencia privada." />
                {carga.cargando ? <CargandoFilas texto="Cargando evidencia…" filas={3} /> : <ErrorCarga error={carga.error} reintentar={carga.reintentar} />}
            </PanelLayout>
        );
    }

    async function ejecutar(accion: () => Promise<EvidenciaDetalle>, despues?: (r: EvidenciaDetalle) => void) {
        if (ocupado) return;
        setOcupado(true);
        setError("");
        try {
            const r = await accion();
            setCambio(aEvidenciaCompleta(r));
            if (despues) despues(r);
            else setVentana(null);
        } catch (x) {
            setError(mensajeError(x));
        } finally {
            setOcupado(false);
        }
    }

    if (!e.puedeVer) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos paleta">
                <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], ["Acceso restringido"]]} />
                <EncabezadoPagina volver={volver} etiqueta={`Evidencia ${e.folio}`} titulo="Acceso restringido" texto="Esta evidencia no está disponible con tu cuenta." />
                <AvisoResultado tono={e.solicitada ? "espera" : "error"} titulo={e.solicitada ? "Ya pediste acceso" : "No tienes permiso para abrirla"}
                    texto={e.solicitada ? "Coordinación verá tu solicitud en el registro de la evidencia." : "Solo Coordinación y Administración pueden verla. Puedes pedir acceso."}
                    chip={e.solicitada ? "En revisión" : "Restringida"} />
                {error && <div className="at-bloque at-bloque--error" role="alert"><strong>No se pudo pedir acceso</strong><p>{error}</p></div>}
                <div className="tr-acciones">
                    {!e.solicitada && <button type="button" className="contenidos-boton contenidos-boton--oscuro" disabled={ocupado} onClick={() => ejecutar(() => solicitarAccesoEvidencia(e.folio), (r) => navigate(`${ruta}/solicitado`, { state: r }))}>Pedir acceso</button>}
                    <Link to={BASE} className="contenidos-boton contenidos-boton--contorno">Volver a Evidencias privadas</Link>
                </div>
            </PanelLayout>
        );
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [e.folio]]} />
            <EncabezadoPagina volver={volver} etiqueta={`Evidencia ${e.folio}`} titulo={`${e.tipo} · ${e.actividadTexto.split(" · ")[0]}`}
                texto={`Subida por ${e.subio} el ${fechaLocal(e.fecha)}.`} accion={chipAcceso(e)} />
            <AvisoPrivado />

            <div className="contenidos-formulario">
                <div className="at-columna">
                    <Tarjeta icono={tarjetaInfo} titulo="Datos del archivo">
                        <div className="tr-datos">
                            <div className="tr-datos__clave">
                                <div><span>Tipo</span><strong>{e.tipo}</strong></div>
                                <div><span>Tamaño</span><strong>{e.tamano} MB</strong></div>
                                <div><span>Acceso</span><strong>{e.acceso === "coordinacion" ? "Coordinación" : "Personal"}</strong></div>
                            </div>
                            <dl className="tr-datos__filas">
                                <div><dt>Archivo</dt><dd>{e.archivo || "—"}</dd></div>
                                <div><dt>Actividad</dt><dd>{e.actividadTexto}{e.actividad ? ` · ${e.actividad}` : ""}</dd></div>
                                <div><dt>Quién puede verla</dt><dd>{NOMBRE_ACCESO[e.acceso]}</dd></div>
                                {e.retiro && <div><dt>Retirada</dt><dd>{fechaLocal(e.retiro.fecha)} · {e.retiro.motivo}</dd></div>}
                            </dl>
                            <div className="tr-datos__bloque"><p className="at-subtitulo">Nota</p><p className="tr-datos__texto">{e.nota || "Sin nota."}</p></div>
                            <p className="tr-datos__folio">Folio: <span>{e.folio}</span></p>
                        </div>
                    </Tarjeta>
                </div>

                <aside className="contenidos-formulario__lateral tr-lateral">
                    {!e.retirada && (
                        <Tarjeta variante="decision" icono={tarjetaCheck} titulo="Acciones" subtitulo="Todo queda registrado con tu nombre.">
                            <button type="button" className="contenidos-boton contenidos-boton--ancho contenidos-boton--oscuro" onClick={() => { setError(""); setVentana("descargar"); }}>Descargar archivo</button>
                            <button type="button" className="contenidos-boton contenidos-boton--ancho contenidos-boton--contorno" onClick={() => { setError(""); setAcceso(e.acceso === "personal" ? "coordinacion" : "personal"); setVentana("acceso"); }}>Cambiar quién la ve</button>
                            <button type="button" className="contenidos-boton contenidos-boton--ancho at-boton--guinda" onClick={() => { setMotivo(""); setError(""); setVentana("retirar"); }}>Retirar evidencia</button>
                            {error && !ventana && <div className="at-bloque at-bloque--error" role="alert"><strong>No se guardó</strong><p>{error}</p></div>}
                        </Tarjeta>
                    )}
                    <Tarjeta icono={tarjetaClock} titulo="Quién la ha consultado" subtitulo={`${e.consultas.length} ${e.consultas.length === 1 ? "registro" : "registros"}.`} className="tr-seguimiento">
                        {e.consultas.length ? (
                            <ol className="tr-eventos" tabIndex={0} aria-label="Registro de consultas">
                                {e.consultas.map((c, i) => (
                                    <li key={c.fecha + c.accion + c.persona} className={i === e.consultas.length - 1 ? "tr-eventos--ultimo" : "tr-eventos--hecho"}>
                                        <strong>{c.accion}</strong><small>{c.persona} · {fechaLocal(c.fecha)}, {horaDe(c.fecha)}</small>
                                    </li>
                                ))}
                            </ol>
                        ) : <p className="contenidos-campo__ayuda">Nadie la ha consultado todavía.</p>}
                    </Tarjeta>
                </aside>
            </div>

            {ventana === "descargar" && (
                <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Descargar la evidencia?"
                    texto={`${e.archivo} · ${e.tamano} MB. La descarga queda registrada con tu nombre y la fecha. No la compartas fuera del equipo autorizado.`}
                    textoConfirmar={ocupado ? "Descargando…" : "Descargar"} ocupada={ocupado} error={error}
                    alConfirmar={() => ejecutar(async () => { await descargarEvidencia(e.folio, e.archivo || e.folio); return obtenerEvidenciaApi(e.folio); })}
                    alCerrar={() => setVentana(null)} />
            )}
            {ventana === "acceso" && (
                <Ventana tono="dorado" icono={modalInfo} titulo="Cambiar quién la ve"
                    texto={`Ahora: ${NOMBRE_ACCESO[e.acceso]}. Aplica de inmediato; si eliges Coordinación y no tienes ese permiso, dejarás de verla.`}
                    textoConfirmar="Guardar acceso" ocupada={ocupado} error={error}
                    alConfirmar={() => ejecutar(() => cambiarAccesoEvidencia(e.folio, acceso))}
                    alCerrar={() => setVentana(null)}>
                    <div className="contenidos-filtros tr-decisiones" role="radiogroup" aria-label="Nuevo acceso">
                        {(["personal", "coordinacion"] as const).map((op) => (
                            <label key={op} className={`contenidos-filtro${acceso === op ? " contenidos-filtro--activo" : ""}`}>
                                <input type="radio" name="ev-nuevo-acceso" className="tr-oculto" checked={acceso === op} onChange={() => setAcceso(op)} />{NOMBRE_ACCESO[op]}
                            </label>
                        ))}
                    </div>
                </Ventana>
            )}
            {ventana === "retirar" && (
                <Ventana tono="guinda" icono={modalAlerta} titulo="¿Retirar la evidencia?"
                    texto="Dejará de estar disponible para el personal. El archivo y el registro de consultas se conservan en privado."
                    textoConfirmar="Retirar evidencia" ocupada={ocupado} error={error}
                    alConfirmar={() => { if (!motivo.trim()) return setError("Escribe el motivo."); ejecutar(() => retirarEvidenciaApi(e.folio, motivo), (r) => navigate(`${ruta}/retirada`, { state: r })); }}
                    alCerrar={() => setVentana(null)}>
                    <div className="contenidos-campo">
                        <label htmlFor="ev-motivo">Motivo <span className="contenidos-campo__obligatorio">*</span></label>
                        <textarea id="ev-motivo" rows={3} maxLength={300} placeholder="Ej.: se subió por error." value={motivo} aria-invalid={!!error} onChange={(x) => { setMotivo(x.target.value); setError(""); }} />
                    </div>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// ---------- Resultados: guardada (570:30261), acceso solicitado (570:31848), retirada (627:51773) ----------
// Usan la respuesta de la acción anterior; si se abre la dirección directo, se consulta la evidencia.
export function ResultadoEvidencia({ tipo }: { tipo: "guardada" | "solicitado" | "retirada" }) {
    const { folio = "" } = useParams();
    const recibido = useLocation().state as EvidenciaDetalle | null;
    const carga = useCarga<EvidenciaDetalle>(`resultado:${claveEvidencia(folio)}`, () => (recibido?.folio === folio ? Promise.resolve(recibido) : obtenerEvidenciaApi(folio)));
    const datosRecibidos = recibido?.folio === folio ? recibido : carga.datos;
    if (!datosRecibidos) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos paleta">
                <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [folio]]} />
                {carga.cargando ? <CargandoFilas texto="Cargando evidencia…" filas={2} /> : <ErrorCarga error={carga.error} reintentar={carga.reintentar} />}
            </PanelLayout>
        );
    }
    const e = aEvidenciaCompleta(datosRecibidos);
    const datos = {
        guardada: { titulo: "Evidencia guardada", texto: "Quedó guardada en privado. No se publica en el portal.", tono: "exito" as const, linea: `${e.archivo} · ${e.tamano} MB · ${NOMBRE_ACCESO[e.acceso]}`, chip: "Privada" },
        solicitado: { titulo: "Acceso solicitado", texto: "Coordinación revisará tu solicitud.", tono: "espera" as const, linea: "Tu solicitud quedó en el registro de la evidencia.", chip: "En revisión" },
        retirada: { titulo: "Evidencia retirada", texto: "Ya no está disponible para el personal. El registro se conserva.", tono: "error" as const, linea: `Motivo: ${e.retiro?.motivo ?? ""}`, chip: "Retirada" },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [datos.titulo]]} />
            <EncabezadoPagina etiqueta={`Evidencia ${e.folio}`} titulo={datos.titulo} texto={datos.texto} />
            <AvisoResultado tono={datos.tono} titulo={`${e.tipo} · ${e.actividadTexto}`} texto={datos.linea} chip={datos.chip} />
            <div className="tr-acciones">
                <Link to={BASE} className="contenidos-boton contenidos-boton--oscuro">Volver a Evidencias privadas</Link>
                {tipo === "guardada" && <Link to={`${BASE}/subir`} className="contenidos-boton contenidos-boton--contorno">Subir otra evidencia</Link>}
                {tipo === "guardada" && <Link to={`${BASE}/${e.folio}`} className="contenidos-boton contenidos-boton--contorno">Ver la evidencia</Link>}
            </div>
        </PanelLayout>
    );
}

export default Evidencias;

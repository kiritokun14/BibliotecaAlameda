// Actividades › Evidencias privadas (datos reales: servicios/evidencias.ts → Back/evidencias.py).
// Lista (Figma 570:28876), subir (570:29352), detalle (570:30676), acceso restringido (570:31428) y resultados.
// Rehecho con las piezas del panel (22 nov 2026). Para que abra rápido: usa las piezas que el panel ya tiene cargadas
// y recuerda la última respuesta de cada consulta (se muestra al instante y se actualiza en segundo plano).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Ventana } from "../Ventana";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Historial, Icono, Nota, Segmentado, Tarjeta, Vacio, type NombreIcono } from "../piezasPanel";
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
import { CargandoFilas } from "./PiezasLista";
import modalCheck from "../../../assets/admin/modal-check.svg";
import modalInfo from "../../../assets/admin/modal-info.svg";
import modalAlerta from "../../../assets/admin/modal-alert.svg";

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


const ICONO_TIPO: Record<TipoEvidencia, NombreIcono> = { Fotografía: "evidencias", "Lista firmada": "asistencia", Informe: "contenido" };

function AvisoPrivado() {
    return (
        <Nota titulo="Son privadas">Solo las ve el personal autorizado. No se publican en el portal y cada consulta queda registrada.</Nota>
    );
}

const chipAcceso = (e: Evidencia) => (e.retirada ? <Chip tono="gris">Retirada</Chip> : e.puedeVer ? <Chip tono={e.acceso === "coordinacion" ? "dorado" : "verde"}>{e.acceso === "coordinacion" ? "Coordinación" : "Personal"}</Chip> : <Chip tono="guinda">Restringida</Chip>);

function ErrorCarga({ error, reintentar }: { error?: string; reintentar: () => void }) {
    return <Vacio icono="alerta" titulo="No pudimos cargar las evidencias" texto={error ?? "Inténtalo de nuevo."}
        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={reintentar}>Reintentar</button>} />;
}

// ---------- Lista ----------
function Evidencias() {
    const carga = useCarga<EvidenciaResumen[]>(CLAVE_LISTA, listarEvidencias);
    const evidencias = (carga.datos ?? []).map(aEvidencia).filter((e) => !e.retirada);
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [accesoFiltro, setAccesoFiltro] = useState("");
    const texto = busqueda.trim().toLowerCase();
    const mes = hoyLocal().slice(0, 7);
    const filtradas = evidencias.filter((e) => (filtro === "todas" || e.tipo === filtro) && (!accesoFiltro || (accesoFiltro === "restringida" ? !e.puedeVer : e.puedeVer && e.acceso === accesoFiltro)) && (!texto || e.folio.toLowerCase().includes(texto) || e.actividadTexto.toLowerCase().includes(texto))).sort((a, b) => b.folio.localeCompare(a.folio));
    const cuenta = (t: TipoEvidencia) => evidencias.filter((e) => e.tipo === t).length;
    const limpiar = () => { setBusqueda(""); setAccesoFiltro(""); setFiltro("todas"); };
    const restringidas = evidencias.filter((e) => !e.puedeVer).length;
    const delMes = evidencias.filter((e) => diaLocal(e.fecha).slice(0, 7) === mes).length;
    const nada = carga.cargando ? "…" : undefined;

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Evidencias privadas" texto="Fotos, listas firmadas e informes que respaldan las actividades. Solo las ve el personal autorizado.">
                    <Cifra icono="evidencias" valor={nada ?? evidencias.length} texto="guardadas" activa={filtro === "todas" && !accesoFiltro && !texto} alPresionar={limpiar} />
                    <Cifra icono="calendario" valor={nada ?? delMes} texto="subidas este mes" />
                    <Cifra icono="alerta" tono="vino" valor={nada ?? restringidas} texto="restringidas" activa={accesoFiltro === "restringida"} alPresionar={() => setAccesoFiltro(accesoFiltro === "restringida" ? "" : "restringida")} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="evidencias" id="evidencias-lista" titulo="Evidencias guardadas" texto="Las más recientes primero" className="pz-pendientes"
                        accion={<Link className="pz-boton pz-boton--chico" to={`${BASE}/subir`}>Subir evidencia</Link>}>
                        <Buscador etiqueta="Buscar por actividad o folio" placeholder="Buscar por actividad o folio" valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={(filtro !== "todas" ? 1 : 0) + (accesoFiltro ? 1 : 0)} alQuitar={() => { setFiltro("todas"); setAccesoFiltro(""); }} grupos={[
                                { titulo: "Tipo de evidencia", valor: filtro, alCambiar: (v) => setFiltro(v as Filtro), opciones: [
                                    { valor: "todas", texto: "Todas", cantidad: evidencias.length },
                                    ...TIPOS_EVIDENCIA.map((t) => ({ valor: t, texto: t, cantidad: cuenta(t) }))] },
                                { titulo: "Quién puede verla", valor: accesoFiltro, alCambiar: setAccesoFiltro, opciones: [
                                    { valor: "", texto: "Cualquier acceso" }, { valor: "personal", texto: "Personal autorizado" }, { valor: "coordinacion", texto: "Solo Coordinación" },
                                    { valor: "restringida", texto: "Restringidas para mí", cantidad: restringidas }] },
                            ]} />
                        </Buscador>
                        {carga.cargando ? <CargandoFilas texto="Cargando evidencias…" />
                            : carga.error && !carga.datos ? <ErrorCarga error={carga.error} reintentar={carga.reintentar} />
                            : evidencias.length === 0 ? <Vacio icono="evidencias" titulo="Aún no hay evidencias" texto="Sube la primera lista firmada, foto o informe de una actividad."
                                accion={<button type="button" className="pz-boton pz-boton--chico" onClick={() => navigate(`${BASE}/subir`)}>Subir evidencia</button>} />
                            : filtradas.length === 0 ? <Vacio icono="buscarCuenta" titulo={texto ? `Sin resultados para ${busqueda.trim()}` : "No hay evidencias con estos filtros"} texto="Prueba con otra palabra o quita los filtros."
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                            : (
                                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Evidencias guardadas">
                                    <ul className="pz-filas">
                                        {filtradas.map((e) => (
                                            <li key={e.folio}>
                                                <article className={`pz-fila${e.puedeVer ? "" : " ev-fila--restringida"}`}>
                                                    <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={e.puedeVer ? ICONO_TIPO[e.tipo] : "alerta"} /></span>
                                                    <div className="pz-fila__textos">
                                                        <h4 className="pz-fila__titulo" title={e.actividadTitulo}>{e.actividadTitulo}</h4>
                                                        <p className="pz-fila__detalle"><span className="pz-fila__folio">{e.folio}</span><span>{e.tipo}</span>{e.sesion && <span>Sesión del {e.sesion}</span>}<span>Subió {e.subio}</span></p>
                                                    </div>
                                                    {chipAcceso(e)}
                                                    <Link to={`${BASE}/${e.folio}`} className={`pz-boton pz-boton--chico${e.puedeVer ? " pz-boton--contorno" : ""}`}>{e.puedeVer ? "Abrir" : "Pedir acceso"}<span className="solo-lectores"> {e.folio}</span></Link>
                                                </article>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        <div className="pz-tarjeta__pie"><p aria-live="polite">{filtradas.length} de {evidencias.length} evidencias</p></div>
                    </Tarjeta>
                    <aside className="pz-lateral" aria-label="Por tipo">
                        <Tarjeta icono="estadisticas" id="ev-tipos" titulo="Lo que hay guardado" texto="Toca un tipo para ver solo ese">
                            <div className="ev-tipos" role="group" aria-label="Filtrar por tipo">
                                {TIPOS_EVIDENCIA.map((t) => (
                                    <button key={t} type="button" className={`ev-tipo${filtro === t ? " ev-tipo--activo" : ""}`} onClick={() => setFiltro(filtro === t ? "todas" : t)} aria-pressed={filtro === t}>
                                        <span className="ev-tipo__icono" aria-hidden="true"><Icono nombre={ICONO_TIPO[t]} /></span>
                                        <strong>{cuenta(t)}</strong>
                                        <span>{t === "Lista firmada" ? "Listas firmadas" : t === "Fotografía" ? "Fotografías" : "Informes"}</span>
                                    </button>
                                ))}
                            </div>
                        </Tarjeta>
                        <Tarjeta icono="usuario" id="ev-acceso" titulo="Quién puede verlas" texto="Cada consulta queda registrada">
                            <ul className="ev-accesos">
                                {(["personal", "coordinacion"] as const).map((x) => {
                                    const n = evidencias.filter((e) => e.acceso === x).length;
                                    return (
                                        <li key={x}>
                                            <button type="button" className={`ev-acceso${accesoFiltro === x ? " ev-acceso--activo" : ""}`} aria-pressed={accesoFiltro === x} onClick={() => setAccesoFiltro(accesoFiltro === x ? "" : x)}>
                                                <span>{NOMBRE_ACCESO[x]}</span><strong>{n}</strong>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </Tarjeta>
                    </aside>
                </div>
            </div>
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
    const sesion = sesiones.find((x) => x.sesionId === sesionId);
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
            <div className="pz-pagina">
                <Encabezado titulo="Subir evidencia" texto="Respalda una actividad con un archivo privado: PDF, JPG o PNG de hasta 10 MB." />
                {problema && <Aviso tono="error" titulo="No se pudo subir el archivo." texto={problema} />}
                <div className="pz-columnas pz-columnas--libre">
                    <fieldset className="pz-formulario" disabled={guardando}>
                        <Tarjeta icono="evidencias" id="ev-archivo" titulo="El archivo" texto="Arrástralo o búscalo en tu equipo">
                            <label className={`ev-archivo${problema || errores.archivo ? " ev-archivo--error" : ""}${archivo && !problema ? " ev-archivo--listo" : ""}`}>
                                <input type="file" className="solo-lectores" accept="application/pdf,image/jpeg,image/png" aria-describedby="ev-archivo-ayuda"
                                    onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
                                <span className="ev-archivo__icono" aria-hidden="true"><Icono nombre={archivo && !problema ? "check" : "evidencias"} /></span>
                                <strong>{archivo ? archivo.name : "Elige el archivo"}</strong>
                                <small id="ev-archivo-ayuda">{archivo ? `${tamano(archivo)} MB. Haz clic para cambiarlo` : "Haz clic aquí para buscarlo en tu equipo"}</small>
                            </label>
                            {errores.archivo && <p className="pz-campo__error" role="alert">{errores.archivo}</p>}
                            <label className="pz-campo pz-campo--lleno"><span>Tipo de evidencia</span>
                                <Segmentado<TipoEvidencia> etiqueta="Tipo de evidencia" valor={tipo} alCambiar={setTipo} opciones={TIPOS_EVIDENCIA.map((t) => ({ valor: t, texto: t }))} />
                            </label>
                            <label className="pz-campo pz-campo--lleno"><span>Nota (opcional)</span>
                                <textarea rows={3} maxLength={500} placeholder="Ej.: lista firmada por las personas asistentes." value={nota} onChange={(e) => setNota(e.target.value)} />
                                <small className="pz-campo__ayuda">{nota.length} de 500 caracteres</small>
                            </label>
                            {errores.nota && <p className="pz-campo__error" role="alert">{errores.nota}</p>}
                        </Tarjeta>
                        <Tarjeta icono="calendario" id="ev-actividad-t" titulo="A qué actividad pertenece" texto="Solo actividades realizadas a tu cargo">
                            <label className="pz-campo pz-campo--lleno"><span>Actividad <span className="contenidos-campo__obligatorio">*</span></span>
                                <select value={sesionId} onChange={(e) => setElegida(e.target.value)} disabled={carga.cargando} aria-invalid={!!errores.actividad}>
                                    {carga.cargando && <option value="">Cargando actividades…</option>}
                                    {!carga.cargando && sesiones.length === 0 && <option value="">No hay actividades realizadas a tu cargo</option>}
                                    {sesiones.map((x) => <option key={x.sesionId} value={x.sesionId}>{x.titulo}, {fechaLocal(x.inicio)} {horaDe(x.inicio)}{x.estado === "cancelada" ? " (cancelada)" : ""}</option>)}
                                </select>
                            </label>
                            {(errores.actividad || carga.error) && <p className="pz-campo__error" role="alert">{errores.actividad || carga.error}</p>}
                            <div className="pz-opciones-acceso" role="radiogroup" aria-label="Quién puede verla">
                                {(["personal", "coordinacion"] as const).map((op) => (
                                    <label key={op} className={`pz-casilla${acceso === op ? " pz-casilla--elegida" : ""}`}>
                                        <input type="radio" name="ev-acceso" checked={acceso === op} onChange={() => setAcceso(op)} />
                                        <span><strong>{NOMBRE_ACCESO[op]}</strong><small>{op === "personal" ? "El personal autorizado de la actividad." : "Solo Coordinación y Administración."}</small></span>
                                    </label>
                                ))}
                            </div>
                        </Tarjeta>
                    </fieldset>
                    <aside className="pz-lateral" aria-label="Guardar">
                        <section className={`pz-tarjeta pz-guardar pz-envio${archivo && !problema && sesionId ? " pz-envio--listo" : ""}`} aria-labelledby="ev-guardar">
                            <div className="pz-tarjeta__cabecera">
                                <span className="pz-tarjeta__icono" aria-hidden="true"><Icono nombre={archivo && !problema && sesionId ? "check" : "lista"} /></span>
                                <div className="pz-tarjeta__titulos"><h3 id="ev-guardar">Antes de guardar</h3><p className="pz-tarjeta__texto">No se publica en el portal</p></div>
                            </div>
                            <ul className="pz-envio__lista pz-envio__lista--una">
                                {[["Archivo válido", !!archivo && !problema], ["Actividad elegida", !!sesionId], ["Quién la ve", true]].map(([t, listo]) => (
                                    <li key={String(t)} className={listo ? "pz-envio__dato--listo" : undefined}><span className="pz-envio__marca" aria-hidden="true">{listo && <Icono nombre="check" />}</span>{t}</li>
                                ))}
                            </ul>
                            {sesion && <p className="pz-acciones__nota">{sesion.titulo}, {fechaLocal(sesion.inicio)}. {NOMBRE_ACCESO[acceso]}.</p>}
                            <div className="pz-acciones">
                                <button type="button" className="pz-boton" onClick={() => { setProblema(""); void guardar(); }} disabled={guardando || (!!problema && !!archivo && !!revisarArchivo(archivo))}>
                                    {guardando ? "Guardando…" : problema ? "Intentar de nuevo" : "Guardar evidencia"}
                                </button>
                                <Link to={BASE} className="pz-boton pz-boton--contorno">Cancelar</Link>
                            </div>
                        </section>
                        <AvisoPrivado />
                    </aside>
                </div>
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

    if (!e) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos paleta">
                <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [folio]]} />
                <div className="pz-pagina">
                    <Encabezado titulo="Evidencia" texto="Detalle de la evidencia privada." />
                    {carga.cargando ? <CargandoFilas texto="Cargando evidencia…" filas={3} /> : <Tarjeta icono="evidencias" id="ev-error" titulo="Evidencia"><ErrorCarga error={carga.error} reintentar={carga.reintentar} /></Tarjeta>}
                </div>
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
                <div className="pz-pagina">
                    <Encabezado titulo="Acceso restringido" texto="Esta evidencia no está disponible con tu cuenta.">
                        <Chip tono={e.solicitada ? "dorado" : "guinda"}>{e.solicitada ? "En revisión" : "Restringida"}</Chip>
                    </Encabezado>
                    <Tarjeta icono="alerta" id="ev-restringida" titulo={e.solicitada ? "Ya pediste acceso" : "No tienes permiso para abrirla"}
                        texto={e.solicitada ? "Coordinación verá tu solicitud en el registro de la evidencia" : "Solo Coordinación y Administración pueden verla"}>
                        <Vacio icono={e.solicitada ? "reloj" : "alerta"} titulo={e.solicitada ? "Solicitud enviada" : "Puedes pedir acceso"} texto={`${e.tipo} de ${e.actividadTexto}.`}
                            accion={<div className="pz-acciones pz-acciones--fila">
                                {!e.solicitada && <button type="button" className="pz-boton pz-boton--chico" disabled={ocupado} onClick={() => ejecutar(() => solicitarAccesoEvidencia(e.folio), (r) => navigate(`${ruta}/solicitado`, { state: r }))}>Pedir acceso</button>}
                                <Link to={BASE} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a Evidencias</Link>
                            </div>} />
                        {error && <Aviso tono="error" titulo="No se pudo pedir acceso." texto={error} />}
                    </Tarjeta>
                </div>
            </PanelLayout>
        );
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [e.folio]]} />
            <div className="pz-pagina">
                <Encabezado titulo={`${e.tipo}: ${e.actividadTitulo}`} texto={`Subida por ${e.subio} el ${fechaLocal(e.fecha)}. Folio ${e.folio}.`}>
                    {chipAcceso(e)}
                </Encabezado>
                <div className="pz-columnas pz-columnas--libre">
                    <div className="pz-pila">
                        <Tarjeta icono={ICONO_TIPO[e.tipo]} id="ev-datos" titulo="Datos del archivo" texto={e.archivo || "Sin nombre"}>
                            <Datos>
                                <Dato icono={ICONO_TIPO[e.tipo]} etiqueta="Tipo">{e.tipo}</Dato>
                                <Dato icono="lista" etiqueta="Tamaño">{e.tamano} MB</Dato>
                                <Dato icono="usuario" etiqueta="Quién la ve">{e.acceso === "coordinacion" ? "Coordinación" : "Personal"}</Dato>
                                <Dato icono="calendario" etiqueta="Subida">{fechaLocal(e.fecha)}</Dato>
                                <Dato ancho icono="calendario" etiqueta="Actividad">{e.actividadTexto}{e.actividad ? `, ${e.actividad}` : ""}</Dato>
                                <Dato ancho icono="contenido" etiqueta="Nota">{e.nota || "Sin nota."}</Dato>
                                {e.retiro && <Dato ancho icono="alerta" etiqueta="Retirada">{fechaLocal(e.retiro.fecha)}: {e.retiro.motivo}</Dato>}
                            </Datos>
                            <AvisoPrivado />
                        </Tarjeta>
                        <Historial id="ev-consultas" titulo="Quién la ha consultado" vacio="Nadie la ha consultado todavía."
                            movimientos={[...e.consultas].reverse().map((c) => ({ titulo: c.accion, tono: "verde" as const, icono: "usuario" as const, detalle: `${fechaLocal(c.fecha)}, ${horaDe(c.fecha)}, ${c.persona}` }))} />
                    </div>
                    <aside className="pz-lateral" aria-label="Acciones">
                        {!e.retirada ? (
                            <Tarjeta icono="revision" id="ev-acciones" titulo="Acciones" texto="Todo queda registrado con tu nombre">
                                <div className="pz-acciones">
                                    <button type="button" className="pz-boton" onClick={() => { setError(""); setVentana("descargar"); }}>Descargar archivo</button>
                                    <button type="button" className="pz-boton pz-boton--contorno" onClick={() => { setError(""); setAcceso(e.acceso === "personal" ? "coordinacion" : "personal"); setVentana("acceso"); }}>Cambiar quién la ve</button>
                                </div>
                                <div className="pz-acciones pz-acciones--pie">
                                    <button type="button" className="pz-boton pz-boton--guinda pz-boton--contorno" onClick={() => { setMotivo(""); setError(""); setVentana("retirar"); }}>Retirar evidencia</button>
                                    <Link to={BASE} className="pz-enlace">Volver a Evidencias</Link>
                                </div>
                                {error && !ventana && <Aviso tono="error" titulo="No se guardó." texto={error} />}
                            </Tarjeta>
                        ) : (
                            <Tarjeta icono="alerta" id="ev-retirada" titulo="Evidencia retirada" texto="Ya no está disponible para el personal">
                                <Link to={BASE} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a Evidencias</Link>
                            </Tarjeta>
                        )}
                    </aside>
                </div>
            </div>

            {ventana === "descargar" && (
                <Ventana tono="verde" icono={modalCheck} angosta titulo="¿Descargar la evidencia?"
                    texto={`${e.archivo}, ${e.tamano} MB. La descarga queda registrada con tu nombre y la fecha. No la compartas fuera del equipo autorizado.`}
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
                    <Segmentado<Acceso> etiqueta="Nuevo acceso" valor={acceso} alCambiar={setAcceso} opciones={(["personal", "coordinacion"] as const).map((op) => ({ valor: op, texto: NOMBRE_ACCESO[op] }))} />
                </Ventana>
            )}
            {ventana === "retirar" && (
                <Ventana tono="guinda" icono={modalAlerta} titulo="¿Retirar la evidencia?"
                    texto="Dejará de estar disponible para el personal. El archivo y el registro de consultas se conservan en privado."
                    textoConfirmar="Retirar evidencia" ocupada={ocupado} error={error}
                    alConfirmar={() => { if (!motivo.trim()) return setError("Escribe el motivo."); ejecutar(() => retirarEvidenciaApi(e.folio, motivo), (r) => navigate(`${ruta}/retirada`, { state: r })); }}
                    alCerrar={() => setVentana(null)}>
                    <label className="pz-campo pz-campo--lleno"><span>Motivo <span className="contenidos-campo__obligatorio">*</span></span>
                        <textarea rows={3} maxLength={300} placeholder="Ej.: se subió por error." value={motivo} aria-invalid={!!error} onChange={(x) => { setMotivo(x.target.value); setError(""); }} /></label>
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
                <div className="pz-pagina">{carga.cargando ? <CargandoFilas texto="Cargando evidencia…" filas={2} /> : <Tarjeta icono="evidencias" id="ev-res-error" titulo="Evidencia"><ErrorCarga error={carga.error} reintentar={carga.reintentar} /></Tarjeta>}</div>
            </PanelLayout>
        );
    }
    const e = aEvidenciaCompleta(datosRecibidos);
    const datos = {
        guardada: { titulo: "Evidencia guardada", texto: "Quedó guardada en privado. No se publica en el portal.", icono: "check" as NombreIcono, linea: `${e.archivo}, ${e.tamano} MB. ${NOMBRE_ACCESO[e.acceso]}.`, chip: <Chip tono="verde">Privada</Chip> },
        solicitado: { titulo: "Acceso solicitado", texto: "Coordinación revisará tu solicitud.", icono: "reloj" as NombreIcono, linea: "Tu solicitud quedó en el registro de la evidencia.", chip: <Chip tono="dorado">En revisión</Chip> },
        retirada: { titulo: "Evidencia retirada", texto: "Ya no está disponible para el personal. El registro se conserva.", icono: "alerta" as NombreIcono, linea: `Motivo: ${e.retiro?.motivo ?? ""}`, chip: <Chip tono="guinda">Retirada</Chip> },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Evidencias privadas", BASE], [datos.titulo]]} />
            <div className="pz-pagina">
                <Encabezado titulo={datos.titulo} texto={datos.texto}>
                    <Link to={BASE} className="pz-boton">Volver a Evidencias</Link>
                </Encabezado>
                <Tarjeta icono={datos.icono} id="ev-resultado" titulo={`${e.tipo}: ${e.actividadTexto}`} texto={`Folio ${e.folio}`} accion={datos.chip}>
                    <div className="pz-envio-ok" role="status">
                        <span className="pz-envio-ok__insignia" aria-hidden="true"><Icono nombre={datos.icono} /></span>
                        <p>{datos.linea}</p>
                    </div>
                    {tipo === "guardada" && <div className="pz-acciones pz-acciones--fila">
                        <Link to={`${BASE}/${e.folio}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver la evidencia</Link>
                        <Link to={`${BASE}/subir`} className="pz-boton pz-boton--contorno pz-boton--chico">Subir otra evidencia</Link>
                    </div>}
                </Tarjeta>
            </div>
        </PanelLayout>
    );
}

export default Evidencias;

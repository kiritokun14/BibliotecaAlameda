import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import { BloqueResumen, Buscador, CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import {
    aEvidencia, aEvidenciaCompleta, fechaLocal, horaDe, NOMBRE_ACCESO, revisarArchivo, TIPO_API, TIPOS_EVIDENCIA,
    type Acceso, type Consulta, type Evidencia, type EvidenciaCompleta, type TipoEvidencia,
} from "./evidencias";
import { mensajeError } from "../../../servicios/api";
import { diaLocal, hoyLocal } from "../../../servicios/espacios";
import {
    cambiarAccesoEvidencia, descargarEvidencia, listarEvidencias, listarSesionesEvidencia, obtenerEvidenciaApi, retirarEvidenciaApi,
    solicitarAccesoEvidencia, subirEvidenciaApi, type EvidenciaDetalle, type SesionEvidencia,
} from "../../../servicios/evidencias";
import iconoOjo from "../../../assets/admin/actividades/resumen-ojo.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoSubir from "../../../assets/admin/actividades/resumen-subir.svg";
import iconoCaja from "../../../assets/admin/actividades/tarjeta-caja.svg";
import iconoAviso from "../../../assets/admin/actividades/aviso-ojo.svg";
import iconoLapiz from "../../../assets/admin/contenidos/tarjeta-lapiz.svg";
import iconoReloj from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import iconoResultadoOjo from "../../../assets/admin/actividades/resultado-ojo.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import iconoCheck from "../../../assets/admin/contenidos/resultado-check.svg";
import iconoResultadoX from "../../../assets/admin/contenidos/resultado-x.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const BASE = "/admin/actividades/evidencias";
type Filtro = "todas" | TipoEvidencia;
const hora = horaDe;

// Carga de la API con estados de espera y error, y opción de reintentar.
function useCarga<T>(cargar: () => Promise<T>, clave: string) {
    const [estado, setEstado] = useState<{ clave: string; datos?: T; error?: string } | null>(null);
    const [intento, setIntento] = useState(0);
    const ultima = useRef(cargar);
    useEffect(() => { ultima.current = cargar; });
    useEffect(() => {
        let vigente = true;
        ultima.current().then((datos) => { if (vigente) setEstado({ clave, datos }); }, (e) => { if (vigente) setEstado({ clave, error: mensajeError(e) }); });
        return () => { vigente = false; };
    }, [clave, intento]);
    const actual = estado?.clave === clave ? estado : null;
    return { datos: actual?.datos, error: actual?.error, cargando: !actual, reintentar: () => { setEstado(null); setIntento((x) => x + 1); } };
}

function EsperaOError({ cargando, error, reintentar, texto }: { cargando: boolean; error?: string; reintentar: () => void; texto: string }) {
    if (cargando) return <p role="status" className="contenidos-cargando">{texto}</p>;
    return (
        <p role="alert">
            {error}{" "}
            <button type="button" className={clasesBoton("contorno")} onClick={reintentar}>Reintentar</button>
        </p>
    );
}

function AvisoPrivado() {
    return (
        <p className="ac-privado">
            <img src={iconoAviso} alt="" />
            Estas evidencias son privadas: solo las ve el personal autorizado. No se publican en el portal y cada consulta queda registrada.
        </p>
    );
}

const chipAcceso = (e: Evidencia) => (e.retirada ? <Chip tono="gris" ancho={130}>Retirada</Chip> : e.puedeVer ? <Chip tono="dorado" ancho={130}>Privada</Chip> : <Chip tono="guinda" ancho={130}>Restringida</Chip>);

// Evidencias privadas: lista (Figma 570:28876, sin evidencias 570:32261, sin resultados 570:32472)
function Evidencias() {
    const carga = useCarga(() => listarEvidencias().then((l) => l.map(aEvidencia)), "lista");
    const evidencias = (carga.datos ?? []).filter((e) => !e.retirada);
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const texto = busqueda.trim().toLowerCase();
    const mes = hoyLocal().slice(0, 7);
    const filtradas = evidencias.filter((e) => (filtro === "todas" || e.tipo === filtro) && (!texto || e.folio.toLowerCase().includes(texto) || e.actividadTexto.toLowerCase().includes(texto))).sort((a, b) => b.folio.localeCompare(a.folio));
    const { paginas, actual, visibles } = paginar(filtradas, pagina, 6);
    const cuenta = (t: TipoEvidencia) => evidencias.filter((e) => e.tipo === t).length;
    const elegir = (f: Filtro) => { setFiltro(f); setPagina(0); };

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Evidencias privadas"], ["Lista"]]} />
                <Encabezado etiqueta="Actividades · Evidencias" titulo="Evidencias privadas" texto="Fotos, listas firmadas e informes que respaldan las actividades." />
                <BloqueResumen
                    insignia="Evidencias privadas"
                    titulo="Evidencias"
                    resalte="guardadas"
                    subtitulo="Archivos de actividades, solo para personal autorizado"
                    accesos={[
                        { icono: iconoOjo, numero: evidencias.length, titulo: "Guardadas", texto: "Solo personal autorizado", enlace: "Ver evidencias", tono: "verde", activo: filtro === "todas", alPresionar: () => elegir("todas") },
                        { icono: iconoX, numero: evidencias.filter((e) => !e.puedeVer).length, titulo: "Acceso restringido", texto: "Piden permiso para verlas", enlace: "Ver restringida", tono: "guinda", alPresionar: () => { const r = evidencias.find((e) => !e.puedeVer); if (r) navigate(`${BASE}/${r.folio}`); } },
                        { icono: iconoSubir, numero: evidencias.filter((e) => diaLocal(e.fecha).slice(0, 7) === mes).length, titulo: "Subidas este mes", texto: "Listas, fotos e informes", enlace: "Subir evidencia", tono: "dorado", alPresionar: () => navigate(`${BASE}/subir`) },
                    ]}
                />
                <AvisoPrivado />
                <div className="cn-acciones"><Link to={`${BASE}/subir`} className={clasesBoton("verde")}>Subir evidencia</Link></div>
                <Tarjeta icono={iconoCaja} titulo="Evidencias guardadas">
                    <div className="cn-barra">
                        <Filtros
                            etiqueta="Tipo de evidencia"
                            valor={filtro}
                            alCambiar={elegir}
                            opciones={[
                                { valor: "todas", texto: `Todas (${evidencias.length})` },
                                { valor: "Fotografía", texto: `Fotografías (${cuenta("Fotografía")})` },
                                { valor: "Lista firmada", texto: `Listas firmadas (${cuenta("Lista firmada")})` },
                                { valor: "Informe", texto: `Informes (${cuenta("Informe")})` },
                            ]}
                        />
                        <Buscador texto="Buscar por actividad o folio" valor={busqueda} alCambiar={(v) => { setBusqueda(v); setPagina(0); }} />
                    </div>
                    {carga.cargando || carga.error ? (
                        <EsperaOError cargando={carga.cargando} error={carga.error} reintentar={carga.reintentar} texto="Cargando evidencias…" />
                    ) : evidencias.length === 0 ? (
                        <EstadoVacio icono={vacioArchivo} titulo="Aún no hay evidencias" texto="Sube la primera lista firmada, foto o informe de una actividad." />
                    ) : visibles.length === 0 ? (
                        <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay evidencias de este tipo"} texto="Prueba con otra palabra o quita los filtros." accion={{ texto: "Limpiar filtros", alPresionar: () => { setBusqueda(""); elegir("todas"); } }} />
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FOLIO", ancho: 90, folio: true, celda: (e: Evidencia) => e.folio },
                                { titulo: "ACTIVIDAD", fuerte: true, celda: (e: Evidencia) => e.actividadTexto },
                                { titulo: "TIPO", ancho: 130, celda: (e: Evidencia) => e.tipo },
                                { titulo: "SUBIÓ", ancho: 170, celda: (e: Evidencia) => e.subio },
                                { titulo: "FECHA", ancho: 110, celda: (e: Evidencia) => fechaLocal(e.fecha) },
                                { titulo: "ACCESO", ancho: 140, celda: chipAcceso },
                                { titulo: "ACCIÓN", ancho: 80, celda: (e: Evidencia) => <Link to={`${BASE}/${e.folio}`} className="cn-enlace">Abrir →<span className="cn-solo-lectores"> {e.folio}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(e) => e.folio}
                        />
                    )}
                    {filtradas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtradas.length} evidencias</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Subir evidencia (Figma 570:29352) y error al subir (570:29801)
export function SubirEvidencia() {
    const navigate = useNavigate();
    const carga = useCarga(listarSesionesEvidencia, "sesiones");
    const sesiones: SesionEvidencia[] = carga.datos ?? [];
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
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], [problema ? "Error al subir" : "Subir evidencia"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta="Evidencias privadas" titulo="Subir evidencia" texto="Respalda una actividad con un archivo privado." />
                <AvisoPrivado />
                {problema && <Resultado tono="guinda" icono={iconoAlerta} titulo="No se pudo subir el archivo" linea={problema} chip={<Chip tono="guinda">Error</Chip>} />}
                <Tarjeta icono={iconoLapiz} titulo="Datos de la evidencia">
                    <div className="cn-campos">
                        <div className="cn-campos__fila">
                            <CampoTexto id="ev-actividad" etiqueta="Actividad" obligatorio error={errores.actividad ?? carga.error}>
                                <select id="ev-actividad" className={`cn-control ${errores.actividad || carga.error ? "cn-control--error" : ""}`} value={sesionId} onChange={(e) => setElegida(e.target.value)} disabled={carga.cargando}>
                                    {carga.cargando && <option value="">Cargando actividades…</option>}
                                    {!carga.cargando && sesiones.length === 0 && <option value="">No hay actividades realizadas a tu cargo</option>}
                                    {sesiones.map((x) => (
                                        <option key={x.sesionId} value={x.sesionId}>
                                            {x.titulo} · {fechaLocal(x.inicio)} {hora(x.inicio)}{x.estado === "cancelada" ? " (cancelada)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </CampoTexto>
                            <CampoTexto id="ev-tipo" etiqueta="Tipo de evidencia" obligatorio>
                                <select id="ev-tipo" className="cn-control" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvidencia)}>{TIPOS_EVIDENCIA.map((t) => <option key={t}>{t}</option>)}</select>
                            </CampoTexto>
                        </div>
                        <div className="cn-campo">
                            <label className={`cn-archivo ac-archivo ${problema || errores.archivo ? "cn-archivo--error" : ""}`}>
                                <input
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/png"
                                    aria-describedby="ev-archivo-ayuda"
                                    onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }}
                                />
                                <span aria-hidden="true" className="ac-archivo__flecha">↑</span>
                                <strong>{archivo ? `${archivo.name} · ${tamano(archivo)} MB` : "Arrastra el archivo aquí o elige uno"}</strong>
                                <small id="ev-archivo-ayuda">PDF, JPG o PNG · máximo 10 MB</small>
                            </label>
                            {errores.archivo && <p className="cn-campo__error" role="alert">{errores.archivo}</p>}
                        </div>
                        <CampoTexto id="ev-nota" etiqueta="Nota (opcional)" error={errores.nota}>
                            <textarea id="ev-nota" className="cn-control cn-control--area" maxLength={500} placeholder="Ej.: lista firmada por las personas asistentes." value={nota} onChange={(e) => setNota(e.target.value)} />
                        </CampoTexto>
                        <CampoTexto id="ev-acceso" etiqueta="Quién puede verla" ayuda="No se publica en el portal.">
                            <select id="ev-acceso" className="cn-control" value={acceso} onChange={(e) => setAcceso(e.target.value as Acceso)} aria-describedby="ev-acceso-ayuda">
                                <option value="personal">{NOMBRE_ACCESO.personal}</option>
                                <option value="coordinacion">{NOMBRE_ACCESO.coordinacion}</option>
                            </select>
                        </CampoTexto>
                    </div>
                </Tarjeta>
                <div className="cn-acciones">
                    {problema && (!archivo || revisarArchivo(archivo)) ? (
                        <label className={clasesBoton("verde")}>
                            Elegir otro archivo
                            <input type="file" className="cn-solo-lectores" accept="application/pdf,image/jpeg,image/png" onChange={(e) => { elegirArchivo(e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                    ) : (
                        <button type="button" className={clasesBoton("verde")} onClick={() => { setProblema(""); guardar(); }} disabled={guardando}>
                            {guardando ? "Guardando…" : problema ? "Intentar de nuevo" : "Guardar evidencia"}
                        </button>
                    )}
                    <Link to={BASE} className={clasesBoton("suave")}>Cancelar</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Detalle (570:30676), descargar (570:31135), cambiar acceso (570:31228), retirar (570:31329);
// sin permiso: acceso restringido (570:31428)
export function DetalleEvidencia() {
    const { folio = "" } = useParams();
    const navigate = useNavigate();
    const carga = useCarga(() => obtenerEvidenciaApi(folio).then(aEvidenciaCompleta), folio);
    const [cambio, setCambio] = useState<EvidenciaCompleta | null>(null);
    const [ventana, setVentana] = useState<null | "descargar" | "acceso" | "retirar">(null);
    const [acceso, setAcceso] = useState<Acceso>("coordinacion");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const [ocupado, setOcupado] = useState(false);
    const e = cambio?.folio === folio ? cambio : carga.datos;
    const ruta = `${BASE}/${folio}`;

    if (!e) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos">
                <Pagina>
                    <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], ["Detalle"]]} />
                    <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta={`Evidencia ${folio}`} titulo="Evidencia" texto="Detalle de la evidencia privada." />
                    <EsperaOError cargando={carga.cargando} error={carga.error} reintentar={carga.reintentar} texto="Cargando evidencia…" />
                    <PieDatos />
                </Pagina>
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
            <PanelLayout titulo="Actividades" tema="contenidos">
                <Pagina>
                    <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], ["Acceso restringido"]]} />
                    <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta={`Evidencia ${e.folio}`} titulo="Acceso restringido" texto="Esta evidencia no está disponible con tu cuenta." />
                    <Resultado tono="guinda" icono={iconoResultadoOjo} titulo={e.solicitada ? "Ya pediste acceso" : "No tienes permiso para abrirla"} linea={e.solicitada ? "Coordinación verá tu solicitud en el registro de la evidencia." : "Solo Coordinación y Administración pueden verla. Puedes pedir acceso."} chip={<Chip tono="guinda">Restringida</Chip>} />
                    {error && <p className="cn-campo__error" role="alert">{error}</p>}
                    <div className="cn-acciones">
                        {!e.solicitada && <button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => ejecutar(() => solicitarAccesoEvidencia(e.folio), (r) => navigate(`${ruta}/solicitado`, { state: r }))}>Pedir acceso</button>}
                        <Link to={BASE} className={`${clasesBoton("contorno")} panel-regresar`}>Volver a Evidencias privadas</Link>
                    </div>
                    <PieDatos />
                </Pagina>
            </PanelLayout>
        );
    }

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], [ventana === "descargar" ? "Confirmar descarga" : ventana === "acceso" ? "Cambiar acceso" : ventana === "retirar" ? "Retirar evidencia" : "Detalle"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta={`Evidencia ${e.folio}`} titulo={`${e.tipo} · ${e.actividadTexto.split(" · ")[0]}`} texto={`${fechaLocal(e.fecha)} · Subida por ${e.subio}.${e.retirada ? " Retirada." : ""}`} />
                <AvisoPrivado />
                <Tarjeta icono={iconoCaja} titulo="Datos del archivo">
                    <Datos filas={[["Archivo", `${e.archivo} · ${e.tamano} MB`], ["Actividad", `${e.actividadTexto} · ${e.actividad}`], ["Tipo", e.tipo], ["Acceso", NOMBRE_ACCESO[e.acceso]], ["Nota", e.nota || "Sin nota"], ...(e.retiro ? [["Retirada", `${fechaLocal(e.retiro.fecha)} · ${e.retiro.motivo}`] as [string, string]] : [])]} />
                </Tarjeta>
                <Tarjeta icono={iconoReloj} titulo="Quién la ha consultado" subtitulo="Cada consulta queda registrada.">
                    <Tabla
                        columnas={[
                            { titulo: "FECHA", ancho: 190, folio: true, celda: (c: Consulta) => `${fechaLocal(c.fecha)} · ${hora(c.fecha)}` },
                            { titulo: "PERSONA", fuerte: true, celda: (c: Consulta) => c.persona },
                            { titulo: "ACCIÓN", ancho: 260, celda: (c: Consulta) => c.accion },
                        ]}
                        filas={e.consultas}
                        clave={(c) => c.fecha + c.accion + c.persona}
                    />
                </Tarjeta>
                {error && !ventana && <p className="cn-campo__error" role="alert">{error}</p>}
                {!e.retirada && (
                    <div className="cn-acciones">
                        <button type="button" className={clasesBoton("verde")} onClick={() => { setError(""); setVentana("descargar"); }}>Descargar</button>
                        <button type="button" className={clasesBoton("contorno")} onClick={() => { setError(""); setAcceso(e.acceso === "personal" ? "coordinacion" : "personal"); setVentana("acceso"); }}>Cambiar acceso</button>
                        <button type="button" className={clasesBoton("contorno-guinda")} onClick={() => { setMotivo(""); setError(""); setVentana("retirar"); }}>Retirar evidencia</button>
                    </div>
                )}
                <PieDatos />
            </Pagina>

            {ventana === "descargar" && (
                <Ventana
                    titulo="¿Descargar la evidencia?"
                    texto="La descarga queda registrada con tu nombre y la fecha. No la compartas fuera del equipo autorizado."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => ejecutar(async () => { await descargarEvidencia(e.folio, e.archivo || e.folio); return obtenerEvidenciaApi(e.folio); })}>{ocupado ? "Descargando…" : "Descargar"}</button></>}
                >
                    <Datos variante="caja" filas={[["Archivo", e.archivo], ["Tamaño", `${e.tamano} MB`]]} />
                    {error && <p className="cn-campo__error" role="alert">{error}</p>}
                </Ventana>
            )}
            {ventana === "acceso" && (
                <Ventana
                    titulo="Cambiar acceso"
                    texto="Elige quién puede abrir esta evidencia."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={ocupado} onClick={() => ejecutar(() => cambiarAccesoEvidencia(e.folio, acceso))}>Guardar acceso</button></>}
                >
                    <Datos variante="caja" filas={[["Evidencia", e.folio], ["Acceso actual", NOMBRE_ACCESO[e.acceso]]]} />
                    <CampoTexto id="ev-nuevo-acceso" etiqueta="Nuevo acceso" obligatorio ayuda="Aplica de inmediato. Si eliges Coordinación y no tienes ese permiso, dejarás de verla.">
                        <select id="ev-nuevo-acceso" className="cn-control" value={acceso} onChange={(x) => setAcceso(x.target.value as Acceso)}>
                            <option value="personal">{NOMBRE_ACCESO.personal}</option>
                            <option value="coordinacion">{NOMBRE_ACCESO.coordinacion}</option>
                        </select>
                    </CampoTexto>
                    {error && <p className="cn-campo__error" role="alert">{error}</p>}
                </Ventana>
            )}
            {ventana === "retirar" && (
                <Ventana
                    titulo="¿Retirar la evidencia?"
                    texto="Dejará de estar disponible para el personal. El archivo y el registro de consultas se conservan en privado."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("guinda")} disabled={ocupado} onClick={() => { if (!motivo.trim()) return setError("Escribe el motivo."); ejecutar(() => retirarEvidenciaApi(e.folio, motivo), (r) => navigate(`${ruta}/retirada`, { state: r })); }}>Retirar evidencia</button></>}
                >
                    <Datos variante="caja" filas={[["Evidencia", e.folio], ["Archivo", e.archivo]]} />
                    <CampoTexto id="ev-motivo" etiqueta="Motivo" obligatorio error={error}>
                        <textarea id="ev-motivo" maxLength={300} className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} placeholder="Ej.: se subió por error." value={motivo} onChange={(x) => { setMotivo(x.target.value); setError(""); }} aria-invalid={!!error} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Resultados: evidencia guardada (570:30261), acceso solicitado (570:31848), evidencia retirada (627:51773)
// Usan la respuesta de la acción anterior; si se abre la dirección directo, se consulta la evidencia.
export function ResultadoEvidencia({ tipo }: { tipo: "guardada" | "solicitado" | "retirada" }) {
    const { folio = "" } = useParams();
    const recibido = useLocation().state as EvidenciaDetalle | null;
    const carga = useCarga(() => (recibido?.folio === folio ? Promise.resolve(recibido) : obtenerEvidenciaApi(folio)).then(aEvidenciaCompleta), folio);
    const e = carga.datos;
    if (!e) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos">
                <Pagina>
                    <EsperaOError cargando={carga.cargando} error={carga.error} reintentar={carga.reintentar} texto="Cargando evidencia…" />
                </Pagina>
            </PanelLayout>
        );
    }
    const datos = {
        guardada: { titulo: "Evidencia guardada", texto: "Quedó guardada en privado. No se publica en el portal.", tono: "verde" as const, icono: iconoCheck, linea: `${e.archivo} · ${e.tamano} MB · ${NOMBRE_ACCESO[e.acceso]}`, chip: <Chip tono="dorado">Privada</Chip> },
        solicitado: { titulo: "Acceso solicitado", texto: "Coordinación revisará tu solicitud.", tono: "dorado" as const, icono: iconoResultadoOjo, linea: "Tu solicitud quedó en el registro de la evidencia.", chip: <Chip tono="dorado">En revisión</Chip> },
        retirada: { titulo: "Evidencia retirada", texto: "Ya no está disponible para el personal. El registro se conserva.", tono: "guinda" as const, icono: iconoResultadoX, linea: `Motivo: ${e.retiro?.motivo ?? ""}`, chip: <Chip tono="gris">Retirada</Chip> },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Evidencia ${e.folio}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={`${e.tipo} · ${e.actividadTexto}`} linea={datos.linea} chip={datos.chip} />
                <div className="cn-acciones">
                    <Link to={BASE} className={`${clasesBoton("verde")} panel-regresar`}>Volver a Evidencias privadas</Link>
                    {tipo === "guardada" && <Link to={`${BASE}/subir`} className={clasesBoton("contorno")}>Subir otra evidencia</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Evidencias;

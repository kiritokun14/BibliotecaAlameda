import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import { BloqueResumen, Buscador, CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta, useActividades } from "./datos";
import { hoyISO } from "./salas";
import {
    cambiarAcceso, NOMBRE_ACCESO, obtenerEvidencia, pedirAcceso, puedeVer, registrarConsulta, retirarEvidencia, revisarArchivo, subirEvidencia, TIPOS_EVIDENCIA, useEvidencias,
    type Acceso, type Consulta, type Evidencia, type TipoEvidencia,
} from "./evidencias";
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
const hora = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

function AvisoPrivado() {
    return (
        <p className="ac-privado">
            <img src={iconoAviso} alt="" />
            Estas evidencias son privadas: solo las ve el personal autorizado. No se publican en el portal y cada consulta queda registrada.
        </p>
    );
}

const chipAcceso = (e: Evidencia) => (e.retirada ? <Chip tono="gris" ancho={130}>Retirada</Chip> : puedeVer(e) ? <Chip tono="dorado" ancho={130}>Privada</Chip> : <Chip tono="guinda" ancho={130}>Restringida</Chip>);

// Evidencias privadas: lista (Figma 570:28876, sin evidencias 570:32261, sin resultados 570:32472)
function Evidencias() {
    const evidencias = useEvidencias().filter((e) => !e.retirada);
    const navigate = useNavigate();
    const [filtro, setFiltro] = useState<Filtro>("todas");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const texto = busqueda.trim().toLowerCase();
    const mes = hoyISO().slice(0, 7);
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
                    subtitulo="Archivos de actividades, solo para personal autorizado · cifras de ejemplo"
                    accesos={[
                        { icono: iconoOjo, numero: evidencias.length, titulo: "Guardadas", texto: "Solo personal autorizado", enlace: "Ver evidencias", tono: "verde", activo: filtro === "todas", alPresionar: () => elegir("todas") },
                        { icono: iconoX, numero: evidencias.filter((e) => !puedeVer(e)).length, titulo: "Acceso restringido", texto: "Piden permiso para verlas", enlace: "Ver restringida", tono: "guinda", alPresionar: () => { const r = evidencias.find((e) => !puedeVer(e)); if (r) navigate(`${BASE}/${r.folio}`); } },
                        { icono: iconoSubir, numero: evidencias.filter((e) => e.fecha.startsWith(mes)).length, titulo: "Subidas este mes", texto: "Listas, fotos y notas (ejemplo)", enlace: "Subir evidencia", tono: "dorado", alPresionar: () => navigate(`${BASE}/subir`) },
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
                    {evidencias.length === 0 ? (
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
                                { titulo: "FECHA", ancho: 110, celda: (e: Evidencia) => fechaCorta(e.fecha) },
                                { titulo: "ACCESO", ancho: 140, celda: chipAcceso },
                                { titulo: "ACCIÓN", ancho: 80, celda: (e: Evidencia) => <Link to={`${BASE}/${e.folio}`} className="cn-enlace">Abrir →<span className="cn-solo-lectores"> {e.folio}</span></Link> },
                            ]}
                            filas={visibles}
                            clave={(e) => e.folio}
                        />
                    )}
                    {filtradas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {filtradas.length} evidencias (ejemplo)</p>
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
    const actividades = useActividades().filter((a) => a.estado === "publicada" || a.estado === "cancelada").sort((a, b) => b.fecha.localeCompare(a.fecha));
    const [actividad, setActividad] = useState(actividades[0]?.folio ?? "");
    const [tipo, setTipo] = useState<TipoEvidencia>("Lista firmada");
    const [archivo, setArchivo] = useState<{ nombre: string; tamano: number } | null>(null);
    const [problema, setProblema] = useState("");
    const [nota, setNota] = useState("");
    const [acceso, setAcceso] = useState<Acceso>("personal");
    const [errores, setErrores] = useState<Record<string, string>>({});
    const a = actividades.find((x) => x.folio === actividad);

    function guardar() {
        const e: Record<string, string> = {};
        if (!a) e.actividad = "Elige la actividad.";
        if (!archivo) e.archivo = "Elige el archivo.";
        setErrores(e);
        if (Object.keys(e).length || problema) return;
        const folio = subirEvidencia({ actividad, actividadTexto: `${a!.nombre} · ${fechaCorta(a!.fecha).split(" ").slice(0, 2).join(" ")}`, tipo, archivo: archivo!.nombre, tamano: archivo!.tamano, nota, acceso });
        navigate(`${BASE}/${folio}/guardada`);
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
                            <CampoTexto id="ev-actividad" etiqueta="Actividad" obligatorio error={errores.actividad}>
                                <select id="ev-actividad" className={`cn-control ${errores.actividad ? "cn-control--error" : ""}`} value={actividad} onChange={(e) => setActividad(e.target.value)}>
                                    {actividades.length === 0 && <option value="">No hay actividades realizadas</option>}
                                    {actividades.map((x) => <option key={x.folio} value={x.folio}>{x.nombre} · {fechaCorta(x.fecha)}</option>)}
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
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (!f) return;
                                        // TODO backend: subir a almacenamiento privado; aquí solo se guarda el nombre y el tamaño
                                        setArchivo({ nombre: f.name, tamano: Math.round((f.size / (1024 * 1024)) * 10) / 10 });
                                        setProblema(revisarArchivo(f) ?? "");
                                        setErrores((x) => ({ ...x, archivo: "" }));
                                        e.target.value = "";
                                    }}
                                />
                                <span aria-hidden="true" className="ac-archivo__flecha">↑</span>
                                <strong>{archivo ? `${archivo.nombre} · ${archivo.tamano} MB` : "Arrastra el archivo aquí o elige uno"}</strong>
                                <small id="ev-archivo-ayuda">PDF, JPG o PNG · máximo 10 MB</small>
                            </label>
                            {errores.archivo && <p className="cn-campo__error" role="alert">{errores.archivo}</p>}
                        </div>
                        <CampoTexto id="ev-nota" etiqueta="Nota (opcional)">
                            <textarea id="ev-nota" className="cn-control cn-control--area" placeholder="Ej.: lista firmada por las personas asistentes." value={nota} onChange={(e) => setNota(e.target.value)} />
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
                    {problema ? (
                        <label className={clasesBoton("verde")}>
                            Elegir otro archivo
                            <input type="file" className="cn-solo-lectores" accept="application/pdf,image/jpeg,image/png" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setArchivo({ nombre: f.name, tamano: Math.round((f.size / (1024 * 1024)) * 10) / 10 }); setProblema(revisarArchivo(f) ?? ""); e.target.value = ""; }} />
                        </label>
                    ) : (
                        <button type="button" className={clasesBoton("verde")} onClick={guardar}>Guardar evidencia</button>
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
    const { folio } = useParams();
    const navigate = useNavigate();
    useEvidencias();
    const [ventana, setVentana] = useState<null | "descargar" | "acceso" | "retirar">(null);
    const [acceso, setAcceso] = useState<Acceso>("coordinacion");
    const [motivo, setMotivo] = useState("");
    const [error, setError] = useState("");
    const e = obtenerEvidencia(folio);
    if (!e) return <Navigate to={BASE} replace />;
    const ruta = `${BASE}/${e.folio}`;

    if (!puedeVer(e)) {
        return (
            <PanelLayout titulo="Actividades" tema="contenidos">
                <Pagina>
                    <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], ["Acceso restringido"]]} />
                    <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta={`Evidencia ${e.folio}`} titulo="Acceso restringido" texto="Esta evidencia no está disponible con tu cuenta." />
                    <Resultado tono="guinda" icono={iconoResultadoOjo} titulo={e.solicitada ? "Ya pediste acceso" : "No tienes permiso para abrirla"} linea={e.solicitada ? "Coordinación revisará tu solicitud. Te avisaremos en tus notificaciones." : "Solo Coordinación y Administración pueden verla. Puedes pedir acceso."} chip={<Chip tono="guinda">Restringida</Chip>} />
                    <div className="cn-acciones">
                        {!e.solicitada && <button type="button" className={clasesBoton("verde")} onClick={() => { pedirAcceso(e.folio); navigate(`${ruta}/solicitado`); }}>Pedir acceso</button>}
                        <Link to={BASE} className={clasesBoton("contorno")}>Volver a Evidencias privadas</Link>
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
                <EncabezadoTarjeta volver={{ texto: "Volver a Evidencias privadas", ruta: BASE }} etiqueta={`Evidencia ${e.folio}`} titulo={`${e.tipo} · ${e.actividadTexto.split(" · ")[0]}`} texto={`${fechaCorta(e.fecha)} · Subida por ${e.subio}.${e.retirada ? " Retirada." : ""}`} />
                <AvisoPrivado />
                <Tarjeta icono={iconoCaja} titulo="Datos del archivo">
                    <Datos filas={[["Archivo", `${e.archivo} · ${e.tamano} MB`], ["Actividad", `${e.actividadTexto.split(" · ")[0]} · ${e.actividad}`], ["Tipo", e.tipo], ["Acceso", NOMBRE_ACCESO[e.acceso]], ["Nota", e.nota || "Sin nota"], ...(e.retirada ? [["Retirada", `${fechaCorta(e.retirada.fecha)} · ${e.retirada.motivo}`] as [string, string]] : [])]} />
                </Tarjeta>
                <Tarjeta icono={iconoReloj} titulo="Quién la ha consultado" subtitulo="Cada consulta queda registrada.">
                    <Tabla
                        columnas={[
                            { titulo: "FECHA", ancho: 190, folio: true, celda: (c: Consulta) => `${fechaCorta(c.fecha)} · ${hora(c.fecha)}` },
                            { titulo: "PERSONA", fuerte: true, celda: (c: Consulta) => c.persona },
                            { titulo: "ACCIÓN", ancho: 260, celda: (c: Consulta) => c.accion },
                        ]}
                        filas={e.consultas}
                        clave={(c) => c.fecha + c.accion}
                    />
                </Tarjeta>
                {!e.retirada && (
                    <div className="cn-acciones">
                        <button type="button" className={clasesBoton("verde")} onClick={() => setVentana("descargar")}>Descargar</button>
                        <button type="button" className={clasesBoton("contorno")} onClick={() => { setAcceso(e.acceso === "personal" ? "coordinacion" : "personal"); setVentana("acceso"); }}>Cambiar acceso</button>
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
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={() => { registrarConsulta(e.folio, "Descargó"); setVentana(null); }}>Descargar</button></>}
                >
                    <Datos variante="caja" filas={[["Archivo", e.archivo], ["Tamaño", `${e.tamano} MB`]]} />
                    <p className="cn-nota">Datos de ejemplo: no se descarga ningún archivo real. TODO backend: enlace temporal firmado.</p>
                </Ventana>
            )}
            {ventana === "acceso" && (
                <Ventana
                    titulo="Cambiar acceso"
                    texto="Elige quién puede abrir esta evidencia."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={() => { cambiarAcceso(e.folio, acceso); setVentana(null); }}>Guardar acceso</button></>}
                >
                    <Datos variante="caja" filas={[["Evidencia", e.folio], ["Acceso actual", NOMBRE_ACCESO[e.acceso]]]} />
                    <CampoTexto id="ev-nuevo-acceso" etiqueta="Nuevo acceso" obligatorio ayuda="Aplica de inmediato.">
                        <select id="ev-nuevo-acceso" className="cn-control" value={acceso} onChange={(x) => setAcceso(x.target.value as Acceso)}>
                            <option value="personal">{NOMBRE_ACCESO.personal}</option>
                            <option value="coordinacion">{NOMBRE_ACCESO.coordinacion}</option>
                        </select>
                    </CampoTexto>
                </Ventana>
            )}
            {ventana === "retirar" && (
                <Ventana
                    titulo="¿Retirar la evidencia?"
                    texto="Dejará de estar disponible para el personal. El registro de consultas se conserva."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("guinda")} onClick={() => { if (!motivo.trim()) return setError("Escribe el motivo."); retirarEvidencia(e.folio, motivo); navigate(`${ruta}/retirada`); }}>Retirar evidencia</button></>}
                >
                    <Datos variante="caja" filas={[["Evidencia", e.folio], ["Archivo", e.archivo]]} />
                    <CampoTexto id="ev-motivo" etiqueta="Motivo" obligatorio error={error}>
                        <textarea id="ev-motivo" className={`cn-control cn-control--area ${error ? "cn-control--error" : ""}`} placeholder="Ej.: se subió por error." value={motivo} onChange={(x) => { setMotivo(x.target.value); setError(""); }} aria-invalid={!!error} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Resultados: evidencia guardada (570:30261), acceso solicitado (570:31848), evidencia retirada (627:51773)
export function ResultadoEvidencia({ tipo }: { tipo: "guardada" | "solicitado" | "retirada" }) {
    const { folio } = useParams();
    useEvidencias();
    const e = obtenerEvidencia(folio);
    if (!e) return <Navigate to={BASE} replace />;
    const datos = {
        guardada: { titulo: "Evidencia guardada", texto: "Quedó guardada en privado. No se publica en el portal.", tono: "verde" as const, icono: iconoCheck, linea: `${e.archivo} · ${e.tamano} MB · ${NOMBRE_ACCESO[e.acceso]}`, chip: <Chip tono="dorado">Privada</Chip> },
        solicitado: { titulo: "Acceso solicitado", texto: "Coordinación revisará tu solicitud.", tono: "dorado" as const, icono: iconoResultadoOjo, linea: "Te avisaremos en tus notificaciones (ejemplo).", chip: <Chip tono="dorado">En revisión</Chip> },
        retirada: { titulo: "Evidencia retirada", texto: "Ya no está disponible para el personal. El registro se conserva.", tono: "guinda" as const, icono: iconoResultadoX, linea: `Motivo: ${e.retirada?.motivo ?? ""}`, chip: <Chip tono="gris">Retirada</Chip> },
    }[tipo];
    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Evidencias privadas", BASE], [datos.titulo]]} />
                <Encabezado grande etiqueta={`Evidencia ${e.folio}`} titulo={datos.titulo} texto={datos.texto} />
                <Resultado tono={datos.tono} icono={datos.icono} titulo={`${e.tipo} · ${e.actividadTexto}`} linea={datos.linea} chip={datos.chip} />
                <div className="cn-acciones">
                    <Link to={BASE} className={clasesBoton("verde")}>Volver a Evidencias privadas</Link>
                    {tipo === "guardada" && <Link to={`${BASE}/subir`} className={clasesBoton("contorno")}>Subir otra evidencia</Link>}
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Evidencias;

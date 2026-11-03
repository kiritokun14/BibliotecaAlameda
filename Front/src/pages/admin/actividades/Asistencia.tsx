import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import { BloqueResumen, Buscador, CampoTexto, Chip, Datos, Encabezado, EncabezadoTarjeta, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Resultado, Tabla, Tarjeta, Ventana } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta, obtenerActividad, useActividades, type Actividad } from "./datos";
import { useInscripciones } from "./inscripciones";
import { hoyISO } from "./salas";
import { semanaDe, diaLargo } from "./calendario";
import {
    agregarSinInscripcion, anotar, cerrarLista, conteo, corregir, estadoLista, guardarAsistencia, listaDe, lugaresParaExtras, marcar, NOMBRE_MARCA, personasDe, useAsistencia, type Marca,
} from "./asistencia";
import { BASE_ASISTENCIA } from "./utiles";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoCasilla from "../../../assets/admin/actividades/tarjeta-casilla.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import iconoTarjeta from "../../../assets/admin/actividades/tarjeta-archivo.svg";
import iconoAlerta from "../../../assets/admin/actividades/resultado-alerta.svg";
import iconoResultado from "../../../assets/admin/contenidos/resultado-check.svg";
import vacioReloj from "../../../assets/admin/actividades/vacio-reloj.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

const TONO_MARCA = { presente: "verde", ausente: "guinda", sin: "gris" } as const;
type Periodo = "hoy" | "semana" | "anteriores";
const porcentaje = (p: number, t: number) => (t ? Math.round((p / t) * 100) : 0);

// Asistencia: actividades del día (Figma 570:24906, sin actividades hoy 570:28074, sin resultados 570:28284)
function Asistencia() {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState("");
    const periodo = (["hoy", "semana", "anteriores"].includes(params.get("ver") ?? "") ? params.get("ver") : "hoy") as Periodo;
    const hoy = hoyISO();
    const semana = semanaDe(hoy);
    const conLista = actividades.filter((a) => a.inscripcion && (a.estado === "publicada" || a.estado === "cancelada"));
    const enPeriodo = (a: Actividad, p: Periodo) => (p === "hoy" ? a.fecha === hoy : p === "semana" ? a.fecha >= semana[0] && a.fecha <= `${semana[4]}~` : a.fecha < hoy);
    const texto = busqueda.trim().toLowerCase();
    const filas = conLista.filter((a) => enPeriodo(a, periodo) && (!texto || a.nombre.toLowerCase().includes(texto))).sort((a, b) => (periodo === "anteriores" ? b.fecha.localeCompare(a.fecha) : (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)));
    const deHoy = conLista.filter((a) => a.fecha === hoy);
    const cerradas = conLista.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "cerrada");
    const promedio = porcentaje(cerradas.reduce((s, a) => s + conteo(a.folio, listas).presentes, 0), cerradas.reduce((s, a) => s + conteo(a.folio, listas).inscritos + conteo(a.folio, listas).sinInscripcion, 0));

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Asistencia"], [periodo === "hoy" ? (deHoy.length ? "Hoy" : "Sin actividades hoy") : periodo === "semana" ? "Esta semana" : "Anteriores"]]} />
                <Encabezado etiqueta="Actividades · Asistencia" titulo="Asistencia" texto="Pasa lista a las personas inscritas el día de la actividad." />
                <BloqueResumen
                    insignia="Asistencia"
                    titulo="Asistencia de"
                    resalte="hoy"
                    subtitulo="Registro de quién asistió a cada actividad · cifras de ejemplo"
                    accesos={[
                        { icono: iconoArchivo, numero: deHoy.length, titulo: "Actividades hoy", texto: diaLargo(hoy), enlace: "Ver actividades", tono: "verde", alPresionar: () => setParams({}) },
                        { icono: iconoReloj, numero: conLista.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "pendiente").length, titulo: "Por pasar lista", texto: "Ya empezaron o pasaron", enlace: "Pasar lista", tono: "dorado", alPresionar: () => setParams({ ver: "anteriores" }) },
                        { icono: iconoCheck, numero: cerradas.length, titulo: cerradas.length === 1 ? "Lista cerrada" : "Listas cerradas", texto: "Ya registradas", enlace: "Ver listas", tono: "verde", alPresionar: () => setParams({ ver: "anteriores" }) },
                        { icono: iconoCheck, numero: `${promedio}%`, titulo: "Asistencia del mes", texto: "Promedio (ejemplo)", enlace: "Ver resumen", tono: "verde", alPresionar: () => navigate(`${BASE_ASISTENCIA}/resumen`) },
                    ]}
                />
                <Tarjeta icono={iconoCasilla} titulo={periodo === "hoy" ? "Actividades de hoy" : periodo === "semana" ? "Actividades de esta semana" : "Actividades anteriores"}>
                    <div className="cn-barra">
                        <Filtros
                            etiqueta="Periodo"
                            valor={periodo}
                            alCambiar={(p) => setParams(p === "hoy" ? {} : { ver: p })}
                            opciones={[
                                { valor: "hoy", texto: `Hoy (${deHoy.length})` },
                                { valor: "semana", texto: `Esta semana (${conLista.filter((a) => enPeriodo(a, "semana")).length})` },
                                { valor: "anteriores", texto: "Anteriores" },
                            ]}
                        />
                        <Buscador texto="Buscar actividad" valor={busqueda} alCambiar={setBusqueda} />
                    </div>
                    {filas.length === 0 ? (
                        texto ? (
                            <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otra palabra o cambia el periodo." accion={{ texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") }} />
                        ) : (
                            <div className="cn-vacio">
                                <span className="cn-vacio__icono" aria-hidden="true"><img src={vacioReloj} alt="" /></span>
                                <p className="cn-vacio__titulo">{periodo === "hoy" ? "No hay actividades hoy" : "No hay actividades en este periodo"}</p>
                                <p className="cn-vacio__texto">Revisa las anteriores para pasar o corregir listas.</p>
                                {periodo !== "anteriores" && <button type="button" className={clasesBoton("contorno")} onClick={() => setParams({ ver: "anteriores" })}>Ver anteriores</button>}
                            </div>
                        )
                    ) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "FOLIO", ancho: 90, folio: true, celda: (a: Actividad) => a.folio },
                                    { titulo: "ACTIVIDAD", fuerte: true, celda: (a: Actividad) => a.nombre },
                                    { titulo: periodo === "hoy" ? "HORA" : "FECHA", ancho: 120, celda: (a: Actividad) => (periodo === "hoy" ? a.inicio : fechaCorta(a.fecha)) },
                                    { titulo: "SALA", ancho: 150, celda: (a: Actividad) => a.espacio },
                                    { titulo: "INSCRITOS", ancho: 90, celda: (a: Actividad) => a.inscritos },
                                    { titulo: "ESTADO", ancho: 150, celda: (a: Actividad) => { const e = estadoLista(a.folio, new Date(), listas); return <Chip tono={e.tono} ancho={140}>{e.texto}</Chip>; } },
                                    {
                                        titulo: "ACCIÓN",
                                        ancho: 140,
                                        celda: (a: Actividad) => {
                                            const e = estadoLista(a.folio, new Date(), listas).clave;
                                            if (e === "cancelada") return <span>—</span>;
                                            return <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="cn-enlace">{e === "cerrada" ? "Ver asistencia" : e === "pendiente" ? "Pasar lista" : "Ver lista"} →<span className="cn-solo-lectores"> {a.nombre}</span></Link>;
                                        },
                                    },
                                ]}
                                filas={filas}
                                clave={(a) => a.folio}
                            />
                            <p className="cn-nota">{filas.length} actividades (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <div className="cn-acciones">
                    <Link to={`${BASE_ASISTENCIA}/resumen`} className={clasesBoton("contorno")}>Resumen de asistencia</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

const POR_PAGINA = 8;

// Pasar lista (570:25383), error al guardar (570:25860), confirmar cierre (570:26348), agregar sin inscripción (570:27478);
// si la lista ya está cerrada: detalle (570:26909) y corregir (570:27370)
export function PasarLista() {
    const { folio } = useParams();
    const navigate = useNavigate();
    useActividades();
    useInscripciones();
    const listas = useAsistencia();
    const [pagina, setPagina] = useState(0);
    const [ventana, setVentana] = useState<null | "cerrar" | "agregar" | { id: string; persona: string }>(null);
    const [error, setError] = useState(false);
    const [guardado, setGuardado] = useState(false);
    const [nombre, setNombre] = useState("");
    const [contacto, setContacto] = useState("");
    const [nueva, setNueva] = useState<Marca>("presente");
    const [motivo, setMotivo] = useState("");
    const [errorCampo, setErrorCampo] = useState("");
    const a = obtenerActividad(folio);
    if (!a || !a.inscripcion) return <Navigate to={BASE_ASISTENCIA} replace />;
    const lista = listaDe(a.folio, listas);
    const cerrada = !!lista.cerrada;
    const personas = personasDe(a.folio);
    const c = conteo(a.folio, listas);
    const { paginas, actual, visibles } = paginar(personas, pagina, POR_PAGINA);
    const marcaDe = (id: string, extra: boolean): Marca => (extra ? "presente" : lista.marcas[id] ?? "sin");
    const libres = lugaresParaExtras(a.folio);

    async function guardar() {
        setGuardado(false);
        try {
            await guardarAsistencia(a!.folio);
            setError(false);
            setGuardado(true);
        } catch {
            setError(true);
        }
    }

    function abrirCorreccion(id: string, persona: string) {
        setNueva(marcaDe(id, false) === "presente" ? "ausente" : "presente");
        setMotivo("");
        setErrorCampo("");
        setVentana({ id, persona });
    }

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Asistencia", BASE_ASISTENCIA], [cerrada ? (ventana ? "Corregir asistencia" : "Lista cerrada") : error ? "Error al guardar" : ventana === "cerrar" ? "Confirmar cierre" : ventana === "agregar" ? "Agregar persona sin inscripción" : "Pasar lista"]]} />
                <EncabezadoTarjeta
                    volver={{ texto: "Volver a Asistencia", ruta: BASE_ASISTENCIA }}
                    etiqueta={`Actividad ${a.folio}`}
                    titulo={cerrada ? a.nombre : `Pasar lista · ${a.nombre}`}
                    texto={`${fechaCorta(a.fecha)} · ${a.inicio} · ${a.espacio} · ${c.inscritos} inscritos.`}
                />

                {error && <Resultado tono="guinda" icono={iconoAlerta} titulo="No se pudo guardar la asistencia" linea="Revisa tu conexión. Tus marcas siguen en pantalla; inténtalo de nuevo." chip={<Chip tono="guinda">Sin guardar</Chip>} />}
                {guardado && <p className="cn-aviso cn-aviso--exito" role="status"><span className="cn-aviso__textos"><strong>Asistencia guardada (ejemplo).</strong></span></p>}

                {cerrada ? (
                    <Tarjeta icono={iconoCasilla} titulo="Resumen">
                        <Datos filas={[["Inscritos", String(c.inscritos)], ["Presentes", `${c.presentes}${c.sinInscripcion ? ` (${c.sinInscripcion} sin inscripción)` : ""}`], ["Ausentes", String(c.ausentes)], ["Cerró", lista.cerrada!.quien], ["Cierre", `${fechaCorta(lista.cerrada!.fecha)} · ${new Date(lista.cerrada!.fecha).toTimeString().slice(0, 5)}`]]} />
                    </Tarjeta>
                ) : (
                    <BloqueResumen
                        insignia="Asistencia"
                        titulo=""
                        resalte="Conteo"
                        subtitulo="Registro de quién asistió a cada actividad · cifras de ejemplo"
                        accesos={[
                            { icono: iconoCheck, numero: c.presentes, titulo: "Presentes", texto: "Marcados", enlace: "", tono: "verde" },
                            { icono: iconoX, numero: c.ausentes, titulo: "Ausentes", texto: "Marcados", enlace: "", tono: "guinda" },
                            { icono: iconoX, numero: c.sinMarcar, titulo: "Sin marcar", texto: "Pendientes", enlace: "", tono: "dorado" },
                            { icono: iconoArchivo, numero: c.sinInscripcion, titulo: "Sin inscripción", texto: "Se agregó al llegar", enlace: "", tono: "verde" },
                        ]}
                    />
                )}

                <Tarjeta icono={iconoLista} titulo={cerrada ? "Registro" : "Personas inscritas"}>
                    {personas.length === 0 ? (
                        <EstadoVacio icono={vacioReloj} titulo="No hay personas inscritas" texto="Puedes agregar a quien llegó sin inscripción." />
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "N.º", ancho: 50, folio: true, celda: (p: { id: string }) => String(personas.findIndex((x) => x.id === p.id) + 1).padStart(2, "0") },
                                { titulo: "PERSONA", fuerte: true, celda: (p: { persona: string; extra: boolean }) => `${p.persona}${p.extra ? " · sin inscripción" : ""}` },
                                ...(cerrada ? [] : [{
                                    titulo: "NOTA",
                                    ancho: 200,
                                    celda: (p: { id: string; persona: string }) => <input className="cn-control ac-nota" placeholder="Agregar nota" aria-label={`Nota de ${p.persona}`} value={lista.notas[p.id] ?? ""} onChange={(e) => anotar(a.folio, p.id, e.target.value)} />,
                                }]),
                                { titulo: "ASISTENCIA", ancho: 130, celda: (p: { id: string; extra: boolean }) => { const m = marcaDe(p.id, p.extra); return <Chip tono={TONO_MARCA[m]} ancho={120}>{NOMBRE_MARCA[m]}</Chip>; } },
                                {
                                    titulo: cerrada ? "ACCIÓN" : "MARCAR",
                                    ancho: 170,
                                    celda: (p: { id: string; persona: string; extra: boolean }) => cerrada ? (
                                        p.extra ? <span>—</span> : <button type="button" className="cn-enlace" onClick={() => abrirCorreccion(p.id, p.persona)}>Corregir →<span className="cn-solo-lectores"> {p.persona}</span></button>
                                    ) : p.extra ? <span>Presente</span> : (
                                        <span className="ac-marcar" role="group" aria-label={`Marcar a ${p.persona}`}>
                                            <button type="button" className="cn-enlace" aria-pressed={marcaDe(p.id, false) === "presente"} onClick={() => { marcar(a.folio, p.id, "presente"); setGuardado(false); }}>Presente</button>
                                            <span aria-hidden="true"> · </span>
                                            <button type="button" className="cn-enlace" aria-pressed={marcaDe(p.id, false) === "ausente"} onClick={() => { marcar(a.folio, p.id, "ausente"); setGuardado(false); }}>Ausente</button>
                                        </span>
                                    ),
                                },
                            ]}
                            filas={visibles}
                            clave={(p) => p.id}
                        />
                    )}
                    {personas.length > 0 && (
                        <div className="cn-pie-tabla">
                            <p>Mostrando {visibles.length} de {personas.length} (ejemplo)</p>
                            <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                        </div>
                    )}
                    {cerrada && lista.correcciones.length > 0 && (
                        <ul className="cn-lista">
                            {lista.correcciones.map((x) => <li key={x.fecha + x.persona}>{x.persona}: {NOMBRE_MARCA[x.de]} → {NOMBRE_MARCA[x.a]} · {x.motivo} ({x.quien})</li>)}
                        </ul>
                    )}
                </Tarjeta>

                <div className="cn-acciones">
                    {cerrada ? (
                        <Link to={BASE_ASISTENCIA} className={clasesBoton("suave")}>Volver</Link>
                    ) : (
                        <>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => { setNombre(""); setContacto(""); setErrorCampo(""); setVentana("agregar"); }}>Agregar persona sin inscripción</button>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => void guardar()}>Guardar y seguir</button>
                            <button type="button" className={clasesBoton("verde")} onClick={() => setVentana("cerrar")}>Cerrar lista de asistencia</button>
                        </>
                    )}
                </div>
                <PieDatos />
            </Pagina>

            {ventana === "cerrar" && (
                <Ventana
                    titulo="¿Cerrar la lista de asistencia?"
                    texto="Después de cerrarla, los cambios requieren una corrección con motivo."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Seguir editando</button><button type="button" className={clasesBoton("verde")} onClick={() => { cerrarLista(a.folio); navigate(`${BASE_ASISTENCIA}/${a.folio}/cerrada`); }}>Cerrar lista</button></>}
                >
                    <Datos variante="caja" filas={[["Actividad", a.nombre], ["Presentes", String(c.presentes)], ["Ausentes", String(c.ausentes)], ["Sin marcar", c.sinMarcar ? `${c.sinMarcar} (se marcarán como ausentes)` : "0"]]} />
                </Ventana>
            )}
            {ventana === "agregar" && (
                <Ventana
                    titulo="Agregar persona sin inscripción"
                    texto={libres > 0 ? "Para quien llegó y hay lugar. Se cuenta como asistente." : "No quedan lugares en esta actividad."}
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} disabled={libres <= 0} onClick={() => { if (!nombre.trim()) return setErrorCampo("Escribe el nombre completo."); agregarSinInscripcion(a.folio, nombre, contacto); setVentana(null); }}>Agregar y marcar presente</button></>}
                >
                    <CampoTexto id="as-nombre" etiqueta="Nombre completo" obligatorio error={errorCampo}>
                        <input id="as-nombre" className={`cn-control ${errorCampo ? "cn-control--error" : ""}`} value={nombre} onChange={(e) => { setNombre(e.target.value); setErrorCampo(""); }} aria-invalid={!!errorCampo} />
                    </CampoTexto>
                    <CampoTexto id="as-contacto" etiqueta="Contacto (opcional)">
                        <input id="as-contacto" className="cn-control" value={contacto} onChange={(e) => setContacto(e.target.value)} />
                    </CampoTexto>
                    <Datos variante="caja" filas={[["Lugares libres", `${libres} de ${a.cupo}`]]} />
                </Ventana>
            )}
            {ventana && typeof ventana === "object" && (
                <Ventana
                    titulo="Corregir asistencia"
                    texto="El cambio queda en la bitácora con tu nombre, la fecha y el motivo."
                    alCerrar={() => setVentana(null)}
                    pie={<><button type="button" className={clasesBoton("contorno")} onClick={() => setVentana(null)}>Cancelar</button><button type="button" className={clasesBoton("verde")} onClick={() => { if (!motivo.trim()) return setErrorCampo("Escribe el motivo de la corrección."); corregir(a.folio, ventana.id, nueva, motivo); setVentana(null); }}>Guardar corrección</button></>}
                >
                    <Datos variante="caja" filas={[["Persona", ventana.persona], ["Actual", NOMBRE_MARCA[marcaDe(ventana.id, false)]]]} />
                    <CampoTexto id="as-nueva" etiqueta="Nueva asistencia" obligatorio>
                        <select id="as-nueva" className="cn-control" value={nueva} onChange={(e) => setNueva(e.target.value as Marca)}><option value="presente">Presente</option><option value="ausente">Ausente</option></select>
                    </CampoTexto>
                    <CampoTexto id="as-motivo" etiqueta="Motivo de la corrección" obligatorio error={errorCampo}>
                        <textarea id="as-motivo" className={`cn-control cn-control--area ${errorCampo ? "cn-control--error" : ""}`} placeholder="Ej.: sí asistió, se marcó por error." value={motivo} onChange={(e) => { setMotivo(e.target.value); setErrorCampo(""); }} aria-invalid={!!errorCampo} />
                    </CampoTexto>
                </Ventana>
            )}
        </PanelLayout>
    );
}

// Lista cerrada (Figma 570:26467)
export function ListaCerrada() {
    const { folio } = useParams();
    useActividades();
    const listas = useAsistencia();
    const a = obtenerActividad(folio);
    if (!a || !listaDe(a.folio, listas).cerrada) return <Navigate to={a ? `${BASE_ASISTENCIA}/${a.folio}` : BASE_ASISTENCIA} replace />;
    const c = conteo(a.folio, listas);
    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Asistencia", BASE_ASISTENCIA], ["Lista cerrada"]]} />
                <Encabezado grande etiqueta={`Actividad ${a.folio} · Asistencia`} titulo="Lista cerrada" texto="La asistencia quedó registrada." />
                <Resultado tono="verde" icono={iconoResultado} titulo={a.nombre} linea={`${c.presentes} presentes · ${c.ausentes} ausentes · ${porcentaje(c.presentes, c.inscritos + c.sinInscripcion)}% de asistencia`} chip={<Chip tono="verde">Lista cerrada</Chip>} />
                <div className="cn-acciones">
                    <Link to={BASE_ASISTENCIA} className={clasesBoton("verde")}>Volver a Asistencia</Link>
                    <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className={clasesBoton("contorno")}>Ver la lista</Link>
                </div>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

// Resumen de asistencia del mes (Figma 570:27596)
export function ResumenAsistencia() {
    const actividades = useActividades();
    const listas = useAsistencia();
    useInscripciones();
    const hoy = hoyISO();
    const mes = hoy.slice(0, 7);
    const pasadas = actividades.filter((a) => a.inscripcion && (a.estado === "publicada" || a.estado === "cancelada") && a.fecha <= hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const cerradas = pasadas.filter((a) => listaDe(a.folio, listas).cerrada);
    const asistentes = cerradas.reduce((s, a) => s + conteo(a.folio, listas).presentes, 0);
    const total = cerradas.reduce((s, a) => { const c = conteo(a.folio, listas); return s + c.inscritos + c.sinInscripcion; }, 0);
    const pendientes = pasadas.filter((a) => estadoLista(a.folio, new Date(), listas).clave === "pendiente").length;
    const [anio, m] = mes.split("-").map(Number);
    const nombreMes = new Date(anio, m - 1, 1).toLocaleDateString("es-MX", { month: "long" });

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Asistencia", BASE_ASISTENCIA], ["Resumen"]]} />
                <EncabezadoTarjeta volver={{ texto: "Volver a Asistencia", ruta: BASE_ASISTENCIA }} etiqueta="Asistencia" titulo="Resumen de asistencia" texto="Cómo ha ido la asistencia en las actividades ya realizadas (ejemplo)." />
                <BloqueResumen
                    insignia="Asistencia"
                    titulo={nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)}
                    resalte={String(anio)}
                    subtitulo="Registro de quién asistió a cada actividad · cifras de ejemplo"
                    accesos={[
                        { icono: iconoCheck, numero: `${porcentaje(asistentes, total)}%`, titulo: "Asistencia promedio", texto: "De inscritos", enlace: "", tono: "verde" },
                        { icono: iconoCheck, numero: cerradas.length, titulo: "Actividades cerradas", texto: "Con lista", enlace: "", tono: "verde" },
                        { icono: iconoCheck, numero: asistentes, titulo: "Asistentes", texto: "Total", enlace: "", tono: "verde" },
                        { icono: iconoReloj, numero: pendientes, titulo: "Listas pendientes", texto: "Sin cerrar", enlace: "", tono: "dorado" },
                    ]}
                />
                <Tarjeta icono={iconoTarjeta} titulo="Por actividad">
                    {pasadas.length === 0 ? (
                        <EstadoVacio icono={vacioReloj} titulo="Todavía no hay actividades realizadas" texto="Cuando se cierre una lista, aparecerá aquí." />
                    ) : (
                        <Tabla
                            columnas={[
                                { titulo: "FOLIO", ancho: 90, folio: true, celda: (a: Actividad) => <Link to={`${BASE_ASISTENCIA}/${a.folio}`} className="cn-enlace">{a.folio}</Link> },
                                { titulo: "ACTIVIDAD", fuerte: true, celda: (a: Actividad) => a.nombre },
                                { titulo: "FECHA", ancho: 120, celda: (a: Actividad) => fechaCorta(a.fecha) },
                                { titulo: "INSCRITOS", ancho: 90, celda: (a: Actividad) => a.inscritos },
                                { titulo: "PRESENTES", ancho: 90, celda: (a: Actividad) => (listaDe(a.folio, listas).cerrada ? conteo(a.folio, listas).presentes : "—") },
                                { titulo: "ASISTENCIA", ancho: 100, celda: (a: Actividad) => { if (!listaDe(a.folio, listas).cerrada) return "—"; const c = conteo(a.folio, listas); return `${porcentaje(c.presentes, c.inscritos + c.sinInscripcion)}%`; } },
                                { titulo: "ESTADO", ancho: 150, celda: (a: Actividad) => { const e = estadoLista(a.folio, new Date(), listas); return <Chip tono={e.tono} ancho={140}>{e.clave === "cerrada" ? "Cerrada" : e.texto}</Chip>; } },
                            ]}
                            filas={pasadas}
                            clave={(a) => a.folio}
                        />
                    )}
                </Tarjeta>
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Asistencia;

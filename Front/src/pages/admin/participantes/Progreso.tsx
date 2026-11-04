import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidoDemo/Contenidos.css";
import "../actividades/Actividades.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EstadoVacio, Filtros, Migas, Pagina, Paginacion, PieDatos, Tabla, Tarjeta } from "../contenidoDemo/piezas";
import { clasesBoton, paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "../actividades/datos";
import {
    avanceDe, disponibilidad, estadoRecompensa, NOMBRE_ESTADO_RECOMPENSA, obtenerMeta, obtenerRecompensa, porEntregarDe, useProgreso,
    type Entrega, type Meta, type Participante, type Recompensa,
} from "./progreso";
import { BASE_PROGRESO, TONO_RECOMPENSA } from "./utiles";
import iconoCheck from "../../../assets/admin/contenidos/resumen-check.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoArchivo from "../../../assets/admin/participantes/resumen-archivo-guinda.svg";
import iconoEstrella from "../../../assets/admin/participantes/tarjeta-estrella.svg";
import iconoLista from "../../../assets/admin/contenidos/tarjeta-lista.svg";
import vacioArchivo from "../../../assets/admin/actividades/vacio-archivo.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

type Vista = "participantes" | "reglas" | "recompensas" | "historial";
const POR_PAGINA = 6;

// Barra de avance (la misma que el cupo de Actividades)
function BarraAvance({ hechas, necesarias }: { hechas: number; necesarias: number }) {
    return (
        <span className="ac-cupo">
            <span className="ac-cupo__barra" role="img" aria-label={`${hechas} de ${necesarias} actividades`}>
                <span className="ac-cupo__relleno ac-cupo__relleno--verde" style={{ width: `${Math.min(100, (hechas / Math.max(1, necesarias)) * 100)}%` }} />
            </span>
            <strong>{Math.min(hechas, necesarias)} / {necesarias}</strong>
        </span>
    );
}

// Participantes · Progreso y recompensas: lista (Figma 572:27482), reglas (572:29055), recompensas (572:30815),
// historial de entregas (637:51129); vacíos 572:31267 y 572:31491
function Progreso() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { participantes, metas, recompensas, entregas, ajustesMes } = useProgreso();
    const vista = (["participantes", "reglas", "recompensas", "historial"].includes(params.get("vista") ?? "") ? params.get("vista") : "participantes") as Vista;
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);
    const texto = busqueda.trim().toLowerCase();
    const ir = (v: Vista) => { setParams(v === "participantes" ? {} : { vista: v }); setBusqueda(""); setPagina(0); };

    const mes = new Date().toISOString().slice(0, 7);
    const cumplidasMes = participantes.filter((p) => avanceDe(p).cumplida && (p.entregada?.fecha.startsWith(mes) || p.avances[0]?.fecha.startsWith(mes))).length;
    const porEntregar = participantes.filter((p) => estadoRecompensa(p) === "por-entregar").length;

    const pestanas = (
        <div className="cn-barra">
            <Filtros
                etiqueta="Qué ver"
                valor={vista === "historial" ? "recompensas" : vista}
                alCambiar={ir}
                opciones={[{ valor: "participantes", texto: "Participantes" }, { valor: "reglas", texto: "Reglas de progreso" }, { valor: "recompensas", texto: vista === "historial" ? "Historial de entregas" : "Recompensas" }]}
            />
            <Buscador
                texto={vista === "participantes" ? "Buscar por nombre o credencial" : vista === "reglas" ? "Buscar meta" : vista === "historial" ? "Buscar persona o recompensa" : "Buscar recompensa"}
                valor={busqueda}
                alCambiar={(v) => { setBusqueda(v); setPagina(0); }}
            />
        </div>
    );
    const sinResultados = (cosa: string) => (
        <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto={`Prueba con otro nombre de ${cosa}.`} accion={{ texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") }} />
    );

    const encabezado = {
        participantes: { etiqueta: "Participantes · Progreso", titulo: "Progreso y recompensas", texto: "Cómo avanzan las personas en las metas de lectura y participación, y qué recompensas les corresponden.", miga: "Lista" },
        reglas: { etiqueta: "Participantes · Progreso", titulo: "Reglas de progreso", texto: "Metas y puntos que definen cuándo una persona gana una recompensa.", miga: "Reglas" },
        recompensas: { etiqueta: "Participantes · Progreso", titulo: "Recompensas", texto: "Catálogo de lo que se puede entregar y cuánto hay.", miga: "Recompensas" },
        historial: { etiqueta: "Participantes · Historial", titulo: "Historial de entregas", texto: "Quién recibió cada recompensa, cuándo y quién la entregó.", miga: "Historial de entregas" },
    }[vista];

    let contenido;
    if (vista === "participantes") {
        const filas = participantes.filter((p) => !texto || p.nombre.toLowerCase().includes(texto) || p.folio.toLowerCase().includes(texto) || p.credencial.toLowerCase().includes(texto)).sort((a, b) => b.folio.localeCompare(a.folio));
        const { paginas, actual, visibles } = paginar(filas, pagina, POR_PAGINA);
        contenido = (
            <Tarjeta icono={iconoEstrella} titulo="Avance de las personas">
                {pestanas}
                {participantes.length === 0 ? (
                    <EstadoVacio icono={vacioArchivo} titulo="Aún no hay participantes" texto="Cuando alguien con cuenta asista a una actividad, aparecerá aquí su avance." />
                ) : filas.length === 0 ? sinResultados("persona o credencial") : (
                    <Tabla
                        columnas={[
                            { titulo: "N.º", ancho: 80, folio: true, celda: (p: Participante) => p.folio },
                            { titulo: "PERSONA", fuerte: true, celda: (p: Participante) => p.nombre },
                            { titulo: "META ACTUAL", ancho: 160, celda: (p: Participante) => obtenerMeta(p.meta)?.nombre ?? "Sin meta" },
                            { titulo: "AVANCE", ancho: 170, celda: (p: Participante) => { const a = avanceDe(p); return <BarraAvance hechas={a.hechas} necesarias={a.necesarias} />; } },
                            { titulo: "PUNTOS", ancho: 80, celda: (p: Participante) => avanceDe(p).puntos },
                            { titulo: "RECOMPENSA", ancho: 160, celda: (p: Participante) => { const e = estadoRecompensa(p); return <Chip tono={TONO_RECOMPENSA[e]} ancho={150}>{NOMBRE_ESTADO_RECOMPENSA[e]}</Chip>; } },
                            { titulo: "ACCIÓN", ancho: 70, celda: (p: Participante) => <Link to={`${BASE_PROGRESO}/${p.folio}`} className="cn-enlace">Ver →<span className="cn-solo-lectores"> {p.nombre}</span></Link> },
                        ]}
                        filas={visibles}
                        clave={(p) => p.folio}
                    />
                )}
                {filas.length > 0 && (
                    <div className="cn-pie-tabla">
                        <p>Mostrando {visibles.length} de {filas.length} (ejemplo)</p>
                        <Paginacion pagina={actual} paginas={paginas} alCambiar={setPagina} />
                    </div>
                )}
            </Tarjeta>
        );
    } else if (vista === "reglas") {
        const filas = metas.filter((m) => !texto || m.nombre.toLowerCase().includes(texto));
        contenido = (
            <>
                <Tarjeta icono={iconoLista} titulo="Metas activas">
                    {pestanas}
                    {filas.length === 0 ? (texto ? sinResultados("meta") : <EstadoVacio icono={vacioArchivo} titulo="Aún no hay metas" texto="Crea la primera con «Nueva meta»." />) : (
                        <Tabla
                            columnas={[
                                { titulo: "META", ancho: 190, folio: true, celda: (m: Meta) => m.nombre },
                                { titulo: "CONDICIÓN", fuerte: true, celda: (m: Meta) => `${m.necesarias} actividades en ${m.plazo}` },
                                { titulo: "RECOMPENSA", ancho: 200, celda: (m: Meta) => obtenerRecompensa(m.recompensa)?.nombre.replace(/ «.*»/, "") ?? "Sin recompensa" },
                                { titulo: "PERSONAS", ancho: 90, celda: (m: Meta) => participantes.filter((p) => p.meta === m.id).length },
                                { titulo: "ESTADO", ancho: 130, celda: (m: Meta) => <Chip tono={m.estado === "activa" ? "verde" : "gris"} ancho={120}>{m.estado === "activa" ? "Activa" : "Borrador"}</Chip> },
                                { titulo: "ACCIÓN", ancho: 90, celda: (m: Meta) => <Link to={`${BASE_PROGRESO}/metas/${m.id}`} className="cn-enlace">Editar →<span className="cn-solo-lectores"> {m.nombre}</span></Link> },
                            ]}
                            filas={filas}
                            clave={(m) => m.id}
                        />
                    )}
                </Tarjeta>
                <div className="cn-acciones"><Link to={`${BASE_PROGRESO}/metas/nueva`} className={clasesBoton("verde")}>Nueva meta</Link></div>
            </>
        );
    } else if (vista === "recompensas") {
        const filas = recompensas.filter((r) => !texto || r.nombre.toLowerCase().includes(texto));
        contenido = (
            <>
                <Tarjeta icono={iconoEstrella} titulo="Catálogo">
                    {pestanas}
                    {filas.length === 0 ? (texto ? sinResultados("recompensa") : <EstadoVacio icono={vacioArchivo} titulo="Aún no hay recompensas" texto="Crea la primera con «Nueva recompensa»." />) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "RECOMPENSA", folio: true, celda: (r: Recompensa) => <Link to={`${BASE_PROGRESO}/recompensas/${r.id}`} className="cn-enlace">{r.nombre}</Link> },
                                    { titulo: "TIPO", ancho: 130, celda: (r: Recompensa) => <strong>{r.tipo}</strong> },
                                    { titulo: "EXISTENCIAS", ancho: 110, celda: (r: Recompensa) => (r.existencias === null ? "—" : r.existencias) },
                                    { titulo: "ENTREGADAS", ancho: 100, celda: (r: Recompensa) => r.entregadas },
                                    { titulo: "POR ENTREGAR", ancho: 130, celda: (r: Recompensa) => { const n = porEntregarDe(r.id); return <Chip tono={n > 0 ? "dorado" : "verde"} ancho={110}>{n}</Chip>; } },
                                    { titulo: "ESTADO", ancho: 130, celda: (r: Recompensa) => { const d = disponibilidad(r); return <Chip tono={d.tono} ancho={120}>{d.texto}</Chip>; } },
                                ]}
                                filas={filas}
                                clave={(r) => r.id}
                            />
                            <p className="cn-nota">{filas.length} recompensas (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <div className="cn-acciones">
                    <Link to={`${BASE_PROGRESO}/recompensas/nueva`} className={clasesBoton("verde")}>Nueva recompensa</Link>
                    <button type="button" className={clasesBoton("verde")} onClick={() => ir("historial")}>Ver historial de entregas</button>
                </div>
            </>
        );
    } else {
        const filas = entregas.filter((e) => !texto || e.persona.toLowerCase().includes(texto) || (obtenerRecompensa(e.recompensa)?.nombre ?? "").toLowerCase().includes(texto));
        contenido = (
            <>
                <Tarjeta icono={iconoEstrella} titulo="Entregas">
                    {pestanas}
                    {filas.length === 0 ? (texto ? sinResultados("persona o recompensa") : <EstadoVacio icono={vacioArchivo} titulo="Aún no hay entregas" texto="Las recompensas entregadas aparecerán aquí." />) : (
                        <>
                            <Tabla
                                columnas={[
                                    { titulo: "RECOMPENSA", folio: true, celda: (e: Entrega) => obtenerRecompensa(e.recompensa)?.nombre ?? e.recompensa },
                                    { titulo: "PERSONA", ancho: 200, fuerte: true, celda: (e: Entrega) => e.persona },
                                    { titulo: "FECHA", ancho: 110, celda: (e: Entrega) => fechaCorta(e.fecha) },
                                    { titulo: "ENTREGÓ", ancho: 150, celda: (e: Entrega) => e.entrego },
                                    { titulo: "AVISO", ancho: 130, celda: (e: Entrega) => <Chip tono={e.aviso === "enviado" ? "dorado" : "verde"} ancho={120}>{e.aviso === "enviado" ? "Enviado" : "Sin contacto"}</Chip> },
                                    { titulo: "ESTADO", ancho: 130, celda: (e: Entrega) => <Chip tono={e.estado === "entregada" ? "verde" : "dorado"} ancho={120}>{e.estado === "entregada" ? "Entregada" : "Por recoger"}</Chip> },
                                ]}
                                filas={filas}
                                clave={(e) => e.id}
                            />
                            <p className="cn-nota">{filas.length} entregas (ejemplo)</p>
                        </>
                    )}
                </Tarjeta>
                <div className="cn-acciones"><button type="button" className={clasesBoton("verde")} onClick={() => ir("recompensas")}>Volver a Recompensas</button></div>
            </>
        );
    }

    return (
        <PanelLayout titulo="Participantes">
            <Pagina>
                <Migas pasos={[["Participantes"], ["Progreso y recompensas", vista === "participantes" ? undefined : BASE_PROGRESO], [encabezado.miga]]} />
                <Encabezado etiqueta={encabezado.etiqueta} titulo={encabezado.titulo} texto={encabezado.texto} />
                {vista === "participantes" && (
                    <BloqueResumen
                        insignia="Progreso y recompensas"
                        titulo="Resumen del"
                        resalte="programa"
                        subtitulo="Metas, avances y recompensas de participantes · cifras de ejemplo"
                        accesos={[
                            { icono: iconoCheck, numero: participantes.length, titulo: "Participantes activos", texto: "Con cuenta (ejemplo)", enlace: "", tono: "verde" },
                            { icono: iconoCheck, numero: cumplidasMes, titulo: "Metas cumplidas", texto: "Este mes", enlace: "Ver metas", tono: "verde", alPresionar: () => ir("reglas") },
                            { icono: iconoReloj, numero: porEntregar, titulo: "Recompensas por entregar", texto: "Pendientes", enlace: "Ver recompensas", tono: "dorado", alPresionar: () => ir("recompensas") },
                            { icono: iconoArchivo, numero: ajustesMes, titulo: "Ajustes manuales", texto: "Este mes", enlace: "Ver ficha", tono: "guinda", alPresionar: () => { const p = participantes.find((x) => x.avances.some((a) => a.origen === "Ajuste manual")); if (p) navigate(`${BASE_PROGRESO}/${p.folio}`); } },
                        ]}
                    />
                )}
                {contenido}
                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

export default Progreso;

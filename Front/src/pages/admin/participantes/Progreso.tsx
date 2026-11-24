import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "../actividades/Actividades.css";
import { Migas } from "../contenidoDemo/piezas";
import { Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Segmentado, Tarjeta, Vacio } from "../piezasPanel";
import { fechaCorta } from "../actividades/datos";
import { mensajeError } from "../../../servicios/api";
import {
    avanceNivel, disponibilidad, listarEntregas, listarParticipantes, listarRecompensas, NIVELES, nombreNivel, siguienteNivel,
    type Entrega, type Recompensa, type ResumenProgreso,
} from "../../../servicios/progreso";
import { diaDe, estadoCredencial, NOMBRE_ENTREGA, TEXTO_CREDENCIAL, TONO_ENTREGA } from "./progreso";
import { BASE_PROGRESO } from "./utiles";

// Participantes · Progreso y recompensas: lista (Figma 572:27482), niveles (antes «reglas», 572:29055), recompensas (572:30815),
// historial de entregas (637:51129); vacíos 572:31267 y 572:31491. Diseño de Aldahir (22 nov 2026)
// con los datos reales de HU-28 / HU-29 (servicios/progreso.ts). Niveles fijos del documento (D-11).

type Vista = "participantes" | "reglas" | "recompensas" | "historial";
type Datos = { participantes: ResumenProgreso[]; recompensas: Recompensa[]; entregas: Entrega[] };

function useDatos() {
    const [intento, setIntento] = useState(0);
    const [resultado, setResultado] = useState<{ intento: number; datos?: Datos; error?: string }>();
    const leer = useCallback(() => Promise.all([listarParticipantes(), listarRecompensas(), listarEntregas()])
        .then(([participantes, recompensas, entregas]) => ({ participantes, recompensas, entregas })), []);
    useEffect(() => {
        let vigente = true;
        leer().then((datos) => { if (vigente) setResultado({ intento, datos }); })
            .catch((error) => { if (vigente) setResultado({ intento, error: mensajeError(error) }); });
        return () => { vigente = false; };
    }, [leer, intento]);
    return { resultado: resultado?.intento === intento ? resultado : undefined, reintentar: () => setIntento((i) => i + 1) };
}

function Avance({ total }: { total: number }) {
    const s = siguienteNivel(total);
    const p = avanceNivel(total);
    return (
        <span className="ins-cupo" role="img" aria-label={s ? `${total} de ${s.desde} participaciones para ${s.nombre}` : `${total} participaciones, nivel más alto`}>
            <span className="ins-cupo__texto"><strong>{total}</strong>{s ? ` de ${s.desde}` : " participaciones"}<small>{s ? `${p}%` : "Nivel más alto"}</small></span>
            <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${s ? "dorado" : "verde"}`} style={{ width: `${p}%` }} /></span>
        </span>
    );
}

function Progreso() {
    const { resultado, reintentar } = useDatos();
    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Migas pasos={[["Participantes"], ["Progreso y recompensas"]]} />
            {!resultado ? <div className="pz-pagina"><Vacio icono="reloj" titulo="Cargando progreso…" texto="Esto tarda unos segundos." /></div>
                : resultado.error ? (
                    <div className="pz-pagina"><Vacio icono="alerta" titulo="No pudimos cargar el progreso" texto={resultado.error}
                        accion={<button type="button" className="pz-boton pz-boton--chico" onClick={reintentar}>Reintentar</button>} /></div>
                ) : <Contenido {...resultado.datos!} />}
        </PanelLayout>
    );
}

function Contenido({ participantes, recompensas, entregas }: Datos) {
    const [params, setParams] = useSearchParams();
    const vista = (["participantes", "reglas", "recompensas", "historial"].includes(params.get("vista") ?? "") ? params.get("vista") : "participantes") as Vista;
    const [busqueda, setBusqueda] = useState("");
    const [nivelFiltro, setNivelFiltro] = useState("");
    const texto = busqueda.trim().toLowerCase();
    const ir = (v: Vista) => { setParams(v === "participantes" ? {} : { vista: v }); setBusqueda(""); setNivelFiltro(""); };
    const porNivel = (n: number) => participantes.filter((p) => p.nivel === n).length;
    const pendientes = entregas.filter((e) => e.estado === "asignada");
    const conNivel = participantes.filter((p) => p.nivel > 0).length;

    const textos = {
        participantes: { titulo: "Avance de las personas", texto: "Quien tiene más participaciones va primero", buscar: "Buscar por nombre", icono: "grupo" as const },
        reglas: { titulo: "Niveles", texto: "Cuántas participaciones verificadas pide cada nivel", buscar: "Buscar nivel", icono: "lista" as const },
        recompensas: { titulo: "Catálogo de recompensas", texto: "Lo que se puede entregar y cuánto queda", buscar: "Buscar recompensa", icono: "recompensa" as const },
        historial: { titulo: "Historial de entregas", texto: "Quién recibió cada recompensa, cuándo y quién la registró", buscar: "Buscar persona o recompensa", icono: "bitacora" as const },
    }[vista];
    const accion = vista === "recompensas" ? <Link to={`${BASE_PROGRESO}/recompensas/nueva`} className="pz-boton pz-boton--chico">Nueva recompensa</Link> : undefined;
    const sinResultados = (cosa: string) => <Vacio icono="buscarCuenta" titulo={`Sin resultados para ${busqueda.trim()}`} texto={`Prueba con otro nombre de ${cosa}.`}
        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setBusqueda("")}>Limpiar búsqueda</button>} />;

    let lista;
    if (vista === "participantes") {
        const filas = participantes.filter((p) => (!nivelFiltro || String(p.nivel) === nivelFiltro) && (!texto || p.nombre.toLowerCase().includes(texto)))
            .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
        lista = participantes.length === 0 ? <Vacio icono="grupo" titulo="Aún no hay participantes" texto="Cuando el personal registre la asistencia de alguien con credencial, aparecerá aquí su avance." />
            : filas.length === 0 ? (texto ? sinResultados("persona") : <Vacio icono="buscarCuenta" titulo="Nadie en ese nivel" texto="Prueba con otro nivel."
                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setNivelFiltro("")}>Quitar filtros</button>} />) : (
                <ul className="pz-filas">
                    {filas.map((p) => {
                        const porEntregar = p.asignadas > 0;
                        return (
                            <li key={p.usuarioId}>
                                <article className={`pz-fila pr-fila${porEntregar ? " pz-fila--espera" : ""}`}>
                                    <span className="pz-rol-avatar pz-tono-rol--usuario ins-avatar" aria-hidden="true">{p.nombre.charAt(0)}</span>
                                    <div className="pz-fila__textos">
                                        <h4 className="pz-fila__titulo">{p.nombre}</h4>
                                        <p className="pz-fila__detalle"><span>{nombreNivel(p.nivel)}</span><span>{TEXTO_CREDENCIAL[estadoCredencial(p)]}</span>
                                            {p.noContadas > 0 && <span>{p.noContadas} sin contar</span>}</p>
                                    </div>
                                    <Avance total={p.total} />
                                    <Chip tono={porEntregar ? "dorado" : p.entregadas ? "verde" : "gris"}>{porEntregar ? "Por entregar" : p.entregadas ? `${p.entregadas} entregada${p.entregadas === 1 ? "" : "s"}` : "Sin recompensa"}</Chip>
                                    <Link to={`${BASE_PROGRESO}/${p.usuarioId}`} className={`pz-boton pz-boton--chico${porEntregar ? "" : " pz-boton--contorno"}`}>Ver<span className="solo-lectores"> {p.nombre}</span></Link>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            );
    } else if (vista === "reglas") {
        const filas = NIVELES.filter((n) => !texto || n.nombre.toLowerCase().includes(texto));
        lista = filas.length === 0 ? sinResultados("nivel") : (
            <ul className="pz-filas">
                {filas.map((n) => (
                    <li key={n.nivel}>
                        <article className="pz-fila pr-fila pr-fila--meta">
                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre="lista" /></span>
                            <div className="pz-fila__textos">
                                <h4 className="pz-fila__titulo">{n.nombre}</h4>
                                <p className="pz-fila__detalle"><span>{n.hasta === null ? `${n.desde} o más participaciones` : `De ${n.desde} a ${n.hasta} participaciones`}</span>
                                    <span>{recompensas.filter((r) => r.nivelRequerido === n.nivel && r.estado !== "archivada").length} recompensas desde este nivel</span>
                                    <span>{porNivel(n.nivel)} personas</span></p>
                            </div>
                            <Chip tono="verde">Vigente</Chip>
                        </article>
                    </li>
                ))}
            </ul>
        );
    } else if (vista === "recompensas") {
        const filas = recompensas.filter((r) => !texto || r.nombre.toLowerCase().includes(texto));
        lista = filas.length === 0 ? (texto ? sinResultados("recompensa") : <Vacio icono="recompensa" titulo="Aún no hay recompensas" texto="Crea la primera con Nueva recompensa." />) : (
            <ul className="pz-filas">
                {filas.map((r) => {
                    const d = disponibilidad(r);
                    return (
                        <li key={r.id}>
                            <article className="pz-fila pr-fila">
                                <span className="pz-fila__icono" aria-hidden="true"><Icono nombre="recompensa" /></span>
                                <div className="pz-fila__textos">
                                    <h4 className="pz-fila__titulo">{r.nombre}</h4>
                                    <p className="pz-fila__detalle"><span>Desde {nombreNivel(r.nivelRequerido)}</span><span>Hasta el {fechaCorta(diaDe(r.vigenciaFin))}</span>
                                        <span>{r.entregadas} entregadas</span>{r.asignadas > 0 && <span className="pz-fila__plazo pr-pendiente">{r.asignadas} por entregar</span>}</p>
                                </div>
                                <span className="ins-cupo"><span className="ins-cupo__texto"><strong>{r.existencias}</strong> en existencia</span></span>
                                <Chip tono={d.tono}>{d.texto}</Chip>
                                <Link to={`${BASE_PROGRESO}/recompensas/${r.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Editar<span className="solo-lectores"> {r.nombre}</span></Link>
                            </article>
                        </li>
                    );
                })}
            </ul>
        );
    } else {
        const filas = entregas.filter((e) => !texto || e.persona.toLowerCase().includes(texto) || e.recompensa.toLowerCase().includes(texto));
        lista = filas.length === 0 ? (texto ? sinResultados("persona o recompensa") : <Vacio icono="bitacora" titulo="Aún no hay entregas" texto="Las recompensas asignadas y entregadas aparecerán aquí." />) : (
            <ul className="pz-filas">
                {filas.map((e) => {
                    const [d, m] = fechaCorta(diaDe(e.confirmadaEn ?? e.canceladaEn ?? e.asignadaEn)).split(" ");
                    return (
                        <li key={e.id}>
                            <article className="pz-fila pr-fila pr-fila--entrega">
                                <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{(m ?? "").replace(".", "")}</span></span>
                                <div className="pz-fila__textos">
                                    <h4 className="pz-fila__titulo">{e.recompensa}</h4>
                                    <p className="pz-fila__detalle"><span>Para {e.persona}</span>
                                        <span>{e.estado === "entregada" ? `Entregó ${e.confirmadaPor}` : e.estado === "cancelada" ? `Canceló ${e.canceladaPor}` : `Asignó ${e.asignadaPor}`}</span>
                                        {e.autorizacion && <span>Autorización {e.autorizacion.referencia}</span>}</p>
                                </div>
                                <Chip tono={TONO_ENTREGA[e.estado]}>{NOMBRE_ENTREGA[e.estado]}</Chip>
                                <Link to={`${BASE_PROGRESO}/${e.usuarioId}`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver<span className="solo-lectores"> a {e.persona}</span></Link>
                            </article>
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <div className="pz-pagina">
            <Encabezado titulo="Progreso y recompensas" texto="Participaciones verificadas por el personal, nivel de cada persona y recompensas autorizadas por la Dirección.">
                <Cifra icono="grupo" valor={participantes.length} texto="participantes" activa={vista === "participantes"} alPresionar={() => ir("participantes")} />
                <Cifra icono="check" valor={conNivel} texto="con nivel Lector activo o más" activa={vista === "reglas"} alPresionar={() => ir("reglas")} />
                <Cifra icono="recompensa" tono="vino" valor={pendientes.length} texto="por entregar" activa={vista === "historial"} alPresionar={() => ir("historial")} />
            </Encabezado>
            <section className="pz-tarjeta cal-barra" aria-label="Qué ver y buscar">
                <div className="cal-barra__fila">
                    <Segmentado<Vista> etiqueta="Qué ver" valor={vista} alCambiar={ir} opciones={[
                        { valor: "participantes", texto: "Participantes", cantidad: participantes.length },
                        { valor: "reglas", texto: "Niveles", cantidad: NIVELES.length },
                        { valor: "recompensas", texto: "Recompensas", cantidad: recompensas.length },
                        { valor: "historial", texto: "Entregas", cantidad: entregas.length },
                    ]} />
                    <Buscador etiqueta={textos.buscar} placeholder={textos.buscar} valor={busqueda} alCambiar={setBusqueda}>
                        {vista === "participantes" && <FiltrosAvanzados activos={nivelFiltro ? 1 : 0} alQuitar={() => setNivelFiltro("")} grupos={[
                            { titulo: "Nivel", valor: nivelFiltro, alCambiar: setNivelFiltro, opciones: [
                                { valor: "", texto: "Todos", cantidad: participantes.length },
                                ...NIVELES.map((n) => ({ valor: String(n.nivel), texto: n.nombre, cantidad: porNivel(n.nivel) }))] },
                        ]} />}
                    </Buscador>
                </div>
            </section>
            <div className="pz-columnas">
                <Tarjeta icono={textos.icono} id="progreso-lista" titulo={textos.titulo} texto={textos.texto} className="pz-pendientes" accion={accion}>
                    <div className="pz-grupos" tabIndex={0} role="region" aria-label={textos.titulo}>{lista}</div>
                </Tarjeta>
                <aside className="pz-lateral" aria-label="Por entregar">
                    <Tarjeta icono="recompensa" id="progreso-pendientes" titulo="Por entregar" texto={pendientes.length ? "Asignadas, falta confirmar la entrega" : "Todo entregado"} className="pz-tarjeta--actividades">
                        {pendientes.length ? (
                            <ul className="pr-entregar">
                                {pendientes.map((e) => (
                                    <li key={e.id} className="pr-entregar__item">
                                        <div className="pr-entregar__persona">
                                            <span className="pz-rol-avatar pz-tono-rol--usuario ins-avatar" aria-hidden="true">{e.persona.charAt(0)}</span>
                                            <div className="pr-entregar__textos">
                                                <p className="pr-entregar__nombre">{e.persona}</p>
                                                <p className="pr-entregar__folio">Asignada el {fechaCorta(diaDe(e.asignadaEn))}</p>
                                            </div>
                                        </div>
                                        <dl className="pr-entregar__datos">
                                            <div><dt><Icono nombre="recompensa" />Recompensa</dt><dd>{e.recompensa}</dd></div>
                                            {e.autorizacion && <div><dt><Icono nombre="check" />Autorizó</dt><dd>{e.autorizacion.autoridad}, {e.autorizacion.referencia}</dd></div>}
                                        </dl>
                                        <Link to={`${BASE_PROGRESO}/${e.usuarioId}`} className="pz-boton pz-boton--chico pr-entregar__boton">Confirmar entrega<span className="solo-lectores"> a {e.persona}</span></Link>
                                    </li>
                                ))}
                            </ul>
                        ) : <Vacio icono="check" titulo="Nada pendiente" texto="Cuando asignes una recompensa, aparecerá aquí hasta que confirmes la entrega." />}
                    </Tarjeta>
                    <Plegable titulo="Cómo se gana una recompensa">
                        <ul>
                            <li>Cuenta una participación por sesión con asistencia registrada por el personal, si la credencial estaba validada y vigente ese día.</li>
                            <li>Niveles: Inicial (0 a 2), Lector activo (3 a 5) y Lector constante (6 o más).</li>
                            <li>Comentarios, propuestas o documentos no suman. Los ajustes manuales piden motivo.</li>
                            <li>Llegar a un nivel no entrega nada solo: el personal asigna la recompensa con la autorización de la Dirección y luego confirma la entrega.</li>
                        </ul>
                    </Plegable>
                </aside>
            </div>
        </div>
    );
}

export default Progreso;

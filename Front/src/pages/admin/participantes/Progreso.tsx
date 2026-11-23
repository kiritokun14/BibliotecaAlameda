import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "../actividades/EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "../actividades/Actividades.css";
import { Migas } from "../contenidoDemo/piezas";
import { Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Segmentado, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { fechaCorta } from "../actividades/datos";
import { avanceDe, disponibilidad, estadoRecompensa, NOMBRE_ESTADO_RECOMPENSA, obtenerMeta, obtenerRecompensa, porEntregarDe, useProgreso } from "./progreso";
import { BASE_PROGRESO, TONO_RECOMPENSA } from "./utiles";

// Participantes · Progreso y recompensas: lista (Figma 572:27482), reglas (572:29055), recompensas (572:30815),
// historial de entregas (637:51129); vacíos 572:31267 y 572:31491. Rehecho con las piezas del panel (22 nov 2026).
// Los datos siguen siendo de ejemplo (progreso.ts); el backend lo prepara otro programador.

type Vista = "participantes" | "reglas" | "recompensas" | "historial";
const tono = (t: string): TonoEstado => (t === "azul" ? "verde" : (t as TonoEstado));

function Avance({ hechas, necesarias }: { hechas: number; necesarias: number }) {
    const p = Math.min(100, (hechas / Math.max(1, necesarias)) * 100);
    return (
        <span className="ins-cupo" role="img" aria-label={`${hechas} de ${necesarias} actividades`}>
            <span className="ins-cupo__texto"><strong>{Math.min(hechas, necesarias)}</strong> de {necesarias}<small>{p >= 100 ? "Cumplida" : `${Math.round(p)}%`}</small></span>
            <span className="pz-ocupacion" aria-hidden="true"><span className={`pz-ocupacion__relleno pz-ocupacion__relleno--${p >= 100 ? "verde" : "dorado"}`} style={{ width: `${p}%` }} /></span>
        </span>
    );
}

function Progreso() {
    const [params, setParams] = useSearchParams();
    const { participantes, metas, recompensas, entregas, ajustesMes } = useProgreso();
    const vista = (["participantes", "reglas", "recompensas", "historial"].includes(params.get("vista") ?? "") ? params.get("vista") : "participantes") as Vista;
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState("");
    const texto = busqueda.trim().toLowerCase();
    const ir = (v: Vista) => { setParams(v === "participantes" ? {} : { vista: v }); setBusqueda(""); setEstadoFiltro(""); };
    const cuentaEstado = (e: string) => participantes.filter((p) => estadoRecompensa(p) === e).length;

    const mes = new Date().toISOString().slice(0, 7);
    const cumplidasMes = participantes.filter((p) => avanceDe(p).cumplida && (p.entregada?.fecha.startsWith(mes) || p.avances[0]?.fecha.startsWith(mes))).length;
    const pendientes = participantes.filter((p) => estadoRecompensa(p) === "por-entregar");
    const textos = {
        participantes: { titulo: "Avance de las personas", texto: "Quien está más cerca de su meta va primero", buscar: "Buscar por nombre o credencial", icono: "grupo" as const },
        reglas: { titulo: "Metas", texto: "Cuándo una persona gana una recompensa", buscar: "Buscar meta", icono: "lista" as const },
        recompensas: { titulo: "Catálogo de recompensas", texto: "Lo que se puede entregar y cuánto queda", buscar: "Buscar recompensa", icono: "recompensa" as const },
        historial: { titulo: "Historial de entregas", texto: "Quién recibió cada recompensa, cuándo y quién la entregó", buscar: "Buscar persona o recompensa", icono: "bitacora" as const },
    }[vista];
    const accion = vista === "reglas" ? <Link to={`${BASE_PROGRESO}/metas/nueva`} className="pz-boton pz-boton--chico">Nueva meta</Link>
        : vista === "recompensas" ? <Link to={`${BASE_PROGRESO}/recompensas/nueva`} className="pz-boton pz-boton--chico">Nueva recompensa</Link> : undefined;
    const sinResultados = (cosa: string) => <Vacio icono="buscarCuenta" titulo={`Sin resultados para ${busqueda.trim()}`} texto={`Prueba con otro nombre de ${cosa}.`}
        accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setBusqueda("")}>Limpiar búsqueda</button>} />;

    let lista;
    if (vista === "participantes") {
        const filas = participantes.filter((p) => (!estadoFiltro || estadoRecompensa(p) === estadoFiltro) && (!texto || p.nombre.toLowerCase().includes(texto) || p.folio.toLowerCase().includes(texto) || p.credencial.toLowerCase().includes(texto)))
            .sort((a, b) => { const x = avanceDe(a), y = avanceDe(b); return y.hechas / Math.max(1, y.necesarias) - x.hechas / Math.max(1, x.necesarias); });
        lista = participantes.length === 0 ? <Vacio icono="grupo" titulo="Aún no hay participantes" texto="Cuando alguien con cuenta asista a una actividad, aparecerá aquí su avance." />
            : filas.length === 0 ? (texto ? sinResultados("persona o credencial") : <Vacio icono="buscarCuenta" titulo="Nadie con ese estado" texto="Prueba con otro estado de recompensa."
                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => setEstadoFiltro("")}>Quitar filtros</button>} />) : (
                <ul className="pz-filas">
                    {filas.map((p) => {
                        const a = avanceDe(p);
                        const e = estadoRecompensa(p);
                        return (
                            <li key={p.folio}>
                                <article className={`pz-fila pr-fila${e === "por-entregar" ? " pz-fila--espera" : ""}`}>
                                    <span className="pz-rol-avatar pz-tono-rol--usuario ins-avatar" aria-hidden="true">{p.nombre.charAt(0)}</span>
                                    <div className="pz-fila__textos">
                                        <h4 className="pz-fila__titulo">{p.nombre}</h4>
                                        <p className="pz-fila__detalle"><span className="pz-fila__folio">{p.folio}</span><span>{obtenerMeta(p.meta)?.nombre ?? "Sin meta"}</span><span>{a.puntos} puntos</span></p>
                                    </div>
                                    <Avance hechas={a.hechas} necesarias={a.necesarias} />
                                    <Chip tono={tono(TONO_RECOMPENSA[e])}>{NOMBRE_ESTADO_RECOMPENSA[e]}</Chip>
                                    <Link to={`${BASE_PROGRESO}/${p.folio}`} className={`pz-boton pz-boton--chico${e === "por-entregar" ? "" : " pz-boton--contorno"}`}>{e === "por-entregar" ? "Entregar" : "Ver"}<span className="solo-lectores"> {p.nombre}</span></Link>
                                </article>
                            </li>
                        );
                    })}
                </ul>
            );
    } else if (vista === "reglas") {
        const filas = metas.filter((m) => !texto || m.nombre.toLowerCase().includes(texto));
        lista = filas.length === 0 ? (texto ? sinResultados("meta") : <Vacio icono="lista" titulo="Aún no hay metas" texto="Crea la primera con Nueva meta." />) : (
            <ul className="pz-filas">
                {filas.map((m) => (
                    <li key={m.id}>
                        <article className="pz-fila pr-fila pr-fila--meta">
                            <span className="pz-fila__icono" aria-hidden="true"><Icono nombre="lista" /></span>
                            <div className="pz-fila__textos">
                                <h4 className="pz-fila__titulo">{m.nombre}</h4>
                                <p className="pz-fila__detalle"><span>{m.necesarias} actividades en {m.plazo}</span><span>Recompensa: {obtenerRecompensa(m.recompensa)?.nombre ?? "sin recompensa"}</span>
                                    <span>{participantes.filter((p) => p.meta === m.id).length} personas</span></p>
                            </div>
                            <Chip tono={m.estado === "activa" ? "verde" : "gris"}>{m.estado === "activa" ? "Activa" : "Borrador"}</Chip>
                            <Link to={`${BASE_PROGRESO}/metas/${m.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Editar<span className="solo-lectores"> {m.nombre}</span></Link>
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
                    const n = porEntregarDe(r.id);
                    return (
                        <li key={r.id}>
                            <article className="pz-fila pr-fila">
                                <span className="pz-fila__icono" aria-hidden="true"><Icono nombre="recompensa" /></span>
                                <div className="pz-fila__textos">
                                    <h4 className="pz-fila__titulo">{r.nombre}</h4>
                                    <p className="pz-fila__detalle"><span>{r.tipo}</span><span>{r.entregadas} entregadas</span>{n > 0 && <span className="pz-fila__plazo pr-pendiente">{n} por entregar</span>}</p>
                                </div>
                                <span className="ins-cupo"><span className="ins-cupo__texto"><strong>{r.existencias === null ? "Sin límite" : r.existencias}</strong>{r.existencias !== null && " en existencia"}</span></span>
                                <Chip tono={tono(d.tono)}>{d.texto}</Chip>
                                <Link to={`${BASE_PROGRESO}/recompensas/${r.id}`} className="pz-boton pz-boton--contorno pz-boton--chico">Abrir<span className="solo-lectores"> {r.nombre}</span></Link>
                            </article>
                        </li>
                    );
                })}
            </ul>
        );
    } else {
        const filas = entregas.filter((e) => !texto || e.persona.toLowerCase().includes(texto) || (obtenerRecompensa(e.recompensa)?.nombre ?? "").toLowerCase().includes(texto));
        lista = filas.length === 0 ? (texto ? sinResultados("persona o recompensa") : <Vacio icono="bitacora" titulo="Aún no hay entregas" texto="Las recompensas entregadas aparecerán aquí." />) : (
            <ul className="pz-filas">
                {filas.map((e) => {
                    const [d, m] = fechaCorta(e.fecha).split(" ");
                    return (
                        <li key={e.id}>
                            <article className="pz-fila pr-fila pr-fila--entrega">
                                <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{(m ?? "").replace(".", "")}</span></span>
                                <div className="pz-fila__textos">
                                    <h4 className="pz-fila__titulo">{obtenerRecompensa(e.recompensa)?.nombre ?? e.recompensa}</h4>
                                    <p className="pz-fila__detalle"><span>Para {e.persona}</span><span>Entregó {e.entrego}</span><span>{e.aviso === "enviado" ? "Aviso enviado" : "Sin contacto"}</span></p>
                                </div>
                                <Chip tono={e.estado === "entregada" ? "verde" : "dorado"}>{e.estado === "entregada" ? "Entregada" : "Por recoger"}</Chip>
                            </article>
                        </li>
                    );
                })}
            </ul>
        );
    }

    return (
        <PanelLayout titulo="Participantes" tema="contenidos paleta">
            <Migas pasos={[["Participantes"], ["Progreso y recompensas"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Progreso y recompensas" texto="Cómo avanzan las personas en sus metas de lectura y participación, y qué recompensas les corresponden.">
                    <Cifra icono="grupo" valor={participantes.length} texto="participantes" activa={vista === "participantes"} alPresionar={() => ir("participantes")} />
                    <Cifra icono="check" valor={cumplidasMes} texto="metas cumplidas este mes" activa={vista === "reglas"} alPresionar={() => ir("reglas")} />
                    <Cifra icono="recompensa" tono="vino" valor={pendientes.length} texto="por entregar" activa={vista === "recompensas"} alPresionar={() => ir("recompensas")} />
                </Encabezado>
                <section className="pz-tarjeta cal-barra" aria-label="Qué ver y buscar">
                    <div className="cal-barra__fila">
                        <Segmentado<Vista> etiqueta="Qué ver" valor={vista} alCambiar={ir} opciones={[
                            { valor: "participantes", texto: "Participantes", cantidad: participantes.length },
                            { valor: "reglas", texto: "Metas", cantidad: metas.length },
                            { valor: "recompensas", texto: "Recompensas", cantidad: recompensas.length },
                            { valor: "historial", texto: "Entregas", cantidad: entregas.length },
                        ]} />
                        <Buscador etiqueta={textos.buscar} placeholder={textos.buscar} valor={busqueda} alCambiar={setBusqueda}>
                            {vista === "participantes" && <FiltrosAvanzados activos={estadoFiltro ? 1 : 0} alQuitar={() => setEstadoFiltro("")} grupos={[
                                { titulo: "Recompensa", valor: estadoFiltro, alCambiar: setEstadoFiltro, opciones: [
                                    { valor: "", texto: "Todas", cantidad: participantes.length },
                                    { valor: "por-entregar", texto: NOMBRE_ESTADO_RECOMPENSA["por-entregar"], cantidad: cuentaEstado("por-entregar") },
                                    { valor: "entregada", texto: NOMBRE_ESTADO_RECOMPENSA.entregada, cantidad: cuentaEstado("entregada") },
                                    { valor: "sin", texto: NOMBRE_ESTADO_RECOMPENSA.sin, cantidad: cuentaEstado("sin") }] },
                            ]} />}
                        </Buscador>
                    </div>
                </section>
                <div className="pz-columnas">
                    <Tarjeta icono={textos.icono} id="progreso-lista" titulo={textos.titulo} texto={textos.texto} className="pz-pendientes" accion={accion}>
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label={textos.titulo}>{lista}</div>
                    </Tarjeta>
                    <aside className="pz-lateral" aria-label="Por entregar">
                        <Tarjeta icono="recompensa" id="progreso-pendientes" titulo="Por entregar" texto={pendientes.length ? "Ya cumplieron su meta" : "Todo entregado"} className="pz-tarjeta--actividades">
                            {pendientes.length ? (
                                <ul className="pr-entregar">
                                    {pendientes.map((p) => {
                                        const meta = obtenerMeta(p.meta);
                                        const a = avanceDe(p);
                                        return (
                                            <li key={p.folio} className="pr-entregar__item">
                                                <div className="pr-entregar__persona">
                                                    <span className="pz-rol-avatar pz-tono-rol--usuario ins-avatar" aria-hidden="true">{p.nombre.charAt(0)}</span>
                                                    <div className="pr-entregar__textos">
                                                        <p className="pr-entregar__nombre">{p.nombre}</p>
                                                        <p className="pr-entregar__folio">{p.folio}, {/^credencial/i.test(p.credencial) ? p.credencial.toLowerCase() : `credencial ${p.credencial}`}</p>
                                                    </div>
                                                </div>
                                                <dl className="pr-entregar__datos">
                                                    <div><dt><Icono nombre="recompensa" />Recompensa</dt><dd>{obtenerRecompensa(meta?.recompensa ?? "")?.nombre ?? "La de su meta"}</dd></div>
                                                    <div><dt><Icono nombre="check" />Meta</dt><dd>{meta?.nombre ?? "Sin meta"}, {a.hechas} de {a.necesarias}</dd></div>
                                                </dl>
                                                <Link to={`${BASE_PROGRESO}/${p.folio}`} className="pz-boton pz-boton--chico pr-entregar__boton">Entregar recompensa<span className="solo-lectores"> a {p.nombre}</span></Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <Vacio icono="check" titulo="Nada pendiente" texto="Cuando alguien cumpla su meta, aparecerá aquí para entregarle su recompensa." />}
                            <p className="pz-acciones__nota">{ajustesMes} {ajustesMes === 1 ? "ajuste manual" : "ajustes manuales"} este mes.</p>
                        </Tarjeta>
                        <Plegable titulo="Cómo se gana una recompensa">
                            <ul>
                                <li>Cada actividad a la que asiste una persona con cuenta suma a su meta.</li>
                                <li>Al cumplir la meta, su recompensa queda Por entregar.</li>
                                <li>Al entregarla, se registra quién la entregó y se avisa a la persona.</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

export default Progreso;

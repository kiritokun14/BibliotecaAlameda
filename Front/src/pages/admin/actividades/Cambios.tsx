// Actividades › Cambios y cancelaciones: bandeja (Figma 569:22126, sin cambios 569:25772, sin resultados 569:26013)
// e historial (569:25331). Rehecho con las piezas del panel (22 nov 2026); los datos siguen siendo de ejemplo (cambios.ts).
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Migas } from "../componentes";
import { Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Segmentado, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "../piezasPanel";
import { fechaCorta } from "./datos";
import { NOMBRE_ESTADO_CAMBIO, useCambios, type Cambio, type FiltroCambio, type Programacion, type TipoCambio } from "./cambios";
import { BASE_CAMBIOS, BASE_PROPUESTAS } from "./utiles";

const HISTORIAL = `${BASE_CAMBIOS}?vista=historial`;
const TIPOS: TipoCambio[] = ["Cambio de fecha", "Cambio de horario", "Cambio de sala", "Reprogramación", "Cancelación"];
const TONO: Record<Cambio["estado"], TonoEstado> = { pendiente: "dorado", aplicado: "verde", rechazado: "guinda" };
const ICONO_TIPO: Record<TipoCambio, NombreIcono> = { "Cambio de fecha": "calendario", "Cambio de horario": "reloj", "Cambio de sala": "espacios", Reprogramación: "calendario", Cancelación: "alerta" };
const programacion = (p: Programacion) => `${fechaCorta(p.fecha)}, ${p.hora}, ${p.sala}`;
const horaDe = (iso: string) => iso.slice(11, 16);
const decision = (c: Cambio) => c.aplico?.fecha ?? c.rechazo?.fecha ?? c.solicitado;

function FilaCambio({ c }: { c: Cambio }) {
    return (
        <article className={`pz-fila${c.estado === "pendiente" ? " pz-fila--espera" : ""}`}>
            <span className={`pz-fila__icono${c.tipo === "Cancelación" ? " pz-fila__icono--vino" : ""}`} aria-hidden="true"><Icono nombre={ICONO_TIPO[c.tipo] ?? "calendario"} /></span>
            <div className="pz-fila__textos">
                <h4 className="pz-fila__titulo">{c.nombre}</h4>
                <p className="pz-fila__detalle"><span className="pz-fila__folio">{c.folio}</span><span>{c.tipo}</span><span>Pidió {c.solicito}</span><span>{c.inscritos} inscritos</span></p>
                <p className="ac-cambio">
                    <span className="ac-cambio__antes">{programacion(c.antes)}</span>
                    <span className="ac-cambio__a">pasa a</span>
                    <span className="ac-cambio__despues">{c.despues ? programacion(c.despues) : "Se cancela"}</span>
                </p>
            </div>
            <Chip tono={TONO[c.estado]}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</Chip>
            <Link to={`${BASE_CAMBIOS}/${c.folio}`} className={`pz-boton pz-boton--chico${c.estado === "pendiente" ? "" : " pz-boton--contorno"}`}>{c.estado === "pendiente" ? "Revisar" : "Abrir"}<span className="solo-lectores"> {c.folio}</span></Link>
        </article>
    );
}

function Cambios() {
    const [params] = useSearchParams();
    const cambios = useCambios();
    const [filtro, setFiltro] = useState<FiltroCambio>("todos");
    const [tipo, setTipo] = useState("");
    const [busqueda, setBusqueda] = useState("");

    if (params.get("vista") === "historial") return <Historial cambios={cambios} />;

    const texto = busqueda.trim().toLowerCase();
    const cuenta = (e: FiltroCambio) => cambios.filter((c) => e === "todos" || c.estado === e).length;
    const orden = { pendiente: 0, aplicado: 1, rechazado: 2 };
    const filtrados = [...cambios]
        .sort((a, b) => orden[a.estado] - orden[b.estado] || b.folio.localeCompare(a.folio))
        .filter((c) => (filtro === "todos" || c.estado === filtro) && (!tipo || c.tipo === tipo)
            && (!texto || c.folio.toLowerCase().includes(texto) || c.nombre.toLowerCase().includes(texto)));
    const alternar = (f: FiltroCambio) => setFiltro(filtro === f ? "todos" : f);
    const limpiar = () => { setBusqueda(""); setTipo(""); setFiltro("todos"); };
    const recientes = cambios.filter((c) => c.estado !== "pendiente").sort((a, b) => decision(b).localeCompare(decision(a))).slice(0, 4);
    const avisados = cambios.reduce((s, c) => s + c.avisados, 0);

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Cambios y cancelaciones" texto="Revisa y aplica los cambios a actividades ya programadas. Al aplicarlos se avisa a las personas inscritas.">
                    <Cifra icono="reloj" tono="vino" valor={cuenta("pendiente")} texto="pendientes" activa={filtro === "pendiente"} alPresionar={() => alternar("pendiente")} />
                    <Cifra icono="check" valor={cuenta("aplicado")} texto="aplicados" activa={filtro === "aplicado"} alPresionar={() => alternar("aplicado")} />
                    <Cifra icono="alerta" valor={cuenta("rechazado")} texto="rechazados" activa={filtro === "rechazado"} alPresionar={() => alternar("rechazado")} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="calendario" id="cambios-lista" titulo="Cambios solicitados" texto="Primero los que esperan tu decisión" className="pz-pendientes"
                        accion={<Link className="pz-boton pz-boton--chico" to={BASE_PROPUESTAS}>Reprogramar o cancelar</Link>}>
                        <Buscador etiqueta="Buscar por folio o actividad" placeholder="Folio o actividad" valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={(filtro !== "todos" ? 1 : 0) + (tipo ? 1 : 0)} alQuitar={() => { setFiltro("todos"); setTipo(""); }} grupos={[
                                { titulo: "Estado", valor: filtro, alCambiar: (v) => setFiltro(v as FiltroCambio), opciones: (["todos", "pendiente", "aplicado", "rechazado"] as FiltroCambio[]).map((e) => ({ valor: e, texto: e === "todos" ? "Todos" : NOMBRE_ESTADO_CAMBIO[e], cantidad: cuenta(e) })) },
                                { titulo: "Tipo de cambio", valor: tipo, alCambiar: setTipo, opciones: [{ valor: "", texto: "Todos" }, ...TIPOS.map((t) => ({ valor: t, texto: t, cantidad: cambios.filter((c) => c.tipo === t).length }))] },
                            ]} />
                        </Buscador>
                        {cambios.length === 0 ? <Vacio icono="check" titulo="Aún no hay cambios" texto="Cuando alguien pida reprogramar o cancelar una actividad, aparecerá aquí." />
                            : filtrados.length === 0 ? <Vacio icono="buscarCuenta" titulo={texto ? `Sin resultados para ${busqueda.trim()}` : "No hay cambios con estos filtros"} texto="Prueba con otra palabra u otro filtro."
                                accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                            : (
                                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Cambios solicitados">
                                    <ul className="pz-filas">{filtrados.map((c) => <li key={c.folio}><FilaCambio c={c} /></li>)}</ul>
                                </div>
                            )}
                        <div className="pz-tarjeta__pie">
                            <p aria-live="polite">{filtrados.length} de {cambios.length} cambios</p>
                        </div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Lo último decidido">
                        <Tarjeta icono="bitacora" id="cambios-recientes" titulo="Lo último decidido" texto={`${avisados} personas avisadas en total`} className="pz-tarjeta--actividades">
                            {recientes.length ? (
                                <ol className="pz-linea">
                                    {recientes.map((c, i) => (
                                        <li key={c.folio} className={`pz-linea__paso pz-linea__paso--${c.estado === "aplicado" ? "verde" : "guinda"}${i === 0 ? " pz-linea__paso--actual" : ""}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={c.estado === "aplicado" ? "check" : "alerta"} /></span>
                                            <div className="pz-linea__textos">
                                                <Link to={`${BASE_CAMBIOS}/${c.folio}`} className="pz-linea__titulo pz-enlace-fila">{c.tipo}: {c.nombre}</Link>
                                                <p className="pz-linea__detalle">{fechaCorta(decision(c))}, {c.estado === "aplicado" ? `aplicó ${c.aplico?.quien}` : "rechazado"}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            ) : <Vacio icono="bitacora" titulo="Nada decidido aún" texto="Lo que apliques o rechaces aparecerá aquí." />}
                            <Link to={HISTORIAL} className="pz-boton pz-boton--contorno pz-boton--chico cal-ver-dia">Ver historial completo</Link>
                        </Tarjeta>
                        {import.meta.env.DEV && (
                            <section className="pz-tarjeta ac-desarrollo" aria-labelledby="cambios-desarrollo">
                                <div className="ac-desarrollo__cabecera">
                                    <span className="ac-desarrollo__insignia" aria-hidden="true"><Icono nombre="configuracion" /></span>
                                    <div><h3 id="cambios-desarrollo">Solo en desarrollo</h3><p>Simula una cancelación o una reprogramación para revisar las pantallas. No se ve en producción.</p></div>
                                </div>
                                <div className="pz-acciones pz-acciones--fila">
                                    <Link to={`${BASE_CAMBIOS}/cancelar`} className="pz-boton pz-boton--contorno pz-boton--chico">Cancelación</Link>
                                    <Link to={`${BASE_CAMBIOS}/reprogramar`} className="pz-boton pz-boton--contorno pz-boton--chico">Reprogramación</Link>
                                </div>
                            </section>
                        )}
                        <Plegable titulo="Cómo funciona un cambio">
                            <ul>
                                <li>Quien coordina la actividad pide el cambio desde la sesión (fecha, hora, sala o cancelación).</li>
                                <li>Lo revisas: si lo aplicas, la agenda se actualiza y se avisa a cada persona inscrita.</li>
                                <li>Si lo rechazas, se queda la programación original y se guarda el motivo.</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

// Historial: todo lo decidido (aplicado o rechazado), lo más reciente primero | resumen
function Historial({ cambios }: { cambios: Cambio[] }) {
    const [estado, setEstado] = useState<"todos" | "aplicado" | "rechazado">("todos");
    const decididos = cambios.filter((c) => c.estado !== "pendiente").sort((a, b) => decision(b).localeCompare(decision(a)));
    const visibles = decididos.filter((c) => estado === "todos" || c.estado === estado);
    const aplicados = decididos.filter((c) => c.estado === "aplicado");
    const avisados = aplicados.reduce((s, c) => s + c.avisados, 0);
    const porTipo = TIPOS.map((t) => ({ t, n: decididos.filter((c) => c.tipo === t).length })).filter((x) => x.n);
    const maximo = Math.max(1, ...porTipo.map((x) => x.n));

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones", BASE_CAMBIOS], ["Historial"]]} />
            <div className="pz-pagina">
                <Encabezado titulo="Historial de cambios" texto="Lo que se aplicó o rechazó, quién lo decidió, qué cambió y a cuántas personas se avisó.">
                    <Cifra icono="check" valor={aplicados.length} texto="aplicados" />
                    <Cifra icono="grupo" valor={avisados} texto="personas avisadas" />
                    <Cifra icono="alerta" tono="vino" valor={decididos.length - aplicados.length} texto="rechazados" />
                </Encabezado>
                <div className="pz-columnas">
                    <Tarjeta icono="bitacora" id="historial-cambios" titulo="Línea de tiempo" texto="Lo más reciente primero" className="pz-pendientes"
                        accion={<Link to={BASE_CAMBIOS} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>}>
                        <Segmentado etiqueta="Filtrar historial" valor={estado} alCambiar={setEstado} opciones={[
                            { valor: "todos", texto: "Todos", cantidad: decididos.length },
                            { valor: "aplicado", texto: "Aplicados", cantidad: aplicados.length },
                            { valor: "rechazado", texto: "Rechazados", cantidad: decididos.length - aplicados.length },
                        ]} />
                        {visibles.length === 0 ? <Vacio icono="bitacora" titulo="Todavía no hay cambios decididos" texto="Lo que apliques o rechaces aparecerá aquí con su responsable." /> : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label="Historial de cambios">
                                <ol className="pz-linea pz-linea--tarjetas">
                                    {visibles.map((c) => (
                                        <li key={c.folio} className={`pz-linea__paso pz-linea__paso--${c.estado === "aplicado" ? "verde" : "guinda"}`}>
                                            <span className="pz-linea__icono" aria-hidden="true"><Icono nombre={ICONO_TIPO[c.tipo] ?? "calendario"} /></span>
                                            <div className="pz-linea__textos ac-historial-tarjeta">
                                                <p className="pz-linea__titulo">{c.tipo}: {c.nombre} <Chip tono={TONO[c.estado]}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</Chip></p>
                                                <p className="pz-linea__detalle">{fechaCorta(decision(c))} {horaDe(decision(c))}, {c.estado === "aplicado" ? `aplicó ${c.aplico?.quien}` : "rechazado por Coordinación"}, <Link to={`${BASE_CAMBIOS}/${c.folio}`}>{c.folio}</Link></p>
                                                <p className="ac-cambio">
                                                    <span className="ac-cambio__antes">{programacion(c.antes)}</span>
                                                    <span className="ac-cambio__a">pasa a</span>
                                                    <span className="ac-cambio__despues">{c.despues ? programacion(c.despues) : "Se cancela"}</span>
                                                </p>
                                                <p className="pz-linea__nota">{c.estado === "rechazado" ? `Motivo del rechazo: ${c.rechazo?.motivo ?? "sin motivo"}` : `Motivo: ${c.motivo}`}</p>
                                                {c.estado === "aplicado" && <p className="pz-linea__detalle">{c.avisados ? `Se avisó a ${c.avisados} ${c.avisados === 1 ? "persona inscrita" : "personas inscritas"}.` : "No había personas inscritas que avisar."}</p>}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </Tarjeta>
                    <aside className="pz-lateral" aria-label="Por tipo de cambio">
                        <Tarjeta icono="estadisticas" id="historial-tipos" titulo="Por tipo de cambio" texto="Lo decidido hasta hoy" className="pz-tarjeta--actividades">
                            {porTipo.length ? (
                                <ol className="pz-ranking">
                                    {porTipo.map(({ t, n }) => (
                                        <li key={t}>
                                            <span className="pz-ranking__lugar" aria-hidden="true"><Icono nombre={ICONO_TIPO[t]} /></span>
                                            <div className="pz-ranking__textos">
                                                <p className="pz-ranking__nombre">{t}</p>
                                                <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: `${(n / maximo) * 100}%` }} /></span>
                                            </div>
                                            <p className="pz-ranking__valor"><strong>{n}</strong></p>
                                        </li>
                                    ))}
                                </ol>
                            ) : <Vacio icono="estadisticas" titulo="Sin datos" texto="Aún no hay cambios decididos." />}
                        </Tarjeta>
                    </aside>
                </div>
            </div>
        </PanelLayout>
    );
}

export default Cambios;

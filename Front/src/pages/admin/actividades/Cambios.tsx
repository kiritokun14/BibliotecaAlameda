// Actividades › Cambios y cancelaciones: bandeja (Figma 569:22126, sin cambios 569:25772, sin resultados 569:26013)
// e historial (569:25331). Diseño común del panel (docs/guia-diseno.md); los datos siguen siendo de ejemplo (cambios.ts).
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import { Chip, EncabezadoPagina, EstadoVacio, Migas, type TonoChip } from "../componentes";
import { IconoAviso, IconoBandera, IconoInfo, IconoLista, IconoReloj } from "../contenidos/piezas";
import { paginar } from "../contenidoDemo/utiles";
import { fechaCorta } from "./datos";
import { NOMBRE_ESTADO_CAMBIO, useCambios, type Cambio, type FiltroCambio, type Programacion, type TipoCambio } from "./cambios";
import { BASE_CAMBIOS, BASE_PROPUESTAS, TONO_CAMBIO } from "./utiles";
import { AccesosRapidos, CeldaDoble, ControlesLista, CuerpoLista, FILAS_POR_PAGINA, PieLista, SeccionLista, TablaLista } from "./PiezasLista";
import vacioCheck from "../../../assets/admin/vacio-check.svg";
import vacioBuscar from "../../../assets/admin/vacio-search.svg";

const HISTORIAL = `${BASE_CAMBIOS}?vista=historial`;
const TIPOS: TipoCambio[] = ["Cambio de fecha", "Cambio de horario", "Cambio de sala", "Reprogramación", "Cancelación"];
const tonoChip = (c: Cambio): TonoChip => { const t = TONO_CAMBIO[c.estado]; return t === "azul" ? "verde" : t; };
const programacion = (p: Programacion) => `${fechaCorta(p.fecha)} · ${p.hora} · ${p.sala}`;
const horaDe = (iso: string) => iso.slice(11, 16);

function Cambios() {
    const [params] = useSearchParams();
    const cambios = useCambios();
    const [filtro, setFiltro] = useState<FiltroCambio>("todos");
    const [tipo, setTipo] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(0);

    if (params.get("vista") === "historial") return <Historial cambios={cambios} />;

    const texto = busqueda.trim().toLowerCase();
    const cuenta = (e: FiltroCambio) => cambios.filter((c) => e === "todos" || c.estado === e).length;
    const filtrados = [...cambios]
        .sort((a, b) => b.folio.localeCompare(a.folio))
        .filter((c) => (filtro === "todos" || c.estado === filtro) && (!tipo || c.tipo === tipo)
            && (!texto || c.folio.toLowerCase().includes(texto) || c.nombre.toLowerCase().includes(texto)));
    const { paginas, actual, visibles } = paginar(filtrados, pagina, FILAS_POR_PAGINA);
    const elegir = (f: FiltroCambio) => { setFiltro(f); setPagina(0); };
    const alternar = (f: FiltroCambio) => elegir(filtro === f ? "todos" : f);
    const limpiar = () => { setBusqueda(""); setTipo(""); elegir("todos"); };

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones"]]} />
            <EncabezadoPagina
                etiqueta="Actividades · Cambios"
                titulo="Cambios y cancelaciones"
                texto="Revisa y aplica cambios a actividades ya programadas. Para reprogramar o cancelar una sesión, ábrela desde su actividad."
                accion={<Link className="contenidos-boton contenidos-boton--oscuro" to={BASE_PROPUESTAS}>Reprogramar o cancelar</Link>}
            />
            <AccesosRapidos accesos={[
                { clave: "pendiente", icono: <IconoReloj />, cifra: cuenta("pendiente"), titulo: "Pendientes", texto: "Esperan tu decisión.", enlace: "Ver pendientes", tono: "guinda", activo: filtro === "pendiente", alPresionar: () => alternar("pendiente") },
                { clave: "aplicado", icono: <IconoBandera />, cifra: cuenta("aplicado"), titulo: "Aplicados", texto: "Ya se avisó a las personas.", enlace: "Ver aplicados", tono: "azul", activo: filtro === "aplicado", alPresionar: () => alternar("aplicado") },
                { clave: "rechazado", icono: <IconoAviso />, cifra: cuenta("rechazado"), titulo: cuenta("rechazado") === 1 ? "Rechazado" : "Rechazados", texto: "No se aplicaron.", enlace: "Ver rechazados", tono: "gris", activo: filtro === "rechazado", alPresionar: () => alternar("rechazado") },
            ]} />

            <ControlesLista
                etiqueta="Filtros de cambios"
                chips={{ etiqueta: "Estado", activa: filtro, alElegir: elegir, opciones: [
                    { valor: "todos", texto: `Todos (${cuenta("todos")})` },
                    { valor: "pendiente", texto: `Pendientes (${cuenta("pendiente")})` },
                    { valor: "aplicado", texto: `Aplicados (${cuenta("aplicado")})` },
                    { valor: "rechazado", texto: `Rechazados (${cuenta("rechazado")})` },
                ] }}
                busqueda={{ etiqueta: "Buscar por folio o actividad", marcador: "Folio o actividad…", texto: busqueda, alBuscar: (v) => { setBusqueda(v); setPagina(0); } }}
                grupos={[{ etiqueta: "Tipo de cambio", opciones: [{ valor: "", texto: "Todos los tipos" }, ...TIPOS.map((t) => ({ valor: t, texto: t }))], activa: tipo, alElegir: (v) => { setTipo(v); setPagina(0); } }]}
                alLimpiar={limpiar}
            />

            <SeccionLista
                id="cambios-lista"
                icono={<IconoLista />}
                titulo="Cambios solicitados"
                texto={`${cambios.reduce((s, c) => s + c.avisados, 0)} personas avisadas en total.`}
                extra={<Link className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" to={HISTORIAL}>Ver historial</Link>}
            >
                <CuerpoLista>
                    {cambios.length === 0 ? (
                        <EstadoVacio icono={vacioCheck} titulo="Aún no hay cambios" texto="Cuando alguien pida reprogramar o cancelar una actividad, aparecerá aquí." />
                    ) : visibles.length === 0 ? (
                        <EstadoVacio icono={vacioBuscar} titulo={texto ? `Sin resultados para «${busqueda.trim()}»` : "No hay cambios con estos filtros"} texto="Prueba con otra palabra u otro filtro." accion={{ texto: "Quitar filtros", alPresionar: limpiar }} />
                    ) : (
                        <TablaLista
                            clase="ac-tabla--cambios"
                            etiqueta="Cambios solicitados"
                            filas={visibles}
                            clave={(c) => c.folio}
                            columnas={[
                                { titulo: "Folio", folio: true, celda: (c) => c.folio },
                                { titulo: "Actividad", celda: (c) => <CeldaDoble arriba={c.nombre} abajo={`${c.tipo} · pidió ${c.solicito}`} /> },
                                { titulo: "Programada", celda: (c) => <CeldaDoble arriba={`${fechaCorta(c.antes.fecha)} · ${c.antes.hora}`} abajo={c.antes.sala} /> },
                                { titulo: "Inscritos", celda: (c) => c.inscritos },
                                { titulo: "Estado", celda: (c) => <Chip tono={tonoChip(c)}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</Chip> },
                                { titulo: "Acción", celda: (c) => <Link to={`${BASE_CAMBIOS}/${c.folio}`} className="contenidos-tabla__accion">{c.estado === "pendiente" ? "Revisar" : "Abrir"} →<span className="tr-oculto"> {c.folio}</span></Link> },
                            ]}
                        />
                    )}
                </CuerpoLista>
                {filtrados.length > 0 && <PieLista texto={`Mostrando ${visibles.length} de ${filtrados.length} cambios`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
                {import.meta.env.DEV && (
                    <p className="contenidos-campo__ayuda ac-solo-desarrollo">
                        <IconoInfo /> Solo en desarrollo: <Link to={`${BASE_CAMBIOS}/cancelar`}>simular una cancelación</Link> · <Link to={`${BASE_CAMBIOS}/reprogramar`}>simular una reprogramación</Link>
                    </p>
                )}
            </SeccionLista>
        </PanelLayout>
    );
}

// Historial: línea de tiempo de lo decidido (aplicado o rechazado), lo más reciente primero
function Historial({ cambios }: { cambios: Cambio[] }) {
    const [estado, setEstado] = useState<"todos" | "aplicado" | "rechazado">("todos");
    const [pagina, setPagina] = useState(0);
    const decision = (c: Cambio) => c.aplico?.fecha ?? c.rechazo?.fecha ?? c.solicitado;
    const decididos = cambios.filter((c) => c.estado !== "pendiente").sort((a, b) => decision(b).localeCompare(decision(a)));
    const visibles = decididos.filter((c) => estado === "todos" || c.estado === estado);
    const { paginas, actual, visibles: pagina5 } = paginar(visibles, pagina, FILAS_POR_PAGINA);
    const aplicados = decididos.filter((c) => c.estado === "aplicado");
    const avisados = aplicados.reduce((s, c) => s + c.avisados, 0);

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Migas raiz="Actividades" pasos={[["Cambios y cancelaciones", BASE_CAMBIOS], ["Historial"]]} />
            <EncabezadoPagina volver={{ texto: "Volver a Cambios y cancelaciones", ruta: BASE_CAMBIOS }} etiqueta="Actividades · Cambios"
                titulo="Historial de cambios" texto="Todo lo que se aplicó o rechazó, con quién lo decidió, qué cambió y a cuántas personas se avisó." />
            <AccesosRapidos titulo="Resumen del historial" accesos={[
                { clave: "aplicados", icono: <IconoBandera />, cifra: aplicados.length, titulo: aplicados.length === 1 ? "Cambio aplicado" : "Cambios aplicados", texto: "Ya están en la agenda.", tono: "azul" },
                { clave: "avisados", icono: <IconoInfo />, cifra: avisados, titulo: "Personas avisadas", texto: "Por notificación en el portal.", tono: "gris" },
                { clave: "rechazados", icono: <IconoAviso />, cifra: decididos.length - aplicados.length, titulo: "Rechazados", texto: "Se quedó la programación original.", tono: "guinda" },
            ]} />

            <SeccionLista
                id="historial-cambios"
                icono={<IconoReloj />}
                titulo="Línea de tiempo"
                texto="Lo más reciente primero."
                herramientas={<div className="contenidos-filtros" role="group" aria-label="Filtrar historial">
                    {([["todos", `Todos (${decididos.length})`], ["aplicado", `Aplicados (${aplicados.length})`], ["rechazado", `Rechazados (${decididos.length - aplicados.length})`]] as const).map(([v, t]) => (
                        <button key={v} type="button" aria-pressed={estado === v} className={`contenidos-filtro${estado === v ? " contenidos-filtro--activo" : ""}`} onClick={() => { setEstado(v); setPagina(0); }}>{t}</button>
                    ))}
                </div>}
            >
                <CuerpoLista>
                    {visibles.length === 0 ? (
                        <EstadoVacio icono={vacioCheck} titulo="Todavía no hay cambios decididos" texto="Lo que apliques o rechaces aparecerá aquí con su responsable." />
                    ) : (
                        <ol className="tr-eventos ac-historial" aria-label="Historial de cambios">
                            {pagina5.map((c) => (
                                <li key={c.folio} className={c.estado === "aplicado" ? "tr-eventos--hecho" : "tr-eventos--ultimo"}>
                                    <article className="ac-historial__tarjeta">
                                        <header className="ac-historial__cabecera">
                                            <span><strong>{c.tipo} · {c.nombre}</strong>
                                                <small>{fechaCorta(decision(c))} {horaDe(decision(c))} · {c.estado === "aplicado" ? `aplicó ${c.aplico!.quien}` : "rechazado por Coordinación"} · <Link to={`${BASE_CAMBIOS}/${c.folio}`}>{c.folio}</Link></small></span>
                                            <Chip tono={tonoChip(c)}>{NOMBRE_ESTADO_CAMBIO[c.estado]}</Chip>
                                        </header>
                                        <p className="ac-historial__cambio">
                                            <span className="ac-historial__antes">{programacion(c.antes)}</span>
                                            <span aria-hidden="true">→</span>
                                            <span className="ac-historial__despues">{c.despues ? programacion(c.despues) : "Actividad cancelada"}</span>
                                        </p>
                                        <p className="ac-historial__motivo">{c.estado === "rechazado" ? `Motivo del rechazo: ${c.rechazo?.motivo ?? "—"}` : `Motivo: ${c.motivo}`}</p>
                                        {c.estado === "aplicado" && <small className="ac-historial__avisos">{c.avisados ? `Se avisó a ${c.avisados} ${c.avisados === 1 ? "persona inscrita" : "personas inscritas"}.` : "No había personas inscritas que avisar."}</small>}
                                    </article>
                                </li>
                            ))}
                        </ol>
                    )}
                </CuerpoLista>
                {visibles.length > 0 && <PieLista texto={`Mostrando ${pagina5.length} de ${visibles.length} registros`} pagina={actual} paginas={paginas} alCambiar={setPagina} />}
            </SeccionLista>
        </PanelLayout>
    );
}

export default Cambios;

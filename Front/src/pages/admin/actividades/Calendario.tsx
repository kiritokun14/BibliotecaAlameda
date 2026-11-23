import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import "./Calendario.css";
import "../atencion/AtencionTramites.css";
import { Migas } from "../contenidoDemo/piezas";
import { Aviso, Buscador, Chip, Cifra, Dato, Datos, Encabezado, FiltrosAvanzados, Icono, Segmentado, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { NOMBRE_ESTADO_ACTIVIDAD, type Actividad, type EstadoActividad } from "./datos";
import { hoyISO, type Sala } from "./salas"; // TODO backend: bloqueos de salas (salas.ts › Bloqueo) cuando exista el servicio
import { celdasDelMes, desdeISO, diaLargo, nombreMes, ocupa, sumarDias } from "./calendario";
import { useCalendarioPersonal } from "../../../servicios/usarCalendarioPersonal";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";

// Actividades · Calendario y salas (rehecho con las piezas del panel, 22 nov 2026).
// Encabezado con cifras que cambian de vista → barra (vista segmentada, buscador con «Filtros» y periodo) →
// cada vista en el área de trabajo: mes | el día elegido; semana; día | salas este día; salas | detalle de la elegida.

type Vista = "mes" | "semana" | "dia" | "salas";
const VISTAS: { valor: Vista; texto: string }[] = [
    { valor: "mes", texto: "Mes" }, { valor: "semana", texto: "Semana" }, { valor: "dia", texto: "Día" }, { valor: "salas", texto: "Salas" },
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const TONO: Record<EstadoActividad, TonoEstado> = {
    publicada: "verde", aprobada: "dorado", "en-revision": "dorado", borrador: "gris", cancelada: "guinda", archivada: "gris",
};
const PROPUESTA = (folio: string) => `/admin/actividades/propuestas/${folio}`;

const lunesDe = (iso: string) => sumarDias(iso, -((desdeISO(iso).getDay() + 6) % 7));
const semanaCompleta = (iso: string) => Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(iso), i));
const mesCorto = (iso: string) => nombreMes(desdeISO(iso).getFullYear(), desdeISO(iso).getMonth()).split(" ")[0].toLowerCase().slice(0, 3);
const porHora = (a: Actividad, b: Actividad) => a.inicio.localeCompare(b.inicio);
const horario = (a: Actividad) => `${a.inicio}${a.fin ? ` a ${a.fin}` : ""} h`;

function Calendario() {
    const [params, setParams] = useSearchParams();
    const vista = (VISTAS.some((v) => v.valor === params.get("vista")) ? params.get("vista") : "mes") as Vista;
    const hoy = hoyISO();
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.get("fecha") ?? "") ? params.get("fecha")! : hoy;
    const [busqueda, setBusqueda] = useState("");
    const [sala, setSala] = useState("");
    const [estado, setEstado] = useState("");
    const [tipo, setTipo] = useState("");
    const { actividades, salas, cargando, error, reintentar } = useCalendarioPersonal();

    const ir = (nueva: Vista, nuevaFecha = fecha) => setParams({ vista: nueva, fecha: nuevaFecha });
    const limpiar = () => { setBusqueda(""); setSala(""); setEstado(""); setTipo(""); };

    const texto = busqueda.trim().toLowerCase();
    const vigentes = actividades.filter(ocupa);
    const visibles = vigentes.filter((a) => (!sala || a.espacio === sala) && (!estado || a.estado === estado) && (!tipo || a.tipo === tipo)
        && (!texto || a.nombre.toLowerCase().includes(texto) || a.espacio.toLowerCase().includes(texto) || a.folio.toLowerCase().includes(texto)));
    const delDia = (dia: string) => visibles.filter((a) => a.fecha === dia).sort(porHora);
    const hayFiltros = Boolean(texto || sala || estado || tipo);

    const d = desdeISO(fecha);
    const mes = nombreMes(d.getFullYear(), d.getMonth()).split(" ")[0].toLowerCase();
    const delMes = vigentes.filter((a) => a.fecha.startsWith(fecha.slice(0, 7))).length;
    const deHoy = vigentes.filter((a) => a.fecha === hoy).length;
    const habilitadas = salas.filter((s) => s.habilitada);
    const libresHoy = habilitadas.filter((s) => !vigentes.some((a) => a.espacio === s.nombre && a.fecha === hoy)).length;
    const tipos = [...new Set(actividades.map((a) => a.tipo).filter(Boolean))].sort();
    const cuenta = (f: (a: Actividad) => boolean) => vigentes.filter(f).length;

    // Navegación de cada vista: Anterior · periodo · Siguiente · Hoy
    const semana = semanaCompleta(fecha);
    const periodo = {
        mes: nombreMes(d.getFullYear(), d.getMonth()),
        semana: `Del ${Number(semana[0].slice(8))} de ${mesCorto(semana[0])} al ${Number(semana[6].slice(8))} de ${mesCorto(semana[6])} de ${semana[6].slice(0, 4)}`,
        dia: diaLargo(fecha),
        salas: "",
    }[vista];
    const mover = (n: number) => {
        if (vista === "mes") { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`; }
        return sumarDias(fecha, vista === "semana" ? 7 * n : n);
    };
    const encabezado = {
        mes: { texto: "Elige un día para ver su agenda a un lado. Los colores dicen en qué va cada actividad.", miga: "Mes" },
        semana: { texto: "Las actividades de cada día de la semana, en orden de hora.", miga: "Semana" },
        dia: { texto: "Las actividades del día por hora y cómo quedan las salas.", miga: "Día" },
        salas: { texto: "Capacidad, equipo y ocupación de cada espacio de la biblioteca.", miga: "Salas" },
    }[vista];

    const cifras = (
        <>
            <Cifra icono="calendario" valor={delMes} texto={`en ${mes}`} activa={vista === "mes"} alPresionar={() => ir("mes")} />
            <Cifra icono="hoy" valor={deHoy} texto="hoy" activa={vista === "dia" && fecha === hoy} alPresionar={() => ir("dia", hoy)} />
            <Cifra icono="espacios" valor={`${libresHoy} de ${habilitadas.length}`} texto="salas libres hoy" activa={vista === "salas"} alPresionar={() => ir("salas")} />
        </>
    );

    if (cargando) return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <div className="pz-pagina">
                <Migas pasos={[["Actividades"], ["Calendario y salas"]]} />
                <Encabezado titulo="Calendario y salas" texto="Consultando el calendario…" />
                <EsqueletoLista texto="Cargando calendario del personal…" />
            </div>
        </PanelLayout>
    );

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <div className="pz-pagina cal-pagina">
                <Migas pasos={[["Actividades"], ["Calendario y salas"], [encabezado.miga]]} />
                <Encabezado titulo="Calendario y salas" texto={encabezado.texto}>{cifras}</Encabezado>
                {error && <Aviso tono="error" titulo="No pudimos cargar el calendario." texto={error}>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={reintentar}>Reintentar</button>
                </Aviso>}

                <section className="pz-tarjeta cal-barra" aria-label="Vista y filtros del calendario">
                    <div className="cal-barra__fila">
                        <Segmentado etiqueta="Vista del calendario" opciones={VISTAS} valor={vista} alCambiar={(v) => ir(v)} />
                        <Buscador etiqueta="Buscar actividad, sala o folio" placeholder="Actividad, sala o folio" valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={[sala, estado, tipo].filter(Boolean).length} alQuitar={() => { setSala(""); setEstado(""); setTipo(""); }} grupos={[
                                { titulo: "Sala", valor: sala, alCambiar: setSala, opciones: [{ valor: "", texto: "Todas" }, ...salas.map((s) => ({ valor: s.nombre, texto: s.nombre, cantidad: cuenta((a) => a.espacio === s.nombre) }))] },
                                { titulo: "Estado", valor: estado, alCambiar: setEstado, opciones: [{ valor: "", texto: "Todos" }, ...(["publicada", "aprobada", "en-revision", "borrador"] as EstadoActividad[]).map((e) => ({ valor: e, texto: NOMBRE_ESTADO_ACTIVIDAD[e], cantidad: cuenta((a) => a.estado === e) }))] },
                                ...(tipos.length > 1 ? [{ titulo: "Tipo", valor: tipo, alCambiar: setTipo, opciones: [{ valor: "", texto: "Todos" }, ...tipos.map((t) => ({ valor: t, texto: t, cantidad: cuenta((a) => a.tipo === t) }))] }] : []),
                            ]} />
                        </Buscador>
                    </div>
                    {vista !== "salas" && (
                        <div className="cal-barra__fila cal-barra__fila--periodo">
                            <div className="cal-barra__periodo">
                                <div className="cal-periodo" role="group" aria-label="Cambiar de periodo">
                                    <button type="button" className="cal-periodo__boton" onClick={() => ir(vista, mover(-1))} aria-label={`${vista === "mes" ? "Mes" : vista === "semana" ? "Semana" : "Día"} anterior`}>Anterior</button>
                                    <h2 className="cal-periodo__nombre" aria-live="polite" key={periodo}>{periodo}</h2>
                                    <button type="button" className="cal-periodo__boton" onClick={() => ir(vista, mover(1))} aria-label={`${vista === "mes" ? "Mes" : vista === "semana" ? "Semana" : "Día"} siguiente`}>Siguiente</button>
                                </div>
                                <button type="button" className="cal-periodo__hoy" onClick={() => ir(vista, hoy)} disabled={fecha === hoy}>{fecha === hoy ? "Estás en hoy" : "Volver a hoy"}</button>
                            </div>
                            <p className="cal-leyenda" aria-label="Colores por estado">
                                <span><i className="cal-punto cal-punto--verde" />Publicada</span>
                                <span><i className="cal-punto cal-punto--dorado" />Por publicar o en revisión</span>
                                <span><i className="cal-punto cal-punto--gris" />Borrador</span>
                            </p>
                        </div>
                    )}
                </section>

                {vista === "mes" && <Mes fecha={fecha} hoy={hoy} delDia={delDia} alElegir={(dia) => ir("mes", dia)} alVerDia={(dia) => ir("dia", dia)} />}
                {vista === "semana" && <Semana dias={semana} hoy={hoy} delDia={delDia} alElegir={(dia) => ir("dia", dia)} />}
                {vista === "dia" && <Dia fecha={fecha} hoy={hoy} salas={habilitadas} actividades={delDia(fecha)} hayFiltros={hayFiltros} alLimpiar={limpiar} />}
                {vista === "salas" && <Salas salas={salas.filter((s) => (!sala || s.nombre === sala) && (!texto || s.nombre.toLowerCase().includes(texto)))}
                    hoy={hoy} actividades={vigentes} hayFiltros={hayFiltros} alLimpiar={limpiar} alVerDia={() => ir("dia", hoy)} />}
            </div>
        </PanelLayout>
    );
}

// Lista compacta de actividades (lateral del mes): hora en su bloque, nombre como enlace, sala y estado
function ListaDelDia({ actividades }: { actividades: Actividad[] }) {
    return (
        <ul className="pz-actividades">
            {actividades.map((a) => (
                <li key={`${a.folio}:${a.inicio}`}>
                    <span className="pz-actividades__hora"><strong>{a.inicio}</strong><span>{a.fin || "h"}</span></span>
                    <div className="pz-actividades__textos">
                        <Link to={PROPUESTA(a.folio)} className="pz-actividades__titulo pz-enlace-fila">{a.nombre}</Link>
                        <p className="pz-actividades__detalle">{a.espacio || "Sin espacio"}</p>
                        <Chip tono={TONO[a.estado]}>{NOMBRE_ESTADO_ACTIVIDAD[a.estado]}</Chip>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// ---------- Mes: rejilla (hasta 2 actividades por día) | el día elegido ----------
function Mes({ fecha, hoy, delDia, alElegir, alVerDia }: { fecha: string; hoy: string; delDia: (dia: string) => Actividad[]; alElegir: (dia: string) => void; alVerDia: (dia: string) => void }) {
    const d = desdeISO(fecha);
    const celdas = celdasDelMes(d.getFullYear(), d.getMonth());
    const elegidas = delDia(fecha);
    return (
        <div className="pz-columnas">
            <Tarjeta icono="calendario" id="cal-mes" titulo="Días del mes" texto="Cada día dice cuántas actividades tiene; tócalo para verlas" className="cal-mes">
                <div className="ac-mes__dias" aria-hidden="true">{DIAS_SEMANA.map((x) => <span key={x}>{x}</span>)}</div>
                <div className="ac-mes__rejilla">
                    {celdas.map((dia, i) => {
                        if (!dia) return <span key={`h${i}`} className="ac-dia ac-dia--hueco" aria-hidden="true" />;
                        const eventos = delDia(dia);
                        return (
                            <button key={dia} type="button" aria-pressed={dia === fecha} onClick={() => alElegir(dia)}
                                className={`ac-dia${dia === hoy ? " ac-dia--hoy" : ""}${dia === fecha ? " ac-dia--elegido" : ""}${dia < hoy ? " ac-dia--pasado" : ""}`}
                                aria-label={`${diaLargo(dia)}: ${eventos.length ? `${eventos.length} en agenda` : "sin actividades"}`}>
                                <span className="ac-dia__numero">{Number(dia.slice(8))}</span>
                                {eventos.length > 0 && (
                                    <span className="ac-dia__total" aria-hidden="true">
                                        <strong>{eventos.length}</strong>
                                        <span className="ac-dia__puntos">
                                            {eventos.slice(0, 5).map((a) => <i key={`${a.folio}:${a.inicio}`} className={`cal-punto cal-punto--${TONO[a.estado]}`} />)}
                                        </span>
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Día elegido">
                <Tarjeta icono="hoy" id="cal-elegido" titulo={fecha === hoy ? "Hoy" : diaLargo(fecha)}
                    texto={elegidas.length ? `${elegidas.length} ${elegidas.length === 1 ? "actividad" : "actividades"}` : "Sin actividades"} className="pz-tarjeta--actividades">
                    {elegidas.length ? <ListaDelDia actividades={elegidas} />
                        : <Vacio icono="calendario" titulo="Día libre" texto="No hay actividades registradas este día." />}
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico cal-ver-dia" onClick={() => alVerDia(fecha)}>Ver el día por horas</button>
                </Tarjeta>
            </aside>
        </div>
    );
}

// ---------- Semana: agenda por renglones (un día por renglón) | la semana en números ----------
function Semana({ dias, hoy, delDia, alElegir }: { dias: string[]; hoy: string; delDia: (dia: string) => Actividad[]; alElegir: (dia: string) => void }) {
    const porDia = dias.map((dia) => delDia(dia));
    const total = porDia.reduce((n, l) => n + l.length, 0);
    const maximo = Math.max(1, ...porDia.map((l) => l.length));
    const usoSalas = Object.entries(porDia.flat().reduce<Record<string, number>>((m, a) => { if (a.espacio) m[a.espacio] = (m[a.espacio] ?? 0) + 1; return m; }, {}))
        .sort((x, y) => y[1] - x[1]).slice(0, 4);
    return (
        <div className="pz-columnas">
            <Tarjeta icono="calendario" id="cal-semana" titulo="Agenda de la semana" texto={total ? `${total} ${total === 1 ? "actividad" : "actividades"} de lunes a domingo` : "Sin actividades esta semana"} className="pz-pendientes">
                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Días de la semana">
                    <ol className="cal-semana-lista">
                        {dias.map((dia, i) => {
                            const lista = porDia[i];
                            return (
                                <li key={dia} className={`cal-semana-lista__dia${dia === hoy ? " cal-semana-lista__dia--hoy" : ""}${dia < hoy ? " cal-semana-lista__dia--pasado" : ""}${lista.length ? "" : " cal-semana-lista__dia--libre"}`}>
                                    <button type="button" className="cal-semana-lista__fecha" onClick={() => alElegir(dia)} aria-label={`Ver por horas el ${diaLargo(dia)}`}>
                                        <span>{DIAS_SEMANA[i]}</span><strong>{Number(dia.slice(8))}</strong>{dia === hoy && <small>Hoy</small>}
                                    </button>
                                    {lista.length ? (
                                        <div className="cal-semana-lista__eventos">
                                            {lista.map((a) => (
                                                <Link key={`${a.folio}:${a.inicio}`} to={PROPUESTA(a.folio)} className={`cal-bloque cal-bloque--${TONO[a.estado]}`}>
                                                    <span className="cal-bloque__hora">{a.inicio}{a.fin ? ` a ${a.fin}` : ""}</span>
                                                    <strong>{a.nombre}</strong>
                                                    <small>{a.espacio || "Sin espacio"}</small>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : <p className="cal-semana-lista__libre">Sin actividades</p>}
                                </li>
                            );
                        })}
                    </ol>
                </div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="La semana en números">
                <Tarjeta icono="estadisticas" id="cal-semana-numeros" titulo="La semana en números" texto="Actividades por día" className="pz-tarjeta--actividades">
                    <div className="cal-barras" role="img" aria-label={DIAS_SEMANA.map((nombre, i) => `${nombre} ${porDia[i].length}`).join(", ")}>
                        {dias.map((dia, i) => (
                            <button key={dia} type="button" className={`cal-barras__dia${dia === hoy ? " cal-barras__dia--hoy" : ""}`} onClick={() => alElegir(dia)} tabIndex={-1} aria-hidden="true">
                                <span className="cal-barras__cifra">{porDia[i].length || ""}</span>
                                <span className="cal-barras__pista"><span className="cal-barras__barra" style={{ height: `${(porDia[i].length / maximo) * 100}%` }} /></span>
                                <span className="cal-barras__nombre">{DIAS_SEMANA[i]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="cal-sala-detalle__proximas">
                        <p className="cal-sala-detalle__titulo">Salas más usadas</p>
                        {usoSalas.length ? (
                            <ul>
                                {usoSalas.map(([nombre, n]) => (
                                    <li key={nombre} className="cal-uso">
                                        <span>{nombre}</span>
                                        <small>{n} {n === 1 ? "actividad" : "actividades"}</small>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="pz-acciones__nota">Todas las salas están libres esta semana.</p>}
                    </div>
                </Tarjeta>
            </aside>
        </div>
    );
}

// ---------- Día: línea de tiempo real (8:00 a 21:00, bloques del largo de cada actividad) | cómo quedan las salas ----------
const INICIO_DIA = 8;
const FIN_DIA = 21;
const ALTO_HORA = 64;
const aMinutos = (h: string) => { const [a, b] = h.split(":").map(Number); return a * 60 + (b || 0); };
function minutosTepic() {
    const [h, m] = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Mazatlan" }).split(":").map(Number);
    return h * 60 + m;
}
// Reparte las actividades que se enciman en carriles, para que se vean lado a lado
function carriles(lista: Actividad[]) {
    const finDe = (a: Actividad) => (a.fin ? aMinutos(a.fin) : aMinutos(a.inicio) + 60);
    const ultimos: number[] = [];
    const asignados = [...lista].sort(porHora).map((a) => {
        let carril = ultimos.findIndex((fin) => fin <= aMinutos(a.inicio));
        if (carril === -1) { carril = ultimos.length; ultimos.push(0); }
        ultimos[carril] = finDe(a);
        return { a, carril, inicio: aMinutos(a.inicio), fin: finDe(a) };
    });
    return { asignados, total: Math.max(1, ultimos.length) };
}

function Dia({ fecha, hoy, salas, actividades, hayFiltros, alLimpiar }: { fecha: string; hoy: string; salas: Sala[]; actividades: Actividad[]; hayFiltros: boolean; alLimpiar: () => void }) {
    const ocupadas = salas.filter((s) => actividades.some((a) => a.espacio === s.nombre)).length;
    const { asignados, total } = carriles(actividades);
    const posicion = (min: number) => ((Math.min(Math.max(min, INICIO_DIA * 60), FIN_DIA * 60) - INICIO_DIA * 60) / 60) * ALTO_HORA;
    const ahora = fecha === hoy ? minutosTepic() : -1;
    const verAhora = ahora >= INICIO_DIA * 60 && ahora <= FIN_DIA * 60;
    // Al abrir, la línea se coloca en la primera actividad (o en la hora actual si es hoy)
    const linea = useRef<HTMLDivElement>(null);
    const primera = asignados[0]?.inicio ?? -1;
    useEffect(() => {
        const caja = linea.current;
        const destino = verAhora ? ahora : primera;
        if (caja && destino >= 0) caja.scrollTop = Math.max(0, posicion(destino) - ALTO_HORA);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha, primera]);
    return (
        <div className="pz-columnas">
            <Tarjeta icono="reloj" id="cal-dia" titulo="Por horas" texto={actividades.length ? `${actividades.length} ${actividades.length === 1 ? "actividad" : "actividades"}, de 8:00 a 21:00 h` : diaLargo(fecha)} className="pz-pendientes">
                {actividades.length === 0 ? (
                    hayFiltros
                        ? <Vacio icono="buscarCuenta" titulo="Sin resultados este día" texto="Ninguna actividad coincide con los filtros."
                            accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alLimpiar}>Quitar filtros</button>} />
                        : <Vacio icono="calendario" titulo="Sin actividades este día" texto="Todas las salas están libres. Puedes programar una actividad desde Propuestas."
                            accion={<Link className="pz-boton pz-boton--chico" to="/admin/actividades/propuestas/nueva">Nueva actividad</Link>} />
                ) : (
                    <div className="pz-grupos cal-linea" ref={linea} tabIndex={0} role="region" aria-label={`Agenda del ${diaLargo(fecha)}`}>
                        <div className="cal-linea__lienzo" style={{ height: (FIN_DIA - INICIO_DIA) * ALTO_HORA }}>
                            {Array.from({ length: FIN_DIA - INICIO_DIA + 1 }, (_, i) => (
                                <span key={i} className="cal-linea__hora" style={{ top: i * ALTO_HORA }}>{`${String(INICIO_DIA + i).padStart(2, "0")}:00`}</span>
                            ))}
                            <ol className="cal-linea__eventos">
                                {asignados.map(({ a, carril, inicio, fin }, i) => {
                                    const alto = Math.max(ALTO_HORA * 0.7, posicion(fin) - posicion(inicio));
                                    return (
                                        <li key={`${a.folio}:${a.inicio}`} style={{ top: posicion(inicio), height: alto - 4, left: `${(carril / total) * 100}%`, width: `calc(${100 / total}% - 6px)`, animationDelay: `${Math.min(i * 50, 180)}ms` }}>
                                            <Link to={PROPUESTA(a.folio)} className={`cal-bloque cal-bloque--${TONO[a.estado]}${fin <= ahora ? " cal-bloque--pasado" : ""}`}>
                                                <span className="cal-bloque__hora">{horario(a)}</span>
                                                <strong>{a.nombre}</strong>
                                                <small>{a.espacio || "Sin espacio"}{a.tipo ? `, ${a.tipo}` : ""}</small>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ol>
                            {verAhora && <span className="cal-linea__ahora" style={{ top: posicion(ahora) }}><span>Ahora</span></span>}
                        </div>
                    </div>
                )}
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Salas este día">
                <Tarjeta icono="espacios" id="cal-salas-dia" titulo="Salas este día" texto={`${salas.length - ocupadas} de ${salas.length} libres`} className="pz-tarjeta--actividades">
                    <ul className="cal-salas-dia">
                        {salas.map((s) => {
                            const usos = actividades.filter((a) => a.espacio === s.nombre);
                            return (
                                <li key={s.id} className={usos.length ? "cal-salas-dia--ocupada" : undefined}>
                                    <span className="cal-salas-dia__icono" aria-hidden="true"><Icono nombre="espacios" /></span>
                                    <div>
                                        <strong>{s.nombre}</strong>
                                        <small>{usos.length ? usos.map((a) => `${a.inicio} a ${a.fin || "?"}`).join(", ") : s.abre && s.cierra ? `Libre de ${s.abre} a ${s.cierra}` : "Libre todo el día"}</small>
                                    </div>
                                    <Chip tono={usos.length ? "dorado" : "verde"}>{usos.length ? "Ocupada" : "Libre"}</Chip>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="pz-acciones__nota">Los bloqueos de sala aún no tienen servicio: la disponibilidad final se confirma en Atención.</p>
                </Tarjeta>
            </aside>
        </div>
    );
}

// ---------- Salas: lista | detalle de la elegida ----------
function Salas({ salas, hoy, actividades, hayFiltros, alLimpiar, alVerDia }: { salas: Sala[]; hoy: string; actividades: Actividad[]; hayFiltros: boolean; alLimpiar: () => void; alVerDia: () => void }) {
    const [abierta, setAbierta] = useState<string | null>(null);
    if (salas.length === 0) return (
        <Tarjeta icono="espacios" id="cal-salas" titulo="Salas de la biblioteca">
            {hayFiltros
                ? <Vacio icono="buscarCuenta" titulo="Sin salas con esos filtros" texto="Prueba con otro nombre de sala."
                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={alLimpiar}>Quitar filtros</button>} />
                : <Vacio icono="espacios" titulo="Sin salas registradas" texto="Cuando la biblioteca registre sus salas, aparecerán aquí." />}
        </Tarjeta>
    );
    const semana = semanaCompleta(hoy);
    const resumenes = salas.map((sala) => {
        const deLaSala = actividades.filter((a) => a.espacio === sala.nombre);
        return {
            sala,
            hoyN: deLaSala.filter((a) => a.fecha === hoy).length,
            enSemana: deLaSala.filter((a) => semana.includes(a.fecha)).length,
            proximas: deLaSala.filter((a) => a.fecha >= hoy).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio)).slice(0, 3),
        };
    });
    const elegida = resumenes.find((r) => r.sala.id === abierta) ?? resumenes[0];
    const estadoSala = (s: Sala, hoyN: number): [TonoEstado, string] => !s.habilitada ? ["gris", "Deshabilitada"] : hoyN ? ["dorado", `${hoyN} hoy`] : ["verde", "Libre hoy"];
    const [tono, textoEstado] = estadoSala(elegida.sala, elegida.hoyN);
    return (
        <div className="pz-columnas">
            <Tarjeta icono="espacios" id="cal-salas" titulo="Salas de la biblioteca" texto={`${salas.length} ${salas.length === 1 ? "espacio" : "espacios"}; elige uno para ver su detalle`} className="pz-pendientes">
                <div className="pz-grupos" tabIndex={0} role="region" aria-label="Salas">
                    <ul className="pz-filas">
                        {resumenes.map(({ sala: s, hoyN, enSemana }) => {
                            const [t, e] = estadoSala(s, hoyN);
                            return (
                                <li key={s.id}>
                                    <button type="button" aria-pressed={s.id === elegida.sala.id} onClick={() => setAbierta(s.id)}
                                        className={`pz-fila cal-sala-fila${s.id === elegida.sala.id ? " cal-sala-fila--elegida" : ""}${s.habilitada ? "" : " cal-sala-fila--apagada"}`}>
                                        <span className="pz-fila__icono" aria-hidden="true"><Icono nombre="espacios" /></span>
                                        <span className="pz-fila__textos">
                                            <span className="pz-fila__titulo">{s.nombre}</span>
                                            <span className="pz-fila__detalle"><span>Hasta {s.capacidad} personas</span><span>{enSemana} {enSemana === 1 ? "actividad" : "actividades"} esta semana</span></span>
                                        </span>
                                        <Chip tono={t}>{e}</Chip>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Detalle de la sala">
                <Tarjeta key={elegida.sala.id} icono="espacios" id="cal-sala-detalle" titulo={elegida.sala.nombre} texto={elegida.sala.ubicacion || "Ubicación por confirmar"}
                    accion={<Chip tono={tono}>{textoEstado}</Chip>} className="pz-tarjeta--actividades cal-sala-detalle">
                    <Datos>
                        <Dato icono="grupo" etiqueta="Capacidad">{elegida.sala.capacidad} personas</Dato>
                        <Dato icono="reloj" etiqueta="Horario">{elegida.sala.abre && elegida.sala.cierra ? `${elegida.sala.abre} a ${elegida.sala.cierra}` : "Por confirmar"}{elegida.sala.abre && elegida.sala.dias && <small className="pz-dato__nota">{elegida.sala.dias}</small>}</Dato>
                        <Dato ancho icono="lista" etiqueta="Equipo">{elegida.sala.equipo || "Por confirmar"}</Dato>
                        <Dato ancho icono="usuario" etiqueta="Accesibilidad">{elegida.sala.accesibilidad || "Por confirmar"}</Dato>
                    </Datos>
                    <div className="cal-sala-detalle__proximas">
                        <p className="cal-sala-detalle__titulo">Próximas actividades</p>
                        {elegida.proximas.length ? (
                            <ul>
                                {elegida.proximas.map((a) => (
                                    <li key={`${a.folio}:${a.fecha}:${a.inicio}`}>
                                        <Link to={PROPUESTA(a.folio)} className="pz-enlace-fila">{a.nombre}</Link>
                                        <small>{diaLargo(a.fecha).split(" ").slice(0, 4).join(" ")}, {a.inicio} h</small>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="pz-acciones__nota">Sin actividades próximas.</p>}
                    </div>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico cal-ver-dia" onClick={alVerDia}>Ver la agenda de hoy</button>
                </Tarjeta>
            </aside>
        </div>
    );
}

export default Calendario;

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { createPortal } from "react-dom";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Actividades.css";
import "./Calendario.css";
import "../atencion/AtencionTramites.css";
import { BloqueResumen, Encabezado, Migas, Pagina } from "../contenidoDemo/piezas";
import { Chip, EstadoVacio } from "../componentes";
import BarraFiltros, { ChipsFiltro } from "../../../components/portal/BarraFiltros";
import { NOMBRE_ESTADO_ACTIVIDAD, type Actividad, type EstadoActividad } from "./datos";
import { hoyISO, type Sala } from "./salas"; // TODO backend: bloqueos de salas (salas.ts › Bloqueo) cuando exista el servicio
import { celdasDelMes, desdeISO, diaLargo, nombreMes, ocupa, sumarDias } from "./calendario";
import { useCalendarioPersonal } from "../../../servicios/usarCalendarioPersonal";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import vacioReloj from "../../../assets/admin/actividades/vacio-reloj.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

// Actividades · Calendario y salas (Figma 566:21581 mes, 566:22112 semana, 566:22627 día, 566:23101 salas).
// Filtros iguales a los del portal (Noticias): buscador + «Filtros» (sala, estado, tipo) y etiquetas de lo elegido.
// Cada vista tiene su forma: mes en rejilla, semana en 7 columnas, día en línea de tiempo y salas en tarjetas.

type Vista = "mes" | "semana" | "dia" | "salas";
const VISTAS: { valor: Vista; texto: string }[] = [
    { valor: "mes", texto: "Mes" }, { valor: "semana", texto: "Semana" }, { valor: "dia", texto: "Día" }, { valor: "salas", texto: "Salas" },
];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HORAS_DIA = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`); // 08:00 a 20:00
const TONO: Record<EstadoActividad, "verde" | "dorado" | "guinda" | "gris"> = {
    publicada: "verde", aprobada: "dorado", "en-revision": "dorado", borrador: "gris", cancelada: "guinda", archivada: "gris",
};
const PROPUESTA = (folio: string) => `/admin/actividades/propuestas/${folio}`;

const lunesDe = (iso: string) => sumarDias(iso, -((desdeISO(iso).getDay() + 6) % 7));
const semanaCompleta = (iso: string) => Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(iso), i));
const mesCorto = (iso: string) => nombreMes(desdeISO(iso).getFullYear(), desdeISO(iso).getMonth()).split(" ")[0].toLowerCase().slice(0, 3);
const porHora = (a: Actividad, b: Actividad) => a.inicio.localeCompare(b.inicio);

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
    const visibles = actividades.filter((a) => ocupa(a)
        && (!sala || a.espacio === sala) && (!estado || a.estado === estado) && (!tipo || a.tipo === tipo)
        && (!texto || a.nombre.toLowerCase().includes(texto) || a.espacio.toLowerCase().includes(texto) || a.folio.toLowerCase().includes(texto)));
    const delDia = (dia: string) => visibles.filter((a) => a.fecha === dia).sort(porHora);
    const hayFiltros = Boolean(texto || sala || estado || tipo);

    const d = desdeISO(fecha);
    const delMes = actividades.filter((a) => ocupa(a) && a.fecha.startsWith(fecha.slice(0, 7))).length;
    const habilitadas = salas.filter((s) => s.habilitada);
    const libresHoy = habilitadas.filter((s) => !actividades.some((a) => ocupa(a) && a.espacio === s.nombre && a.fecha === hoy)).length;
    const tipos = [...new Set(actividades.map((a) => a.tipo).filter(Boolean))].sort();

    // Navegación de cada vista: Anterior · periodo · Siguiente · Hoy
    const semana = semanaCompleta(fecha);
    const periodo = {
        mes: nombreMes(d.getFullYear(), d.getMonth()),
        semana: `${Number(semana[0].slice(8))} ${mesCorto(semana[0])} – ${Number(semana[6].slice(8))} ${mesCorto(semana[6])} ${semana[6].slice(0, 4)}`,
        dia: diaLargo(fecha),
        salas: "Todas las salas",
    }[vista];
    const mover = (n: number) => {
        if (vista === "mes") { const x = new Date(d.getFullYear(), d.getMonth() + n, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`; }
        return sumarDias(fecha, vista === "semana" ? 7 * n : n);
    };

    const encabezado = {
        mes: { titulo: "Calendario de actividades", texto: "Vista del mes. Toca un día para ver su agenda.", miga: "Mes" },
        semana: { titulo: "Semana", texto: "Actividades de cada día de la semana, en orden de hora.", miga: "Semana" },
        dia: { titulo: "Agenda del día", texto: "Línea de tiempo de las actividades y cómo quedan las salas.", miga: "Día" },
        salas: { titulo: "Salas de la biblioteca", texto: "Capacidad, equipo y ocupación de cada espacio.", miga: "Salas" },
    }[vista];

    if (cargando) return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas"]]} />
                <EsqueletoLista texto="Cargando calendario del personal…" />
            </Pagina>
        </PanelLayout>
    );

    return (
        <PanelLayout titulo="Actividades" tema="contenidos">
            <Pagina>
                {error && <EstadoVacio icono={vacioBuscar} titulo="No pudimos cargar el calendario" texto={error} accion={{ texto: "Reintentar", alPresionar: reintentar }} />}
                <Migas pasos={[["Actividades"], ["Calendario y salas"], [encabezado.miga]]} />
                <Encabezado etiqueta="Calendario y salas" titulo={encabezado.titulo} texto={encabezado.texto} />

                <BloqueResumen
                    insignia="Calendario y salas"
                    titulo="Resumen del"
                    resalte="calendario"
                    subtitulo="Actividades registradas por la biblioteca"
                    accesos={[
                        { icono: iconoArchivo, numero: delMes, titulo: "Actividades del mes", texto: `Programadas en ${nombreMes(d.getFullYear(), d.getMonth()).split(" ")[0].toLowerCase()}`, enlace: "Ver el mes", tono: "verde", alPresionar: () => ir("mes") },
                        { icono: iconoReloj, numero: `${libresHoy} de ${habilitadas.length}`, titulo: "Salas libres hoy", texto: "Sin actividades registradas hoy", enlace: "Ver el día", tono: "dorado", alPresionar: () => ir("dia", hoy) },
                        { icono: iconoX, numero: "—", titulo: "Bloqueos", texto: "Servicio pendiente; no indica disponibilidad", enlace: "Ver salas", tono: "guinda", alPresionar: () => ir("salas") },
                    ]}
                />

                <section className="cal-controles" aria-label="Vista y filtros del calendario">
                    <BarraFiltros
                        arriba={<ChipsFiltro etiqueta="Vista del calendario" opciones={VISTAS} activa={vista} alElegir={(v) => ir(v)} />}
                        etiquetaBusqueda="Buscar actividad, sala o folio"
                        marcador="Actividad, sala o folio…"
                        texto={busqueda}
                        alBuscar={setBusqueda}
                        grupos={[
                            { etiqueta: "Sala", opciones: [{ valor: "", texto: "Todas las salas" }, ...salas.map((s) => ({ valor: s.nombre, texto: s.nombre }))], activa: sala, alElegir: setSala },
                            { etiqueta: "Estado", opciones: [{ valor: "", texto: "Todos los estados" }, ...(["publicada", "aprobada", "en-revision", "borrador"] as EstadoActividad[]).map((e) => ({ valor: e, texto: NOMBRE_ESTADO_ACTIVIDAD[e] }))], activa: estado, alElegir: setEstado },
                            ...(tipos.length > 1 ? [{ etiqueta: "Tipo", opciones: [{ valor: "", texto: "Todos los tipos" }, ...tipos.map((t) => ({ valor: t, texto: t }))], activa: tipo, alElegir: setTipo }] : []),
                        ]}
                        alLimpiar={limpiar}
                    />
                    {vista !== "salas" && (
                        <div className="cal-navegacion">
                            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => ir(vista, mover(-1))} aria-label="Periodo anterior">Anterior</button>
                            <h2 className="cal-navegacion__periodo">{periodo}</h2>
                            <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={() => ir(vista, mover(1))} aria-label="Periodo siguiente">Siguiente</button>
                            <button type="button" className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico" onClick={() => ir(vista, hoy)} disabled={fecha === hoy}>Hoy</button>
                            <span className="cal-leyenda" aria-label="Colores por estado">
                                <span className="cal-leyenda__punto cal-leyenda__punto--verde" />Publicada
                                <span className="cal-leyenda__punto cal-leyenda__punto--dorado" />Por publicar o en revisión
                                <span className="cal-leyenda__punto cal-leyenda__punto--gris" />Borrador
                            </span>
                        </div>
                    )}
                </section>

                {vista === "mes" && <Mes fecha={fecha} hoy={hoy} delDia={delDia} alElegir={(dia) => ir("dia", dia)} />}
                {vista === "semana" && <Semana dias={semana} hoy={hoy} delDia={delDia} alElegir={(dia) => ir("dia", dia)} />}
                {vista === "dia" && <Dia fecha={fecha} salas={habilitadas} actividades={delDia(fecha)} hayFiltros={hayFiltros} alLimpiar={limpiar} />}
                {vista === "salas" && <Salas salas={salas.filter((s) => (!sala || s.nombre === sala) && (!texto || s.nombre.toLowerCase().includes(texto)))}
                    hoy={hoy} actividades={actividades.filter(ocupa)} hayFiltros={hayFiltros} alLimpiar={limpiar} alVerDia={() => ir("dia", hoy)} />}
            </Pagina>
        </PanelLayout>
    );
}

// ---------- Mes: rejilla con hasta 3 actividades por día ----------
function Mes({ fecha, hoy, delDia, alElegir }: { fecha: string; hoy: string; delDia: (dia: string) => Actividad[]; alElegir: (dia: string) => void }) {
    const d = desdeISO(fecha);
    const celdas = celdasDelMes(d.getFullYear(), d.getMonth());
    return (
        <section className="cn-tarjeta ac-mes" aria-label={`Calendario de ${nombreMes(d.getFullYear(), d.getMonth())}`}>
            <div className="ac-mes__dias" aria-hidden="true">{DIAS_SEMANA.map((x) => <span key={x}>{x}</span>)}</div>
            <div className="ac-mes__rejilla">
                {celdas.map((dia, i) => {
                    if (!dia) return <span key={`h${i}`} className="ac-dia ac-dia--hueco" aria-hidden="true" />;
                    const eventos = delDia(dia);
                    return (
                        <button key={dia} type="button" className={`ac-dia ${dia === hoy ? "ac-dia--hoy" : ""}`} onClick={() => alElegir(dia)}
                            aria-label={`${diaLargo(dia)}: ${eventos.length ? `${eventos.length} en agenda` : "sin actividades"}. Ver el día`}>
                            <span className="ac-dia__numero">{Number(dia.slice(8))}</span>
                            {eventos.slice(0, 3).map((a) => (
                                <span key={`${a.folio}:${a.inicio}`} className={`ac-evento ac-evento--${TONO[a.estado] === "gris" ? "dorado" : TONO[a.estado]}`}>{a.inicio} {a.nombre}</span>
                            ))}
                            {eventos.length > 3 && <span className="ac-evento ac-evento--mas">+{eventos.length - 3} más</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

// ---------- Semana: 7 columnas con tarjetas en orden de hora ----------
function Semana({ dias, hoy, delDia, alElegir }: { dias: string[]; hoy: string; delDia: (dia: string) => Actividad[]; alElegir: (dia: string) => void }) {
    return (
        <section className="cal-semana" aria-label="Semana">
            {dias.map((dia, i) => {
                const lista = delDia(dia);
                return (
                    <div key={dia} className={`cal-semana__dia${dia === hoy ? " cal-semana__dia--hoy" : ""}${i >= 5 ? " cal-semana__dia--fin" : ""}`}>
                        <button type="button" className="cal-semana__cabecera" onClick={() => alElegir(dia)} aria-label={`Ver la agenda del ${diaLargo(dia)}`}>
                            <span>{DIAS_SEMANA[i]}</span>
                            <strong>{Number(dia.slice(8))}</strong>
                            {lista.length > 0 && <small>{lista.length} {lista.length === 1 ? "actividad" : "actividades"}</small>}
                        </button>
                        <div className="cal-semana__lista">
                            {lista.length === 0 ? <p className="cal-semana__libre">Sin actividades</p> : lista.map((a) => (
                                <Link key={`${a.folio}:${a.inicio}`} to={PROPUESTA(a.folio)} className={`cal-evento cal-evento--${TONO[a.estado]}`}>
                                    <span className="cal-evento__hora">{a.inicio}{a.fin ? `–${a.fin}` : ""}</span>
                                    <strong>{a.nombre}</strong>
                                    <small>{a.espacio}</small>
                                </Link>
                            ))}
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

// ---------- Día: línea de tiempo por hora y estado de cada sala ----------
function Dia({ fecha, salas, actividades, hayFiltros, alLimpiar }: { fecha: string; salas: Sala[]; actividades: Actividad[]; hayFiltros: boolean; alLimpiar: () => void }) {
    const hora = (h: string) => Number(h.slice(0, 2));
    const fuera = actividades.filter((a) => hora(a.inicio) < 8 || hora(a.inicio) > 20);
    return (
        <div className="cal-dia">
            <section className="cn-tarjeta cal-dia__linea" aria-label={`Agenda del ${diaLargo(fecha)}`}>
                {actividades.length === 0 ? (
                    hayFiltros
                        ? <EstadoVacio icono={vacioBuscar} titulo="Sin resultados este día" texto="Ninguna actividad coincide con los filtros." accion={{ texto: "Quitar filtros", alPresionar: alLimpiar }} />
                        : <EstadoVacio icono={vacioReloj} titulo="Sin actividades este día" texto="Todas las salas están libres. Puedes programar una actividad desde Propuestas de actividades." />
                ) : (
                    <ol className="cal-horas">
                        {[...HORAS_DIA, ...(fuera.length ? ['Otro horario'] : [])].map((h) => {
                            const enHora = h === 'Otro horario' ? fuera : actividades.filter((a) => hora(a.inicio) === hora(h));
                            return (
                                <li key={h} className={`cal-horas__fila${enHora.length ? " cal-horas__fila--ocupada" : ""}`}>
                                    <span className="cal-horas__hora">{h}</span>
                                    <div className="cal-horas__eventos">
                                        {enHora.map((a) => (
                                            <Link key={`${a.folio}:${a.inicio}`} to={PROPUESTA(a.folio)} className={`cal-evento cal-evento--fila cal-evento--${TONO[a.estado]}`}>
                                                <span className="cal-evento__hora">{a.inicio}{a.fin ? `–${a.fin}` : ""}</span>
                                                <span className="cal-evento__textos"><strong>{a.nombre}</strong><small>{a.espacio} · {a.tipo}</small></span>
                                                <Chip tono={TONO[a.estado]}>{NOMBRE_ESTADO_ACTIVIDAD[a.estado]}</Chip>
                                            </Link>
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </section>
            <aside className="cn-tarjeta cal-dia__salas" aria-label="Salas este día">
                <h2>Salas este día</h2>
                <ul>
                    {salas.map((s) => {
                        const usos = actividades.filter((a) => a.espacio === s.nombre);
                        return (
                            <li key={s.id} className={usos.length ? "cal-sala--ocupada" : "cal-sala--libre"}>
                                <span className="cal-sala__punto" aria-hidden="true" />
                                <div>
                                    <strong>{s.nombre}</strong>
                                    <small>{usos.length ? usos.map((a) => `${a.inicio}–${a.fin || "?"}`).join(" · ") : s.abre && s.cierra ? `Libre · ${s.abre}–${s.cierra}` : "Libre todo el día"}</small>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <p className="contenidos-campo__ayuda">Los bloqueos todavía no tienen servicio; la disponibilidad final se confirma en Atención.</p>
            </aside>
        </div>
    );
}

// ---------- Salas: tarjeta breve y vista previa con el detalle ----------
type ResumenSala = { sala: Sala; hoyN: number; enSemana: number; proxima?: Actividad };

function Salas({ salas, hoy, actividades, hayFiltros, alLimpiar, alVerDia }: { salas: Sala[]; hoy: string; actividades: Actividad[]; hayFiltros: boolean; alLimpiar: () => void; alVerDia: () => void }) {
    const [abierta, setAbierta] = useState<string | null>(null);
    if (salas.length === 0) return hayFiltros
        ? <EstadoVacio icono={vacioBuscar} titulo="Sin salas con esos filtros" texto="Prueba con otro nombre de sala." accion={{ texto: "Quitar filtros", alPresionar: alLimpiar }} />
        : <EstadoVacio icono={vacioReloj} titulo="Sin salas registradas" texto="Cuando la biblioteca registre sus salas, aparecerán aquí." />;
    const semana = semanaCompleta(hoy);
    const resumenes: ResumenSala[] = salas.map((sala) => {
        const deLaSala = actividades.filter((a) => a.espacio === sala.nombre);
        return {
            sala,
            hoyN: deLaSala.filter((a) => a.fecha === hoy).length,
            enSemana: deLaSala.filter((a) => semana.includes(a.fecha)).length,
            proxima: deLaSala.filter((a) => a.fecha >= hoy).sort((a, b) => (a.fecha + a.inicio).localeCompare(b.fecha + b.inicio))[0],
        };
    });
    const elegida = resumenes.find((r) => r.sala.id === abierta);
    return (
        <>
            <section className="cal-salas" aria-label="Salas de la biblioteca">
                {resumenes.map(({ sala: s, hoyN, enSemana }) => (
                    <button key={s.id} type="button" className={`cal-sala cal-sala--breve${s.habilitada ? "" : " cal-sala--deshabilitada"}`} onClick={() => setAbierta(s.id)}
                        aria-haspopup="dialog" aria-label={`${s.nombre}: ver detalles`}>
                        <span className="cal-sala__cabeza">
                            <span className="cal-sala__nombre">{s.nombre}</span>
                            <Chip tono={!s.habilitada ? "gris" : hoyN ? "dorado" : "verde"}>{!s.habilitada ? "Deshabilitada" : hoyN ? `${hoyN} hoy` : "Libre hoy"}</Chip>
                        </span>
                        <span className="cal-sala__breve">{s.capacidad} personas · {s.ubicacion || "ubicación por confirmar"}</span>
                        <span className="cal-sala__pie">
                            <span>{enSemana} {enSemana === 1 ? "actividad" : "actividades"} esta semana</span>
                            <span className="cal-sala__ver">Ver detalles</span>
                        </span>
                    </button>
                ))}
            </section>
            {elegida && <VistaPreviaSala resumen={elegida} alCerrar={() => setAbierta(null)} alVerDia={() => { setAbierta(null); alVerDia(); }} />}
        </>
    );
}

function VistaPreviaSala({ resumen: { sala: s, hoyN, enSemana, proxima }, alCerrar, alVerDia }: { resumen: ResumenSala; alCerrar: () => void; alVerDia: () => void }) {
    // Se cierra con Esc o con un clic en el fondo
    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); };
        document.addEventListener("keydown", alTeclear);
        return () => document.removeEventListener("keydown", alTeclear);
    }, [alCerrar]);
    // Se pinta en <body>: dentro del panel, las animaciones de entrada harían que «fixed» no quedara fijo a la pantalla
    return createPortal(
        <div className="cal-previa" onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
            <section className="cal-previa__ventana" role="dialog" aria-modal="true" aria-labelledby="cal-previa-titulo">
                <header className="cal-previa__cabecera">
                    <div>
                        <p className="at-subtitulo">Sala</p>
                        <h2 id="cal-previa-titulo">{s.nombre}</h2>
                        <small>{s.ubicacion || "Ubicación por confirmar"}</small>
                    </div>
                    <Chip tono={!s.habilitada ? "gris" : hoyN ? "dorado" : "verde"}>{!s.habilitada ? "Deshabilitada" : hoyN ? `${hoyN} hoy` : "Libre hoy"}</Chip>
                    <button type="button" className="cal-previa__cerrar" onClick={alCerrar} aria-label="Cerrar" autoFocus>✕</button>
                </header>
                <dl className="cal-sala__datos">
                    <div><dt>Capacidad</dt><dd>{s.capacidad} personas</dd></div>
                    <div><dt>Horario</dt><dd>{s.abre && s.cierra ? `${s.abre}–${s.cierra}${s.dias ? ` · ${s.dias}` : ""}` : "Por confirmar"}</dd></div>
                    <div><dt>Equipo</dt><dd>{s.equipo || "Por confirmar"}</dd></div>
                    <div><dt>Accesibilidad</dt><dd>{s.accesibilidad || "Por confirmar"}</dd></div>
                </dl>
                <div className="cal-sala__semana">
                    <span>Esta semana: <strong>{enSemana}</strong> {enSemana === 1 ? "actividad" : "actividades"}</span>
                    <span className="tr-barra-cupo" aria-hidden="true"><span style={{ width: `${Math.min(100, enSemana * 20)}%` }} /></span>
                </div>
                <p className="cal-sala__proxima">
                    {proxima ? <>Próxima: <Link to={PROPUESTA(proxima.folio)}>{proxima.nombre}</Link> · {diaLargo(proxima.fecha).split(" ").slice(0, 3).join(" ")} {proxima.inicio}</> : "Sin actividades próximas."}
                </p>
                <div className="tr-acciones">
                    <button type="button" className="contenidos-boton contenidos-boton--oscuro contenidos-boton--chico" onClick={alVerDia}>Ver agenda de hoy</button>
                    <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico" onClick={alCerrar}>Cerrar</button>
                </div>
                <p className="contenidos-campo__ayuda">Editar datos de la sala y bloquear horarios todavía no tiene servicio.</p>
            </section>
        </div>,
        document.body,
    );
}

export default Calendario;

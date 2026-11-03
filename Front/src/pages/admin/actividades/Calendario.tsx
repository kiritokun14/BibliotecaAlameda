import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./Actividades.css";
import { BloqueResumen, Buscador, Chip, Encabezado, EstadoVacio, Filtros, Migas, Pagina, PieDatos, Tabla, Tarjeta, type Columna } from "../contenidos/piezas";
import { clasesBoton } from "../contenidos/utiles";
import { NOMBRE_ESTADO_ACTIVIDAD, useActividades, type Actividad } from "./datos";
import { hoyISO, horarioBloqueo, useSalas, type Bloqueo, type Sala } from "./salas";
import { celdasDelMes, desdeISO, diaLargo, estadoSala, eventosDelDia, nombreMes, ocupa, ocupacion, semanaDe, type Evento } from "./calendario";
import { BASE_CALENDARIO, TONO_ACTIVIDAD } from "./utiles";
import iconoArchivo from "../../../assets/admin/actividades/resumen-archivo.svg";
import iconoReloj from "../../../assets/admin/contenidos/resumen-reloj-dorado.svg";
import iconoX from "../../../assets/admin/actividades/resumen-x-guinda.svg";
import iconoCalendario from "../../../assets/admin/actividades/tarjeta-calendario.svg";
import iconoRelojTarjeta from "../../../assets/admin/contenidos/tarjeta-reloj.svg";
import iconoCasa from "../../../assets/admin/actividades/tarjeta-casa.svg";
import vacioReloj from "../../../assets/admin/actividades/vacio-reloj.svg";
import vacioBuscar from "../../../assets/admin/contenidos/vacio-buscar.svg";

type Vista = "mes" | "semana" | "dia" | "salas";
const HORAS = ["09:00", "11:00", "13:00", "15:00", "17:00"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Actividades · Calendario y salas (Figma 566:21581 mes, 566:22112 semana, 566:22627 día, 566:23101 salas;
// vacíos 566:25437, 619:50919, 619:51079)
function Calendario() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const vista = (["mes", "semana", "dia", "salas"].includes(params.get("vista") ?? "") ? params.get("vista") : "mes") as Vista;
    const hoy = hoyISO();
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(params.get("fecha") ?? "") ? params.get("fecha")! : hoy;
    const [busqueda, setBusqueda] = useState("");
    const actividades = useActividades();
    const { salas, bloqueos } = useSalas();

    function ir(nueva: Vista, nuevaFecha = fecha) {
        setParams({ vista: nueva, fecha: nuevaFecha });
    }

    const texto = busqueda.trim().toLowerCase();
    const coincide = (titulo: string, sala: string) => !texto || titulo.toLowerCase().includes(texto) || sala.toLowerCase().includes(texto);
    const activas = actividades.filter((a) => ocupa(a) && coincide(a.nombre, a.espacio));
    const bloqueosVisibles = bloqueos.filter((b) => coincide(b.motivo, b.sala));

    const d = desdeISO(fecha);
    const delMes = actividades.filter((a) => ocupa(a) && a.fecha.startsWith(fecha.slice(0, 7))).length;
    const libresHoy = salas.filter((s) => s.habilitada && !bloqueos.some((b) => b.sala === s.nombre && b.fecha === hoy) && !actividades.some((a) => ocupa(a) && a.espacio === s.nombre && a.fecha === hoy)).length;
    const activos = bloqueos.filter((b) => b.fecha >= hoy).length;
    const eventosDia = eventosDelDia(fecha, activas, bloqueosVisibles);
    const diaVacio = vista === "dia" && eventosDia.length === 0 && !texto;

    const encabezado = {
        mes: { titulo: "Calendario de actividades", texto: `${nombreMes(d.getFullYear(), d.getMonth())} · Todas las salas (ejemplo).`, miga: "Mes" },
        semana: { titulo: "Semana por sala", texto: `${semanaTexto(fecha)} · Disponibilidad por horario.`, miga: "Semana por sala" },
        dia: { titulo: diaLargo(fecha), texto: "Actividades y bloqueos de este día.", miga: diaVacio ? "Día sin actividades" : "Día" },
        salas: { titulo: "Salas de la biblioteca", texto: "Capacidad y estado de cada espacio.", miga: "Salas" },
    }[vista];

    return (
        <PanelLayout titulo="Actividades">
            <Pagina>
                <Migas pasos={[["Actividades"], ["Calendario y salas"], [encabezado.miga]]} />
                <Encabezado etiqueta="Calendario y salas" titulo={encabezado.titulo} texto={encabezado.texto} />

                {!diaVacio && (
                    <BloqueResumen
                        insignia="Calendario y salas"
                        titulo="Resumen del"
                        resalte="calendario"
                        subtitulo="Lo que pasa en las salas este mes · cifras de ejemplo"
                        accesos={[
                            { icono: iconoArchivo, numero: delMes, titulo: "Actividades del mes", texto: `Programadas en ${nombreMes(d.getFullYear(), d.getMonth()).split(" ")[0].toLowerCase()} (ejemplo)`, enlace: "Ver el día", tono: "verde", alPresionar: () => ir("dia", hoy) },
                            { icono: iconoReloj, numero: `${libresHoy} de ${salas.filter((s) => s.habilitada).length}`, titulo: "Salas libres hoy", texto: "Sin actividad ni bloqueo (ejemplo)", enlace: "Ver salas", tono: "dorado", alPresionar: () => ir("salas") },
                            { icono: iconoX, numero: activos, titulo: "Bloqueos activos", texto: "Mantenimiento y uso interno (ejemplo)", enlace: "Bloquear", tono: "guinda", alPresionar: () => navigate(`${BASE_CALENDARIO}/bloquear`) },
                        ]}
                    />
                )}

                <div className="cn-barra">
                    <Filtros
                        etiqueta="Vista del calendario"
                        valor={vista}
                        alCambiar={(v) => ir(v)}
                        opciones={[{ valor: "mes", texto: "Mes" }, { valor: "semana", texto: "Semana por sala" }, { valor: "dia", texto: "Día" }, { valor: "salas", texto: "Salas" }]}
                    />
                    <Buscador texto="Buscar actividad o sala" valor={busqueda} alCambiar={setBusqueda} />
                </div>

                {vista === "mes" && (
                    <>
                        <div className="cn-acciones">
                            <button type="button" className={clasesBoton("contorno")} onClick={() => ir("mes", mesRelativo(fecha, -1))}>‹ {nombreMes(d.getFullYear(), d.getMonth() - 1).split(" ")[0]}</button>
                            <button type="button" className={clasesBoton("suave")} onClick={() => ir("mes", hoy)}>Hoy</button>
                            <button type="button" className={clasesBoton("contorno")} onClick={() => ir("mes", mesRelativo(fecha, 1))}>{nombreMes(d.getFullYear(), d.getMonth() + 1).split(" ")[0]} ›</button>
                            <Link to={`${BASE_CALENDARIO}/bloquear`} className={clasesBoton("verde")}>Bloquear sala u horario</Link>
                        </div>
                        <Mes fecha={fecha} hoy={hoy} actividades={activas} bloqueos={bloqueosVisibles} alElegir={(dia) => ir("dia", dia)} />
                    </>
                )}

                {vista === "semana" && <Semana fecha={fecha} hoy={hoy} salas={salas.filter((s) => coincide("", s.nombre) || activas.some((a) => a.espacio === s.nombre))} actividades={activas} bloqueos={bloqueos} alElegir={(dia) => ir("semana", dia)} />}

                {vista === "dia" && (
                    <Tarjeta icono={iconoRelojTarjeta} titulo="Agenda del día">
                        {eventosDia.length === 0 ? (
                            texto ? (
                                <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otra palabra." accion={{ texto: "Limpiar búsqueda", alPresionar: () => setBusqueda("") }} />
                            ) : (
                                <div className="cn-vacio">
                                    <span className="cn-vacio__icono" aria-hidden="true"><img src={vacioReloj} alt="" /></span>
                                    <p className="cn-vacio__titulo">Sin actividades este día</p>
                                    <p className="cn-vacio__texto">Puedes programar una o bloquear una sala.</p>
                                    <Link to={`${BASE_CALENDARIO}/bloquear?fecha=${fecha}`} className={clasesBoton("contorno")}>Bloquear sala u horario</Link>
                                </div>
                            )
                        ) : (
                            <>
                                <Tabla columnas={columnasDia(salas)} filas={eventosDia} clave={(e) => (e.clase === "actividad" ? e.actividad.folio : e.bloqueo.id)} />
                                <p className="cn-nota">{eventosDia.length} {eventosDia.length === 1 ? "elemento" : "elementos"} (ejemplo)</p>
                            </>
                        )}
                    </Tarjeta>
                )}

                {vista === "salas" && <Salas salas={salas.filter((s) => coincide("", s.nombre))} hoy={hoy} actividades={actividades} bloqueos={bloqueos} busqueda={busqueda} alLimpiar={() => setBusqueda("")} />}

                <PieDatos />
            </Pagina>
        </PanelLayout>
    );
}

function semanaTexto(fecha: string) {
    const dias = semanaDe(fecha);
    const i = desdeISO(dias[0]);
    const f = desdeISO(dias[4]);
    const mes = (x: Date) => nombreMes(x.getFullYear(), x.getMonth()).split(" ")[0].toLowerCase();
    return i.getMonth() === f.getMonth()
        ? `${i.getDate()} al ${f.getDate()} de ${mes(f)} de ${f.getFullYear()}`
        : `${i.getDate()} de ${mes(i)} al ${f.getDate()} de ${mes(f)} de ${f.getFullYear()}`;
}

function mesRelativo(fecha: string, n: number) {
    const d = desdeISO(fecha);
    const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`;
}

function Mes({ fecha, hoy, actividades, bloqueos, alElegir }: { fecha: string; hoy: string; actividades: Actividad[]; bloqueos: Bloqueo[]; alElegir: (dia: string) => void }) {
    const d = desdeISO(fecha);
    const celdas = celdasDelMes(d.getFullYear(), d.getMonth());
    return (
        <section className="cn-tarjeta ac-mes" aria-label={`Calendario de ${nombreMes(d.getFullYear(), d.getMonth())}`}>
            <div className="ac-mes__dias" aria-hidden="true">{DIAS_SEMANA.map((x) => <span key={x}>{x}</span>)}</div>
            <div className="ac-mes__rejilla">
                {celdas.map((dia, i) => {
                    if (!dia) return <span key={`h${i}`} className="ac-dia ac-dia--hueco" aria-hidden="true" />;
                    const eventos = eventosDelDia(dia, actividades, bloqueos);
                    return (
                        <button key={dia} type="button" className={`ac-dia ${dia === hoy ? "ac-dia--hoy" : ""}`} onClick={() => alElegir(dia)} aria-label={`${diaLargo(dia)}: ${eventos.length ? `${eventos.length} en agenda` : "sin actividades"}. Ver el día`}>
                            <span className="ac-dia__numero">{Number(dia.slice(8))}</span>
                            {eventos.slice(0, 3).map((e) => (
                                <span key={e.clase === "actividad" ? e.actividad.folio : e.bloqueo.id} className={`ac-evento ac-evento--${e.clase === "bloqueo" ? "guinda" : e.actividad.estado === "publicada" ? "verde" : "dorado"}`}>
                                    {e.clase === "bloqueo" ? `${e.sala} bloqueada` : e.titulo}
                                </span>
                            ))}
                            {eventos.length > 3 && <span className="ac-evento ac-evento--mas">+{eventos.length - 3} más</span>}
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

function Semana({ fecha, hoy, salas, actividades, bloqueos, alElegir }: { fecha: string; hoy: string; salas: Sala[]; actividades: Actividad[]; bloqueos: Bloqueo[]; alElegir: (dia: string) => void }) {
    const dias = semanaDe(fecha);
    const elegido = dias.includes(fecha) ? fecha : dias[0];
    const hayAlgo = salas.some((s) => HORAS.some((h) => ocupacion(s.nombre, elegido, h, actividades, bloqueos).tipo !== "libre"));
    return (
        <Tarjeta icono={iconoCalendario} titulo={elegido === hoy ? "Ocupación de hoy por sala" : "Ocupación del día por sala"} subtitulo={`${diaLargo(elegido)} (ejemplo).`}>
            <div className="cn-filtros" role="group" aria-label="Día de la semana">
                {dias.map((dia) => (
                    <button key={dia} type="button" className={`cn-filtro ${dia === elegido ? "cn-filtro--activo" : ""}`} aria-pressed={dia === elegido} onClick={() => alElegir(dia)}>
                        {diaLargo(dia).split(" ").slice(0, 2).join(" ")}
                    </button>
                ))}
            </div>
            {!hayAlgo ? (
                <div className="cn-vacio">
                    <span className="cn-vacio__icono" aria-hidden="true"><img src={vacioReloj} alt="" /></span>
                    <p className="cn-vacio__titulo">Sin actividades esta semana</p>
                    <p className="cn-vacio__texto">Todas las salas están libres en este horario.</p>
                    <Link to={`${BASE_CALENDARIO}/bloquear?fecha=${elegido}`} className={clasesBoton("contorno")}>Bloquear sala u horario</Link>
                </div>
            ) : (
                <>
                    <Tabla
                        columnas={[
                            { titulo: "SALA", fuerte: true, celda: (s: Sala) => <Link to={`${BASE_CALENDARIO}/salas/${s.id}`} className="cn-enlace">{s.nombre}</Link> },
                            ...HORAS.map((h) => ({
                                titulo: h.replace(/^0/, ""),
                                ancho: 130,
                                celda: (s: Sala) => {
                                    const o = ocupacion(s.nombre, elegido, h, actividades, bloqueos);
                                    return <Chip tono={o.tipo === "libre" ? "verde" : o.tipo === "bloqueada" ? "guinda" : "dorado"} ancho={120}>{o.texto}</Chip>;
                                },
                            })),
                        ]}
                        filas={salas}
                        clave={(s) => s.id}
                    />
                    <p className="cn-nota">Toca una sala para ver su ficha (ejemplo)</p>
                </>
            )}
        </Tarjeta>
    );
}

function columnasDia(salas: Sala[]): Columna<Evento>[] {
    const ficha = (nombre: string) => `${BASE_CALENDARIO}/salas/${salas.find((s) => s.nombre === nombre)?.id ?? ""}`;
    return [
        { titulo: "HORA", ancho: 110, folio: true, celda: (e) => e.hora || "Todo el día" },
        { titulo: "ACTIVIDAD", fuerte: true, celda: (e) => e.titulo },
        { titulo: "SALA", ancho: 160, celda: (e) => e.sala },
        { titulo: "TIPO", ancho: 110, celda: (e) => e.tipo },
        {
            titulo: "ESTADO",
            ancho: 150,
            celda: (e) => e.clase === "bloqueo"
                ? <Chip tono="guinda" ancho={140}>{horarioBloqueo(e.bloqueo) === "Todo el día" ? "Bloqueada" : `Bloqueada ${e.bloqueo.desde}`}</Chip>
                : <Chip tono={TONO_ACTIVIDAD[e.actividad.estado]} ancho={140}>{NOMBRE_ESTADO_ACTIVIDAD[e.actividad.estado]}</Chip>,
        },
        {
            titulo: "ACCIÓN",
            ancho: 70,
            celda: (e) => (
                <Link to={e.clase === "actividad" ? `/admin/actividades/propuestas/${e.actividad.folio}` : ficha(e.sala)} className="cn-enlace">
                    Ver →<span className="cn-solo-lectores"> {e.titulo}</span>
                </Link>
            ),
        },
    ];
}

function Salas({ salas, hoy, actividades, bloqueos, busqueda, alLimpiar }: { salas: Sala[]; hoy: string; actividades: Actividad[]; bloqueos: Bloqueo[]; busqueda: string; alLimpiar: () => void }) {
    const hoyEn = (s: Sala) => {
        const e = estadoSala(s, hoy, bloqueos);
        if (e.texto === "Bloqueada") return "Bloqueada";
        const n = actividades.filter((a) => ocupa(a) && a.espacio === s.nombre && a.fecha === hoy).length;
        return n === 0 ? "Sin actividades" : `${n} ${n === 1 ? "actividad" : "actividades"}`;
    };
    return (
        <Tarjeta icono={iconoCasa} titulo="Salas">
            {salas.length === 0 ? (
                <EstadoVacio icono={vacioBuscar} titulo={`Sin resultados para «${busqueda.trim()}»`} texto="Prueba con otro nombre de sala." accion={{ texto: "Limpiar búsqueda", alPresionar: alLimpiar }} />
            ) : (
                <Tabla
                    columnas={[
                        { titulo: "SALA", fuerte: true, celda: (s: Sala) => s.nombre },
                        { titulo: "CAPACIDAD", ancho: 100, celda: (s: Sala) => <strong>{s.capacidad}</strong> },
                        { titulo: "EQUIPO", ancho: 200, celda: (s: Sala) => s.equipo },
                        { titulo: "HOY", ancho: 140, celda: hoyEn },
                        { titulo: "ESTADO", ancho: 150, celda: (s: Sala) => { const e = estadoSala(s, hoy, bloqueos); return <Chip tono={e.tono} ancho={140}>{e.texto}</Chip>; } },
                        { titulo: "ACCIÓN", ancho: 100, celda: (s: Sala) => <Link to={`${BASE_CALENDARIO}/salas/${s.id}`} className="cn-enlace">Ver ficha →<span className="cn-solo-lectores"> {s.nombre}</span></Link> },
                    ]}
                    filas={salas}
                    clave={(s) => s.id}
                />
            )}
        </Tarjeta>
    );
}

export default Calendario;

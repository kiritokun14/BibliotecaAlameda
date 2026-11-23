import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import PanelLayout from "../PanelLayout";
import "../contenidos/Contenidos.css";
import "./EditorActividades.css";
import "../contenidoDemo/Contenidos.css";
import "./Calendario.css";
import "../atencion/AtencionTramites.css";
import { Migas } from "../contenidoDemo/piezas";
import { Aviso, Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Segmentado, Tarjeta, Vacio, type TonoEstado } from "../piezasPanel";
import { fechaCorta } from "./datos";
import { enFiltro, NOMBRE_ESTADO_VISITA, type EstadoVisita, type FiltroVisita, type Visita } from "./visitas";
import { BASE_VISITAS } from "./utiles";
import { useVisitasPersonal } from "../../../servicios/usarVisitasPersonal";
import { useCalendarioPersonal } from "../../../servicios/usarCalendarioPersonal";
import { hoyISO } from "./salas";
import { ocupa, sumarDias } from "./calendario";
import type { Actividad } from "./datos";
import { EsqueletoLista } from "../../../components/portal/Esqueleto";

// Actividades · Visitas y uso de espacios (rehecho con las piezas del panel, 22 nov 2026).
// Visitas: cifras que filtran → lista agrupada por lo que toca hacer (por confirmar, próximas, historial) | la próxima visita
// y cómo se atiende. Uso de espacios: actividades por registrar | ocupación por sala este mes.

type Vista = "visitas" | "uso";
const TONO: Record<EstadoVisita, TonoEstado> = { "por-confirmar": "dorado", propuesta: "dorado", confirmada: "verde", realizada: "gris", cancelada: "guinda", rechazada: "guinda" };
const ESTADOS: { valor: FiltroVisita; texto: string }[] = [
    { valor: "todas", texto: "Todas" }, { valor: "por-confirmar", texto: "Por confirmar" }, { valor: "confirmada", texto: "Confirmadas" },
    { valor: "realizada", texto: "Realizadas" }, { valor: "cancelada", texto: "Canceladas o rechazadas" },
];
const DETALLE = (folio: string) => `/admin/atencion/espacios/${folio}`;
const cuando = (v: Visita) => `${v.fecha}${v.hora ?? ""}`;
const partes = (iso: string) => { const [d, m] = fechaCorta(iso).split(" "); return [d, (m ?? "").replace(".", "")]; };

function Visitas() {
    const [params, setParams] = useSearchParams();
    const vista: Vista = params.get("vista") === "uso" ? "uso" : "visitas";
    const { visitas, cargando, error, reintentar } = useVisitasPersonal();
    const [filtro, setFiltro] = useState<FiltroVisita>("todas");
    const [espacio, setEspacio] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const texto = busqueda.trim().toLowerCase();

    const cambiarVista = (v: Vista) => { setParams(v === "uso" ? { vista: "uso" } : {}); setBusqueda(""); };
    const limpiar = () => { setBusqueda(""); setFiltro("todas"); setEspacio(""); };
    const alternar = (f: FiltroVisita) => setFiltro(filtro === f ? "todas" : f);

    const cuenta = (f: FiltroVisita) => visitas.filter((v) => enFiltro(v, f)).length;
    const espacios = [...new Set(visitas.map((v) => v.espacio).filter(Boolean))].sort();
    const filtradas = visitas.filter((v) => enFiltro(v, filtro) && (!espacio || v.espacio === espacio)
        && (!texto || v.folio.toLowerCase().includes(texto) || v.grupo.toLowerCase().includes(texto) || v.espacio.toLowerCase().includes(texto)));
    const grupos = [
        { id: "hoy", titulo: "Por confirmar", lista: filtradas.filter((v) => enFiltro(v, "por-confirmar")).sort((a, b) => (a.responderAntes || cuando(a)).localeCompare(b.responderAntes || cuando(b))), accion: "Revisar" },
        { id: "manana", titulo: "Próximas confirmadas", lista: filtradas.filter((v) => v.estado === "confirmada").sort((a, b) => cuando(a).localeCompare(cuando(b))), accion: "Ver" },
        { id: "semana", titulo: "Historial", lista: filtradas.filter((v) => enFiltro(v, "realizada") || enFiltro(v, "cancelada")).sort((a, b) => cuando(b).localeCompare(cuando(a))), accion: "Ver" },
    ].filter((g) => g.lista.length);
    const hoy = hoyISO();
    const siguiente = visitas.filter((v) => v.estado === "confirmada" && v.fecha >= hoy).sort((a, b) => cuando(a).localeCompare(cuando(b)))[0];
    // Los próximos 7 días: cuántas visitas confirmadas o por confirmar hay cada día
    const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i)).map((dia) => ({
        dia, lista: visitas.filter((v) => v.fecha === dia && (v.estado === "confirmada" || enFiltro(v, "por-confirmar"))),
    }));
    const plazoUrgente = (v: Visita) => !!v.responderAntes && v.responderAntes <= sumarDias(hoy, 1);

    const cabecera = (
        <Encabezado titulo="Visitas y uso de espacios" texto={vista === "uso" ? "Cómo se usó cada sala, con las actividades del calendario." : "Solicitudes de visita de grupos: confirma, da seguimiento y consulta el historial."}>
            {vista === "visitas" && <>
                <Cifra icono="reloj" valor={cuenta("por-confirmar")} texto="por confirmar" tono="vino" activa={filtro === "por-confirmar"} alPresionar={() => alternar("por-confirmar")} />
                <Cifra icono="check" valor={cuenta("confirmada")} texto="confirmadas" activa={filtro === "confirmada"} alPresionar={() => alternar("confirmada")} />
                <Cifra icono="lista" valor={cuenta("realizada")} texto="realizadas" activa={filtro === "realizada"} alPresionar={() => alternar("realizada")} />
            </>}
        </Encabezado>
    );

    if (cargando) return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <div className="pz-pagina">
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios"]]} />
                {cabecera}
                <EsqueletoLista texto="Cargando visitas…" />
            </div>
        </PanelLayout>
    );

    return (
        <PanelLayout titulo="Actividades" tema="contenidos paleta">
            <div className="pz-pagina">
                <Migas pasos={[["Actividades"], ["Visitas y uso de espacios"]]} />
                {cabecera}
                {error && <Aviso tono="error" titulo="No pudimos cargar las visitas." texto={error}>
                    <button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={reintentar}>Reintentar</button>
                </Aviso>}

                <section className="pz-tarjeta cal-barra" aria-label="Qué ver y filtros">
                    <div className="cal-barra__fila">
                        <Segmentado<Vista> etiqueta="Qué ver" valor={vista} alCambiar={cambiarVista}
                            opciones={[{ valor: "visitas", texto: "Visitas", cantidad: visitas.length }, { valor: "uso", texto: "Uso de espacios" }]} />
                        <Buscador etiqueta={vista === "uso" ? "Buscar por sala, actividad o fecha" : "Buscar por folio, grupo o espacio"} placeholder={vista === "uso" ? "Sala, actividad o fecha" : "Folio, grupo o espacio"} valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={(vista === "visitas" && filtro !== "todas" ? 1 : 0) + (espacio ? 1 : 0)} alQuitar={() => { setFiltro("todas"); setEspacio(""); }} grupos={[
                                ...(vista === "visitas" ? [{ titulo: "Estado", valor: filtro, alCambiar: (v: string) => setFiltro(v as FiltroVisita), opciones: ESTADOS.map((e) => ({ ...e, cantidad: cuenta(e.valor) })) }] : []),
                                ...(espacios.length ? [{ titulo: "Espacio", valor: espacio, alCambiar: setEspacio, opciones: [{ valor: "", texto: "Todos" }, ...espacios.map((e) => ({ valor: e, texto: e, cantidad: visitas.filter((v) => v.espacio === e).length }))] }] : []),
                            ]} />
                        </Buscador>
                    </div>
                </section>

                {vista === "uso" ? <UsoEspacios texto={texto} espacio={espacio} /> : (
                    <div className="pz-columnas">
                        <Tarjeta icono="grupo" id="visitas-lista" titulo="Solicitudes de visita" texto="Primero las que hay que confirmar; responde antes las que vencen primero" className="pz-pendientes">
                            {visitas.length === 0 ? <Vacio icono="grupo" titulo="Aún no hay solicitudes de visita" texto="Cuando un grupo pida una visita desde el portal, aparecerá aquí." />
                                : grupos.length === 0 ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto="Ninguna visita coincide con la búsqueda o los filtros."
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={limpiar}>Quitar filtros</button>} />
                                : (
                                    <div className="pz-grupos" tabIndex={0} role="region" aria-label="Visitas">
                                        {grupos.map((g) => (
                                            <div key={g.id} className="pz-grupo">
                                                <p className={`pz-grupo__titulo pz-grupo__titulo--${g.id}`}>{g.titulo}<span>{g.lista.length}</span></p>
                                                <ul className="pz-filas">
                                                    {g.lista.map((v) => {
                                                        const [d, m] = partes(v.fecha);
                                                        return (
                                                            <li key={v.folio}>
                                                                <article className={`pz-fila${v.estado === "por-confirmar" ? " pz-fila--espera" : ""}`}>
                                                                    <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                                    <div className="pz-fila__textos">
                                                                        <h4 className="pz-fila__titulo">{v.grupo}</h4>
                                                                        <p className="pz-fila__detalle">
                                                                            <span className="pz-fila__folio">{v.folio}</span><span>{v.hora || "Hora por confirmar"}</span>
                                                                            <span>{v.detallePersonas || `${v.personas} personas`}</span><span>{v.espacio || "Espacio por confirmar"}</span>
                                                                        </p>
                                                                        {v.estado === "por-confirmar" && v.responderAntes && <p className={`pz-fila__plazo${plazoUrgente(v) ? "" : " vis-plazo--holgado"}`}>{plazoUrgente(v) ? "Urgente: " : ""}Responder antes del {fechaCorta(v.responderAntes)}</p>}
                                                                    </div>
                                                                    <Chip tono={TONO[v.estado]}>{NOMBRE_ESTADO_VISITA[v.estado]}</Chip>
                                                                    <Link to={DETALLE(v.folio)} className={`pz-boton pz-boton--chico${g.accion === "Revisar" ? "" : " pz-boton--contorno"}`}>{g.accion}<span className="solo-lectores"> {v.folio}</span></Link>
                                                                </article>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            <div className="pz-tarjeta__pie"><p aria-live="polite">{filtradas.length} de {visitas.length} visitas</p></div>
                        </Tarjeta>
                        <aside className="pz-lateral" aria-label="La próxima visita">
                            <Tarjeta icono="hoy" id="visitas-proxima" titulo="La próxima visita" texto={siguiente ? faltan(siguiente.fecha) : "Sin visitas confirmadas"}>
                                {siguiente ? (() => {
                                    const [d, m] = partes(siguiente.fecha);
                                    return (
                                        <div className="vis-proxima">
                                            <div className="vis-proxima__cabeza">
                                                <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                <div className="vis-proxima__textos">
                                                    <p className="vis-proxima__grupo">{siguiente.grupo}</p>
                                                    <p className="vis-proxima__folio">Folio {siguiente.folio}</p>
                                                </div>
                                                <Chip tono="verde">Confirmada</Chip>
                                            </div>
                                            <dl className="vis-proxima__datos">
                                                <div><dt><Icono nombre="reloj" />Hora</dt><dd>{siguiente.hora || "Por confirmar"}</dd></div>
                                                <div><dt><Icono nombre="grupo" />Personas</dt><dd>{siguiente.personas}</dd></div>
                                                <div><dt><Icono nombre="espacios" />Espacio</dt><dd title={siguiente.espacio}>{siguiente.espacio || "Por confirmar"}</dd></div>
                                            </dl>
                                            <Link to={DETALLE(siguiente.folio)} className="pz-boton pz-boton--contorno pz-boton--chico vis-proxima__boton">Ver la visita</Link>
                                        </div>
                                    );
                                })() : <Vacio icono="calendario" titulo="Nada en puerta" texto="Cuando confirmes una visita, aparecerá aquí." />}
                            </Tarjeta>
                            <Tarjeta icono="calendario" id="visitas-semana" titulo="Los próximos 7 días" texto={textoSemana(semana.reduce((n, d) => n + d.lista.length, 0))}>
                                <ol className="vis-semana">
                                    {semana.map(({ dia, lista }, i) => {
                                        const [d] = partes(dia);
                                        const nombre = new Date(`${dia}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "");
                                        return (
                                            <li key={dia} className={`vis-semana__dia${i === 0 ? " vis-semana__dia--hoy" : ""}${lista.length ? " vis-semana__dia--ocupado" : ""}`}
                                                title={lista.length ? lista.map((v) => `${v.hora ?? ""} ${v.grupo}`).join(", ") : "Sin visitas"}>
                                                <span>{i === 0 ? "Hoy" : nombre}</span><strong>{d}</strong>
                                                <small aria-label={lista.length ? `${lista.length} ${lista.length === 1 ? "visita" : "visitas"}` : "Sin visitas"}>{lista.length || ""}</small>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </Tarjeta>
                            <Plegable titulo="Cómo se atiende una visita">
                                <ul>
                                    <li>Revisa la solicitud: grupo, personas, fecha y espacio.</li>
                                    <li>Confírmala, propón otra fecha o recházala con motivo antes del plazo.</li>
                                    <li>El día de la visita, márcala como realizada.</li>
                                </ul>
                            </Plegable>
                        </aside>
                    </div>
                )}
            </div>
        </PanelLayout>
    );
}

// ---------- Uso de espacios ----------
// TODO backend: el registro de uso efectivo (quién usó la sala, cuántas personas, incidencias) aún no tiene servicio.
// Mientras, se arma con las actividades del calendario: las que ya pasaron quedan «por registrar».
const horasDe = (a: Actividad) => {
    if (!a.inicio || !a.fin) return 0;
    const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    return Math.max(0, (m(a.fin) - m(a.inicio)) / 60);
};

function UsoEspacios({ texto, espacio }: { texto: string; espacio: string }) {
    const { actividades, salas, cargando } = useCalendarioPersonal();
    const hoy = hoyISO();
    const hace30 = sumarDias(hoy, -30);
    const mes = hoy.slice(0, 7);
    const validas = actividades.filter((a) => ocupa(a) && (!espacio || a.espacio === espacio)
        && (!texto || a.espacio.toLowerCase().includes(texto) || a.nombre.toLowerCase().includes(texto) || fechaCorta(a.fecha).includes(texto)));
    const porRegistrar = validas.filter((a) => a.fecha < hoy && a.fecha >= hace30).sort((a, b) => (b.fecha + b.inicio).localeCompare(a.fecha + a.inicio));
    const delMes = validas.filter((a) => a.fecha.startsWith(mes));
    const porSala = salas.filter((s) => !espacio || s.nombre === espacio).map((s) => {
        const lista = delMes.filter((a) => a.espacio === s.nombre);
        return { sala: s, cantidad: lista.length, horas: lista.reduce((t, a) => t + horasDe(a), 0) };
    }).sort((a, b) => b.cantidad - a.cantidad);
    const maximo = Math.max(1, ...porSala.map((x) => x.cantidad));

    if (cargando) return <EsqueletoLista texto="Cargando uso de espacios…" />;
    return (
        <div className="pz-columnas">
            <Tarjeta icono="reloj" id="uso-pendiente" titulo="Por registrar" texto="Actividades de los últimos 30 días: anota cuántas personas asistieron y si hubo incidencias" className="pz-pendientes"
                accion={<Link to={`${BASE_VISITAS}/uso/registrar`} className="pz-boton pz-boton--chico">Registrar otro uso</Link>}>
                {porRegistrar.length === 0
                    ? <Vacio icono="check" titulo="Nada por registrar" texto="Cuando pase una actividad del calendario, aparecerá aquí." />
                    : (
                        <div className="pz-grupos" tabIndex={0} role="region" aria-label="Por registrar">
                            <ul className="pz-filas">
                                {porRegistrar.map((a) => {
                                    const [d, m] = partes(a.fecha);
                                    return (
                                        <li key={`${a.folio}:${a.fecha}:${a.inicio}`}>
                                            <article className="pz-fila pz-fila--espera">
                                                <span className="pz-fecha" aria-hidden="true"><strong>{d}</strong><span>{m}</span></span>
                                                <div className="pz-fila__textos">
                                                    <h4 className="pz-fila__titulo">{a.espacio}</h4>
                                                    <p className="pz-fila__detalle"><span>{a.nombre}</span><span>{a.inicio}{a.fin ? ` a ${a.fin}` : ""} h</span><span>{a.inscritos} {a.inscritos === 1 ? "inscrita" : "inscritas"}</span></p>
                                                </div>
                                                <Chip tono="dorado">Por registrar</Chip>
                                                <Link to={`${BASE_VISITAS}/uso/registrar`} className="pz-boton pz-boton--chico">Registrar</Link>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                <div className="pz-tarjeta__pie"><p>{porRegistrar.length} {porRegistrar.length === 1 ? "actividad" : "actividades"} por registrar</p></div>
            </Tarjeta>
            <aside className="pz-lateral" aria-label="Ocupación por sala">
                <Tarjeta icono="espacios" id="uso-salas" titulo="Ocupación por sala" texto="Este mes, según el calendario" className="pz-tarjeta--actividades">
                    {porSala.length === 0 ? <Vacio icono="buscarCuenta" titulo="Sin salas con ese filtro" texto="Prueba con otro espacio." /> : (
                        <ol className="pz-ranking">
                            {porSala.map(({ sala, cantidad, horas }, n) => (
                                <li key={sala.id}>
                                    <span className="pz-ranking__lugar" aria-hidden="true"><Icono nombre="espacios" /></span>
                                    <div className="pz-ranking__textos">
                                        <p className="pz-ranking__nombre">{sala.nombre}</p>
                                        <span className="pz-ranking__barra" aria-hidden="true"><span style={{ width: `${(cantidad / maximo) * 100}%`, animationDelay: `${Math.min(n * 60, 180)}ms` }} /></span>
                                    </div>
                                    <p className="pz-ranking__valor"><strong>{cantidad}</strong><span>{horas % 1 ? horas.toFixed(1) : horas} h</span></p>
                                </li>
                            ))}
                        </ol>
                    )}
                    <p className="pz-acciones__nota">El uso efectivo todavía no se guarda en el servidor: estas cifras salen del calendario.</p>
                </Tarjeta>
            </aside>
        </div>
    );
}

export default Visitas;

// «Hoy», «Mañana», «En 3 días» o «Dentro de 2 semanas», con la fecha corta
function faltan(fecha: string) {
    const dias = Math.round((new Date(`${fecha}T12:00:00`).getTime() - new Date(`${hoyISO()}T12:00:00`).getTime()) / 86400000);
    const cuando = dias <= 0 ? "Hoy" : dias === 1 ? "Mañana" : dias < 14 ? `En ${dias} días` : `En ${Math.round(dias / 7)} semanas`;
    return `${cuando}, ${fechaCorta(fecha)}`;
}

// «Sin visitas en la semana», «1 visita en la semana», «3 visitas en la semana»; el número de cada día va en su círculo
const textoSemana = (n: number) => (n === 0 ? "Sin visitas en la semana" : `${n} ${n === 1 ? "visita" : "visitas"} en la semana`);

// Atención: bandeja compartida de Solicitudes de credencial, Solicitudes de espacios y Propuestas de eventos.
// Rehecha con las piezas del panel (22 nov 2026): cifras que filtran → lista con los datos de cada solicitud en fichas
// y la acción | lo que lleva más tiempo esperando y cómo se atiende. La configuración de cada área no cambia.
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Migas } from "../componentes";
import { Buscador, Chip, Cifra, Encabezado, FiltrosAvanzados, Icono, Plegable, Tarjeta, Vacio, type NombreIcono, type TonoEstado } from "../piezasPanel";
import type { Estado } from "./datos";
import { ListaEspera } from "./Espera";

const TONO_ESTADO: Record<Estado, TonoEstado> = { pendiente: "dorado", observaciones: "guinda", aprobada: "verde", rechazada: "gris" };
const ICONO_ESTADO: Record<Estado, NombreIcono> = { pendiente: "reloj", observaciones: "alerta", aprobada: "check", rechazada: "lista" };

type SolicitudBase = { folio: string; persona: string; enviada: string; estado: Estado };

export type Columna<T> = { titulo: string; ancho?: number; celda: (solicitud: T) => ReactNode };

// Fila compacta (22 nov, Aldahir: «mejora los elementos de la tabla»): bloque con la fecha de lo que se pide,
// nombre con su tipo, y en un renglón los datos con su ícono (folio, área, horario, personas)
export type FilaCompacta = { fecha?: string; tipo?: string; datos: { icono: NombreIcono; texto: string }[] };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function bloqueFecha(fecha?: string) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha ?? "");
    return m ? [String(Number(m[3])), MESES[Number(m[2]) - 1]] : null;
}

// Todo lo que cambia entre credenciales, espacios y propuestas
export type ConfigArea = {
    ruta: string;
    titulo: string; // "Solicitudes de credencial"
    tituloTodas: string; // "Todas las solicitudes de credencial"
    descripcion: string;
    etiquetaBloque: string; // "Solicitudes"
    pregunta: string; // "¿Cómo van las solicitudes de credencial?"
    sustantivo: string; // "solicitudes" / "propuestas"
    estados: Record<Estado, string>; // cómo se llama cada estado en esta área
    filtroObservaciones: string; // "Con observaciones" / "Con cambios propuestos"
    resumen: { icono: string; detalle: string; texto: (cantidad: number) => string }[];
    periodoResueltas: string; // "esta semana" / "este mes"
    buscarPor: string;
    accionPendiente: string; // "Cotejar" / "Revisar"
    notaBandeja: string;
    textoVacio: string;
    ejemplo?: boolean; // false cuando la lista ya viene del backend
};

type BandejaProps<T extends SolicitudBase> = {
    vista: "bandeja" | "todas";
    config: ConfigArea;
    solicitudes: T[];
    columnas: Columna<T>[];
    coincide: (solicitud: T, texto: string) => boolean;
    fila?: (solicitud: T) => FilaCompacta;
};

type Filtro = "todas" | Estado;

const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
const esperando = (iso: string) => { const d = diasDesde(iso); return d === 0 ? "Llegó hoy" : d === 1 ? "Espera desde ayer" : `Espera desde hace ${d} días`; };

function Bandeja<T extends SolicitudBase>({ vista, config, solicitudes, columnas, coincide, fila }: BandejaProps<T>) {
    const [filtro, setFiltro] = useState<Filtro>(vista === "bandeja" ? "pendiente" : "todas");
    const [busqueda, setBusqueda] = useState("");

    const cuenta = (estado: Estado) => solicitudes.filter((s) => s.estado === estado).length;
    const pendientes = cuenta("pendiente");
    const observaciones = cuenta("observaciones");
    const resueltas = cuenta("aprobada") + cuenta("rechazada");

    // En la bandeja van primero las más antiguas; en «Todas», las más recientes
    const ordenadas = [...solicitudes].sort((a, b) => a.enviada.localeCompare(b.enviada) || a.folio.localeCompare(b.folio));
    if (vista === "todas") ordenadas.reverse();
    const texto = busqueda.trim().toLowerCase();
    const filtradas = ordenadas.filter((s) => (filtro === "todas" || s.estado === filtro) && (!texto || coincide(s, texto)));
    const antiguas = [...solicitudes].filter((s) => s.estado === "pendiente").sort((a, b) => a.enviada.localeCompare(b.enviada)).slice(0, 4);
    const alternar = (f: Filtro) => setFiltro(filtro === f ? "todas" : f);
    const [principal, ...demas] = columnas;

    return (
        <>
            <Migas pasos={vista === "bandeja" ? [[config.titulo]] : [[config.titulo, config.ruta], ["Todas"]]} />
            <div className="pz-pagina">
                <Encabezado titulo={vista === "bandeja" ? config.titulo : config.tituloTodas} texto={vista === "bandeja" ? config.descripcion : "El historial completo, con cualquier estado; las más recientes primero."}>
                    <Cifra icono="reloj" tono="vino" valor={pendientes} texto={config.estados.pendiente.toLowerCase()} activa={filtro === "pendiente"} alPresionar={() => alternar("pendiente")} />
                    <Cifra icono="alerta" valor={observaciones} texto={config.filtroObservaciones.toLowerCase()} activa={filtro === "observaciones"} alPresionar={() => alternar("observaciones")} />
                    <Cifra icono="check" valor={resueltas} texto={`resueltas ${config.periodoResueltas}`} activa={filtro === "aprobada"} alPresionar={() => alternar("aprobada")} />
                </Encabezado>

                <div className="pz-columnas">
                    <Tarjeta icono="lista" id="atencion-lista" titulo={vista === "bandeja" ? `Bandeja de ${config.sustantivo}` : "Listado completo"} className="pz-pendientes"
                        texto={vista === "bandeja" ? "Primero las que llevan más tiempo esperando" : `Incluye ${config.sustantivo} por revisar, con observaciones y resueltas`}
                        accion={vista === "bandeja"
                            ? <Link to={`${config.ruta}/todas`} className="pz-boton pz-boton--contorno pz-boton--chico">Ver todas</Link>
                            : <Link to={config.ruta} className="pz-boton pz-boton--contorno pz-boton--chico">Volver a la bandeja</Link>}>
                        <Buscador etiqueta={`Buscar por ${config.buscarPor}`} placeholder={`Buscar por ${config.buscarPor}`} valor={busqueda} alCambiar={setBusqueda}>
                            <FiltrosAvanzados activos={filtro !== "todas" ? 1 : 0} alQuitar={() => setFiltro("todas")} grupos={[{ titulo: "Estado", valor: filtro, alCambiar: (v) => setFiltro(v as Filtro), opciones: [
                                { valor: "todas", texto: "Todas", cantidad: solicitudes.length },
                                { valor: "pendiente", texto: config.estados.pendiente, cantidad: pendientes },
                                { valor: "observaciones", texto: config.filtroObservaciones, cantidad: observaciones },
                                { valor: "aprobada", texto: "Aprobadas", cantidad: cuenta("aprobada") },
                                { valor: "rechazada", texto: "Rechazadas", cantidad: cuenta("rechazada") },
                            ] }]} />
                        </Buscador>
                        {filtradas.length === 0 ? (
                            texto || filtro !== "todas"
                                ? <Vacio icono="buscarCuenta" titulo="Sin resultados" texto={`No hay ${config.sustantivo} con esa búsqueda o ese estado.`}
                                    accion={<button type="button" className="pz-boton pz-boton--contorno pz-boton--chico" onClick={() => { setBusqueda(""); setFiltro("todas"); }}>Quitar filtros</button>} />
                                : <Vacio icono="check" titulo={`No hay ${config.sustantivo} por ahora`} texto={config.textoVacio} />
                        ) : (
                            <div className="pz-grupos" tabIndex={0} role="region" aria-label={`Lista de ${config.sustantivo}`}>
                                <ul className="pz-filas">
                                    {filtradas.map((s) => fila ? (() => {
                                        const f = fila(s);
                                        const dia = bloqueFecha(f.fecha);
                                        const espera = diasDesde(s.enviada);
                                        return (
                                            <li key={s.folio}>
                                                <article className={`pz-fila ba-compacta${s.estado === "pendiente" ? " pz-fila--espera" : ""}`}>
                                                    {dia ? <span className="pz-fecha" aria-hidden="true"><strong>{dia[0]}</strong><span>{dia[1]}</span></span>
                                                        : <span className={`pz-fila__icono ba-icono--${s.estado}`} aria-hidden="true"><Icono nombre={ICONO_ESTADO[s.estado]} /></span>}
                                                    <div className="pz-fila__textos">
                                                        <p className="ba-compacta__cabeza">
                                                            <span className="pz-fila__titulo" title={s.persona}>{s.persona}</span>
                                                            {f.tipo && <span className="ba-compacta__tipo">{f.tipo}</span>}
                                                        </p>
                                                        <ul className="ba-compacta__datos">
                                                            <li className="pz-fila__folio">{s.folio}</li>
                                                            {f.datos.map((d) => <li key={d.icono + d.texto} title={d.texto}><Icono nombre={d.icono} />{d.texto}</li>)}
                                                        </ul>
                                                        {s.estado === "pendiente" && <p className={`ba-compacta__espera${espera >= 7 ? " ba-compacta__espera--larga" : ""}`}>{esperando(s.enviada)}</p>}
                                                    </div>
                                                    <Chip tono={TONO_ESTADO[s.estado]}>{config.estados[s.estado]}</Chip>
                                                    <Link to={`${config.ruta}/${s.folio}`} className={`pz-boton pz-boton--chico${s.estado === "pendiente" ? "" : " pz-boton--contorno"}`}>
                                                        {s.estado === "pendiente" ? config.accionPendiente : "Ver"}<span className="solo-lectores"> {s.folio}</span>
                                                    </Link>
                                                </article>
                                            </li>
                                        );
                                    })() : (
                                        <li key={s.folio}>
                                            <article className={`pz-fila ba-fila${s.estado === "pendiente" ? " pz-fila--espera" : ""}`}>
                                                <span className={`pz-fila__icono ba-icono--${s.estado}`} aria-hidden="true"><Icono nombre={ICONO_ESTADO[s.estado]} /></span>
                                                <div className="pz-fila__textos">
                                                    <div className="pz-fila__titulo ba-titulo">{principal ? principal.celda(s) : s.persona}</div>
                                                </div>
                                                <Chip tono={TONO_ESTADO[s.estado]}>{config.estados[s.estado]}</Chip>
                                                <Link to={`${config.ruta}/${s.folio}`} className={`pz-boton pz-boton--chico${s.estado === "pendiente" ? "" : " pz-boton--contorno"}`}>
                                                    {s.estado === "pendiente" ? config.accionPendiente : "Ver"}<span className="solo-lectores"> {s.folio}</span>
                                                </Link>
                                                    <div className="ba-datos ba-datos--fila">
                                                        <span className="ba-dato"><small>Folio</small><span className="pz-fila__folio">{s.folio}</span></span>
                                                        {demas.map((c) => <span key={c.titulo} className="ba-dato"><small>{c.titulo}</small>{c.celda(s)}</span>)}
                                                    </div>
                                                    {s.estado === "pendiente" && <p className="pz-fila__plazo">{esperando(s.enviada)}</p>}
                                            </article>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="pz-tarjeta__pie"><p aria-live="polite">{filtradas.length} de {solicitudes.length} {config.sustantivo}</p></div>
                    </Tarjeta>

                    <aside className="pz-lateral" aria-label="Lo que espera más">
                        <Tarjeta icono="reloj" id="atencion-antiguas" titulo="Llevan más tiempo esperando" texto={pendientes ? `${pendientes} ${config.estados.pendiente.toLowerCase()}` : "Estás al día"} className="pz-tarjeta--actividades">
                            {antiguas.length ? (
                                <ListaEspera items={antiguas.map((s) => ({
                                    clave: s.folio, ruta: `${config.ruta}/${s.folio}`, titulo: s.persona, dias: diasDesde(s.enviada),
                                    detalle: [s.folio, fila?.(s).tipo].filter(Boolean).join(", "),
                                }))} />
                            ) : <Vacio icono="check" titulo="Nada por revisar" texto={config.textoVacio} />}
                        </Tarjeta>
                        <Plegable titulo={`Cómo se atienden las ${config.sustantivo}`}>
                            <ul>
                                <li>Abre la más antigua y revisa sus datos.</li>
                                <li>Apruébala, propón un cambio o recházala con motivo; la persona recibe un aviso.</li>
                                <li>{config.notaBandeja}</li>
                            </ul>
                        </Plegable>
                    </aside>
                </div>
            </div>
        </>
    );
}

// Dos renglones en una celda: lo principal arriba y el detalle abajo
export function CeldaDoble({ arriba, abajo }: { arriba: ReactNode; abajo: ReactNode }) {
    return (
        <span className="at-celda-doble">
            <span>{arriba}</span>
            <small>{abajo}</small>
        </span>
    );
}

export default Bandeja;

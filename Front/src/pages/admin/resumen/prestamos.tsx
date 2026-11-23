// Resumen de Préstamos (22 nov 2026, T3): para la cuenta que atiende las solicitudes de credencial y el cotejo, el Resumen
// ya no usa pendientes de ejemplo. Muestra las solicitudes abiertas reales y los cotejos pendientes, primero lo que pide
// acción (solicitudes sin revisar, cotejos con diferencias) y después lo que lleva más tiempo esperando.
// Mismas piezas y estructura que el Resumen de Servicios Digitales (servicios.tsx).
import { useId, useState } from "react";
import { Cabecera, Chip, Enlace, Icono, Segmentado, type NombreIcono, type TonoEstado } from "../piezasPanel";
import { estadoTramite } from "../../../servicios/tramites";
import { iconoResultado, textoResultado } from "../participantes/cotejos";
import { RUTA_COTEJOS, RUTA_SOLICITUDES, cifrasPrestamos, type DatosPrestamos, type EstadoFuente } from "./datosPrestamos";

type Fila = { id: string; tipo: "solicitud" | "cotejo"; titulo: string; detalle: string; cuando: string; desde: string; chip: { texto: string; tono: TonoEstado }; urgente: boolean; ruta: string; icono: NombreIcono; accion: string };
type FiltroTipo = "todo" | "solicitud" | "cotejo";

function antiguedad(fecha: string, hoy = new Date()) {
    const [a, m, d] = fecha.slice(0, 10).split("-").map(Number);
    const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(a, m - 1, d).getTime()) / 86400000);
    return dias <= 0 ? "Llegó hoy" : dias === 1 ? "Llegó ayer" : `Hace ${dias} días`;
}
const cita = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: "America/Mazatlan", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function filasDe(d: DatosPrestamos): Fila[] {
    const solicitudes = d.credenciales.abiertas.map<Fila>((s) => {
        const estado = estadoTramite(s);
        const nombre = [s.perfil?.nombres, s.perfil?.primerApellido].filter(Boolean).join(" ") || "Sin nombre";
        const chip: Fila["chip"] = estado === "recibida" ? { texto: "Por atender", tono: "guinda" }
            : estado === "cita_programada" && s.fechaCita ? { texto: `Cita ${cita(s.fechaCita)}`, tono: "dorado" } : { texto: "En atención", tono: "dorado" };
        return {
            id: `s-${s.id}`, tipo: "solicitud", titulo: nombre, detalle: s.tipoSolicitud === "renovacion" ? "Renovación de credencial" : "Solicitud de credencial",
            cuando: antiguedad(s.creadaEn), desde: s.creadaEn, chip, urgente: estado === "recibida",
            ruta: `${RUTA_SOLICITUDES}/${s.id}`, icono: estado === "cita_programada" ? "calendario" : "credencial", accion: "Atender",
        };
    });
    const cotejos = d.cotejos.pendientes.map<Fila>((c) => {
        const r = textoResultado(c);
        return {
            id: `c-${c.folio}`, tipo: "cotejo", titulo: c.persona, detalle: `Cotejo ${c.folio}`, cuando: antiguedad(c.registro), desde: c.registro,
            chip: r, urgente: r.tono === "guinda", ruta: `${RUTA_COTEJOS}/${c.folio}`, icono: iconoResultado(c), accion: "Cotejar",
        };
    });
    // Primero lo que pide acción; dentro de cada grupo, lo más antiguo
    return [...solicitudes, ...cotejos].sort((a, b) => (a.urgente === b.urgente ? a.desde.localeCompare(b.desde) : a.urgente ? -1 : 1));
}

export function ListaPrestamos({ datos }: { datos: DatosPrestamos }) {
    const id = useId();
    const [tipo, setTipo] = useState<FiltroTipo>("todo");
    const filas = filasDe(datos);
    const visibles = filas.filter((f) => tipo === "todo" || f.tipo === tipo);
    const cargando = datos.credenciales.estado === "cargando";
    const veAmbos = datos.credenciales.estado !== "sin-permiso" && datos.cotejos.estado !== "sin-permiso";

    return (
        <section className="pz-tarjeta pz-pendientes" id="pendientes" aria-labelledby={`${id}-titulo`}>
            <Cabecera icono="lista" id={`${id}-titulo`} titulo="Por atender" texto="Primero lo que pide acción; después lo que lleva más tiempo esperando" />
            {veAmbos && filas.length > 0 && (
                <div className="pz-herramientas">
                    <Segmentado<FiltroTipo> etiqueta="Filtrar por tipo" valor={tipo} alCambiar={setTipo}
                        opciones={[
                            { valor: "todo", texto: "Todo", cantidad: filas.length },
                            { valor: "solicitud", texto: "Solicitudes", cantidad: filas.filter((f) => f.tipo === "solicitud").length },
                            { valor: "cotejo", texto: "Cotejos", cantidad: filas.filter((f) => f.tipo === "cotejo").length },
                        ]} />
                </div>
            )}
            {datos.credenciales.estado === "error" && <p className="pz-acciones__nota" role="alert">No se pudieron cargar las solicitudes. {datos.credenciales.error}</p>}

            {cargando && filas.length === 0 ? <p className="pz-acciones__nota" role="status">Cargando lo que tienes por atender…</p>
                : visibles.length === 0 ? (
                    <div className="pz-vacio">
                        <span className="pz-vacio__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                        <p className="pz-vacio__titulo">Estás al día</p>
                        <p>Cuando llegue una solicitud de credencial o un cotejo, aparecerá aquí.</p>
                    </div>
                ) : (
                    <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lo que tienes por atender">
                        <ul className="pz-filas">
                            {visibles.map((f) => (
                                <li key={f.id}>
                                    <article className={`pz-fila${f.urgente ? " pz-fila--guinda" : ""}`}>
                                        <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={f.icono} /></span>
                                        <div className="pz-fila__textos">
                                            <h4 className="pz-fila__titulo">{f.titulo}</h4>
                                            <p className="pz-fila__detalle"><span>{f.detalle}</span><span>{f.cuando}</span></p>
                                        </div>
                                        <Chip tono={f.chip.tono}>{f.chip.texto}</Chip>
                                        <Enlace ruta={f.ruta} className={`pz-boton pz-boton--chico${f.urgente ? "" : " pz-boton--contorno"}`}>
                                            {f.accion}<span className="solo-lectores"> {f.titulo}</span>
                                        </Enlace>
                                    </article>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            {datos.credenciales.estado === "listo" && cifrasPrestamos(datos).porAtender + cifrasPrestamos(datos).enProceso > datos.credenciales.abiertas.length && (
                <p className="pz-acciones__nota">Se muestran las solicitudes más recientes; el resto está en Solicitudes de credencial.</p>
            )}
        </section>
    );
}

// ---------- Lateral: Préstamos en cifras y para empezar ----------

export function TarjetaPrestamos({ datos }: { datos: DatosPrestamos }) {
    const c = cifrasPrestamos(datos);
    const [ahora] = useState(() => Date.now());
    // Las citas de cotejo que vienen (de la primera página de la bandeja), la más próxima primero
    const citas = datos.credenciales.abiertas
        .filter((s) => estadoTramite(s) === "cita_programada" && s.fechaCita && new Date(s.fechaCita).getTime() >= ahora - 3600000)
        .sort((a, b) => (a.fechaCita ?? "").localeCompare(b.fechaCita ?? "")).slice(0, 3);
    const valor = (estado: EstadoFuente, n: number) => (estado === "listo" ? n : estado === "cargando" ? "…" : "—");
    const cifras = [
        datos.credenciales.estado !== "sin-permiso" && { texto: "Solicitudes por atender", valor: valor(datos.credenciales.estado, c.porAtender), tono: "guinda" },
        datos.credenciales.estado !== "sin-permiso" && { texto: "Citas de cotejo", valor: valor(datos.credenciales.estado, c.conCita), tono: "dorado" },
        datos.cotejos.estado !== "sin-permiso" && { texto: "Cuentas por cotejar", valor: valor(datos.cotejos.estado, c.porCotejar), tono: "dorado" },
        datos.cotejos.estado !== "sin-permiso" && { texto: "Con diferencias", valor: valor(datos.cotejos.estado, c.diferencias), tono: "guinda" },
    ].filter(Boolean) as { texto: string; valor: number | string; tono: string }[];

    return (
        <section className="pz-tarjeta pz-tarjeta--actividades" aria-labelledby="rs-prestamos">
            <Cabecera icono="credencial" id="rs-prestamos" titulo="Préstamos" texto="Credenciales y cotejo" />
            <dl className="pz-mini-cifras">
                {cifras.map((x) => (
                    <div key={x.texto} className={`pz-mini-cifra pz-mini-cifra--${x.tono}`}>
                        <dt>{x.texto}</dt>
                        <dd>{x.valor}</dd>
                    </div>
                ))}
            </dl>
            {citas.length > 0 && (
                <>
                    <p className="pz-subtitulo">Próximas citas de cotejo</p>
                    {(
                        <ul className="pz-actividades">
                            {citas.map((s) => {
                                const f = new Date(s.fechaCita!);
                                return (
                                    <li key={s.id}>
                                        <span className="pz-actividades__hora"><strong>{f.getDate()}</strong><span>{f.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")}</span></span>
                                        <div className="pz-actividades__textos">
                                            <p className="pz-actividades__titulo">{[s.perfil?.nombres, s.perfil?.primerApellido].filter(Boolean).join(" ") || "Sin nombre"}</p>
                                            <p className="pz-actividades__detalle">{f.toLocaleTimeString("es-MX", { timeZone: "America/Mazatlan", hour: "numeric", minute: "2-digit" })} h, en Préstamos</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
            <div className="pz-acciones pz-acciones--pie">
                <Enlace ruta={RUTA_SOLICITUDES} className="pz-boton">Ver las solicitudes</Enlace>
                <Enlace ruta={RUTA_COTEJOS} className="pz-boton pz-boton--contorno">Cotejar credenciales</Enlace>
            </div>
        </section>
    );
}

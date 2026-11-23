// Resumen de Servicios Digitales (22 nov 2026): para la cuenta que atiende Contactos y Altas asistidas el Resumen ya no usa
// pendientes de ejemplo. Lee lo real: mensajes sin atender y en atención (/v1/admin/contacto) y solicitudes de alta abiertas
// (/cuentas/alta-asistida). No hay plazos oficiales para estos casos, así que la lista va por antigüedad: lo que lleva
// más tiempo esperando, primero. Si un servicio no responde, se dice en su lugar sin inventar cifras.
import { useId, useState } from "react";
import { Cabecera, Chip, Enlace, Icono, Segmentado, type NombreIcono, type TonoEstado } from "../piezasPanel";
import "./Servicios.css";
import { RUTA_ALTAS, RUTA_CONTACTOS, cifrasServicios, type DatosServicios, type EstadoFuente } from "./datosServicios";

// ---------- Lista: lo que espera, por antigüedad ----------

type Fila = { id: string; tipo: "mensaje" | "alta"; titulo: string; detalle: string; desde: string; chip: { texto: string; tono: TonoEstado }; urgente: boolean; ruta: string; icono: NombreIcono; accion: string };
type FiltroTipo = "todo" | "mensaje" | "alta";

function antiguedad(iso: string, hoy = new Date()) {
    const dia = (f: Date) => new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
    const dias = Math.round((dia(hoy) - dia(new Date(iso))) / 86400000);
    return dias <= 0 ? "Llegó hoy" : dias === 1 ? "Llegó ayer" : `Hace ${dias} días`;
}

function filasDe(d: DatosServicios): Fila[] {
    const mensajes = [...d.contactos.sinAtender, ...d.contactos.enAtencion].map<Fila>((c) => {
        const sinAtender = c.estadoAtencion === "recibido";
        return {
            id: `m-${c.id}`, tipo: "mensaje", titulo: c.nombreRemitente, detalle: /sugerencia/i.test(c.asunto) ? "Sugerencia" : "Contacto", desde: c.creadoEn,
            chip: sinAtender ? { texto: "Sin atender", tono: "guinda" } : { texto: "En atención", tono: "dorado" }, urgente: sinAtender,
            ruta: RUTA_CONTACTOS, icono: /sugerencia/i.test(c.asunto) ? "contenido" : "mensajes", accion: "Atender",
        };
    });
    const altas = d.altas.solicitudes.map<Fila>((s) => {
        const revision = s.estado === "en_revision";
        return {
            id: `a-${s.id}`, tipo: "alta", titulo: [s.nombres, s.primerApellido, s.segundoApellido].filter(Boolean).join(" "), detalle: "Alta asistida", desde: s.solicitadoEn,
            chip: revision ? { texto: "Posible duplicado", tono: "guinda" } : { texto: "Invitación pendiente", tono: "gris" }, urgente: revision,
            ruta: RUTA_ALTAS, icono: revision ? "alerta" : "cuentas", accion: revision ? "Decidir" : "Ver",
        };
    });
    // Primero lo que requiere acción; dentro de cada grupo, lo más antiguo
    return [...mensajes, ...altas].sort((a, b) => (a.urgente === b.urgente ? a.desde.localeCompare(b.desde) : a.urgente ? -1 : 1));
}

export function ListaServicios({ datos }: { datos: DatosServicios }) {
    const id = useId();
    const [tipo, setTipo] = useState<FiltroTipo>("todo");
    const filas = filasDe(datos);
    const visibles = filas.filter((f) => tipo === "todo" || f.tipo === tipo);
    const cargando = datos.contactos.estado === "cargando" || datos.altas.estado === "cargando";
    const veAmbos = datos.contactos.estado !== "sin-permiso" && datos.altas.estado !== "sin-permiso";
    const problemas = [
        datos.contactos.estado === "error" && `Mensajes: ${datos.contactos.error}`,
        datos.altas.estado === "error" && `Altas: ${datos.altas.error}`,
    ].filter(Boolean) as string[];
    // Ninguna fuente respondió: no se puede decir «Estás al día»
    const sinDatos = !cargando && filas.length === 0 && ![datos.contactos.estado, datos.altas.estado].includes("listo");

    return (
        <section className="pz-tarjeta pz-pendientes" id="pendientes" aria-labelledby={`${id}-titulo`}>
            <Cabecera icono="lista" id={`${id}-titulo`} titulo="Por atender" texto="Primero lo que requiere acción; después lo que lleva más tiempo esperando" />
            {veAmbos && filas.length > 0 && (
                <div className="pz-herramientas">
                    <Segmentado<FiltroTipo> etiqueta="Filtrar por tipo" valor={tipo} alCambiar={setTipo}
                        opciones={[
                            { valor: "todo", texto: "Todo", cantidad: filas.length },
                            { valor: "mensaje", texto: "Mensajes", cantidad: filas.filter((f) => f.tipo === "mensaje").length },
                            { valor: "alta", texto: "Altas", cantidad: filas.filter((f) => f.tipo === "alta").length },
                        ]} />
                </div>
            )}
            {!sinDatos && problemas.map((p) => <p key={p} className="pz-acciones__nota" role="alert">No se pudo cargar. {p}</p>)}

            {cargando && filas.length === 0 ? <p className="pz-acciones__nota rs-vacio-centro" role="status">Cargando lo que tienes por atender…</p>
                : sinDatos ? (
                    <div className="pz-vacio rs-vacio-centro" role="alert">
                        <span className="pz-vacio__insignia" aria-hidden="true"><Icono nombre="alerta" /></span>
                        <p className="pz-vacio__titulo">No pudimos revisar tus pendientes</p>
                        <p>{datos.altas.estado === "apagado" ? "Los mensajes no respondieron y el alta asistida todavía no está habilitada en el servidor." : "Los servicios no respondieron. Inténtalo de nuevo en unos minutos."}</p>
                    </div>
                )
                : visibles.length === 0 ? (
                    <div className="pz-vacio rs-vacio-centro">
                        <span className="pz-vacio__insignia" aria-hidden="true"><Icono nombre="check" /></span>
                        <p className="pz-vacio__titulo">Estás al día</p>
                        <p>Cuando llegue un mensaje o una solicitud de alta, aparecerá aquí.</p>
                    </div>
                ) : (
                    <div className="pz-grupos" tabIndex={0} role="region" aria-label="Lo que tienes por atender">
                        <ul className="pz-filas">
                            {visibles.map((f) => (
                                <li key={f.id}>
                                    <article className={`pz-fila pz-fila--pendiente${f.urgente ? " pz-fila--guinda" : ""}`}>
                                        <span className="pz-fila__icono" aria-hidden="true"><Icono nombre={f.icono} /></span>
                                        <div className="pz-fila__textos">
                                            <h4 className="pz-fila__titulo">{f.titulo}</h4>
                                            <p className="pz-fila__detalle"><span>{f.detalle}</span><span>{antiguedad(f.desde)}</span></p>
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
            {datos.contactos.estado === "listo" && datos.contactos.totalSinAtender + datos.contactos.totalEnAtencion > datos.contactos.sinAtender.length + datos.contactos.enAtencion.length && (
                <p className="pz-acciones__nota">Se muestran los mensajes más recientes; el resto está en Contactos y sugerencias.</p>
            )}
        </section>
    );
}

// ---------- Lateral: Servicios Digitales en cifras y para empezar ----------

export function TarjetaServicios({ datos }: { datos: DatosServicios }) {
    const c = cifrasServicios(datos);
    const valor = (estado: EstadoFuente, n: number) => (estado === "listo" ? n : estado === "cargando" ? "…" : "—");
    const cifras = [
        datos.contactos.estado !== "sin-permiso" && { texto: "Sin atender", valor: valor(datos.contactos.estado, c.sinAtender), tono: "guinda" },
        datos.contactos.estado !== "sin-permiso" && { texto: "En atención", valor: valor(datos.contactos.estado, c.enAtencion), tono: "dorado" },
        datos.altas.estado !== "sin-permiso" && { texto: "Altas por decidir", valor: valor(datos.altas.estado, c.altasRevision), tono: "guinda" },
        datos.altas.estado !== "sin-permiso" && { texto: "Esperan a la persona", valor: valor(datos.altas.estado, c.altasEsperando), tono: "gris" },
    ].filter(Boolean) as { texto: string; valor: number | string; tono: string }[];

    return (
        <section className="pz-tarjeta pz-tarjeta--actividades" aria-labelledby="rs-servicios">
            <Cabecera icono="mensajes" id="rs-servicios" titulo="Servicios Digitales" texto="Lo que tienes abierto" />
            <dl className="pz-mini-cifras">
                {cifras.map((x) => (
                    <div key={x.texto} className={`pz-mini-cifra pz-mini-cifra--${x.tono}`}>
                        <dt>{x.texto}</dt>
                        <dd>{x.valor}</dd>
                    </div>
                ))}
            </dl>
            <div className="pz-acciones pz-acciones--pie">
                <Enlace ruta={RUTA_ALTAS} className="pz-boton">Registrar un alta asistida</Enlace>
                <Enlace ruta="/admin/atencion/recuperacion" className="pz-boton pz-boton--contorno">Recuperar el acceso de alguien</Enlace>
                <p className="pz-acciones__nota">Nunca escribas ni conozcas la contraseña de otra persona.</p>
            </div>
        </section>
    );
}

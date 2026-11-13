import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { BotonOpcion, Chip, Dato, Datos, ListaCotejo, Tarjeta, type EventoHistorial } from "../../componentes";
import { Ventana, VentanaFormulario } from "../../Ventana";
import DetalleSolicitud, { TarjetaDecision, TarjetaResolucion, type TextosEstado } from "../Detalle";
import { formatearFecha, type Nota } from "../datos";
import { mensajeError } from "../../../../servicios/api";
import {
    aprobarEspacio, cancelarEspacioAprobado, detalleEspacio, diaLocal, horarioLocal, listarAreas, proponerEspacio,
    rechazarEspacio, type AreaEspacio, type SolicitudEspacioPersonal,
} from "../../../../servicios/espacios";
import { aSolicitudAdmin, vigente } from "./mapeo";
import tarjetaCalendario from "../../../../assets/admin/tarjeta-calendar.svg";
import tarjetaCheck from "../../../../assets/admin/tarjeta-check.svg";
import tarjetaLista from "../../../../assets/admin/bandeja-list.svg";
import chipCheck from "../../../../assets/admin/chip-check.svg";
import chipInfo from "../../../../assets/admin/chip-info.svg";
import opcionLista from "../../../../assets/admin/opcion-list.svg";
import opcionBuscar from "../../../../assets/admin/opcion-search.svg";
import opcionCalendario from "../../../../assets/admin/opcion-calendar.svg";
import opcionX from "../../../../assets/admin/opcion-x.svg";
import modalCheck from "../../../../assets/admin/modal-check.svg";
import modalLista from "../../../../assets/admin/modal-list.svg";
import modalInfo from "../../../../assets/admin/modal-info.svg";
import modalCalendario from "../../../../assets/admin/modal-calendar.svg";
import modalAlerta from "../../../../assets/admin/modal-alert.svg";

// Panel › Atención › Espacios › detalle de una solicitud (T-076).
// Datos y decisiones: /espacios/atencion/solicitudes/{folio} (Back/espacios.py). La BD no deja
// aprobar dos solicitudes en el mismo horario y guarda quién tomó cada decisión.
const RUTA = "/admin/atencion/espacios";

const textos: TextosEstado = {
    pendiente: {
        etiqueta: "POR REVISAR",
        titulo: "Revisión de la solicitud",
        texto: "Verifica que el área esté libre y decide la solicitud.",
    },
    observaciones: {
        etiqueta: "CAMBIO PROPUESTO",
        titulo: "Esperando respuesta de la persona",
        texto: "Propusiste un cambio de espacio, fecha u horario. Cuando la persona responda, la solicitud vuelve a revisión.",
        aviso: {
            tono: "espera",
            titulo: "Cambio propuesto",
            texto: "La persona recibió tu propuesta en sus notificaciones.",
            chip: "Esperando respuesta",
        },
    },
    aprobada: {
        etiqueta: "APROBADA",
        titulo: "Solicitud aprobada",
        texto: "El espacio quedó apartado para la persona. Puedes reprogramarla o cancelarla; ella recibe un aviso.",
        aviso: {
            tono: "exito",
            titulo: "Solicitud aprobada",
            texto: "El espacio quedó apartado y la persona ya fue notificada.",
            chip: "Aprobada",
        },
    },
    rechazada: {
        etiqueta: "RECHAZADA",
        titulo: "Solicitud rechazada",
        texto: "La solicitud no se aprobó. Aquí puedes consultar el motivo y el historial.",
        aviso: {
            tono: "error",
            titulo: "Solicitud rechazada",
            texto: "La persona ya recibió el motivo en sus notificaciones.",
            chip: "Rechazada",
        },
    },
};

// Si se canceló la solicitud (la persona o el personal), cambian los textos
const textosCancelada: TextosEstado["rechazada"] = {
    etiqueta: "CANCELADA",
    titulo: "Solicitud cancelada",
    texto: "El espacio quedó libre. Aquí puedes consultar el motivo y el historial.",
    aviso: {
        tono: "error",
        titulo: "Solicitud cancelada",
        texto: "La solicitud ya no está activa.",
        chip: "Cancelada",
    },
};

const NOMBRE_ACCION: Record<string, string> = {
    envio: "Solicitud enviada",
    alternativa: "Cambio propuesto",
    aprobacion: "Solicitud aprobada",
    rechazo: "Solicitud rechazada",
    cancelacion: "Solicitud cancelada",
    observaciones: "Observaciones",
};

function historial(s: SolicitudEspacioPersonal): EventoHistorial[] {
    const eventos: EventoHistorial[] = (s.historial ?? []).map((h) => {
        const titulo = h.accion === "respuesta"
            ? (h.detalles?.acepta ? "La persona aceptó el cambio" : "La persona pidió otra opción")
            : NOMBRE_ACCION[h.accion] ?? h.accion;
        const partes = [formatearFecha(diaLocal(h.fecha)), h.realizadoPor ? `por ${h.realizadoPor}` : "", h.nota ?? ""].filter(Boolean);
        return { titulo, detalle: partes.join(" · "), tipo: "hecho" };
    });
    if (s.estado === "en_revision") eventos.push({ titulo: "Decisión del personal", detalle: "Pendiente", tipo: "proceso" });
    if (s.estado === "requiere_correccion") eventos.push({ titulo: "Respuesta de la persona", detalle: "En espera", tipo: "proceso" });
    return eventos;
}

// "Ana Pérez" si la canceló o rechazó alguien del personal; "La persona" si la canceló ella
function quienDecidio(s: SolicitudEspacioPersonal) {
    const ultima = [...(s.historial ?? [])].reverse().find((h) => h.accion === "aprobacion" || h.accion === "rechazo" || h.accion === "cancelacion");
    if (!ultima?.realizadoPor) return "Personal de la biblioteca";
    return ultima.realizadoPor === s.solicitante.nombre && ultima.accion === "cancelacion" ? `${ultima.realizadoPor} (la persona)` : ultima.realizadoPor;
}

type VentanaAbierta = "aprobar" | "condiciones" | "espacio" | "fecha" | "rechazar" | "cancelar" | null;
type Carga = { solicitud: SolicitudEspacioPersonal } | { error: string } | null;

function DetalleEspacio() {
    const { folio = "" } = useParams();
    const [carga, setCarga] = useState<Carga>(null);
    const [intento, setIntento] = useState(0);
    const [areas, setAreas] = useState<AreaEspacio[]>([]);
    const [ventana, setVentana] = useState<VentanaAbierta>(null);
    const [cotejo, setCotejo] = useState([false, false, false, false]);
    const [notas, setNotas] = useState<Nota[]>([]);
    const [errorVentana, setErrorVentana] = useState("");
    const [guardando, setGuardando] = useState(false);
    const bloqueo = useRef(false);

    useEffect(() => {
        let vigenteEfecto = true;
        detalleEspacio(folio)
            .then((solicitud) => { if (vigenteEfecto) setCarga({ solicitud }); })
            .catch((e) => { if (vigenteEfecto) setCarga({ error: mensajeError(e) }); });
        return () => { vigenteEfecto = false; };
    }, [folio, intento]);

    useEffect(() => {
        listarAreas().then(setAreas).catch(() => setAreas([]));
    }, []);

    if (!carga || "error" in carga) {
        return (
            <PanelLayout titulo="Atención" tema="contenidos">
                {!carga ? <p role="status">Cargando la solicitud {folio}…</p> : (
                    <p role="alert">
                        {carga.error}{" "}
                        <button type="button" className="contenidos-boton contenidos-boton--contorno contenidos-boton--chico"
                            onClick={() => { setCarga(null); setIntento((x) => x + 1); }}>Reintentar</button>
                    </p>
                )}
            </PanelLayout>
        );
    }

    const api = carga.solicitud;
    const solicitud = { ...aSolicitudAdmin(api), cotejo, notas };
    const { estado, resolucion } = solicitud;
    const actual = vigente(api);
    const areaActual = areas.find((a) => a.slug === actual.espacio?.slug);
    const ocupacion = api.ocupacion ?? [];
    const sinFecha = !solicitud.fecha;
    const cerrada = api.estado === "rechazada" || api.estado === "cancelada";
    const aforoExcedido = !!areaActual?.capacidad && api.personas > areaActual.capacidad;

    const puntos = [
        {
            titulo: "El área está libre en esa fecha y horario",
            detalle: ocupacion.length ? `Choca con ${ocupacion.length} ${ocupacion.length === 1 ? "registro" : "registros"} de la agenda.` : "Sin empalme con solicitudes aprobadas ni actividades programadas.",
            alerta: ocupacion.length > 0,
        },
        {
            titulo: "El aforo alcanza para las personas indicadas",
            detalle: areaActual?.capacidad ? `${api.personas} de ${areaActual.capacidad} personas.` : undefined,
            alerta: aforoExcedido,
        },
        { titulo: "No coincide con un evento institucional", detalle: "Confírmalo con la agenda de la biblioteca." },
        { titulo: "La persona tiene cuenta activa", detalle: "El portal solo recibe solicitudes de cuentas activas." },
    ];

    // Ejecuta una decisión en el backend y recarga el detalle (con la ocupación actualizada)
    async function decidir(accion: () => Promise<unknown>) {
        if (bloqueo.current) return;
        bloqueo.current = true;
        setGuardando(true);
        setErrorVentana("");
        try {
            await accion();
            setVentana(null);
            setCarga(null);
            setIntento((x) => x + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e) {
            setErrorVentana(mensajeError(e));
        } finally {
            bloqueo.current = false;
            setGuardando(false);
        }
    }

    function abrir(nueva: VentanaAbierta) {
        setErrorVentana("");
        setVentana(nueva);
    }

    function aprobar(condiciones?: string, mensaje?: string) {
        if (!cotejo.every(Boolean)) {
            setErrorVentana("Marca todos los puntos de disponibilidad antes de aprobar.");
            return;
        }
        decidir(() => aprobarEspacio(api.folio, api.actualizadoEn, cotejo, condiciones, mensaje));
    }

    function marcar(indice: number) {
        setCotejo((anterior) => anterior.map((valor, i) => (i === indice ? !valor : valor)));
    }

    const principal = (
        <>
            <Tarjeta icono={tarjetaCalendario} titulo="Datos de la solicitud" subtitulo="Lo que escribió la persona al pedir el espacio.">
                <Datos>
                    <Dato etiqueta="TIPO">{api.tipo === "visita" ? "Visita guiada" : "Uso de un área"}</Dato>
                    <Dato etiqueta="ÁREA SOLICITADA">{api.espacio?.nombre ?? "Sin área"}</Dato>
                    <Dato etiqueta="FECHA">{formatearFecha(diaLocal(api.inicio))}</Dato>
                    <Dato etiqueta="HORARIO">{horarioLocal(api.inicio, api.fin) || "Por confirmar"}</Dato>
                    <Dato etiqueta="PERSONAS">{api.personas}</Dato>
                    <Dato etiqueta="MOTIVO">{api.motivo}</Dato>
                    {api.institucion && <Dato etiqueta="INSTITUCIÓN">{api.institucion}</Dato>}
                    <Dato etiqueta="FOLIO">{api.folio}</Dato>
                    <Dato etiqueta="PERSONA SOLICITANTE">{solicitud.persona}</Dato>
                    <Dato etiqueta="CONTACTO">{solicitud.contacto}</Dato>
                    <Dato etiqueta="ENVIADA">{formatearFecha(solicitud.enviada)}</Dato>
                    {api.acuerdo && (
                        <Dato etiqueta={estado === "aprobada" ? "LO APROBADO" : "LO ACORDADO CON LA PERSONA"}>
                            {`${api.acuerdo.espacio?.nombre ?? "Sin área"} · ${formatearFecha(diaLocal(api.acuerdo.inicio))} · ${horarioLocal(api.acuerdo.inicio, api.acuerdo.fin)}`}
                        </Dato>
                    )}
                    {api.propuesta && (
                        <Dato etiqueta="CAMBIO PROPUESTO">
                            {`${api.propuesta.espacio?.nombre ?? "Sin área"} · ${formatearFecha(diaLocal(api.propuesta.inicio))} · ${horarioLocal(api.propuesta.inicio, api.propuesta.fin)}`}
                        </Dato>
                    )}
                    {estado === "aprobada" && resolucion?.condiciones && (
                        <Dato etiqueta="CONDICIONES DE USO">{resolucion.condiciones}</Dato>
                    )}
                </Datos>
            </Tarjeta>

            <Tarjeta
                icono={tarjetaCheck}
                tonoIcono="dorado"
                titulo="Disponibilidad del área"
                subtitulo={api.estado === "en_revision" ? "Marca cada punto después de revisarlo; se guardan al aprobar." : "Revisa la agenda de espacios antes de decidir."}
            >
                <ListaCotejo
                    puntos={puntos}
                    marcados={api.estado === "aprobada" ? puntos.map(() => true) : cotejo}
                    alCambiar={api.estado === "en_revision" ? marcar : undefined}
                />
                <div className="fila-agenda">
                    {sinFecha ? (
                        <Chip tono="dorado" icono={chipInfo}>Sin fecha para comparar</Chip>
                    ) : ocupacion.length ? (
                        <Chip tono="guinda" icono={chipInfo}>{`${ocupacion.length} ${ocupacion.length === 1 ? "choque" : "choques"} con la agenda`}</Chip>
                    ) : (
                        <Chip tono="verde" icono={chipCheck}>Sin choques con la agenda</Chip>
                    )}
                </div>
            </Tarjeta>

            <Tarjeta icono={tarjetaLista} titulo="Agenda del área en ese horario" subtitulo="Solicitudes aprobadas y actividades programadas que se empalman.">
                {sinFecha ? (
                    <p className="texto-tarjeta">La solicitud no tiene fecha ni horario. Propón uno para poder revisar la agenda del área.</p>
                ) : (
                    <div className="tabla" role="table">
                        <div className="tabla__fila tabla__fila--encabezado" role="row">
                            <span role="columnheader" style={{ width: 170 }}>HORARIO</span>
                            <span role="columnheader" style={{ flex: 1 }}>ACTIVIDAD</span>
                            <span role="columnheader" style={{ width: 170 }}>ESTADO</span>
                        </div>
                        {ocupacion.map((o) => (
                            <div key={`${o.tipo}-${o.folio ?? o.titulo}-${o.inicio}`} className="tabla__fila" role="row">
                                <span role="cell" className="tabla__fuerte" style={{ width: 170 }}>{horarioLocal(o.inicio, o.fin)}</span>
                                <span role="cell" className="tabla__fuerte" style={{ flex: 1 }}>{o.tipo === "solicitud" ? `Solicitud ${o.folio}` : o.titulo}</span>
                                <span role="cell" style={{ width: 170 }}><Chip tono="gris">Ocupado</Chip></span>
                            </div>
                        ))}
                        <div className="tabla__fila" role="row">
                            <span role="cell" className="tabla__fuerte" style={{ width: 170 }}>{solicitud.horario}</span>
                            <span role="cell" className="tabla__fuerte" style={{ flex: 1 }}>Esta solicitud ({api.folio})</span>
                            <span role="cell" style={{ width: 170 }}>
                                {estado === "aprobada" ? <Chip tono="verde">Apartado</Chip> : cerrada ? <Chip tono="gris">Liberado</Chip> : <Chip tono="dorado">En revisión</Chip>}
                            </span>
                        </div>
                    </div>
                )}
            </Tarjeta>
        </>
    );

    const rechazar = (
        <BotonOpcion icono={opcionX} peligro alPresionar={() => abrir("rechazar")}>
            Rechazar solicitud
        </BotonOpcion>
    );

    let decision;
    if (cerrada) {
        decision = <TarjetaResolucion estado={estado} resolucion={resolucion} rutaBandeja={RUTA} decidio={quienDecidio(api)} />;
    } else if (estado === "aprobada") {
        decision = (
            <TarjetaDecision
                titulo="Gestionar solicitud"
                subtitulo={`Aprobada por ${api.autorizadoPor ?? "el personal"}. Cambios sobre una solicitud ya aprobada.`}
                opciones={
                    <BotonOpcion icono={opcionCalendario} alPresionar={() => abrir("fecha")}>
                        Reprogramar
                    </BotonOpcion>
                }
                peligro={
                    <BotonOpcion icono={opcionX} peligro alPresionar={() => abrir("cancelar")}>
                        Cancelar solicitud aprobada
                    </BotonOpcion>
                }
                nota="La persona recibe un aviso con el cambio o la cancelación."
            />
        );
    } else if (estado === "observaciones") {
        decision = (
            <TarjetaDecision
                titulo="Esperando respuesta"
                subtitulo="La persona debe aceptar o rechazar el cambio. Si ya no procede, puedes rechazar la solicitud."
                peligro={rechazar}
                nota="Cuando la persona responda, la solicitud vuelve a «Por revisar»."
            />
        );
    } else {
        decision = (
            <TarjetaDecision
                subtitulo="Elige una acción para esta solicitud."
                aprobar={{ texto: "Aprobar solicitud", alPresionar: () => abrir("aprobar") }}
                opciones={
                    <>
                        <BotonOpcion icono={opcionLista} alPresionar={() => abrir("condiciones")}>
                            Aprobar con condiciones
                        </BotonOpcion>
                        <BotonOpcion icono={opcionBuscar} alPresionar={() => abrir("espacio")}>
                            Sugerir otro espacio
                        </BotonOpcion>
                        <BotonOpcion icono={opcionCalendario} alPresionar={() => abrir("fecha")}>
                            Proponer otra fecha u horario
                        </BotonOpcion>
                    </>
                }
                peligro={rechazar}
                nota="La persona recibe el resultado en sus notificaciones."
            />
        );
    }

    const cerrar = () => setVentana(null);
    const comunes = { error: errorVentana, ocupada: guardando, alCerrar: cerrar };
    const otrasAreas = areas.filter((a) => a.slug !== actual.espacio?.slug);

    return (
        <PanelLayout titulo="Atención" tema="contenidos">
            <DetalleSolicitud
                area="espacios"
                solicitud={solicitud}
                textos={resolucion?.cancelada ? { ...textos, rechazada: textosCancelada } : textos}
                prefijo="SOLICITUD"
                volver={{ texto: "Volver a solicitudes de espacios", ruta: RUTA }}
                historial={historial(api)}
                principal={principal}
                decision={decision}
                // TODO backend: las notas internas todavía no se guardan (solo duran mientras la página está abierta)
                alGuardarNota={(nota) => setNotas((anteriores) => [...anteriores, nota])}
            />

            {ventana === "aprobar" && (
                <Ventana
                    {...comunes}
                    tono="verde"
                    icono={modalCheck}
                    titulo="¿Aprobar esta solicitud?"
                    texto="Se apartará el espacio para la persona y recibirá un aviso en sus notificaciones."
                    textoConfirmar={guardando ? "Aprobando…" : "Sí, aprobar solicitud"}
                    textoCancelar="Revisar de nuevo"
                    angosta
                    alConfirmar={() => aprobar()}
                />
            )}

            {ventana === "condiciones" && (
                <VentanaFormulario
                    {...comunes}
                    tono="dorado"
                    icono={modalLista}
                    titulo="Aprobar con condiciones"
                    texto="La solicitud se aprueba y la persona verá las condiciones junto con la aprobación."
                    textoConfirmar={guardando ? "Aprobando…" : "Aprobar con condiciones"}
                    campos={[
                        { nombre: "condiciones", etiqueta: "Condiciones de uso", obligatorio: true, placeholder: "Escribe las condiciones" },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", placeholder: "Mensaje opcional" },
                    ]}
                    preparados={["Respetar el cupo máximo del área", "Avisar cualquier cambio con anticipación"]}
                    campoPreparados="condiciones"
                    alConfirmar={(valores) => aprobar(valores.condiciones, valores.mensaje)}
                />
            )}

            {ventana === "espacio" && (
                <VentanaFormulario
                    {...comunes}
                    tono="dorado"
                    icono={modalInfo}
                    titulo="Sugerir otro espacio"
                    texto="La persona recibirá tu sugerencia y podrá aceptarla o pedir otra opción. Si dejas la fecha y el horario vacíos, se conservan los de la solicitud."
                    textoConfirmar={guardando ? "Enviando…" : "Enviar sugerencia"}
                    campos={[
                        {
                            nombre: "espacio",
                            etiqueta: "Espacio sugerido",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un área",
                            opciones: otrasAreas.map((a) => a.nombre),
                        },
                        { nombre: "fecha", etiqueta: "Fecha (opcional)", tipo: "fecha" },
                        { nombre: "horaInicio", etiqueta: "Hora de inicio (opcional)", tipo: "hora", mitad: true },
                        { nombre: "horaFin", etiqueta: "Hora de término (opcional)", tipo: "hora", mitad: true },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Explica por qué sugieres este espacio",
                        },
                    ]}
                    preparados={["El espacio pedido no está disponible", "El aforo no alcanza"]}
                    alConfirmar={(valores) => {
                        const area = otrasAreas.find((a) => a.nombre === valores.espacio);
                        decidir(() => proponerEspacio(api.folio, api.actualizadoEn, {
                            areaId: area?.slug, fecha: valores.fecha || undefined, horaInicio: valores.horaInicio || undefined,
                            horaFin: valores.horaFin || undefined, mensaje: valores.mensaje.trim(),
                        }));
                    }}
                />
            )}

            {ventana === "fecha" && (
                <VentanaFormulario
                    {...comunes}
                    tono="dorado"
                    icono={modalCalendario}
                    titulo={estado === "aprobada" ? "Reprogramar solicitud" : "Proponer otra fecha u horario"}
                    texto="La persona recibirá tu propuesta y podrá aceptarla o pedir otra opción."
                    textoConfirmar={guardando ? "Enviando…" : "Enviar propuesta"}
                    campos={[
                        { nombre: "fecha", etiqueta: "Fecha propuesta", tipo: "fecha", obligatorio: true },
                        { nombre: "horaInicio", etiqueta: "Hora de inicio", tipo: "hora", obligatorio: true, mitad: true },
                        { nombre: "horaFin", etiqueta: "Hora de término", tipo: "hora", obligatorio: true, mitad: true },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", obligatorio: true, placeholder: "Explica el motivo del cambio" },
                    ]}
                    preparados={["Ese horario ya está ocupado", "Hay un evento institucional ese día"]}
                    alConfirmar={(valores) =>
                        decidir(() => proponerEspacio(api.folio, api.actualizadoEn, {
                            fecha: valores.fecha, horaInicio: valores.horaInicio, horaFin: valores.horaFin, mensaje: valores.mensaje.trim(),
                        }))
                    }
                />
            )}

            {ventana === "rechazar" && (
                <VentanaFormulario
                    {...comunes}
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="Rechazar solicitud"
                    texto="Explica el motivo. La persona lo verá en sus notificaciones y podrá enviar una nueva solicitud."
                    textoConfirmar={guardando ? "Rechazando…" : "Sí, rechazar solicitud"}
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "Motivo del rechazo",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un motivo",
                            opciones: ["El área no está disponible", "El aforo no alcanza", "El uso no corresponde al espacio", "Otro motivo"],
                        },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Escribe una explicación breve y clara",
                            ayuda: "Evita incluir datos personales de terceros.",
                        },
                    ]}
                    alConfirmar={(valores) => decidir(() => rechazarEspacio(api.folio, api.actualizadoEn, valores.motivo, valores.mensaje))}
                />
            )}

            {ventana === "cancelar" && (
                <VentanaFormulario
                    {...comunes}
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="¿Cancelar la solicitud aprobada?"
                    texto="El espacio quedará libre y la persona recibirá el motivo en sus notificaciones."
                    textoConfirmar={guardando ? "Cancelando…" : "Sí, cancelar solicitud"}
                    textoCancelar="Conservar solicitud"
                    campos={[
                        {
                            nombre: "motivo",
                            etiqueta: "Motivo de la cancelación",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un motivo",
                            opciones: ["El espacio no estará disponible", "Cambio en la agenda de la biblioteca", "Otro motivo"],
                        },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", obligatorio: true, placeholder: "Explica el motivo" },
                    ]}
                    preparados={["El espacio no estará disponible", "Cambio en la agenda de la biblioteca"]}
                    alConfirmar={(valores) => decidir(() => cancelarEspacioAprobado(api.folio, api.actualizadoEn, valores.motivo, valores.mensaje))}
                />
            )}
        </PanelLayout>
    );
}

export default DetalleEspacio;

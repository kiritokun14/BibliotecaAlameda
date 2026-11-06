import { useState } from "react";
import { Navigate, useParams } from "react-router";
import PanelLayout from "../../PanelLayout";
import { BotonOpcion, Chip, Dato, Datos, ListaCotejo, Tarjeta, type EventoHistorial } from "../../componentes";
import { Ventana, VentanaFormulario } from "../../Ventana";
import DetalleSolicitud, { TarjetaDecision, TarjetaResolucion, type TextosEstado } from "../Detalle";
import { actualizarSolicitud, formatearFecha, useSolicitudes, type SolicitudEspacio } from "../datos";
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

const RUTA = "/admin/atencion/espacios";

// Áreas de ejemplo; la lista real la confirma la biblioteca
const AREAS = [
    "Área de usos múltiples (por confirmar)",
    "Sala de lectura (por confirmar)",
    "Sala infantil (por confirmar)",
];

const textos: TextosEstado = {
    pendiente: {
        etiqueta: "POR REVISAR",
        titulo: "Revisión de la solicitud",
        texto: "Verifica que el área esté libre y decide la solicitud. Datos de ejemplo.",
    },
    observaciones: {
        etiqueta: "CAMBIO PROPUESTO",
        titulo: "Esperando respuesta de la persona",
        texto: "Propusiste un cambio de espacio, fecha u horario. Cuando la persona responda, podrás aprobar o ajustar. Datos de ejemplo.",
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
        texto: "La solicitud no se aprobó. Aquí puedes consultar el motivo y el historial. Datos de ejemplo.",
        aviso: {
            tono: "error",
            titulo: "Solicitud rechazada",
            texto: "La persona ya recibió el motivo en sus notificaciones.",
            chip: "Rechazada",
        },
    },
};

// Si se canceló una solicitud que ya estaba aprobada, cambian los textos
const textosCancelada: TextosEstado["rechazada"] = {
    etiqueta: "CANCELADA",
    titulo: "Solicitud cancelada",
    texto: "El espacio quedó libre. Aquí puedes consultar el motivo y el historial. Datos de ejemplo.",
    aviso: {
        tono: "error",
        titulo: "Solicitud cancelada",
        texto: "La persona ya recibió el motivo en sus notificaciones.",
        chip: "Cancelada",
    },
};

const PUNTOS_DISPONIBILIDAD = [
    { titulo: "El área está libre en esa fecha y horario", detalle: "Sin empalme con la agenda (ejemplo)." },
    { titulo: "El aforo alcanza para las personas indicadas" },
    { titulo: "No coincide con un evento institucional", detalle: "Pendiente de confirmar con la agenda." },
    { titulo: "La persona tiene cuenta activa" },
];

function historial(solicitud: SolicitudEspacio): EventoHistorial[] {
    const enviada: EventoHistorial = {
        titulo: "Solicitud enviada",
        detalle: `${formatearFecha(solicitud.enviada)} · por la persona`,
        tipo: "hecho",
    };
    const revision: EventoHistorial = {
        titulo: "En revisión por el personal",
        detalle: "6 nov 2026 · se verifica disponibilidad",
        tipo: "proceso",
    };
    const fecha = solicitud.resolucion?.fecha ?? "Hoy";

    switch (solicitud.estado) {
        case "pendiente":
            return [enviada, revision, { titulo: "Decisión del administrador", detalle: "Pendiente", tipo: "pendiente" }];
        case "observaciones":
            return [
                enviada,
                {
                    titulo: "Cambio propuesto",
                    detalle: `${fecha} · ${solicitud.resolucion?.motivo ?? "otro horario (ejemplo)"}`,
                    tipo: "proceso",
                },
                { titulo: "Respuesta de la persona", detalle: "En espera", tipo: "pendiente" },
            ];
        case "aprobada":
            return [enviada, revision, { titulo: "Solicitud aprobada", detalle: `${fecha} · por el administrador (ejemplo)`, tipo: "pendiente" }];
        case "rechazada":
            return [
                enviada,
                revision,
                {
                    titulo: solicitud.resolucion?.cancelada ? "Solicitud cancelada" : "Solicitud rechazada",
                    detalle: `${fecha} · por el administrador (ejemplo)`,
                    tipo: "pendiente",
                },
            ];
    }
}

type VentanaAbierta = "aprobar" | "condiciones" | "espacio" | "fecha" | "rechazar" | "cancelar" | null;

function DetalleEspacio() {
    const { folio } = useParams();
    const solicitudes = useSolicitudes("espacios");
    const solicitud = solicitudes.find((s) => s.folio === folio);
    const [ventana, setVentana] = useState<VentanaAbierta>(null);

    if (!solicitud) return <Navigate to={RUTA} replace />;

    const { estado, resolucion } = solicitud;
    const sinFecha = !solicitud.fecha;

    function decidir(cambios: Partial<SolicitudEspacio>) {
        actualizarSolicitud("espacios", solicitud!.folio, cambios);
        setVentana(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function marcar(indice: number) {
        const cotejo = solicitud!.cotejo.map((valor, i) => (i === indice ? !valor : valor));
        actualizarSolicitud("espacios", solicitud!.folio, { cotejo });
    }

    const principal = (
        <>
            <Tarjeta icono={tarjetaCalendario} titulo="Datos de la solicitud" subtitulo="Lo que escribió la persona al pedir el espacio.">
                <Datos>
                    <Dato etiqueta="ÁREA SOLICITADA">{solicitud.area}</Dato>
                    <Dato etiqueta="FECHA">{formatearFecha(solicitud.fecha)}</Dato>
                    <Dato etiqueta="HORARIO">{solicitud.horario || "Por confirmar"}</Dato>
                    <Dato etiqueta="PERSONAS">{solicitud.personas}</Dato>
                    <Dato etiqueta="MOTIVO">{solicitud.motivo}</Dato>
                    <Dato etiqueta="FOLIO">{solicitud.folio}</Dato>
                    <Dato etiqueta="PERSONA SOLICITANTE">{solicitud.persona} (ejemplo)</Dato>
                    <Dato etiqueta="CONTACTO">{solicitud.contacto}</Dato>
                    <Dato etiqueta="ENVIADA">{formatearFecha(solicitud.enviada)}</Dato>
                    {estado === "aprobada" && resolucion?.condiciones && (
                        <Dato etiqueta="CONDICIONES DE USO">{resolucion.condiciones}</Dato>
                    )}
                </Datos>
            </Tarjeta>

            <Tarjeta
                icono={tarjetaCheck}
                tonoIcono="dorado"
                titulo="Disponibilidad del área"
                subtitulo="Revisa la agenda de espacios antes de decidir."
            >
                <ListaCotejo
                    puntos={PUNTOS_DISPONIBILIDAD}
                    marcados={solicitud.cotejo}
                    alCambiar={estado === "rechazada" ? undefined : marcar}
                />
                <div className="fila-agenda">
                    {sinFecha ? (
                        <Chip tono="dorado" icono={chipInfo}>
                            Sin fecha para comparar
                        </Chip>
                    ) : (
                        <Chip tono="verde" icono={chipCheck}>
                            Sin choques con la agenda
                        </Chip>
                    )}
                    {/* TODO: pantalla de agenda completa de espacios */}
                    <button type="button" className="boton-panel boton-panel--oscuro boton-panel--mediano-alto">
                        Ver agenda completa de espacios
                    </button>
                </div>
            </Tarjeta>

            <Tarjeta icono={tarjetaLista} titulo="Agenda del área ese día" subtitulo="Referencia rápida. Datos de ejemplo.">
                {sinFecha ? (
                    <p className="texto-tarjeta">
                        La persona no indicó fecha ni horario. Propón uno para poder revisar la agenda del área.
                    </p>
                ) : (
                    <div className="tabla" role="table">
                        <div className="tabla__fila tabla__fila--encabezado" role="row">
                            <span role="columnheader" style={{ width: 170 }}>HORARIO</span>
                            <span role="columnheader" style={{ flex: 1 }}>ACTIVIDAD</span>
                            <span role="columnheader" style={{ width: 170 }}>ESTADO</span>
                        </div>
                        <div className="tabla__fila" role="row">
                            <span role="cell" className="tabla__fuerte" style={{ width: 170 }}>09:00 a 10:00</span>
                            <span role="cell" className="tabla__fuerte" style={{ flex: 1 }}>Mantenimiento (ejemplo)</span>
                            <span role="cell" style={{ width: 170 }}>
                                <Chip tono="gris">Ocupado</Chip>
                            </span>
                        </div>
                        <div className="tabla__fila" role="row">
                            <span role="cell" className="tabla__fuerte" style={{ width: 170 }}>{solicitud.horario}</span>
                            <span role="cell" className="tabla__fuerte" style={{ flex: 1 }}>Solicitud {solicitud.folio}</span>
                            <span role="cell" style={{ width: 170 }}>
                                {estado === "aprobada" ? <Chip tono="verde">Apartado</Chip> : <Chip tono="dorado">En revisión</Chip>}
                            </span>
                        </div>
                        <div className="tabla__fila" role="row">
                            <span role="cell" className="tabla__fuerte" style={{ width: 170 }}>14:00 a 16:00</span>
                            <span role="cell" className="tabla__fuerte" style={{ flex: 1 }}>Libre</span>
                            <span role="cell" style={{ width: 170 }}>
                                <Chip tono="verde">Disponible</Chip>
                            </span>
                        </div>
                    </div>
                )}
            </Tarjeta>
        </>
    );

    const rechazar = (
        <BotonOpcion icono={opcionX} peligro alPresionar={() => setVentana("rechazar")}>
            Rechazar solicitud
        </BotonOpcion>
    );

    let decision;
    if (estado === "rechazada") {
        decision = <TarjetaResolucion estado={estado} resolucion={resolucion} rutaBandeja={RUTA} />;
    } else if (estado === "aprobada") {
        decision = (
            <TarjetaDecision
                titulo="Gestionar solicitud"
                subtitulo="Cambios sobre una solicitud ya aprobada."
                opciones={
                    <BotonOpcion icono={opcionCalendario} alPresionar={() => setVentana("fecha")}>
                        Reprogramar
                    </BotonOpcion>
                }
                peligro={
                    <BotonOpcion icono={opcionX} peligro alPresionar={() => setVentana("cancelar")}>
                        Cancelar solicitud aprobada
                    </BotonOpcion>
                }
                nota="La persona recibe un aviso con el cambio o la cancelación."
            />
        );
    } else {
        decision = (
            <TarjetaDecision
                subtitulo="Elige una acción para esta solicitud."
                aprobar={{ texto: "Aprobar solicitud", alPresionar: () => setVentana("aprobar") }}
                opciones={
                    <>
                        <BotonOpcion icono={opcionLista} alPresionar={() => setVentana("condiciones")}>
                            Aprobar con condiciones
                        </BotonOpcion>
                        <BotonOpcion icono={opcionBuscar} alPresionar={() => setVentana("espacio")}>
                            Sugerir otro espacio
                        </BotonOpcion>
                        <BotonOpcion icono={opcionCalendario} alPresionar={() => setVentana("fecha")}>
                            Proponer otra fecha u horario
                        </BotonOpcion>
                    </>
                }
                peligro={rechazar}
                nota="Como administrador decides directamente. La persona recibe el resultado en sus notificaciones."
            />
        );
    }

    const cerrar = () => setVentana(null);

    return (
        <PanelLayout titulo="Atención">
            <DetalleSolicitud
                area="espacios"
                solicitud={solicitud}
                textos={resolucion?.cancelada ? { ...textos, rechazada: textosCancelada } : textos}
                prefijo="SOLICITUD"
                volver={{ texto: "Volver a solicitudes de espacios", ruta: RUTA }}
                historial={historial(solicitud)}
                principal={principal}
                decision={decision}
            />

            {ventana === "aprobar" && (
                <Ventana
                    tono="verde"
                    icono={modalCheck}
                    titulo="¿Aprobar esta solicitud?"
                    texto="Se apartará el espacio para la persona y recibirá un aviso en sus notificaciones."
                    textoConfirmar="Sí, aprobar solicitud"
                    textoCancelar="Revisar de nuevo"
                    angosta
                    alConfirmar={() => decidir({ estado: "aprobada", resolucion: { fecha: "Hoy" } })}
                    alCerrar={cerrar}
                />
            )}

            {ventana === "condiciones" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalLista}
                    titulo="Aprobar con condiciones"
                    texto="La solicitud se aprueba y la persona verá las condiciones junto con la aprobación."
                    textoConfirmar="Aprobar con condiciones"
                    campos={[
                        { nombre: "condiciones", etiqueta: "Condiciones de uso", obligatorio: true, placeholder: "Escribe las condiciones" },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", placeholder: "Mensaje opcional" },
                    ]}
                    preparados={["Respetar el cupo máximo del área", "Avisar cualquier cambio con anticipación"]}
                    campoPreparados="condiciones"
                    alConfirmar={(valores) => decidir({ estado: "aprobada", resolucion: { fecha: "Hoy", ...valores } })}
                    alCerrar={cerrar}
                />
            )}

            {ventana === "espacio" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalInfo}
                    titulo="Sugerir otro espacio"
                    texto="La persona recibirá tu sugerencia y podrá aceptarla o pedir otra opción."
                    textoConfirmar="Enviar sugerencia"
                    campos={[
                        {
                            nombre: "espacio",
                            etiqueta: "Espacio sugerido",
                            tipo: "select",
                            obligatorio: true,
                            placeholder: "Selecciona un área",
                            opciones: AREAS.filter((area) => area !== solicitud.area),
                        },
                        { nombre: "fechaHorario", etiqueta: "Fecha y horario", placeholder: "Mantener los de la solicitud" },
                        {
                            nombre: "mensaje",
                            etiqueta: "Mensaje para la persona",
                            obligatorio: true,
                            placeholder: "Explica por qué sugieres este espacio",
                        },
                    ]}
                    preparados={["El espacio pedido no está disponible", "El aforo no alcanza"]}
                    alConfirmar={(valores) =>
                        decidir({
                            estado: "observaciones",
                            resolucion: { fecha: "Hoy", motivo: `otro espacio: ${valores.espacio}`, mensaje: valores.mensaje },
                        })
                    }
                    alCerrar={cerrar}
                />
            )}

            {ventana === "fecha" && (
                <VentanaFormulario
                    tono="dorado"
                    icono={modalCalendario}
                    titulo={estado === "aprobada" ? "Reprogramar solicitud" : "Proponer otra fecha u horario"}
                    texto="La persona recibirá tu propuesta y podrá aceptarla o pedir otra opción."
                    textoConfirmar="Enviar propuesta"
                    campos={[
                        { nombre: "fecha", etiqueta: "Fecha propuesta", tipo: "fecha", obligatorio: true, mitad: true },
                        { nombre: "horario", etiqueta: "Horario propuesto", obligatorio: true, placeholder: "00:00 a 00:00", mitad: true },
                        { nombre: "mensaje", etiqueta: "Mensaje para la persona", obligatorio: true, placeholder: "Explica el motivo del cambio" },
                    ]}
                    preparados={["Ese horario ya está ocupado", "Hay un evento institucional ese día"]}
                    alConfirmar={(valores) =>
                        decidir({
                            estado: "observaciones",
                            resolucion: {
                                fecha: "Hoy",
                                motivo: `${formatearFecha(valores.fecha)}, ${valores.horario}`,
                                mensaje: valores.mensaje,
                            },
                        })
                    }
                    alCerrar={cerrar}
                />
            )}

            {ventana === "rechazar" && (
                <VentanaFormulario
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="Rechazar solicitud"
                    texto="Explica el motivo. La persona lo verá en sus notificaciones y podrá enviar una nueva solicitud."
                    textoConfirmar="Sí, rechazar solicitud"
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
                    alConfirmar={(valores) => decidir({ estado: "rechazada", resolucion: { fecha: "Hoy", ...valores } })}
                    alCerrar={cerrar}
                />
            )}

            {ventana === "cancelar" && (
                <VentanaFormulario
                    tono="guinda"
                    icono={modalAlerta}
                    titulo="¿Cancelar la solicitud aprobada?"
                    texto="El espacio quedará libre y la persona recibirá el motivo en sus notificaciones."
                    textoConfirmar="Sí, cancelar solicitud"
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
                    alConfirmar={(valores) =>
                        decidir({ estado: "rechazada", resolucion: { fecha: "Hoy", cancelada: true, ...valores } })
                    }
                    alCerrar={cerrar}
                />
            )}
        </PanelLayout>
    );
}

export default DetalleEspacio;
